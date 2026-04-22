export default class FormaPagamento {
 
    #conn = null;
    #found = null;
    #tb_name = 'tb_forma_pagamento';

    #field = {
        id: 0,
        cod_forma: '',
        nom_forma: '',
        ativo: 1
    }
    
    constructor(connection) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }
    
    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set cod_forma(cod_forma) {this.#field.cod_forma = cod_forma}
    get cod_forma() {return this.#field.cod_forma}

    set nom_forma(nom_forma) {this.#field.nom_forma = nom_forma}
    get nom_forma() {return this.#field.nom_forma}

    set ativo(ativo) {this.#field.ativo = Number(ativo)}
    get ativo() {return Number(this.#field.ativo)}
    
    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);

        return rows;

    }

    async FindById(id) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE id = :id`;

        const [rows] = await this.#conn.query(query,{id});

        if (rows.length > 0) {
            this.#found = true;
            this.#field = rows[0];
        } else {
            this.#found = false;
        }

        return this.#field;

    }

    async FindByCodForma(cod_forma) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE cod_forma = :cod_forma`;

        const [rows] = await this.#conn.query(query,{cod_forma});

        if (rows.length > 0) {
            this.#found = true;
            this.#field = rows[0];
        } else {
            this.#found = false;
        }

        return this.#found;

    }

    async Save() {

        let query =  null;

        if (this.#field.id > 0) {
            query = `UPDATE ${this.#tb_name} SET cod_forma = :cod_forma, nom_forma = :nom_forma, ativo = :ativo WHERE id = :id`;
        } else {

            this.#field.id = await this.#newID();

            query = `INSERT INTO ${this.#tb_name} SET cod_forma = :cod_forma, nom_forma = :nom_forma, ativo = :ativo, id = :id`;
        }

        void await this.#conn.query(query,this.#field);

    }

    async Excluir() {

        let query = `DELETE FROM ${this.#tb_name} WHERE cod_forma = :cod_forma`;

        void await this.#conn.query(query,{cod_forma: this.#field.cod_forma});

    }

    async #newID() {
        const [rows] = await this.#conn.query(`SELECT IFNULL(MAX(id),0) + 1 as id FROM ${this.#tb_name}`);
        return rows[0].id;
    }
}
