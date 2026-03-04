import Database from '../connections/dbconn.js';
import Usuarios from '../model/dao_usuarios.js';
import Entidades from '../model/dao_entidades.js';
import Perfis from '../model/dao_perfis.js';
import Vendedores from '../model/dao_vendedores.js';
import Cobradores from '../model/dao_cobradores.js';
import Produtos from '../model/dao_produtos.js';
import Rotas from '../model/dao_rotas.js';
import TiposPagamentos from '../model/dao_tipos_pagamentos.js';

import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {definirSessaoHttpOnly, limparSessaoHttpOnly, obterSessaoHttpOnly, renovarSessaoHttpOnly} from '../utils/AuthSession.js';

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
            const entidade_negocio = Number(req.body?.entidade_negocio || 0);
            const user = String(req.body?.user || '').trim();
            const remember = req.body?.remember === true;

            if (entidade_negocio <= 0) {
                const error = new Error('Entidade de negocio invalida.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const entidades = new Entidades(db.connection);
            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = :id`,
                {id: entidade_negocio}
            );

            if (!entidade) {
                const error = new Error('Entidade de negocio nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            definirSessaoHttpOnly(res, {
                user: user || 'usuario',
                entidade_negocio,
                name_entidade: entidade.nom_entidade
            }, remember);

            resdata.data = {
                user: user || 'usuario',
                entidade: entidade_negocio,
                name_entidade: entidade.nom_entidade
            };

        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);
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

        renovarSessaoHttpOnly(res, sessao);

        resdata.data = {
            authenticated: true,
            user: String(sessao.user || ''),
            entidade: Number(sessao.entidade_negocio || 0),
            name_entidade: String(sessao.name_entidade || '')
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

        limparSessaoHttpOnly(res);

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

            query = `SELECT id,nom_entidade,nom_responsavel,num_cnpj,cel_contato FROM tb_entidades WHERE id = ${entidade}`;

            resdata.data.entidades = await entidades.ExecuteQuery(query);

            let perfisRows = await perfis.ExecuteQuery(`SELECT id,nom_perfil FROM tb_perfis WHERE entidade_negocio = ${entidade}`);
            if (!Array.isArray(perfisRows) || perfisRows.length === 0) {
                perfisRows = await perfis.ExecuteQuery("SELECT id,nom_perfil FROM tb_perfis");
            }
            resdata.data.perfis = perfisRows;


        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            resdata.data = await usuario.FindById(id);


        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            let {id,usuario,nom_completo,email,id_perfil,reset_password} = req.body;
            const entidade = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const usuarios = new Usuarios(db.connection, entidade);

            void await usuarios.FindById(id);


            const [exist_usuario] = await usuarios.FindByUser(usuario);
            
            if (!usuarios.found && exist_usuario) {
                throw new Error('Usuario já existente.')
            }  
            else {
                reset_password = 1;
            }

            usuarios.id = id;
            usuarios.usuario = usuario;
            usuarios.nom_completo = nom_completo;
            usuarios.email = email;
            usuarios.id_perfil = id_perfil;
            usuarios.reset_password = reset_password;

            const ini = nom_completo.split(' ');

            let iniciais = ini[0].substring(0,1) + ini[ini.length -1].substring(0,1)

            usuarios.iniciais = iniciais;
            
            void await usuarios.Save();

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
            const params = {};

            if (entidadeNegocio > 0) {
                query += ` WHERE id = :entidade_negocio`;
                params.entidade_negocio = entidadeNegocio;
            }

            resdata.data = await entidades.ExecuteQuery(query, params);

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            const {id,nom_entidade,nom_responsavel,num_cnpj,cel_contato} = req.body;
            
            void await db.Connect();

            void await db.Begin();

            const entidades = new Entidades(db.connection, obterEntidadeNegocio(req));

            void await entidades.FindById(id);

            entidades.id = id;
            entidades.nom_entidade = nom_entidade;
            entidades.nom_responsavel = nom_responsavel;
            entidades.num_cnpj = num_cnpj;
            entidades.cel_contato = cel_contato;
           
            void await entidades.Save();

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

            let query = `SELECT * FROM tb_perfis WHERE entidade_negocio = ${entidade_negocio}`;

            if (pesq != "*") {
                query += ` AND nom_perfil LIKE '%${pesq}%'`;
            }

            const rows = await perfis.ExecuteQuery(query);

            console.log(rows,pesq,entidade_negocio)
            
            resdata.data.perfis = rows;

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            query = `SELECT * FROM tb_vendedores WHERE entidade_negocio = ${entidade}`;

            if (pesq != "*") {
                query += ` AND nom_vendedor LIKE '%${pesq}%'`
            }

            resdata.data.vendedores = await vendedores.ExecuteQuery(query);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade}`)

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

            query = `SELECT * FROM tb_vendedores WHERE entidade_negocio = ${entidade} AND ativo = 1 `;

            if (pesq != "*") {
                query += ` AND nom_vendedor LIKE '%${pesq}%'`
            }

            resdata.data.vendedores = await vendedores.ExecuteQuery(query);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade}`)

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

            const vendedores = new Vendedores(db.connection, entidade_negocio);

            resdata.data = await vendedores.FindById(id);



        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            const vendedores = new Vendedores(db.connection, entidade_negocio);

            void await vendedores.FindById(id);


            void await vendedores.Excluir(id);

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

            query = `SELECT * FROM tb_cobradores WHERE entidade_negocio = ${entidade_negocio} `;

            if (pesq != "*") {
                query += ` AND nom_cobrador LIKE '%${pesq}%'`
            }

            resdata.data.cobradores  = await cobradores.ExecuteQuery(query);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade_negocio}`)

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

            query = `SELECT * FROM tb_produtos WHERE entidade_negocio = ${entidade_negocio} `;

            if (pesq != "*") {
                query += ` AND nom_produto LIKE '%${pesq}%'`
            }

            resdata.data.produtos  = await produtos.ExecuteQuery(query);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade_negocio}`)

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

            query = `SELECT * FROM tb_produtos WHERE entidade_negocio = ${entidade_negocio} AND ativo = 1 `;

            if (pesq != "*") {
                query += ` AND nom_produto LIKE '%${pesq}%'`
            }

            resdata.data.produtos  = await produtos.ExecuteQuery(query);
            resdata.data.entidades = await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade_negocio}`)

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

            let {id,nom_produto,mar_produto,und_produto,prc_vista,prc_prazo,ativo} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const produtos = new Produtos(db.connection, entidade_negocio);

            void await produtos.FindById(id);


            produtos.id = id;
            produtos.nom_produto = nom_produto;
            produtos.mar_produto = mar_produto;
            produtos.und_produto = und_produto;
            produtos.prc_vista = prc_vista;
            produtos.prc_prazo = prc_prazo;
            produtos.ativo = ativo;

            void await produtos.Save();

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

            query = `SELECT * FROM tb_rotas WHERE entidade_negocio = ${entidade_negocio} `;

            if (pesq != "*") {
                query += ` AND nom_rota LIKE '%${pesq}%'`
            }

            resdata.data.rotas  = await rotas.ExecuteQuery(query);
            resdata.data.entidades =await entidades.ExecuteQuery(`SELECT id,nom_entidade FROM tb_entidades WHERE id = ${entidade_negocio}`)

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

            const rotas  = new Rotas(db.connection, entidade_negocio);

            resdata.data = await rotas.FindById(id);


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

            const rotas = new Rotas(db.connection, entidade_negocio);

            void await rotas.Excluir(id);

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

            let query = `SELECT * FROM tb_tipos_pagamentos WHERE entidade_negocio = ${entidade_negocio}`;

            if (pesq != "*") {
                query += ` AND nom_tipo LIKE '%${pesq}%'`;
            }

            const rows = await tipos.ExecuteQuery(query);
            
            resdata.data.tipos = rows;

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

            let query = `SELECT * FROM tb_tipos_pagamentos WHERE entidade_negocio = ${entidade_negocio} AND ativo = 1 `;

            if (pesq != "*") {
                query += ` AND nom_tipo LIKE '%${pesq}%'`;
            }

            const rows = await tipos.ExecuteQuery(query);
            
            resdata.data.tipos = rows;

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
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

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}



