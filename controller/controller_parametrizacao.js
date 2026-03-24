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
        type_perfil,
        entidade: Number(entidade?.id || entidade?.entidade_negocio || 0),
        entidade_negocio: Number(entidade?.id || entidade?.entidade_negocio || 0),
        name_entidade: String(entidade?.nom_entidade || entidade?.name_entidade || ''),
        com_rota_cobranca: Number(entidade?.com_rota_cobranca || 0),
        perfil,
        reset_password: Number(usuario?.reset_password || 0)
    };
}

async function buscarUsuariosAutenticacao(connection, user) {

    const query = `SELECT u.id, u.usuario, u.nom_completo, u.senha, u.reset_password, u.iniciais,
        u.entidade_negocio,
        COALESCE(p.id, 0) AS perfil_id,
        COALESCE(p.selecionar, 0) AS selecionar,
        COALESCE(p.inserir, 0) AS inserir,
        COALESCE(p.atualizar, 0) AS atualizar,
        COALESCE(p.excluir, 0) AS excluir,
        COALESCE(e.nom_entidade, '') AS nom_entidade,
        COALESCE(e.com_rota_cobranca, 0) AS com_rota_cobranca
        FROM tb_usuarios u
        LEFT JOIN tb_perfis p ON p.id = u.id_perfil AND p.entidade_negocio = u.entidade_negocio
        LEFT JOIN tb_entidades e ON e.id = u.entidade_negocio
        WHERE u.usuario = :user
        ORDER BY u.entidade_negocio`;

    const usuarios = await connection.execute(query, { user });
    return Array.isArray(usuarios) ? usuarios : [];
}

