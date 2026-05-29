import { v4 as uuidv4 } from 'uuid';
import GravarLog from './GravarLog.js';

/**
 * Gera uma cobrança PIX usando a API do OpenPix
 * @param {Object} options - Opções da cobrança
 * @param {number} options.valor - Valor em reais
 * @param {string} options.descricao - Descrição da cobrança
 * @param {string} options.correlationID - Identificador único (opcional, será gerado automaticamente se não informado)
 * @returns {Promise<Object>} Dados da cobrança incluindo brCode, qrCodeImage, transactionID (txid)
 */
export async function GerarPagamentoPix(options = {}) {
  const {
    valor = 50.00,
    correlationID = null
  } = options;

  // Gerar correlationID único se não fornecido
  const correlationId = correlationID || uuidv4();

  // Converter valor para centavos
  const valorCentavos = Math.round(valor * 100);

  // Obter API key do ambiente
  const apiKey = process.env.OPENPIX_API_KEY;

  if (!apiKey) {
    throw new Error('OPENPIX_API_KEY não configurada nas variáveis de ambiente');
  }

  try {
    const response = await fetch('https://api.openpix.com.br/api/v1/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({
        correlationID: correlationId,
        value: valorCentavos
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar cobrança PIX: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      txid: data.charge.transactionID, // Este é o txid para rastreamento
      correlationID: data.charge.correlationID,
      brCode: data.charge.brCode, // Código do QR Code para copiar e colar
      qrCodeImage: data.charge.qrCodeImage, // URL da imagem do QR Code
      paymentLinkUrl: data.charge.paymentLinkUrl, // Link de pagamento
      valor: valor,
      status: data.charge.status,
      expiresDate: data.charge.expiresDate
    };

  } catch (error) {
    GravarLog('GeraPix.GerarPagamentoPix', error?.stack || error?.message || String(error));
    throw error;
  }
}

/**
 * Consulta o status de uma cobrança PIX pelo correlationID
 * @param {string} correlationID - Identificador da cobrança
 * @returns {Promise<Object>} Dados atualizados da cobrança
 */
export async function ConsultarCobrancaPix(correlationID) {
  const apiKey = process.env.OPENPIX_API_KEY;

  if (!apiKey) {
    throw new Error('OPENPIX_API_KEY não configurada nas variáveis de ambiente');
  }

  try {
    const response = await fetch(`https://api.openpix.com.br/api/v1/charge/${correlationID}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao consultar cobrança PIX: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      txid: data.charge.transactionID,
      correlationID: data.charge.correlationID,
      status: data.charge.status,
      valor: data.charge.value / 100, // Converter de centavos para reais
      paymentLinkUrl: data.charge.paymentLinkUrl,
      brCode: data.charge.brCode,
      qrCodeImage: data.charge.qrCodeImage
    };

  } catch (error) {
    GravarLog('GeraPix.ConsultarCobrancaPix', error?.stack || error?.message || String(error));
    throw error;
  }
}
