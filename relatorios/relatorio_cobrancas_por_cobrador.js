import {buildTableDocument, formatCurrencyBR} from '../utils/PdfReport.js';

function criarErroHttp(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
}

function formatIntegerBR(value) {
    return toNumber(value).toLocaleString('pt-BR', {
        maximumFractionDigits: 0
    });
}

function montarBodyTabela(rows) {
    const totalQtdeCobrancas = rows.reduce((acc, item) => acc + toNumber(item?.qtde_cobrancas), 0);
    const totalValorEmDinheiro = rows.reduce((acc, item) => acc + toNumber(item?.valor_em_dinheiro), 0);
    const totalValorEmPix = rows.reduce((acc, item) => acc + toNumber(item?.valor_em_pix), 0);
    const totalValorPagamentos = rows.reduce((acc, item) => acc + toNumber(item?.valor_pagamentos), 0);
    const valorMedioGeral = totalQtdeCobrancas > 0 ? totalValorPagamentos / totalQtdeCobrancas : 0;

    return {
        totalQtdeCobrancas,
        totalValorEmDinheiro,
        totalValorEmPix,
        totalValorPagamentos,
        valorMedioGeral,
        body: [
            [
                { text: 'ID', bold: true, fontSize: 9, alignment: 'left' },
                { text: 'Cobrador', bold: true, fontSize: 9, alignment: 'left' },
                { text: 'Qtde Cobranças', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor em Dinheiro', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor em PIX', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor Pagamentos', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor Medio', bold: true, fontSize: 9, alignment: 'right' }
            ],
            ...rows.map((item) => ([
                { text: item?.id === null || item?.id === undefined ? '-' : String(item.id), alignment: 'left' },
                { text: String(item?.nom_cobrador || 'Sem cobrador'), alignment: 'left' },
                { text: formatIntegerBR(item?.qtde_cobrancas), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_em_dinheiro), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_em_pix), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_pagamentos), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_medio), alignment: 'right' }
            ])),
            [
                { text: 'TOTAL GERAL', colSpan: 2, bold: true, alignment: 'left' },
                {},
                { text: formatIntegerBR(totalQtdeCobrancas), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorEmDinheiro), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorEmPix), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorPagamentos), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(valorMedioGeral), bold: true, alignment: 'right' }
            ]
        ]
    };
}

export function montarDocumentoRelatorioCobrancasPorCobrador({
    rows = [],
    organizationName = 'CREDIARIO'
}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw criarErroHttp('Nao ha dados para impressao.', 404);
    }

    const {
        body,
        totalQtdeCobrancas,
        totalValorEmDinheiro,
        totalValorEmPix,
        totalValorPagamentos,
        valorMedioGeral
    } = montarBodyTabela(rows);

    return buildTableDocument({
        title: 'RELATORIO DE COBRANÇAS POR COBRADOR',
        organizationName,
        description: 'Resumo de cobranças por cobrador',
        subtitle: 'Cobranças agrupadas por cobrador',
        summaryCards: [
            { label: 'Cobradores', value: formatIntegerBR(rows.length), width: '25%' },
            { label: 'Qtde Cobranças', value: formatIntegerBR(totalQtdeCobrancas), width: '25%' },
            { label: 'Valor em Dinheiro', value: formatCurrencyBR(totalValorEmDinheiro), width: '25%' },
            { label: 'Valor em PIX', value: formatCurrencyBR(totalValorEmPix), width: '25%' },
            { label: 'Valor Total', value: formatCurrencyBR(totalValorPagamentos), width: '50%' },
            { label: 'Valor Medio', value: formatCurrencyBR(valorMedioGeral), width: '50%' }
        ],
        tableTitle: 'Resumo por cobrador',
        widths: ['7%', '27%', '12%', '14%', '14%', '14%', '12%'],
        body,
        orientation: 'landscape'
    });
}

export function criarNomeArquivoRelatorioCobrancasPorCobrador() {
    return 'relatorio-cobrancas-por-cobrador.pdf';
}
