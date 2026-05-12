import { Resend } from 'resend';
import GravarLog from './GravarLog.js';

let resendClient = null;
let resendApiKeyCache = '';

function getResendClient() {

    const apiKey = String(process.env.RESEND_API_KEY || '').trim();

    if (!apiKey) {
        throw new Error('RESEND_API_KEY nao configurada.');
    }

    if (!resendClient || resendApiKeyCache !== apiKey) {
        resendClient = new Resend(apiKey);
        resendApiKeyCache = apiKey;
    }

    return resendClient;
}

function normalizarEmails(value) {
    
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export async function enviarEmailResend({                
    from = process.env.RESEND_FROM_EMAIL || '',
    to,
    cc,
    bcc,
    replyTo,
    subject,
    html = '',
    text = '',
    react,
    attachments,
    headers,
    tags,
    scheduledAt
} = {}) {
    const remetente = String(from || '').trim();
    const destinatarios = normalizarEmails(to);
    const copias = normalizarEmails(cc);
    const copiasOcultas = normalizarEmails(bcc);
    const responderPara = normalizarEmails(replyTo);
    const assunto = String(subject || '').trim();
    const corpoHtml = String(html || '').trim();
    const corpoTexto = String(text || '').trim();

    if (!remetente) {
        throw new Error('RESEND_FROM_EMAIL nao configurado.');
    }

    if (!destinatarios.length) {
        throw new Error('Informe ao menos um destinatario.');
    }

    if (!assunto) {
        throw new Error('Informe o assunto do e-mail.');
    }

    if (!corpoHtml && !corpoTexto && !react) {
        throw new Error('Informe o conteudo do e-mail em html, text ou react.');
    }

    const payload = {
        from: remetente,
        to: destinatarios,
        subject: assunto
    };

    if (copias.length) {
        payload.cc = copias;
    }

    if (copiasOcultas.length) {
        payload.bcc = copiasOcultas;
    }

    if (responderPara.length) {
        payload.replyTo = responderPara.length === 1 ? responderPara[0] : responderPara;
    }

    if (corpoHtml) {
        payload.html = corpoHtml;
    }

    if (corpoTexto) {
        payload.text = corpoTexto;
    }

    if (react) {
        payload.react = react;
    }

    if (attachments) {
        payload.attachments = attachments;
    }

    if (headers) {
        payload.headers = headers;
    }

    if (tags) {
        payload.tags = tags;
    }

    if (scheduledAt) {
        payload.scheduledAt = scheduledAt;
    }

    try {
        const resend = getResendClient();
        const { data, error } = await resend.emails.send(payload);

        if (error) {
            throw new Error(error.message || 'Falha ao enviar e-mail com Resend.');
        }

        return data;
    } catch (error) {
        GravarLog('EnvioEmail.enviarEmailResend', error.stack || error.message);
        throw error;
    }
}

export default enviarEmailResend;
