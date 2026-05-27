import uploadBackup from '../utils/upload-mega-nz.js';

(async () => {
  try {
    await uploadBackup();
  } catch (error) {
    console.error(`❌ Erro ao enviar arquivos de backup no Mega.nz: ${error.message}`);
    process.exitCode = 1;
  }
})();
