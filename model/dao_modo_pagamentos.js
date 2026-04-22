export default class ModoPagamentos {

    #conn = null;
    #found = null;
    #tb_name = 'tb_modalidade_pagamento';

    #field = {
        id: 0,
        cod_mod_pagamento: '',
        nom_mod_pagamento: '',
        cod_forma_pagamento: '',
    }
    
    constructor(connection) {

        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set cod_mod_pagamento(cod_mod_pagamento) {this.#field.cod_mod_pagamento = cod_mod_pagamento}
    get cod_mod_pagamento() {return this.#field.cod_mod_pagamento}

    set nom_mod_pagamento(nom_mod_pagamento) {this.#field.nom_mod_pagamento = nom_mod_pagamento}
    get nom_mod_pagamento() {return this.#field.nom_mod_pagamento}

    set cod_forma_pagamento(cod_forma_pagamento) {this.#field.cod_forma_pagamento = cod_forma_pagamento}
    get cod_forma_pagamento() {return this.#field.cod_forma_pagamento}
   
    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.execute(query, params);

        return rows;

    }

    async FindById(id) {
        
        const query = `SELECT * FROM ${this.#tb_name} WHERE id = :id`;
       
        const rows = await this.ExecuteQuery(query, {id});
        
        if(rows.length > 0) {
            this.#field = rows[0];
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#field;

    }

    async FindByCodModPagamento(cod_mod_pagamento) {
        
        const query = `SELECT * FROM ${this.#tb_name} WHERE cod_mod_pagamento = :cod_mod_pagamento`;
       
        const rows = await this.ExecuteQuery(query, {cod_mod_pagamento});
        
        if(rows.length > 0) {
            this.#field = rows[0];
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#field;

    }

    async Save() { 
        
        let query = null;

        if (!this.#found) {
            
            this.#field.id = await this.#NewID();

            query = `INSERT INTO ${this.#tb_name} (id, cod_mod_pagamento, nom_mod_pagamento, cod_forma_pagamento) VALUES (:id, :cod_mod_pagamento, :nom_mod_pagamento, :cod_forma_pagamento)`;
        } else
            query = `UPDATE ${this.#tb_name} SET cod_mod_pagamento = :cod_mod_pagamento, nom_mod_pagamento = :nom_mod_pagamento, cod_forma_pagamento = :cod_forma_pagamento WHERE id = :id`;
       
        void await this.ExecuteQuery(query, this.#field);
   
    }

    async Excluir() {
        
        const query = `DELETE FROM ${this.#tb_name} WHERE id = :id`;
       
        void await this.ExecuteQuery(query, {id: this.#field.id});
   
    }

    async #NewID() {
        
        const query = `SELECT IFNULL(MAX(id),0) +1  as id FROM ${this.#tb_name}`;
       
        const rows = await this.ExecuteQuery(query);
       
        return rows[0].id;
   
    }
   
}
