export default class Comissoes {

    #conn = null;
    #found = null;
    #tb_name = 'tb_comissoes';
    #entidade_negocio = 0;

    #field = {
        num_recibo: '',
        dt_recibo: '',
        tp_recibo: '',
        vl_recibo: 0,
        vl_adiant: 0,
        id_cobrador: null,
        id_vendedor: null,
        entidade_negocio: '',
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

    set num_recibo(num_recibo) {this.#field.num_recibo = String(num_recibo)}
    get num_recibo() {return String(this.#field.num_recibo)}

    set dt_recibo(dt_recibo) {this.#field.dt_recibo = String(dt_recibo)}
    get dt_recibo() {return String(this.#field.dt_recibo)}

    set tp_recibo(tp_recibo) {this.#field.tp_recibo = String(tp_recibo)}
    get tp_recibo() {return String(this.#field.tp_recibo)}

    set vl_recibo(vl_recibo) {this.#field.vl_recibo = parseFloat(vl_recibo)}
    get vl_recibo() {return parseFloat(this.#field.vl_recibo)}

    set vl_adiant(vl_adiant) {this.#field.vl_adiant = parseFloat(vl_adiant)}
    get vl_adiant() {return parseFloat(this.#field.vl_adiant)}

    set id_cobrador(id_cobrador) {this.#field.id_cobrador = Number(id_cobrador)}
    get id_cobrador() {return Number(this.#field.id_cobrador)}

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#field.id_vendedor)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, parms) {

        const rows = await this.#conn.query(query, parms);

        return rows;

    }

    async FindById(num_recibo) {

        const query = `SELECT * FROM ${this.#tb_name} 
        WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;

        const [rows] = await this.#conn.query(query, { 
            num_recibo, 
            entidade_negocio: this.#entidade_negocio 
        });
        
        if (rows) {
            this.num_recibo = rows.num_recibo;
            this.dt_recibo = rows.dt_recibo;
            this.tp_recibo = rows.tp_recibo;
            this.vl_recibo = rows.vl_recibo;
            this.vl_adiant = rows.vl_adiant;
            this.id_cobrador = rows.id_cobrador;
            this.id_vendedor = rows.id_vendedor;

            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : null;

    }

    async Save() {

        let query;
        
        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET dt_recibo = :dt_recibo, tp_recibo = :tp_recibo,
            vl_recibo = :vl_recibo, vl_adiant = :vl_adiant, id_cobrador = :id_cobrador, id_vendedor = :id_vendedor
            WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;
        } else {

            this.num_recibo = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} (num_recibo, dt_recibo, tp_recibo, vl_recibo, 
            vl_adiant, id_cobrador,id_vendedor, entidade_negocio) 
            VALUES (:num_recibo, :dt_recibo, :tp_recibo, :vl_recibo, :vl_adiant, :id_cobrador,:id_vendedor, 
            :entidade_negocio)`;
        }

        if (this.#field.id_cobrador === 0 ) this.#field.id_cobrador = null;
        if (this.#field.id_vendedor === 0 ) this.#field.id_vendedor = null;

        void await this.#conn.execute(query, this.#field);


    }

    async Excluir() {

        const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;

        void await this.#conn.execute(query, { num_recibo: this.num_recibo, entidade_negocio: this.#entidade_negocio });

    }

    async #newId() {

        const query = `SELECT MAX(num_recibo) AS num_recibo FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;

        const [rows] = await this.#conn.query(query, { entidade_negocio: this.#entidade_negocio });

        const query_check_ano = "SELECT ano_corrente FROM tb_check_ano WHERE id = 1";

        const [rows_check] = await this.#conn.query(query_check_ano);

        const ano_corrente = rows_check.ano_corrente;
        const ano_novo = new Date(this.#field.dt_recibo).getFullYear();

        const entidade = String(this.#entidade_negocio).padStart(3, '0');

        const id = ano_novo > ano_corrente ? String(ano_novo) + entidade + '1'.padStart(3, '0') : 
        String(ano_novo) + entidade + String(Number(String(rows.num_recibo).substring(8,10)) + 1).padStart(3, '0');

        return (String(id));  

    }

}
