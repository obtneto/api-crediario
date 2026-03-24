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
        estq_max: 0,
        estq_min: 0,
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

    set estq_max(estq_max) {this.#field.estq_max = Number(estq_max)}
    get estq_max() {return Number(this.#field.estq_max)}

    set estq_min(estq_min) {this.#field.estq_min = Number(estq_min)}
    get estq_min() {return Number(this.#field.estq_min)}

    set ativo(ativo) {this.#field.ativo = Number(ativo)}
    get ativo() {return Number(this.#field.ativo)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {

        const rows = await this.#conn.execute(query, params);

        return rows;

    }

    async FindById(id) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            
        const [rows] = await this.#conn.query(query,{id,entidade_negocio:this.#entidade_negocio});

        if (rows) {

            this.id = rows.id;
            this.nom_produto = rows.nom_produto;
            this.mar_produto = rows.mar_produto;
            this.und_produto = rows.und_produto;
            this.prc_vista = rows.prc_vista;
            this.prc_prazo = rows.prc_prazo;
            this.estq_max = rows.estq_max;
            this.estq_min = rows.estq_min;
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

            query = `UPDATE ${this.#tb_name} SET nom_produto = :nom_produto, mar_produto = :mar_produto, 
            und_produto = :und_produto, prc_vista = :prc_vista, prc_prazo = :prc_prazo, 
            estq_max = :estq_max, estq_min = :estq_min, ativo = :ativo
            WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        } else {

            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET nom_produto = :nom_produto, mar_produto = :mar_produto, und_produto = :und_produto, 
            prc_vista = :prc_vista, prc_prazo = :prc_prazo, estq_max = :estq_max, estq_min = :estq_min,
            entidade_negocio = :entidade_negocio, ativo = :ativo, id = :id`
        }

        return await this.#conn.query(query,this.#field);
        
    }

    async Excluir(id) {
            
        const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});

    }

    async #newId() {

        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
        const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

        return Number(rows.newid);

    }

}
