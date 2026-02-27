import nodemailer from'nodemailer';

async function enviarEmailGmail(
  remetenteEmail = 'seu_email@gmail.com',
  remetenteSenhaApp = 'sua_senha_app',
  destinatarioEmail = 'destinatario_email@example.com',
  assunto = 'Assunto do e-mail',
  corpo = 'Corpo do e-mail',
) {
  // Configurações do servidor SMTP
  const servidorSmtp = 'smtp.gmail.com';
  const porta = 587;

  // Creat transporte
  const transporte = nodemailer.createTransport({
    host: servidorSmtp,
    port: porta,
    secure: false, // ou true para usar TLS
    auth: {
      user: remetenteEmail,
      pass: remetenteSenhaApp,
    },
    tls: {
      ciphers: 'SSLv3',
    },
  });

  // Creat mensagem
  const mensagem = {
    from: remetenteEmail,
    to: destinatarioEmail,
    subject: assunto,
    text: corpo,
  };

  try {
    const info = await transporte.sendMail(mensagem);
    console.log(`E-mail enviado com sucesso! ID: ${info.messageId}`);
  } catch (erro) {
    console.error(`Erro ao enviar e-mail: ${erro}`);
  }
}

// Exemplo de uso
enviarEmailGmail(
  'seu_email@gmail.com',
  'sua_senha_app',
  'destinatario_email@example.com',
  'Teste de e-mail',
  'Este é um teste de e-mail enviado pelo Node.js!',
);