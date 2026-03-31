export default class Devolucoes{

    #conn = null;
    #found = null;
    #tb_name = 'tb_perfis';

    #fields = {
        id: 0,
        id_venda: null,
        id_produto: null,
        id_vendedor: null,
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
    get id_venda() {return String(this.#fields.id_venda)}

    set id_produto(id_produto) {this.#fields.id_produto = Number(id_produto)}
    get id_produto() {return Number(this.#fields.id_produto)}

    set id_vendedor(id_vendedor) {this.#fields.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#fields.id_vendedor)}

    set dt_devolucao(dt_devolucao) {this.#fields.dt_devolucao = dt_devolucao}
    get dt_devolucao() {return this.#fields.dt_devolucao}

    set qt_devolucao(qt_devolucao) {this.#fields.qt_devolucao = Number(qt_devolucao)}
    get qt_devolucao() {return Number(this.#fields.qt_devolucao)}

    set vl_unit_devo(vl_unit_devo) {this.#fields.vl_unit_devo = parseFloat(vl_unit_devo)}
    get vl_unit_devo() {return parseFloat(this.#fields.vl_unit_devo)}

    set vl_tot_devo(vl_tot_devo) {this.#fields.vl_tot_devo = parseFloat(vl_tot_devo)}
    get vl_tot_devo() {return parseFloat(this.#fields.vl_tot_devo)}

    get entidade_negocio() {return this.#fields.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);

        return rows;

    }

    async FindById(id) {

        const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        const rows = await this.#conn.query(query,{entidade_negocio: this.#fields.entidade_negocio,id});

        if (rows[0]) {
            this.id = rows[0].id;
            this.id_venda = rows[0].id_venda;
            this.id_produto = rows[0].id_produto;
            this.id_vendedor = rows[0].id_vendedor;
            this.dt_devolucao = rows[0].dt_devolucao;
            this.qt_devolucao = rows[0].qt_devolucao;
            this.vl_unit_devo = rows[0].vl_tot_devo;
            this.vl_tot_devo = rows[0].vl_tot_devo;
            this.#found = true;
        }
        else {
            this.#found = false;
        }

        return this.#found ? this.#fields : this.#found;
            
    }

    async Save() {

        let query;

        if (this.#found) {

            query = `UPDATE ${this.#tb_name} SET id_produto = :id_produto,id_vendedor = :id_vendedor, dt_devoluao = :dt_devoluao, 
            qt_devolucao = :qt_devolucao, vl_tot_devo = :vl_tot_devo, vl_tot_devo = :vl_tot_devo, id_venda = :id_venda  
            WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        } else {
            
            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET id_produto = :id_produto,id_vendedor = :id_vendedor, dt_devoluao = :dt_devoluao, 
            qt_devolucao = :qt_devolucao, vl_tot_devo = :vl_tot_devo, vl_tot_devo = :vl_tot_devo, id_venda = :id_venda,  
            entidade_negocio = :entidade_negocio, id = :id`

        }

        if (this.#fields.id_produto === 0) this.#fields.id_produto = null;
        if (this.#fields.id_vendedor === 0) this.#fields.id_vendedor = null;
        if (this.#fields.id_venda === '') this.#fields.id_venda = null;

        void await this.#conn.query(query,this.#fields);
            
    }

    async Excluir(id) {
            
        const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{entidade_negocio:this.entidade_negocio,id});
            
        
    }

    async #newId() {

        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
        const [rows] = await this.#conn.query(query,{entidade_negocio: this.#fields.entidade_negocio});

        return Number(rows.newid);

    }
}