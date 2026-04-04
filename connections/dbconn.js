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
            CREATE EVENT IF NOT EXISTS atualiza_situacao_vendas_horario
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
            CREATE EVENT IF NOT EXISTS atualiza_status_distribuicao ON SCHEDULE EVERY 1 MINUTE DO UPDATE tb_distribuicao d
            LEFT JOIN tb_itens_distrib i
                ON i.entidade_negocio = d.entidade_negocio
                AND i.id_distrib = d.id
                AND i.qt_distrib > 0
            SET d.situacao = IF(i.id_distrib IS NULL, 1, 0)
            WHERE d.situacao <> IF(i.id_distrib IS NULL, 1, 0);`;

        const scriptRestricaoCredito = `
            CREATE EVENT IF NOT EXISTS atualiza_restricao_credito ON SCHEDULE EVERY 1 DAY DO BEGIN
                -- 1. Declarar o que fazer em caso de erro (SQLEXCEPTION)
                DECLARE EXIT HANDLER FOR SQLEXCEPTION 
                BEGIN
                    ROLLBACK; -- Cancela tudo se qualquer query falhar
                END;

                -- 2. Iniciar a transação explicitamente
                START TRANSACTION;
                    
                    -- Query 1: INSERT (exemplo de log ou histórico)
                INSERT INTO tb_restricao_credito (cpf_cliente, dt_restricao, com_restricao,entidade_negocio,id_venda,dias_atrasado,dias)
                SELECT v.cpf_cliente,CURRENT_DATE(), 1 ,v.entidade_negocio,v.id,TIMESTAMPDIFF(DAY, v.ult_dat_pagamto, CURDATE()), t.dias_apos_pagamnto + 5
                FROM tb_vendas v
                    INNER JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                INNER JOIN tb_tipos_pagamentos t ON t.id = v.id_tipo_pag AND t.entidade_negocio = v.entidade_negocio
                WHERE TIMESTAMPDIFF(DAY, v.ult_dat_pagamto, CURDATE()) > t.dias_apos_pagamnto + 5 AND c.com_restricao_credito = 0 AND v.ult_dat_pagamto IS NOT NULL;

                -- Query 2: UPDATE dos clientes com restrição
                UPDATE tb_clientes c
                INNER JOIN tb_vendas v ON v.cpf_cliente = c.cpf_cliente
                INNER JOIN tb_tipos_pagamentos t ON t.id = v.id_tipo_pag AND t.entidade_negocio = v.entidade_negocio
                SET c.com_restricao_credito = 1
                WHERE v.ult_dat_pagamto IS NOT NULL 
                AND v.ult_dat_pagamto > '0000-00-00' 
                AND t.dias_apos_pagamnto IS NOT NULL 
                AND TIMESTAMPDIFF(DAY, v.ult_dat_pagamto, CURDATE()) > t.dias_apos_pagamnto + 5
                AND c.com_restricao_credito = 0;

                -- 3. Se chegou aqui sem erros, confirma as alterações
                COMMIT;

            END`

        // SELECT @@global.event_scheduler;
        //await this.#conn.query("SET GLOBAL event_scheduler = ON");
        void await this.#conn.query(scriptSituacaoVendas);
        void await this.#conn.query(scriptStatusDistribuicao);
        void await this.#conn.query(scriptRestricaoCredito);

    }

}
