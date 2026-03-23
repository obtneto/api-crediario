import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import Adiantamentos from '../model/dao_adiantamentos.js';
import Pagamentos from '../model/dao_pagamentos.js';
import Vendas from '../model/dao_vendas.js';
import Comissoes from '../model/dao_comissoes.js';
import {buildTableDocument, formatCurrencyBR, formatDateBR, sendPdfResponse} from '../utils/PdfReport.js';

function buildReceiptSummaryBox({
    descricao,
    tipoRecibo,
    detalhesExtras = [],
    valorBruto,
    valorAdiantado,
    valorLiquido
}) {
    return {
        margin: [0, 0, 0, 18],
        layout: {
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
            hLineColor: () => '#cfd4dc',
            vLineColor: () => '#cfd4dc',
            paddingLeft: () => 14,
            paddingRight: () => 14,
            paddingTop: () => 12,
            paddingBottom: () => 12
        },
        table: {
            widths: ['*'],
            body: [[{
                border: [true, true, true, true],
                stack: [
                    { text: descricao, lineHeight: 1.3 },
                    { text: `Tipo de recibo: ${tipoRecibo}`, margin: [0, 10, 0, 0] },
                    ...detalhesExtras.map((texto) => ({ text: texto, margin: [0, 4, 0, 0] })),
                    { text: `Valor bruto da comissao: ${formatCurrencyBR(valorBruto)}`, margin: [0, 4, 0, 0] },
                    { text: `Adiantamentos abatidos: ${formatCurrencyBR(valorAdiantado)}`, margin: [0, 4, 0, 0] },
                    { text: `Valor liquido recebido: ${formatCurrencyBR(valorLiquido)}`, margin: [0, 4, 0, 0], bold: true }
                ]
            }]]
        }
    };
}

function buildReceiptTotalsAndSignature({
    totals,
    signatoryName,
    signatoryLabel
}) {
    const hasTotals = Array.isArray(totals) && totals.length > 0;
    const signatureBlock = {
        width: 220,
        stack: [
            {
                canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8, lineColor: '#111827' }
                ],
                margin: [20, 26, 20, 0]
            },
            { text: signatoryName, alignment: 'center', margin: [0, 8, 0, 0], bold: true },
            { text: signatoryLabel, alignment: 'center', fontSize: 8, color: '#4a5568' }
        ]
    };

    if (!hasTotals) {
        return {
            margin: [0, 16, 0, 0],
            stack: [
                {
                    columns: [
                        { width: '*', text: '' },
                        signatureBlock,
                        { width: '*', text: '' }
                    ]
                }
            ]
        };
    }

    return {
        margin: [0, 16, 0, 0],
        columnGap: 24,
        columns: [
            {
                width: '*',
                stack: totals
            },
            signatureBlock
        ]
    };
}

export class ControllerComissoes {

    /*********************************************************
    * Pagamentos de Adiantamentos de Comissoes
    **********************************************************/
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

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id = Number(req.params.id || 0); 
            const fieldname = req.params.fieldname;  //id_vendedor ou id_cobrador
            const fieldnamePermitido = fieldname === 'id_vendedor' || fieldname === 'id_cobrador';

            if (!id || id <= 0) {
                const error = new Error('ID do cobrador ou vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!fieldnamePermitido) {
                const error = new Error('Campo de destino invalido.');
                error.statusCode = 400;
                throw error;
            }
            
            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const query = `SELECT id, dt_adiant as dt_adiantamento, vl_adiant as vl_adiantamento 
            FROM tb_adiantamentos 
            WHERE entidade_negocio = ? AND ${fieldname} = ?
            AND num_recibo IS NULL
            ORDER BY dt_adiant DESC, id DESC`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query, [ 
                entidade_negocio, 
                id
            ]);

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

