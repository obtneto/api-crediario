import BaseModel from './BaseModel.js';

export default class FormaPagamento extends BaseModel {
 
    #tb_name = 'tb_forma_pagamento';
    
    constructor(connection) {
        
        const field = {
            id: 0,
            cod_forma: '',
            nom_forma: '',
            ativo: 1
        };
        
        super(connection, 'tb_forma_pagamento', field,999);
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set cod_forma(cod_forma) {this.field.cod_forma = cod_forma}
    get cod_forma() {return this.field.cod_forma}

    set nom_forma(nom_forma) {this.field.nom_forma = nom_forma}
    get nom_forma() {return this.field.nom_forma}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

    async FindByCodForma(cod_forma) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE cod_forma = :cod_forma`;

        const [rows] = await this.ExecuteQuery(query,{cod_forma});

        if (rows.length > 0) {
            this.found = true;
            this.field = rows[0];
        } else {
            this.found = false;
        }

        return this.found;

    }

}
