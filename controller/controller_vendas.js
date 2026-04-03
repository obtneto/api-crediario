import Database from '../connections/dbconn.js';
import Distribuicao from '../model/dao_distribuicao.js';
import ItensDistribuicoes from '../model/dao_itens_distrib.js'
import Vendas from '../model/dao_vendas.js';
import Estoque from '../model/dao_estoque.js';
import Estoque_Mov from '../model/dao_estoque_mov.js';
import ItensVendas from '../model/dao_itens_vendas.js';
import Entidades from '../model/dao_entidades.js';
import Clientes from '../model/dao_clientes.js';
import Cobradores from '../model/dao_cobradores.js';
import Rotas from '../model/dao_rotas.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {
    createInfoCard,
    createReportFooter,
    createReportHeader,
    createSectionTitle,
    createStandardTable,
    formatCurrencyBR,
    formatDateBR,
    getReportStyles,
    sendPdfResponse
} from '../utils/PdfReport.js';
import isValidCpf from '../utils/DocumentValidator.js';

const formatMaskIdDistrib = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);

    if (!digits) return '-';
    if (digits.length <= 4) return digits;

    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

const formatMaskIdVenda = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 12);

    if (!digits) return '-';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 12)}`;
};

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
            const situacao = String(req.query.situacao ?? '*').trim();
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const offset = (page - 1) * limit;

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!['*', '0', '1'].includes(situacao)) {
                const error = new Error('Situação da distribuição inválida.');
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

            if (situacao !== '*') {
                whereClause.push('d.situacao = ?');
                params.push(Number(situacao));
            }

            let query = `SELECT d.id, d.dt_distrib, v.nom_vendedor,d.situacao
                         FROM tb_distribuicao d
                         LEFT JOIN tb_vendedores v ON v.id = d.id_vendedor AND v.entidade_negocio = d.entidade_negocio
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
            const situacao = String(req.query.situacao ?? '*').trim();
            const entidade_negocio = obterEntidadeNegocio(req);
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const offset = (page - 1) * limit;

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!['*', '0', '1'].includes(situacao)) {
                const error = new Error('Situação da distribuição inválida.');
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

            if (situacao !== '*') {
                whereClause.push('d.situacao = ?');
                params.push(Number(situacao));
            }

            whereClause.push('d.qt_distrib > 0');
            whereClause.push('p.nom_produto LIKE ?');
            params.push(`%${String(nom_produto || '').trim()}%`);

            let query = `SELECT d.id, d.dt_distrib, d.situacao, p.nom_produto, p.mar_produto, p.und_produto, d.qt_distrib
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

            const itens= new ItensDistribuicoes(db.connection,entidade_negocio)

            const query = `SELECT i.id_produto, p.nom_produto, p.mar_produto,p.und_produto, i.qt_distrib as saldo 
            FROM tb_itens_distrib i
            LEFT JOIN tb_produtos p ON p.entidade_negocio = i.entidade_negocio AND p.id = i.id_produto 
            WHERE i.entidade_negocio = ? AND i.id_vendedor = ? AND i.qt_distrib > 0 `;

            const rows = await itens.ExecuteQuery(query, [entidade_negocio, id_vendedor]);

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
            const entidades = new Entidades(db.connection);
            const whereClause = [
                'd.entidade_negocio = :entidade_negocio',
                'd.id_vendedor = :id_vendedor'
            ];
            const params = {
                entidade_negocio,
                id_vendedor
            };

            if (dt_ini) {
                whereClause.push('d.dt_distrib >= :dt_ini');
                params.dt_ini = dt_ini;
            }

            if (dt_fim) {
                whereClause.push('d.dt_distrib <= :dt_fim');
                params.dt_fim = dt_fim;
            }

            if (pesq && pesq !== '*') {
                whereClause.push('p.nom_produto LIKE :pesq');
                params.pesq = `%${pesq}%`;
            }

            const query = `SELECT d.id AS id_distrib, d.dt_distrib, d.id_vendedor,
                                  COALESCE(v.nom_vendedor, 'Sem vendedor') AS nom_vendedor,
                                  i.id_produto, COALESCE(i.qt_distrib, 0) AS qt_distrib,
                                  COALESCE(p.nom_produto, 'Produto nao encontrado') AS nom_produto,
                                  COALESCE(p.mar_produto, '-') AS mar_produto,
                                  COALESCE(p.und_produto, '-') AS und_produto
                           FROM tb_distribuicao d
                           INNER JOIN tb_itens_distrib i ON i.entidade_negocio = d.entidade_negocio
                                                       AND i.id_distrib = d.id
                                                       AND i.id_vendedor = d.id_vendedor
                           LEFT JOIN tb_vendedores v ON v.entidade_negocio = d.entidade_negocio
                                                    AND v.id = d.id_vendedor
                           LEFT JOIN tb_produtos p ON p.entidade_negocio = i.entidade_negocio
                                                  AND p.id = i.id_produto
                           WHERE ${whereClause.join(' AND ')} AND i.qt_distrib > 0
                           ORDER BY d.dt_distrib DESC, d.id DESC, p.nom_produto ASC, i.id_produto ASC`;

            const rows = await distrib.ExecuteQuery(query, params);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = :id`,
                { id: entidade_negocio }
            );

            const vendedorNome = String(rows[0]?.nom_vendedor || `ID ${id_vendedor}`);
            const periodoInicio = dt_ini || dt_fim || '';
            const periodoFim = dt_fim || dt_ini || '';
            const periodoTexto = periodoInicio && periodoFim
                ? `${formatDateBR(periodoInicio)} a ${formatDateBR(periodoFim)}`
                : 'Todos os periodos';
            const subtitle = `Vendedor: ${vendedorNome} | Periodo: ${periodoTexto}${pesq && pesq !== '*' ? ` | Produto: ${pesq}` : ''}`;

            const distribuicoesMap = new Map();

            for (const item of rows) {
                const chaveDistrib = String(item?.id_distrib || '');

                if (!distribuicoesMap.has(chaveDistrib)) {
                    distribuicoesMap.set(chaveDistrib, {
                        id_distrib: formatMaskIdDistrib(item?.id_distrib),
                        dt_distrib: String(item?.dt_distrib || ''),
                        id_vendedor: Number(item?.id_vendedor || 0),
                        nom_vendedor: String(item?.nom_vendedor || 'Sem vendedor'),
                        itens: []
                    });
                }

                distribuicoesMap.get(chaveDistrib).itens.push({
                    id_produto: Number(item?.id_produto || 0),
                    nom_produto: String(item?.nom_produto || '-'),
                    mar_produto: String(item?.mar_produto || '-'),
                    und_produto: String(item?.und_produto || '-'),
                    qt_distrib: Number(item?.qt_distrib || 0)
                });
            }

            const distribuicoes = Array.from(distribuicoesMap.values());
            const generatedAt = formatDateBR(new Date(), true);
            const content = [];

            distribuicoes.forEach((distribuicao, index) => {
                const totalDistrib = distribuicao.itens.reduce((acc, atual) => acc + Number(atual.qt_distrib || 0), 0);

                content.push({
                    text: `DISTRIBUICAO ${distribuicao.id_distrib}`,
                    style: 'sectionTitle',
                    margin: [0, index === 0 ? 0 : 14, 0, 6]
                });

                content.push({
                    text: `Data da distribuicao: ${formatDateBR(distribuicao.dt_distrib)}`,
                    style: 'fieldValue',
                    margin: [0, 0, 0, 4]
                });

                const itensBody = [
                    [
                        { text: 'ID Produto', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Produto', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Marca', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Und', bold: true, fontSize: 8, alignment: 'left' },
                        { text: 'Qtd. Distrib.', bold: true, fontSize: 8, alignment: 'right' }
                    ],
                    ...distribuicao.itens.map((item) => ([
                        { text: String(item.id_produto || 0), alignment: 'left' },
                        { text: item.nom_produto, alignment: 'left' },
                        { text: item.mar_produto, alignment: 'left' },
                        { text: item.und_produto, alignment: 'left' },
                        { text: String(Number(item.qt_distrib || 0)), alignment: 'right' }
                    ])),
                    [
                        { text: 'TOTAL DA DISTRIBUICAO', bold: true, colSpan: 4, alignment: 'left' },
                        {},
                        {},
                        {},
                        { text: String(totalDistrib), bold: true, alignment: 'right' }
                    ]
                ];

                content.push({
                    text: 'Itens da distribuicao',
                    style: 'itemsTitle',
                    margin: [0, 8, 0, 4]
                });

                content.push({
                    layout: {
                        hLineWidth: (i) => (i === 1 ? 0.7 : 0.3),
                        vLineWidth: () => 0,
                        hLineColor: () => '#cfd4dc',
                        paddingLeft: () => 2,
                        paddingRight: () => 2,
                        paddingTop: (i) => (i === 0 ? 4 : 2),
                        paddingBottom: () => 2
                    },
                    table: {
                        headerRows: 1,
                        widths: ['14%', '44%', '18%', '10%', '14%'],
                        body: itensBody
                    }
                });

                if (index < distribuicoes.length - 1) {
                    content.push({ text: '', pageBreak: 'after' });
                }
            });

            const document = {
                pageSize: 'A4',
                pageOrientation: 'portrait',
                pageMargins: [18, 84, 18, 36],
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 8
                },
                header: () => ({
                    margin: [18, 12, 18, 0],
                    stack: [
                        {
                            columns: [
                                { text: String(entidade?.nom_entidade || entidade_negocio), style: 'reportBrand' },
                                { text: generatedAt, style: 'reportMeta', alignment: 'right' }
                            ]
                        },
                        { text: 'RELATORIO DE DISTRIBUICAO', style: 'reportName' },
                        { text: subtitle, style: 'reportSubtitle' }
                    ]
                }),
                content,
                footer(currentPage, pageCount) {
                    return {
                        margin: [18, 0, 18, 12],
                        columns: [
                            { text: `Emitido em ${generatedAt}`, style: 'footerMeta' },
                            { text: `Pagina ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerMeta' }
                        ]
                    };
                },
                styles: {
                    reportBrand: {
                        fontSize: 8,
                        bold: true,
                        color: '#1f4f96'
                    },
                    reportMeta: {
                        fontSize: 7,
                        color: '#516174'
                    },
                    reportName: {
                        fontSize: 12,
                        bold: true,
                        color: '#10213d',
                        margin: [0, 6, 0, 2]
                    },
                    reportSubtitle: {
                        fontSize: 8,
                        color: '#4a5568'
                    },
                    sectionTitle: {
                        fontSize: 10,
                        bold: true,
                        color: '#10213d'
                    },
                    fieldLabel: {
                        fontSize: 8,
                        bold: true,
                        color: '#475569'
                    },
                    fieldValue: {
                        fontSize: 8,
                        color: '#0f172a'
                    },
                    itemsTitle: {
                        fontSize: 9,
                        bold: true,
                        color: '#1e293b'
                    },
                    footerMeta: {
                        fontSize: 7,
                        color: '#64748b'
                    }
                }
            };

            await sendPdfResponse(res, `relatorio-distribuicao-${id_vendedor}.pdf`, document);

        } catch (error) {

            const err = error.statusCode || 500;

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            if (err === 500) GravarLog('ControllerDistribuicao.Imprimir', error.stack);
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
                distrib : {},
                itens: []
            }
        }

        try {
            
            const id_distrib = String(req.params.id_distrib || '').trim();

            const entidade_negocio = obterEntidadeNegocio(req);

            if (id_distrib === '') {
                const error = new Error('ID da distribuição invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const  distrib  = new Distribuicao(db.connection, entidade_negocio);

            resdata.data.distrib = await distrib.FindById(id_distrib);

            if (!resdata.data.distrib) {
                const error = new Error('Distribuição não encontrada.');
                error.statusCode = 404;
                throw error;
            }

            const query_itens_distrib = `SELECT d.id_distrib, d.id_produto, d.id_vendedor, d.qt_distrib, p.nom_produto, p.mar_produto
                                         FROM tb_itens_distrib d
                                         LEFT JOIN tb_produtos p ON p.entidade_negocio = d.entidade_negocio AND p.id = d.id_produto
                                         WHERE d.entidade_negocio = :entidade_negocio AND d.id_distrib = :id_distrib AND d.qt_distrib > 0`;

            resdata.data.itens = await db.connection.query(query_itens_distrib,{entidade_negocio,id_distrib});


        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

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

            const id = String(req.body.id);
            const dt_distrib = new Date(req.body.dt_distrib);
            const id_vendedor = Number(req.body.id_vendedor);
            const itens_distrib = req.body.itens;

            const entidade_negocio = obterEntidadeNegocio(req);

            if (!dt_distrib || Number.isNaN(dt_distrib.getTime())) {
                const error = new Error('Data de distribuição inválida.');
                error.statusCode = 400;
                throw error;
            }

            if (id_vendedor <= 0) {
                const error = new Error('Vendedor inválido.');
                error.statusCode = 400;
                throw error;
            }

            if (!Array.isArray(itens_distrib) || itens_distrib.length === 0) {
                const error = new Error('Informe ao menos um item para distribuição.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);
            const distrib = new Distribuicao(db.connection,entidade_negocio);
            const itens = new ItensDistribuicoes(db.connection,entidade_negocio);
            const estoque_mov = new Estoque_Mov(db.connection,entidade_negocio);

            void await distrib.FindById(id);

            if (!distrib.found) {

                const query = `SELECT d.id FROM tb_distribuicao d 
                               WHERE d.situacao = 0 AND 
                               entidade_negocio = :entidade_negocio AND
                               id_vendedor = :id_vendedor
                               LIMIT 1`;

                const [rows] = await distrib.ExecuteQuery(query,{entidade_negocio,id_vendedor});

                if (rows) {
                    const error = new Error('Existe uma distribuiçao ativa para esse vendedor.');
                    error.statusCode = 403;
                    throw error;
                }
            }

            distrib.id = id;
            distrib.dt_distrib = dt_distrib;
            distrib.id_vendedor = id_vendedor;
            
            void await distrib.Save();

            const dt_mov = new Date().toLocaleString('sv-SE');

            for (const item_distrib of itens_distrib) {

                void await itens.FindById(distrib.id_vendedor,item_distrib.id_produto)

                const qt_distrib_corrente = itens.qt_distrib;

                itens.id_distrib = distrib.id;
                itens.id_produto = item_distrib.id_produto;
                itens.id_vendedor = distrib.id_vendedor;
                itens.qt_distrib = Number(itens.qt_distrib) + (Number(item_distrib.qt_distrib) - Number(qt_distrib_corrente));

                void await itens.Save();

                /*****************************************************************/
                void await estoque.FindById(item_distrib.id_produto);

                if (estoque.qt_disponivel < item_distrib.qt_distrib) {
                    throw Error('Quantidade a ser distribuida não pode ser maior que saldo do estoque.')
                }

                estoque.qt_disponivel = parseFloat(estoque.qt_disponivel) - parseFloat(item_distrib.qt_distrib);
                estoque.qt_reservada = parseFloat(estoque.qt_reservada) + parseFloat(item_distrib.qt_distrib);

                void await estoque.Save();

                /*****************************************************************/
                void await estoque_mov.FindById(0,dt_mov);

                estoque_mov.dt_mov = dt_mov;
                estoque_mov.descricao = `Inserir/Atualizar itens da Distribuicao ${distrib.id}`
                estoque_mov.id_produto = item_distrib.id_produto;
                estoque_mov.nr_documento = distrib.id
                estoque_mov.qt_mov = item_distrib.qt_distrib
                estoque_mov.tp_mov = "MOVIMENTAÇÃO";

                estoque_mov.Save();

            }

            void await db.Commit();

            resdata.msg = `Distribuida Nr ${distrib.id} ${distrib.found ? 'Atualizada com Sucesso.' : 'Inserida com Sucesso.'}`;

            resdata.data = {
                id_distrib: Number(distrib.id || 0)
            };

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

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

            void await db.Connect();

            void await db.Begin();

            const id_distrib = Number(req.params.id_distrib || 0);
            const entidade_negocio = obterEntidadeNegocio(req);

            if (id_distrib == 0) {
                const error = new Error('ID da Distribuição invalido.');
                error.statusCode = 400;
                throw error;
            }

            const distrib = new Distribuicao(db.connection,entidade_negocio);
            const itens_distrib = new ItensDistribuicoes(db.connection,entidade_negocio);
            const estoque = new Estoque(db.connection,entidade_negocio);
            const estoque_mov = new Estoque_Mov(db.connection,entidade_negocio);

            const itens = await distrib.ListarItens(id_distrib);

            let dt_mov = new Date().toLocaleString('sv-SE');
            
            for (const item of itens) {

                /*****************************************************************/
                void await estoque_mov.FindById(0,dt_mov);

                estoque_mov.dt_mov = dt_mov;
                estoque_mov.descricao = `Exclusao Distribuicao ${id_distrib}`
                estoque_mov.id_produto = item.id_produto;
                estoque_mov.nr_documento = id_distrib;
                estoque_mov.qt_mov = item.qt_distrib;
                estoque_mov.tp_mov = "MOVIMENTAÇÃO"

                estoque_mov.Save();

                /*****************************************************************/
                void await estoque.FindById(item.id_produto);

                estoque.qt_reservada = Number(estoque.qt_reservada) - Number(item.qt_distrib);
                estoque.qt_disponivel = Number(estoque.qt_disponivel) + Number(item.qt_distrib);

                void await estoque.Save();

                /*****************************************************************/
                void await itens_distrib.FindById(item.id_vendedor,item.id_produto);

                void await itens_distrib.Excluir();

            }

            void await distrib.FindById(id_distrib)


            if (!distrib.found) {
                const error = new Error('Distribuição não encontrada.');
                error.statusCode = 400;
                throw error;
            }

            void await distrib.Excluir();

            void await db.Commit();

            resdata.msg = `Distribuição Nr ${id_distrib} excluida com sucesso.`
            
        } catch (error) {
             
            void await db.RollBack();

            resdata.err = error.statusCode || 500;
            resdata.msg = error.message;
            resdata.status = error.statusCode || 500;

            if(resdata.err == 500) GravarLog('ControllerDistribuicao.Excluir', error.stack);
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
            const situacaoRaw = String(req.query.situacao || '').trim();
            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
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

            const whereClause = ['id_vendedor = ?', 'entidade_negocio = ?'];
            const params = [id_vendedor, entidade_negocio];

            if (situacaoRaw !== '') {
                const situacao = Number(situacaoRaw);

                if (![0, 3, 9].includes(situacao)) {
                    const error = new Error('Situação inválida para o filtro.');
                    error.statusCode = 400;
                    throw error;
                }

                whereClause.push('situacao = ?');
                params.push(situacao);
            }

            if (dt_ini) {
                whereClause.push('dt_venda >= ?');
                params.push(dt_ini);
            }

            if (dt_fim) {
                whereClause.push('dt_venda <= ?');
                params.push(dt_fim);
            }

            let query = `SELECT * FROM vw_vendas
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY situacao, dt_venda DESC, id DESC
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

            if (resdata.err === 500) GravarLog('ControllerVendas.Listar', error.stack);
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

    static async Imprimir(req,res) {

        const db = new Database('dbcred');

        try {
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_venda = String(req.params.id || '').trim();

            if (!id_venda || !/^\d+$/.test(id_venda)) {
                const error = new Error('ID da venda invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const vendas = new Vendas(db.connection, entidade_negocio);
            const itensVendas = new ItensVendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            const queryVenda = `SELECT v.id, v.dt_venda, v.cpf_cliente, COALESCE(c.nom_cliente, '') AS nom_cliente,
                                       COALESCE(c.nom_usual, '') AS nom_usual, COALESCE(v.val_tot_venda, 0) AS val_tot_venda,
                                       COALESCE(v.val_desconto, 0) AS val_desconto,
                                       COALESCE((
                                           SELECT SUM(COALESCE(pg.vl_pagamento, 0))
                                           FROM tb_pagamentos pg
                                           WHERE pg.entidade_negocio = v.entidade_negocio
                                             AND pg.id_venda = v.id
                                       ), 0) AS val_pagamentos,
                                       GREATEST(
                                           (COALESCE(v.val_tot_venda, 0) - COALESCE(v.val_desconto, 0))
                                           - COALESCE((
                                               SELECT SUM(COALESCE(pg.vl_pagamento, 0))
                                               FROM tb_pagamentos pg
                                               WHERE pg.entidade_negocio = v.entidade_negocio
                                                 AND pg.id_venda = v.id
                                           ), 0),
                                           0
                                       ) AS saldo_a_pagar
                                FROM tb_vendas v
                                LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                                WHERE v.entidade_negocio = :entidade_negocio
                                  AND v.id = :id_venda
                                LIMIT 1`;

            const rowsVenda = await vendas.ExecuteQuery(queryVenda, { entidade_negocio, id_venda });
            const venda = Array.isArray(rowsVenda) && rowsVenda[0] ? rowsVenda[0] : null;

            if (!venda) {
                const error = new Error('Venda nao encontrada para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const queryItens = `SELECT i.id, i.id_produto, COALESCE(p.nom_produto, 'Produto nao encontrado') AS nom_produto,
                                       COALESCE(p.mar_produto, '-') AS mar_produto, COALESCE(i.qt_produto, 0) AS qt_produto,
                                       COALESCE(i.vl_unit, 0) AS vl_unit,
                                       (COALESCE(i.qt_produto, 0) * COALESCE(i.vl_unit, 0)) AS vl_total_item,
                                       COALESCE(i.forma_pagamnto, '-') AS forma_pagamnto
                                FROM tb_itens_vendas i
                                LEFT JOIN tb_produtos p ON p.entidade_negocio = i.entidade_negocio
                                                       AND p.id = i.id_produto
                                WHERE i.entidade_negocio = :entidade_negocio
                                  AND i.id_venda = :id_venda
                                ORDER BY i.id ASC, i.id_produto ASC`;

            const itens = await itensVendas.ExecuteQuery(queryItens, { entidade_negocio, id_venda });

            const queryPagamentos = `SELECT pg.id, pg.dt_pagamento, COALESCE(pg.vl_pagamento, 0) AS vl_pagamento,
                                            COALESCE(pg.vl_desconto, 0) AS vl_desconto,
                                            COALESCE(pg.num_recibo, '-') AS num_recibo,
                                            COALESCE(cb.nom_cobrador, '-') AS nom_cobrador
                                     FROM tb_pagamentos pg
                                     LEFT JOIN tb_cobradores cb ON cb.entidade_negocio = pg.entidade_negocio
                                                               AND cb.id = pg.id_cobrador
                                     WHERE pg.entidade_negocio = :entidade_negocio
                                       AND pg.id_venda = :id_venda
                                     ORDER BY pg.dt_pagamento ASC, pg.id ASC`;

            const pagamentos = await vendas.ExecuteQuery(queryPagamentos, { entidade_negocio, id_venda });

            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = :id`,
                { id: entidade_negocio }
            );

            const idVendaMascara = formatMaskIdVenda(id_venda);
            const nomeCliente = String(venda?.nom_usual || venda?.nom_cliente || '-');
            const generatedAt = formatDateBR(new Date(), true);
            const totalItens = Array.isArray(itens)
                ? itens.reduce((acc, item) => acc + Number(item?.vl_total_item || 0), 0)
                : 0;
            const totalPagamentos = Array.isArray(pagamentos)
                ? pagamentos.reduce((acc, item) => acc + Number(item?.vl_pagamento || 0), 0)
                : 0;
            const itensBody = [
                [
                    { text: 'Item', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Produto', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Nome Produto', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Qtde', bold: true, fontSize: 8, alignment: 'right' },
                    { text: 'Vlr Unit.', bold: true, fontSize: 8, alignment: 'right' },
                    { text: 'Total Item', bold: true, fontSize: 8, alignment: 'right' }
                ]
            ];

            if (Array.isArray(itens) && itens.length > 0) {
                itensBody.push(
                    ...itens.map((item) => ([
                        { text: String(item?.id || 0), alignment: 'left' },
                        { text: String(item?.id_produto || 0), alignment: 'left' },
                        { text: String(item?.nom_produto || '-'), alignment: 'left' },
                        { text: String(Number(item?.qt_produto || 0)), alignment: 'right' },
                        { text: formatCurrencyBR(item?.vl_unit), alignment: 'right' },
                        { text: formatCurrencyBR(item?.vl_total_item), alignment: 'right' }
                    ]))
                );
            } else {
                itensBody.push([
                    { text: 'Sem itens cadastrados para esta venda.', colSpan: 6, alignment: 'left' },
                    {},
                    {},
                    {},
                    {},
                    {}
                ]);
            }

            itensBody.push([
                { text: 'TOTAL ITENS', bold: true, colSpan: 4, alignment: 'left' },
                {},
                {},
                {},
                {},
                { text: formatCurrencyBR(totalItens), bold: true, alignment: 'right' }
            ]);

            const pagamentosBody = [
                [
                    { text: 'ID Pag.', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Dt. Pag.', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Cobrador', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Recibo', bold: true, fontSize: 8, alignment: 'left' },
                    { text: 'Valor Pago', bold: true, fontSize: 8, alignment: 'right' }
                ]
            ];

            if (Array.isArray(pagamentos) && pagamentos.length > 0) {
                pagamentosBody.push(
                    ...pagamentos.map((item) => ([
                        { text: String(item?.id || 0), alignment: 'left' },
                        { text: formatDateBR(item?.dt_pagamento), alignment: 'left' },
                        { text: String(item?.nom_cobrador || '-'), alignment: 'left' },
                        { text: String(item?.num_recibo || '-'), alignment: 'left' },
                        { text: formatCurrencyBR(item?.vl_pagamento), alignment: 'right' }
                    ]))
                );
            } else {
                pagamentosBody.push([
                    { text: 'Sem pagamentos registrados para esta venda.', colSpan: 5, alignment: 'left' },
                    {},
                    {},
                    {},
                    {}
                ]);
            }

            pagamentosBody.push([
                { text: 'TOTAL PAGAMENTOS', bold: true, colSpan: 4, alignment: 'left' },
                {},
                {},
                {},
                { text: formatCurrencyBR(totalPagamentos), bold: true, alignment: 'right' }
            ]);

            const document = {
                pageSize: 'A4',
                pageOrientation: 'portrait',
                pageMargins: [18, 84, 18, 36],
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 8
                },
                header: () => createReportHeader({
                    title: 'RELATORIO DE VENDA',
                    organizationName: String(entidade?.nom_entidade || entidade_negocio),
                    description: 'Resumo detalhado da venda',
                    subtitle: `Venda: ${idVendaMascara} | Cliente: ${nomeCliente}`,
                    generatedAt
                }),
                content: [
                    {
                        columns: [
                            {
                                width: '28%',
                                ...createInfoCard('Nr Venda', idVendaMascara)
                            },
                            {
                                width: '24%',
                                ...createInfoCard('Data Venda', formatDateBR(venda?.dt_venda))
                            },
                            {
                                width: '48%',
                                ...createInfoCard('Cliente', nomeCliente)
                            }
                        ],
                        columnGap: 8,
                        margin: [0, 0, 0, 6]
                    },
                    {
                        columns: [
                            {
                                width: '25%',
                                ...createInfoCard('Valor Total', formatCurrencyBR(venda?.val_tot_venda))
                            },
                            {
                                width: '25%',
                                ...createInfoCard('Desconto', formatCurrencyBR(venda?.val_desconto))
                            },
                            {
                                width: '25%',
                                ...createInfoCard('Pagamentos', formatCurrencyBR(venda?.val_pagamentos))
                            },
                            {
                                width: '25%',
                                ...createInfoCard('Saldo a Pagar', formatCurrencyBR(venda?.saldo_a_pagar))
                            }
                        ],
                        columnGap: 8,
                        margin: [0, 0, 0, 8]
                    },
                    createSectionTitle('Itens da venda'),
                    createStandardTable({
                        widths: ['8%', '14%', '36%', '10%', '16%', '16%'],
                        body: itensBody
                    }),
                    createSectionTitle('Pagamentos da venda', [0, 10, 0, 4]),
                    createStandardTable({
                        widths: ['10%', '16%', '40%', '14%', '20%'],
                        body: pagamentosBody
                    })
                ],
                footer: createReportFooter(generatedAt),
                styles: getReportStyles()
            };

            await sendPdfResponse(res, `relatorio-venda-${id_venda}.pdf`, document);
        } catch (error) {

            const err = Number(error.statusCode || 500);

            if (!res.headersSent) {
                res.status(err).json({
                    err,
                    msg: error.message,
                    status: err,
                    data: []
                });
            }

            if (err === 500) GravarLog('ControllerVendas.Imprimir', error.stack);
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

            const query = `SELECT vd.*,
                                  (
                                      (COALESCE(vd.val_tot_venda, 0) - COALESCE(vd.val_desconto, 0))
                                      - COALESCE((
                                          SELECT SUM(COALESCE(pg.vl_pagamento, 0))
                                          FROM tb_pagamentos pg
                                          WHERE pg.entidade_negocio = vd.entidade_negocio
                                            AND pg.id_venda = vd.id
                                      ), 0)
                                  ) AS saldo_a_pagar
                           FROM tb_vendas vd
                           WHERE vd.entidade_negocio = :entidade_negocio
                             AND vd.id = :id_venda
                           LIMIT 1`;

            const rows = await vendas.ExecuteQuery(query, { entidade_negocio, id_venda: id });

            resdata.data.vendas = Array.isArray(rows) && rows[0] ? rows[0] : {};
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
            const id_vendedor = Number(body.id_vendedor || 0);
            const id_tipo_pag = Number(body.id_tipo_pag || 0);
            const cpf_cliente = String(body.cpf_cliente).replace(/\D/g, '');
            const referencia = String(body.referencia).trim();
            const val_tot_venda = parseFloat(body.val_tot_venda || 0);
            const dia_pagam = String(body.dia_pagam).trim();
            const val_desconto = parseFloat(body.val_desconto || 0);
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

            if (!cpf_cliente) {
                const error = new Error('CPF do cliente e obrigatorio.');
                error.statusCode = 400;
                throw error;
            }

            if (!isValidCpf(cpf_cliente)) {
                const error = new Error('CPF do cliente invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!Number.isFinite(id_tipo_pag) || id_tipo_pag <= 0) {
                const error = new Error('Tipo de pagamento e obrigatorio.');
                error.statusCode = 400;
                throw error;
            }

            if (!Array.isArray(itens) || itens.length === 0) {
                const error = new Error('Informe ao menos um item da venda.');
                error.statusCode = 400;
                throw error;
            }

            if (!Number.isFinite(val_desconto) || val_desconto < 0) {
                const error = new Error('Desconto invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const estoque_mov = new Estoque_Mov(db.connection, entidade_negocio);
            const estoque = new Estoque(db.connection,entidade_negocio);
            const itensVendas = new ItensVendas(db.connection, entidade_negocio);
            const itensDistrib = new ItensDistribuicoes(db.connection,entidade_negocio);
            const vendas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);
            const clientes = new Clientes(db.connection);

            void await clientes.FindByCpf(cpf_cliente);

            if (!clientes.found) {
                const error = new Error('Cliente nao encontrado para o CPF informado. Pesquise ou cadastre o cliente antes de salvar a venda.');
                error.statusCode = 400;
                throw error;
            }

            if (!String(clientes.nom_cliente || '').trim()) {
                const error = new Error('Cliente sem nome cadastrado para o CPF informado.');
                error.statusCode = 400;
                throw error;
            }

            /**************************************************************************
             * Salva a venda para obter o ID, caso seja uma nova venda (id vazio ou 0). 
             * Se for uma edição, o ID já existe e a função Save irá atualizar o registro.
             ****************/
            void entidades.FindById(entidade_negocio);

            const valor_desconto = Number(( parseFloat(entidades.percent_desconto_venda) * parseFloat(val_desconto)).toFixed(4)) / 100;;

            if (parseFloat(valor_desconto) > val_desconto ) {
                const error = new Error('Desconto maior que permitido.');
                error.statusCode = 403;
                throw error;
            }

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
            vendas.val_desconto = val_desconto;

            void await vendas.Save();

            /***************************************************************************
             * Salva os itens da venda e atualiza o estoque reservado.
             *****************/
            let itens_salvos = 0;
            let qt_produto_antes = 0;
            let qt_produto_atual = 0;

            const parseItemDecimal = (value) => {
                const raw = String(value ?? '').trim();
                if (!raw) return Number.NaN;

                const normalized = raw.includes(',')
                    ? raw.replace(/\./g, '').replace(',', '.')
                    : raw;

                const parsed = Number(normalized);
                return Number.isFinite(parsed) ? parsed : Number.NaN;
            };

            for (const item of itens) {

                qt_produto_antes = 0;

                const id_item = Number(item.id || 0);
                const id_produto_item = Number(item.id_produto);
                const qt_produto_item = Number(item.qt_produto);
                const vl_unit_item = parseItemDecimal(item.vl_unit ?? item.vlr_unitario);
                const forma_pagamnto_item = String(item.forma_pagamnto ?? item.forma_pagamento ?? '').trim().toLowerCase();

                if (!Number.isFinite(id_produto_item) || id_produto_item <= 0) {
                    const error = new Error('Item com produto invalido.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isFinite(qt_produto_item) || qt_produto_item <= 0) {
                    const error = new Error('Item com quantidade invalida.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isFinite(vl_unit_item) || vl_unit_item < 0) {
                    const error = new Error('Item com valor unitario invalido.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!forma_pagamnto_item) {
                    const error = new Error('Item com forma de pagamento invalida.');
                    error.statusCode = 400;
                    throw error;
                }

                /***************************************************************************/
                void await itensVendas.FindById(id_item,vendas.id)

                if (itensVendas.found) qt_produto_antes = itensVendas.qt_produto;

                itensVendas.id_produto = id_produto_item;
                itensVendas.qt_produto = qt_produto_item;
                itensVendas.vl_unit = vl_unit_item;
                itensVendas.forma_pagamnto = forma_pagamnto_item;
                itensVendas.id_venda = vendas.id;

                void await itensVendas.Save();

                /***************************************************************************/
                void await estoque.FindById(id_produto_item);

                if (!estoque.found) {
                    const error = new Error('Produto não encontrado no estoque.');
                    error.statusCode = 404;
                    throw error
                }
                
                if (!itensVendas.found) {

                    if (estoque.qt_reservada < qt_produto_item) {
                        const error = new Error('Não exite estoque suficiente para esse produto.');
                        error.statusCode = 403;
                        throw error;
                    }

                    qt_produto_atual = qt_produto_item;

                }
                else {

                    if(estoque.qt_reservada < ((qt_produto_antes - itensVendas.qt_produto) * -1)) {
                        const error = new Error('Não exite estoque suficiente para esse produto.');
                        error.statusCode = 403;
                        throw error;
                    }

                    qt_produto_atual = ((qt_produto_antes - itensVendas.qt_produto) * -1);

                }

                if (!itensVendas.found) {
                    estoque.qt_reservada = Number(estoque.qt_reservada) - Number(qt_produto_item);
                } else {
                    estoque.qt_reservada = Number(estoque.qt_reservada) + (qt_produto_antes - itensVendas.qt_produto)
                }

                /***************************************************************************/
                void await itensDistrib.FindById(id_vendedor,id_produto_item);

                if (Number(itensDistrib.qt_distrib) < Number(itensVendas.qt_produto)) {
                    const error = new Error('Não existe saldo suficiente dispensado para esse produto.');
                    error.statusCode = 403;
                    throw error;
                }

                itensDistrib.qt_distrib = Number(itensDistrib.qt_distrib) - Number(itensVendas.qt_produto)

                void await itensDistrib.Save();

                /******************************************************
                * Registra a movimentação de estoque referente a venda.
                ********************/
                void await estoque_mov.FindById(0, new Date());

                estoque_mov.dt_mov = new Date();
                estoque_mov.id_produto = id_produto_item;
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

            if(resdata.err == 500) GravarLog('ControllerVendas.Salvar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ExcluirItemVenda(req,res) {

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
            void await itensVendas.FindById(id_venda,id_item)

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

    static async ConsultaVendasPorCliente(req,res) {

        const db = new Database('dbcred');
        
        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            void await db.Connect();

            const cpf = String(req.params.cpf || '').replace(/\D/g, '');
            const entidade_negocio = obterEntidadeNegocio(req);

            if (!cpf) {
                const error = new Error('CPF do Cliente não encontrado!');
                error.statusCode = 404;
                throw error; 
            }

            const vendas = new Vendas(db.connection,entidade_negocio);

            const query = `SELECT vd.id, vd.dt_venda, vd.cpf_cliente, cl.nom_cliente, vd.situacao, vd.val_tot_venda, vd.val_desconto,
            GREATEST(COALESCE(SUM(pg.vl_pagamento), 0),0) as tot_pagamentos,
            GREATEST((COALESCE(vd.val_tot_venda, 0) - COALESCE(vd.val_desconto, 0)) - COALESCE(SUM(pg.vl_pagamento), 0), 0) AS saldo_a_pagar
            FROM tb_vendas vd
            LEFT JOIN tb_clientes cl ON cl.cpf_cliente = vd.cpf_cliente
            LEFT JOIN tb_pagamentos pg ON pg.id_venda = vd.id AND pg.entidade_negocio = vd.entidade_negocio
            WHERE vd.entidade_negocio = :entidade_negocio AND vd.cpf_cliente = :cpf
            GROUP BY vd.id, vd.dt_venda, vd.cpf_cliente, cl.nom_cliente, vd.situacao, vd.val_tot_venda, vd.val_desconto
            ORDER BY vd.dt_venda DESC, vd.id DESC`;

            resdata.data = await vendas.ExecuteQuery(query,{entidade_negocio,cpf});

        } 
        catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);  
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog('ControllerVendas.ConsultaVendasPorCliente', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

}
