const blacklist = new Map();

function cleanup() {
    const now = Date.now();

    for (const [token, expiresAt] of blacklist.entries()) {
        if (expiresAt <= now) {
            blacklist.delete(token);
        }
    }
}

export function isTokenBlacklisted(token = '') {
    if (!token) return false;
    cleanup();
    return blacklist.has(token);
}

export function addTokenToBlacklist(token = '', ttlSeconds = 0) {
    if (!token || ttlSeconds <= 0) return;

    const expiresAt = Date.now() + ttlSeconds * 1000;
    blacklist.set(token, expiresAt);
}

export function clearBlacklist() {
    blacklist.clear();
}
