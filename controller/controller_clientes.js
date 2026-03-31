import Database from '../connections/dbconn.js';
import Clientes from '../model/dao_clientes.js';
import GravarLog from '../utils/GravarLog.js'; 
import CheckCPF from '../utils/DocumentValidator.js';

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
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const offset = (page - 1) * limit;

            void await db.Connect();

            const clientes = new Clientes(db.connection);
            const filtroAtivo = pesq !== '*';
            const whereSql = filtroAtivo ? 'WHERE c.nom_cliente LIKE :pesq' : '';
            const queryParams = filtroAtivo ? { pesq: `%${pesq}%` } : {};

            let query = `SELECT c.id, c.cpf_cliente, c.nom_cliente, c.nom_usual, c.cel_cliente, c.end_cliente, c.num_cliente,
                         c.bai_cliente, c.cid_cliente, c.uf_cliente, c.cep_cliente, c.lat_cliente, c.lon_cliente
                         FROM tb_clientes c
                         ${whereSql}
                         ORDER BY c.nom_cliente ASC, c.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.clientes = await clientes.ExecuteQuery(query, { ...queryParams, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_clientes c
                     ${whereSql}`;

            const [rows] = await clientes.ExecuteQuery(query, queryParams);
            const totalRaw = rows?.total ?? 0;
            const total = typeof totalRaw === 'bigint'
                ? Number(totalRaw)
                : Number(totalRaw || 0);

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

            if (resdata.err == 500) GravarLog(`Erro ao listar clientes: ${error.stack}`);
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

            resdata.data = rows;
            
        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

             if (resdata.err == 500) GravarLog(`Erro ao editar cliente: ${error.message}`);
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

            const cpf = String(req.body.cpf_cliente).replace(/\D/g, '');
            const nome = String(req.body.nom_cliente).trim().toUpperCase();
            const usual = String(req.body.nom_usual).trim().toUpperCase();
            const celular = String(req.body.cel_cliente).replace(/\D/g, '');
            const ender = String(req.body.end_cliente).trim().toUpperCase();
            const numero = String(req.body.num_cliente).trim().toUpperCase();
            const bairro = String(req.body.bai_cliente).trim().toUpperCase();
            const cidade = String(req.body.cid_cliente).trim().toUpperCase();
            const uf = String(req.body.uf_cliente).trim().toUpperCase();
            const cep = String(req.body.cep_cliente).replace(/\D/g, '');

            if (cpf.length !== 11 || !CheckCPF(cpf)) {
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

            void await clientes.FindByCpf(cpf);

            if (!clientes.found) {
                clientes.dat_cadastro = new Date().toLocaleString('sv-SE',{timeZone:'-03:00'});
            }

            clientes.cpf_cliente = cpf;
            clientes.nom_cliente = nome
            clientes.nom_usual = usual;
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

            if (resdata.err == 500) GravarLog(`Erro ao salvar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}
