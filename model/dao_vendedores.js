export default class Vendedores {

    #conn = null;
    #found = null;
    #tb_name = 'tb_vendedores';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        nom_vendedor: '',
        comissao: 0,
        cel_contato: '',
        entidade_negocio: '',
        ativo: 1
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
    get id() {return Number(this.#field.id)}

    set nom_vendedor(nom_vendedor) {this.#field.nom_vendedor = nom_vendedor}
    get nom_vendedor() {return this.#field.nom_vendedor}

    set comissao(comissao) {this.#field.comissao = parseFloat(comissao)}
    get comissao() {return parseFloat(this.#field.comissao)}

    set cel_contato(cel_contato) {this.#field.cel_contato = cel_contato}
    get cel_contato() {return this.#field.cel_contato}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    set ativo(ativo) {this.#field.ativo = Number(ativo)}
    get ativo() {return Number(this.#field.ativo)}

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
                this.id = rows.id;
                this.nom_vendedor = rows.nom_vendedor;
                this.comissao = rows.comissao;
                this.cel_contato = rows.cel_contato;
                this.ativo = rows.ativo;

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
                query = `UPDATE ${this.#tb_name} SET nom_vendedor = :nom_vendedor, comissao = :comissao,
                cel_contato = :cel_contato, entidade_negocio = :entidade_negocio, ativo = :ativo
                WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            } else {
                this.id = await this.#newId();
                query = `INSERT INTO ${this.#tb_name} SET nom_vendedor = :nom_vendedor, comissao = :comissao,
                cel_contato = :cel_contato, entidade_negocio = :entidade_negocio, ativo = :ativo, id = :id`;
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

            return Number(rows.newid);

        } catch (error) {
            throw error;
        }

    }

}
