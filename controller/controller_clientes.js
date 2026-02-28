import Database from '../connections/dbconn.js';
import Clientes from '../model/dao_clientes.js';

export class ControllerClientes {

    static async Listar(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                clientes: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {
            const pesq = String(req.params.pesq || '*').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            void await db.Connect();

            const clientes = new Clientes(db.connection);
            const whereClause = ['1 = 1'];
            const params = {};

            if (pesq !== '*') {
                whereClause.push('c.nom_cliente LIKE :pesq');
                params.pesq = `%${pesq}%`;
            }

            let query = `SELECT c.id, c.cpf_cliente, c.nom_cliente, c.cel_cliente, c.end_cliente, c.num_cliente,
                         c.bai_cliente, c.cid_cliente, c.uf_cliente, c.cep_cliente, c.lat_cliente, c.lon_cliente
                         FROM tb_clientes c
                         WHERE ${whereClause.join(' AND ')}
                         ORDER BY c.nom_cliente ASC, c.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.clientes = await clientes.ExecuteQuery(query, { ...params, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_clientes c
                     WHERE ${whereClause.join(' AND ')}`;

            const countResult = await clientes.ExecuteQuery(query, params);
            const total = Number(Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0);
            resdata.data.paginacao = {
                page,
                limit,
                total,
                total_pages: total > 0 ? Math.ceil(total / limit) : 0
            };
        } catch (error) {
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack);
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

            const cpf = req.params.cpf;

            void await db.Connect();

            const clientes = new Clientes(db.connection);

            const rows = await clientes.FindByCpf(cpf);

            if (rows) resdata.data = rows;
            
        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack);
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

            const cpf = String(req.body?.cpf || req.body?.cpf_cliente || '').replace(/\D/g, '');
            const nome = String(req.body?.nome || req.body?.nom_cliente || '').trim().toUpperCase();
            const celular = String(req.body?.celular || req.body?.cel_cliente || '').replace(/\D/g, '');
            const ender = String(req.body?.ender || req.body?.end_cliente || '').trim().toUpperCase();
            const numero = String(req.body?.numero || req.body?.num_cliente || '').trim().toUpperCase();
            const bairro = String(req.body?.bairro || req.body?.bai_cliente || '').trim().toUpperCase();
            const cidade = String(req.body?.cidade || req.body?.cid_cliente || '').trim().toUpperCase();
            const uf = String(req.body?.uf || req.body?.uf_cliente || '').trim().toUpperCase();
            const cep = String(req.body?.cep || req.body?.cep_cliente || '').replace(/\D/g, '');

            if (cpf.length !== 11) {
                const error = new Error('CPF invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!nome) {
                const error = new Error('Nome do cliente e obrigatorio.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            void await db.Begin();

            const clientes = new Clientes(db.connection);

            void await clientes.FindByCpf(cpf)

            clientes.cpf_cliente = cpf;
            clientes.nom_cliente = nome
            clientes.cel_cliente = celular;
            clientes.end_cliente = ender;
            clientes.num_cliente = numero;
            clientes.bai_cliente = bairro;
            clientes.cid_cliente = cidade;
            clientes.uf_cliente = uf;
            clientes.cep_cliente = cep;

            void await clientes.Save();

            void await db.Commit();

            resdata.msg = "Cliente Salvo com sucesso.";    

            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            console.log(error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}
