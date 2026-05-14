// upload-mega.js
import { Storage } from 'megajs';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
const FOLDER_NAME = process.env.FOLDER_NAME;

export default async function uploadBackup(filePath) {
  const storage = new Storage({
    email: MEGA_EMAIL,
    password: MEGA_PASSWORD,
  });

  // Aguarda conectar na conta
  await storage.ready;

  // Localiza a pasta "Copia"
  const folder = storage.root.children.find(f => f.name === FOLDER_NAME);

  if (!folder) {
    throw new Error(`Pasta "${FOLDER_NAME}" não encontrada no Mega!`);
  }

  const fileName = path.basename(filePath);

  // Verifica se já existe um arquivo com o mesmo nome e exclui
  const arquivoExistente = folder.children.find(f => f.name === fileName);
  
  if (arquivoExistente) {
    await arquivoExistente.delete(true); // true = permanente, sem ir pra lixeira
    console.log(`🗑️ Arquivo antigo removido: ${fileName}`);
  }

  const fileContent = fs.readFileSync(filePath);

  // Faz upload na pasta "Copia"
  const uploadedFile = await storage.upload({
    name: fileName,
    target: folder,
  }, fileContent).complete;

  console.log(`✅ Backup enviado para a pasta "${FOLDER_NAME} do Mega.nz": ${uploadedFile.name}`);

  storage.close();
}
