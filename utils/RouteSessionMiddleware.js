import {obterSessaoHttpOnly, renovarSessaoHttpOnly} from './AuthSession.js';

const ROTAS_PUBLICAS_SEM_ENTIDADE = ['/auth', '/auth/session', '/auth/logout', '/listar_entidades_publico', '/listar_entidades'];

export function criarMiddlewareSessao(rotasPublicasSemEntidade = ROTAS_PUBLICAS_SEM_ENTIDADE) {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        const rotaPublica = rotasPublicasSemEntidade.includes(req.path);
        const sessao = obterSessaoHttpOnly(req);

        if (rotaPublica) {
            if (sessao && Number(sessao?.entidade_negocio || 0) > 0) {
                renovarSessaoHttpOnly(res, sessao);
            }
            return next();
        }

        if (!sessao || Number(sessao?.entidade_negocio || 0) <= 0) {
            return res.status(401).json({
                err: 401,
                msg: 'Sessao expirada. Faca login novamente.',
                status: 401,
                data: []
            });
        }

        renovarSessaoHttpOnly(res, sessao);

        let entidadeNegocio = Number(req.headers['x-entidade-negocio'] || 0);
        const entidadeSessao = Number(sessao.entidade_negocio || 0);

        if (!Number.isInteger(entidadeNegocio) || entidadeNegocio <= 0) {
            entidadeNegocio = entidadeSessao;
        }

        if (entidadeNegocio !== entidadeSessao) {
            return res.status(403).json({
                err: 403,
                msg: 'Entidade de negocio invalida para a sessao atual.',
                status: 403,
                data: []
            });
        }

        req.entidade_negocio = entidadeNegocio;

        next();
    };
}
