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
import {
    criarNomeArquivoRelatorioCobrancasPorCobrador,
    montarDocumentoRelatorioCobrancasPorCobrador
} from '../relatorios/relatorio_cobrancas_por_cobrador.js';
import {
    criarNomeArquivoConsultaDeVendas,
    montarDocumentoConsultaDeVendas
} from '../relatorios/relatorio_consulta_de_vendas.js';

const RELATORIO_GERENCIAL_ERROR_MESSAGE = 'Erro ao processar relatorio gerencial.';

export class ControllerRelatorios{

    static async RelatorioGerencial(req,res) {

        const db = new Database('dbcred');
        const resdata = criarRespostaPadrao();

        try {

            const entidade_negocio = obterEntidadeNegocio(req);
            const {anobase, mesbase} = validarAnoMes(req.params);

            await db.Connect();

            const relatorios = new Relatorios(db.connection, entidade_negocio);
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
            const entidade_negocio = obterEntidadeNegocio(req);
            const {anobase, mesbase} = validarAnoMes(req.params);

            await db.Connect();

            const relatorios = new Relatorios(db.connection, entidade_negocio);
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

            const entidade_negocio = obterEntidadeNegocio(req);
            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
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

            const entidade_negocio = obterEntidadeNegocio(req);
            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
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

    static async RelatorioCobrancasPorCobrador(req,res) {

        const db = new Database('dbcred');

        const resdata = criarRespostaPadrao();

        try {

            await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
            const rows = await relatorios.CobrancasPorCobrador(anobase, mesbase);
            resdata.data = normalizeJsonValue(rows);

        } catch (error) {
            const status = preencherErroResposta(resdata, error, 'Erro ao processar relatorio de cobranças por cobrador.');
            registrarErroServidor('ControllerRelatorios.RelatorioCobrancasPorCobrador', error, status);
        }

        await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ImpressaoCobrancasPorCobrador(req,res) {

        const db = new Database('dbcred');

        try {

            await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            if (anobase === 0 || mesbase === 0) {
                const error = new Error('Ano e mês são obrigatórios.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
            const rows = normalizeJsonValue(await relatorios.CobrancasPorCobrador(anobase, mesbase));
            const entidadeNegocio = obterEntidadeNegocio(req);
            const organizationName = Number(entidadeNegocio) > 0
                ? await relatorios.consultarNomeEntidade(entidadeNegocio) || String(entidadeNegocio)
                : 'CREDIARIO';
            const document = montarDocumentoRelatorioCobrancasPorCobrador({
                rows,
                organizationName
            });

            await sendPdfResponse(res, criarNomeArquivoRelatorioCobrancasPorCobrador(), document);

        } catch (error) {
            const status = enviarErroJson(res, error, 'Erro ao processar impressao de cobranças por cobrador.');
            registrarErroServidor('ControllerRelatorios.ImpressaoCobrancasPorCobrador', error, status);
        }

        await db.Close();

    }

    static async ConsultaDeVendas(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor || 0);

            if (id_vendedor <= 0) {
                const error = new Error('ID do vendedor é obrigatório.');
                error.statusCode = 400;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
            const rows = await relatorios.ConsultaDeVendas(id_vendedor);

            resdata.data = normalizeJsonValue(rows);

        } catch (error) {
            const status = preencherErroResposta(resdata, error, 'Erro ao processar consulta de vendas.');
            registrarErroServidor('ControllerRelatorios.ConsultaDeVendas', error, status);
        }

        await db.Close();

        res.status(resdata.status).json(resdata);
    }

    static async ImpressaoConsultaDeVendas(req, res) {

        const db = new Database('dbcred');

        try {

            await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const id_vendedor = Number(req.params.id_vendedor || 0);

            if (id_vendedor <= 0) {
                const error = new Error('ID do vendedor é obrigatório.');
                error.statusCode = 400;
                throw error;
            }

            const vendedor = await db.connection.query(`SELECT nom_vendedor FROM tb_vendedores 
                WHERE entidade_negocio = :entidade_negocio AND id = :id_vendedor`, {
                entidade_negocio,
                id_vendedor
            });

            if (!vendedor || vendedor.length === 0) {
                const error = new Error('Vendedor não encontrado.');
                error.statusCode = 404;
                throw error;
            }

            const relatorios = new Relatorios(db.connection, entidade_negocio);
            const rows = normalizeJsonValue(await relatorios.ConsultaDeVendas(id_vendedor));
            const organizationName = Number(entidade_negocio) > 0
                ? await relatorios.consultarNomeEntidade(entidade_negocio) || String(entidade_negocio)
                : 'CREDIARIO';
            const document = montarDocumentoConsultaDeVendas({
                rows,
                idVendedor: id_vendedor,
                vendedorNome: vendedor[0].nom_vendedor,
                organizationName
            });

            await sendPdfResponse(res, criarNomeArquivoConsultaDeVendas(id_vendedor), document);

        } catch (error) {
            const status = enviarErroJson(res, error, 'Erro ao processar impressao de consulta de vendas.');
            registrarErroServidor('ControllerRelatorios.ImpressaoConsultaDeVendas', error, status);
        }

        await db.Close();

    }
}
