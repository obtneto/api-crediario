import zlib from 'zlib';
import fs from 'fs';

export default function descompactar(caminhoArquivoCompactado, caminhoArquivoSaida) {
  
  // 1. Cria os fluxos de leitura, descompactação (Gunzip) e escrita
  const streamLeitura = fs.createReadStream(caminhoArquivoCompactado);
  const gunzip = zlib.createGunzip();
  const streamEscrita = fs.createWriteStream(caminhoArquivoSaida);

  // 2. Conecta os fluxos
  streamLeitura
    .pipe(gunzip)
    .pipe(streamEscrita)
    .on('finish', () => {
      console.log('Arquivo .sql.gz descompactado com sucesso para .sql!');
    });

  // 3. Tratamento de erros
  streamLeitura.on('error', (err) => console.error('Erro ao ler arquivo:', err));
  gunzip.on('error', (err) => console.error('Erro na descompactação:', err));
  streamEscrita.on('error', (err) => console.error('Erro ao gravar arquivo:', err));

}
