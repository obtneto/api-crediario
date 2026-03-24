import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { isTokenBlacklisted } from './TokenBlacklist.js';

const COOKIE_NAME = 'crediario_staff_token';
const RESPONSE_TOKEN_HEADER = 'x-crediario-staff-token';
const DEFAULT_TTL_SECONDS = 60 * 30;
const TOKEN_VERSION = 1;
const IV_LENGTH = 12;

function getSecret() {
    return String(process.env.STAFF_AUTH_SECRET || process.env.AUTH_JWT_SECRET || process.env.AUTH_COOKIE_SECRET || 'Cred3215987%$#@!');
}

function getEncryptionKey() {
    return crypto.createHash('sha256').update(getSecret()).digest();
}

function getTtlSeconds() {
    const envValue = Number(process.env.STAFF_AUTH_TIMEOUT_SECONDS);

    if (Number.isFinite(envValue) && envValue > 0) {
        return Math.floor(envValue);
    }

    return DEFAULT_TTL_SECONDS;
}

function parseCookieHeader(cookieHeader = '') {
    return cookieHeader.split(';').reduce((acc, item) => {
        const [key, ...rest] = item.trim().split('=');

        if (!key) {
            return acc;
        }

        acc[key] = rest.join('=');
        return acc;
    }, {});
}

function readCookieToken(req) {
    const cookies = parseCookieHeader(req.headers?.cookie || '');
    return String(cookies[COOKIE_NAME] || '');
}

function readBearerToken(req) {
    const authorization = String(req.headers?.authorization || '').trim();

    if (!authorization.toLowerCase().startsWith('bearer ')) {
        return '';
    }

    return authorization.slice(7).trim();
}

function verifyToken(token = '') {
    if (!token || isTokenBlacklisted(token)) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, getSecret());

        if (decoded?.v === TOKEN_VERSION && decoded?.d) {
            return decryptPayload(String(decoded.d || ''));
        }

        return decoded;
    } catch {
        return null;
    }
}

function encryptPayload(payload = {}) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const serialized = JSON.stringify(payload);

    let encrypted = cipher.update(serialized, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');

    const tag = cipher.getAuthTag().toString('base64url');

    return `${iv.toString('base64url')}.${tag}.${encrypted}`;
}

function decryptPayload(value = '') {
    try {
        const [ivEncoded, tagEncoded, encrypted] = String(value || '').split('.');

        if (!ivEncoded || !tagEncoded || !encrypted) {
            return null;
        }

        const iv = Buffer.from(ivEncoded, 'base64url');
        const tag = Buffer.from(tagEncoded, 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, 'base64url', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch {
        return null;
    }
}

function signToken(sessionData = {}) {
    const ttlSeconds = getTtlSeconds();
    const payload = {
        user: String(sessionData?.user || ''),
        name: String(sessionData?.name || ''),
        role: String(sessionData?.role || 'staff_admin')
    };
    const encryptedPayload = encryptPayload(payload);
    const token = jwt.sign({
        v: TOKEN_VERSION,
        d: encryptedPayload
    }, getSecret(), {
        expiresIn: `${ttlSeconds}s`
    });

    return {
        token,
        ttlMs: ttlSeconds * 1000,
        ttlSeconds,
        payload
    };
}

function writeSession(res, sessionData = {}) {
    const { token, ttlMs, ttlSeconds, payload } = signToken(sessionData);

    res.setHeader(RESPONSE_TOKEN_HEADER, token);
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttlMs
    });

    return {
        token,
        ttlSeconds,
        payload
    };
}

export function obterSessaoStaffHttpOnly(req) {
    return verifyToken(readCookieToken(req));
}

export function obterSessaoStaffBearer(req) {
    return verifyToken(readBearerToken(req));
}

export function definirSessaoStaffHttpOnly(res, sessionData = {}) {
    return writeSession(res, sessionData);
}

export function renovarSessaoStaffHttpOnly(res, sessionData = {}) {
    if (!sessionData?.user) {
        return null;
    }

    return writeSession(res, sessionData);
}

export function limparSessaoStaffHttpOnly(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.cookie(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
        maxAge: 0
    });
}

export function getCurrentStaffToken(req) {
    return readBearerToken(req) || readCookieToken(req) || '';
}