async function buscarEntidadeAuth(entidades, entidade_negocio) {
    
    const [entidade] = await entidades.ExecuteQuery(
        `SELECT id, nom_entidade, com_rota_cobranca FROM tb_entidades WHERE id = :id`,
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
        let senhaValida = false;

        if (senhaResetada) {
            senhaValida = password === SENHA_RESET_PADRAO;
        } else {
            senhaValida = await validarSenha(password, usuario?.senha);
        }

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
            const usuariosEncontrados = await buscarUsuariosAutenticacao(db.connection, user);

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

            if (entidade_negocio_informada <= 0 && usuariosComSenhaValida.length > 1) {
                const entidadesDuplicadas = usuariosComSenhaValida
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

            const usuario = usuariosComSenhaValida[0] || null;

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

            GravarLog('ControllerAuth.IniciarSessao', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async SessaoAtual(req, res) {

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

        const sessaoRenovada = renovarSessaoHttpOnly(res, sessao);
        const payload = sessaoRenovada?.payload || sessao;

        resdata.data = {
            authenticated: true,
            user: String(payload.user || ''),
            firstname: String(payload.firstname || ''),
            fullname: String(payload.fullname || payload.user || ''),
            type_perfil: Number(payload.type_perfil || 0),
            entidade: Number(payload.entidade_negocio || 0),
            entidade_negocio: Number(payload.entidade_negocio || 0),
            name_entidade: String(payload.name_entidade || ''),
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

            const usuarios = new Usuarios(db.connection, entidade_negocio);
            const usuario = await buscarUsuarioAutenticacao(usuarios, entidade_negocio, user);

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

            GravarLog('ControllerAuth.SolicitarResetSenhaPublica', error.stack);
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
            const current_password = String(req.body?.current_password || '').trim();
            const new_password = String(req.body?.new_password || '').trim();
            const confirm_password = String(req.body?.confirm_password || '').trim();

            if (!user || entidade_negocio <= 0) {
                const error = new Error('Sessao invalida.');
                error.statusCode = 401;
                throw error;
            }

            if (!current_password) {
                const error = new Error('Informe a senha atual.');
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

            if (new_password === current_password) {
                const error = new Error('A nova senha deve ser diferente da senha atual.');
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

            const usuarios = new Usuarios(db.connection, entidade_negocio);
            const usuario = await buscarUsuarioAutenticacao(usuarios, entidade_negocio, user);

            if (!usuario) {
                const error = new Error('Usuario nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const senhaResetada = Number(usuario.reset_password || 0) === 1;
            const senhaAtualValida = senhaResetada
                ? current_password === SENHA_RESET_PADRAO
                : await validarSenha(current_password, usuario.senha);

            if (!senhaAtualValida) {
                const error = new Error(senhaResetada ? 'Senha atual invalida. Use a senha padrao definida no reset.' : 'Senha atual invalida.');
                error.statusCode = 401;
                throw error;
            }

            void await usuarios.FindByUser(user);
            usuarios.senha = await criptografarSenha(new_password);
            usuarios.reset_password = 0;

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

            GravarLog('ControllerAuth.AlterarSenha', error.stack);
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
            let query = `SELECT u.id, u.usuario, u.nom_completo, u.email, u.entidade_negocio, u.reset_password, u.iniciais, p.nom_perfil
            FROM tb_usuarios u
            LEFT JOIN tb_perfis p ON p.id = u.id_perfil AND p.entidade_negocio = u.entidade_negocio
            WHERE u.entidade_negocio = :entidade_negocio`;

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
                const {senha, ...usuarioSemSenha} = usuarioRow;
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

            let {id,usuario,nom_completo,email,id_perfil,reset_password,password} = req.body;
            const entidade = obterEntidadeNegocio(req);

            const validated = validate(usuarioSalvarSchema, {id,usuario,nom_completo,email,id_perfil,reset_password,password});
            ({ id, usuario, nom_completo, email, id_perfil, reset_password, password } = validated);

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
            usuarios.reset_password = reset_password ? 1 : 0;

            if (reset_password) {
                usuarios.senha = await criptografarSenha(SENHA_RESET_PADRAO);
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

            GravarLog('ControllerUsuarios.Salvar', error.stack);

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

export class ControllerEntidades{

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

            const {id,nom_entidade,nom_responsavel,num_cnpj,cel_contato,percent_desconto_cobranca,percent_desconto_venda,cel_whatsapp_bussiness} = req.body;
            
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
            
            const id = req.params.id
            const entidade = obterEntidadeNegocio(req)

            void await db.Connect();

            const perfis = new Perfis(db.connection, entidade);

            resdata.data = await perfis.FindById(id);


        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerPerfis.Editar', error.stack);

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

            const {id,nom_perfil,selecionar,insert,atualizar,excluir} = req.body;
            const entidade = obterEntidadeNegocio(req)
            
            void await db.Connect();

            void await db.Begin();

            const perfils = new Perfis(db.connection, entidade);

            void await perfils.FindById(id);

            perfils.id = id;
            perfils.nom_perfil = nom_perfil;
            perfils.selecionar = selecionar ? 1 : 0;
            perfils.insert = insert ? 1 : 0;
            perfils.atualizar = atualizar ? 1 : 0;
            perfils.excluir = excluir ? 1 : 0;
           
            void await perfils.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerPerfis.Salvar', error.stack);

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
            const entidade = obterEntidadeNegocio(req)
            
            void await db.Connect();

            void await db.Begin();

            const perfils = new Perfis(db.connection,entidade);

            void await perfils.Excluir(id);
            
            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerPerfis.Excluir', error.stack);

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
            
            const id = req.params.id
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
            resdata.msg = error.stack;
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
            resdata.msg = error.stack;
            resdata.status = 500;

            console.log(error.stack)

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
            
            const id = req.params.id
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const produtos  = new Produtos(db.connection, entidade_negocio);

            resdata.data = await produtos.FindById(id);


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

            let {id,nom_produto,mar_produto,und_produto,prc_vista,prc_prazo,estq_max,estq_min,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const produtos = new Produtos(db.connection, entidade_negocio);

            void await produtos.FindById(id);

            produtos.nom_produto = nom_produto;
            produtos.mar_produto = mar_produto;
            produtos.und_produto = und_produto;
            produtos.prc_vista = prc_vista;
            produtos.prc_prazo = prc_prazo;
            produtos.estq_max = estq_max;
            produtos.estq_min = estq_min;
            produtos.ativo = ativo;

            void await produtos.Save();

            const rows = await estoque.FindById(produtos.id);

            if (!rows) {

                estoque.id_produto = produtos.id;
                estoque.qt_disponivel = 0;
                estoque.qt_reservada = 0;
                
                void await estoque.Save();

            }

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.stack;
            resdata.status = 500;

            console.log(error.stack)

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

export class ControllerRotas{

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

            const rotas = new Rotas(db.connection, obterEntidadeNegocio(req));
            const entidades = new Entidades(db.connection, obterEntidadeNegocio(req));

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

            const rotas = new Rotas(db.connection, obterEntidadeNegocio(req));
            const entidades = new Entidades(db.connection, obterEntidadeNegocio(req));

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
            resdata.msg = error.stack;
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

            const {id,nom_tipo,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const tipos = new TiposPagamentos(db.connection,entidade_negocio);

            void await tipos.FindById(id);


            tipos.id = id;
            tipos.nom_tipo = nom_tipo;
            tipos.ativo = ativo;
            
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
