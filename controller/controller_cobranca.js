import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import Vendas from '../model/dao_vendas.js';
import Pagamentos from '../model/dao_pagamentos.js';
import Adiantamentos from '../model/dao_adiantamentos.js';

export class ControllerCobranca {

    static async ListarCobrancas(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                cobrancas: [],
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
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);

            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const id_filter = Number(req.params?.id || 0);

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

            if (id_filter <= 0) {
                const error = new Error(`Informe um ${fieldname} valido.`);
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

            const cobrancas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            let query = `SELECT v.id, v.dt_venda, c.cpf_cliente, c.nom_cliente, c.end_cliente, c.bai_cliente, 
            c.cid_cliente, c.uf_cliente, v.val_tot_venda, COALESCE(SUM(p.vl_pagamento), 0) AS val_total_pago,
            GREATEST(v.val_tot_venda - COALESCE(SUM(p.vl_pagamento), 0), 0) AS saldo_pagar
            FROM tb_vendas v
            LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
            LEFT JOIN tb_pagamentos p ON p.entidade_negocio = v.entidade_negocio AND p.id_venda = v.id
            WHERE v.dt_venda >= :dt_ini
            AND v.dt_venda <= :dt_fim
            AND v.${fieldname} = :id_filter
            AND v.marca_venda IS NULL
            AND v.entidade_negocio = :entidade_negocio
            GROUP BY v.id, v.dt_venda, c.cpf_cliente, c.nom_cliente, c.end_cliente, c.bai_cliente, 
            c.cid_cliente, c.uf_cliente, v.val_tot_venda
            ORDER BY v.dt_venda DESC, v.id DESC
            LIMIT :limit OFFSET :offset`;

            resdata.data.cobrancas = await cobrancas.ExecuteQuery(query,{
                dt_ini,
                dt_fim,
                id_filter,
                limit,
                offset,
                entidade_negocio
            });

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE v.dt_venda >= :dt_ini
                       AND v.dt_venda <= :dt_fim
                       AND v.${fieldname} = :id_filter
                       AND v.entidade_negocio = :entidade_negocio`;

            const [countResult] = await cobrancas.ExecuteQuery(query,{
                dt_ini,
                dt_fim,
                id_filter,
                entidade_negocio
            });

            const total = Number(countResult?.total || 0);

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

            GravarLog('ControllerCobranca.ListarCobrancas', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarPagamentos(req,res) {
        
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                pagamentos: []
            }
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_venda = Number(req.params.id_venda || 0);

            if (!id_venda || id_venda <= 0) {
                const error = new Error('ID da venda invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const pagamentos = new Pagamentos(db.connection, entidade_negocio);

            const query = `SELECT tb_pagamentos.id, tb_pagamentos.dt_pagamento, tb_cobradores.nom_cobrador, tb_pagamentos.vl_pagamento
            FROM tb_pagamentos 
            LEFT JOIN tb_cobradores ON tb_cobradores.id = tb_pagamentos.id_cobrador AND tb_cobradores.entidade_negocio = tb_pagamentos.entidade_negocio
            WHERE tb_pagamentos.entidade_negocio = :entidade_negocio AND tb_pagamentos.id_venda = :id_venda 
            ORDER BY tb_pagamentos.dt_pagamento DESC, tb_pagamentos.id DESC`;

            resdata.data.pagamentos = await pagamentos.ExecuteQuery(query, { entidade_negocio, id_venda });

        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerCobranca.ListarPagamentos', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async SalvarPagamento(req,res) {
        
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                id_venda: 0,
                id_pagamento: 0,
                saldo_pagar: 0
            }
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const body = req.body || {};
            
            const id_venda = String(body.id_venda);
            const dt_pagamento = String(body.dt_pagamento || '').trim();
            const vl_pagamento = parseFloat(body.vl_pagamento || 0);
            const id_cobrador = Number(body.id_cobrador || 0);

            if (id_venda <= 0) {
                const error = new Error('ID da venda invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_pagamento)) {
                const error = new Error('Data do pagamento invalida.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const pagamentos = new Pagamentos(db.connection, entidade_negocio);
            const vendas = new Vendas(db.connection, entidade_negocio);

            const query = `SELECT val_tot_venda, (val_tot_venda - SUM(COALESCE(vl_pagamento, 0))) AS saldo_pagar 
            FROM tb_vendas 
            LEFT JOIN tb_pagamentos ON tb_pagamentos.entidade_negocio = tb_vendas.entidade_negocio AND tb_pagamentos.id_venda = tb_vendas.id 
            WHERE tb_vendas.entidade_negocio = :entidade_negocio AND tb_vendas.id = :id_venda 
            GROUP BY val_tot_venda`

            const [rows] = await pagamentos.ExecuteQuery(query, { entidade_negocio, id_venda });

            if (vl_pagamento > parseFloat(rows.saldo_pagar)) {
                const error = new Error('Valor do pagamento nao pode ser maior que o saldo a pagar.');
                error.statusCode = 400;
                throw error;
            }

            void await pagamentos.FindById(id_venda, 0);

            pagamentos.id_venda = id_venda;
            pagamentos.dt_pagamento = dt_pagamento;
            pagamentos.vl_pagamento = vl_pagamento
            pagamentos.id_cobrador = id_cobrador;

            void await pagamentos.Save();

            void await vendas.FindById(id_venda);

            if(vendas.found) {
                vendas.marca_venda = 'X';
                void await vendas.Save();
            }

            void await db.Commit();
           
            resdata.msg = 'Pagamento registrado com sucesso.';
            resdata.data.id_venda = id_venda;
            resdata.data.id_pagamento = pagamentos.id;
            resdata.data.saldo_pagar = parseFloat(rows.saldo_pagar);

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

                GravarLog('ControllerCobranca.SalvarPagamento', error.stack);
            

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ExcluirPagamento(req,res) {
        
        const db = new Database('dbcred'); 
    
        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_pagamento = Number(req.params.id_pagamento || 0);
            const id_venda = String(req.params.id_venda || 0);

            if (id_pagamento <= 0 || !id_venda) {
                const error = new Error('ID do pagamento ou ID da venda invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const pagamentos = new Pagamentos(db.connection, entidade_negocio);

            void await pagamentos.FindById(id_venda, id_pagamento);

            if (!pagamentos.found) {
                const error = new Error('Pagamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            void await pagamentos.Excluir();

            void await db.Commit();
            
            resdata.msg = 'Pagamento excluido com sucesso.';
            
        } catch (error) {

            void await db.RollBack();
                
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ExcluirPagamento', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async DesmarcarVendaPaga(req,res) {
        
        const db = new Database('dbcred');
    
        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            void await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);
            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const id_filter = Number(req.params?.id || 0);
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

            const vendas = new Vendas(db.connection, entidade_negocio);

            const query = `UPDATE tb_vendas SET marca_venda = NULL
            WHERE entidade_negocio = :entidade_negocio AND ${fieldname} = :id_filter 
            AND dt_venda >= :dt_ini AND dt_venda <= :dt_fim`;

            await vendas.ExecuteQuery(query, {
                entidade_negocio,
                id_filter,
                dt_ini,
                dt_fim
            });

            resdata.msg = 'Vendas desmarcadas como pagas com sucesso.';
            
        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.DesmarcarVendaPaga', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }   

    /**********************************************
    * Adiantamentos
    **********************************************/
    static async ListarAdiantamentosAtivos(req,res) {
        
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                adiantamentos: []
            }
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_cobrador = Number(req.params.id_cobrador || 0);

            if (!id_cobrador || id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const query = `SELECT id, dt_adiant as dt_adiantamento, vl_adiant as vl_adiantamento 
            FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador
            AND num_recibo IS NULL
            ORDER BY dt_adiant DESC, id DESC`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query, { 
                entidade_negocio, 
                id_cobrador
            });

        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ListarAdiantamentos', error.stack);
            }
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }
    
    static async EditarAdiantamento(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor  || 0);
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (id_vendedor <= 0 || id_adiantamento <= 0) {
                const error = new Error('ID do vendedor ou ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento, id_vendedor);

            if (!adiantamentos.found) {
                const error = new Error('Adiantamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = {
                id: adiantamentos.id,
                dt_adiantamento: adiantamentos.dt_adiant,
                vl_adiantamento: adiantamentos.vl_adiant
            }

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.Editar', error.stack);
            }
            
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async SalvarAdiantamento(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {

            void await db.Connect();
            
            void await db.Begin();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const body = req.body || {};

            const id_cobrador = Number(body.id_cobrador || 0);
            const id_adiantamento = Number(body.id_adiantamento || 0);
            const vl_adiantamento = parseFloat(body.vl_adiantamento || 0);

            if (id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
                error.statusCode = 400;
                throw error;
            }

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                adiantamentos.dt_adiant = new Date().toLocaleString('sv-SE');
            }

            adiantamentos.id_cobrador = id_cobrador;
            adiantamentos.vl_adiant = vl_adiantamento;

            void await adiantamentos.Save();

            void await db.Commit();
            
            resdata.msg = 'Adiantamento registrado com sucesso.';
            
        } catch (error) {

            void await db.RollBack();
                
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;    
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerCobranca.SalvarAdiantamento', error.stack);
            
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async ExcluirAdiantamento(req,res) {
        
        const db = new Database('dbcred'); 
    
        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor || 0);
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (id_vendedor <= 0 || id_adiantamento <= 0) {
                const error = new Error('ID do vendedor ou ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento, id_vendedor);

            if (!adiantamentos.found) {
                const error = new Error('Adiantamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            void await adiantamentos.Excluir();

            void await db.Commit();
            
            resdata.msg = 'Adiantamento excluido com sucesso.';
            
        } catch (error) {

            void await db.RollBack();
                
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ExcluirAdiantamento', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async ListarHistoricoAdiantamentos(req,res) {
        
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
             data: {
                adiantamentos: [],
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
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor || 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!id_vendedor || id_vendedor <= 0) {
                const error = new Error('ID do vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

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

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            let query = `SELECT id, dt_adiantamento, vl_adiantamento, num_recibo,
            case when num_recibo is not null then 'Não Pago' else 'Pagamento Feito' end as situacao
            FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor 
            AND dt_adiantamento >= :dt_ini AND dt_adiantamento <= :dt_fim
            ORDER BY dt_adiantamento DESC, id DESC
            LIMIT :limit OFFSET :offset`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query,{
                entidade_negocio,
                id_vendedor,
                dt_ini,
                dt_fim,
                limit,
                offset
            });

            query = `SELECT COUNT(*) AS total FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor 
            AND dt_adiantamento >= :dt_ini AND dt_adiantamento <= :dt_fim`;

            const [countResult] = await adiantamentos.ExecuteQuery(query,{
                entidade_negocio,
                id_vendedor,
                dt_ini,
                dt_fim
            });

            const total = Number(countResult?.total || 0);

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

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ListarHistoricoAdiantamentos', error.stack);
            }   

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }
}
