import crypto from 'crypto';

const COOKIE_NAME = 'crediario_session';
const DEFAULT_TTL_SECONDS = 60 * 12;

function getSecret() {
    return String(process.env.AUTH_COOKIE_SECRET || 'Cred3215987%$#@!');
}

function getTtlSeconds(remember = false) {
    const envName = remember ? 'AUTH_SESSION_REMEMBER_TIMEOUT_SECONDS' : 'AUTH_SESSION_TIMEOUT_SECONDS';
    const envValue = Number(process.env[envName]);
    if (Number.isFinite(envValue) && envValue > 0) {
        return Math.floor(envValue);
    }
    return DEFAULT_TTL_SECONDS;
}

function base64UrlEncode(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payloadBase64) {
    return crypto.createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url');
}

function parseCookieHeader(cookieHeader = '') {
    return cookieHeader.split(';').reduce((acc, item) => {
        const [key, ...rest] = item.trim().split('=');
        if (!key) return acc;
        acc[key] = rest.join('=');
        return acc;
    }, {});
}

function safeEqual(a, b) {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function buildToken(payload) {
    const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(payloadBase64);
    return `${payloadBase64}.${signature}`;
}

function readToken(req) {
    const cookies = parseCookieHeader(req.headers?.cookie || '');
    return cookies[COOKIE_NAME] || '';
}

export function obterSessaoHttpOnly(req) {
    try {
        const token = readToken(req);
        if (!token || !token.includes('.')) return null;

        const [payloadBase64, signature] = token.split('.');
        if (!safeEqual(sign(payloadBase64), signature)) return null;

        const payload = JSON.parse(base64UrlDecode(payloadBase64));
        const exp = Number(payload?.exp || 0);

        // Sessao sem exp valida e considerada invalida.
        if (!Number.isFinite(exp) || exp <= 0) return null;
        if (exp && Date.now() > exp) return null;

        return payload;
    } catch (error) {
        return null;
    }
}

function escreverSessaoHttpOnly(res, sessionData, remember = false) {
    const ttlMs = getTtlSeconds(remember) * 1000;
    const payload = {
        user: String(sessionData?.user || ''),
        entidade_negocio: Number(sessionData?.entidade_negocio || 0),
        name_entidade: String(sessionData?.name_entidade || ''),
        remember: Boolean(remember),
        iat: Date.now(),
        exp: Date.now() + ttlMs
    };

    const token = buildToken(payload);

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttlMs
    });
}

export function definirSessaoHttpOnly(res, sessionData, remember = false) {
    escreverSessaoHttpOnly(res, sessionData, remember);
}

export function renovarSessaoHttpOnly(res, sessaoAtual) {
    if (!sessaoAtual) return;
    escreverSessaoHttpOnly(res, sessaoAtual, Boolean(sessaoAtual?.remember));
}

export function limparSessaoHttpOnly(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
}
