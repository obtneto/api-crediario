import BaseModel from './BaseModel.js';

export default class Rotas extends BaseModel {

    constructor(connection, entidade_negocio = 0) {

        const field = {
            id: 0,
            nom_rota: '',
            entidade_negocio: '',
            ativo: 1
        }

        super(connection, 'tb_rotas', field, entidade_negocio);
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_rota(nom_rota) {this.field.nom_rota = nom_rota}
    get nom_rota() {return this.field.nom_rota}

    get entidade_negocio() {return Number(this.field.entidade_negocio)}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() {return Number(this.field.ativo)}

    async findAll() {

        const query = `SELECT * FROM tb_rotas WHERE entidade_negocio = :entidade_negocio`;
        const [rows] = await this.conn.query(query, { entidade_negocio: this.field.entidade_negocio });
        return rows;
    }
}
