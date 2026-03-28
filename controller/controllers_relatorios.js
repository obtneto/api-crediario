import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {buildTableDocument, sendPdfResponse} from '../utils/PdfReport.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';

const QUERY_RELATORIO_GERENCIAL = `
    SELECT * FROM vw_vendas_cobrancas
    WHERE ano = :anobase AND mes = :mesbase
`;

function validarAnoMes(req) {
    const anobase = Number.parseInt(String(req.params.anobase ?? ''), 10);
    const mesbase = Number.parseInt(String(req.params.mesbase ?? ''), 10);

    if (!Number.isInteger(anobase) || anobase < 2000 || anobase > 2100) {
        const error = new Error('Ano base para pesquisa invalido. Informe entre 2000 e 2100.');
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(mesbase) || mesbase < 1 || mesbase > 12) {
        const error = new Error('Mes base para pesquisa invalido. Informe entre 1 e 12.');
        error.statusCode = 400;
        throw error;
    }

    return {anobase, mesbase};
}

async function consultarRelatorioGerencial(connection, anobase, mesbase) {
    return await connection.query(QUERY_RELATORIO_GERENCIAL, {anobase, mesbase});
}

function toCellText(value) {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
}

export class ControllerRelatorios{

    static async RelatorioGerencial(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            const {anobase, mesbase} = validarAnoMes(req);

            void await db.Connect();
            resdata.data = await consultarRelatorioGerencial(db.connection, anobase, mesbase);
            
         } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err === 500) GravarLog('ControllerRelatorios.RelatorioGerencial', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImpressaoGerencial(req,res) {

        const db = new Database('dbcred');

        try {
            const {anobase, mesbase} = validarAnoMes(req);

            void await db.Connect();

            const rows = await consultarRelatorioGerencial(db.connection, anobase, mesbase);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const entidade_negocio = obterEntidadeNegocio(req);
            let organizationName = String(entidade_negocio || 'CREDIARIO');

            if (entidade_negocio > 0) {
                const [entidade] = await db.connection.query(
                    'SELECT nom_entidade FROM tb_entidades WHERE id = :id',
                    {id: entidade_negocio}
                );

                if (entidade?.nom_entidade) {
                    organizationName = String(entidade.nom_entidade);
                }
            }

            const columns = Object.keys(rows[0] || {});
            const body = [
                columns.map((column) => ({
                    text: String(column || '').replaceAll('_', ' ').toUpperCase(),
                    bold: true,
                    fontSize: 9,
                    alignment: 'left'
                })),
                ...rows.map((row) => (
                    columns.map((column) => ({
                        text: toCellText(row?.[column]),
                        alignment: 'left'
                    }))
                ))
            ];

            const document = buildTableDocument({
                title: 'RELATORIO GERENCIAL',
                organizationName,
                subtitle: `Ano base: ${anobase} | Mes base: ${String(mesbase).padStart(2, '0')}`,
                widths: columns.map(() => '*'),
                body,
                orientation: columns.length > 6 ? 'landscape' : 'portrait'
            });

            await sendPdfResponse(res, `relatorio-gerencial-${anobase}-${String(mesbase).padStart(2, '0')}.pdf`, document);

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

            if (err === 500) GravarLog('ControllerRelatorios.ImpressaoGerencial', error.stack);
        }

        void await db.Close();

    }

}
