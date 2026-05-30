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

    throw new Error(`${label} nao configurado.`);
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
