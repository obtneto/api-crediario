import fs from 'fs';

export default function GravarLog(scriptname,mensagem) {

    const options_date = { timeZone: '-03:00', year: 'numeric', month: '2-digit', day: '2-digit' };
    const options_time = { timeZone: '-03:00', hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    
    const data = new Date().toLocaleDateString('pt-BR', options_date);
    const hora = new Date().toLocaleTimeString('sv-SE', options_time);

    const logMessage = `[${data} ${hora}] ${scriptname}: ${mensagem}\n\n`;

    fs.appendFile('./Logs/logs.txt', logMessage, (err) => {
        if (err) {
            throw err;
        }
    });
    
};
