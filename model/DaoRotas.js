import BaseModel from './BaseModel.js';

export default class DaoRotas extends BaseModel {

    #field = {
        id: 0,
        nom_rota: '',
        entidade_negocio: '',
        ativo: 1
    }

    constructor(connection, entidade_negocio = 0) {
        super(connection, 'tb_rotas', { ...this.#field }, entidade_negocio);
    }

    set id(id) { this.field.id = Number(id) }
    get id() { return Number(this.field.id) }

    set nom_rota(nom_rota) { 
        if (!nom_rota || nom_rota.trim() === '') {
            throw new Error('Nome da rota não pode ser vazio');
        }
        this.field.nom_rota = nom_rota 
    }
    get nom_rota() { return this.field.nom_rota }

    set ativo(ativo) { 
        if (ativo !== 0 && ativo !== 1) {
            throw new Error('Ativo deve ser 0 ou 1');
        }
        this.field.ativo = Number(ativo) 
    }
    get ativo() { return Number(this.field.ativo) }
}
