import BaseModel from './BaseModel.js';

export default class TiposPagamentos extends BaseModel {

    #tb_name = 'tb_tipos_pagamentos';

    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            nom_tipo: '',
            ativo: 0,
            dias_apos_pagamnto: 0
        }

        super(connection,'tb_tipos_pagamentos',field,entidade_negocio)
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_tipo(nom_tipo) {this.field.nom_tipo = nom_tipo}
    get nom_tipo() {return this.field.nom_tipo}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

    set dias_apos_pagamnto(dias_apos_pagamnto) {this.field.dias_apos_pagamnto = Number(dias_apos_pagamnto)}
    get dias_apos_pagamnto() {return Number(this.field.dias_apos_pagamnto)}

}
