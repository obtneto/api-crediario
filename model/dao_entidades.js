import BaseModel from './BaseModel.js';

export default class Entidades extends BaseModel {

    constructor(connection) {
        
        const field = {
            id: 0,
            nom_entidade: '',
            nom_responsavel: '',
            num_cnpj: '',
            cel_contato: '',
            com_rota_cobranca: 0,
            cel_whatsapp_bussiness: null,
            percent_desconto_venda: 0,
            percent_desconto_cobranca: 0,
            ativo: 0
        }

        super(connection,'tb_entidades',field,999)

    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set nom_entidade(nom_entidade) {this.field.nom_entidade = nom_entidade}
    get nom_entidade() {return this.field.nom_entidade}

    set nom_negocio(nom_negocio) {this.field.nom_entidade = nom_negocio}
    get nom_negocio() {return this.field.nom_entidade}

    set nom_responsavel(nom_responsavel) {this.field.nom_responsavel = nom_responsavel}
    get nom_responsavel() {return this.field.nom_responsavel}

    set num_cnpj(num_cnpj) {this.field.num_cnpj = num_cnpj}
    get num_cnpj() {return this.field.num_cnpj}

    set cel_contato(cel_contato) {this.field.cel_contato = cel_contato}
    get cel_contato() {return this.field.cel_contato}

    set cel_whatsapp_bussiness(cel_whatsapp) {this.field.cel_whatsapp_bussiness = cel_whatsapp}
    get cel_whatsapp_bussiness() {return this.field.cel_whatsapp_bussiness}

    set percent_desconto_venda(percent) {this.field.percent_desconto_venda = parseFloat(percent)}
    get percent_desconto_venda() {return parseFloat(this.field.percent_desconto_venda)}

    set percent_desconto_cobranca(percent) {this.field.percent_desconto_cobranca = parseFloat(percent)}
    get percent_desconto_cobranca() {return parseFloat(this.field.percent_desconto_cobranca)}

    set com_rota_cobranca(com_rota_cobranca) {this.field.com_rota_cobranca = Boolean(com_rota_cobranca)}
    get com_rota_cobranca() {return Boolean(this.field.com_rota_cobranca)}

    set ativo(ativo) {this.field.ativo = Number(ativo)}
    get ativo() { return Number(this.field.ativo)}

}
