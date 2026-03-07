import {createConnection} from 'mariadb';

export default class Database {
    
    #dbname = null;
    #conn = null;

    constructor(database){
        if (!database) throw new Error('Forneça o nome do Banco de Dados');
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
            database: this.#dbname,
            password: process.env.DB_PASSWORD, 
            namedPlaceholders: true,
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
        if (this.#conn) await  this.#conn.end();
    }

}
