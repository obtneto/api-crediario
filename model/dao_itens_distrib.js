export default class ItensDistribuicoes {

    #conn = null;
    #found = null;
    #tb_name = 'tb_itens_distrib';
    #entidade_negocio = 0;

    #field = {
        id_distrib:0,
        id_produto: 0,
        id_vendedor: 0,
        qt_distrib: 0,
        entidade_negocio: 0,
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

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#field.id_vendedor)}

    set id_distrib(id_distrib) {this.#field.id_distrib = Number(id_distrib)}
    get id_distrib() {return Number(this.#field.id_distrib)}

    set qt_distrib(qt_distrib) {this.#field.qt_distrib = Number(qt_distrib)}
    get qt_distrib() {return Number(this.#field.qt_distrib)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);
        return rows;
        
    }

    async FindById(id_vendedor,id_produto) {
        
        let query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND 
                     id_vendedor = :id_vendedor AND 
                     id_produto = :id_produto`;
        
        const [rows] = await this.#conn.query(query,{id_produto,id_vendedor,entidade_negocio: this.#entidade_negocio});

        if (rows) {
            this.id_distrib = Number(rows.id_distrib);
            this.id_produto = String(rows.id_produto);
            this.qt_distrib = Number(rows.qt_distrib);
            this.id_vendedor = Number(rows.id_vendedor);
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {

        let query;

        if (this.#found) {

            query = `UPDATE ${this.#tb_name} 
                     SET qt_distrib = :qt_distrib, id_distrib = :id_distrib
                     WHERE entidade_negocio = :entidade_negocio AND id_vendedor = :id_vendedor AND id_produto = :id_produto`;
        } else {


            query = `INSERT INTO ${this.#tb_name} 
                     SET id_distrib = :id_distrib,
                     id_produto = :id_produto,
                     id_vendedor = :id_vendedor,
                     entidade_negocio = :entidade_negocio, 
                     qt_distrib = :qt_distrib`;
        }

        if (this.#field.id_produto == 0) this.#field.id_produto = null;
        if (this.#field.id_distrib == 0) this.#field.id_distrib = null;

        void await this.#conn.query(query,this.#field);
        
    }

    async Excluir() {
            
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio= :entidade_negocio AND 
                       id_vendedor = :id_vendedor AND
                       id_produto = :id_produto`;

        void await this.#conn.query(query,{
            id_vendedor: this.#field.id_vendedor,
            id_produto: this.#field.id_produto,
            entidade_negocio: this.#field.entidade_negocio});  
        
    }

}
