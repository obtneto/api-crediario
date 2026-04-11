import Database from '../connections/dbconn.js';
//import json from './tabDigitacao.json' with { type: 'json' };

(async () => {

    const db = new Database('dbcred');

    try {

        void await db.Connect();

        console.clear();

        let i = 0;

        await db.Begin();

        for (const item of json) {
            
            const query = `INSERT INTO tb_registro SET num_req = :num_req,
                           lote = :lote, cod_prod = :cod_prod,
                           data = :data, ui_cx = :ui_cx, qtde_cx = :qtde_cx,
                           dep_baixa = :dep_baixa,cod_pac = :cod_pac,
                           cod_indica = :cod_indica,cod_local = :cod_local`;
            
            await db.connection.execute(query,{
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

        await db.Commit();
        
    } catch (error) {

        await db.RollBack();

        console.log(error);

    } finally {
        await db.Close(); 
    }

})();