export default class Devolucoes{

    #conn = null;
    #found = null;
    #tb_name = 'tb_perfis';

    #fields = {
        id: 0,
        id_venda: '',
        id_produto: 0,
        dt_devolucao: '',
        qt_devolucao: 0,
        vl_unit_devo: 0,
        vl_tot_devo: 0,
        entidade_negocio: 0
    }

    constructor(connection, entidade_negocio = 0) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        if (Number(entidade_negocio) > 0) {
            this.#fields.entidade_negocio = Number(entidade_negocio);
        } else {
            throw new Error('Entidade de Negocio não fornecida.');
        }

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#fields.id = Number(id)}
    get id() {return this.#fields.id}

    set id_venda(id_venda) {this.#fields.id_venda = String(id_venda)}
    get id_venda() {return this.#fields.id_venda}

    set id_produto(id_produto) {this.#fields.id_produto = Number(id_produto)}
    get id_produto() {return this.#fields.id_produto}

    set dt_devolucao(dt_devolucao) {this.#fields.dt_devolucao = dt_devolucao}
    get dt_devolucao() {return this.#fields.dt_devolucao}

    set qt_devolucao(qt_devolucao) {this.#fields.qt_devolucao = Number(qt_devolucao)}
    get qt_devolucao() {return this.#fields.qt_devolucao}

    set vl_unit_devo(vl_unit_devo) {this.#fields.vl_unit_devo = Number(vl_unit_devo).toFixed(2)}
    get vl_unit_devo() {return this.#fields.vl_unit_devo}

    set vl_tot_devo(vl_tot_devo) {this.#fields.vl_tot_devo = Number(vl_tot_devo).toFixed(2)}
    get vl_tot_devo() {return this.#fields.vl_tot_devo}

    get entidade_negocio() {return this.#fields.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        
        try {

            const rows = await this.#conn.execute(query, params);

            return rows;

        } catch (error) {
            throw error;
        }

    }

    async FindById(id) {

        try {

            const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

            const rows = await this.#conn.query(query,{entidade_negocio: this.#fields.entidade_negocio,id});

            if (rows[0]) {
                this.#fields.id = rows[0].id;
                this.#fields.id_venda = rows[0].id_venda;
                this.#fields.id_produto = rows[0].id_produto;
                this.#fields.dt_devolucao = rows[0].dt_devolucao;
                this.#fields.qt_devolucao = rows[0].qt_devolucao;
                this.#fields.vl_unit_devo = rows[0].vl_tot_devo;
                this.#fields.vl_tot_devo = rows[0].vl_tot_devo;
                this.#found = true;
            }
            else {
                this.#found = false;
            }

            return this.#found ? rows : this.#found;
            
        } catch (error) {
            throw error;
        }

    }

    async Save() {

        try {

            let query = null;

            if (this.#found) {

                query = `UPDATE ${this.#tb_name} SET id_produto = :id_produto, dt_devoluao = :dt_devoluao, 
                qt_devolucao = :qt_devolucao, vl_tot_devo = :vl_tot_devo, vl_tot_devo = :vl_tot_devo, id_venda = :id_venda  
                WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            } else {
                
                this.#fields.id = await this.#newId();

                query = `INSERT INTO ${this.#tb_name} SET id_produto = :id_produto, dt_devoluao = :dt_devoluao, 
                qt_devolucao = :qt_devolucao, vl_tot_devo = :vl_tot_devo, vl_tot_devo = :vl_tot_devo, id_venda = :id_venda,  
                entidade_negocio = :entidade_negocio, id = :id`

            }
            
        } catch (error) {
            throw error;
        }
    }

    async Excluir(id) {
        
        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

            void await this.#conn.query(query,{entidade_negocio:this.entidade_negocio,id});
            
        } catch (error) {
            throw error;
        }
    }

    async #newId() {

        try {

            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#fields.entidade_negocio});

            return rows.newid;

        } catch (error) {
            throw error;
        }

    }
}