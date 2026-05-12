import BaseModel from './BaseModel.js';

export default class RestricaoCredito extends BaseModel {

    #tb_name = 'tb_restricao_credito';
    #entidade_negocio = 0;

    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            dt_restricao: '',
            cpf_cliente: null,
            id_venda : null,
            com_restricao: true,
            entidade_negocio: ''
        }

        super(connection,'tb_restricao_credito',field,entidade_negocio);

        this.#entidade_negocio = entidade_negocio;

    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set dt_restricao(dt_restricao) {this.field.dt_restricao = dt_restricao}
    get dt_restricao() {return this.field.dt_restricao}

    set cpf_cliente(cpf_cliente) {this.field.cpf_cliente = cpf_cliente}
    get cpf_cliente() {return this.field.cpf_cliente}

    set id_venda(id_venda) {
        if (id_venda === null || id_venda === undefined) {
            this.field.id_venda = null;
            return;
        }

        const valor = String(id_venda).trim();
        this.field.id_venda = valor && valor.toLowerCase() !== 'null' ? valor : null;
    }
    get id_venda() {return this.field.id_venda}

    set com_restricao(com_restricao) { this.field.com_restricao = Boolean(com_restricao)}
    get com_restricao() {return Boolean(this.field.com_restricao)}

    async FindByCpf(cpf_cliente) {
        
        let query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND cpf_cliente = :cpf_cliente`;
        
        const [rows] = await this.ExecuteQuery(query,{cpf_cliente,entidade_negocio: this.#entidade_negocio});

        if (rows) {
            this.field = rows;
            this.found = true;
        } else {
            this.found = false;
        }

        return this.found ? this.field : this.found;

    }

}
