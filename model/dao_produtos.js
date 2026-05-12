import BaseModel from './BaseModel.js';

export default class Produtos extends BaseModel {

    constructor(connection, entidade_negocio = 0) {
       
        const field = {
            id: 0,
            nom_produto: '',
            mar_produto: '',
            und_produto: '',
            prc_vista: 0,
            prc_prazo: 0,
            estq_max: 0,
            estq_min: 0,
            entidade_negocio: 0,
            ativo: 1
        }

        super(connection, 'tb_produtos', field, entidade_negocio)

    }

    set id(id) {this.field.id = Number(id)}
    get id() {return this.field.id}

    set nom_produto(nom_produto) {this.field.nom_produto = nom_produto}
    get nom_produto() {return this.field.nom_produto}

    set mar_produto(mar_produto) {this.field.mar_produto = mar_produto}
    get mar_produto() {return this.field.mar_produto}

    set und_produto(und_produto) {this.field.und_produto = und_produto}
    get und_produto() {return this.field.und_produto}

    set prc_vista(prc_vista) {this.field.prc_vista = parseFloat(prc_vista)}
    get prc_vista() {return parseFloat(this.field.prc_vista)}

    set prc_prazo(prc_prazo) {this.field.prc_prazo = parseFloat(prc_prazo)}
    get prc_prazo() {return parseFloat(this.field.prc_prazo)}

    set estq_max(estq_max) {this.field.estq_max = Number(estq_max)}
    get estq_max() {return Number(this.field.estq_max)}

    set estq_min(estq_min) {this.field.estq_min = Number(estq_min)}
    get estq_min() {return Number(this.field.estq_min)}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

}
