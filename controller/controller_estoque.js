import Database from '../connections/dbconn.js';
import Estoque from '../model/dao_estoque.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';

export class ControllerEstoque {

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                estoque: []
            }
        }

        try {
            
            const pesq = req.params.pesq;
            const entidade_negocio = obterEntidadeNegocio(req)

            void await db.Connect();

            const estoque = new Estoque(db.connection, entidade_negocio );

            const params = { entidade_negocio };
            let query = `SELECT e.id_produto, p.nom_produto, p.mar_produto, p.und_produto, e.qt_reservada, e.qt_disponivel
            FROM tb_estoque e
            LEFT JOIN tb_produtos p ON p.id = e.id_produto AND p.entidade_negocio = e.entidade_negocio
            WHERE e.entidade_negocio = :entidade_negocio`;

            if (pesq != "*") {
                query += ` AND p.nom_produto LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            const rows = await estoque.ExecuteQuery(query, params);
            
            resdata.data.estoque = rows;

        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Editar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {
            
            const id = req.params.id
            const id_produto = req.params.id_produto;
            const entidade_negocio = obterEntidadeNegocio(req)

            void await db.Connect();

            const estoque = new Estoque(db.connection, entidade_negocio);

            resdata.data = await estoque.FindById(id,id_produto);


        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const {id,id_produto,qt_reservada,qt_disponivel} = req.body;
            const entidade_negocio = obterEntidadeNegocio(req)
            
            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection, entidade_negocio);

            void await estoque.FindById(id,id_produto);

            estoque.qt_reservada = qt_reservada;
            estoque.qt_disponivel = qt_disponivel;
           
            void await estoque.Save();

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Excluir(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: []
        }

        try {

            const id = req.params.id;
            const id_produto = req.params.id_produto;
            const entidade_negocio = obterEntidadeNegocio(req)
            
            void await db.Connect();

            void await db.Begin();

            const estoque = new Estoque(db.connection,entidade_negocio);

            void await estoque.Excluir(id,id_produto);

            void await db.Commit();

        } catch (error) {
            
            void await db.RollBack();

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}
