import Database from '../connections/dbconn.js';
import Distribuicao from '../model/dao_distribuicao.js';
import Vendas from '../model/dao_vendas.js';
import Estoque from '../model/dao_estoque.js';
import Estoque_Mov from '../model/dao_estoque_mov.js';
import ItensVendas from '../model/dao_itens_vendas.js';
import Entidades from '../model/dao_entidades.js';
import Cobradores from '../model/dao_cobradores.js';
import Rotas from '../model/dao_rotas.js';
import Adiantamentos from '../model/dao_adiantamentos.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {buildTableDocument, formatCurrencyBR, formatDateBR, sendPdfResponse} from '../utils/PdfReport.js';

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
           
            const whereClause = ['d.id_vendedor = ?', 'd.entidade_negocio = ?'];
            const params = [id_vendedor, entidade_negocio];

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= ?');
                params.push(dt_ini);
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= ?');
                params.push(dt_fim);
            }

            whereClause.push('qt_distrib > 0');

            let query = `SELECT d.id, d.dt_distrib, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib
                         FROM tb_distribuicao d
                         LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY d.dt_distrib DESC, d.id DESC
                         LIMIT ? OFFSET ?`;

            const paramsWithLimit = [...params, limit, offset];
            resdata.data.distrib = await distrib.ExecuteQuery(query, paramsWithLimit);

            query = `SELECT COUNT(*) AS total
                     FROM tb_distribuicao d
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await distrib.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);
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

            GravarLog('ControllerDistribuicao.Listar', error.stack);
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
           
            const whereClause = ['d.id_vendedor = ?', 'd.entidade_negocio = ?'];
            const params = [id_vendedor, entidade_negocio];

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= ?');
                params.push(dt_ini);
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= ?');
                params.push(dt_fim);
            }

            whereClause.push('d.qt_distrib > 0');
            whereClause.push('p.nom_produto LIKE ?');
            params.push(`%${String(nom_produto || '').trim()}%`);

            let query = `SELECT d.id, d.dt_distrib, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib
                         FROM tb_distribuicao d
                         LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY d.dt_distrib DESC, d.id DESC
                         LIMIT ? OFFSET ?`;

            const paramsWithLimit = [...params, limit, offset];
            resdata.data.distrib = await distrib.ExecuteQuery(query, paramsWithLimit);

            query = `SELECT COUNT(*) AS total
                     FROM tb_distribuicao d
                     LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await distrib.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);
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

            GravarLog('ControllerDistribuicao.ListarPorProduto', error.stack);
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

            const query = `SELECT d.id_produto, p.nom_produto, p.mar_produto,p.und_produto, d.qt_distrib as saldo  FROM tb_distribuicao d
            LEFT JOIN tb_produtos p ON p.entidade_negocio = d.entidade_negocio AND p.id = d.id_produto 
            WHERE d.entidade_negocio = ? AND d.id_vendedor = ? AND p.ativo = 1 AND d.qt_distrib > 0 `;

            const rows = await distrib.ExecuteQuery(query, [entidade_negocio, id_vendedor]);

            resdata.data = rows;


        } catch (error) {
            
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerDistribuicao.ListarDistruicaoComSaldo', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Imprimir(req,res) {

        const db = new Database('dbcred');

        try {

            const id_vendedor = Number(req.params.id_vendedor || 0);
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const pesq = String(req.query.pesq || '').trim();

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

            const whereClause = ['d.id_vendedor = ?', 'd.entidade_negocio = ?', 'd.qt_distrib > 0'];
            const params = [id_vendedor, entidade_negocio];

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= ?');
                params.push(dt_ini);
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= ?');
                params.push(dt_fim);
            }

            if (pesq) {
                whereClause.push('p.nom_produto LIKE ?');
                params.push(`%${pesq}%`);
            }

            const query = `SELECT d.id, d.dt_distrib, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib, vd.nom_vendedor
                           FROM tb_distribuicao d
                           LEFT JOIN tb_produtos p ON p.id = d.id_produto AND p.entidade_negocio = d.entidade_negocio
                           LEFT JOIN tb_vendedores vd ON vd.id = d.id_vendedor AND vd.entidade_negocio = d.entidade_negocio
                           WHERE ${whereClause.join(' AND ')}
                           ORDER BY d.dt_distrib DESC, d.id DESC`;

            const rows = await distrib.ExecuteQuery(query, params);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const entidades = new Entidades(db.connection, entidade_negocio);
            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );
            const vendedor = String(rows[0]?.nom_vendedor || '-');
            const periodo = dt_ini && dt_fim ? `Periodo: ${formatDateBR(dt_ini)} a ${formatDateBR(dt_fim)}` : '';
            const filtroProduto = pesq ? `Filtro: ${pesq}` : '';
            const subtitle = [ `Vendedor: ${vendedor}`, periodo, filtroProduto ].filter(Boolean).join(' | ');

            const body = [
                [
                    { text: 'Data', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Produto', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Unidade', bold: true, fontSize: 9, alignment: 'center' },
                    { text: 'Quantidade', bold: true, fontSize: 9, alignment: 'right' }
                ],
                ...rows.map((item) => ([
                    { text: formatDateBR(item?.dt_distrib), alignment: 'left' },
                    { text: `${item?.nom_produto || '-'}${item?.mar_produto ? ` - ${item.mar_produto}` : ''}`.trim(), alignment: 'left' },
                    { text: String(item?.und_produto || '-'), alignment: 'center' },
                    { text: String(item?.qt_distrib ?? 0), alignment: 'right' }
                ]))
            ];

            const document = buildTableDocument({
                title: 'RELATORIO DE DISTRIBUICAO',
                organizationName: entidade?.nom_entidade || String(entidade_negocio),
                subtitle,
                widths: ['16%', '52%', '12%', '20%'],
                body
            });

            await sendPdfResponse(res, `relatorio-distribuicao-${id_vendedor}.pdf`, document);

        } catch (error) {

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog('ControllerDistribuicao.Imprimir', error.stack);
        }

        void await db.Close();

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

            GravarLog('ControllerDistribuicao.Editar', error.stack);
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

            const id = Number(req.body.id);
            const dt_distrib = new Date(req.body.dt_distrib);
            const id_vendedor = Number(req.body.id_vendedor);
            const id_produto = Number(req.body.id_produto);
            const qt_distrib = Number(req.body.qt_distrib);
            
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const distrib = new Distribuicao(db.connection,entidade_negocio);

            void await distrib.FindById(id);

            distrib.id = id;
            distrib.dt_distrib = dt_distrib;
            distrib.id_vendedor = id_vendedor;
            distrib.id_produto = id_produto;
            distrib.qt_distrib = qt_distrib;

            void await distrib.Save();

            void await estoque.FindById(id_produto);

            if (estoque.qt_disponivel < qt_distrib) {
                throw Error('Quantidade a ser distribuida não pode ser maior que saldo do estoque.')
            }

            estoque.qt_disponivel = parseFloat(estoque.qt_disponivel) - qt_distrib;
            estoque.qt_reservada = parseFloat(estoque.qt_reservada) + qt_distrib;

            void await estoque.Save();

            void await db.Commit();

            resdata.msg = 'Distribuida com sucesso.';

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerDistribuicao.Salvar', error.stack);

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

            GravarLog('ControllerDistribuicao.Excluir', error.stack);
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

            const id = Number(req.body.id);
            const qt_retorno = Number(req.body.qt_retorno);
            const dt_retorno = new Date(req.body.dt_retorno);
            const entidade_negocio = obterEntidadeNegocio(req)

            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const distrib = new Distribuicao(db.connection,entidade_negocio);

            const rows =  await distrib.FindById(id);

            if (!rows) throw new Error("ID da distribuição não encontrada.");

            distrib.dt_retorno = dt_retorno;
            distrib.qt_retorno = Number(distrib.qt_retorno) +  Number(qt_retorno);
            distrib.qt_distrib = Number(distrib.qt_distrib) - Number(qt_retorno);

            void await distrib.Save();

            void await estoque.FindById(distrib.id_produto);

            estoque.qt_disponivel =  parseFloat(estoque.qt_disponivel) + Number(qt_retorno);
            estoque.qt_reservada = parseFloat(estoque.qt_reservada) - Number(qt_retorno);

            void await estoque.Save();

            void await db.Commit()

            resdata.msg = 'Produto devolvido com sucesso.';

            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog('ControllerDistribuicao.DevolverProduto', error.stack);
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

            const whereClause = ['v.id_vendedor = ?', 'v.entidade_negocio = ?'];
            const params = [id_vendedor, entidade_negocio];

            if (dt_ini) {
                whereClause.push('v.dt_venda >= ?');
                params.push(dt_ini);
            }

            if (dt_fim) {
                whereClause.push('v.dt_venda <= ?');
                params.push(dt_fim);
            }

            let query = `SELECT v.id, v.dt_venda, v.cpf_cliente, c.nom_cliente, c.nom_usual, c.end_cliente, c.bai_cliente, c.cid_cliente, c.uf_cliente,
                                v.val_tot_venda, tp.nom_tipo
                         FROM tb_vendas v
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         LEFT JOIN tb_tipos_pagamentos tp ON tp.id = v.id_tipo_pag AND tp.entidade_negocio = v.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY v.dt_venda DESC, v.id DESC
                         LIMIT ? OFFSET ?`;

            const paramsWithLimit = [...params, limit, offset];
            resdata.data.vendas = await vendas.ExecuteQuery(query, paramsWithLimit);

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await vendas.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);
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

            GravarLog('ControllerVendas.Listar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarPeriodo(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                vendas: [],
                entidades: [],
                resumo: {
                    quantidade: 0,
                    total_geral: 0
                },
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        };

        try {
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!dt_ini || !dt_fim) {
                const error = new Error('Informe data inicial e data final.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
            const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
            const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 45) {
                const error = new Error('Intervalo maximo permitido e de 45 dias.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const vendas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);
            const whereClause = ['v.entidade_negocio = ?', 'v.dt_venda >= ?', 'v.dt_venda <= ?'];
            const params = [entidade_negocio, dt_ini, dt_fim];

            let query = `SELECT v.id, v.dt_venda, v.id_vendedor, vd.nom_vendedor, v.cpf_cliente, c.nom_cliente, c.nom_usual,
                                c.end_cliente, c.bai_cliente, c.cid_cliente, c.uf_cliente, v.val_tot_venda, v.referencia,
                                v.situacao, v.num_recibo, tp.nom_tipo
                         FROM tb_vendas v
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         LEFT JOIN tb_tipos_pagamentos tp ON tp.id = v.id_tipo_pag AND tp.entidade_negocio = v.entidade_negocio
                         LEFT JOIN tb_vendedores vd ON vd.id = v.id_vendedor AND vd.entidade_negocio = v.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY v.dt_venda DESC, v.id DESC
                         LIMIT ? OFFSET ?`;

            resdata.data.vendas = await vendas.ExecuteQuery(query, [...params, limit, offset]);

            query = `SELECT COUNT(*) AS total,
                            COALESCE(SUM(v.val_tot_venda), 0) AS total_geral
                     FROM tb_vendas v
                     WHERE ${whereClause.join(' AND ')}`;

            const resumoResult = await vendas.ExecuteQuery(query, params);
            const resumoAtual = Array.isArray(resumoResult) && resumoResult[0] ? resumoResult[0] : {};
            const total = Number(resumoAtual?.total || 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);
            resdata.data.resumo = {
                quantidade: total,
                total_geral: Number(resumoAtual?.total_geral || 0)
            };
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

            GravarLog('ControllerVendas.ListarPeriodo', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImprimirResumoPeriodo(req,res) {

        const db = new Database('dbcred');

        try {
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();

            if (!dt_ini || !dt_fim) {
                const error = new Error('Informe data inicial e data final.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
            const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
            const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 45) {
                const error = new Error('Intervalo maximo permitido e de 45 dias.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const vendas = new Vendas(db.connection, entidade_negocio);
            const query = `SELECT v.id_vendedor, COALESCE(vd.nom_vendedor, 'Sem vendedor') AS nom_vendedor,
                                  COUNT(*) AS qt_vendas, COALESCE(SUM(v.val_tot_venda), 0) AS total_vendido
                           FROM tb_vendas v
                           LEFT JOIN tb_vendedores vd ON vd.id = v.id_vendedor AND vd.entidade_negocio = v.entidade_negocio
                           WHERE v.entidade_negocio = ?
                             AND v.dt_venda >= ?
                             AND v.dt_venda <= ?
                           GROUP BY v.id_vendedor, vd.nom_vendedor
                           ORDER BY total_vendido DESC, nom_vendedor ASC`;

            const rows = await vendas.ExecuteQuery(query, [entidade_negocio, dt_ini, dt_fim]);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const entidades = new Entidades(db.connection, entidade_negocio);
            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );
            const totalQtVendas = rows.reduce((acc, item) => acc + Number(item?.qt_vendas || 0), 0);
            const totalGeral = rows.reduce((acc, item) => acc + Number(item?.total_vendido || 0), 0);
            const subtitle = `Periodo: ${formatDateBR(dt_ini)} a ${formatDateBR(dt_fim)}`;
            const body = [
                [
                    { text: 'Vendedor', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Qtd. vendas', bold: true, fontSize: 9, alignment: 'right' },
                    { text: 'Total vendido', bold: true, fontSize: 9, alignment: 'right' }
                ],
                ...rows.map((item) => ([
                    { text: String(item?.nom_vendedor || 'Sem vendedor'), alignment: 'left' },
                    { text: String(Number(item?.qt_vendas || 0)), alignment: 'right' },
                    { text: formatCurrencyBR(item?.total_vendido), alignment: 'right' }
                ])),
                [
                    { text: 'TOTAL GERAL', bold: true, alignment: 'left' },
                    { text: String(totalQtVendas), bold: true, alignment: 'right' },
                    { text: formatCurrencyBR(totalGeral), bold: true, alignment: 'right' }
                ]
            ];

            const document = buildTableDocument({
                title: 'RELATORIO DE VENDAS POR VENDEDOR',
                organizationName: entidade?.nom_entidade || String(entidade_negocio),
                subtitle,
                widths: ['52%', '18%', '30%'],
                body
            });

            await sendPdfResponse(res, `relatorio-vendas-${dt_ini}-${dt_fim}.pdf`, document);
        } catch (error) {
            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog('ControllerVendas.ImprimirResumoPeriodo', error.stack);
        }

        void await db.Close();

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

            GravarLog('ControllerVendas.Editar', error.stack);
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

            /***************************************************
             * Validações dos campos da venda
             ***********************/
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

            const estoque_mov = new Estoque_Mov(db.connection, entidade_negocio);
            const estoque = new Estoque(db.connection,entidade_negocio);
            const itensVendas = new ItensVendas(db.connection, entidade_negocio);
            const vendas = new Vendas(db.connection, entidade_negocio);

            /**************************************************************************
             * Salva a venda para obter o ID, caso seja uma nova venda (id vazio ou 0). 
             * Se for uma edição, o ID já existe e a função Save irá atualizar o registro.
             ****************/
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

            /***************************************************************************
             * Salva os itens da venda e atualiza o estoque reservado.
             *****************/
            let itens_salvos = 0;
            let qt_produto_antes = 0;
            let qt_produto_atual = 0;

            for (const item of itens) {

                void await itensVendas.FindById(Number(item.id),vendas.id)

                if (itensVendas.found) qt_produto_antes = itensVendas.qt_produto;

                itensVendas.id_produto = Number(item.id_produto);
                itensVendas.qt_produto = Number(item.qt_produto);
                itensVendas.id_venda = vendas.id;

                void await itensVendas.Save();

                void await estoque.FindById(item.id_produto);

                if (!estoque.found) throw Error('Produto não encontrado no estoque.');

                if (!itensVendas.found) {
                    if (estoque.qt_reservada < item.qt_produto) throw Error('Não exite estoque suficiente para esse produto.');
                    qt_produto_atual = item.qt_produto;
                }
                else {
                    if(estoque.qt_reservada < ((qt_produto_antes - itensVendas.qt_produto) * -1)) throw Error('Não exite estoque suficiente para esse produto.');
                    qt_produto_atual = ((qt_produto_antes - itensVendas.qt_produto) * -1);
                }

                if (!itensVendas.found) {
                    estoque.qt_reservada = Number(estoque.qt_reservada) - Number(item.qt_produto);
                } else {
                    estoque.qt_reservada = Number(estoque.qt_reservada) + (qt_produto_antes - itensVendas.qt_produto)
                }

                void await estoque.Save();


                /******************************************************
                * Registra a movimentação de estoque referente a venda.
                ********************/
                void await estoque_mov.FindById(0, new Date());

                estoque_mov.dt_mov = new Date();
                estoque_mov.id_produto = item.id_produto;
                estoque_mov.qt_mov = qt_produto_atual;
                estoque_mov.tp_mov = (qt_produto_antes - itensVendas.qt_produto) < 0 ? 'VENDA' : 'DEVOL';
                estoque_mov.nr_documento = String(vendas.id);
                estoque_mov.descricao = `Movimentação de estoque referente a venda ID ${vendas.id}`;

                void await estoque_mov.Save();

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

            GravarLog('ControllerVendas.Salvar', error.stack);
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

            /*******************************************************************
             * Validações dos campos necessários para exclusão do item da venda.
             *****/
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_item = Number(req.params.id_item);
            const id_venda = String(req.params.id_venda);

            if (id_item <= 0 ) {
                const error = new Error('Para excluir item, informe id_item e id_produto.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const itensVendas = new ItensVendas(db.connection, entidade_negocio);
            const estoque_mov = new Estoque_Mov(db.connection, entidade_negocio);
            const estoque = new Estoque(db.connection, entidade_negocio);

            /*****************************************************************
             * Ao excluir um item da venda, o sistema irá registrar uma 
             * movimentação de estoque do tipo DEVOLUÇÃO,
             * para que o estoque seja atualizado corretamente, aumentando 
             * a quantidade disponível do produto.
             *******/
            void await itensVendas.FindById(id_item,id_venda)

            if (itensVendas.found) {

                void await estoque_mov.FindById(0, new Date());

                estoque_mov.dt_mov = new Date();
                estoque_mov.id_produto = itensVendas.id_produto;
                estoque_mov.qt_mov = itensVendas.qt_produto;
                estoque_mov.tp_mov = 'DEVOL';
                estoque_mov.nr_documento = String(id_venda);
                estoque_mov.descricao = `Devolução de produto referente a exclusão de item da venda ID ${id_venda}`;
                
                void await estoque_mov.Save();

                /**************************************************************************
                 * Ao excluir um item da venda, o sistema irá atualizar o estoque reservado, 
                 * diminuindo a quantidade reservada do produto.
                 **************************/
                void await estoque.FindById(itensVendas.id_produto);

                estoque.qt_disponivel = parseFloat(estoque.qt_disponivel) + Number(itensVendas.qt_produto);

                void await estoque.Save();

                void await itensVendas.Excluir();
                
                resdata.msg = 'Item de venda excluido com sucesso.';

            }
            else {
                resdata.msg = 'Item de venda não encontrado.';
            }

            void await db.Commit();
            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerVendas.Excluir', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

     static async ListarVendasDestinar(req,res) {

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
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!dt_ini || !dt_fim) {
                const error = new Error('Informe data inicial e data final.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
            const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
            const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 45) {
                const error = new Error('Intervalo deve ser inferior a 45 dias.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const vendas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection,entidade_negocio);

            const whereClause = ['v.entidade_negocio = ?'];
            const params = [entidade_negocio, dt_ini, dt_fim];

            whereClause.push('v.dt_venda >= ?');
            whereClause.push('v.dt_venda <= ?');
            whereClause.push(com_rota_cobranca === 1 ? 'v.id_rota IS NULL' : 'v.id_cobrador IS NULL');

            let query = `SELECT v.id, v.dt_venda, c.nom_cliente,c.end_cliente,c.bai_cliente,c.cid_cliente,c.uf_cliente,
                                v.val_tot_venda, vd.nom_vendedor
                         FROM tb_vendas v
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         LEFT JOIN tb_vendedores vd ON vd.id = v.id_vendedor AND vd.entidade_negocio = v.entidade_negocio
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY v.dt_venda DESC, v.id DESC
                         LIMIT ? OFFSET ?`;

            const paramsWithLimit = [...params, limit, offset];
            resdata.data.vendas = await vendas.ExecuteQuery(query, paramsWithLimit);

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await vendas.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;

            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);

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

            GravarLog('ControllerVendas.DestinarVendas', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async DestinarVendas(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const listaRecebida = Array.isArray(req.body?.lista) ? req.body.lista : [];
            const lista = Array.from(new Set(
                listaRecebida
                    .map((item) => Number(typeof item === 'object' && item !== null ? item.id_venda : item))
                    .filter((id_venda) => id_venda > 0)
            ));

            const entidades = new Entidades(db.connection,entidade_negocio);

            void await entidades.FindById(Number(entidade_negocio));

            if (!entidades.found) {
                const error = new Error('Entidade de negocio nao encontrada.');
                error.statusCode = 404;
                throw error;
            }

            if (lista.length === 0) {
                const error = new Error('Informe a lista de vendas selecionadas.');
                error.statusCode = 400;
                throw error;
            }

            const com_rota_cobranca = Number(entidades.com_rota_cobranca || 0);
            const destinoCampo = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const destinoId = Number(req.body?.[destinoCampo] || req.body?.id_destino || 0);

            if (destinoId <= 0) {
                const error = new Error(`Informe um ${com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador'} valido.`);
                error.statusCode = 400;
                throw error;
            }

            const destino = com_rota_cobranca === 1
                ? new Rotas(db.connection, entidade_negocio)
                : new Cobradores(db.connection, entidade_negocio);

            void await destino.FindById(destinoId);

            if (!destino.found || Number(destino.ativo || 0) !== 1) {
                const error = new Error(`${com_rota_cobranca === 1 ? 'Rota' : 'Cobrador'} nao encontrado ou inativo.`);
                error.statusCode = 404;
                throw error;
            }

            void await db.Begin();

            const vendas = new Vendas(db.connection, entidade_negocio);

            for (const id_venda of lista) {

                void await vendas.FindById(id_venda);

                if (!vendas.found) {
                    const error = new Error(`Venda ${id_venda} nao encontrada.`);
                    error.statusCode = 404;
                    throw error;
                }

                if (com_rota_cobranca === 1) {
                    vendas.id_rota = destinoId;
                } else {
                    vendas.id_cobrador = destinoId;
                }

                void await vendas.Save();
            }

            void await db.Commit();

            resdata.msg = `${lista.length} venda(s) destinada(s) com sucesso.`;

        }
        catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);  
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerVendas.DestinarVendas', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }


}
