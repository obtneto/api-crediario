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

    const date = new Date(text.includes('T') ? text : text.replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return text;
    }

    return date.toLocaleString('pt-BR', includeTime ? {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Maceio'
    } : {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Maceio'
    });
}

export function buildTableDocument({
    title,
    subtitle = '',
    widths = ['*'],
    body = [],
    orientation = 'portrait'
}) {
    return {
        pageSize: 'A4',
        pageOrientation: orientation,
        pageMargins: [18, 56, 18, 44],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 8
        },
        header: () => ({
            margin: [18, 12, 18, 0],
            stack: [
                { text: title || 'RELATORIO', style: 'reportName' },
                ...(subtitle ? [{ text: subtitle, style: 'reportSubtitle' }] : [])
            ]
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
                margin: [18, 0, 18, 22],
                text: `Pagina ${currentPage} de ${pageCount}`,
                alignment: 'right',
                fontSize: 7
            };
        },
        styles: {
            reportName: {
                fontSize: 10,
                bold: true,
                alignment: 'center',
                margin: [0, 4, 0, 2]
            },
            reportSubtitle: {
                fontSize: 8,
                alignment: 'center',
                color: '#4a5568',
                margin: [0, 0, 0, 2]
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
