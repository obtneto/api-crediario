import { BaseController } from './BaseController.js';
import DaoRotas from './DaoRotas.js';
import Entidades from './Entidades.js';

export class ControllerRotas extends BaseController {

    static async Listar(req, res) {

        await this.executeWithDatabase(async (conn, entidade_negocio, req) => {

            const rotas = new DaoRotas(conn, entidade_negocio);
            const entidades = new Entidades(conn, entidade_negocio);

            const pesq = req.params.pesq;

            let query = `SELECT * FROM tb_rotas WHERE entidade_negocio = :entidade_negocio`;

            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_rota LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            return {

                rotas: await rotas.ExecuteQuery(query, params),
                entidades: await entidades.ExecuteQuery(
                    `SELECT id, nom_entidade FROM tb_entidades WHERE id = :id`, 
                    { id: entidade_negocio }
                )
            };

        }, req, res);
    }

    static async ListarAtivas(req, res) {

        await this.executeWithDatabase(async (conn, entidade_negocio) => {
            
            const rotas = new DaoRotas(conn, entidade_negocio);
            const entidades = new Entidades(conn, entidade_negocio);

            const pesq = req.params.pesq;

            let query = `SELECT * FROM tb_rotas WHERE entidade_negocio = :entidade_negocio AND ativo = 1`;

            const params = { entidade_negocio };

            if (pesq != "*") {
                query += ` AND nom_rota LIKE :pesq`;
                params.pesq = `%${pesq}%`;
            }

            return {
                rotas: await rotas.ExecuteQuery(query, params),
                entidades: await entidades.ExecuteQuery(
                    `SELECT id, nom_entidade FROM tb_entidades WHERE id = :id`, 
                    { id: entidade_negocio }
                )
            };

        }, req, res);
    }

    static async Editar(req, res) {

        await this.executeWithDatabase(async (conn, entidade_negocio) => {
            
            const rotas = new DaoRotas(conn, entidade_negocio);
            const id = req.params.id;
            
            return await rotas.FindById(id);

        }, req, res);

    }

    static async Salvar(req, res) {

        await this.executeWithTransaction(async (conn, entidade_negocio) => {
           
            const { id, nom_rota, ativo } = req.body;
            const rotas = new DaoRotas(conn, entidade_negocio);

            void await rotas.FindById(id);

            rotas.id = id;
            rotas.nom_rota = nom_rota;
            rotas.ativo = ativo;

            void await rotas.Save();

            return { success: true };

        }, req, res);
    }

    static async Excluir(req, res) {

        await this.executeWithTransaction(async (conn, entidade_negocio) => {
            
            const rotas = new DaoRotas(conn, entidade_negocio);
            const id = req.params.id;

            void await rotas.Excluir(id);

            return { success: true };

        }, req, res);
        
    }
}
