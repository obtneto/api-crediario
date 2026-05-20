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
    const totalQtdeVendas = rows.reduce((acc, item) => acc + toNumber(item?.qtde_vendas), 0);
    const totalValorAVista = rows.reduce((acc, item) => acc + toNumber(item?.valor_a_vista), 0);
    const totalValorAPrazo = rows.reduce((acc, item) => acc + toNumber(item?.valor_a_prazo), 0);
    const totalValorVendas = rows.reduce((acc, item) => acc + toNumber(item?.valor_vendas), 0);
    const valorMedioGeral = totalQtdeVendas > 0 ? totalValorVendas / totalQtdeVendas : 0;

    return {
        totalQtdeVendas,
        totalValorAVista,
        totalValorAPrazo,
        totalValorVendas,
        valorMedioGeral,
        body: [
            [
                { text: 'ID', bold: true, fontSize: 9, alignment: 'left' },
                { text: 'Vendedor', bold: true, fontSize: 9, alignment: 'left' },
                { text: 'Qtde Vendas', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor a Vista', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor a Prazo', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor Vendas', bold: true, fontSize: 9, alignment: 'right' },
                { text: 'Valor Medio', bold: true, fontSize: 9, alignment: 'right' }
            ],
            ...rows.map((item) => ([
                { text: item?.id === null || item?.id === undefined ? '-' : String(item.id), alignment: 'left' },
                { text: String(item?.nom_vendedor || 'Sem vendedor'), alignment: 'left' },
                { text: formatIntegerBR(item?.qtde_vendas), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_a_vista), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_a_prazo), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_vendas), alignment: 'right' },
                { text: formatCurrencyBR(item?.valor_medio), alignment: 'right' }
            ])),
            [
                { text: 'TOTAL GERAL', colSpan: 2, bold: true, alignment: 'left' },
                {},
                { text: formatIntegerBR(totalQtdeVendas), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorAVista), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorAPrazo), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalValorVendas), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(valorMedioGeral), bold: true, alignment: 'right' }
            ]
        ]
    };
}

export function montarDocumentoRelatorioVendasPorVendedores({
    rows = [],
    organizationName = 'CREDIARIO'
}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw criarErroHttp('Nao ha dados para impressao.', 404);
    }

    const {
        body,
        totalQtdeVendas,
        totalValorAVista,
        totalValorAPrazo,
        totalValorVendas,
        valorMedioGeral
    } = montarBodyTabela(rows);

    return buildTableDocument({
        title: 'RELATORIO DE VENDAS POR VENDEDORES',
        organizationName,
        description: 'Resumo de vendas por vendedor',
        subtitle: 'Vendas agrupadas por vendedor',
        summaryCards: [
            { label: 'Vendedores', value: formatIntegerBR(rows.length), width: '25%' },
            { label: 'Qtde Vendas', value: formatIntegerBR(totalQtdeVendas), width: '25%' },
            { label: 'Valor a Vista', value: formatCurrencyBR(totalValorAVista), width: '25%' },
            { label: 'Valor a Prazo', value: formatCurrencyBR(totalValorAPrazo), width: '25%' },
            { label: 'Valor Total', value: formatCurrencyBR(totalValorVendas), width: '50%' },
            { label: 'Valor Medio', value: formatCurrencyBR(valorMedioGeral), width: '50%' }
        ],
        tableTitle: 'Resumo por vendedor',
        widths: ['7%', '27%', '12%', '14%', '14%', '14%', '12%'],
        body,
        orientation: 'landscape'
    });
}

export function criarNomeArquivoRelatorioVendasPorVendedores() {
    return 'relatorio-vendas-por-vendedores.pdf';
}
