import crypto from 'node:crypto';
import Database from '../connections/dbconn.js';
import Entidades from '../model/dao_entidades.js';
import GravarLog from '../utils/GravarLog.js';
import { criptografarSenha, validarSenha } from '../utils/Criptografia.js';
import { addTokenToBlacklist } from '../utils/TokenBlacklist.js';
import {
    definirSessaoStaffHttpOnly,
    getCurrentStaffToken,
    limparSessaoStaffHttpOnly,
    obterSessaoStaffHttpOnly,
    renovarSessaoStaffHttpOnly
} from '../utils/StaffSession.js';

const STAFF_MODO_ACESSO = 'SF';
const STAFF_ENTIDADE_PADRAO = Number(process.env.STAFF_ENTIDADE_NEGOCIO || 1);

function normalizarModoAcessoStaff(value = '') {
    return String(value || '').trim().toUpperCase() === STAFF_MODO_ACESSO;
}

function gerarIniciais(user = '') {
    const texto = String(user || '').trim().toUpperCase();
    if (!texto) return 'ST';

    const partes = texto.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
        return `${partes[0][0]}${partes[partes.length - 1][0]}`;
    }

    return texto.slice(0, 2).padEnd(2, 'S');
}

async function buscarStaffPorUser(connection, inputUser = '') {
    const user = String(inputUser || '').trim();

    if (!connection || !user) {
        return null;
    }

    const query = `SELECT id, entidade_negocio, usuario AS user, senha AS password,
        COALESCE(nom_completo, usuario) AS name, modo_acesso
        FROM tb_usuarios
        WHERE usuario = :user AND modo_acesso = :modo_acesso
        ORDER BY entidade_negocio ASC, id ASC`;

    const [row] = await connection.execute(query, { user, modo_acesso: STAFF_MODO_ACESSO });
    return row || null;
}

