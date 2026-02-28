export default class Distribuicao {

    #conn = null;
    #found = null;
    #tb_name = 'tb_distribuicao';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        dt_distrib: '',
        id_vendedor: 0,
        id_produto:0,
        qt_distrib: 0,
        qt_retorno: 0,
        dt_retorno: '',
        entidade_negocio: 0
    }

    constructor(connection, entidade_negocio = 0) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        if (Number(entidade_negocio) > 0) {
            this.#entidade_negocio = Number(entidade_negocio);
        } else {
            throw new Error('Entidade de Negocio não fornecida.');
        }

        this.#field.entidade_negocio = this.#entidade_negocio;

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return this.#field.id}

    set dt_distrib(dt_distrib) {this.#field.dt_distrib = dt_distrib}
    get dt_distrib() {return this.#field.dt_distrib}

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = id_vendedor}
    get id_vendedor() {return this.#field.id_vendedor}

    set id_produto(id_produto) {this.#field.id_produto = id_produto}
    get id_produto() {return this.#field.id_produto}

    set qt_distrib(qt_distrib) {this.#field.qt_distrib = qt_distrib}
    get qt_distrib() {return this.#field.qt_distrib}

    set qt_retorno(qt_retorno) {this.#field.qt_retorno = qt_retorno}
    get qt_retorno() {return this.#field.qt_retorno}

    set dt_retorno(dt_retorno) {this.#field.dt_retorno = dt_retorno}
    get dt_retorno() {return this.#field.dt_retorno}

    get entidade_negocio() {return this.#field.entidade_negocio}

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

            let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            
            const [rows] = await this.#conn.query(query,{id,entidade_negocio:this.#entidade_negocio});

            if (rows) {
                this.#field.id = rows.id;
                this.#field.dt_distrib = rows.dt_distrib;
                this.#field.id_vendedor = rows.id_vendedor;
                this.#field.id_produto = rows.id_produto;
                this.#field.qt_distrib = rows.qt_distrib;
                this.#field.dt_retorno = rows.dt_retorno;
                this.#field.qt_retorno = rows.qt_retorno;
                this.#found = true;
            } else {
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
                query = `UPDATE ${this.#tb_name} SET dt_distrib = :dt_distrib, id_vendedor = :id_vendedor,
                id_produto = :id_produto, qt_distrib = :qt_distrib, qt_retorno = :qt_retorno, dt_retorno = :dt_retorno
                WHERE id = :id AND entidade_negocio = :entidade_negocio`;
            } else {

                this.#field.id = await this.#newId();

                query = `INSERT INTO ${this.#tb_name} SET dt_distrib = :dt_distrib, id_vendedor = :id_vendedor,
                id_produto = :id_produto,qt_distrib = :qt_distrib,qt_retorno = :qt_retorno, dt_retorno = :qt_retorno,
                entidade_negocio = :entidade_negocio, id = :id`;
            }

            return await this.#conn.query(query,this.#field);
        } catch (error) {
            throw error;
        }
    }

    async Excluir(id) {
        
        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE id = :id AND entidade_negocio= :entidade_negocio`;

            void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
            
        } catch (error) {
            throw error;
        }
    }

    async #newId() {
        
        try {
            
            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

            return rows.newid;
            
        } catch (error) {
            throw error;
        }

    }

}
