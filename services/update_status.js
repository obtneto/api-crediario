import Database from "../connections/dbconn.js";
import GravaLog from "../utils/GravarLog.js";

(async () => {
    
    const db = new Database("dbcred");
    
    try {

        await db.Connect();

        if (!db.connection) {
            throw new Error('Falha ao conectar ao banco de dados');
        }

        const query_restricao = `
            START TRANSACTION;

                INSERT INTO tb_restricao_credito (id,cpf_cliente, dt_restricao, com_restricao,entidade_negocio,id_venda,dias_atrasado)
                SELECT NovoIdRestricao(v.entidade_negocio) ,v.cpf_cliente,CURRENT_DATE(), 1 ,v.entidade_negocio,v.id,
				TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE())
                FROM tb_vendas v
                INNER JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) > 5 AND c.com_restricao_credito = 0 AND v.situacao < 9;

                UPDATE tb_clientes c
                INNER JOIN tb_vendas v ON v.cpf_cliente = c.cpf_cliente
                SET c.com_restricao_credito = 1
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) > 5 AND c.com_restricao_credito = 0 AND v.situacao < 9;
            
            COMMIT; `;

        await db.connection.query(query_restricao);

        const query_situacao_vendas = `
                UPDATE tb_vendas vd
                JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio AND tp.id = vd.id_tipo_pag
                SET vd.situacao = CASE
                    WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > 1 THEN 3
                    ELSE 0
                END
                WHERE vd.situacao = 0;`;

        await db.connection.query(query_situacao_vendas);

        const query_status_distribuicao = `
            UPDATE tb_distribuicao d
            LEFT JOIN tb_itens_distrib i
                ON i.entidade_negocio = d.entidade_negocio
                AND i.id_distrib = d.id
                AND i.qt_distrib > 0
            SET d.situacao = IF(i.id_distrib IS NULL, 1, 0)
            WHERE d.situacao <> IF(i.id_distrib IS NULL, 1, 0);`;
        
        await db.connection.query(query_status_distribuicao);
        
    } catch (error) {
        GravaLog("update_status", error.stack);
    }
    finally {
        await db.Close();
    }

})();