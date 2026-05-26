// upload-mega.js
import { Storage } from 'megajs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../backups');

config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
const FOLDER_NAME = process.env.FOLDER_NAME;

function criarStorageMega() {
  return new Storage({
    email: MEGA_EMAIL,
    password: MEGA_PASSWORD,
  });
}

function validarConfiguracao() {
  const variaveisFaltantes = [
    ['MEGA_EMAIL', MEGA_EMAIL],
    ['MEGA_PASSWORD', MEGA_PASSWORD],
    ['FOLDER_NAME', FOLDER_NAME],
  ]
    .filter(([, valor]) => !valor)
    .map(([nome]) => nome);

  if (variaveisFaltantes.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${variaveisFaltantes.join(', ')}`);
  }
}

function formataDataMega(timestamp) {
  if (!timestamp) return null;

  const data = new Date(timestamp);

  if (Number.isNaN(data.getTime())) return null;

  return data.toLocaleString('sv-SE', {
    timeZone: '-03:00',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function localizarPastaBackupsMega(storage) {
  const folder = storage.root.children.find((arquivo) => arquivo.name === FOLDER_NAME && arquivo.directory);

  if (!folder) {
    const error = new Error(`Pasta "${FOLDER_NAME}" não encontrada no Mega!`);
    error.statusCode = 404;
    throw error;
  }

  return folder;
}

async function listarArquivosBackupLocal() {
  const entradas = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });

  return entradas
    .filter((entrada) => entrada.isFile())
    .map((entrada) => path.join(BACKUPS_DIR, entrada.name))
    .sort();
}

export async function listarArquivosBackupMega() {
  validarConfiguracao();

  const storage = criarStorageMega();

  try {
    await storage.ready;

    const folder = localizarPastaBackupsMega(storage);
    const arquivos = Array.isArray(folder.children) ? folder.children.filter((arquivo) => !arquivo.directory) : [];

    return arquivos
      .map((arquivo) => {
        const dataArquivo = formataDataMega(arquivo.createdAt);

        return {
          nome_arquivo: arquivo.name || '',
          data_criacao: dataArquivo,
          data_modificacao: dataArquivo,
          tamanho_arquivo: Number(arquivo.size || 0),
        };
      })
      .sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo, 'pt-BR'));
  } finally {
    await storage.close().catch((error) => {
      console.error(`❌ Falha ao fechar conexão com Mega.nz: ${error.message}`);
    });
  }
}

async function limparArquivosBackupMega(folder) {
  const arquivosRemotos = folder.children.filter((arquivo) => !arquivo.directory);

  if (arquivosRemotos.length === 0) {
    console.log(`Nenhum arquivo de backup antigo encontrado na pasta "${FOLDER_NAME}" do Mega.nz`);
    return;
  }

  for (const arquivo of arquivosRemotos) {
    await arquivo.delete(true); // true = permanente, sem ir pra lixeira
    console.log(`🗑️ Backup antigo removido do Mega.nz: ${arquivo.name}`);
  }
}

async function enviarArquivoBackup(storage, folder, filePath) {
  const fileName = path.basename(filePath);
  const fileStats = await fs.promises.stat(filePath);

  const uploadedFile = await storage.upload({
    name: fileName,
    target: folder,
    size: fileStats.size,
  }, fs.createReadStream(filePath)).complete;

  if (!uploadedFile || uploadedFile.name !== fileName) {
    throw new Error(`Upload não confirmado para o arquivo ${fileName}`);
  }

  await fs.promises.unlink(filePath);
  console.log(`✅ Backup enviado para a pasta "${FOLDER_NAME}" do Mega.nz e removido localmente: ${uploadedFile.name}`);
}

export default async function uploadBackup() {
  validarConfiguracao();

  const storage = criarStorageMega();

  let totalFalhas = 0;

  try {
    // Aguarda conectar na conta
    await storage.ready;

    // Localiza a pasta configurada no Mega
    const folder = localizarPastaBackupsMega(storage);

    await limparArquivosBackupMega(folder);

    const arquivosBackup = await listarArquivosBackupLocal();

    if (arquivosBackup.length === 0) {
      console.log(`Nenhum arquivo de backup encontrado em ${BACKUPS_DIR}`);
      return;
    }

    for (const filePath of arquivosBackup) {
      try {
        await enviarArquivoBackup(storage, folder, filePath);
      } catch (error) {
        totalFalhas += 1;
        console.error(`❌ Falha ao enviar backup ${path.basename(filePath)}: ${error.message}`);
      }
    }

    if (totalFalhas > 0) {
      throw new Error(`${totalFalhas} arquivo(s) de backup não foram enviados para o Mega.nz`);
    }
  } finally {
    await storage.close().catch((error) => {
      console.error(`❌ Falha ao fechar conexão com Mega.nz: ${error.message}`);
    });
  }
}
