import BaseModel from './BaseModel.js';

export default class Vendedores extends BaseModel {

    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            nom_vendedor: '',
            comissao: 0,
            cel_contato: '',
            entidade_negocio: '',
            ativo: 1
        }

        super(connection,'tb_vendedores',field,entidade_negocio)
        
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_vendedor(nom_vendedor) {this.field.nom_vendedor = nom_vendedor}
    get nom_vendedor() {return this.field.nom_vendedor}

    set comissao(comissao) {this.field.comissao = parseFloat(comissao)}
    get comissao() {return parseFloat(this.field.comissao)}

    set cel_contato(cel_contato) {this.field.cel_contato = cel_contato}
    get cel_contato() {return this.field.cel_contato}

    get entidade_negocio() {return Number(this.field.entidade_negocio)}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

}
