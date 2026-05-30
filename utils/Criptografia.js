import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { getConfiguredSecret } from './SecurityConfig.js';

const scryptAsync = promisify(crypto.scrypt);
const HASH_PREFIX = 's2$';
const LEGACY_HASH_PREFIX = 'h$';
const LEGACY_SCRYPT_PREFIX = 'scrypt$';
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const HASH_SIZE_CHARS = 16;
const SCRYPT_OPTIONS = {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024
};

export const SENHA_RESET_PADRAO = String(process.env.SENHA_RESET_PADRAO || '').trim();

if (!SENHA_RESET_PADRAO) {
    throw new Error('SENHA_RESET_PADRAO nao configurada.');
}

function normalizarSenha(password) {
    return String(password || '').trim();
}

function getSecret() {
    return getConfiguredSecret(
        ['AUTH_PASSWORD_SECRET', 'AUTH_JWT_SECRET', 'AUTH_COOKIE_SECRET'],
        'AUTH_PASSWORD_SECRET, AUTH_JWT_SECRET ou AUTH_COOKIE_SECRET'
    );
}

async function gerarHashScrypt(password = '', saltBuffer = null) {
    const senha = normalizarSenha(password);
    const salt = saltBuffer || crypto.randomBytes(SALT_LENGTH);
    const derivedKey = await scryptAsync(senha, salt, KEY_LENGTH, SCRYPT_OPTIONS);

    return {
        salt,
        hash: Buffer.from(derivedKey)
    };
}

function gerarHashCompactoLegado(password = '') {
    const senha = normalizarSenha(password);

    return crypto
        .createHmac('sha256', getSecret())
        .update(senha)
        .digest('base64url')
        .slice(0, HASH_SIZE_CHARS);
}

function safeCompare(leftValue, rightValue) {
    const left = Buffer.from(String(leftValue || ''), 'utf8');
    const right = Buffer.from(String(rightValue || ''), 'utf8');

    if (left.length !== right.length) {
        return false;
    }

    return crypto.timingSafeEqual(left, right);
}

export function senhaEstaHash(value) {
    const senha = String(value || '');
    return senha.startsWith(HASH_PREFIX) || senha.startsWith(LEGACY_HASH_PREFIX) || senha.startsWith(LEGACY_SCRYPT_PREFIX);
}

export function senhaPrecisaUpgrade(value) {
    return !String(value || '').startsWith(HASH_PREFIX);
}

export async function criptografarSenha(password) {
    const senha = normalizarSenha(password);

    if (!senha) {
        throw new Error('Senha invalida.');
    }

    const { salt, hash } = await gerarHashScrypt(senha);
    return `${HASH_PREFIX}${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function validarSenha(password, storedPassword) {
    const senha = normalizarSenha(password);
    const senhaPersistida = String(storedPassword || '').trim();

    if (!senha || !senhaPersistida) {
        return false;
    }

    if (senhaPersistida.startsWith(HASH_PREFIX)) {
        const [, saltBase64Url, hashBase64Url] = senhaPersistida.split('$');

        if (!saltBase64Url || !hashBase64Url) {
            return false;
        }

        const salt = Buffer.from(saltBase64Url, 'base64url');
        const hash = Buffer.from(hashBase64Url, 'base64url');
        const { hash: derivedHash } = await gerarHashScrypt(senha, salt);

        if (hash.length !== derivedHash.length) {
            return false;
        }

        return crypto.timingSafeEqual(hash, derivedHash);
    }

    if (senhaPersistida.startsWith(LEGACY_HASH_PREFIX)) {
        return safeCompare(`${LEGACY_HASH_PREFIX}${gerarHashCompactoLegado(senha)}`, senhaPersistida);
    }

    if (senhaPersistida.startsWith(LEGACY_SCRYPT_PREFIX)) {
        const [, saltHex, hashHex] = senhaPersistida.split('$');

        if (!saltHex || !hashHex) {
            return false;
        }

        const salt = Buffer.from(saltHex, 'hex');
        const hash = Buffer.from(hashHex, 'hex');
        const derivedKey = await scryptAsync(senha, salt, hash.length, SCRYPT_OPTIONS);
        const derivedBuffer = Buffer.from(derivedKey);

        if (hash.length !== derivedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(hash, derivedBuffer);
    }

    if (!senhaEstaHash(senhaPersistida)) {
        return safeCompare(senhaPersistida, senha);
    }

    return false;
}
