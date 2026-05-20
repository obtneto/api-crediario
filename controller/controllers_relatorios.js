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
import {
    criarNomeArquivoRelatorioVendasPorVendedores,
    montarDocumentoRelatorioVendasPorVendedores
} from '../relatorios/relatorio_vendas_por_vendedores.js';

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

    static async RelatorioVendasPorVendedores(req,res) {

        const db = new Database('dbcred');

        const resdata = criarRespostaPadrao();

        try {

            await db.Connect();

            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection);
            const rows = await relatorios.VendasPorVendedores(anobase, mesbase);
            resdata.data = normalizeJsonValue(rows);

        } catch (error) {
            const status = preencherErroResposta(resdata, error, 'Erro ao processar relatorio de vendas por vendedores.');
            registrarErroServidor('ControllerRelatorios.RelatorioVendasPorVendedores', error, status);
        }

        await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImpressaoVendasPorVendedores(req,res) {

        const db = new Database('dbcred');

        try {

            await db.Connect();

            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection);
            const rows = normalizeJsonValue(await relatorios.VendasPorVendedores(anobase, mesbase));
            const entidadeNegocio = obterEntidadeNegocio(req);
            const organizationName = Number(entidadeNegocio) > 0
                ? await relatorios.consultarNomeEntidade(entidadeNegocio) || String(entidadeNegocio)
                : 'CREDIARIO';
            const document = montarDocumentoRelatorioVendasPorVendedores({
                rows,
                organizationName
            });

            await sendPdfResponse(res, criarNomeArquivoRelatorioVendasPorVendedores(), document);

        } catch (error) {
            const status = enviarErroJson(res, error, 'Erro ao processar impressao de vendas por vendedores.');
            registrarErroServidor('ControllerRelatorios.ImpressaoVendasPorVendedores', error, status);
        }

        await db.Close();

    }

}
