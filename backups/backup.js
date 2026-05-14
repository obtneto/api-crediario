import { spawn } from 'child_process';
import zlib from 'zlib';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });

// 1. Configura os argumentos do mariadb-dump
const dumpProcesso = spawn('mariadb-dump', [
  '-u', process.env.DB_USER,
  `-p${process.env.DB_PASSWORD}`, // ATENÇÃO: Sem espaço entre o -p e a senha
  'dbcred',
  '--single-transaction',
  '--routines',
  '--triggers',
]);

const dataAtual = new Date().getHours().toString().padStart(2, '0') + ':00';
const nomeArquivo = `backup_${dataAtual}.sql.gz`;

// Remove o arquivo se já existir
if(fs.existsSync(nomeArquivo)) {
  fs.unlinkSync(nomeArquivo);
}

// 2. Cria os fluxos de compressão e escrita em disco
const gzip = zlib.createGzip();
const arquivoSaida = fs.createWriteStream(nomeArquivo);

// 3. Conecta a saída do comando diretamente ao compactador e depois ao arquivo
dumpProcesso.stdout.pipe(gzip).pipe(arquivoSaida);

const dataHora = new Date().toLocaleString('sv-SE', { timeZone: '-03:00'});

// 4. Captura erros do mariadb-dump (ex: senha errada ou banco inexistente)
dumpProcesso.stderr.on('data', (data) => {
  console.error(`Erro no mariadb-dump: [${dataHora}] ${data.toString()}\n`);
});

// 5. Detecta o fim do processo com sucesso

arquivoSaida.on('finish', () => {
  console.log(`Backup gerado e compactado com sucesso em [${dataHora}] - ${nomeArquivo}\n`);
});
