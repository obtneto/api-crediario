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

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, parms) {

        try {

            const rows = await this.#conn.execute(query, parms);

            return rows;

        } catch (error) {
            throw error;
        }
    }

    async FindById(num_recibo) {

        try {
            const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;
            const [rows] = await this.#conn.query(query, { num_recibo, entidade_negocio: this.#entidade_negocio });
            
            if (rows) {
                this.num_recibo = rows.num_recibo;
                this.dt_recibo = rows.dt_recibo;
                this.tp_recibo = rows.tp_recibo;
                this.vl_recibo = rows.vl_recibo;
                this.vl_adiant = rows.vl_adiant;

                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : null;

        } catch (error) {
            throw error;
        }
    }

    async Save() {

        try {

            let query = null;
            
            if (this.#found) {
                query = `UPDATE ${this.#tb_name} SET dt_recibo = :dt_recibo, tp_recibo = :tp_recibo, vl_recibo = :vl_recibo, vl_adiant = :vl_adiant WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;
            } else {
                query = `INSERT INTO ${this.#tb_name} (num_recibo, dt_recibo, tp_recibo, vl_recibo, vl_adiant, entidade_negocio) VALUES (:num_recibo, :dt_recibo, :tp_recibo, :vl_recibo, :vl_adiant, :entidade_negocio)`;
            }

            void await this.#conn.execute(query, this.#field);

        } catch (error) {
            throw error;
        }

    }

    async Excluir() {

        try {

            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND num_recibo = :num_recibo`;

            void await this.#conn.execute(query, { num_recibo: this.num_recibo, entidade_negocio: this.#entidade_negocio });

        } catch (error) {
            throw error;
        }

    }

    async #newId() {

        try {

            const query = `SELECT MAX(num_recibo) AS num_recibo FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;

            const [rows] = await this.#conn.query(query, { entidade_negocio: this.#entidade_negocio });

           return rows[0].num_recibo ? parseInt(rows[0].num_recibo) + 1 : 1;
           
        } catch (error) {
            throw error;
        }   

    }

}