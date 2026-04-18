import { Database } from '../database/database.js';
import { obterEntidadeNegocio } from '../utils/obterEntidadeNegocio.js';
import { GravarLog } from '../utils/GravarLog.js';

export class BaseController {

    static async executeWithDatabase(operation, req, res) {
        
        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            void await db.Connect();
            resdata.data = await operation(db.connection, obterEntidadeNegocio(req), req);
        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
            GravarLog(this.name + '.' + operation.name, error.stack);
        }

        void await db.Close();
        res.status(resdata.status).json(resdata);
    }

    static async executeWithTransaction(operation, req, res) {
        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            void await db.Connect();
            void await db.Begin();
            resdata.data = await operation(db.connection, obterEntidadeNegocio(req), req);
            void await db.Commit();
        } catch (error) {
            void await db.RollBack();
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
            GravarLog(this.name + '.' + operation.name, error.stack);
        }

        void await db.Close();
        res.status(resdata.status).json(resdata);
    }

    static buildResponse(data = []) {
        return {
            err: 0,
            msg: '',
            status: 200,
            data
        };
    }
}
