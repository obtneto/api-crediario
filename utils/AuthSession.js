import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { isTokenBlacklisted } from './TokenBlacklist.js';

const COOKIE_NAME = 'crediario_token';
const RESPONSE_TOKEN_HEADER = 'x-crediario-token';
const DEFAULT_TTL_SECONDS = 60 * 12;
const TOKEN_VERSION = 2;
const IV_LENGTH = 12;

function getSecret() {
    return String(process.env.AUTH_JWT_SECRET || process.env.AUTH_COOKIE_SECRET || 'Cred3215987%$#@!');
}

function getEncryptionKey() {
    return crypto.createHash('sha256').update(getSecret()).digest();
}

function getTtlSeconds() {
    const envValue = Number(process.env.AUTH_SESSION_TIMEOUT_SECONDS);

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

function getTokenFromRequest(req) {
    return {
        bearerToken: readBearerToken(req),
        cookieToken: readCookieToken(req)
    };
}

function _getCurrentToken(req) {
    const { bearerToken, cookieToken } = getTokenFromRequest(req);
    return bearerToken || cookieToken || '';
}

function verifyToken(token = '') {
    if (!token) {
        return null;
    }

    if (isTokenBlacklisted(token)) {
        return null;
    }
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, getSecret());

        if (decoded?.v === TOKEN_VERSION && decoded?.d) {
            return decryptPayload(String(decoded.d || ''));
        }

        // Compatibilidade com tokens antigos cujo payload era legível.
        return decoded;
    } catch {
        return null;
    }
}

function buildPayload(sessionData = {}) {
    const perfil = sessionData?.perfil || {};

    return {
        user: String(sessionData?.user || ''),
        firstname: String(sessionData?.firstname || ''),
        fullname: String(sessionData?.fullname || ''),
        id_vendedor: Number(sessionData?.id_vendedor || 0),
        type_perfil: Number(sessionData?.type_perfil || 0),
        cod_perfil: String(sessionData?.cod_perfil || ''),
        entidade_negocio: Number(sessionData?.entidade_negocio || 0),
        name_entidade: String(sessionData?.name_entidade || ''),
        modo_acesso: String(sessionData?.modo_acesso || ''),
        com_rota_cobranca: Number(sessionData?.com_rota_cobranca || 0),
        perfil: {
            selecionar: Number(perfil?.selecionar || 0),
            inserir: Number(perfil?.inserir || 0),
            atualizar: Number(perfil?.atualizar || 0),
            excluir: Number(perfil?.excluir || 0)
        },
        reset_password: Number(sessionData?.reset_password || 0)
    };
}

function encryptPayload(payload = {}) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const serialized = JSON.stringify(payload);

    let encrypted = cipher.update(serialized, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');

    const tag = cipher.getAuthTag().toString('base64url');
    const ivEncoded = iv.toString('base64url');

    return `${ivEncoded}.${tag}.${encrypted}`;
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
    const payload = buildPayload(sessionData);
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
        payload
    };
}

export function obterSessaoHttpOnly(req) {
    const { cookieToken } = getTokenFromRequest(req);
    return verifyToken(cookieToken);
}

export function obterSessaoBearer(req) {
    const { bearerToken } = getTokenFromRequest(req);
    return verifyToken(bearerToken);
}

function escreverSessaoHttpOnly(res, sessionData = {}) {
    const { token, ttlMs, payload } = signToken(sessionData);

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
        payload
    };
}

export function definirSessaoHttpOnly(res, sessionData = {}) {
    return escreverSessaoHttpOnly(res, sessionData);
}

export function renovarSessaoHttpOnly(res, sessaoAtual = {}) {
    if (!sessaoAtual) {
        return null;
    }

    return escreverSessaoHttpOnly(res, sessaoAtual);
}

export function limparSessaoHttpOnly(res) {
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

export function getCurrentToken(req) {
    return _getCurrentToken(req);
}
