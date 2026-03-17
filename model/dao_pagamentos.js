export default class Perfis {

    #conn = null;
    #found = null;
    #tb_name = 'tb_pagamentos';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        id_venda: '',
        dt_pagamento: '',
        vl_pagamento: 0,
        id_cobrador: 0,
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

    set id_venda(id_venda) {this.#field.id_venda = String(id_venda)}
    get id_venda() {return String(this.#field.id_venda)}

    set dt_pagamento(dt_pagamento) {this.#field.dt_pagamento = String(dt_pagamento)}
    get dt_pagamento() {return String(this.#field.dt_pagamento)}

    set vl_pagamento(vl_pagamento) {this.#field.vl_pagamento = parseFloat(vl_pagamento)}
    get vl_pagamento() {return parseFloat(this.#field.vl_pagamento)}

    set id_cobrador(id_cobrador) {this.#field.id_cobrador = Number(id_cobrador)}
    get id_cobrador() {return Number(this.#field.id_cobrador)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        try {
            const rows = await this.#conn.execute(query, params);
            return rows;
        } catch (error) {
            throw error;
        }

    }

    async FindById(id_venda,id) {
        
        try {
            const query = `SELECT * FROM ${this.#tb_name} 
            WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND id = :id`;

            const [rows] = await this.#conn.query(query,{id,id_venda,entidade_negocio: this.#entidade_negocio});

            if (rows) {
                
                this.id = Number(rows.id);
                this.id_venda = String(rows.id_venda);
                this.dt_pagamento = String(rows.dt_pagamento);
                this.vl_pagamento = parseFloat(rows.vl_pagamento);
                this.id_cobrador = Number(rows.id_cobrador);

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

                query = `UPDATE ${this.#tb_name} SET dt_pagamento = :dt_pagamento, vl_pagamento = :vl_pagamento, id_cobrador = :id_cobrador
                WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND id = :id`;
                
            } else {

                this.id = await this.#newId();

                query = `INSERT INTO ${this.#tb_name} SET dt_pagamento = :dt_pagamento, vl_pagamento = :vl_pagamento, id_cobrador = :id_cobrador,
                id_venda = :id_venda, id = :id, entidade_negocio = :entidade_negocio`
            }

            return await this.#conn.query(query,this.#field);

        } catch (error) {
            throw error;
        }

    }

    async Excluir() {

        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id_venda = :id_venda AND id = :id`;

            void await this.#conn.query(query,{id:this.#field.id,id_venda:this.#field.id_venda, entidade_negocio: this.#field.entidade_negocio});
            
        } catch (error) {
            throw error;
        }

    }

    async #newId() {

        try {

            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda`;
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio, id_venda: this.#field.id_venda});

            return Number(rows.newid);

        } catch (error) {
            throw error;
        }

    }

}
