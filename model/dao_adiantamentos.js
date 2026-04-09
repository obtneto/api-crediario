export default class Adiantamentos {

    #conn = null;
    #found = null;
    #tb_name = 'tb_adiantamentos';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        entidade_negocio: 0,
        num_recibo: null,
        id_vendedor: 0,
        id_cobrador: 0,
        dt_adiant : '',
        vl_adiant: 0
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

    set num_recibo(num_recibo) {this.#field.num_recibo = num_recibo}
    get num_recibo() {return this.#field.num_recibo}

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#field.id_vendedor)}

    set id_cobrador(id_cobrador) {this.#field.id_cobrador = Number(id_cobrador)}
    get id_cobrador() {return Number(this.#field.id_cobrador)}

    set dt_adiant(dt_adiant) {this.#field.dt_adiant = dt_adiant}
    get dt_adiant() {return this.#field.dt_adiant}

    set vl_adiant(vl_adiant) {this.#field.vl_adiant = parseFloat(vl_adiant)}
    get vl_adiant() {return parseFloat(this.#field.vl_adiant)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);
        return rows;
        
    }

    async FindById(id) {
        
        const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        const [rows] = await this.#conn.query(query,{id,entidade_negocio: this.#entidade_negocio});

        if (rows) {
            this.id = rows.id;
            this.num_recibo = rows.num_recibo;
            this.id_vendedor = rows.id_vendedor;
            this.id_cobrador = rows.id_cobrador;
            this.dt_adiant = rows.dt_adiant;
            this.vl_adiant = rows.vl_adiant;

            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {

        let query;

        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET id_vendedor = :id_vendedor,id_cobrador = :id_cobrador, dt_adiant = :dt_adiant, 
            vl_adiant = :vl_adiant WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        } else {
            this.id = await this.#newId();
            query = `INSERT INTO ${this.#tb_name} SET num_recibo = :num_recibo, id_vendedor = :id_vendedor, id_cobrador = :id_cobrador, 
            dt_adiant = :dt_adiant, vl_adiant = :vl_adiant, id = :id, entidade_negocio = :entidade_negocio`;
        }

        if (this.#field.id_cobrador === 0) this.#field.id_cobrador = null;
        if (this.#field.id_vendedor === 0) this.#field.id_vendedor = null;

        return await this.#conn.query(query,this.#field);

    }

    async Excluir() {
 
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio= :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{
            id: this.#field.id, 
            entidade_negocio: this.#field.entidade_negocio
        });

    }

    async #newId() {

        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} 
                        WHERE entidade_negocio = :entidade_negocio`;

        const [rows] = await this.#conn.query(query,{
            entidade_negocio: this.#field.entidade_negocio,
        });

        return rows.newid;
            
    }

}
