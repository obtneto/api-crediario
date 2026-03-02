export default class ItensVendas {

    #conn = null;
    #found = null;
    #tb_name = 'tb_itens_vendas';
    #entidade_negocio = 0;

    #field = {
        entidade_negocio: 0,
        id_produto: 0,
        id: 0,
        qt_produto: 0,
        id_venda: ''
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

    set id_produto(id_produto) {this.#field.id_produto = Number(id_produto)}
    get id_produto() {return this.#field.id_produto}

    set id(id) {this.#field.id = Number(id)}
    get id() {return this.#field.id}

    set qt_produto(qt_produto) {this.#field.qt_produto = Number(qt_produto)}
    get qt_produto() {return this.#field.qt_produto}

    set id_venda(id_venda) {this.#field.id_venda = String(id_venda)}
    get id_venda() {return this.#field.id_venda}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        try {
            const rows = await this.#conn.execute(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async FindById(id, id_produto) {

        try {

            const query = `SELECT * FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto AND id = :id`;

            const [rows] = await this.#conn.query(query,{id,id_produto,entidade_negocio: this.#entidade_negocio});

            if (rows) {
                this.#field.entidade_negocio = rows.entidade_negocio;
                this.#field.id_produto = rows.id_produto;
                this.#field.id = rows.id;
                this.#field.qt_produto = rows.qt_produto;
                this.#field.id_venda = rows.id_venda;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? rows : this.#found;

        } catch (error) {
            throw error;
        }
    }

    async FindByVenda(id_venda) {

        try {

            const query = `SELECT * FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda
            ORDER BY id_produto ASC, id ASC`;

            const rows = await this.#conn.query(query,{id_venda,entidade_negocio: this.#entidade_negocio});

            return rows;

        } catch (error) {
            throw error;
        }
    }

    async Save() {

        try {

            let query = null;

            if (this.#found) {
                query = `UPDATE ${this.#tb_name} SET qt_produto = :qt_produto, id_venda = :id_venda
                WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto AND id = :id`;
            } else {
                this.#field.id = await this.#newId(this.#field.id_produto);

                query = `INSERT INTO ${this.#tb_name} SET entidade_negocio = :entidade_negocio, id_produto = :id_produto,
                id = :id, qt_produto = :qt_produto, id_venda = :id_venda`;
            }

            return await this.#conn.query(query,this.#field);

        } catch (error) {
            throw error;
        }
    }

    async Excluir(id, id_produto) {

        try {

            const query = `DELETE FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto AND id = :id`;

            void await this.#conn.query(query,{id,id_produto,entidade_negocio: this.#field.entidade_negocio});

        } catch (error) {
            throw error;
        }
    }

    async #newId(id_produto) {

        try {

            const query = `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto`;

            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio,id_produto});

            return rows.newid;

        } catch (error) {
            throw error;
        }
    }

}
