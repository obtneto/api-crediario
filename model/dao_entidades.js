export default class Entidades {

    #conn = null;
    #found = null;

    #field = {
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

    constructor(connection) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set nom_entidade(nom_entidade) {this.#field.nom_entidade = nom_entidade}
    get nom_entidade() {return this.#field.nom_entidade}

    set nom_negocio(nom_negocio) {this.#field.nom_entidade = nom_negocio}
    get nom_negocio() {return this.#field.nom_entidade}

    set nom_responsavel(nom_responsavel) {this.#field.nom_responsavel = nom_responsavel}
    get nom_responsavel() {return this.#field.nom_responsavel}

    set num_cnpj(num_cnpj) {this.#field.num_cnpj = num_cnpj}
    get num_cnpj() {return this.#field.num_cnpj}

    set cel_contato(cel_contato) {this.#field.cel_contato = cel_contato}
    get cel_contato() {return this.#field.cel_contato}

    set cel_whatsapp_bussiness(cel_whatsapp) {this.#field.cel_whatsapp_bussiness = cel_whatsapp}
    get cel_whatsapp_bussiness() {return this.#field.cel_whatsapp_bussiness}

    set percent_desconto_venda(percent) {this.#field.percent_desconto_venda = parseFloat(percent)}
    get percent_desconto_venda() {return parseFloat(this.#field.percent_desconto_venda)}

    set percent_desconto_cobranca(percent) {this.#field.percent_desconto_cobranca = parseFloat(percent)}
    get percent_desconto_cobranca() {return parseFloat(this.#field.percent_desconto_cobranca)}

    set com_rota_cobranca(com_rota_cobranca) {this.#field.com_rota_cobranca = com_rota_cobranca}
    get com_rota_cobranca() {return this.#field.com_rota_cobranca}

    set ativo(ativo) {this.#field.ativo = Number(ativo)}
    get ativo() { return Number(this.#field.ativo)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.execute(query, params);
        return rows;
        
    }

    async FindById(id) {

        const query = `SELECT * FROM tb_entidades WHERE id = :id`;

        const [rows] = await this.#conn.query(query,{id});

        if (rows) {
            this.id = rows.id;
            this.nom_entidade = rows.nom_entidade;
            this.nom_responsavel = rows.nom_responsavel;
            this.num_cnpj = rows.num_cnpj;
            this.cel_contato = rows.cel_contato;
            this.cel_whatsapp_bussiness = rows.cel_whatsapp_bussiness;
            this.com_rota_cobranca = rows.com_rota_cobranca;
            this.percent_desconto_venda = rows.percent_desconto_venda;
            this.percent_desconto_cobranca = rows.percent_desconto_cobranca;
            this.ativo = rows.ativo;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {
        
        let query;

        if (this.#found) {
            query = `UPDATE tb_entidades SET 
            nom_entidade = :nom_entidade, nom_responsavel = :nom_responsavel, cel_whatsapp_bussiness = :cel_whatsapp_bussiness, 
            num_cnpj = :num_cnpj, cel_contato = :cel_contato, com_rota_cobranca = :com_rota_cobranca,
            percent_desconto_venda = :percent_desconto_venda, percent_desconto_cobranca = :percent_desconto_cobranca, ativo = :ativo
            WHERE id = :id`;
        } else {

            this.#field.id = await this.newId()

            query = `INSERT INTO tb_entidades SET 
            nom_entidade = :nom_entidade, nom_responsavel = :nom_responsavel, 
            num_cnpj = :num_cnpj, cel_contato = :cel_contato,
            cel_whatsapp_bussiness = :cel_whatsapp_bussiness,
            percent_desconto_venda = :percent_desconto_venda,
            percent_desconto_cobranca = :percent_desconto_cobranca,
            com_rota_cobranca = :com_rota_cobranca, id = :id, ativo = :ativo`
        }

        void await this.#conn.query(query,this.#field);

    }

    async newId() {
        
        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM tb_entidades`;
        const [rows] = await this.#conn.query(query);

        return rows.newid;
        
    }

}
