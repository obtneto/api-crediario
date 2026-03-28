import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';

export class ControlelerRelatorios {

    static async ListarVendas(req,res) {

        const db = new Database('dbcred');
        
        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const anobase = Number(req.params.anobase || 0);
            const mesbase = Number(req.params.mesbase || 0);

            void await db.Connect();

            if (!anobase || anobase === 0) {
                const error = new Error('O ano base para pesquisa dos dados invalido.');
                error.statusCode = 400;
                throw error;
            }

             if (!mesbase || mesbase === 0) {
                const error = new Error('O mes base para pesquisa dos dados invalido.');
                error.statusCode = 400;
                throw error;
            }

            const query_vendas = ""

            
        } catch (error) {
        
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao listar de Relatorios: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}