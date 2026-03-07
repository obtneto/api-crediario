import fs from 'fs';

export default function GravarLog(mensagem) {

    const data = new Date().toISOString().substring(0, 19).replace('T', ' ');

    const logMessage = `[${data}] ${mensagem}\n\n`;

    fs.appendFile('logs.txt', logMessage, (err) => {
        if (err) {
            throw err;
        }
    });
    
};