    static async ImprimirAdiantamentosAtivos(req,res) {

        const db = new Database('dbcred');

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const id = Number(req.params.id || 0);
            const fieldname = String(req.params.fieldname || '').trim();
            const pesq = String(req.query.pesq || '').trim().toLowerCase();
            const fieldnamePermitido = fieldname === 'id_vendedor' || fieldname === 'id_cobrador';
            const labelDestino = fieldname === 'id_cobrador' ? 'Cobrador' : 'Vendedor';
            const tabelaDestino = fieldname === 'id_cobrador' ? 'tb_cobradores' : 'tb_vendedores';
            const colunaNome = fieldname === 'id_cobrador' ? 'nom_cobrador' : 'nom_vendedor';

            if (!id || id <= 0) {
                const error = new Error('ID do cobrador ou vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!fieldnamePermitido) {
                const error = new Error('Campo de destino invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const query = `SELECT a.id, a.dt_adiant as dt_adiantamento, a.vl_adiant as vl_adiantamento, d.${colunaNome} as nom_destino
                           FROM tb_adiantamentos a
                           LEFT JOIN ${tabelaDestino} d ON d.id = a.${fieldname} AND d.entidade_negocio = a.entidade_negocio
                           WHERE a.entidade_negocio = ? AND a.${fieldname} = ?
                           AND a.num_recibo IS NULL
                           ORDER BY a.dt_adiant DESC, a.id DESC`;

            let rows = await adiantamentos.ExecuteQuery(query, [entidade_negocio, id]);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const nomeDestino = String(rows[0]?.nom_destino || '-');

            if (pesq) {
                rows = rows.filter((item) => {
                    const campos = [
                        item?.id,
                        item?.dt_adiantamento,
                        formatDateBR(item?.dt_adiantamento, true),
                        item?.vl_adiantamento,
                        formatCurrencyBR(item?.vl_adiantamento),
                        nomeDestino,
                        labelDestino
                    ];

                    return campos.some((campo) => String(campo ?? '').toLowerCase().includes(pesq));
                });
            }

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao com o filtro atual.');
                error.statusCode = 404;
                throw error;
            }

            const total = rows.reduce((acc, item) => acc + Number(item?.vl_adiantamento || 0), 0);
            const subtitle = `${labelDestino}: ${nomeDestino} | Total: ${formatCurrencyBR(total)}`;
            const body = [
                [
                    { text: 'ID', bold: true, fontSize: 9, alignment: 'left' },
                    { text: labelDestino, bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Data/Hora', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Valor', bold: true, fontSize: 9, alignment: 'right' }
                ],
                ...rows.map((item) => ([
                    { text: String(item?.id ?? 0), alignment: 'left' },
                    { text: nomeDestino, alignment: 'left' },
                    { text: formatDateBR(item?.dt_adiantamento, true), alignment: 'left' },
                    { text: formatCurrencyBR(item?.vl_adiantamento), alignment: 'right' }
                ]))
            ];

            const document = buildTableDocument({
                title: 'RELATORIO DE ADIANTAMENTOS',
                subtitle,
                widths: ['12%', '36%', '30%', '22%'],
                body
            });

            await sendPdfResponse(res, `relatorio-adiantamentos-${fieldname}-${id}.pdf`, document);

        } catch (error) {

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog('ControllerComissoes.ImprimirAdiantamentosAtivos', error.stack);
        }

        void await db.Close();
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

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (!id_adiantamento || id_adiantamento <= 0) {
                const error = new Error('ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const data = await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                const error = new Error('Adiantamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = data;

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

            const id = Number(body.id || 0);
            const fieldname = body.fieldname; //id_vendedor ou id_cobrador
            const id_adiantamento = Number(body.id_adiantamento || 0);
            const vl_adiantamento = parseFloat(body.vl_adiantamento || 0);

            if (id <= 0) {
                const error = new Error('ID invalido.');
                error.statusCode = 400;
                throw error;
            }

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                adiantamentos.dt_adiant = new Date().toLocaleString('sv-SE');
            }

            fieldname === 'id_cobrador' ? adiantamentos.id_cobrador = id : adiantamentos.id_vendedor = id;
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
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (!id_adiantamento || id_adiantamento <= 0) {
                const error = new Error('ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento);

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

    static async ConsultarValorTotalAdiantamentos(req,res) {

        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                valor_adiantamento: 0
            }
        }

        try {

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id = Number(req.params.id || 0); 
            const fieldname = req.params.fieldname;  //id_vendedor ou id_cobrador
            const fieldnamePermitido = fieldname === 'id_vendedor' || fieldname === 'id_cobrador';

            if (!id || id <= 0) {
                const error = new Error('ID do cobrador ou vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!fieldnamePermitido) {
                const error = new Error('Campo de destino invalido.');
                error.statusCode = 400;
                throw error;
            }
            
            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const query = `SELECT SUM(vl_adiant) as ValorAdiantamento FROM tb_adiantamentos
                WHERE entidade_negocio = :entidade_negocio 
                AND (:fieldname = 'id_vendedor' AND id_vendedor = :id)
                OR (:fieldname = 'id_cobrador' AND id_cobrador = :id)`

            const [rows] = await adiantamentos(query,{
                entidade_negocio,
                id,
                fieldname
            })

            if (rows) resdata.data.valor_adiantamento = rows.ValorAdiantamento;
            
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

    /*********************************************************
    * Recibos de Pagamentos Comissões 
    **********************************************************/
    static async ImprimirReciboCobrador(req,res) {

        const db = new Database('dbcred');

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const num_recibo = String(req.params.num_recibo || '').trim();

            if (!num_recibo) {
                const error = new Error('Numero do recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const comissoes = new Comissoes(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);
            const pagamentos = new Pagamentos(db.connection, entidade_negocio);
            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const recibo = await comissoes.ExecuteQuery(
                `SELECT cm.num_recibo, cm.dt_recibo, cm.tp_recibo, cm.vl_recibo, cm.vl_adiant,
                        cm.id_cobrador as id_cobrador, cb.nom_cobrador
                 FROM tb_comissoes cm
                 LEFT JOIN tb_cobradores cb ON cb.id = cm.id_cobrador AND cb.entidade_negocio = cm.entidade_negocio
                 WHERE cm.entidade_negocio = ? AND cm.num_recibo = ?
                 LIMIT 1`,
                [entidade_negocio, num_recibo]
            );

            const itemRecibo = Array.isArray(recibo) ? recibo[0] : null;

            if (!itemRecibo) {
                const error = new Error('Recibo de comissao nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const entidade = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );

            const itemEntidade = Array.isArray(entidade) ? entidade[0] : null;
            const nomeEntidade = String(itemEntidade?.nom_entidade || entidade_negocio);
            const nomeCobrador = String(itemRecibo?.nom_cobrador || '-');
            const valorRecibo = Number(itemRecibo?.vl_recibo || 0);
            const valorAdiantado = Number(itemRecibo?.vl_adiant || 0);
            const valorLiquido = valorRecibo - valorAdiantado;

            const rowsPagamentos = await pagamentos.ExecuteQuery(
                `SELECT pg.id_venda, cl.nom_cliente, SUM(pg.vl_pagamento) as vl_pagamento,
                        SUM(pg.vl_pagamento * (cb.comissao/100)) as vl_comissao
                 FROM tb_pagamentos pg
                 LEFT JOIN tb_vendas vd ON vd.id = pg.id_venda AND vd.entidade_negocio = pg.entidade_negocio
                 LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
                 LEFT JOIN tb_cobradores cb ON cb.id = pg.id_cobrador AND cb.entidade_negocio = pg.entidade_negocio
                 WHERE pg.entidade_negocio = ? AND pg.num_recibo = ?
                 GROUP BY pg.id_venda, cl.nom_cliente
                 ORDER BY pg.id_venda ASC`,
                [entidade_negocio, num_recibo]
            );

            const rowsAdiantamentos = await adiantamentos.ExecuteQuery(
                `SELECT ad.id, ad.dt_adiant as dt_adiantamento, ad.vl_adiant as vl_adiantamento
                 FROM tb_adiantamentos ad
                 WHERE ad.entidade_negocio = ? AND ad.num_recibo = ?
                 ORDER BY ad.dt_adiant ASC, ad.id ASC`,
                [entidade_negocio, num_recibo]
            );

            const totalPagamentos = Array.isArray(rowsPagamentos)
                ? rowsPagamentos.reduce((acc, item) => acc + Number(item?.vl_pagamento || 0), 0)
                : 0;

            const totalComissao = Array.isArray(rowsPagamentos)
                ? rowsPagamentos.reduce((acc, item) => acc + Number(item?.vl_comissao || 0), 0)
                : 0;

            const totalAdiantamentos = Array.isArray(rowsAdiantamentos)
                ? rowsAdiantamentos.reduce((acc, item) => acc + Number(item?.vl_adiantamento || 0), 0)
                : 0;

            const pagamentosBody = Array.isArray(rowsPagamentos) && rowsPagamentos.length > 0
                ? [
                    [
                        { text: 'Cobrança', bold: true, fontSize: 8, alignment: 'left' },
                        //{ text: 'Data', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Cliente', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Valor', bold: true, fontSize: 8, alignment: 'right' },
                        { text: 'Comissao', bold: true, fontSize: 8, alignment: 'right' }
                    ],
                    ...rowsPagamentos.map((item) => ([
                        { text: String(item?.id_venda ?? '-'), alignment: 'left' },
                        //{ text: formatDateBR(item?.dt_pagamento, true), alignment: 'left' },
                        { text: String(item?.nom_cliente || '-'), alignment: 'left' },
                        { text: formatCurrencyBR(item?.vl_pagamento), alignment: 'right' },
                        { text: formatCurrencyBR(item?.vl_comissao), alignment: 'right' }
                    ]))
                ]
                : [[
                    { text: 'Nenhum pagamento vinculado a este recibo.', colSpan: 4, alignment: 'center', margin: [0, 6, 0, 6] },
                    {},
                    {},
                    {}
                ]];

            const adiantamentosBody = Array.isArray(rowsAdiantamentos) && rowsAdiantamentos.length > 0
                ? [
                    [
                        { text: 'ID', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Data', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Valor', bold: true, fontSize: 8, alignment: 'right' }
                    ],
                    ...rowsAdiantamentos.map((item) => ([
                        { text: String(item?.id ?? '-'), alignment: 'left' },
                        { text: formatDateBR(item?.dt_adiantamento, true), alignment: 'left' },
                        { text: formatCurrencyBR(item?.vl_adiantamento), alignment: 'right' }
                    ]))
                ]
                : [[
                    { text: 'Nenhum adiantamento vinculado a este recibo.', colSpan: 3, alignment: 'center', margin: [0, 6, 0, 6] },
                    {},
                    {}
                ]];

            const document = {
                pageSize: 'A4',
                pageMargins: [28, 28, 28, 36],
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 9
                },
                content: [
                    {
                        columns: [
                            [
                                { text: nomeEntidade, bold: true, fontSize: 14 },
                                { text: `Recibo de Comissao`, fontSize: 11, margin: [0, 2, 0, 0] }
                            ],
                            [
                                { text: `Recibo Nº ${itemRecibo.num_recibo}`, alignment: 'right', bold: true, fontSize: 11 },
                                { text: `Data: ${formatDateBR(itemRecibo.dt_recibo, true)}`, alignment: 'right', margin: [0, 2, 0, 0] }
                            ]
                        ],
                        margin: [0, 0, 0, 18]
                    },
                    {
                        ...buildReceiptSummaryBox({
                            descricao: `Recebi de ${nomeEntidade} a importancia liquida de ${formatCurrencyBR(valorLiquido)} referente ao pagamento de comissao do cobrador ${nomeCobrador}.`,
                            tipoRecibo: String(itemRecibo?.tp_recibo || 'COMISSAO COBRADOR'),
                            detalhesExtras: [
                                `Total recebido em cobrancas: ${formatCurrencyBR(totalPagamentos)}`
                            ],
                            valorBruto: valorRecibo,
                            valorAdiantado,
                            valorLiquido
                        })
                    },
                    {
                        columns: [
                            { text: `Cobrador: ${nomeCobrador}`, bold: true },
                            { text: `Entidade: ${nomeEntidade}`, alignment: 'right' }
                        ],
                        margin: [0, 0, 0, 8]
                    },
                    {
                        text: 'Pagamentos vinculados',
                        bold: true,
                        fontSize: 10,
                        margin: [0, 8, 0, 6]
                    },
                    {
                        layout: {
                            hLineWidth: (i) => (i === 1 ? 0.8 : 0.2),
                            vLineWidth: () => 0,
                            hLineColor: () => '#cfd4dc',
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: (i) => (i === 0 ? 4 : 3),
                            paddingBottom: () => 3
                        },
                        table: {
                            headerRows: Array.isArray(rowsPagamentos) && rowsPagamentos.length > 0 ? 1 : 0,
                            widths: ['14%', '*', '18%', '18%'],
                            body: pagamentosBody
                        }
                    },
                    {
                        text: 'Adiantamentos vinculados',
                        bold: true,
                        fontSize: 10,
                        margin: [0, 14, 0, 6]
                    },
                    {
                        layout: {
                            hLineWidth: (i) => (i === 1 ? 0.8 : 0.2),
                            vLineWidth: () => 0,
                            hLineColor: () => '#cfd4dc',
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: (i) => (i === 0 ? 4 : 3),
                            paddingBottom: () => 3
                        },
                        table: {
                            headerRows: Array.isArray(rowsAdiantamentos) && rowsAdiantamentos.length > 0 ? 1 : 0,
                            widths: ['16%', '54%', '30%'],
                            body: adiantamentosBody
                        }
                    },
                    {
                        ...buildReceiptTotalsAndSignature({
                            totals: [],
                            signatoryName: nomeCobrador,
                            signatoryLabel: 'Assinatura do cobrador'
                        })
                    }
                ],
                footer(currentPage, pageCount) {
                    return {
                        margin: [28, 0, 28, 16],
                        text: `Pagina ${currentPage} de ${pageCount}`,
                        alignment: 'right',
                        fontSize: 7
                    };
                }
            };

            await sendPdfResponse(res, `recibo-comissao-${num_recibo}.pdf`, document);

        } catch (error) {

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog('ControllerComissoes.ImprimirReciboCobrador', error.stack);
        }

        void await db.Close();
    }

    static async ImprimirReciboVendedor(req,res) {

        const db = new Database('dbcred');

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const num_recibo = String(req.params.num_recibo || '').trim();

            if (!num_recibo) {
                const error = new Error('Numero do recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const comissoes = new Comissoes(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);
            const vendas = new Vendas(db.connection, entidade_negocio);
            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const recibo = await comissoes.ExecuteQuery(
                `SELECT cm.num_recibo, cm.dt_recibo, cm.tp_recibo, cm.vl_recibo, cm.vl_adiant,
                        cm.id_vendedor as id_vendedor, vr.nom_vendedor
                 FROM tb_comissoes cm
                 LEFT JOIN tb_vendedores vr ON vr.id = cm.id_vendedor AND vr.entidade_negocio = cm.entidade_negocio
                 WHERE cm.entidade_negocio = ? AND cm.num_recibo = ?
                 LIMIT 1`,
                [entidade_negocio, num_recibo]
            );

            const itemRecibo = Array.isArray(recibo) ? recibo[0] : null;

            if (!itemRecibo) {
                const error = new Error('Recibo de comissao nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const entidade = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );

            const itemEntidade = Array.isArray(entidade) ? entidade[0] : null;
            const nomeEntidade = String(itemEntidade?.nom_entidade || entidade_negocio);
            const nomeVendedor = String(itemRecibo?.nom_vendedor || '-');
            const valorRecibo = Number(itemRecibo?.vl_recibo || 0);
            const valorAdiantado = Number(itemRecibo?.vl_adiant || 0);
            const valorLiquido = valorRecibo - valorAdiantado;

            const rowsVendas = await vendas.ExecuteQuery(
                `SELECT vd.id as id_venda, cl.nom_cliente, SUM(vd.val_tot_venda) as val_tot_venda,
                        SUM(vd.val_tot_venda * (vr.comissao/100)) as vl_comissao
                 FROM tb_vendas vd
                 LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
                 LEFT JOIN tb_vendedores vr ON vr.id = vd.id_vendedor AND vr.entidade_negocio = vd.entidade_negocio
                 WHERE vd.entidade_negocio = ? AND vd.num_recibo = ?
                 GROUP BY vd.id, cl.nom_cliente
                 ORDER BY vd.id ASC`,
                [entidade_negocio, num_recibo]
            );

            const rowsAdiantamentos = await adiantamentos.ExecuteQuery(
                `SELECT ad.id, ad.dt_adiant as dt_adiantamento, ad.vl_adiant as vl_adiantamento
                 FROM tb_adiantamentos ad
                 WHERE ad.entidade_negocio = ? AND ad.num_recibo = ?
                 ORDER BY ad.dt_adiant ASC, ad.id ASC`,
                [entidade_negocio, num_recibo]
            );

            const totalVendas = Array.isArray(rowsVendas)
                ? rowsVendas.reduce((acc, item) => acc + Number(item?.val_tot_venda || 0), 0)
                : 0;

            const totalComissao = Array.isArray(rowsVendas)
                ? rowsVendas.reduce((acc, item) => acc + Number(item?.vl_comissao || 0), 0)
                : 0;

            const totalAdiantamentos = Array.isArray(rowsAdiantamentos)
                ? rowsAdiantamentos.reduce((acc, item) => acc + Number(item?.vl_adiantamento || 0), 0)
                : 0;

            const vendasBody = Array.isArray(rowsVendas) && rowsVendas.length > 0
                ? [
                    [
                        { text: 'Venda', bold: true, fontSize: 8, alignment: 'left' },
                        //{ text: 'Data', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Cliente', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Valor', bold: true, fontSize: 8, alignment: 'right' },
                        { text: 'Comissao', bold: true, fontSize: 8, alignment: 'right' }
                    ],
                    ...rowsVendas.map((item) => ([
                        { text: String(item?.id_venda ?? '-'), alignment: 'left' },
                        //{ text: formatDateBR(item?.dt_pagamento, true), alignment: 'left' },
                        { text: String(item?.nom_cliente || '-'), alignment: 'left' },
                        { text: formatCurrencyBR(item?.val_tot_venda), alignment: 'right' },
                        { text: formatCurrencyBR(item?.vl_comissao), alignment: 'right' }
                    ]))
                ]
                : [[
                    { text: 'Nenhuma venda vinculada a este recibo.', colSpan: 4, alignment: 'center', margin: [0, 6, 0, 6] },
                    {},
                    {},
                    {}
                ]];

            const adiantamentosBody = Array.isArray(rowsAdiantamentos) && rowsAdiantamentos.length > 0
                ? [
                    [
                        { text: 'ID', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Data', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Valor', bold: true, fontSize: 8, alignment: 'right' }
                    ],
                    ...rowsAdiantamentos.map((item) => ([
                        { text: String(item?.id ?? '-'), alignment: 'left' },
                        { text: formatDateBR(item?.dt_adiantamento, true), alignment: 'left' },
                        { text: formatCurrencyBR(item?.vl_adiantamento), alignment: 'right' }
                    ]))
                ]
                : [[
                    { text: 'Nenhum adiantamento vinculado a este recibo.', colSpan: 3, alignment: 'center', margin: [0, 6, 0, 6] },
                    {},
                    {}
                ]];

            const document = {
                pageSize: 'A4',
                pageMargins: [28, 28, 28, 36],
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 9
                },
                content: [
                    {
                        columns: [
                            [
                                { text: nomeEntidade, bold: true, fontSize: 14 },
                                { text: `Recibo de Comissao`, fontSize: 11, margin: [0, 2, 0, 0] }
                            ],
                            [
                                { text: `Recibo Nº ${itemRecibo.num_recibo}`, alignment: 'right', bold: true, fontSize: 11 },
                                { text: `Data: ${formatDateBR(itemRecibo.dt_recibo, true)}`, alignment: 'right', margin: [0, 2, 0, 0] }
                            ]
                        ],
                        margin: [0, 0, 0, 18]
                    },
                    {
                        ...buildReceiptSummaryBox({
                            descricao: `Recebi de ${nomeEntidade} a importancia liquida de ${formatCurrencyBR(valorLiquido)} referente ao pagamento de comissao do vendedor ${nomeVendedor}.`,
                            tipoRecibo: String(itemRecibo?.tp_recibo || 'COMISSAO VENDEDOR'),
                            detalhesExtras: [
                                `Total recebido em cobrancas: ${formatCurrencyBR(totalVendas)}`
                            ],
                            valorBruto: valorRecibo,
                            valorAdiantado,
                            valorLiquido
                        })
                    },
                    {
                        columns: [
                            { text: `Vendedor: ${nomeVendedor}`, bold: true },
                            { text: `Entidade: ${nomeEntidade}`, alignment: 'right' }
                        ],
                        margin: [0, 0, 0, 8]
                    },
                    {
                        text: 'Vendas vinculados',
                        bold: true,
                        fontSize: 10,
                        margin: [0, 8, 0, 6]
                    },
                    {
                        layout: {
                            hLineWidth: (i) => (i === 1 ? 0.8 : 0.2),
                            vLineWidth: () => 0,
                            hLineColor: () => '#cfd4dc',
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: (i) => (i === 0 ? 4 : 3),
                            paddingBottom: () => 3
                        },
                        table: {
                            headerRows: Array.isArray(rowsVendas) && rowsVendas.length > 0 ? 1 : 0,
                            widths: ['14%', '*', '18%', '18%'],
                            body: vendasBody
                        }
                    },
                    {
                        text: 'Adiantamentos vinculados',
                        bold: true,
                        fontSize: 10,
                        margin: [0, 14, 0, 6]
                    },
                    {
                        layout: {
                            hLineWidth: (i) => (i === 1 ? 0.8 : 0.2),
                            vLineWidth: () => 0,
                            hLineColor: () => '#cfd4dc',
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: (i) => (i === 0 ? 4 : 3),
                            paddingBottom: () => 3
                        },
                        table: {
                            headerRows: Array.isArray(rowsAdiantamentos) && rowsAdiantamentos.length > 0 ? 1 : 0,
                            widths: ['16%', '54%', '30%'],
                            body: adiantamentosBody
                        }
                    },
                    {
                        ...buildReceiptTotalsAndSignature({
                            totals: [],
                            signatoryName: nomeVendedor,
                            signatoryLabel: 'Assinatura do vendedor'
                        })
                    }
                ],
                footer(currentPage, pageCount) {
                    return {
                        margin: [28, 0, 28, 16],
                        text: `Pagina ${currentPage} de ${pageCount}`,
                        alignment: 'right',
                        fontSize: 7
                    };
                }
            };

            await sendPdfResponse(res, `recibo-comissao-${num_recibo}.pdf`, document);

        } catch (error) {

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog('ControllerComissoes.ImprimirReciboCobrador', error.stack);
        }

        void await db.Close();
    }

    static async ListarRecibos(req,res) {

        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                pagamentos: [],
                adiantamentos:[]
            }
        }

        try {

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const num_rebibo = String(req.params.num_rebibo).trim();
            
            if (!num_rebibo || num_rebibo == '') {
                const error = new Error('Numero do Recibo invalido')
                error.statusCode = 400;
                throw error;
            }

            const pagamentos = new Pagamentos(db.connection,entidade_negocio);

            let query = `SELECT pg.id_venda,pg.dt_pagamento,cl.nom_cliente,pg.vl_pagamento from tb_pagamentos pg
            LEFT JOIN tb_vendas vd ON vd.id = pg.id_venda AND vd.entidade_negocio = pg.entidade_negocio
            LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
            WHERE pg.entidade_negocio = :entidade_negocio AND pg.num_recibo = :num_recibo`
            
            resdata.data.pagamentos = await pagamentos.ExecuteQuery(query,{
                entidade_negocio,
                num_rebibo
            });

            query = `SELECT  FROM tb_adiantamentos` 

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerComissoes.SalvarReciboCobrador', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async EditarRecibo(req,res) {

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
            const num_recibo = String(req.params.num_recibo);

            if (!num_recibo) {
                const error = new Error('Numero do Recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            const data = await comissoes.FindById(num_recibo);

            if (!comissoes.found) {
                const error = new Error('Numero de Recibo nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = data;

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

    /*********************************************************
    * Recibos de Pagamentos Comissões Cobrador
    **********************************************************/
    static async SalvarReciboCobrador(req,res) {

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

            const num_recibo = String(body.num_recibo || '').trim();
            const id_cobrador = Number(body.id_cobrador || 0);
            const dt_recibo = String(body.dt_recibo || '').trim();
            const tp_recibo = String(body.tp_recibo || '').trim();
            const vl_recibo = parseFloat(body.vl_recibo || 0);
            const vl_adiant = parseFloat(body.vl_adiant || 0);

            if (!id_cobrador || id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!dt_recibo) {
                const error = new Error('Data do recibo nao informada.');
                error.statusCode = 400;
                throw error;
            }

            if (!tp_recibo) {
                const error = new Error('Tipo de recibo nao informado.');
                error.statusCode = 400;
                throw error;
            }

            if (vl_recibo <= 0) {
                const error = new Error('Valor do recibo deve ser maior que zero.');
                error.statusCode = 400;
                throw error;
            }

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            void await comissoes.FindById(num_recibo);

            comissoes.dt_recibo = dt_recibo;
            comissoes.tp_recibo = tp_recibo;
            comissoes.vl_recibo = vl_recibo;
            comissoes.vl_adiant = vl_adiant;
            comissoes.id_cobrador = id_cobrador;

            await comissoes.Save();

            const updated_pagamentos = `UPDATE tb_pagamentos SET num_recibo = :num_recibo 
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador AND num_recibo IS NULL`;

            void await db.connection.execute(updated_pagamentos,{entidade_negocio,id_cobrador,num_recibo: comissoes.num_recibo});

            const updated_adiantamentos = `UPDATE tb_adiantamentos SET num_recibo = :num_recibo 
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador AND num_recibo IS NULL`;

            void await db.connection.execute(updated_adiantamentos,{entidade_negocio,id_cobrador,num_recibo: comissoes.num_recibo});

            void await db.Commit();

            resdata.data = {
                num_recibo: comissoes.num_recibo,
                id_cobrador: comissoes.id_cobrador
            };

            resdata.msg = comissoes.found ? 'Comissao atualizada com sucesso.' : 'Comissao registrada com sucesso.';

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerComissoes.SalvarReciboCobrador', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ExcluirReciboCobrador(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const num_recibo = String(req.params.num_recibo || '').trim();
            const id_cobrador = Number(req.params.id_cobrador || 0);

            if (!num_recibo) {
                const error = new Error('Numero de recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!id_cobrador || id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            void await comissoes.FindById(num_recibo);

            if (!comissoes.found) {
                const error = new Error('Recibo nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const updated_pagamentos = `UPDATE tb_pagamentos SET num_recibo = Null
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador AND num_recibo = :num_recibo`;

            void await db.connection.execute(updated_pagamentos,{entidade_negocio,id_cobrador,num_recibo});

            const updated_adiantamentos = `UPDATE tb_adiantamentos SET num_recibo = Null
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador AND num_recibo = :num_recibo`;

            void await db.connection.execute(updated_adiantamentos,{entidade_negocio,id_cobrador,num_recibo});

            await comissoes.Excluir();

            void await db.Commit();

            resdata.msg = 'Recibo excluido com sucesso.';

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerComissoes.ExcluirReciboCobrador', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ListarComissoesCobrador(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                comissoes: [],
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
            const id_cobrador = Number(req.params.id_cobrador || 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!id_cobrador || id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
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

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            let query = `SELECT cm.num_recibo, cm.dt_recibo, cm.tp_recibo, cm.vl_recibo, cm.vl_adiant, 
                        (cm.vl_recibo - cm.vl_adiant) as vl_comissao, cb.nom_cobrador
                        FROM tb_comissoes cm
                        LEFT JOIN tb_cobradores cb ON cb.entidade_negocio = cm.entidade_negocio AND cb.id = cm.id_cobrador
                        WHERE cm.entidade_negocio = :entidade_negocio AND cm.id_cobrador = :id_cobrador
                        AND cm.dt_recibo >= :dt_ini AND cm.dt_recibo <= :dt_fim
                        ORDER BY cm.dt_recibo DESC, cm.num_recibo DESC
                        LIMIT :limit OFFSET :offset`;

            resdata.data.comissoes = await comissoes.ExecuteQuery(query, {
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim,
                limit,
                offset
            });

            query = `SELECT COUNT(*) AS total FROM tb_comissoes 
                    WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador
                    AND dt_recibo >= :dt_ini AND dt_recibo <= :dt_fim`;

            const [countResult] = await comissoes.ExecuteQuery(query, {
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            });

            const total = Number(countResult?.total || 0);

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
                GravarLog('ControllerComissoes.ListarComissoesCobrador', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ListarComissoesNaoPagasCobrador(req,res) {

        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                vendas: []
            }
        }

        try {

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_cobrador = Number(req.params.id_cobrador || 0);
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

            if (!id_cobrador || id_cobrador <=0) {
                const error = new Error('ID Cobrador invalido')
                error.statusCode = 400;
                throw error;
            }

            const pagamentos = new Pagamentos(db.connection,entidade_negocio);

            const quey = `SELECT pg.id_venda,cl.nom_cliente,SUM(pg.vl_pagamento) as vl_pagamento,
            SUM(pg.vl_pagamento * (cb.comissao/100)) as vl_comissao 
            FROM tb_pagamentos pg
            LEFT JOIN tb_vendas vd ON vd.id = pg.id_venda AND vd.entidade_negocio = pg.entidade_negocio
            LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
            LEFT JOIN tb_cobradores cb ON cb.id = pg.id_cobrador AND cb.entidade_negocio = pg.entidade_negocio
            WHERE pg.entidade_negocio = :entidade_negocio AND pg.id_cobrador = :id_cobrador 
            AND (pg.dt_pagamento >= :dt_ini AND pg.dt_pagamento <= :dt_fim) AND pg.num_recibo IS NULL
            GROUP BY pg.id_venda,cl.nom_cliente`
            
            resdata.data.vendas = await pagamentos.ExecuteQuery(quey,{
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            });

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerComissoes.SalvarReciboCobrador', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    /*********************************************************
    * Recibos de Pagamentos Comissões Vendedor
    **********************************************************/
    static async SalvarReciboVendedor(req,res) {

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

            const num_recibo = String(body.num_recibo || '').trim();
            const id_vendedor = Number(body.id_vendedor || 0);
            const dt_recibo = String(body.dt_recibo || '').trim();
            const tp_recibo = String(body.tp_recibo || '').trim();
            const vl_recibo = parseFloat(body.vl_recibo || 0);
            const vl_adiant = parseFloat(body.vl_adiant || 0);

            if (!id_vendedor || id_vendedor <= 0) {
                const error = new Error('ID do Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!dt_recibo) {
                const error = new Error('Data do recibo nao informada.');
                error.statusCode = 400;
                throw error;
            }

            if (!tp_recibo) {
                const error = new Error('Tipo de recibo nao informado.');
                error.statusCode = 400;
                throw error;
            }

            if (vl_recibo <= 0) {
                const error = new Error('Valor do recibo deve ser maior que zero.');
                error.statusCode = 400;
                throw error;
            }

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            void await comissoes.FindById(num_recibo);

            comissoes.dt_recibo = dt_recibo;
            comissoes.tp_recibo = tp_recibo;
            comissoes.vl_recibo = vl_recibo;
            comissoes.vl_adiant = vl_adiant;
            comissoes.id_vendedor = id_vendedor;

            await comissoes.Save();

            const updated_vendas = `UPDATE tb_vendas SET num_recibo = :num_recibo 
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor AND num_recibo IS NULL`;

            void await db.connection.execute(updated_vendas,{entidade_negocio,id_vendedor,num_recibo: comissoes.num_recibo});

            const updated_adiantamentos = `UPDATE tb_adiantamentos SET num_recibo = :num_recibo 
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor AND num_recibo IS NULL`;

            void await db.connection.execute(updated_adiantamentos,{entidade_negocio,id_vendedor,num_recibo: comissoes.num_recibo});

            void await db.Commit();

            resdata.data = {
                num_recibo: comissoes.num_recibo,
                id_vendedor: comissoes.id_vendedor
            };

            resdata.msg = comissoes.found ? 'Comissao atualizada com sucesso.' : 'Comissao registrada com sucesso.';

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerComissoes.SalvarReciboCobrador', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ExcluirReciboVendedor(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const num_recibo = String(req.params.num_recibo || '').trim();
            const id_vendedor = Number(req.params.id_vendedor || 0);

            if (!num_recibo) {
                const error = new Error('Numero de recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!id_vendedor || id_vendedor <= 0) {
                const error = new Error('ID do Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            void await comissoes.FindById(num_recibo);

            if (!comissoes.found) {
                const error = new Error('Recibo nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const updated_vendas = `UPDATE tb_vendas SET num_recibo = Null
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor AND num_recibo = :num_recibo`;

            void await db.connection.execute(updated_vendas,{entidade_negocio,id_vendedor,num_recibo});

            const updated_adiantamentos = `UPDATE tb_adiantamentos SET num_recibo = Null
            WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor AND num_recibo = :num_recibo`;

            void await db.connection.execute(updated_adiantamentos,{entidade_negocio,id_vendedor,num_recibo});

            await comissoes.Excluir();

            void await db.Commit();

            resdata.msg = 'Recibo excluido com sucesso.';

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerComissoes.ExcluirReciboCobrador', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ListarComissoesVendedor(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                comissoes: [],
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
            const id_vendedor = Number(req.params.id_vendedor|| 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!id_vendedor || id_vendedor <= 0) {
                const error = new Error('ID do Vendedor invalido.');
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

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            let query = `SELECT cm.num_recibo, cm.dt_recibo, cm.tp_recibo, cm.vl_recibo, cm.vl_adiant, 
                        (cm.vl_recibo - cm.vl_adiant) as vl_comissao, vd.nom_vendedor
                        FROM tb_comissoes cm
                        LEFT JOIN tb_vendedores vd ON vd.entidade_negocio = cm.entidade_negocio AND vd.id = cm.id_vendedor
                        WHERE cm.entidade_negocio = :entidade_negocio AND cm.id_vendedor = :id_vendedor
                        AND cm.dt_recibo >= :dt_ini AND cm.dt_recibo <= :dt_fim
                        ORDER BY cm.dt_recibo DESC, cm.num_recibo DESC
                        LIMIT :limit OFFSET :offset`;

            resdata.data.comissoes = await comissoes.ExecuteQuery(query, {
                entidade_negocio,
                id_vendedor,
                dt_ini,
                dt_fim,
                limit,
                offset
            });

            query = `SELECT COUNT(*) AS total FROM tb_comissoes 
                    WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor
                    AND dt_recibo >= :dt_ini AND dt_recibo <= :dt_fim`;

            const [countResult] = await comissoes.ExecuteQuery(query, {
                entidade_negocio,
                id_vendedor,
                dt_ini,
                dt_fim
            });

            const total = Number(countResult?.total || 0);

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
                GravarLog('ControllerComissoes.ListarComissoesVendedor', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ListarComissoesNaoPagasVendedor(req,res) {

        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                vendas: []
            }
        }

        try {

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor || 0);
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

            if (!id_vendedor || id_vendedor <=0) {
                const error = new Error('ID Vendedor invalido')
                error.statusCode = 400;
                throw error;
            }

            const vendas = new Vendas(db.connection,entidade_negocio);

            const quey = `SELECT vd.id as id_venda,cl.nom_cliente, SUM(vd.val_tot_venda) as val_tot_venda,
            SUM(vd.val_tot_venda * (vr.comissao/100)) as vl_comissao 
            FROM tb_vendas vd
            LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
            LEFT JOIN tb_vendedores vr ON vr.id = vd.id_vendedor AND vr.entidade_negocio = vd.entidade_negocio
            WHERE vd.entidade_negocio = :entidade_negocio AND vd.id_vendedor = :id_vendedor 
            AND (vd.dt_venda >= :dt_ini AND dt_venda <= :dt_fim) AND vd.num_recibo IS NULL
            GROUP BY vd.id,cl.nom_cliente`
            
            resdata.data.vendas = await vendas.ExecuteQuery(quey,{
                entidade_negocio,
                id_vendedor,
                dt_ini,
                dt_fim
            });

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerComissoes.SalvarReciboCobrador', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

}
