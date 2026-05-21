import {buildTableDocument, formatCurrencyBR, formatDateBR} from '../utils/PdfReport.js';

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

function formatMaskIdVenda(value) {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 12);

    if (!digits) return '-';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 12)}`;
}

function formatCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length !== 11) {
        return String(value || '-');
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatSituacao(value) {
    const statusMap = {
        0: 'Em dias',
        3: 'Inadimplente',
        9: 'Encerrada'
    };
    const key = Number(value || 0);

    return statusMap[key] || String(value || '-');
}

function createHeaderCell(text, alignment = 'left') {
    return {
        text,
        bold: true,
        fontSize: 7,
        alignment
    };
}

function createBodyCell(text, alignment = 'left') {
    return {
        text: String(text || '-'),
        fontSize: 7,
        alignment
    };
}

function montarBodyTabela(rows) {
    const totalVendas = rows.reduce((acc, item) => acc + toNumber(item?.val_tot_venda), 0);
    const totalEntradas = rows.reduce((acc, item) => acc + toNumber(item?.val_entrada), 0);
    const totalDescontos = rows.reduce((acc, item) => acc + toNumber(item?.val_desconto), 0);
    const totalPagamentos = rows.reduce((acc, item) => acc + toNumber(item?.valor_pagamentos), 0);
    const totalSaldo = rows.reduce((acc, item) => acc + toNumber(item?.saldo_a_pagar), 0);

    return {
        totalVendas,
        totalEntradas,
        totalDescontos,
        totalPagamentos,
        totalSaldo,
        body: [
            [
                createHeaderCell('Venda'),
                createHeaderCell('Data'),
                createHeaderCell('CPF'),
                createHeaderCell('Cliente'),
                createHeaderCell('Total', 'right'),
                createHeaderCell('Entrada', 'right'),
                createHeaderCell('Desc.', 'right'),
                createHeaderCell('Pago', 'right'),
                createHeaderCell('Saldo', 'right'),
                createHeaderCell('Prox. Pag.'),
                createHeaderCell('Ult. Pag.'),
                createHeaderCell('Situacao')
            ],
            ...rows.map((item) => ([
                createBodyCell(formatMaskIdVenda(item?.id)),
                createBodyCell(formatDateBR(item?.dt_venda)),
                createBodyCell(formatCpf(item?.cpf_cliente)),
                createBodyCell(item?.nome_cliente || 'Sem cliente'),
                createBodyCell(formatCurrencyBR(item?.val_tot_venda), 'right'),
                createBodyCell(formatCurrencyBR(item?.val_entrada), 'right'),
                createBodyCell(formatCurrencyBR(item?.val_desconto), 'right'),
                createBodyCell(formatCurrencyBR(item?.valor_pagamentos), 'right'),
                createBodyCell(formatCurrencyBR(item?.saldo_a_pagar), 'right'),
                createBodyCell(formatDateBR(item?.prox_pagamnt)),
                createBodyCell(formatDateBR(item?.ult_pagamnt)),
                createBodyCell(formatSituacao(item?.situacao))
            ])),
            [
                { text: 'TOTAL GERAL', colSpan: 4, bold: true, alignment: 'left' },
                {},
                {},
                {},
                { text: formatCurrencyBR(totalVendas), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalEntradas), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalDescontos), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalPagamentos), bold: true, alignment: 'right' },
                { text: formatCurrencyBR(totalSaldo), bold: true, alignment: 'right' },
                {},
                {},
                {}
            ]
        ]
    };
}

export function montarDocumentoConsultaDeVendas({
    rows = [],
    idVendedor,
    organizationName = 'CREDIARIO'
}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw criarErroHttp('Nao ha dados para impressao.', 404);
    }

    const {
        body,
        totalVendas,
        totalEntradas,
        totalDescontos,
        totalPagamentos,
        totalSaldo
    } = montarBodyTabela(rows);

    return buildTableDocument({
        title: 'RELATORIO DE CONSULTA DE VENDAS',
        organizationName,
        description: 'Consulta de vendas por vendedor',
        subtitle: `Vendedor ID: ${idVendedor}`,
        summaryCards: [
            { label: 'Qtde Vendas', value: formatIntegerBR(rows.length) },
            { label: 'Valor Total', value: formatCurrencyBR(totalVendas) },
            { label: 'Entrada', value: formatCurrencyBR(totalEntradas) },
            { label: 'Desconto', value: formatCurrencyBR(totalDescontos) },
            { label: 'Pagamentos', value: formatCurrencyBR(totalPagamentos) },
            { label: 'Saldo', value: formatCurrencyBR(totalSaldo) }
        ],
        tableTitle: 'Vendas do vendedor',
        widths: ['8%', '7%', '9%', '15%', '8%', '8%', '8%', '8%', '8%', '7%', '7%', '7%'],
        body,
        orientation: 'landscape'
    });
}

export function criarNomeArquivoConsultaDeVendas(idVendedor) {
    return `relatorio-consulta-de-vendas-${idVendedor}.pdf`;
}
