import {createConnection} from 'mariadb';
//import json from './tabDigitacao.json' with { type: 'json' };

(async () => {

    try {

        console.clear();

        let i = 0;

        await connection.beginTransaction();

        for (const item of json) {
            
            const query = `INSERT INTO tb_registro SET num_req = :num_req,
                           lote = :lote, cod_prod = :cod_prod,
                           data = :data, ui_cx = :ui_cx, qtde_cx = :qtde_cx,
                           dep_baixa = :dep_baixa,cod_pac = :cod_pac,
                           cod_indica = :cod_indica,cod_local = :cod_local`;
            
            await connection.execute(query,{
                num_req: item.NumReq,
                lote: item.Lote,
                cod_prod: item.CodProd,
                data: item.Data,
                ui_cx: item.UI_Cx,
                qtde_cx: item.Qtde_Cx,
                dep_baixa: item.DepositoBaixa,
                cod_pac: item.CodPac,
                cod_indica: item.CodIndica,
                cod_local: item.CodLocal    
            });

            console.log(`${++i} de ${json.length} inseridos com sucesso`);
            
        }

        await connection.commit();
        
    } catch (error) {

        await connection.rollback();

        console.log(error);

    } finally {
        await connection.end(); 
    }

})();