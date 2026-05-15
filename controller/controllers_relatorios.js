import Database from '../connections/dbconn.js';
import Relatorios from '../model/dao_relatorios.js';
import {sendPdfResponse} from '../utils/PdfReport.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {
    criarRespostaPadrao,
    enviarErroJson,
    preencherErroResposta,
    registrarErroServidor
} from '../utils/ControllerResponse.js';
import {
    criarNomeArquivoRelatorioGerencial,
    montarDocumentoRelatorioGerencial,
    normalizeJsonValue,
    validarAnoMes
} from '../relatorios/relatorio_gerencial.js';

const RELATORIO_GERENCIAL_ERROR_MESSAGE = 'Erro ao processar relatorio gerencial.';

export class ControllerRelatorios{

    static async RelatorioGerencial(req,res) {

        const db = new Database('dbcred');
        const resdata = criarRespostaPadrao();

        try {

            const {anobase, mesbase} = validarAnoMes(req.params);

            await db.Connect();

            const relatorios = new Relatorios(db.connection);
            const rows = await relatorios.consultarGerencial(anobase, mesbase);
            resdata.data = normalizeJsonValue(rows);

        } catch (error) {
            const status = preencherErroResposta(resdata, error, RELATORIO_GERENCIAL_ERROR_MESSAGE);
            registrarErroServidor('ControllerRelatorios.RelatorioGerencial', error, status);
        }

        await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImpressaoGerencial(req,res) {

        const db = new Database('dbcred');

        try {
            const {anobase, mesbase} = validarAnoMes(req.params);

            await db.Connect();

            const relatorios = new Relatorios(db.connection);
            const rows = normalizeJsonValue(await relatorios.consultarGerencial(anobase, mesbase));
            const entidadeNegocio = obterEntidadeNegocio(req);
            const organizationName = Number(entidadeNegocio) > 0
                ? await relatorios.consultarNomeEntidade(entidadeNegocio) || String(entidadeNegocio)
                : 'CREDIARIO';
            const document = montarDocumentoRelatorioGerencial({
                rows,
                anobase,
                mesbase,
                organizationName
            });

            await sendPdfResponse(res, criarNomeArquivoRelatorioGerencial(anobase, mesbase), document);

        } catch (error) {
            const status = enviarErroJson(res, error, RELATORIO_GERENCIAL_ERROR_MESSAGE);
            registrarErroServidor('ControllerRelatorios.ImpressaoGerencial', error, status);
        }

        await db.Close();

    }

}
