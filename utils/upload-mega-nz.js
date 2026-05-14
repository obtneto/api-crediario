// upload-mega.js
import { Storage } from 'megajs';
import fs from 'fs';
import path from 'path';

const MEGA_EMAIL = 'obtneto@gmail.com';
const MEGA_PASSWORD = 'S3cr3t@1967';
const FOLDER_NAME = 'Copia';

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
  const fileContent = fs.readFileSync(filePath);

  // Faz upload na pasta "Copia"
  const uploadedFile = await storage.upload({
    name: fileName,
    target: folder,
  }, fileContent).complete;

  console.log(`✅ Backup enviado para a pasta "${FOLDER_NAME} do Mega.nz": ${uploadedFile.name}`);

  storage.close();
}
