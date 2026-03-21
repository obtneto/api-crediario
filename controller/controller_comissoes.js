import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import Adiantamentos from '../model/dao_adiantamentos.js';
import Comissoes from '../model/dao_comissoes.js';
import {buildTableDocument, formatCurrencyBR, formatDateBR, sendPdfResponse} from '../utils/PdfReport.js';

export class ControllerComissoes {

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
            
            void await db.Connect();

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

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            let query = `SELECT id, dt_adiantamento, vl_adiantamento, num_recibo,
            case when num_recibo is not null then 'Não Pago' else 'Pagamento Feito' end as situacao
            FROM tb_adiantamentos 
            WHERE entidade_negocio = ? AND id_cobrador = ? 
            AND dt_adiantamento >= ? AND dt_adiantamento <= ?
            ORDER BY dt_adiantamento DESC, id DESC
            LIMIT ? OFFSET ?`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim,
                limit,
                offset
            ]);

            query = `SELECT COUNT(*) AS total FROM tb_adiantamentos 
            WHERE entidade_negocio = ? AND id_cobrador = ?
            AND dt_adiantamento >= ? AND dt_adiantamento <= ?`;

            const [countResult] = await adiantamentos.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            ]);

            const total = Number(countResult?.total || 0);

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

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ListarHistoricoAdiantamentos', error.stack);
            }   

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async ListarRecibosCobrador(req,res) {

        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
                data: {
                recibos: [],
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

            const comissoes = new Comissoes(db.connection,entidade_negocio);

            const query = `SELECT cm.dt_recibo,cm.num_recibo,cb.nom_cobrador, vl_adiant, vl_recibo, (vl_recibo - vl_adiant) as Vl_pago 
            FROM tb_comisoes cm
            LEFT JOIN tb_cobradores cb ON cb.entidade_negocio = cb.entidade_negocio AND cb.id = cm.id_colaborador
            WHERE cm.entidade_negocio = ? AND cm.id_colaborador = ?
            AND cm.dt_recibo >= ? AND cm.dt_recibo <= ?
            ORDER BY cm.dt_recibo DESC LIMIT ? OFFSET ?`

            resdata.recibos = await comissoes.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim,
                limit,
                offset
            ]);

            query = `SELECT COUNT(*) AS total FROM tb_comissoes 
            WHERE entidade_negocio = ? AND id_colaborador = ?
            AND dt_recibo >= ? AND dt_recibo <= ?`;

            const [countResult] = await comissoes.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            ]);

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
                GravarLog('ControllerCobranca.ListarHistoricoAdiantamentos', error.stack);
            }   

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async EditarReciboCobrador(req,res) {

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
            comissoes.id_colaborador = id_cobrador;

            await comissoes.Save();

            void await db.Commit();

            resdata.data = {
                num_recibo: comissoes.num_recibo,
                id_cobrador: comissoes.id_colaborador
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

            if (!num_recibo) {
                const error = new Error('Numero de recibo invalido.');
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

    static async ConsultarReciboCobrador(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: null
        }

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const num_recibo = String(req.params.num_recibo || '').trim();

            if (!num_recibo) {
                const error = new Error('Numero de recibo invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const comissoes = new Comissoes(db.connection, entidade_negocio);

            const data = await comissoes.FindById(num_recibo);

            if (!comissoes.found) {
                const error = new Error('Recibo nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = data;

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerComissoes.ConsultarReciboCobrador', error.stack);
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
                        LEFT JOIN tb_cobradores cb ON cb.entidade_negocio = cm.entidade_negocio AND cb.id = cm.id_colaborador
                        WHERE cm.entidade_negocio = ? AND cm.id_colaborador = ?
                        AND cm.dt_recibo >= ? AND cm.dt_recibo <= ?
                        ORDER BY cm.dt_recibo DESC, cm.num_recibo DESC
                        LIMIT ? OFFSET ?`;

            resdata.data.comissoes = await comissoes.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim,
                limit,
                offset
            ]);

            query = `SELECT COUNT(*) AS total FROM tb_comissoes 
                    WHERE entidade_negocio = ? AND id_colaborador = ?
                    AND dt_recibo >= ? AND dt_recibo <= ?`;

            const [countResult] = await comissoes.ExecuteQuery(query, [
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            ]);

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

}