async function contarStaffUsuarios(connection) {
    if (!connection) {
        return 0;
    }

    const [row] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM tb_usuarios
         WHERE modo_acesso = :modo_acesso`,
        { modo_acesso: STAFF_MODO_ACESSO }
    );

    return Number(row?.total || 0);
}

async function buscarEntidadePorId(connection, entidadeNegocio = 0) {
    const entidadeId = Number(entidadeNegocio || 0);

    if (!connection || entidadeId <= 0) {
        return null;
    }

    const [row] = await connection.execute(
        `SELECT id, nom_entidade, ativo
         FROM tb_entidades
         WHERE id = :id`,
        { id: entidadeId }
    );

    return row || null;
}

async function buscarStaffPorId(connection, id = 0) {
    const userId = Number(id || 0);

    if (!connection || userId <= 0) {
        return null;
    }

    const query = `SELECT id, entidade_negocio, usuario AS user, senha AS password,
        COALESCE(nom_completo, usuario) AS name, modo_acesso
        FROM tb_usuarios
        WHERE id = :id AND modo_acesso = :modo_acesso
        ORDER BY entidade_negocio ASC
        LIMIT 1`;

    const [row] = await connection.execute(query, { id: userId, modo_acesso: STAFF_MODO_ACESSO });
    return row || null;
}

async function novoIdUsuarioPorEntidade(connection, entidadeNegocio = 0) {
    const entidade = Number(entidadeNegocio || 0);

    if (!connection || entidade <= 0) {
        return 0;
    }

    const [row] = await connection.execute(
        `SELECT IFNULL(MAX(id),0) + 1 AS newid
         FROM tb_usuarios
         WHERE entidade_negocio = :entidade_negocio`,
        { entidade_negocio: entidade }
    );

    return Number(row?.newid || 0);
}

async function getStaffCredentials(connection, inputUser = '') {

    if (!connection) {
        throw new Error('Conexao Invalida.');
    }

    const userRegistrado = await buscarStaffPorUser(connection, inputUser);

    if (userRegistrado && normalizarModoAcessoStaff(userRegistrado.modo_acesso)) {
        return {
            user: String(userRegistrado.user || ''),
            password: String(userRegistrado.password || ''),
            name: String(process.env.STAFF_AUTH_NAME || userRegistrado.name || userRegistrado.user || 'Staff Crediario').trim()
        };
    }

    const totalStaffUsuarios = await contarStaffUsuarios(connection);

    if (totalStaffUsuarios === 0) {
        const userPadrao = String(process.env.USER_STAFF_PADRAO || '').trim();
        const passPadrao = String(process.env.PASS_STAFF_PADRAO || '').trim();

        if (userPadrao && passPadrao) {
            return {
                user: userPadrao,
                password: passPadrao,
                name: String(process.env.STAFF_AUTH_NAME || userPadrao || 'Staff Crediario').trim()
            };
        }
    }

    return {
        user: '',
        password: '',
        name: ''
    };
}

function normalizarAtivo(value, fallback = 1) {
    if (value === undefined || value === null || value === '') {
        return Number(fallback) === 1 ? 1 : 0;
    }

    return Number(value) === 1 ? 1 : 0;
}

function safeCompare(leftValue = '', rightValue = '') {
    const left = Buffer.from(String(leftValue || ''));
    const right = Buffer.from(String(rightValue || ''));

    if (left.length !== right.length) {
        return false;
    }

    return crypto.timingSafeEqual(left, right);
}

export class ControllerStaffAuth {

    static async IniciarSessao(req, res) {
        
        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        try {
            const user = String(req.body?.user || '').trim();
            const password = String(req.body?.password || '').trim();

            if (!user) {
                const error = new Error('Informe o usuario staff.');
                error.statusCode = 400;
                throw error;
            }

            if (!password) {
                const error = new Error('Informe a senha staff.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const credentials = await getStaffCredentials(db.connection, user);

            if (!credentials.user || !credentials.password) {
                const error = new Error('Usuario ou senha staff invalidos.');
                error.statusCode = 401;
                throw error;
            }

            const userValido = safeCompare(user, credentials.user);
            const senhaValida = await validarSenha(password, credentials.password);

            if (!userValido || !senhaValida) {
                const error = new Error('Usuario ou senha staff invalidos.');
                error.statusCode = 401;
                throw error;
            }

            const sessao = {
                user: credentials.user,
                name: credentials.name,
                role: 'staff_admin'
            };
            const sessaoPersistida = definirSessaoStaffHttpOnly(res, sessao);

            resdata.msg = 'Sessao staff iniciada com sucesso.';
            resdata.data = {
                authenticated: true,
                ...sessao,
                token: String(sessaoPersistida?.token || '')
            };
        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffAuth.IniciarSessao', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async SessaoAtual(req, res) {

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        const sessao = obterSessaoStaffHttpOnly(req);

        if (!sessao?.user) {
            resdata.msg = 'Sessao staff expirada.';
            resdata.data = {
                authenticated: false
            };
            return res.status(resdata.status).json(resdata);
        }

        const sessaoRenovada = renovarSessaoStaffHttpOnly(res, sessao);
        const payload = sessaoRenovada?.payload || sessao;

        resdata.data = {
            authenticated: true,
            user: String(payload.user || ''),
            name: String(payload.name || payload.user || ''),
            role: String(payload.role || 'staff_admin'),
            token: String(sessaoRenovada?.token || '')
        };

        return res.status(resdata.status).json(resdata);
    }

    static async EncerrarSessao(req, res) {
        const resdata = {
            err: 0,
            msg: 'Sessao staff encerrada com sucesso.',
            status: 200,
            data: []
        };

        const token = getCurrentStaffToken(req);
        const ttlSeconds = Number(process.env.STAFF_AUTH_TIMEOUT_SECONDS || 1800);

        if (token) {
            addTokenToBlacklist(token, ttlSeconds);
        }

        limparSessaoStaffHttpOnly(res);
        return res.status(resdata.status).json(resdata);
    }
}

export class ControllerStaffEntidades {

    static async Listar(req, res) {
        
        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                entidades: []
            }
        };

        try {

            const pesq = String(req.query?.pesq || '').trim();

            void await db.Connect();

            const entidades = new Entidades(db.connection);

            let query = `SELECT id, nom_entidade, nom_responsavel, num_cnpj, cel_contato,
                                cel_whatsapp_bussiness, percent_desconto_venda,
                                percent_desconto_cobranca, com_rota_cobranca, ativo
                         FROM tb_entidades`;
            const params = {};

            if (pesq) {

                query += ` WHERE nom_entidade LIKE :pesq
                           OR nom_responsavel LIKE :pesq
                           OR num_cnpj LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            query += ` ORDER BY id DESC`;

            resdata.data.entidades = await entidades.ExecuteQuery(query, params);

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffEntidades.Listar', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async Salvar(req, res) {
        
        const db = new Database('dbcred');

        const database_path = '../database/dbcred.sql';

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                id: 0
            }
        };

        try {
            const body = req.body || {};
            const id = Number(body.id || 0);
            const nom_entidade = String(body.nom_entidade || '').trim();
            const nom_responsavel = String(body.nom_responsavel || '').trim();
            const num_cnpj = String(body.num_cnpj || '').trim();
            const cel_contato = String(body.cel_contato || '').trim();
            const cel_whatsapp_bussiness = String(body.cel_whatsapp_bussiness || '').trim();
            const percent_desconto_venda = Number(body.percent_desconto_venda || 0);
            const percent_desconto_cobranca = Number(body.percent_desconto_cobranca || 0);
            const com_rota_cobranca = Number(body.com_rota_cobranca || 0) === 1 ? 1 : 0;
            
            let ativo = 1;

            if (!nom_entidade) {
                const error = new Error('Informe o nome da entidade.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const entidades = new Entidades(db.connection);

            if (id > 0) {
                void await entidades.FindById(id);
            }

            ativo = normalizarAtivo(body.ativo, id > 0 ? entidades.ativo : 1);

            entidades.id = id > 0 ? id : await entidades.newId();
            entidades.nom_entidade = nom_entidade;
            entidades.nom_responsavel = nom_responsavel;
            entidades.num_cnpj = num_cnpj;
            entidades.cel_contato = cel_contato;
            entidades.cel_whatsapp_bussiness = cel_whatsapp_bussiness || null;
            entidades.percent_desconto_venda = percent_desconto_venda;
            entidades.percent_desconto_cobranca = percent_desconto_cobranca;
            entidades.com_rota_cobranca = com_rota_cobranca;
            entidades.ativo = ativo;

            void await entidades.Save();

            const query_perfil = `INSERT INTO tb_perfis (id,nom_perfil, selecionar, atualizar, excluir, inserir, entidade_negocio) 
            VALUES (1,'Administrador', 1, 1, 1, 1, ${entidades.id}),(2,'Operador', 1, 1, 0, 1, ${entidades.id}),(3,'Convidado', 1, 0, 0, 0, ${entidades.id})`;

            void await db.connection.execute(query_perfil);

            const query_tipo_pag = `
            INSERT INTO tb_tipos_pagamentos (id, nom_tipo, ativo, entidade_negocio, dias_apos_pagamnto) 
            VALUES (1, 'SEMANAL', 1, ${entidades.id}, 7),(2, 'QUINZENAL', 1, ${entidades.id}, 15),(3, 'MENSAL', 1, ${entidades.id}, 30);`.trim();

            void await db.connection.execute(query_tipo_pag);

            const query_usuarios = `INSERT INTO tb_usuarios (id, usuario, nom_completo, email, senha, entidade_negocio, reset_password, iniciais, id_perfil, num_verificacao, modo_acesso) 
            VALUES (1, 'admin-00${entidades.id}', 'ADMINISTRADOR', NULL, 'abcd@1234', ${entidades.id}, 1, 'AA', 1, 123456, 'DT')`

            void await db.connection.execute(query_usuarios);

            const query_check_ano = `CREATE TABLE IF NOT EXISTS tb_check_ano (
                                     ano_corrente smallint NOT NULL,
                                     id smallint NOT NULL,
                                     PRIMARY KEY (id)
                                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`;

            void await db.connection.execute(query_check_ano);

            void await db.Commit();

            resdata.msg = id > 0 ? 'Entidade atualizada com sucesso.' : 'Entidade cadastrada com sucesso.';
            resdata.data.id = entidades.id;

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffEntidades.Salvar', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async AtualizarStatus(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                id: 0,
                ativo: 0
            }
        };

        try {

            const id = Number(req.params?.id || 0);
            const ativo = normalizarAtivo(req.body?.ativo, 0);

            if (id <= 0) {
                const error = new Error('Entidade invalida para atualizar o status.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const entidades = new Entidades(db.connection);
            const entidade = await entidades.FindById(id);

            if (!entidade) {
                const error = new Error('Entidade nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            void await entidades.ExecuteQuery(
                'UPDATE tb_entidades SET ativo = :ativo WHERE id = :id',
                { id, ativo }
            );
            void await db.Commit();

            resdata.msg = ativo === 1
                ? 'Entidade reativada com sucesso.'
                : 'Entidade bloqueada com sucesso.';
            resdata.data = {
                id,
                ativo
            };
        } catch (error) {
            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffEntidades.AtualizarStatus', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }
}

export class ControllerStaffUsuarios {

    static async Listar(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                usuarios: []
            }
        };

        try {
            const pesq = String(req.query?.pesq || '').trim();

            void await db.Connect();

            let query = `SELECT u.id, u.usuario AS user, u.entidade_negocio, COALESCE(e.nom_entidade, '') AS nom_entidade
                         FROM tb_usuarios u
                         LEFT JOIN tb_entidades e ON e.id = u.entidade_negocio
                         WHERE modo_acesso = :modo_acesso`;
            const params = {};
            params.modo_acesso = STAFF_MODO_ACESSO;

            if (pesq) {
                query += ` AND u.usuario LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            query += ` ORDER BY u.usuario ASC, u.id DESC`;

            resdata.data.usuarios = await db.connection.execute(query, params);
        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffUsuarios.Listar', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async Editar(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        try {
            const id = Number(req.params?.id || 0);

            if (id <= 0) {
                const error = new Error('Usuario staff invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const usuario = await buscarStaffPorId(db.connection, id);

            if (!usuario) {
                const error = new Error('Usuario staff nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = {
                id: Number(usuario.id || 0),
                user: String(usuario.user || ''),
                entidade_negocio: Number(usuario.entidade_negocio || 0),
                password: ''
            };
        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffUsuarios.Editar', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async Salvar(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                id: 0
            }
        };

        try {
            const body = req.body || {};
            const id = Number(body.id || 0);
            const user = String(body.user || '').trim();
            const passwordInformada = String(body.password || '').trim();
            const entidadeInformada = Number(body.entidade_negocio || 0);

            if (!user) {
                const error = new Error('Informe o usuario staff.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            let usuarioAtual = null;

            if (id > 0) {
                const registroAtual = await buscarStaffPorId(db.connection, id);

                if (!registroAtual) {
                    const error = new Error('Usuario staff nao encontrado.');
                    error.statusCode = 404;
                    throw error;
                }

                usuarioAtual = { ...registroAtual };
            }

            const usuarioDuplicado = await buscarStaffPorUser(db.connection, user);

            if (usuarioDuplicado && Number(usuarioDuplicado.id || 0) !== id) {
                const error = new Error('Usuario staff ja cadastrado.');
                error.statusCode = 409;
                throw error;
            }

            if (!passwordInformada && id <= 0) {
                const error = new Error('Informe a senha staff.');
                error.statusCode = 400;
                throw error;
            }

            const password = passwordInformada
                ? await criptografarSenha(passwordInformada)
                : String(usuarioAtual?.password || '').trim();

            if (!password) {
                const error = new Error('Nao foi possivel definir a senha staff.');
                error.statusCode = 400;
                throw error;
            }

            let idPersistido = id;
            const entidadeNegocio = id > 0
                ? Number(usuarioAtual?.entidade_negocio || 0)
                : entidadeInformada;

            if (entidadeNegocio <= 0) {
                const error = new Error('Selecione a entidade de negocio do usuario staff.');
                error.statusCode = 400;
                throw error;
            }

            const entidade = await buscarEntidadePorId(db.connection, entidadeNegocio);

            if (!entidade) {
                const error = new Error('Entidade de negocio nao encontrada para o usuario staff.');
                error.statusCode = 404;
                throw error;
            }

            if (id > 0) {
                void await db.connection.execute(
                    `UPDATE tb_usuarios
                     SET usuario = :user,
                         nom_completo = :nom_completo,
                         senha = :password,
                         modo_acesso = :modo_acesso
                     WHERE id = :id
                       AND entidade_negocio = :entidade_negocio
                       AND modo_acesso = :modo_acesso`,
                    {
                        id,
                        entidade_negocio: entidadeNegocio,
                        user,
                        nom_completo: user.toUpperCase(),
                        password,
                        modo_acesso: STAFF_MODO_ACESSO
                    }
                );
            } else {
                const novoId = await novoIdUsuarioPorEntidade(db.connection, entidadeNegocio);

                if (novoId <= 0) {
                    const error = new Error('Nao foi possivel gerar o ID do usuario staff.');
                    error.statusCode = 500;
                    throw error;
                }

                void await db.connection.execute(
                    `INSERT INTO tb_usuarios (
                        id, usuario, nom_completo, email, senha,
                        entidade_negocio, reset_password, iniciais, id_perfil,
                        num_verificacao, modo_acesso
                    ) VALUES (
                        :id, :user, :nom_completo, :email, :password,
                        :entidade_negocio, :reset_password, :iniciais, :id_perfil,
                        :num_verificacao, :modo_acesso
                    )`,
                    {
                        id: novoId,
                        user,
                        nom_completo: user.toUpperCase(),
                        email: null,
                        password,
                        entidade_negocio: entidadeNegocio,
                        reset_password: 0,
                        iniciais: gerarIniciais(user),
                        id_perfil: 1,
                        num_verificacao: null,
                        modo_acesso: STAFF_MODO_ACESSO
                    }
                );

                idPersistido = novoId;
            }

            void await db.Commit();

            resdata.msg = id > 0
                ? 'Usuario staff atualizado com sucesso.'
                : 'Usuario staff cadastrado com sucesso.';
            resdata.data.id = idPersistido;
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffUsuarios.Salvar', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async Excluir(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                id: 0
            }
        };

        try {
            const id = Number(req.params?.id || 0);

            if (id <= 0) {
                const error = new Error('Usuario staff invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const usuario = await buscarStaffPorId(db.connection, id);

            if (!usuario) {
                const error = new Error('Usuario staff nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            void await db.connection.execute(
                `DELETE FROM tb_usuarios
                 WHERE id = :id
                   AND entidade_negocio = :entidade_negocio
                   AND modo_acesso = :modo_acesso`,
                {
                    id,
                    entidade_negocio: Number(usuario?.entidade_negocio || STAFF_ENTIDADE_PADRAO),
                    modo_acesso: STAFF_MODO_ACESSO
                }
            );

            void await db.Commit();

            resdata.msg = 'Usuario staff excluido com sucesso.';
            resdata.data.id = id;
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerStaffUsuarios.Excluir', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }
}
