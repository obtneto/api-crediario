import { PixJS } from 'pix-utils';
import QRCode from 'qrcode';

export function GerarPagamentoPix() {
  // 1. Configura os dados do recebedor
  const pix = PixJS({
    key: 'suachave@email.com', // Chave Pix (CPF, CNPJ, Email, Telefone ou Aleatória)
    merchantName: 'NOME DA SUA EMPRESA',
    merchantCity: 'SAO PAULO',
    amount: 50.00, // Valor (opcional no estático)
    description: 'Pedido #1234' // Descrição que aparece no extrato
  });

  /***************************************
  * Como Usar a Function
  ****************************************/
  // 2. Obtém a string "Pix Copia e Cola"
  //const pixCode = pix.getPayload();
  //console.log('Código Copia e Cola:', pixCode);

  //try {
    // 3. Transforma a string em um QR Code (Base64 para exibir no HTML)
 //   const qrCodeImage = await QRCode.toDataURL(pixCode);
  //  return { pixCode, qrCodeImage };
  //} catch (err) {
  //  console.error('Erro ao gerar QR Code', err);
  //}
}