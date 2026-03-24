import Database from '../connections/dbconn.js';
import Entidades from '../model/dao_entidades.js';
import {
    limparSessaoHttpOnly,
    obterSessaoBearer,
    obterSessaoHttpOnly,
    renovarSessaoHttpOnly
} from './AuthSession.js';

const ROTAS_PUBLICAS_SEM_ENTIDADE = ['/auth/session', '/auth/logout', '/listar_entidades_publico'];

async function entidadeEstaAtiva(entidadeId = 0) {
    if (Number(entidadeId || 0) <= 0) {
        return false;
    }

    const db = new Database('dbcred');

    try {
        void await db.Connect();

        const entidades = new Entidades(db.connection);
        const [entidade] = await entidades.ExecuteQuery(
            'SELECT id, ativo FROM tb_entidades WHERE id = :id',
            { id: Number(entidadeId || 0) }
        );

        return Number(entidade?.ativo || 0) === 1;
    } finally {
        void await db.Close();
    }
}

export function criarMiddlewareSessao(rotasPublicasSemEntidade = ROTAS_PUBLICAS_SEM_ENTIDADE) {
    return async (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        try {
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
            const entidadeSessao = Number(sessaoAtual.entidade_negocio || 0);
            const entidadeAtiva = await entidadeEstaAtiva(entidadeSessao);

            if (!entidadeAtiva) {
                if (sessaoCookie) {
                    limparSessaoHttpOnly(res);
                }

                return res.status(401).json({
                    err: 401,
                    msg: 'A entidade vinculada ao usuario esta bloqueada. Faca login novamente.',
                    status: 401,
                    data: []
                });
            }

            if (sessaoCookie && Number(sessaoCookie?.entidade_negocio || 0) > 0) {
                renovarSessaoHttpOnly(res, sessaoCookie);
            }

            let entidadeNegocio = Number(req.headers['x-entidade-negocio'] || 0);

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
        } catch (error) {
            return res.status(500).json({
                err: 500,
                msg: 'Nao foi possivel validar a sessao atual.',
                status: 500,
                data: []
            });
        }
    };
}
