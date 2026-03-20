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
            dateStrings: true,
            timezone: '-03:00',
            initSql: "SET time_zone = '-03:00'" 
        });

        // normaliza parâmetros posicionais ? para named placeholders :p1, :p2, ...
        const originalExecute = this.#conn.execute.bind(this.#conn);
        this.#conn.execute = async (query, params={}) => {
            if (Array.isArray(params) && query.includes('?')) {
                let counter = 0;
                const transformedQuery = query.replace(/\?/g, () => `:p${++counter}`);
                const transformedParams = params.reduce((result, value, index) => {
                    result[`p${index + 1}`] = value;
                    return result;
                }, {});
                return originalExecute(transformedQuery, transformedParams);
            }
            return originalExecute(query, params);
        };

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
