import Database from '../connections/dbconn.js';
import Distribuicao from '../model/dao_distribuicao.js';
import Vendas from '../model/dao_vendas.js';
import Estoque from '../model/dao_estoque.js';
import ItensVendas from '../model/dao_itens_vendas.js';
import Entidades from '../model/dao_entidades.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';

export class ControllerDistribuicao{

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                distrib: [],
                entidades: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {
            
            const id_vendedor = Number(req.params.id_vendedor || 0);
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && !/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_fim && !/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim && dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim) {
                const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
                const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
                const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays > 45) {
                    const error = new Error('Intervalo maximo permitido e de 45 dias.');
                    error.statusCode = 400;
                    throw error;
                }
            }
            
            void await db.Connect();

            const distrib = new Distribuicao(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection,entidade_negocio);
           
            const whereClause = ['d.id_vendedor = :id_vendedor', 'd.entidade_negocio = :entidade_negocio'];
            const params = {
                id_vendedor,
                entidade_negocio
            };

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= :dt_ini');
                params.dt_ini = dt_ini;
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= :dt_fim');
                params.dt_fim = dt_fim;
            }

            whereClause.push('qt_distrib > 0');

            let query = `SELECT d.id, d.dt_distrib, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib
                         FROM tb_distribuicao d
                         LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY d.dt_distrib DESC, d.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.distrib = await distrib.ExecuteQuery(query, { ...params, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_distribuicao d
                     WHERE ${whereClause.join(' AND ')}`;

                   
            const countResult = await distrib.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = :entidade_negocio`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, { entidade_negocio });
            resdata.data.paginacao = {
                page,
                limit,
                total,
                total_pages: total > 0 ? Math.ceil(total / limit) : 0
            };

        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarPorProduto(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                distrib: [],
                entidades: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {
            
            const id_vendedor = Number(req.params.id_vendedor || 0);
            const nom_produto = req.params.nom_produto;
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && !/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_fim && !/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim && dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim) {
                const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
                const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
                const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays > 45) {
                    const error = new Error('Intervalo maximo permitido e de 45 dias.');
                    error.statusCode = 400;
                    throw error;
                }
            }
            
            void await db.Connect();

            const distrib = new Distribuicao(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection,entidade_negocio);
           
            const whereClause = ['d.id_vendedor = :id_vendedor', 'd.entidade_negocio = :entidade_negocio'];
            const params = {
                id_vendedor,
                entidade_negocio,
            };

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= :dt_ini');
                params.dt_ini = dt_ini;
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= :dt_fim');
                params.dt_fim = dt_fim;
            }

            whereClause.push('d.qt_distrib > 0');
            whereClause.push('p.nom_produto LIKE :nom_produto');
            params.nom_produto = `%${String(nom_produto || '').trim()}%`;

            let query = `SELECT d.id, d.dt_distrib, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib
                         FROM tb_distribuicao d
                         LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY d.dt_distrib DESC, d.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.distrib = await distrib.ExecuteQuery(query, { ...params, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_distribuicao d
                     LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                     WHERE ${whereClause.join(' AND ')}`;

                   
            const countResult = await distrib.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = :entidade_negocio`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, { entidade_negocio });
            resdata.data.paginacao = {
                page,
                limit,
                total,
                total_pages: total > 0 ? Math.ceil(total / limit) : 0
            };

        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarDistruicaoComSaldo(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const id_vendedor = req.params.id_vendedor;
            const entidade_negocio = obterEntidadeNegocio(req);

            const distrib = new Distribuicao(db.connection,entidade_negocio)

            const query = `SELECT d.id_produto, p.nom_produto, p.mar_produto,p.und_produto, e.qt_reservada as saldo  FROM tb_distribuicao d
            LEFT JOIN tb_produtos p ON p.entidade_negocio = d.entidade_negocio AND p.id = d.id_produto 
            LEFT JOIN tb_estoque e ON e.entidade_negocio = d.entidade_negocio AND e.id_produto = d.id_produto
            WHERE d.entidade_negocio = :entidade_negocio AND d.id_vendedor = :id_vendedor AND e.qt_reservada > 0 AND p.ativo = 1 `;

            const rows = await distrib.ExecuteQuery(query,{entidade_negocio,id_vendedor});

            resdata.data = rows;


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

            const distrib = new Distribuicao(db.connection, entidade_negocio);

            resdata.data = await distrib.FindById(id);


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

            let {id,dt_distrib,id_vendedor,id_produto,qt_distrib} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req);
            
            void await db.Connect();

            void await db.Begin();

            const distrib = new Distribuicao(db.connection,entidade_negocio);

            void await distrib.FindById(id);

            distrib.id = id;
            distrib.dt_distrib = dt_distrib;
            distrib.id_vendedor = id_vendedor;
            distrib.id_produto = id_produto;
            distrib.qt_distrib = qt_distrib;

            void await distrib.Save();

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

            const distrib = new Distribuicao(db.connection, entidade_negocio);
            void await distrib.FindById(id);


            void await distrib.Excluir(id);
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
     
    static async DevolverProduto(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.body.id;
            const qt_retorno = req.body.qt_retorno;
            const dt_retorno = req.body.dt_retorno;
            const entidade_negocio = obterEntidadeNegocio(req)

            void await db.Connect();

            void await db.Begin();

            const distrib = new Distribuicao(db.connection,entidade_negocio);

            const rows =  await distrib.FindById(id);

            if (!rows) throw new Error("ID da distribuição não encontrada.");

            distrib.dt_retorno = dt_retorno;
            distrib.qt_retorno += qt_retorno;
            distrib.qt_distrib -= qt_retorno;

            void await distrib.Save();

            void await db.Commit()

            resdata.msg = 'Produto devolvido com sucesso.';

            
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

export class ControllerVendas {

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                vendas: [],
                entidades: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {
            const id_vendedor = Number(req.params.id_vendedor || 0);
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && !/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_fim && !/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim && dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini && dt_fim) {
                const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
                const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
                const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays > 45) {
                    const error = new Error('Intervalo maximo permitido e de 45 dias.');
                    error.statusCode = 400;
                    throw error;
                }
            }

            void await db.Connect();

            const vendas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection,entidade_negocio);

            const whereClause = ['v.id_vendedor = :id_vendedor', 'v.entidade_negocio = :entidade_negocio'];
            const params = {
                id_vendedor,
                entidade_negocio
            };

            if (dt_ini) {
                whereClause.push('v.dt_venda >= :dt_ini');
                params.dt_ini = dt_ini;
            }

            if (dt_fim) {
                whereClause.push('v.dt_venda <= :dt_fim');
                params.dt_fim = dt_fim;
            }

            let query = `SELECT v.id, v.dt_venda, v.id_vendedor,v.cpf_cliente, c.nom_cliente,t.nom_tipo, v.val_tot_venda
                         FROM tb_vendas v
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         LEFT JOIN tb_tipos_pagamentos t ON t.entidade_negocio = v.entidade_negocio AND t.id = v.id_tipo_pag
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY v.dt_venda DESC, v.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.vendas = await vendas.ExecuteQuery(query, { ...params, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await vendas.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = :entidade_negocio`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, { entidade_negocio });
            resdata.data.paginacao = {
                page,
                limit,
                total,
                total_pages: total > 0 ? Math.ceil(total / limit) : 0
            };
        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack);
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
            data: {
                vendas: [],
                itens:[]
            }
        }

        try {

            const id = String(req.params.id);
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const vendas = new Vendas(db.connection,entidade_negocio);
            const itens = new ItensVendas(db.connection,entidade_negocio);

            resdata.data.vendas = await vendas.FindById(id);
            resdata.data.itens = await itens.FindByVenda(id);
            
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

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                id_venda: '',
                itens_salvos: 0
            }
        }

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const body = req.body || {};

            const id = String(body.id).trim();

            const dt_venda = body.dt_venda;
            const id_vendedor = Number(body.id_vendedor);
            const id_tipo_pag = Number(body.id_tipo_pag);
            const cpf_cliente = String(body.cpf_cliente).replace(/\D/g, '');
            const referencia = String(body.referencia).trim();
            const val_tot_venda = Number(body.val_tot_venda);
            const dia_pagam = String(body.dia_pagam).trim();
            const itens = body.itens;

            if (!dt_venda) {
                const error = new Error('Data da venda e obrigatoria.');
                error.statusCode = 400;
                throw error;
            }

            if (!id_vendedor || id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!Array.isArray(itens) || itens.length === 0) {
                const error = new Error('Informe ao menos um item da venda.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const itensVendas = new ItensVendas(db.connection, entidade_negocio);
            const vendas = new Vendas(db.connection, entidade_negocio);

            void await vendas.FindById(id);
            
            vendas.id = id;
            vendas.dt_venda = dt_venda;
            vendas.id_vendedor = id_vendedor;
            vendas.id_tipo_pag = id_tipo_pag;
            vendas.cpf_cliente = cpf_cliente;
            vendas.referencia = referencia;
            vendas.val_tot_venda = val_tot_venda;
            vendas.situacao = 0;
            vendas.dia_pagam = dia_pagam;

            void await vendas.Save();

            let itens_salvos = 0;

            for (const item of itens) {

                console.log(item.id)

                void await itensVendas.FindById(Number(item.id),vendas.id)

                itensVendas.id_produto = Number(item.id_produto);
                itensVendas.qt_produto = Number(item.qt_produto);
                itensVendas.id_venda = vendas.id;

                void await itensVendas.Save();

                const rows = await estoque.FindById(item.id_produto);

                if (!rows) throw Error('Produto não encontrado no estoque.');

                if (estoque.qt_reservada < item.qt_produto) throw Error('Não exite estoque suficiente para esse produto.')

                estoque.qt_reservada = Number(estoque.qt_reservada) - Number(item.qt_produto);

                void await estoque.Save();

                itens_salvos++;
            }

            void await db.Commit();

            resdata.msg = 'Venda salva com sucesso.';
            resdata.data.id_venda = vendas.id;
            resdata.data.itens_salvos = itens_salvos;

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

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
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_item = Number(req.params.id_item);
            const id_venda = String(req.params.id_venda)

            if (id_item <= 0 ) {
                const error = new Error('Para excluir item, informe id_item e id_produto.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const itensVendas = new ItensVendas(db.connection, entidade_negocio);

            void await itensVendas.Excluir(id_venda,id_item);
            
            resdata.msg = 'Item de venda excluido com sucesso.';

            void await db.Commit();
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack)
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }
}
