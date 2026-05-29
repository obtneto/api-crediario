import Database from '../connections/dbconn.js';
import Usuarios from '../model/dao_usuarios.js';
import Entidades from '../model/dao_entidades.js';
import Perfis from '../model/dao_perfis.js';
import Vendedores from '../model/dao_vendedores.js';
import Cobradores from '../model/dao_cobradores.js';
import Produtos from '../model/dao_produtos.js';
import Rotas from '../model/dao_rotas.js';
import TiposPagamentos from '../model/dao_tipos_pagamentos.js';
import Estoque from '../model/dao_estoque.js';
import FormaPagamento from '../model/dao_forma_pagamento.js';
import ModoPagamento from '../model/dao_modo_pagamentos.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {definirSessaoHttpOnly, limparSessaoHttpOnly, obterSessaoHttpOnly, renovarSessaoHttpOnly, getCurrentToken} from '../utils/AuthSession.js';
import {addTokenToBlacklist} from '../utils/TokenBlacklist.js';
import {criptografarSenha, senhaPrecisaUpgrade, SENHA_RESET_PADRAO, validarSenha} from '../utils/Criptografia.js';
import {desencriptar} from '../utils/DecriptPayload.js';
import { validate, authSessionSchema, usuarioSalvarSchema } from '../utils/RequestValidator.js';

const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=\S{8,}).+$/;

function getPrimeiroNome(nomeCompleto = '') {
    const nome = String(nomeCompleto || '').trim();
    return nome ? nome.split(' ')[0] : '';
}

function normalizarClientPlatform(value = '') {
    return String(value || '').trim().toLowerCase() === 'mobile'
        ? 'mobile'
        : 'desktop';
}

function normalizarPerfilAcesso(usuario = {}) {
    const typePerfil = Number(usuario?.perfil_id || 0);
    const isAdmin = typePerfil === 0 || typePerfil === 1;

    return {
        type_perfil: typePerfil,
        perfil: {
            selecionar: isAdmin ? 1 : Number(usuario?.selecionar || 0),
            inserir: isAdmin ? 1 : Number(usuario?.inserir || 0),
            atualizar: isAdmin ? 1 : Number(usuario?.atualizar || 0),
            excluir: isAdmin ? 1 : Number(usuario?.excluir || 0)
        }
    };
}

function montarRespostaAutenticacao(usuario = {}, entidade = {}) {

    const fullname = String(usuario?.nom_completo || usuario?.usuario || '').trim();
    const {type_perfil, perfil} = normalizarPerfilAcesso(usuario);

    return {
        authenticated: true,
        user: String(usuario?.usuario || ''),
        firstname: getPrimeiroNome(fullname),
        fullname,
        id_vendedor: Number(usuario?.id_vendedor || 0),
        type_perfil,
        cod_perfil: String(usuario?.cod_perfil || '').trim().toUpperCase(),
        entidade: Number(entidade?.id || entidade?.entidade_negocio || 0),
        entidade_negocio: Number(entidade?.id || entidade?.entidade_negocio || 0),
        name_entidade: String(entidade?.nom_entidade || entidade?.name_entidade || ''),
        modo_acesso: String(usuario?.modo_acesso || '').trim().toUpperCase(),
        com_rota_cobranca: Number(entidade?.com_rota_cobranca || 0),
        perfil,
        reset_password: Number(usuario?.reset_password || 0)
    };
}

function entidadeEstaAtiva(entidade = {}) {
    return Number(entidade?.ativo || 0) === 1;
}

function garantirEntidadeAtiva(entidade = {}, mensagem = 'A entidade vinculada ao usuario esta bloqueada.') {
    if (entidadeEstaAtiva(entidade)) {
        return;
    }

    const error = new Error(mensagem);
    error.statusCode = 403;
    throw error;
}

async function buscarUsuariosAutenticacao(connection, user, options = {}) {
    const allowMobileMode = Boolean(options?.allowMobileMode);
    const filtroModoAcesso = allowMobileMode
        ? ''
        : " AND COALESCE(u.modo_acesso, 'DT') <> 'MB'";

    const query = `SELECT u.id, u.usuario, u.nom_completo, u.senha, u.reset_password, u.num_verificacao, u.iniciais,
        COALESCE(u.id_vendedor, 0) AS id_vendedor,
        u.entidade_negocio,
        COALESCE(p.id, 0) AS perfil_id,
        COALESCE(p.cod_perfil, '') AS cod_perfil,
        COALESCE(p.selecionar, 0) AS selecionar,
        COALESCE(p.inserir, 0) AS inserir,
        COALESCE(p.atualizar, 0) AS atualizar,
        COALESCE(p.excluir, 0) AS excluir,
        COALESCE(u.modo_acesso, '') AS modo_acesso,
        COALESCE(e.nom_entidade, '') AS nom_entidade,
        COALESCE(e.com_rota_cobranca, 0) AS com_rota_cobranca,
        COALESCE(e.ativo, 0) AS entidade_ativa
        FROM tb_usuarios u
        LEFT JOIN tb_perfis p ON p.id = u.id_perfil AND p.entidade_negocio = u.entidade_negocio
        LEFT JOIN tb_entidades e ON e.id = u.entidade_negocio
        WHERE u.usuario = :user${filtroModoAcesso}
        ORDER BY u.entidade_negocio`;

    const usuarios = await connection.execute(query, { user });
    return Array.isArray(usuarios) ? usuarios : [];
}

async function buscarUsuarioAutenticacao(connection, entidade_negocio, user, options = {}) {
    const usuarios = await buscarUsuariosAutenticacao(connection, user, options);

    return usuarios.find((item) => Number(item?.entidade_negocio || 0) === Number(entidade_negocio || 0)) || null;
}

async function buscarEntidadeAuth(entidades, entidade_negocio) {
    
    const [entidade] = await entidades.ExecuteQuery(
        `SELECT id, nom_entidade, com_rota_cobranca, ativo FROM tb_entidades WHERE id = :id`,
        { id: entidade_negocio }
    );

    return entidade || null;
}

