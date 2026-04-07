import { exec } from 'node:child_process';
import fs from 'node:fs';
import {createConnection} from 'mariadb';
import {config} from 'dotenv';

config({path:'../.env'});

async function backupEmpresa(empresaId) {
   
    const dbname = 'dbcred';

    const connection = await createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbname
    });

    // 1. Busca todas as tabelas que contêm a coluna empresa_id
    const rows = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'dbcred' 
        AND COLUMN_NAME = 'entidade_negocio'
    `);

    const tabelas = rows.map(r => r.TABLE_NAME);
    const arquivoSaida = `backups/backup_empresa_${empresaId}.sql`;

    // Limpa o arquivo se já existir
    if (fs.existsSync(arquivoSaida)) fs.unlinkSync(arquivoSaida);

    console.log(`Iniciando backup da empresa ${empresaId}...`);

    for (const tabela of tabelas) {
        // 2. Executa o mariadb-dump para cada tabela com o filtro WHERE
        // Usamos --no-create-info se quiser apenas os dados, ou remover para ter a estrutura
        const comando = `mariadb-dump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${dbname} ${tabela} --where="entidade_negocio=${empresaId}" --no-create-info >> ${arquivoSaida}`;
        
        await new Promise((resolve, reject) => {
            exec(comando, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    console.log(`Backup concluído: ${arquivoSaida}`);
    await connection.end();
}

backupEmpresa(1).catch(console.error);