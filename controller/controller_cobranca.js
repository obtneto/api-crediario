import Database from '../connections/dbconn.js';
import GravarLog from '../utils/GravarLog.js';
import {obterEntidadeNegocio} from '../utils/CheckEntidades.js';
import Entidades from '../model/dao_entidades.js';
import Vendas from '../model/dao_vendas.js';    

export class ControllerCobranca {

    static async ListarCobrancas(req, res) {

        const db = new Database('dbcred');

        const resdata = {
            err: 0,
            status: 200,
            msg: '',
            data: {
                cobrancas: [],
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
            const com_rota_cobranca = Number(req.params.com_rota_cobranca || 0);

            const fieldname = com_rota_cobranca === 1 ? 'id_rota' : 'id_cobrador';
            const id_filter = Number(req.params?.id || 0);

            const dt_ini = String(req.query.dt_ini || '').trim();
            const dt_fim = String(req.query.dt_fim || '').trim();
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = (page - 1) * limit; 

            if (!dt_ini || !dt_fim) {
                const error = new Error('Informe data inicial e data final.');
                error.statusCode = 400;
                throw error;
            }

            if (id_filter <= 0) {
                const error = new Error(`Informe um ${fieldname} valido.`);
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

            const cobrancas = new Vendas(db.connection, entidade_negocio);
            const entidades = new Entidades(db.connection);

            let query = `SELECT v.id, v.dt_venda, c.cpf_cliente, c.nom_cliente, c.end_cliente, c.bai_cliente, c.cid_cliente, c.uf_cliente,
                                v.val_tot_venda
                         FROM tb_vendas v
                         LEFT JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                         WHERE v.dt_venda >= :dt_ini
                           AND v.dt_venda <= :dt_fim
                           AND v.${fieldname} = :id_filter
                           AND v.entidade_negocio = :entidade_negocio
                         ORDER BY v.dt_venda DESC, v.id DESC
                         LIMIT :limit OFFSET :offset`;

            resdata.data.cobrancas = await cobrancas.ExecuteQuery(query,{
                dt_ini,
                dt_fim,
                id_filter,
                limit,
                offset,
                entidade_negocio
            });

            query = `SELECT COUNT(*) AS total
                     FROM tb_vendas v
                     WHERE v.dt_venda >= :dt_ini
                       AND v.dt_venda <= :dt_fim
                       AND v.${fieldname} = :id_filter
                       AND v.entidade_negocio = :entidade_negocio`;

            const [countResult] = await cobrancas.ExecuteQuery(query,{
                dt_ini,
                dt_fim,
                id_filter,
                entidade_negocio
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

            GravarLog('ControllerCobranca.ListarCobrancas', error.stack);
        }

        void await db.Close();

        res.status(resdata.status).json(resdata);

    }
}
