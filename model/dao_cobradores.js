import BaseModel from './BaseModel.js';

export default class Cobradores extends BaseModel {

    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            nom_cobrador: '',
            comissao: 0,
            cel_contato: '',
            entidade_negocio: 0,
            ativo: 1
        };

        super(connection,'tb_cobradores',field,entidade_negocio);
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_cobrador(nom_cobrador) {this.field.nom_cobrador = nom_cobrador}
    get nom_cobrador() {return this.field.nom_cobrador}

    set comissao(comissao) {this.field.comissao = parseFloat(comissao)}
    get comissao() {return parseFloat(this.field.comissao)}

    set cel_contato(cel_contato) {this.field.cel_contato = cel_contato}
    get cel_contato() {return this.field.cel_contato}

    get entidade_negocio() {return Number(this.field.entidade_negocio)}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

}
