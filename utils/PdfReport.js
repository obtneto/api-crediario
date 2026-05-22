import path from 'path';
import { fileURLToPath } from 'url';
import pdfMake from 'pdfmake';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontsBaseDir = path.resolve(__dirname, '../assets/fonts/Roboto');

pdfMake.addFonts({
    Roboto: {
        normal: path.join(fontsBaseDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsBaseDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsBaseDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsBaseDir, 'Roboto-MediumItalic.ttf')
    }
});

if (typeof pdfMake.setUrlAccessPolicy === 'function') {
    pdfMake.setUrlAccessPolicy(() => false);
}

export function formatCurrencyBR(value) {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
        return 'R$ 0,00';
    }

    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

export function formatDateBR(value, includeTime = false) {
    const text = String(value || '').trim();

    if (!text) {
        return '-';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split('-');
        return `${day}/${month}/${year}`;
    }

    const normalizedText = text.includes('T') ? text : text.replace(' ', 'T');
    const date = new Date(normalizedText);

    if (Number.isNaN(date.getTime())) {
        return text;
    }

    return includeTime
        ? date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Maceio'
        })
        : date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Maceio'
        });
}

function chunkItems(items = [], size = 4) {
    const normalizedSize = Math.max(1, Number(size || 1));
    const chunks = [];

    for (let index = 0; index < items.length; index += normalizedSize) {
        chunks.push(items.slice(index, index + normalizedSize));
    }

    return chunks;
}

export function createInfoCard(label, value, { fillColor = '#f8fbff' } = {}) {
    return {
        table: {
            widths: ['*'],
            body: [[{
                stack: [
                    { text: String(label || ''), style: 'cardLabel' },
                    { text: String(value || '-'), style: 'cardValue' }
                ],
                fillColor
            }]]
        },
        layout: {
            hLineWidth: () => 0.9,
            vLineWidth: () => 0.9,
            hLineColor: () => '#d6e3f5',
            vLineColor: () => '#d6e3f5',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 7,
            paddingBottom: () => 7
        }
    };
}

export function createSectionTitle(text, margin = [0, 6, 0, 4]) {
    return {
        text: String(text || ''),
        style: 'sectionTitle',
        margin
    };
}

export function createStandardTable({
    widths = ['*'],
    body = [],
    headerRows = 1
}) {
    return {
        layout: {
            hLineWidth: (i) => (i === 1 ? 0.7 : 0.3),
            vLineWidth: () => 0,
            hLineColor: () => '#cfd4dc',
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: (i) => (i === 0 ? 4 : 2),
            paddingBottom: () => 2
        },
        table: {
            headerRows,
            widths,
            body
        }
    };
}

export function getReportStyles() {
    return {
        reportBrand: {
            fontSize: 7,
            bold: true,
            color: '#1f4f96',
            characterSpacing: 1.4
        },
        reportHint: {
            fontSize: 7,
            color: '#64748b',
            margin: [0, 2, 0, 0]
        },
        reportMeta: {
            fontSize: 7,
            color: '#516174',
            margin: [0, 1, 0, 0]
        },
        reportName: {
            fontSize: 12,
            bold: true,
            color: '#10213d',
            margin: [0, 10, 0, 3]
        },
        reportSubtitle: {
            fontSize: 8,
            color: '#4a5568',
            margin: [0, 0, 0, 1]
        },
        sectionTitle: {
            fontSize: 9,
            bold: true,
            color: '#1e293b'
        },
        cardLabel: {
            fontSize: 7,
            color: '#4a5568',
            margin: [0, 0, 0, 2]
        },
        cardValue: {
            bold: true,
            fontSize: 8,
            color: '#0f172a'
        },
        footerMeta: {
            fontSize: 7,
            color: '#64748b'
        }
    };
}

export function createReportHeader({
    title,
    organizationName = '',
    description = 'Relatorio gerencial',
    subtitle = '',
    generatedAt = formatDateBR(new Date(), true)
}) {
    return {
        margin: [18, 12, 18, 0],
        table: {
            widths: ['*'],
            body: [[
                {
                    fillColor: '#f7faff',
                    stack: [
                        {
                            columns: [
                                {
                                    stack: [
                                        { text: String(organizationName || 'CREDIARIO'), style: 'reportBrand' },
                                        { text: String(description || 'Relatorio gerencial'), style: 'reportHint' }
                                    ]
                                },
                                { text: generatedAt, style: 'reportMeta', alignment: 'right' }
                            ]
                        },
                        { text: title || 'RELATORIO', style: 'reportName' },
                        ...(subtitle ? [{ text: subtitle, style: 'reportSubtitle' }] : [])
                    ]
                }
            ]]
        },
        layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#d6e3f5',
            vLineColor: () => '#d6e3f5',
            paddingLeft: () => 14,
            paddingRight: () => 14,
            paddingTop: () => 12,
            paddingBottom: () => 10
        }
    };
}

export function createReportFooter(generatedAt) {
    return (currentPage, pageCount) => ({
        margin: [18, 0, 18, 16],
        columns: [
            { text: `Emitido em ${generatedAt}`, style: 'footerMeta' },
            { text: `Pagina ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerMeta' }
        ]
    });
}

export function buildTableDocument({
    title,
    organizationName = '',
    description = 'Relatorio gerencial',
    subtitle = '',
    widths = ['*'],
    body = [],
    orientation = 'portrait',
    summaryCards = [],
    summaryCardRows = null,
    tableTitle = ''
}) {
    const generatedAt = formatDateBR(new Date(), true);
    const normalizedSummaryCards = Array.isArray(summaryCards)
        ? summaryCards.filter((item) => item && (item.label || item.value))
        : [];
    const normalizedSummaryRows = Array.isArray(summaryCardRows)
        ? summaryCardRows
            .map((row) => Array.isArray(row)
                ? row.filter((item) => item && (item.label || item.value))
                : [])
            .filter((row) => row.length > 0)
        : chunkItems(normalizedSummaryCards, 4);
    const summaryBlocks = normalizedSummaryRows.map((group, groupIndex, groups) => ({
        columns: group.map((item) => ({
            width: item?.width || `${(100 / group.length).toFixed(2)}%`,
            ...createInfoCard(item?.label, item?.value)
        })),
        columnGap: 8,
        margin: [0, 0, 0, groupIndex === groups.length - 1 ? 8 : 6]
    }));
    const content = [
        ...summaryBlocks,
        ...(tableTitle ? [createSectionTitle(tableTitle)] : []),
        createStandardTable({ widths, body })
    ];

    return {
        pageSize: 'A4',
        pageOrientation: orientation,
        pageMargins: [18, 84, 18, 40],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 8
        },
        header: () => createReportHeader({ title, organizationName, description, subtitle, generatedAt }),
        content,
        footer: createReportFooter(generatedAt),
        styles: getReportStyles()
    };
}

export async function sendPdfResponse(res, filename, documentDefinition) {
    const buffer = await pdfMake.createPdf(documentDefinition).getBuffer();
    const safeFilename = String(filename || 'relatorio.pdf')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.status(200).end(buffer);
}
