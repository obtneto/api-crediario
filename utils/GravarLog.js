import fs from 'fs';

export default function GravarLog(mensagem) {

    const options_date = { timeZone: 'America/Maceio', year: 'numeric', month: '2-digit', day: '2-digit' };
    const options_time = { timeZone: 'America/Maceio', hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    
    const data = new Date().toLocaleDateString('pt-BR', options_date);
    const hora = new Date().toLocaleTimeString('pt-BR', options_time);

    const logMessage = `[${data} ${hora}] ${mensagem}\n\n`;

    fs.appendFile('../Logs/logs.txt', logMessage, (err) => {
        if (err) {
            throw err;
        }
    });
    
};