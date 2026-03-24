import {
    obterSessaoStaffBearer,
    obterSessaoStaffHttpOnly,
    renovarSessaoStaffHttpOnly
} from './StaffSession.js';

const ROTAS_PUBLICAS_STAFF = ['/auth/session', '/auth/logout'];

export function criarMiddlewareSessaoStaff(rotasPublicas = ROTAS_PUBLICAS_STAFF) {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        const rotaPublica = rotasPublicas.includes(req.path);
        const sessaoCookie = obterSessaoStaffHttpOnly(req);

        if (rotaPublica) {
            const renovarSessaoPublica = req.path !== '/auth/logout';

            if (renovarSessaoPublica && sessaoCookie?.user) {
                const sessaoRenovada = renovarSessaoStaffHttpOnly(res, sessaoCookie);
                req.staffAuth = sessaoRenovada?.payload || sessaoCookie;
            } else if (sessaoCookie?.user) {
                req.staffAuth = sessaoCookie;
            }

            return next();
        }

        const sessaoBearer = obterSessaoStaffBearer(req);
        const sessaoAtual = sessaoBearer || sessaoCookie;

        if (!sessaoAtual?.user) {
            return res.status(401).json({
                err: 401,
                msg: 'Sessao staff invalida ou ausente.',
                status: 401,
                data: []
            });
        }

        if (sessaoCookie?.user) {
            renovarSessaoStaffHttpOnly(res, sessaoCookie);
        }

        req.staffAuth = sessaoAtual;
        return next();
    };
}
