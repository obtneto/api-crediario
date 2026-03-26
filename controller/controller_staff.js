import crypto from 'node:crypto';
import Database from '../connections/dbconn.js';
import Entidades from '../model/dao_entidades.js';
import StaffUsers from '../model/doa_staff.js';
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

async function getStaffCredentials(connection, inputUser = '') {

    const userInput = String(inputUser || '').trim();

    if (!connection) throw new Error('Conexao Invalida.');

    const staffUsers = new StaffUsers(connection);
    const userRegistrado = userInput ? await staffUsers.FindByUser(userInput) : false;

    if (userRegistrado) {
        return {
            user: String(userRegistrado.user || ''),
            password: String(userRegistrado.password || ''),
            name: String(process.env.STAFF_AUTH_NAME || userRegistrado.user || 'Staff Crediario').trim()
        };
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

            const staffUsers = new StaffUsers(db.connection);
            let query = `SELECT id, user FROM tb_staff_user`;
            const params = {};

            if (pesq) {
                query += ` WHERE user LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            query += ` ORDER BY user ASC, id DESC`;

            resdata.data.usuarios = await staffUsers.ExecuteQuery(query, params);
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

            const staffUsers = new StaffUsers(db.connection);
            const usuario = await staffUsers.FindById(id);

            if (!usuario) {
                const error = new Error('Usuario staff nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = {
                id: Number(usuario.id || 0),
                user: String(usuario.user || ''),
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

            if (!user) {
                const error = new Error('Informe o usuario staff.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const staffUsers = new StaffUsers(db.connection);
            let usuarioAtual = null;

            if (id > 0) {
                const registroAtual = await staffUsers.FindById(id);

                if (!registroAtual) {
                    const error = new Error('Usuario staff nao encontrado.');
                    error.statusCode = 404;
                    throw error;
                }

                usuarioAtual = { ...registroAtual };
            }

            const usuarioDuplicado = await staffUsers.FindByUser(user);

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

            staffUsers.id = id;
            staffUsers.user = user;
            staffUsers.password = password;

            const saveResult = await staffUsers.Save();

            void await db.Commit();

            const idPersistido = id > 0
                ? id
                : Number(saveResult?.insertId || 0);

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

            const staffUsers = new StaffUsers(db.connection);
            const usuario = await staffUsers.FindById(id);

            if (!usuario) {
                const error = new Error('Usuario staff nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            staffUsers.id = id;
            void await staffUsers.Excluir();

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
