
import BaseModel from './BaseModel.js';

export default class ModoPagamentos extends BaseModel {

    #tb_name = 'tb_modalidade_pagamento';
    
    constructor(connection) {

       const field = {
            id: 0,
            cod_mod_pagamento: '',
            nom_mod_pagamento: '',
            cod_forma_pagamento: '',
        }
        
        super(connection, 'tb_modalidade_pagamento', field, 999);
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set cod_mod_pagamento(cod_mod_pagamento) {this.field.cod_mod_pagamento = cod_mod_pagamento}
    get cod_mod_pagamento() {return this.field.cod_mod_pagamento}

    set nom_mod_pagamento(nom_mod_pagamento) {this.field.nom_mod_pagamento = nom_mod_pagamento}
    get nom_mod_pagamento() {return this.field.nom_mod_pagamento}

    set cod_forma_pagamento(cod_forma_pagamento) {this.field.cod_forma_pagamento = cod_forma_pagamento}
    get cod_forma_pagamento() {return this.field.cod_forma_pagamento}

    async FindByCodModalidade(cod_modalidade) {
        
        const query = `SELECT * FROM ${this.#tb_name} WHERE cod_mod_pagamento = :cod_modalidade`;
       
        const rows = await this.ExecuteQuery(query, {cod_modalidade});
        
        if(rows.length > 0) {
            this.field = rows[0];
            this.found = true;
        } else {
            this.found = false;
        }

        return this.field;

    }
   
}
