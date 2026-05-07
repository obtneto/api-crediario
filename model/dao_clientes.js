import BaseModel from './BaseModel.js';

export default class Clientes extends BaseModel {

    #tb_name = 'tb_clientes';

    constructor(connection) {
        
        const field = {
            id: 0,
            cpf_cliente: '',
            nom_cliente: '',
            nom_usual: '',
            cel_cliente: '',
            end_cliente: '',
            num_cliente: '',
            bai_cliente: '',
            cid_cliente: '',
            uf_cliente: '',
            cep_cliente: '',
            lat_cliente: '',
            lon_cliente: '',
            dat_cadastro: '',
            com_restricao_credito: 0,
            entidade_negocio: 999
        };

        super(connection,'tb_clientes',field,999);
    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set cpf_cliente(cpf_cliente) {this.field.cpf_cliente = cpf_cliente}
    get cpf_cliente() {return this.field.cpf_cliente}

    set nom_cliente(nom_cliente) {this.field.nom_cliente = nom_cliente}
    get nom_cliente() {return this.field.nom_cliente}

    set nom_usual(nom_usual) {this.field.nom_usual = nom_usual}
    get nom_usual() {return this.field.nom_usual}

    set cel_cliente(cel_cliente) {this.field.cel_cliente = cel_cliente}
    get cel_cliente() {return this.field.cel_cliente}

    set end_cliente(end_cliente) {this.field.end_cliente = end_cliente}
    get end_cliente() {return this.field.end_cliente}

    set num_cliente(num_cliente) {this.field.num_cliente = num_cliente}
    get num_cliente() {return this.field.num_cliente}

    set bai_cliente(bai_cliente) {this.field.bai_cliente = bai_cliente}
    get bai_cliente() {return this.field.bai_cliente}

    set cid_cliente(cid_cliente) {this.field.cid_cliente = cid_cliente}
    get cid_cliente() {return this.field.cid_cliente}

    set uf_cliente(uf_cliente) {this.field.uf_cliente = uf_cliente}
    get uf_cliente() {return this.field.uf_cliente}

    set cep_cliente(cep_cliente) {this.field.cep_cliente = cep_cliente}
    get cep_cliente() {return this.field.cep_cliente}

    set lat_cliente(lat_cliente) {this.field.lat_cliente = lat_cliente}
    get lat_cliente() {return this.field.lat_cliente}

    set dat_cadastro(dat_cadastro) {this.field.dat_cadastro = dat_cadastro}
    get dat_cadastro() {return this.field.dat_cadastro}

    set lon_cliente(lon_cliente) {this.field.lon_cliente = lon_cliente}
    get lon_cliente() {return this.field.lon_cliente}

    set com_restricao_credito(com_restricao_credito) {this.field.com_restricao_credito = Boolean(com_restricao_credito)}
    get com_restricao_credito() {return Boolean(this.field.com_restricao_credito)}

    async FindByCpf(cpf) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE cpf_cliente = :cpf`;

        const [rows] = await this.ExecuteQuery(query,{cpf});

        if (rows) {
            this.field = rows;
            this.found = true;
        } else {
            this.found = false;
        }

        return this.found ? rows : this.found;

    }

}
