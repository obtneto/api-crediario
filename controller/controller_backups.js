import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import GravarLog from '../utils/GravarLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../backups');

function formataDataArquivo(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null;

    return data.toLocaleString('sv-SE', {
        timeZone: '-03:00',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export class ControllerBackups {

    static async Listar(req, res) {

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        };

        try {

            const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true });
            const arquivos = entries.filter((entry) => entry.isFile());

            resdata.data = await Promise.all(
                arquivos.map(async (arquivo) => {
                    const arquivoPath = path.join(BACKUPS_DIR, arquivo.name);
                    const stats = await fs.stat(arquivoPath);

                    return {
                        nome_arquivo: arquivo.name,
                        data_criacao: formataDataArquivo(stats.birthtime),
                        data_modificacao: formataDataArquivo(stats.mtime),
                        tamanho_arquivo: stats.size
                    };
                })
            );

            resdata.data.sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo, 'pt-BR'));

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err === 500) GravarLog('ControllerBackups.Listar', error.stack || error.message);
        }

        res.status(resdata.status).json(resdata);

    }
}
