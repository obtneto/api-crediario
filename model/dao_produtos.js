export default class Produtos {

    #conn = null;
    #found = null;
    #tb_name = 'tb_produtos';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        nom_produto: '',
        mar_produto: '',
        und_produto: '',
        prc_vista: 0,
        prc_prazo: 0,
        entidade_negocio: 0,
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
    get id() {return this.#field.id}

    set nom_produto(nom_produto) {this.#field.nom_produto = nom_produto}
    get nom_produto() {return this.#field.nom_produto}

    set mar_produto(mar_produto) {this.#field.mar_produto = mar_produto}
    get mar_produto() {return this.#field.mar_produto}

    set und_produto(und_produto) {this.#field.und_produto = und_produto}
    get und_produto() {return this.#field.und_produto}

    set prc_vista(prc_vista) {this.#field.prc_vista = parseFloat(prc_vista)}
    get prc_vista() {return parseFloat(this.#field.prc_vista)}

    set prc_prazo(prc_prazo) {this.#field.prc_prazo = parseFloat(prc_prazo)}
    get prc_prazo() {return parseFloat(this.#field.prc_prazo)}

    set ativo(ativo) {this.#field.ativo = Number(ativo)}
    get ativo() {return Number(this.#field.ativo)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query) {

        const rows = await this.#conn.execute(query);

        return rows;

    }

    async FindById(id) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        
        try {
            
            const [rows] = await this.#conn.query(query,{id,entidade_negocio:this.#entidade_negocio});

            if (rows) {

                this.id = rows.id;
                this.nom_produto = rows.nom_produto;
                this.mar_produto = rows.mar_produto;
                this.und_produto = rows.und_produto;
                this.prc_vista = rows.prc_vista;
                this.prc_prazo = rows.prc_prazo;
                this.ativo = rows.ativo;
                
                this.#found = true;

            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;

        } catch (error) {
            throw error
        }

    }

    async Save() {

        let query = null;

        try {
            
            if (this.#found) {

                query = `UPDATE ${this.#tb_name} SET nom_produto = :nom_produto, mar_produto = :mar_produto, und_produto = :und_produto, 
                prc_vista = :prc_vista, prc_prazo = :prc_prazo, entidade_negocio = :entidade_negocio, ativo = :ativo
                WHERE entidade_negocio = :entidade_negocio AND id = :id`;

            } else {

                this.id = await this.#newId();

                query = `INSERT INTO ${this.#tb_name} SET nom_produto = :nom_produto, mar_produto = :mar_produto, und_produto = :und_produto, 
                prc_vista = :prc_vista, prc_prazo = :prc_prazo, entidade_negocio = :entidade_negocio, ativo = :ativo, id = :id`
            }

            return await this.#conn.query(query,this.#field);
 
        } catch (error) {
            throw error
        }
        
    }

    async Excluir(id) {

        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id = :id`;

            void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});

        } catch (error) {
            throw error
        }

    }

    async #newId() {

        try {

            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

            return Number(rows.newid);

         } catch (error) {
            throw error
        }

    }


}
