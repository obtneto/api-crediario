import {createConnection} from 'mariadb';
import { config } from "dotenv";

config({path: '../../.env'});


export default class Database {
    
    #dbname = null;
    #conn = null;
    //#script = null

    constructor(database) {
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

        const scriptSituacaoVendas = `
                UPDATE tb_vendas vd
                JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio AND tp.id = vd.id_tipo_pag
                SET vd.situacao = CASE
                    WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > 1 THEN 3
                    ELSE 0
                END
                WHERE vd.situacao = 0;`;

        const scriptStatusDistribuicao = `
            UPDATE tb_distribuicao d
            LEFT JOIN tb_itens_distrib i
                ON i.entidade_negocio = d.entidade_negocio
                AND i.id_distrib = d.id
                AND i.qt_distrib > 0
            SET d.situacao = IF(i.id_distrib IS NULL, 1, 0)
            WHERE d.situacao <> IF(i.id_distrib IS NULL, 1, 0);`;

        const scriptRestricaoCredito = `
				START TRANSACTION;
										
                INSERT INTO tb_restricao_credito (id,cpf_cliente, dt_restricao, com_restricao,entidade_negocio,id_venda,dias_atrasado)
                SELECT NovoIdRestricao(v.entidade_negocio) ,v.cpf_cliente,CURRENT_DATE(), 1 ,v.entidade_negocio,v.id,
				TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE())
                FROM tb_vendas v
                LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) >= 4 AND v.situacao < 9 AND v.id NOT IN (SELECT id_venda FROM tb_restricao_credito);

                UPDATE tb_clientes c
                LEFT JOIN tb_vendas v ON v.cpf_cliente = c.cpf_cliente
                SET c.com_restricao_credito = 1
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) >= 4 AND v.situacao < 9 AND v.id NOT IN (SELECT id_venda FROM tb_restricao_credito);
                
                COMMIT;`

        const scriptAtualizaAnoBase = `UPDATE tb_check_ano SET ano_corrente = YEAR(NOW()), id = 1;`

        // SELECT @@global.event_scheduler;
        //await this.#conn.query("SET GLOBAL event_scheduler = ON");
        void await this.#conn.query(scriptSituacaoVendas);
        void await this.#conn.query(scriptStatusDistribuicao);
        void await this.#conn.query(scriptRestricaoCredito);
        void await this.#conn.query(scriptAtualizaAnoBase);

    }

}
