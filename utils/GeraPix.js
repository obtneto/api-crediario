import { PixJS } from 'pix-utils';

export function GerarPagamentoPix() {
  return PixJS({
    key: 'suachave@email.com', // Chave Pix (CPF, CNPJ, Email, Telefone ou Aleatória)
    merchantName: 'NOME DA SUA EMPRESA',
    merchantCity: 'SAO PAULO',
    amount: 50.00, // Valor (opcional no estático)
    description: 'Pedido #1234' // Descrição que aparece no extrato
  }).getPayload();
}
