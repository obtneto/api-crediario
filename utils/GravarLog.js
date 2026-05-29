import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE_PATH = path.resolve(__dirname, '../Logs/logs.txt');
const MAX_LOG_MESSAGE_LENGTH = 20000;

function sanitizeLogMessage(value = '') {
    return String(value || '')
        .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;\\]+/gi, '$1[REDACTED]')
        .replace(/(bearer\s+)[a-z0-9._-]+/gi, '$1[REDACTED]')
        .replace(/((?:password|senha|token|secret|api[_-]?key|chave)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
        .slice(0, MAX_LOG_MESSAGE_LENGTH);
}

function GravarLog(scriptname,mensagem = '') {

    const options_date = { timeZone: '-03:00', year: 'numeric', month: '2-digit', day: '2-digit' };
    const options_time = { timeZone: '-03:00', hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    
    const data = new Date().toLocaleDateString('pt-BR', options_date);
    const hora = new Date().toLocaleTimeString('sv-SE', options_time);

    const logMessage = `[${data} ${hora}] ${sanitizeLogMessage(scriptname)}: ${sanitizeLogMessage(mensagem)}\n\n`;

    try {
        fs.mkdirSync(path.dirname(LOG_FILE_PATH), {recursive: true});

        fs.appendFile(LOG_FILE_PATH, logMessage, (err) => {
            if (err) {
                console.error('Falha ao gravar log:', err.message);
            }
        });
    } catch (error) {
        console.error('Falha ao preparar escrita de log:', error.message);
    }
    
};

GravarLog.Gravar = GravarLog;

export { GravarLog };
export default GravarLog;
