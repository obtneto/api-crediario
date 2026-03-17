export default class Estoque {

    #conn = null;
    #found = null;
    #tb_name = 'tb_estoque';
    #entidade_negocio = 0;

    #field = {
        id_produto: 0,
        qt_reservada: 0,
        qt_disponivel: 0,
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

    set id_produto(id_produto) {this.#field.id_produto = Number(id_produto)}
    get id_produto() {return Number(this.#field.id_produto)}

    set qt_reservada(qt_reservada) {this.#field.qt_reservada = Number(qt_reservada)}
    get qt_reservada() {return Number(this.#field.qt_reservada)}

    set qt_disponivel(qt_disponivel) {this.#field.qt_disponivel = Number(qt_disponivel)}
    get qt_disponivel() {return Number(this.#field.qt_disponivel)}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query, params = {}) {

        try {

            const rows = await this.#conn.execute(query, params);

            return rows;

        } catch (error) {
            throw error;
        }

    }

    async FindById(id_produto) {
        
        try {

            const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto`;

            const [rows] = await this.#conn.query(query,{entidade_negocio:this.#entidade_negocio,id_produto});

            if (rows) {
                this.id_produto = Number(rows.id_produto);
                this.qt_reservada = Number(rows.qt_reservada);
                this.qt_disponivel = Number(rows.qt_disponivel);

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
                query = `UPDATE ${this.#tb_name} SET qt_reservada = :qt_reservada, qt_disponivel = :qt_disponivel
                WHERE entidade_negocio = :entidade_negocio AND id_produto = :id_produto`;
            } else {
                //this.#field.id = await this.#newId();
                query = `INSERT INTO ${this.#tb_name} SET id_produto = :id_produto, qt_reservada = :qt_reservada, 
                qt_disponivel = :qt_disponivel, entidade_negocio = :entidade_negocio`
            
            }

            return await this.#conn.query(query,this.#field);

        } catch (error) {
            throw error;
        }

    }

    async Excluir() {

        try {
            
            const query = `DELETE FROM ${this.#tb_name} 
            WHERE entidade_negocio= :entidade_negocio AND id_produto = :id_produto`;

            void await this.#conn.query(query,{
                entidade_negocio: this.#field.entidade_negocio,
                id_produto: this.#field.id_produto
            });
            
        } catch (error) {
            throw error;
        }

    }

}
