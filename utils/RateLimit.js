const buckets = new Map();

function parseIp(value = '') {
    const ip = String(value || '').trim();

    if (!ip) {
        return 'unknown';
    }

    return ip.replace(/:\d+[^:]*$/, '');
}

function getClientKey(req) {
    const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').split(',')[0];
    const ip = parseIp(forwardedFor || req.ip || req.socket?.remoteAddress || '');

    return ip || 'unknown';
}

function cleanup(now) {
    for (const [key, data] of buckets.entries()) {
        if (!data || Number(data.resetAt || 0) <= now) {
            buckets.delete(key);
        }
    }
}

export function criarRateLimit({
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = 'Muitas tentativas. Tente novamente em alguns minutos.'
} = {}) {
    const safeWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 15 * 60 * 1000;
    const safeMax = Number(max) > 0 ? Number(max) : 10;

    return (req, res, next) => {
        const now = Date.now();
        cleanup(now);

        const key = getClientKey(req);
        const current = buckets.get(key);

        if (!current || Number(current.resetAt || 0) <= now) {
            buckets.set(key, {
                count: 1,
                resetAt: now + safeWindowMs
            });
            return next();
        }

        current.count += 1;

        if (current.count > safeMax) {
            const retrySeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retrySeconds));
            return res.status(429).json({
                err: 429,
                msg: message,
                status: 429,
                data: []
            });
        }

        return next();
    };
}

