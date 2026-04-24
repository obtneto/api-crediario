import Database from '../connections/dbconn.js';
import Clientes from '../model/dao_clientes.js';
import RestricaoCredito from '../model/dao_restricao_credito.js';
import GravarLog from '../utils/GravarLog.js'; 
import CheckCPF from '../utils/DocumentValidator.js';
import { obterEntidadeNegocio } from '../utils/CheckEntidades.js';

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

            /***********************************************************
            * Obter dados do parametro e queries enviados pelo frontend
            ************************************************************/
            const pesq = String(req.params.pesq || '*').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const offset = (page - 1) * limit;

            void await db.Connect();

            /***********************************************************
            * Instanciamento das classes DAO envolvidas no procedimento
            ************************************************************/
            const clientes = new Clientes(db.connection);
            const filtroAtivo = pesq !== '*';
            const whereSql = filtroAtivo ? 'WHERE c.nom_cliente LIKE :pesq' : '';
            const queryParams = filtroAtivo ? { pesq: `%${pesq}%` } : {};

            /************************************************************
            * Execursão das queries para obter os dados do banco de dados
            *************************************************************/
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

            void await db.RollBack();
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
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

            const entidade_negocio = obterEntidadeNegocio(req);
            const cpf =  String(req.params.cpf).replace(/\D/g, '');

            void await db.Connect();

            const clientes = new Clientes(db.connection);

            const rows = await clientes.FindByCpf(cpf);

            if (!clientes.found) {
                const error = new Error('Cliente não encontrado.');
                error.statusCode = 404;
                throw error;
            }

            resdata.data = rows;
            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao editar cliente: ${error.stack}`);
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
            const numero = String(req.body.num_cliente).trim();
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
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao salvar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async Salvar_Mobile(req,res) {

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
            const numero = String(req.body.num_cliente).trim();
            const bairro = String(req.body.bai_cliente).trim().toUpperCase();
            const cidade = String(req.body.cid_cliente).trim().toUpperCase();
            const uf = String(req.body.uf_cliente).trim().toUpperCase();
            const cep = String(req.body.cep_cliente).replace(/\D/g, '');
            const latitude = String(req.body.latitude);
            const longitude = String(req.body.longitude)

            if (cpf.length !== 11 || !CheckCPF(cpf)) {
                const error = new Error('CPF invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!nome || nome === ''){
                const error = new Error('Forneça o nome do clientes');
                error.statusCode = 400;
                throw error
            }

            if (!ender || ender === ''){
                const error = new Error('Forneça o endereço do clientes');
                error.statusCode = 400;
                throw error
            }

            if (!bairro || bairro === ''){
                const error = new Error('Forneça o bairro do clientes');
                error.statusCode = 400;
                throw error
            }

            if (!cidade || cidade === ''){
                const error = new Error('Forneça a cidade do clientes');
                error.statusCode = 400;
                throw error
            }

            if (!numero || numero === ''){
                const error = new Error('Forneça o numero do endereço do clientes');
                error.statusCode = 400;
                throw error
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
            clientes.lat_cliente = latitude && latitude;
            clientes.lon_cliente = longitude && longitude;

            void await clientes.Save();

            void await db.Commit();

            resdata.msg = "Cliente Salvo com sucesso.";    

            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao salvar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async RetiraRestricao(req,res) {

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

            const entidade_negocio = obterEntidadeNegocio(req);
            const cpf =  String(req.params.cpf).replace(/\D/g, '');

            if (!cpf || !CheckCPF(cpf)) {
                const error = new Error('CPF do cliente invalido.');
                error.statusCode = 403;
                throw error; 
            }

            const restricao = new RestricaoCredito(db.connection,entidade_negocio);
            const clientes = new Clientes(db.connection);

            /***********************************************************************/
            void await restricao.FindByCpf(cpf);

            if (!restricao.found) {
                const error = new Error("Restrição do Cliente não encontrado.");
                error.statusCode = 404;
                throw error;
            }

            restricao.com_restricao = false;

            void await restricao.Save();

            /***********************************************************************
            if (restricao.id_venda) {

                void await clientes.FindByCpf(cpf);

                if (!clientes.found) {
                    const error = new Error("Cliente não encontrado.");
                    error.statusCode = 404;
                    throw error;
                }

                clientes.com_restricao_credito = false

                void await clientes.Save();
            }
            /***********************************************************************/

            void await db.Commit();

            resdata.msg = "Restrição de credito retida.";

            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao Retirae Restrição de Credito: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async EditarRestricao(req,res) {

        return res.status(410).json({
            err: 410,
            msg: 'Rota obsoleta. Utilize /salvar_restricao ou /excluir_restricao/:cpf.',
            status: 410,
            data: []
        });

    }

    static async ListarRestricoes(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                restricoes: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {

            void await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const pesq = String(req.params.pesq || '*').trim();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const offset = (page - 1) * limit;

            const restricoes = new RestricaoCredito(db.connection,entidade_negocio);
            const filtroAtivo = pesq !== '*';
            const whereSql = filtroAtivo ? 'WHERE c.nom_cliente LIKE :pesq' : '';
            const queryParams = filtroAtivo ? { pesq: `%${pesq}%` } : {};

            let query = `SELECT r.id,r.dt_restricao, r.id_venda, r.com_restricao, c.cpf_cliente, c.nom_cliente, c.nom_usual, c.cel_cliente, 
                         c.end_cliente, c.num_cliente,c.bai_cliente, c.cid_cliente, c.uf_cliente, c.cep_cliente
                         FROM tb_restricao_credito r
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = r.cpf_cliente
                         ${whereSql}
                         ORDER BY c.nom_cliente ASC, c.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.restricoes = await restricoes.ExecuteQuery(query, { ...queryParams, limit, offset });

            query = `SELECT COUNT(*) AS total
                     FROM tb_restricao_credito r
                     LEFT JOIN tb_clientes c ON c.cpf_cliente = r.cpf_cliente
                     ${whereSql}`;

            const [rows] = await restricoes.ExecuteQuery(query, queryParams);
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
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao listar restricoes de credito: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ExisteRestricao(req,res){

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            msg: '',
            status: 200,
            data: {
                com_restricao: null
            }
        }

        try {

            void await db.Connect();

            const entidade_negocio = obterEntidadeNegocio(req);
            const cpf = String(req.params.cpf || '').replace(/\D/g, '');

            if (!cpf || !CheckCPF(cpf)) {
                const error = new Error("CPF do cliente invalido.");
                error.statusCode = 403;
                throw error; 
            }

            const clientes = new Clientes(db.connection);
            const restricao = new RestricaoCredito(db.connection,entidade_negocio);

            void await clientes.FindByCpf(cpf);

            if (!clientes.found) {
                const error = new Error('Clientes não encontrado');
                error.statusCode = 404;
                throw error;
            }

            void await restricao.FindByCpf(cpf);

            if (clientes.com_restricao_credito == 1) {

                if (!restricao.found || (restricao.found && restricao.com_restricao == 1)) {
                    resdata.data.com_restricao = true;
                } else {
                    resdata.data.com_restricao = false;
                }

            } else {
                resdata.data.com_restricao = false;
            }
            
        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao editar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async SalvarRestricao(req,res) {

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

            const entidade_negocio = obterEntidadeNegocio(req);
            const cpf = String(req.body.cpf);
            const date = req.body.date;

            if (!cpf || !CheckCPF(cpf)) {
                const error = new Error('CPF invalido.');
                error.statusCode = 403;
                throw error;
            }

            const clientes = new Clientes(db.connection);
            const restricao = new RestricaoCredito(db.connection,entidade_negocio);

            void await clientes.FindByCpf(cpf);

            if (!clientes.found) {
                const error = new Error("Cliente não encontrado.");
                error.statusCode = 404;
                throw error;
            }

            if (!clientes.com_restricao_credito == 0) {
                const error = new Error("Clintes com situacao adiplente. Não pode possuir restrição de credito.");
                error.statusCode = 403;
                throw error;
            }

            void await restricao.FindByCpf(cpf);

            if (restricao.found) {
                const error = new Error('Ja existe uma restrição de cpf.');
                error.statusCode = 400;
                throw error;
            }

            restricao.dt_restricao = date;
            restricao.cpf_cliente = cpf;
            restricao.com_restricao = true;

            void await restricao.Save();

            void await db.Commit();

            resdata.msg = "Restrição Salva com sucesso."

        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao editar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }

    static async ExcluirRestricao(req,res) {

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

            const entidade_negocio = obterEntidadeNegocio(req);
            const cpf = String(req.params.cpf);

            if (!cpf || !CheckCPF(cpf)) {
                const error = new Error('CPF invalido.');
                error.statusCode = 403;
                throw error;
            }

            const restricao = new RestricaoCredito(db.connection,entidade_negocio);

            void await restricao.FindByCpf(cpf);

            if (String(restricao.id_venda || '').trim() !== '') {
                const error = new Error('Restrição gerada automaticamente pelo sistema, não pode ser excluir.');
                error.statusCode = 400;
                throw error;
            }

            void await restricao.Excluir();

            void await db.Commit();

            resdata.msg = 'Restricao excluida com sucesso.';

            
        } catch (error) {

            void await db.RollBack();

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = resdata.err === 500 ? 'Erro interno do servidor (500). Contate o administrador do sistema.' : error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.err == 500) GravarLog(`Erro ao editar cliente: ${error.stack}`);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}
