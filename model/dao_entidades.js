export default class Entidades {

    #conn = null;
    #found = null;

    #field = {
        id: 0,
        nom_negocio: '',
        nom_responsavel: '',
        num_cnpj: '',
        cel_contato: ''
    }

    constructor(connection) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }

    get id() {return this.#field.id}

    set nom_negocio(nom_negocio) {this.#field.nom_negocio = nom_negocio}
    get nom_negocio() {return this.#field.nom_negocio}

    set nom_responsavel(nom_responsavel) {this.#field.nom_responsavel = nom_responsavel}
    get nom_responsavel() {return this.#field.nom_responsavel}

    set num_cnpj(num_cnpj) {this.#field.num_cnpj = num_cnpj}
    get num_cnpj() {return this.#field.num_cnpj}

    set cel_contato(cel_contato) {this.#field.cel_contato = cel_contato}
    get cel_contato() {return this.#field.cel_contato}

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
            const query = "SELECT id FROM tb_entidades WHERE id = :id";

            const [rows] = await this.#conn.query(query,{id});

            if (rows) {
                this.#field.id = rows.id;
                this.#field.nom_negocio = rows.nom_negocio;
                this.#field.nom_responsavel = rows.nom_responsavel;
                this.#field.num_cnpj = rows.num_cnpj;
                this.#field.cel_contato = rows.cel_contato;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? rows : this.#found;
        } catch (error) {
            throw error;
        }

    }

    async Save() {
        try {
            let query = null;

            if (this.#found) {
                query = "UPDATE tb_usuarios SET nom_completo = : nom_completo, email = :email, senha = :senha WHERE id = :id";
            } else {
                query = "INSERT INTO tb_usuarios SET nom_completo = : nom_completo, email = :email, senha = :senha, id = :id"
            }

            const [rows] = await this.#conn.query(query,this.#field);

            return rows;
        } catch (error) {
            throw error;
        }

    }

    async newId() {
        try {
            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM tb_usuario`;
            const [rows] = await this.#conn.query(query);

            return rows.newid;
        } catch (error) {
            throw error;
        }

    }

}

