import Database from "../connections/dbconn.js";
import GravaLog from "../utils/GravarLog.js";

(async () => {
    
    const db = new Database("dbcred");
    
    try {

        await db.Connect('dbcred');

        if (!db.connection) {
            throw new Error('Falha ao conectar ao banco de dados');
        }

        /************************************************************** */
        await db.connection.query('CALL sp_gerar_restricoes_credito()');
        

        /************************************************************** */
        const query_situacao_vendas = `
                UPDATE tb_vendas vd
                LEFT JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio AND tp.id = vd.id_tipo_pag
                SET vd.situacao = CASE
                    WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > 1 THEN 3
                    ELSE 0
                END
                WHERE vd.situacao = 0;`;

        await db.connection.query(query_situacao_vendas);
        
        /************************************************************** */
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