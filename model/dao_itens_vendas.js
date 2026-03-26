export default class ItensVendas {

    #conn = null;
    #found = null;
    #tb_name = 'tb_itens_vendas';
    #entidade_negocio = 0;

    #field = {
        entidade_negocio: 0,
        id_produto: null,
        id: 0,
        qt_produto: 0,
        vl_unit: 0,
        vl_tot_item: 0,
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
    get id_produto() {return Number(this.#field.id_produto)}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set qt_produto(qt_produto) {this.#field.qt_produto = Number(qt_produto)}
    get qt_produto() {return Number(this.#field.qt_produto)}

    set id_venda(id_venda) {this.#field.id_venda = String(id_venda)}
    get id_venda() {return this.#field.id_venda}

    set vl_unit(vl_unit) {this.#field.vl_unit = parseFloat(vl_unit)}
    get vl_unit() {return parseFloat(this.#field.vl_unit)}

    get vl_tot_item() {return parseFloat(this.vl_tot_item)}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.execute(query, params);
        return rows;
        
    }

    async FindById(id,id_venda) {

        const query = `SELECT * FROM ${this.#tb_name}
        WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND id = :id`;

        const [rows] = await this.#conn.query(query,{id,id_venda,entidade_negocio: this.#entidade_negocio});

        if (rows) {
            this.id_produto = Number(rows.id_produto);
            this.id = Number(rows.id);
            this.qt_produto = Number(rows.qt_produto);
            this.id_venda = String(rows.id_venda);
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async FindByVenda(id_venda) {

        const query = `SELECT * FROM ${this.#tb_name}
        WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda
        ORDER BY id_produto ASC, id ASC`;

        const rows = await this.#conn.query(query,{id_venda,entidade_negocio: this.#entidade_negocio});

        return rows;

    }

    async Save() {

        let query;

        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET qt_produto = :qt_produto,id_produto = :id_produto,vl_unit = :vl_unit 
            WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND id = :id`;
        } else {

            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET entidade_negocio = :entidade_negocio, id_produto = :id_produto,
            id = :id, qt_produto = :qt_produto, id_venda = :id_venda,vl_unit = :vl_unit`;
        }

        if(this.#field.id_produto === 0) this.#field.id_produto = null;

        return await this.#conn.query(query,this.#field);

    }

    async Excluir() {

        const query = `DELETE FROM ${this.#tb_name}
        WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND id = :id`;

        void await this.#conn.query(query,{
            id:this.#field.id,
            entidade_negocio: this.#field.entidade_negocio,
            id_venda:this.#field.id_venda
        });

    }

    async #newId() {

        const query = `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name}
        WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda`;

        const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio,id_venda: this.#field.id_venda});

        return Number(rows.newid);

    }

}
