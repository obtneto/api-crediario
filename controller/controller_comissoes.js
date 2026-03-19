import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import Adiantamentos from '../model/dao_adiantamentos.js';

export class ControllerComissoes {

    static async ListarAdiantamentosAtivos(req,res) {
            
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                adiantamentos: []
            }
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id = Number(req.params.id || 0); 
            const fieldname = req.params.fieldname;  //id_vendedor ou id_cobrador

            if (!id || id <= 0) {
                const error = new Error('ID do cobrador ou vendedor invalido.');
                error.statusCode = 400;
                throw error;
            }
            
            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            const query = `SELECT id, dt_adiant as dt_adiantamento, vl_adiant as vl_adiantamento 
            FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND ${fieldname} = :${fieldname}
            AND num_recibo IS NULL
            ORDER BY dt_adiant DESC, id DESC`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query, { 
                entidade_negocio, 
                [fieldname]: id
            });

        } catch (error) {
            
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ListarAdiantamentos', error.stack);
            }
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);
    }
    
    static async EditarAdiantamento(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (!id_adiantamento || id_adiantamento <= 0) {
                const error = new Error('ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            resdata.data = await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                const error = new Error('Adiantamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

        } catch (error) {

            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.Editar', error.stack);
            }
            
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async SalvarAdiantamento(req,res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {

            void await db.Connect();
            
            void await db.Begin();
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const body = req.body || {};

            const id = Number(body.id || 0);
            const fieldname = body.fieldname; //id_vendedor ou id_cobrador
            const id_adiantamento = Number(body.id_adiantamento || 0);
            const vl_adiantamento = parseFloat(body.vl_adiantamento || 0);

            if (id <= 0) {
                const error = new Error('ID invalido.');
                error.statusCode = 400;
                throw error;
            }

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                adiantamentos.dt_adiant = new Date().toLocaleString('sv-SE');
            }

            fieldname === 'id_cobrador' ? adiantamentos.id_cobrador = id : adiantamentos.id_vendedor = id;
            adiantamentos.vl_adiant = vl_adiantamento;

            void await adiantamentos.Save();

            void await db.Commit();
            
            resdata.msg = 'Adiantamento registrado com sucesso.';
            
        } catch (error) {

            void await db.RollBack();
                
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;    
            resdata.status = Number(error.statusCode || 500);

            GravarLog('ControllerCobranca.SalvarAdiantamento', error.stack);
            
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async ExcluirAdiantamento(req,res) {
        
        const db = new Database('dbcred'); 
    
        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: []
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_adiantamento = Number(req.params.id_adiantamento || 0);

            if (!id_adiantamento || id_adiantamento <= 0) {
                const error = new Error('ID do adiantamento invalido.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();
            void await db.Begin();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);

            void await adiantamentos.FindById(id_adiantamento);

            if (!adiantamentos.found) {
                const error = new Error('Adiantamento nao encontrado.');
                error.statusCode = 404;
                throw error;
            }

            void await adiantamentos.Excluir();

            void await db.Commit();
            
            resdata.msg = 'Adiantamento excluido com sucesso.';
            
        } catch (error) {

            void await db.RollBack();
                
            resdata.err = Number(error.statusCode || 500);
            resdata.msg = error.message;
            resdata.status = Number(error.statusCode || 500);

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ExcluirAdiantamento', error.stack);
            }

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

    static async ListarHistoricoAdiantamentos(req,res) {
        
        const db = new Database('dbcred'); 

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
                data: {
                adiantamentos: [],
                entidades: [],
                paginacao: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    total_pages: 0
                }
            }
        }

        try {
            
            const entidade_negocio = obterEntidadeNegocio(req);
            const id_cobrador = Number(req.params.id_cobrador || 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit;

            if (!id_cobrador || id_cobrador <= 0) {
                const error = new Error('ID do cobrador invalido.');
                error.statusCode = 400;
                throw error;
            }

            if (!dt_ini || !dt_fim) {
                const error = new Error('Informe data inicial e data final.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_ini)) {
                const error = new Error('Data inicial invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dt_fim)) {
                const error = new Error('Data final invalida.');
                error.statusCode = 400;
                throw error;
            }

            if (dt_ini > dt_fim) {
                const error = new Error('Data inicial nao pode ser maior que data final.');
                error.statusCode = 400;
                throw error;
            }

            const dtIniDate = new Date(`${dt_ini}T00:00:00Z`);
            const dtFimDate = new Date(`${dt_fim}T00:00:00Z`);
            const diffMs = dtFimDate.getTime() - dtIniDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays >= 45) {
                const error = new Error('Intervalo deve ser inferior a 45 dias.');
                error.statusCode = 400;
                throw error;
            }

            void await db.Connect();

            const adiantamentos = new Adiantamentos(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            let query = `SELECT id, dt_adiantamento, vl_adiantamento, num_recibo,
            case when num_recibo is not null then 'Não Pago' else 'Pagamento Feito' end as situacao
            FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador 
            AND dt_adiantamento >= :dt_ini AND dt_adiantamento <= :dt_fim
            ORDER BY dt_adiantamento DESC, id DESC
            LIMIT :limit OFFSET :offset`;

            resdata.data.adiantamentos = await adiantamentos.ExecuteQuery(query,{
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim,
                limit,
                offset
            });

            query = `SELECT COUNT(*) AS total FROM tb_adiantamentos 
            WHERE entidade_negocio = :entidade_negocio AND id_cobrador = :id_cobrador
            AND dt_adiantamento >= :dt_ini AND dt_adiantamento <= :dt_fim`;

            const [countResult] = await adiantamentos.ExecuteQuery(query,{
                entidade_negocio,
                id_cobrador,
                dt_ini,
                dt_fim
            });

            const total = Number(countResult?.total || 0);

            query = `SELECT id,nom_entidade FROM tb_entidades WHERE id = :entidade_negocio`;

            resdata.data.entidades = await entidades.ExecuteQuery(query, { entidade_negocio });

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

            if (resdata.status === 500) {
                GravarLog('ControllerCobranca.ListarHistoricoAdiantamentos', error.stack);
            }   

        }

        void await db.Close();

        res.status(resdata.status).json(resdata);   
    }

}