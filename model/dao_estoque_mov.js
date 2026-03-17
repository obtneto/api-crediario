export default class EstoqueMov {

    #conn = null;
    #found = null;
    #tb_name = 'tb_estoque_mov';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        dt_mov: '',
        id_produto: null,
        tp_mov: '',
        qt_mov: 0,
        nr_documento: '',
        descricao: '',
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
    get id() {return Number(this.#field.id)}

    set dt_mov(dt_mov) {this.#field.dt_mov = dt_mov}
    get dt_mov() {return this.#field.dt_mov}

    set id_produto(id_produto) {this.#field.id_produto = Number(id_produto)}
    get id_produto() {return Number(this.#field.id_produto)}

    set tp_mov(tp_mov) {this.#field.tp_mov = tp_mov}
    get tp_mov() {return this.#field.tp_mov}

    set qt_mov(qt_mov) {this.#field.qt_mov = Number(qt_mov)}
    get qt_mov() {return Number(this.#field.qt_mov)}

    set nr_documento(nr_documento) {this.#field.nr_documento = nr_documento}
    get nr_documento() {return this.#field.nr_documento}

    set descricao(descricao) {this.#field.descricao = descricao}
    get descricao() {return this.#field.descricao}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        try {
            const rows = await this.#conn.execute(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async FindById(id, dt_mov) {

        try {

            const query = `SELECT * FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND dt_mov = :dt_mov AND id = :id`;

            const [rows] = await this.#conn.query(query,{id,dt_mov,entidade_negocio: this.#entidade_negocio});

            if (rows) {
                this.id = Number(rows.id)    ;
                this.dt_mov = rows.dt_mov;
                this.id_produto = Number(rows.id_produto);
                this.tp_mov = rows.tp_mov;
                this.qt_mov = Number(rows.qt_mov)    ;
                this.nr_documento = rows.nr_documento;
                this.descricao = rows.descricao;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;

        } catch (error) {
            throw error;
        }

    }

    async Save() {

        try {

            let query = null;

            if (this.#found) {
                query = `UPDATE ${this.#tb_name} SET id_produto = :id_produto, tp_mov = :tp_mov,
                qt_mov = :qt_mov, nr_documento = :nr_documento, descricao = :descricao
                WHERE entidade_negocio = :entidade_negocio AND dt_mov = :dt_mov AND id = :id`;
            } else {

                this.id = await this.#newId(this.#field.dt_mov);

                query = `INSERT INTO ${this.#tb_name} SET id = :id, dt_mov = :dt_mov, id_produto = :id_produto,
                tp_mov = :tp_mov, qt_mov = :qt_mov, nr_documento = :nr_documento,
                descricao = :descricao, entidade_negocio = :entidade_negocio`;
            }

            if (this.#field.id_produto === 0) this.#field.id_produto = null;

            return await this.#conn.query(query,this.#field);

        } catch (error) {
            throw error;
        }

    }

    async Excluir(id, dt_mov) {

        try {

            const query = `DELETE FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND dt_mov = :dt_mov AND id = :id`;

            void await this.#conn.query(query,{id,dt_mov,entidade_negocio: this.#field.entidade_negocio});

        } catch (error) {
            throw error;
        }

    }

    async #newId(dt_mov) {

        try {

            const query = `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name}
            WHERE entidade_negocio = :entidade_negocio AND dt_mov = :dt_mov`;

            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio,dt_mov});

            return rows.newid;

        } catch (error) {
            throw error;
        }

    }

}
