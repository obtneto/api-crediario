import {buildTableDocument} from '../utils/PdfReport.js';

function criarErroHttp(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function parseIntegerParam(value) {
    const text = String(value ?? '').trim();

    if (!/^\d+$/.test(text)) {
        return Number.NaN;
    }

    return Number.parseInt(text, 10);
}

export function validarAnoMes(params = {}) {
    const anobase = parseIntegerParam(params.anobase);
    const mesbase = parseIntegerParam(params.mesbase);

    if (!Number.isInteger(anobase) || anobase < 2000 || anobase > 2100) {
        throw criarErroHttp('Ano base para pesquisa invalido. Informe entre 2000 e 2100.', 400);
    }

    if (!Number.isInteger(mesbase) || mesbase < 1 || mesbase > 12) {
        throw criarErroHttp('Mes base para pesquisa invalido. Informe entre 1 e 12.', 400);
    }

    return {anobase, mesbase};
}

export function normalizeJsonValue(value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeJsonValue(item));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((normalized, [key, currentValue]) => {
            normalized[key] = normalizeJsonValue(currentValue);
            return normalized;
        }, {});
    }

    return value;
}

function toCellText(value) {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
}

function montarBodyTabela(rows, columns) {
    return [
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
}

export function montarDocumentoRelatorioGerencial({
    rows = [],
    anobase,
    mesbase,
    organizationName = 'CREDIARIO'
}) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw criarErroHttp('Nao ha dados para impressao.', 404);
    }

    const columns = Object.keys(rows[0] || {});

    return buildTableDocument({
        title: 'RELATORIO GERENCIAL',
        organizationName,
        subtitle: `Ano base: ${anobase} | Mes base: ${String(mesbase).padStart(2, '0')}`,
        widths: columns.map(() => '*'),
        body: montarBodyTabela(rows, columns),
        orientation: columns.length > 6 ? 'landscape' : 'portrait'
    });
}

export function criarNomeArquivoRelatorioGerencial(anobase, mesbase) {
    return `relatorio-gerencial-${anobase}-${String(mesbase).padStart(2, '0')}.pdf`;
}
