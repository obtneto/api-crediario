import Database from '../connections/dbconn.js';
import Estoque from '../model/dao_estoque.js';
import Estoque_mov from '../model/dao_estoque_mov.js';
import Entidades from '../model/dao_entidades.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import {buildTableDocument, sendPdfResponse} from '../utils/PdfReport.js';

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

            const params = [entidade_negocio];
            let query = `SELECT e.id_produto, p.nom_produto, p.mar_produto, p.und_produto, p.estq_min, p.estq_max, e.qt_reservada, e.qt_disponivel
            FROM tb_estoque e
            LEFT JOIN tb_produtos p ON p.id = e.id_produto AND p.entidade_negocio = e.entidade_negocio
            WHERE e.entidade_negocio = ?`;

            if (pesq != "*") {
                query += ` AND p.nom_produto LIKE ?`;
                params.push(`%${pesq}%`);
            }

            const rows = await estoque.ExecuteQuery(query, params);
            
            resdata.data.estoque = rows;

        } catch (error) {

            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog.Gravar('ControllerEstoque.Listar', error.stack);
            
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Imprimir(req,res) {

        const db = new Database('dbcred');

        try {

            const pesq = String(req.params.pesq || '*').trim() || '*';
            const entidade_negocio = obterEntidadeNegocio(req);

            void await db.Connect();

            const estoque = new Estoque(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);
            const params = [entidade_negocio];
            let query = `SELECT e.id_produto, p.nom_produto, p.mar_produto, p.und_produto, e.qt_reservada, e.qt_disponivel
            FROM tb_estoque e
            LEFT JOIN tb_produtos p ON p.id = e.id_produto AND p.entidade_negocio = e.entidade_negocio
            WHERE e.entidade_negocio = ?`;

            if (pesq !== '*') {
                query += ` AND p.nom_produto LIKE ?`;
                params.push(`%${pesq}%`);
            }

            query += ` ORDER BY p.nom_produto ASC, e.id_produto ASC`;

            const rows = await estoque.ExecuteQuery(query, params);

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('Nao ha dados para impressao.');
                error.statusCode = 404;
                throw error;
            }

            const [entidade] = await entidades.ExecuteQuery(
                `SELECT id, nom_entidade FROM tb_entidades WHERE id = ?`,
                [entidade_negocio]
            );

            const subtitle = `Entidade: ${entidade?.nom_entidade || entidade_negocio}`;
            const body = [
                [
                    { text: 'ID', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Produto', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Marca', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Und', bold: true, fontSize: 9, alignment: 'left' },
                    { text: 'Reservada', bold: true, fontSize: 9, alignment: 'right' },
                    { text: 'Disponivel', bold: true, fontSize: 9, alignment: 'right' }
                ],
                ...rows.map((item) => ([
                    { text: String(item?.id_produto ?? 0), alignment: 'left' },
                    { text: String(item?.nom_produto || '-'), alignment: 'left' },
                    { text: String(item?.mar_produto || '-'), alignment: 'left' },
                    { text: String(item?.und_produto || '-'), alignment: 'left' },
                    { text: String(Number(item?.qt_reservada ?? 0)), alignment: 'right' },
                    { text: String(Number(item?.qt_disponivel ?? 0)), alignment: 'right' }
                ]))
            ];

            const document = buildTableDocument({
                title: 'RELATORIO DE ESTOQUE',
                subtitle,
                widths: ['8%', '34%', '18%', '10%', '15%', '15%'],
                body,
                orientation: 'landscape'
            });

            await sendPdfResponse(res, 'relatorio-estoque.pdf', document);

        } catch (error) {

            if (!res.headersSent) {
                res.status(Number(error.statusCode || 500)).json({
                    err: Number(error.statusCode || 500),
                    msg: error.message,
                    status: Number(error.statusCode || 500),
                    data: []
                });
            }

            GravarLog.Gravar('ControllerEstoque.Imprimir', error.stack);
        }

        void await db.Close();

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

            GravarLog.Gravar('ControllerEstoque.Editar', error.stack);
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

            GravarLog.Gravar('ControllerEstoque.Salvar', error.stack);

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

            GravarLog.Gravar('ControllerEstoque.Excluir', error.stack);

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}

export class ControllerEstoqMov {

   static async Salvar(req,res) {

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

            void await db.Connect();
            
            const entidade_negocio = obterEntidadeNegocio(req)

            const id = Number(req.body.id);
            const dt_mov = req.body.dt_mov;
            const id_produto = Number(req.body.id_produto);
            const tp_mov = String(req.body.tp_mov);
            const qt_mov = Number(req.body.qt_entrada);
            const nr_documento = String(req.body.nr_documento);
            const descricao = String(req.body.descricao);

            const estoque = new Estoque(db.connection,entidade_negocio)
            const estqmov = new Estoque_mov(db.connection,entidade_negocio);

            const rows = estqmov.FindById(id,dt_mov);

            estqmov.dt_mov = dt_mov;
            estqmov.id_produto = id_produto;
            estqmov.tp_mov = tp_mov;
            estqmov.qt_mov = qt_mov;
            estqmov.nr_documento = nr_documento;
            estqmov.descricao = descricao;

            void await estqmov.Save();

            void await estoque.FindById(id_produto)

            estoque.qt_disponivel += qt_mov;

            void await estoque.Save();

            resdata.msg = 'Entrada no estoque realizada com sucesso.'


        } catch (error) {
            resdata.err = 500;
            resdata.msg = error.message;
            resdata.status = 500;

            GravarLog.Gravar('ControllerEstoqueMov.Salvar', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }



}
