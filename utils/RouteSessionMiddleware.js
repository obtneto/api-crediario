import {obterSessaoBearer, obterSessaoHttpOnly, renovarSessaoHttpOnly} from './AuthSession.js';

const ROTAS_PUBLICAS_SEM_ENTIDADE = ['/auth/session', '/auth/logout', '/listar_entidades_publico'];

export function criarMiddlewareSessao(rotasPublicasSemEntidade = ROTAS_PUBLICAS_SEM_ENTIDADE) {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        const rotaPublica = rotasPublicasSemEntidade.includes(req.path);
        const sessaoCookie = obterSessaoHttpOnly(req);

        if (rotaPublica) {
            const renovarSessaoPublica = req.path !== '/auth/logout';

            if (renovarSessaoPublica && sessaoCookie && Number(sessaoCookie?.entidade_negocio || 0) > 0) {
                const sessaoRenovada = renovarSessaoHttpOnly(res, sessaoCookie);
                req.auth = sessaoRenovada?.payload || sessaoCookie;
            } else if (sessaoCookie) {
                req.auth = sessaoCookie;
            }
            return next();
        }

        const sessao = obterSessaoBearer(req);

        if (!sessao || Number(sessao?.entidade_negocio || 0) <= 0) {
            return res.status(401).json({
                err: 401,
                msg: 'Token de autenticacao invalido ou ausente.',
                status: 401,
                data: []
            });
        }

        const sessaoAtual = sessao;

        if (sessaoCookie && Number(sessaoCookie?.entidade_negocio || 0) > 0) {
            renovarSessaoHttpOnly(res, sessaoCookie);
        }

        let entidadeNegocio = Number(req.headers['x-entidade-negocio'] || 0);
        const entidadeSessao = Number(sessaoAtual.entidade_negocio || 0);

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
        req.auth = sessaoAtual;

        next();
    };
}
