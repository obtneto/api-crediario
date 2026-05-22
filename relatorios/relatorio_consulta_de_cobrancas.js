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

function formatPeriodo(anobase, mesbase) {
    const ano = String(anobase || '').trim();
    const mes = String(mesbase || '').trim().padStart(2, '0');

    if (!ano || !mes) {
        return '-';
    }

    return `${mes}/${ano}`;
}

function createHeaderCell(text, alignment = 'left') {
    return {
        text,
        bold: true,
        fontSize: 8,
        alignment
    };
}

function createBodyCell(text, alignment = 'left') {
    return {
        text: String(text || '-'),
        fontSize: 8,
        alignment
    };
}

function montarBodyTabela(rows) {
    const totalPagamentos = rows.reduce((acc, item) => acc + toNumber(item?.vl_pagamento), 0);

    return {
        totalPagamentos,
        body: [
            [
                createHeaderCell('Venda'),
                createHeaderCell('Data Pag.'),
                createHeaderCell('CPF'),
                createHeaderCell('Cliente'),
                createHeaderCell('Modalidade'),
                createHeaderCell('Valor', 'right')
            ],
            ...rows.map((item) => ([
                createBodyCell(formatMaskIdVenda(item?.id_venda)),
                createBodyCell(formatDateBR(item?.dt_pagamento)),
                createBodyCell(formatCpf(item?.cpf_cliente)),
                createBodyCell(item?.nome_cliente || 'Sem cliente'),
                createBodyCell(item?.nom_mod_pagamento || '-'),
                createBodyCell(formatCurrencyBR(item?.vl_pagamento), 'right')
            ])),
            [
                { text: 'TOTAL GERAL', colSpan: 5, bold: true, alignment: 'left' },
                {},
                {},
                {},
                {},
                { text: formatCurrencyBR(totalPagamentos), bold: true, alignment: 'right' }
            ]
        ]
    };
}

export function montarDocumentoConsultaDeCobrancas({
    rows = [],
    idCobrador,
    cobradorNome = '',
    anobase,
    mesbase,
    organizationName = 'CREDIARIO'
}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw criarErroHttp('Nao ha dados para impressao.', 404);
    }

    const {body, totalPagamentos} = montarBodyTabela(rows);
    const nomeCobrador = cobradorNome || 'Sem cobrador';

    return buildTableDocument({
        title: 'RELATORIO DE CONSULTA DE COBRANCAS',
        organizationName,
        description: 'Consulta de cobrancas por cobrador',
        subtitle: `Cobrador: ${nomeCobrador} | ID: ${idCobrador} | Periodo: ${formatPeriodo(anobase, mesbase)}`,
        summaryCards: [
            { label: 'Qtde Cobrancas', value: formatIntegerBR(rows.length) },
            { label: 'Valor Total', value: formatCurrencyBR(totalPagamentos) },
            { label: 'Cobrador', value: nomeCobrador },
            { label: 'Periodo', value: formatPeriodo(anobase, mesbase) }
        ],
        tableTitle: 'Cobrancas do cobrador',
        widths: ['11%', '11%', '14%', '30%', '20%', '14%'],
        body,
        orientation: 'landscape'
    });
}

export function criarNomeArquivoConsultaDeCobrancas(idCobrador, anobase, mesbase) {
    return `relatorio-consulta-de-cobrancas-${idCobrador}-${anobase}-${mesbase}.pdf`;
}
