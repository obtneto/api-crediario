export default class Entidades {

    #conn = null;
    #found = null;

    #field = {
        id: 0,
        nom_entidade: '',
        nom_responsavel: '',
        num_cnpj: '',
        cel_contato: '',
        com_rota_cobranca: 0
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

    set com_rota_cobranca(com_rota_cobranca) {this.#field.com_rota_cobranca = com_rota_cobranca}
    get com_rota_cobranca() {return this.#field.com_rota_cobranca}

    async ExecuteQuery(query, params = {}) {
        try {
            const rows = await this.#conn.execute(query, params);
            return rows;
        } catch (error) {
            throw error;
        }

    }

    async FindById(id) {
        try {
            const query = `SELECT id, nom_entidade, nom_responsavel, num_cnpj, cel_contato, com_rota_cobranca
                           FROM tb_entidades
                           WHERE id = :id`;

            const [rows] = await this.#conn.query(query,{id});

            if (rows) {
                this.id = rows.id;
                this.nom_entidade = rows.nom_entidade;
                this.nom_responsavel = rows.nom_responsavel;
                this.num_cnpj = rows.num_cnpj;
                this.cel_contato = rows.cel_contato;
                this.com_rota_cobranca = rows.com_rota_cobranca;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;
        } catch (error) {
            throw error;
        }

    }

    async Save() {
        try {
            let query = null;

            if (this.#found) {
                query = `UPDATE tb_entidades SET 
                nom_entidade = :nom_entidade, nom_responsavel = :nom_responsavel, 
                num_cnpj = :num_cnpj, cel_contato = :cel_contato, com_rota_cobranca = :com_rota_cobranca 
                WHERE id = :id`;
            } else {
                query = `INSERT INTO tb_entidades SET 
                nom_entidade = :nom_entidade, nom_responsavel = :nom_responsavel, 
                num_cnpj = :num_cnpj, cel_contato = :cel_contato, 
                com_rota_cobranca = :com_rota_cobranca, id = :id`
            }

            const [rows] = await this.#conn.query(query,this.#field);

            return rows;
        } catch (error) {
            throw error;
        }

    }

    async newId() {
        try {
            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM tb_entidades`;
            const [rows] = await this.#conn.query(query);

            return rows.newid;
        } catch (error) {
            throw error;
        }

    }

}
