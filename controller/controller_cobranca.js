import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import TiposPagamentos from '../model/dao_tipos_pagamentos.js';
import RestricaoCredito from '../model/dao_restricao_credito.js';
import Vendas from '../model/dao_vendas.js';
import Pagamentos from '../model/dao_pagamentos.js';
import {buildTableDocument, formatCurrencyBR, formatDateBR, sendPdfResponse} from '../utils/PdfReport.js';
import Clientes from '../model/dao_clientes.js';

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
            const situacao = String(req.query.situacao || '').trim();

            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const id_filter = Number(req.params?.id || 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
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

            const whereClause = [
                'v.dt_venda >= ?',
                'v.dt_venda <= ?',
                `v.${fieldname} = ?`,
                'v.marca_venda IS NULL',
                'v.entidade_negocio = ?'
            ];
            const params = [dt_ini, dt_fim, id_filter, entidade_negocio];

            if (situacao !== null) {
                whereClause.push('v.situacao = ?');
                params.push(situacao);
            } else {
                whereClause.push('v.situacao IN (0, 3)');
            }

            let query = `SELECT v.id, v.dt_venda, c.cpf_cliente, c.nom_cliente,c.nom_usual, c.end_cliente, c.bai_cliente, 
            c.cid_cliente, c.uf_cliente, v.val_tot_venda, v.val_desconto, COALESCE(SUM(p.vl_pagamento), 0) AS val_total_pago,
            GREATEST((v.val_tot_venda - val_desconto )- COALESCE(SUM(p.vl_pagamento), 0), 0) AS saldo_pagar, v.situacao
            FROM tb_vendas v
            LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
            LEFT JOIN tb_pagamentos p ON p.entidade_negocio = v.entidade_negocio AND p.id_venda = v.id
            WHERE ${whereClause.join('\n            AND ')}
            GROUP BY v.id, v.dt_venda, c.cpf_cliente, c.nom_cliente, c.end_cliente, c.bai_cliente, 
            c.cid_cliente, c.uf_cliente, v.val_tot_venda, v.situacao
            ORDER BY v.dt_venda DESC, v.id DESC
            LIMIT ? OFFSET ?`;

            resdata.data.cobrancas = await cobrancas.ExecuteQuery(query, [
                ...params,
                limit,
                offset
            ]);

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE ${whereClause.join('\n                       AND ')}`;

            const [rows] = await cobrancas.ExecuteQuery(query, params);

            const total = Number(rows.total || 0);

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
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerCobranca.ListarCobrancas', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ListarCobrancasPeriodo(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                cobrancas: [],
                entidades: [],
                resumo: {
                    quantidade: 0,
                    total_recebido: 0
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
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);
            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const responsavelJoin = com_rota_cobranca === 1
                ? 'LEFT JOIN tb_rotas resp ON resp.id = v.id_rota AND resp.entidade_negocio = v.entidade_negocio'
                : 'LEFT JOIN tb_cobradores resp ON resp.id = v.id_cobrador AND resp.entidade_negocio = v.entidade_negocio';
            const responsavelNameField = com_rota_cobranca === 1 ? 'resp.nom_rota' : 'resp.nom_cobrador';
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
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

            const cobrancas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);

            const whereClause = [
                'pg.entidade_negocio = ?',
                'pg.dt_pagamento >= ?',
                'pg.dt_pagamento <= ?',
                `v.${fieldname} IS NOT NULL`,
                'v.marca_venda IS NULL'
            ];
            
            const params = [entidade_negocio, dt_ini, dt_fim];

            let query = `SELECT pg.id AS id_pagamento, pg.id_venda, pg.dt_pagamento, pg.vl_pagamento, pg.num_recibo,
                                v.${fieldname} AS id_responsavel, ${responsavelNameField} AS nom_responsavel,
                                c.cpf_cliente, c.nom_cliente, c.nom_usual, c.end_cliente, c.bai_cliente, c.cid_cliente, c.uf_cliente,
                                v.val_tot_venda,
                                COALESCE(pg_total.total_pago_venda, 0) AS val_total_pago,
                                GREATEST(v.val_tot_venda - COALESCE(pg_total.total_pago_venda, 0), 0) AS saldo_pagar
                         FROM tb_pagamentos pg
                         INNER JOIN tb_vendas v ON v.id = pg.id_venda AND v.entidade_negocio = pg.entidade_negocio
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         LEFT JOIN (
                             SELECT entidade_negocio, id_venda, COALESCE(SUM(vl_pagamento), 0) AS total_pago_venda
                             FROM tb_pagamentos
                             GROUP BY entidade_negocio, id_venda
                         ) pg_total ON pg_total.entidade_negocio = v.entidade_negocio AND pg_total.id_venda = v.id
                         ${responsavelJoin}
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY pg.dt_pagamento DESC, pg.id DESC
                         LIMIT ? OFFSET ?`;

            resdata.data.cobrancas = await cobrancas.ExecuteQuery(query, [...params, limit, offset]);

            query = `SELECT COUNT(*) AS total,
                            COALESCE(SUM(pg.vl_pagamento), 0) AS total_recebido
                     FROM tb_pagamentos pg
                     INNER JOIN tb_vendas v ON v.id = pg.id_venda AND v.entidade_negocio = pg.entidade_negocio
                     WHERE ${whereClause.join(' AND ')}`;

            const resumoBase = await cobrancas.ExecuteQuery(query, params);
            const resumoAtual = Array.isArray(resumoBase) && resumoBase[0] ? resumoBase[0] : {};
            const total = Number(resumoAtual?.total || 0);
            const totalRecebido = Number(resumoAtual?.total_recebido || 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = ?`;
            resdata.data.entidades = await entidades.ExecuteQuery(query, [entidade_negocio]);
            resdata.data.resumo = {
                quantidade: total,
                total_recebido: totalRecebido
            };
            resdata.data.paginacao = {
                page,
                limit,
                total,
                total_pages: total > 0 ? Math.ceil(total / limit) : 0
            };
        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerCobranca.ListarCobrancasPeriodo', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImprimirResumoPeriodo(req, res) {

        const db = new Database('dbcred');

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);
            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const responsavelJoin = com_rota_cobranca === 1
                ? 'LEFT JOIN tb_rotas resp ON resp.id = v.id_rota AND resp.entidade_negocio = v.entidade_negocio'
                : 'LEFT JOIN tb_cobradores resp ON resp.id = v.id_cobrador AND resp.entidade_negocio = v.entidade_negocio';
            const responsavelNameField = com_rota_cobranca === 1 ? 'resp.nom_rota' : 'resp.nom_cobrador';
            const responsavelLabel = com_rota_cobranca === 1 ? 'Rota' : 'Cobrador';
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

            if (diffDays >= 45) {
                const error = new Error('Intervalo deve ser inferior a 45 dias.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const cobrancas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection, entidade_negocio);
            const query = `SELECT v.${fieldname} AS id_responsavel,
                                  COALESCE(${responsavelNameField}, 'Sem responsavel') AS nom_responsavel,
                                  COUNT(pg.id) AS qt_pagamentos,
                                  COALESCE(SUM(pg.vl_pagamento), 0) AS total_recebido
                           FROM tb_pagamentos pg
                           INNER JOIN tb_vendas v ON v.id = pg.id_venda AND v.entidade_negocio = pg.entidade_negocio
                           ${responsavelJoin}
                           WHERE pg.entidade_negocio = ?
                             AND pg.dt_pagamento >= ?
                             AND pg.dt_pagamento <= ?
                             AND v.${fieldname} IS NOT NULL
                             AND v.marca_venda IS NULL
                           GROUP BY v.${fieldname}, ${responsavelNameField}
                           ORDER BY total_recebido DESC, nom_responsavel ASC`;

            const rows = await cobrancas.ExecuteQuery(query, [entidade_negocio, dt_ini, dt_fim]);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );
            const totalQt = rows.reduce((acc, item) => acc + Number(item?.qt_pagamentos || 0), 0);
            const totalRecebido = rows.reduce((acc, item) => acc + Number(item?.total_recebido || 0), 0);
            const subtitle = `Periodo: ${formatDateBR(dt_ini)} a ${formatDateBR(dt_fim)}`;
            const body = [
                [
                    { text: responsavelLabel, bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Qtd. pagamentos', bold: true, fontSize: 9, alignment: 'right' },
                    { text: 'Total recebido', bold: true, fontSize: 9, alignment: 'right' }
                ],
                ...rows.map((item) => ([
                    { text: String(item?.nom_responsavel || 'Sem responsavel'), alignment: 'left' },
                    { text: String(Number(item?.qt_pagamentos || 0)), alignment: 'right' },
                    { text: formatCurrencyBR(item?.total_recebido), alignment: 'right' }
                ])),
                [
                    { text: 'TOTAL GERAL', bold: true, alignment: 'left' },
                    { text: String(totalQt), bold: true, alignment: 'right' },
                    { text: formatCurrencyBR(totalRecebido), bold: true, alignment: 'right' }
                ]
            ];

            const document = buildTableDocument({
                title: 'RELATORIO DE COBRANCA POR RESPONSAVEL',
                organizationName: entidade?.nom_entidade || String(entidade_negocio),
                description: 'Resumo financeiro consolidado',
                subtitle,
                summaryCards: [
                    { label: 'Periodo', value: `${formatDateBR(dt_ini)} a ${formatDateBR(dt_fim)}`, width: '34%' },
                    { label: 'Agrupamento', value: responsavelLabel, width: '22%' },
                    { label: 'Qtde Pagamentos', value: String(totalQt), width: '20%' },
                    { label: 'Total Recebido', value: formatCurrencyBR(totalRecebido), width: '24%' }
                ],
                tableTitle: 'Resumo por responsavel',
                widths: ['52%', '18%', '30%'],
                body,
                orientation: 'portrait'
            });

            await sendPdfResponse(res, `relatorio-cobranca-${dt_ini}-${dt_fim}.pdf`, document);

        } catch (error) {
            
            const err = error.statusCode || 500;

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });

                if (err == 500) GravarLog('ControllerCobranca.ImprimirResumoPeriodo', error.stack);
            }

        }

        void await db.Close();

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

            const query = `SELECT tb_pagamentos.id, tb_pagamentos.dt_pagamento, tb_cobradores.nom_cobrador, 
            tb_pagamentos.vl_pagamento, tb_pagamentos.vl_desconto
            FROM tb_pagamentos 
            LEFT JOIN tb_cobradores ON tb_cobradores.id = tb_pagamentos.id_cobrador AND tb_cobradores.entidade_negocio = tb_pagamentos.entidade_negocio
            WHERE tb_pagamentos.entidade_negocio = ? AND tb_pagamentos.id_venda = ? 
            ORDER BY tb_pagamentos.dt_pagamento DESC, tb_pagamentos.id DESC`;

            resdata.data.pagamentos = await pagamentos.ExecuteQuery(query, [entidade_negocio, id_venda]);

        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerCobranca.ListarPagamentos', error.stack);
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
            const vl_desconto = parseFloat(body.vl_desconto || 0);

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
            const tipos = new TiposPagamentos(db.connection,entidade_negocio);
            const entidades = new Entidades(db.connection);
            const restricao = new RestricaoCredito(db.connection,entidade_negocio);
            const clientes = new Clientes(db.connection, entidade_negocio);
            
            const query = `SELECT val_tot_venda,
                            (COALESCE(val_tot_venda, 0) - COALESCE(val_desconto, 0)) - SUM(COALESCE(vl_pagamento, 0)) AS saldo_pagar
                            FROM tb_vendas
                            LEFT JOIN tb_pagamentos ON tb_pagamentos.entidade_negocio = tb_vendas.entidade_negocio
                            AND tb_pagamentos.id_venda = tb_vendas.id
                            WHERE tb_vendas.entidade_negocio = :entidade_negocio AND tb_vendas.id = :id_venda
                            GROUP BY val_tot_venda, val_desconto`

            const [rows] = await pagamentos.ExecuteQuery(query, {entidade_negocio, id_venda});

            void await entidades.FindById(entidade_negocio);
            void await pagamentos.FindById(id_venda, 0);

            const valor_max_desconto = (entidades.percent_desconto_cobranca / (rows.saldo_pagar - vl_desconto) * 100)

            console.log(valor_max_desconto)

            if (vl_desconto > valor_max_desconto) {
                const error = new Error("Desconto maior que o permitido.");
                error.statusCode = 403;
                throw error
            }

            if ((vl_pagamento + vl_desconto) > rows.saldo_pagar) {
                const error = new Error('Valor do pagamento nao pode ser maior que o saldo a pagar.');
                error.statusCode = 403;
                throw error;
            }

            pagamentos.id_venda = id_venda;
            pagamentos.dt_pagamento = dt_pagamento;
            pagamentos.vl_pagamento = vl_pagamento;
            pagamentos.id_cobrador = id_cobrador;
            pagamentos.vl_desconto = vl_desconto;

            void await pagamentos.Save();

            /*********************************************************
             * Atualiza dados da Venda
            **********************************************************/
            void await vendas.FindById(id_venda);

            if(vendas.found) {

                void await tipos.FindById(vendas.id_tipo_pag);

                const prox_dia_pagamento = new Date(vendas.dia_pagam);

                prox_dia_pagamento.setDate(prox_dia_pagamento.getDate() + tipos.dias_apos_pagamnto)

                vendas.marca_venda = 'X';
                vendas.dia_pagam = prox_dia_pagamento;
                vendas.val_desconto += vl_desconto;
                vendas.ult_dat_pagamto = dt_pagamento;
                vendas.situacao = 0;

                if ( ( rows.saldo_pagar - vl_desconto ) - vl_pagamento == 0) {
                    vendas.situacao = 9;
                }
                
                void await vendas.Save();

                /*****************************************************
                 *  Verifica / Retira a Restrição de Credito
                ******************************************************/
                void await restricao.FindByCpf(vendas.cpf_cliente);

                if (restricao.found) {

                    if (restricao.id_venda && restricao.id_venda == id_venda) {

                        void await clientes.FindByCpf(restricao.cpf_cliente);

                        clientes.com_restricao_credito = false;

                        void await clientes.Save();

                    }
                    
                    void await restricao.Excluir();

                }


            } else {
                
                const error = new Error('Numero da Venda não encontrada.');
                error.statusCode = 404;
                throw error;
            }

            void await db.Commit();
           
            resdata.msg = 'Pagamento registrado com sucesso.';
            resdata.data.id_venda = id_venda;
            resdata.data.id_pagamento = pagamentos.id;
            resdata.data.saldo_pagar = parseFloat(rows.saldo_pagar);

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerCobranca.SalvarPagamento', error.stack);
            
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
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
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

            const query = `UPDATE tb_vendas SET marca_venda = Null
                            WHERE entidade_negocio = ? AND ${fieldname} = ? 
                            AND dt_venda >= ? AND dt_venda <= ?`;

            await vendas.ExecuteQuery(query, [
                entidade_negocio,
                id_filter,
                dt_ini,
                dt_fim
            ]);

            resdata.msg = 'Vendas desmarcadas como pagas com sucesso.';
            
        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.DesmarcarVendaPaga', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }   

}
