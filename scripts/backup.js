import { spawn } from 'child_process';
import zlib from 'zlib';
import fs from 'fs';
import { config } from 'dotenv';
import uploadBackup from '../utils/upload-mega-nz.js';

config({ path: '../../.env', quiet: true });

const dumpProcesso = spawn('mariadb-dump', [
  '-u', process.env.DB_USER,
  `-p${process.env.DB_PASSWORD}`,
  'dbcred',
  '--single-transaction',
  '--routines',
  '--triggers',
]);

const dataAtual = new Date().getHours().toString().padStart(2, '0') + ':00';
const nomeArquivo = `backup_${dataAtual}.sql.gz`;

if (fs.existsSync(nomeArquivo)) {
  fs.unlinkSync(nomeArquivo);
}

const gzip = zlib.createGzip();
const arquivoSaida = fs.createWriteStream(nomeArquivo);

dumpProcesso.stdout.pipe(gzip).pipe(arquivoSaida);

const dataHora = new Date().toLocaleString('sv-SE', { timeZone: '-03:00' });

let dumpSucesso = false; // ← controla se o dump foi bem sucedido

dumpProcesso.stderr.on('data', (data) => {
  console.error(`❌ Erro no mariadb-dump: [${dataHora}] ${data.toString()}\n`);
});

// Detecta se o mariadb-dump terminou com sucesso
dumpProcesso.on('close', (code) => {
  if (code === 0) {
    dumpSucesso = true;
  } else {
    console.error(`❌ mariadb-dump encerrou com erro (código ${code}) [${dataHora}]\n`);
    // Remove o arquivo corrompido
    if (fs.existsSync(nomeArquivo)) {
      fs.unlinkSync(nomeArquivo);
    }
  }
});

// Só faz upload se o dump foi bem sucedido
arquivoSaida.on('finish', () => {
  if (!dumpSucesso) return;

  console.log(`✅ Backup gerado e compactado com sucesso em [${dataHora}] - ${nomeArquivo}\n`);
  uploadBackup(nomeArquivo);
});
