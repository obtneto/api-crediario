import {createConnection} from 'mariadb';

export default class Database {
    
    #dbname = null;
    #conn = null;
    //#script = null

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

    async CreateEvents() {
        const scriptSituacaoVendas = `
            CREATE EVENT IF NOT EXISTS atualizar_situacao_vendas_horario
                ON SCHEDULE EVERY 1 HOUR
                STARTS CURRENT_TIMESTAMP
                DO
                UPDATE tb_vendas vd
                JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio AND tp.id = vd.id_tipo_pag
                SET vd.situacao = CASE
                    WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > (tp.dias_apos_pagamnto + 1) THEN 3
                    ELSE 0
                END
                WHERE vd.situacao = 0;
        `;

        const scriptStatusDistribuicao = `
            CREATE EVENT IF NOT EXISTS atualizar_status_distribuicao
                ON SCHEDULE EVERY 1 MINUTE
                DO
                UPDATE tb_distribuicao d
                LEFT JOIN tb_itens_distrib i
                    ON i.entidade_negocio = d.entidade_negocio
                    AND i.id_distrib = d.id
                    AND i.qt_distrib > 0
                SET d.situacao = 1
                WHERE i.id_distrib IS NULL
                    AND d.situacao <> 1;
        `;

        //await this.#conn.query("SET GLOBAL event_scheduler = ON");
        await this.#conn.query(scriptSituacaoVendas);
        await this.#conn.query(scriptStatusDistribuicao);
    }

}
