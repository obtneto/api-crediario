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

export function buildTableDocument({
    title,
    organizationName = '',
    description = 'Relatorio gerencial',
    subtitle = '',
    widths = ['*'],
    body = [],
    orientation = 'portrait'
}) {
    const generatedAt = formatDateBR(new Date(), true);

    return {
        pageSize: 'A4',
        pageOrientation: orientation,
        pageMargins: [18, 84, 18, 40],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 8
        },
        header: () => ({
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
        }),
        content: [
            {
                layout: {
                    hLineWidth: (i) => (i === 1 ? 0.8 : 0.2),
                    vLineWidth: () => 0,
                    hLineColor: () => '#cfd4dc',
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: (i) => (i === 0 ? 4 : 2),
                    paddingBottom: () => 2
                },
                table: {
                    headerRows: 1,
                    widths,
                    body
                }
            }
        ],
        footer(currentPage, pageCount) {
            return {
                margin: [18, 0, 18, 16],
                columns: [
                    { text: `Emitido em ${generatedAt}`, style: 'footerMeta' },
                    { text: `Pagina ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerMeta' }
                ]
            };
        },
        styles: {
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
            footerMeta: {
                fontSize: 7,
                color: '#64748b'
            }
        }
    };
}

export async function sendPdfResponse(res, filename, documentDefinition) {
    const buffer = await pdfMake.createPdf(documentDefinition).getBuffer();
    const safeFilename = String(filename || 'relatorio.pdf')
        .replace(/[^\w.\-]+/g, '-')
        .replace(/-+/g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.status(200).end(buffer);
}
