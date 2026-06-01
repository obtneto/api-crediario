import {createConnection} from 'mariadb';
import { config } from "dotenv";

config({path: '/home/ovidio-neto/Crediario/.env',quiet: true});

export default class Database {
    
    #dbname = null;
    #conn = null;
    //#script = null

    constructor(database) {
        if (!database) throw new Error('Forneça o nome do Banco de Dados!');
        this.#dbname = database;
    }

    get connection() {
        return this.#conn;
    }

    async Connect() {

        if (this.#conn) return;

        this.#conn = await createConnection({
            host: process.env.DB_HOST,
            user:  process.env.DB_USER,
            port: process.env.DB_PORT,
            database: this.#dbname,
            password: process.env.DB_PASSWORD, 
            namedPlaceholders: true,
            decimalAsNumber: true,
            dateStrings: true,
            multipleStatements: true,
            initSql: "SET time_zone = '-03:00'" 
        });

    };

    async Begin() {
        if (this.#conn) return await this.#conn.beginTransaction();
    }

    async Commit() {
        if (this.#conn) return await this.#conn.commit();
    }

    async RollBack() {
        if (this.#conn) return await this.#conn.rollback();
    }

    async Close() {
        if (this.#conn) await this.#conn.end();
    }

    async CreateEvents() {

        const scriptAtualizaAnoBase = `UPDATE tb_check_ano SET ano_corrente = YEAR(NOW()), id = 1;`
        
        void await this.#conn.query(scriptAtualizaAnoBase);

    }

}
