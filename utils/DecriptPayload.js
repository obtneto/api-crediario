import CryptoJS from 'crypto-js';
import { getConfiguredSecret } from './SecurityConfig.js';

function getSecretKey() {
    return getConfiguredSecret(['SECRET_KEY'], 'SECRET_KEY');
}

// Encriptar
export function encriptar(texto) {
    // Retorna uma string criptografada pronta para envio
    return CryptoJS.AES.encrypt(texto, getSecretKey()).toString();
}

// Desencriptar
export function desencriptar(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, getSecretKey());
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!originalText) throw new Error("Falha na desencriptação ou chave incorreta");
    return originalText;
}
