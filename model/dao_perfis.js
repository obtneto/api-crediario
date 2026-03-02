export default class Perfis {

    #conn = null;
    #found = null;
    #tb_name = 'tb_perfis';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        nom_perfil: '',
        selecionar: 1,
        insert: 0,
        atualizar: 0,
        excluir: 0,
        entidade_negocio: 0
    }

    constructor(connection, entidade_negocio = 0) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        if (Number(entidade_negocio) > 0) {
            this.#entidade_negocio = Number(entidade_negocio);
        } else {
            throw new Error('Entidade de Negocio não fornecida.');
        }

        this.#field.entidade_negocio = this.#entidade_negocio;

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return this.#field.id}

    set nom_perfil(nom_perfil) {this.#field.nom_perfil = nom_perfil}
    get nom_perfil() {return this.#field.nom_perfil}

    set selecionar(selecionar) {this.#field.selecionar = Number(selecionar)}
    get selecionar() {return this.#field.selecionar}

    set inserir(inserir) {this.#field.inserir = Number(inserir)}
    get inserirt() {return this.#field.inserir}

    set atualizar(atualizar) {this.#field.atualizar = Number(atualizar)}
    get atualizar() {return this.#field.atualizar}

    set excluir(excluir) {this.#field.excluir = Number(excluir)}
    get excluir() {return this.#field.excluir}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query) {
        try {
            const rows = await this.#conn.execute(query);
            return rows;
        } catch (error) {
            throw error;
        }

    }

    async FindById(id) {
        
        try {
            const query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

            const [rows] = await this.#conn.query(query,{id,entidade_negocio: this.#entidade_negocio});

            if (rows) {
                this.#field.id = rows.id;
                this.#field.nom_perfil = rows.nom_perfil;
                this.#field.selecionar = rows.selecionar;
                this.#field.inserir = rows.inserir;
                this.#field.atualizar = rows.atualizar;
                this.#field.excluir = rows.excluir;
                
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
                query = `UPDATE ${this.#tb_name} SET nom_perfil = :nom_perfil, selecionar = :selecionar, inserir = :inserir, atualizar = :atualizar,
                excluir = :excluir WHERE entidade_negocio = :entidade_negocio id = :id`;
            } else {
                this.#field.id = await this.#newId();
                query = `INSERT INTO ${this.#tb_name} SET nom_perfil = :nom_perfil, selecionar = :selecionar, inserir = :inserir, atualizar = :atualizar,
                excluir = :excluir, id = :id, entidade_negocio = :entidade_negocio`
            }

            return await this.#conn.query(query,this.#field);
        } catch (error) {
            throw error;
        }

    }

    async Excluir(id) {
        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id = :id`;

            void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
            
        } catch (error) {
            throw error;
        }

    }

    async #newId() {
        try {
            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

            return rows.newid;
        } catch (error) {
            throw error;
        }

    }

}
