import CryptoJS from 'crypto-js';

const SECRET_KEY = "Cred3215987%$#@!"; // Chave secreta para criptografia (deve ser mantida em segredo e segura)

// Encriptar
export function encriptar(texto) {
    // Retorna uma string criptografada pronta para envio
    return CryptoJS.AES.encrypt(texto, SECRET_KEY).toString();
}

// Desencriptar
export function desencriptar(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!originalText) throw new Error("Falha na desencriptação ou chave incorreta");
    return originalText;
}
