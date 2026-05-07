import BaseModel from './BaseModel.js';

export default class Perfis extends BaseModel {

    #tb_name = 'tb_perfis';
    
    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            nom_perfil: '',
            cod_perfil: '',
            selecionar: 1,
            inserir: 0,
            atualizar: 0,
            excluir: 0,
            entidade_negocio: 0
        }

        super(connection,'tb_perfis',field,entidade_negocio)

    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_perfil(nom_perfil) {this.field.nom_perfil = nom_perfil}
    get nom_perfil() {return this.field.nom_perfil}

    set cod_perfil(cod_perfil) {this.field.cod_perfil = cod_perfil}
    get cod_perfil() {return this.field.cod_perfil}

    set selecionar(selecionar) {this.field.selecionar = Number(selecionar)}
    get selecionar() {return Number(this.field.selecionar)}

    set inserir(inserir) {this.field.inserir = Number(inserir)}
    get inserir() {return Number(this.field.inserir)}

    set atualizar(atualizar) {this.field.atualizar = Number(atualizar)}
    get atualizar() {return Number(this.field.atualizar)}

    set excluir(excluir) {this.field.excluir = Number(excluir)}
    get excluir() {return Number(this.field.excluir)}


}
