import BaseModel from "./BaseModel";

export default class Adiantamentos extends BaseModel {

    #conn = null;
   
    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            entidade_negocio: 0,
            num_recibo: null,
            id_vendedor: 0,
            id_cobrador: 0,
            dt_adiant : '',
            vl_adiant: 0
        }

        super(connection, 'adiantamentos', field, entidade_negocio);

        this.#conn = connection;
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set num_recibo(num_recibo) {this.field.num_recibo = String(num_recibo)}
    get num_recibo() {return String(this.field.num_recibo)}

    set id_vendedor(id_vendedor) {this.field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.field.id_vendedor)}

    set id_cobrador(id_cobrador) {this.field.id_cobrador = Number(id_cobrador)}
    get id_cobrador() {return Number(this.field.id_cobrador)}

    set dt_adiant(dt_adiant) {this.field.dt_adiant = dt_adiant}
    get dt_adiant() {return this.field.dt_adiant}

    set vl_adiant(vl_adiant) {this.field.vl_adiant = parseFloat(vl_adiant)}
    get vl_adiant() {return parseFloat(this.field.vl_adiant)}

}
