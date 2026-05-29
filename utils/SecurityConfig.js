const LEGACY_DEV_SECRET = 'Cred3215987%$#@!';

function isProduction() {
    return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

export function getConfiguredSecret(envNames = [], label = 'Segredo de seguranca') {
    const names = Array.isArray(envNames) ? envNames : [envNames];

    for (const name of names) {
        const value = String(process.env?.[name] || '').trim();

        if (value) {
            return value;
        }
    }

    if (isProduction()) {
        throw new Error(`${label} nao configurado para ambiente de producao.`);
    }

    return LEGACY_DEV_SECRET;
}

export function useSecureCookies() {
    const forcedValue = String(process.env.COOKIE_SECURE || '').trim().toLowerCase();

    if (forcedValue === 'true' || forcedValue === '1') {
        return true;
    }

    return isProduction();
}

export function allowPrivateNetworkCorsOrigins() {
    const forcedValue = String(process.env.CORS_ALLOW_PRIVATE_NETWORK || '').trim().toLowerCase();

    if (forcedValue === 'true' || forcedValue === '1') {
        return true;
    }

    return !isProduction();
}