function validarFormatoSenha(password = '') {
    return PASSWORD_REGEX.test(String(password || '').trim());
}

async function filtrarUsuariosPorSenha(usuarios = [], password = '') {
    const candidatos = [];

    for (const usuario of usuarios) {
        const senhaResetada = Number(usuario?.reset_password || 0) === 1;
        const senhaValida = senhaResetada
            ? password === SENHA_RESET_PADRAO
            : await validarSenha(password, usuario?.senha);

        if (senhaValida) {
            candidatos.push(usuario);
        }
    }

    return candidatos;
}

export class ControllerAuth {

    static async IniciarSessao(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        try {

            const entidade_negocio_informada = Number(req.body?.entidade_negocio || 0);
            const user = String(req.body?.user || '').trim();
            const password = desencriptar(String(req.body?.password || '').trim());
            const clientPlatform = normalizarClientPlatform(req.headers?.['x-client-platform']);

            validate(authSessionSchema, {
                entidade_negocio: entidade_negocio_informada > 0 ? entidade_negocio_informada : undefined,
                user,
                password
            });

            if (!user) {
                const error = new Error('Informe o usuario.');
                error.statusCode = 400;
                throw error;
            }

            if (!password) {
                const error = new Error('Informe a senha.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const entidades = new Entidades(db.connection);
            const usuariosEncontrados = await buscarUsuariosAutenticacao(db.connection, user, {
                allowMobileMode: clientPlatform === 'mobile'
            });

            const usuariosFiltrados = entidade_negocio_informada > 0
                ? usuariosEncontrados.filter((item) => Number(item?.entidade_negocio || 0) === entidade_negocio_informada)
                : usuariosEncontrados;

            if (!usuariosFiltrados.length) {
                const error = new Error('Usuario ou senha invalidos.');
                error.statusCode = 401;
                throw error;
            }

            const usuariosComSenhaValida = await filtrarUsuariosPorSenha(usuariosFiltrados, password);

            if (!usuariosComSenhaValida.length) {
                const error = new Error('Usuario ou senha invalidos.');
                error.statusCode = 401;
                throw error;
            }

            const usuariosComEntidadeAtiva = usuariosComSenhaValida.filter(
                (item) => Number(item?.entidade_ativa || 0) === 1
            );

            if (!usuariosComEntidadeAtiva.length) {
                const error = new Error('A entidade vinculada ao usuario esta bloqueada. Procure o administrador.');
                error.statusCode = 403;
                throw error;
            }

            if (entidade_negocio_informada <= 0 && usuariosComEntidadeAtiva.length > 1) {
                const entidadesDuplicadas = usuariosComEntidadeAtiva
                    .map((item) => String(item?.nom_entidade || `Entidade ${item?.entidade_negocio || ''}`).trim())
                    .filter(Boolean)
                    .join(', ');
                const error = new Error(
                    entidadesDuplicadas
                        ? `Encontramos mais de uma conta compativel para este usuario nas entidades (${entidadesDuplicadas}). Contate o administrador para padronizar o login.`
                        : 'Encontramos mais de uma conta compativel para este usuario. Contate o administrador para padronizar o login.'
                );
                error.statusCode = 409;
                throw error;
            }

            const usuario = usuariosComEntidadeAtiva[0] || null;

            if (!usuario) {
                const error = new Error('Usuario ou senha invalidos.');
                error.statusCode = 401;
                throw error;
            }

            const entidade_negocio = Number(usuario.entidade_negocio || entidade_negocio_informada || 0);
            const usuarios = new Usuarios(db.connection, entidade_negocio);

            const entidade = await buscarEntidadeAuth(entidades, entidade_negocio);

            if (!entidade) {
                const error = new Error('Entidade de negocio nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            garantirEntidadeAtiva(entidade, 'A entidade vinculada ao usuario esta bloqueada. Procure o administrador.');

            const senhaResetada = Number(usuario.reset_password || 0) === 1;

            if (senhaPrecisaUpgrade(usuario.senha)) {
                try {
                    void await usuarios.FindByUser(user);
                    usuarios.senha = await criptografarSenha(password);
                    void await usuarios.Save();
                    usuario.senha = usuarios.senha;
                } catch (upgradeError) {
                    GravarLog('ControllerAuth.IniciarSessao.UpgradeSenha', upgradeError.stack);
                }
            }

            const sessao = montarRespostaAutenticacao(usuario, entidade);
            const sessaoPersistida = definirSessaoHttpOnly(res, {
                ...sessao,
                entidade_negocio
            });

            resdata.msg = senhaResetada
                ? 'Senha resetada identificada. Informe uma nova senha para continuar.'
                : 'Sessao iniciada com sucesso.';
            resdata.data = {
                ...sessao,
                token: String(sessaoPersistida?.token || '')
            };

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerAuth.IniciarSessao', error.stack);
        }
        finally {
            if (db.connection) {
                void db.CreateEvents()
                    .catch((eventError) => {
                        GravarLog('ControllerAuth.IniciarSessao.CreateEvents', eventError.stack);
                    })
                    .finally(() => {
                        void db.Close();
                    });
            } else {
                void db.Close();
            }
        }

        res.status(resdata.status).json(resdata);
    }

    static async SessaoAtual(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        const sessao = obterSessaoHttpOnly(req);

        if (!sessao || Number(sessao.entidade_negocio || 0) <= 0) {
            resdata.msg = 'Sessao expirada. Faca login novamente.';
            resdata.data = {
                authenticated: false
            };
            return res.status(resdata.status).json(resdata);
        }

        try {
            void await db.Connect();

            const entidades = new Entidades(db.connection);
            const entidade = await buscarEntidadeAuth(entidades, Number(sessao.entidade_negocio || 0));
            const usuarioSessao = await buscarUsuarioAutenticacao(
                db.connection,
                Number(sessao.entidade_negocio || 0),
                String(sessao.user || '').trim(),
                { allowMobileMode: true }
            );

            if (!entidade) {
                limparSessaoHttpOnly(res);
                resdata.msg = 'Entidade de negocio nao encontrada.';
                resdata.data = {
                    authenticated: false
                };
                return res.status(resdata.status).json(resdata);
            }

            garantirEntidadeAtiva(entidade, 'A entidade vinculada ao usuario esta bloqueada. Faca login novamente.');

            const sessaoAtualizada = {
                ...sessao,
                id_vendedor: Number(usuarioSessao?.id_vendedor || sessao?.id_vendedor || 0),
                name_entidade: String(entidade.nom_entidade || ''),
                com_rota_cobranca: Number(entidade.com_rota_cobranca || 0)
            };
            const sessaoRenovada = renovarSessaoHttpOnly(res, sessaoAtualizada);
            const payload = sessaoRenovada?.payload || sessaoAtualizada;

            resdata.data = {
                authenticated: true,
                user: String(payload.user || ''),
                firstname: String(payload.firstname || ''),
                fullname: String(payload.fullname || payload.user || ''),
                id_vendedor: Number(payload.id_vendedor || 0),
                type_perfil: Number(payload.type_perfil || 0),
                cod_perfil: String(payload.cod_perfil || ''),
                entidade: Number(payload.entidade_negocio || 0),
                entidade_negocio: Number(payload.entidade_negocio || 0),
                name_entidade: String(payload.name_entidade || ''),
                modo_acesso: String(payload.modo_acesso || ''),
                com_rota_cobranca: Number(payload.com_rota_cobranca || 0),
                perfil: {
                    selecionar: Number(payload?.perfil?.selecionar || 0),
                    inserir: Number(payload?.perfil?.inserir || 0),
                    atualizar: Number(payload?.perfil?.atualizar || 0),
                    excluir: Number(payload?.perfil?.excluir || 0)
                },
                token: String(sessaoRenovada?.token || ''),
                reset_password: Number(payload.reset_password || 0)
            };
        } catch (error) {
            if (Number(error.statusCode || 0) === 403) {
                limparSessaoHttpOnly(res);
                resdata.msg = error.message;
                resdata.data = {
                    authenticated: false
                };
                return res.status(resdata.status).json(resdata);
            }

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerAuth.SessaoAtual', error.stack);

        } finally {
            void await db.Close();
        }

        return res.status(resdata.status).json(resdata);
    }

    static async EncerrarSessao(req, res) {

        const resdata = {
            err: 0,
            msg: 'Sessao encerrada com sucesso.',
            status: 200,
            data: []
        };

        const token = getCurrentToken(req);
        const ttlSeconds = Number(process.env.AUTH_SESSION_TIMEOUT_SECONDS || 720);

        if (token) {
            addTokenToBlacklist(token, ttlSeconds);
        }

        limparSessaoHttpOnly(res);

        return res.status(resdata.status).json(resdata);
    }

    static async SolicitarResetSenhaPublica(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        try {
            const entidade_negocio = Number(req.body?.entidade_negocio || 0);
            const user = String(req.body?.user || '').trim();

            if (entidade_negocio <= 0) {
                const error = new Error('Entidade de negocio invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (!user) {
                const error = new Error('Informe o usuario para resetar a senha.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const entidades = new Entidades(db.connection);
            const entidade = await buscarEntidadeAuth(entidades, entidade_negocio);

            if (!entidade) {
                const error = new Error('Entidade de negocio nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            garantirEntidadeAtiva(entidade, 'A entidade vinculada ao usuario esta bloqueada. Procure o administrador.');

            const usuarios = new Usuarios(db.connection, entidade_negocio);
            const usuario = await buscarUsuarioAutenticacao(db.connection, entidade_negocio, user, {
                allowMobileMode: true
            });

            if (!usuario) {
                const error = new Error('Usuario nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            void await usuarios.FindByUser(user);
            usuarios.senha = await criptografarSenha(SENHA_RESET_PADRAO);
            usuarios.reset_password = 1;

            void await usuarios.Save();
            void await db.Commit();

            resdata.msg = `Senha resetada para ${SENHA_RESET_PADRAO}. Faça login e altere-a em seguida.`;
            resdata.data = {
                user,
                entidade: entidade_negocio,
                name_entidade: entidade.nom_entidade,
                reset_password: 1
            };

        } catch (error) {
            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerAuth.SolicitarResetSenhaPublica', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }

    static async AlterarSenha(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {}
        };

        try {
            const entidade_negocio = obterEntidadeNegocio(req);
            const user = String(req.auth?.user || '').trim();
            const verification_number = String(req.body?.verification_number || '').trim();
            const new_password = String(req.body?.new_password || '').trim();
            const confirm_password = String(req.body?.confirm_password || '').trim();

            if (!user || entidade_negocio <= 0) {
                const error = new Error('Sessao invalida.');
                error.statusCode = 401;
                throw error;
            }

            if (!verification_number) {
                const error = new Error('Informe o numero de verificacao.');
                error.statusCode = 400;
                throw error;
            }

            if (!new_password) {
                const error = new Error('Informe a nova senha.');
                error.statusCode = 400;
                throw error;
            }

            if (!validarFormatoSenha(new_password)) {
                const error = new Error('A nova senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula e número.');
                error.statusCode = 400;
                throw error;
            }

            if (new_password !== confirm_password) {
                const error = new Error('A confirmação da nova senha não confere.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const entidades = new Entidades(db.connection);
            const entidade = await buscarEntidadeAuth(entidades, entidade_negocio);

            if (!entidade) {
                const error = new Error('Entidade de negocio nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            garantirEntidadeAtiva(entidade, 'A entidade vinculada ao usuario esta bloqueada. Procure o administrador.');

            const usuarios = new Usuarios(db.connection, entidade_negocio);
            const usuario = await buscarUsuarioAutenticacao(db.connection, entidade_negocio, user, {
                allowMobileMode: true
            });

            if (!usuario) {
                const error = new Error('Usuario nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const numeroVerificacaoUsuario = String(usuario.num_verificacao || '').trim();

            if (!numeroVerificacaoUsuario) {
                const error = new Error('Numero de verificacao nao encontrado para este usuario. Solicite um novo reset.');
                error.statusCode = 400;
                throw error;
            }

            if (verification_number !== numeroVerificacaoUsuario) {
                const error = new Error('Numero de verificacao invalido.');
                error.statusCode = 401;
                throw error;
            }

            void await usuarios.FindByUser(user);
            usuarios.senha = await criptografarSenha(new_password);
            usuarios.reset_password = 0;
            usuarios.num_verificacao = null;

            void await usuarios.Save();
            void await db.Commit();

            const sessao = montarRespostaAutenticacao({...usuario, reset_password: 0}, entidade);
            const sessaoPersistida = definirSessaoHttpOnly(res, {
                ...sessao,
                entidade_negocio
            });

            resdata.msg = 'Senha alterada com sucesso.';
            resdata.data = {
                ...sessao,
                token: String(sessaoPersistida?.token || '')
            };

        } catch (error) {
            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerAuth.AlterarSenha', error.stack);
        }

        void await db.Close();

        return res.status(resdata.status).json(resdata);
    }
}

export class ControllerUsuarios{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                usuarios: [],
                entidades: [],
                perfis: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const usuario = new Usuarios(db.connection, entidade);

            const params = { entidade_negocio: entidade };
            let query = `SELECT u.id, u.usuario, u.nom_completo, u.email, u.entidade_negocio,p.cod_perfil,
                         u.id_perfil, u.modo_acesso, u.reset_password, u.iniciais, p.nom_perfil,u.id_vendedor, u.id_cobrador
                         FROM tb_usuarios u
                         LEFT JOIN tb_perfis p ON p.id = u.id_perfil AND p.entidade_negocio = u.entidade_negocio
                         WHERE u.entidade_negocio = :entidade_negocio AND u.modo_acesso IN ('DT','DM','MB')`;

            if (pesq != "*") {
                query += ` AND u.nom_completo LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.usuarios = await usuario.ExecuteQuery(query, params);

            const entidades = new Entidades(db.connection, entidade);
            const perfis = new Perfis(db.connection, entidade);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = :entidade`;

            resdata.data.entidades = await entidades.ExecuteQuery(query,{ entidade });

            let perfisRows = await perfis.ExecuteQuery(`SELECT id,nom_perfil FROM tb_perfis WHERE entidade_negocio = :entidade_negocio`, { entidade_negocio: entidade });
            
            resdata.data.perfis = perfisRows;


        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerUsuarios.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id
            const entidade = obterEntidadeNegocio(req);

            void await db.Connect();

            const usuario = new Usuarios(db.connection, entidade);

            const usuarioRow = await usuario.FindById(id);

            if (usuarioRow) {
                const usuarioSemSenha = { ...usuarioRow };
                delete usuarioSemSenha.senha;
                resdata.data = {
                    ...usuarioSemSenha,
                    password: ''
                };
            }


        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerUsuarios.Editar', error.stack);    
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            let {id,usuario,nom_completo,email,id_perfil,id_cobrador,id_vendedor,modo_acesso,reset_password,password} = req.body;
            const entidade = obterEntidadeNegocio(req);

            const validated = validate(usuarioSalvarSchema, {id,usuario,nom_completo,email,id_perfil,id_cobrador,id_vendedor,modo_acesso,reset_password,password});
            ({ id, usuario, nom_completo, email, id_perfil, id_vendedor,id_cobrador, modo_acesso, reset_password, password } = validated);

            const passwordNormalizado = String(password || '').trim();
            
            void await db.Connect();

            void await db.Begin();

            const usuarios = new Usuarios(db.connection, entidade);

            void await usuarios.FindByUser(usuario);

            if (usuarios.found && id == 0) {
                const error = new Error('Usuario já cadastrado.');
                error.statusCode = 404;
                throw error;
            }

            const usuarioExistente = Boolean(usuarios.found);
            usuarios.id = id;
            usuarios.usuario = usuario;
            usuarios.nom_completo = nom_completo;
            usuarios.email = email;
            usuarios.id_perfil = id_perfil;
            usuarios.id_vendedor = id_vendedor || null;
            usuarios.id_cobrador = id_cobrador || null;
            if (modo_acesso) {
                usuarios.modo_acesso = modo_acesso;
            } else if (!usuarioExistente) {
                usuarios.modo_acesso = 'DT';
            }
            usuarios.reset_password = reset_password ? 1 : 0;

            if (reset_password) {

                const numero = Math.floor(100000 + Math.random() * 900000);

                /*await enviarEmailResend({
                    from: "Crediario <noreply@fshp.se.gov.br>",
                    to: email, // Temporário para testes
                    subject: 'Reset de Senha',
                    html: `
                        <div style="margin:0;padding:24px 0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                    <td align="center" style="padding:0 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                                            <tr>
                                                <td style="padding:28px 28px 12px 28px;text-align:center;">
                                                    <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">
                                                        Crediario
                                                    </p>
                                                    <h2 style="margin:10px 0 0 0;font-size:22px;line-height:1.3;color:#111827;">
                                                        Numero de verificacao
                                                    </h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:0 28px;text-align:center;">
                                                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4b5563;">
                                                        Use o codigo abaixo para concluir a alteracao da sua senha no sistema.
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:0 28px 16px 28px;text-align:center;">
                                                    <div style="display:inline-block;padding:14px 22px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:10px;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;">
                                                        ${numero}
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:0 28px 12px 28px;text-align:center;">
                                                    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                                                        Senha padrao para login:
                                                    </p>
                                                    <p style="margin:6px 0 0 0;font-size:17px;line-height:1.4;font-weight:700;letter-spacing:0.5px;color:#111827;">
                                                        ${SENHA_RESET_PADRAO}
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:0 28px 28px 28px;text-align:center;">
                                                    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                                                        Apos o login, voce sera direcionado para alterar a senha.
                                                        Se voce nao solicitou esta acao, ignore este e-mail.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `
                });*/

                usuarios.num_verificacao = numero;
                usuarios.senha = SENHA_RESET_PADRAO;

            } else if (passwordNormalizado) {
                usuarios.senha = await criptografarSenha(passwordNormalizado);
            } else if (!usuarioExistente) {
                usuarios.senha = await criptografarSenha(String(usuario || '').trim());
            }

            const ini = nom_completo.split(' ');

            let iniciais = ini[0].substring(0,1) + ini[ini.length -1].substring(0,1)

            usuarios.iniciais = iniciais;
            
            void await usuarios.Save();

            void await db.Commit();
            resdata.msg = 'Usuario salvo com sucesso.';

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerUsuarios.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const usuarios = new Usuarios(db.connection, entidade_negocio);

            void await usuarios.Excluir(id);
            resdata.data = [];

            void await db.Commit();
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerUsuarios.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerModoAcessos{

    static async ListarModoAcessosDesktop(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const query = "SELECT * FROM tb_modo_acessos WHERE modo_acesso IN ('DT','DM','MB')";

            resdata.data = await db.connection.execute(query);
            
        } catch (error) {

            resdata.err = 500;
            resdata.msg = "Erro Inesperado ocorreu, verifique com o suporte tecnico.";
            resdata.status = 500;

            GravarLog('ControllerModoAcessos.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarModoAcessosMobile(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const camposDisponiveis = await db.connection.execute(
                "SHOW COLUMNS FROM tb_modo_acessos WHERE Field IN ('nome_acesso','descricao','nom_modo_acesso','desc_modo_acesso')"
            );

            const prioridades = ['nome_acesso', 'descricao', 'nom_modo_acesso', 'desc_modo_acesso'];
            const campos = Array.isArray(camposDisponiveis)
                ? camposDisponiveis.map((item) => String(item?.Field || '').trim()).filter(Boolean)
                : [];
            const labelColumn = prioridades.find((campo) => campos.includes(campo)) || 'modo_acesso';
            const query = `SELECT modo_acesso, COALESCE(${labelColumn}, modo_acesso) AS nome_acesso
            FROM tb_modo_acessos
            WHERE modo_acesso IN ('DM','MB')`;

            resdata.data = await db.connection.execute(query);
            
        } catch (error) {

            resdata.err = 500;
            resdata.msg = "Erro Inesperado ocorreu, verifique com o suporte tecnico.";
            resdata.status = 500;

            GravarLog('ControllerModoAcessos.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerEntidades{

    static async ListarAtivos(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            void await db.Connect();

            const entidades = new Entidades(db.connection);
            const id = obterEntidadeNegocio(req);

            let query = `SELECT id,nom_entidade,nom_responsavel,num_cnpj,cel_contato
            FROM tb_entidades WHERE ativo = 1 AND id = :id`;
            
            resdata.data = await entidades.ExecuteQuery(query, {id});

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerEntidades.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            void await db.Connect();

            const entidades = new Entidades(db.connection);
            const entidadeNegocio = obterEntidadeNegocio(req);

            let query = `SELECT id,nom_entidade,nom_responsavel,num_cnpj,cel_contato
            FROM tb_entidades`;
            const params = [];

            if (entidadeNegocio > 0) {
                query += ` WHERE id = ?`;
                params.push(entidadeNegocio);
            }

            resdata.data = await entidades.ExecuteQuery(query, params);

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerEntidades.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const {id,nom_entidade,nom_responsavel,num_cnpj,cel_contato,percent_desconto_cobranca,percent_desconto_venda,cel_whatsapp_bussiness,ativo} = req.body;
            
            void await db.Connect();

            void await db.Begin();

            const entidades = new Entidades(db.connection, obterEntidadeNegocio(req));

            void await entidades.FindById(id);

            entidades.id = id;
            entidades.nom_entidade = nom_entidade;
            entidades.nom_responsavel = nom_responsavel;
            entidades.num_cnpj = num_cnpj;
            entidades.cel_contato = cel_contato;
            entidades.cel_whatsapp_bussiness = cel_whatsapp_bussiness;
            entidades.percent_desconto_venda = percent_desconto_venda;
            entidades.percent_desconto_cobranca = percent_desconto_cobranca;
            entidades.ativo = ativo;
           
            void await entidades.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerEntidades.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerPerfis{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                perfis: []
            }
        }

        try {
            
            const pesq = req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req)

            void await db.Connect();

            const perfis = new Perfis(db.connection,entidade_negocio );

            let query = `SELECT * FROM tb_perfis WHERE entidade_negocio = :entidade_negocio`;

            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_perfil LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            const rows = await perfis.ExecuteQuery(query, params);

            console.log(rows,pesq,entidade_negocio)
            
            resdata.data.perfis = rows;

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerPerfis.Listar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = Number(req.params.id || 0);
            const entidade = obterEntidadeNegocio(req);

            if (!id || id == 0) {
                const error = new Error("ID do Perfil invalido.");
                error.statusCode = 404;
                throw error;
            }

            void await db.Connect();

            const perfis = new Perfis(db.connection, entidade);

            resdata.data = await perfis.FindById(id);

        } catch (error) {

            resdata.err = error.statusCode || 500;
            resdata.msg = error.message;
            resdata.status = error.statusCode || 500;

            if(resdata.err == 500) GravarLog('ControllerPerfis.Editar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const {id,nom_perfil,cod_perfil,selecionar,insert,atualizar,excluir} = req.body;
            const entidade = obterEntidadeNegocio(req);

            if (!id) {
                const error = new Error("ID do perfil invalido.");
                error.statusCode = 404;
                throw error;
            }

            if (!cod_perfil || cod_perfil.trim() === '') {
                const error = new Error("Código do perfil é obrigatório.");
                error.statusCode = 400;
                throw error;
            }

            if (!nom_perfil || nom_perfil.trim() === '') {
                const error = new Error("Nome do perfil é obrigatório.");
                error.statusCode = 400;
                throw error;
            }
            
            void await db.Connect();

            void await db.Begin();

            const perfils = new Perfis(db.connection, entidade);

            void await perfils.FindById(id);

            perfils.id = id;
            perfils.nom_perfil = nom_perfil;
            perfils.cod_perfil = cod_perfil;
            perfils.selecionar = selecionar ? 1 : 0;
            perfils.insert = insert ? 1 : 0;
            perfils.atualizar = atualizar ? 1 : 0;
            perfils.excluir = excluir ? 1 : 0;
           
            void await perfils.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = error.statusCode || 500;
            resdata.msg = error.message;
            resdata.status = error.statusCode || 500;

            if (resdata.err == 500) GravarLog('ControllerPerfis.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = Number(req.params.id || 0);
            const entidade = obterEntidadeNegocio(req);

            if (!id || id == 0) {
                const error = new Error("ID do perfil invalido.");
                error.statusCode = 404;
                throw error;
            }
            
            void await db.Connect();

            void await db.Begin();

            const perfils = new Perfis(db.connection,entidade);

            void await perfils.Excluir(id);
            
            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = error.statusCode || 500;
            resdata.msg = error.message;
            resdata.status = error.statusCode || 500;

            if(resdata.err == 500) GravarLog('ControllerPerfis.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarTiposPerfis (req,res){

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            void await db.Connect();

            const query = `SELECT cod_tipo_perfil,nom_tipo_perfil FROM tb_tipos_perfis`;

            const tipos = await db.connection.query(query);

            resdata.data = tipos;

        } catch (error) {
            
            resdata.err = error.statusCode || 500;
            resdata.msg = error.message;
            resdata.status = error.statusCode || 500;

            if(resdata.err == 500) GravarLog('ControllerPerfis.ListarTiposPerfis', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerVendedores{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                vendedores: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const vendedores = new Vendedores(db.connection, entidade);
            const entidades = new Entidades(db.connection,entidade);

            let query = null;

            query = `SELECT * FROM tb_vendedores WHERE entidade_negocio = :entidade_negocio`;
            const params = { entidade_negocio: entidade };

            if (pesq != "*") {
                query += ` AND nom_vendedor LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.vendedores = await vendedores.ExecuteQuery(query, params);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerVendedores.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

     static async ListarAtivos(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                vendedores: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const vendedores = new Vendedores(db.connection, entidade);
            const entidades = new Entidades(db.connection,entidade);

            let query = null;

            query = `SELECT * FROM tb_vendedores WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;
            const params = { entidade_negocio: entidade };

            if (pesq != "*") {
                query += ` AND nom_vendedor LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.vendedores = await vendedores.ExecuteQuery(query, params);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerVendedores.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = Number(req.params.id || 500);
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const vendedores = new Vendedores(db.connection, entidade_negocio);

            resdata.data = await vendedores.FindById(id);

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerVendedores.Editar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            let {id,nom_vendedor,comissao,cel_contato,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const vendedores = new Vendedores(db.connection, entidade_negocio);

            void await vendedores.FindById(id);


            vendedores.id = id;
            vendedores.nom_vendedor = nom_vendedor;
            vendedores.comissao = comissao;
            vendedores.cel_contato = cel_contato;
            vendedores.ativo = ativo;

            void await vendedores.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = 'Erro interno do servidor (500). Contate o administrador do sistema.';
            resdata.status = 500;

            GravarLog('ControllerVendedores.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const vendedores = new Vendedores(db.connection, entidade_negocio);

            void await vendedores.FindById(id);

            void await vendedores.Excluir(id);

            void await db.Commit();
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerVendedores.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerCobradores{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                cobradores: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const cobradores = new Cobradores(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_cobradores WHERE entidade_negocio = :entidade_negocio`;
            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_cobrador LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.cobradores = await cobradores.ExecuteQuery(query, params);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarAtivos(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                cobradores: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const cobradores = new Cobradores(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_cobradores WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;
            const paramsAtivos = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_cobrador LIKE :pesq`;
                paramsAtivos.pesq = `%${pesq}%`;
            }

            resdata.data.cobradores = await cobradores.ExecuteQuery(query, paramsAtivos);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const cobradores  = new Cobradores(db.connection, entidade_negocio);

            resdata.data = await cobradores.FindById(id);



        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            let {id,nom_cobrador,comissao,cel_contato,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const cobradores = new Cobradores(db.connection, entidade_negocio);

            void await cobradores.FindById(id);


            cobradores.id = id;
            cobradores.nom_cobrador = nom_cobrador;
            cobradores.comissao = comissao;
            cobradores.cel_contato = cel_contato;
            cobradores.ativo = ativo;

            void await cobradores.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = 'Erro interno do servidor (500). Contate o administrador do sistema.';
            resdata.status = 500;

            GravarLog('ControllerCobradores.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const cobradores = new Cobradores(db.connection,entidade_negocio);

            void await cobradores.FindById(id);


            void await cobradores.Excluir(id);

            void await db.Commit();
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerProdutos {

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                produtos: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const produtos = new Produtos(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_produtos WHERE entidade_negocio = :entidade_negocio`;
            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_produto LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.produtos = await produtos.ExecuteQuery(query, params);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarAtivos(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                produtos: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const produtos = new Produtos(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_produtos WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;
            const paramsAtivos = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_produto LIKE :pesq`;
                paramsAtivos.pesq = `%${pesq}%`;
            }

            resdata.data.produtos = await produtos.ExecuteQuery(query, paramsAtivos);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id || null
            const entidade_negocio = obterEntidadeNegocio(req);

            if (!id) {
                const error = new Error('ID não fornecido');
                error.status = 400;
                throw error;
            }

            void await db.Connect();

            const produtos  = new Produtos(db.connection, entidade_negocio);

            resdata.data = await produtos.FindById(id);


        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = error.status || 500;
            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            let {id,nom_produto,mar_produto,und_produto,prc_vista,prc_prazo,estq_max,estq_min,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const produtos = new Produtos(db.connection, entidade_negocio);

            void await produtos.FindById(id);

            if (!produtos.found) {
                ativo = 1
            }

            produtos.nom_produto = nom_produto;
            produtos.mar_produto = mar_produto;
            produtos.und_produto = und_produto;
            produtos.prc_vista = prc_vista;
            produtos.prc_prazo = prc_prazo;
            produtos.estq_max = estq_max;
            produtos.estq_min = estq_min;
            produtos.ativo = ativo;

            void await produtos.Save();

            void await estoque.FindById(produtos.id);

            if (!estoque.found) {

                estoque.id_produto = produtos.id;
                estoque.qt_disponivel = 0;
                estoque.qt_reservada = 0;
                
                void await estoque.Save();

            }

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = 'Erro interno do servidor (500). Contate o administrador do sistema.';
            resdata.status = 500;

            GravarLog('ControllerProdutos.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const produtos = new Produtos(db.connection, entidade_negocio);
            const registro = await produtos.FindById(id);

            if (!registro) throw new Error('Nao foi possivel excluir esse produto')


            void await produtos.Excluir(id);
            resdata.data = [];

            void await db.Commit();
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            console.log(error.stack)

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerRotas {

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                rotas: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const rotas = new Rotas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_rotas WHERE entidade_negocio = :entidade_negocio`;
            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_rota LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            resdata.data.rotas = await rotas.ExecuteQuery(query, params);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerRotas.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarAtivas(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                rotas: [],
                entidades: []
            }
        }

        try {
            
            const pesq =  req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            const rotas = new Rotas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            let query = null;

            query = `SELECT * FROM tb_rotas WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;
            const paramsAtivos = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_rota LIKE :pesq`;
                paramsAtivos.pesq = `%${pesq}%`;
            }

            resdata.data.rotas = await rotas.ExecuteQuery(query, paramsAtivos);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = :id`, { id: entidade_negocio })

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerRotas.ListarAtivas', error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const rotas  = new Rotas(db.connection, entidade_negocio);

            resdata.data = await rotas.FindById(id);


        } catch (error) {
            
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerRotas.Editar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            let {id,nom_rota,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const rotas = new Rotas(db.connection, entidade_negocio);

            void await rotas.FindById(id);

            rotas.id = id;
            rotas.nom_rota = nom_rota;
            rotas.ativo = ativo;

            void await rotas.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = 'Erro interno do servidor (500). Contate o administrador do sistema.';
            resdata.status = 500;

            GravarLog('ControllerRotas.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const rotas = new Rotas(db.connection, entidade_negocio);

            void await rotas.Excluir(id);

            void await db.Commit();
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerRotas.Excluir', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerTiposPagamentos{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                tipos: []
            }
        }

        try {
            
            const pesq = req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const tipos = new TiposPagamentos(db.connection, entidade_negocio);

            let query = `SELECT * FROM tb_tipos_pagamentos WHERE entidade_negocio = :entidade_negocio`;
            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_tipo LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            const rows = await tipos.ExecuteQuery(query, params);
            
            resdata.data.tipos = rows;

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerTiposPagamentos.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarAtivos(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                tipos: []
            }
        }

        try {
            
            const pesq = req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const tipos = new TiposPagamentos(db.connection, entidade_negocio);

            let query = `SELECT * FROM tb_tipos_pagamentos WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;
            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_tipo LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            const rows = await tipos.ExecuteQuery(query, params);
            
            resdata.data.tipos = rows;

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerTiposPagamentos.ListarAtivos', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const tipos = new TiposPagamentos(db.connection,entidade_negocio);

            resdata.data = await tipos.FindById(id);


        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerTiposPagamentos.Editar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const {id,nom_tipo,ativo,dias_apos_pagamnto} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            const diasAposPagamento = Number(dias_apos_pagamnto ?? 0);

            if (!Number.isFinite(diasAposPagamento) || diasAposPagamento < 0) {
                const error = new Error('Dias apos pagamento invalido.');
                error.statusCode = 400;
                throw error;
            }
            
            void await db.Connect();

            void await db.Begin();

            const tipos = new TiposPagamentos(db.connection,entidade_negocio);

            void await tipos.FindById(id);

            tipos.id = id;
            tipos.nom_tipo = nom_tipo;
            tipos.ativo = ativo;
            tipos.dias_apos_pagamnto = diasAposPagamento;
            
            void await tipos.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerTiposPagamentos.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const tipos = new TiposPagamentos(db.connection, entidade_negocio);
            void await tipos.FindById(id);


            void await tipos.Excluir(id);

            resdata.msg = 'Tipo de pagamento excluido com sucesso.';

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerTiposPagamentos.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerFormaPagamento {

    static async Listar(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            void await db.Connect();

            const formaPagamento = new FormaPagamento(db.connection);

            const query = `SELECT cod_forma,nom_forma FROM tb_forma_pagamento`;

            const data = await formaPagamento.ExecuteQuery(query);

            resdata.data = data;

        } catch (error) {
            
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerFormaPagamento.Listar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
        
    }

    static async BuscarPorId(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = Number(req.params.id || 0);
            
            void await db.Connect();
    
            if (id === undefined) {
                const error = new Error('ID não informado');
                error.status = 400;
                throw error;
            }

            const formaPagamento = new FormaPagamento(db.connection);

            const data =  await formaPagamento.FindById(id)

            if (!formaPagamento.found) {
                const error = new Error('Forma de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            resdata.data = data;

        } catch (error) {
            
            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerFormaPagamento.Buscar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
        
    }

    static async BuscarPorCodigo(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const codigo = String(req.params.cod_forma || '').trim();
            
            void await db.Connect();
    
            if (!codigo) {
                const error = new Error('Código não informado');
                error.status = 400;
                throw error;
            }

            const formaPagamento = new FormaPagamento(db.connection);

            void await formaPagamento.FindByCodForma(codigo);

            if (!formaPagamento.found) {
                const error = new Error('Forma de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            resdata.data = {
                id: formaPagamento.id,
                cod_forma: formaPagamento.cod_forma,
                nom_forma: formaPagamento.nom_forma,
                ativo: formaPagamento.ativo
            };

        } catch (error) {
            
            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerFormaPagamento.BuscarPorCodigo', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
        
    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            void await db.Begin();

            const id = Number(req.body.id || 0);
            const cod_forma = req.body.cod_forma || '';
            const nom_forma = req.body.nom_forma || '';

            if(id === undefined) {
                const error = new Error('ID não informado');
                error.status = 400;
                throw error;
            }

            if (!cod_forma || !nom_forma) {
                const error = new Error('Código e nome da forma de pagamento são obrigatórios');
                error.status = 400;
                throw error;
            }

            const formaPagamento = new FormaPagamento(db.connection);

            void await formaPagamento.FindById(id);

            formaPagamento.cod_forma = cod_forma;
            formaPagamento.nom_forma = nom_forma;

            void await formaPagamento.Save();

            void await db.Commit();

            resdata.msg = "Forma de pagamento salva com sucesso";
            
        } catch (error) {

            void await db.RollBack();
            
            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerFormaPagamento.Salvar', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
        
    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            void await db.Begin();

            const cod_forma = String(req.params.cod_forma || req.body.cod_forma || '').trim();

            if(!cod_forma) {
                const error = new Error('Código da forma de pagamento não informado');
                error.status = 400;
                throw error;
            }

            const formaPagamento = new FormaPagamento(db.connection);

            void await formaPagamento.FindByCodForma(cod_forma);

            if (!formaPagamento.found) {
                const error = new Error('Forma de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            void await formaPagamento.Excluir();

            void await db.Commit();

            resdata.msg = "Forma de pagamento excluída com sucesso";
            
        } catch (error) {

            void await db.RollBack();

            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerFormaPagamento.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
    
}

export class ControllerModalidadePagamento {

    static async Listar(req,res) {

        const db =  new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const cod_forma = String(req.params.cod_forma).trim() || null;

            const modoPagamento = new ModoPagamento(db.connection);

            let query = "SELECT id, cod_mod_pagamento,nom_mod_pagamento ,cod_forma_pagamento FROM tb_modalidade_pagamento";

            if (cod_forma !== "undefined") {
               query += " WHERE cod_forma_pagamento = :cod_forma";
            }

            const rows = await modoPagamento.ExecuteQuery(query, { cod_forma });

            resdata.data = rows;
            
        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerModalidadePagamento.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async BuscarPorId(req,res) {

        const db =  new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const modoPagamento = new ModoPagamento(db.connection);

            const id = Number(req.params.id || 0);

            if (id <= 0) {
                const error = new Error('ID não informado');
                error.status = 400;
                throw error;
            }

            void await modoPagamento.FindById(id);

            if (!modoPagamento.found) {
                const error = new Error('Modalidade de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            resdata.data = {
                id: modoPagamento.id,
                cod_mod_pagamento: modoPagamento.cod_mod_pagamento,
                nom_mod_pagamento: modoPagamento.nom_mod_pagamento,
                cod_forma_pagamento: modoPagamento.cod_forma_pagamento
            };
            
        } catch (error) {

            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerModalidadePagamento.BuscarPorId', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async BuscarPorCodigo(req,res) {

        const db =  new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const modoPagamento = new ModoPagamento(db.connection);

            const codigo = String(req.params.cod_mod || '').trim().toUpperCase();

            if (!codigo) {
                const error = new Error('Código da modalidade de pagamento não informado');
                error.status = 400;
                throw error;
            }

            void await modoPagamento.FindByCodModalidade(codigo);

            if (!modoPagamento.found) {
                const error = new Error('Modalidade de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            resdata.data = {
                id: modoPagamento.id,
                cod_mod_pagamento: modoPagamento.cod_mod_pagamento,
                nom_mod_pagamento: modoPagamento.nom_mod_pagamento,
                cod_forma_pagamento: modoPagamento.cod_forma_pagamento
            };
            
        } catch (error) {

            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerModalidadePagamento.BuscarPorCodigo', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db =  new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            void await db.Begin()

            const modoPagamento = new ModoPagamento(db.connection);

            const id = Number(req.body.id || 0);
            const codigo = String(req.body.cod_mod || '').trim().toUpperCase();
            const nom_mod = String(req.body.nom_mod || '').trim().toUpperCase();
            const cod_forma = String(req.body.cod_forma || '').trim().toUpperCase();

            if (!codigo) {
                const error = new Error('Código da modalidade de pagamento não informado');
                error.status = 400;
                throw error;
            }

            if (!nom_mod) {
                const error = new Error('Codigo e/ou Nome da modalidade de pagamento não informados');
                error.status = 400;
                throw error;
            }

            if (!cod_forma) {
                const error = new Error('Codigo da forma de pagamento não informado');
                error.status = 400;
                throw error;
            }

            void await modoPagamento.FindById(id);

            modoPagamento.cod_mod_pagamento = codigo;
            modoPagamento.nom_mod_pagamento = nom_mod;
            modoPagamento.cod_forma_pagamento = cod_forma;

            void await modoPagamento.Save();

            void await db.Commit();

            resdata.msg = "Modalidade de pagamento salva com sucesso";
           
            
        } catch (error) {

            void await db.RollBack();

            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerModalidadePagamento.Salvar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req, res) {

        const db =  new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            void await db.Begin()

            const modoPagamento = new ModoPagamento(db.connection);

            const cod_mod = String(req.params.cod_mod || '').trim().toUpperCase();

            if (!cod_mod) {
                const error = new Error('Código da modalidade de pagamento não informado');
                error.status = 400;
                throw error;
            }

            void await modoPagamento.FindByCodModalidade(cod_mod);

            if (!modoPagamento.found) {
                const error = new Error('Modalidade de pagamento não encontrada');
                error.status = 404;
                throw error;
            }

            void await modoPagamento.Excluir();

            void await db.Commit();

            resdata.msg = "Modalidade de pagamento excluída com sucesso";
           
            
        } catch (error) {

            void await db.RollBack();

            resdata.err = error.status || 500;
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor' : error.message;
            resdata.status = error.status || 500;

            if(resdata.err === 500) GravarLog('ControllerModalidadePagamento.Excluir', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

}
