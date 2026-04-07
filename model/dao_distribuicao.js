export default class Distribuicao {

    #conn = null;
    #found = null;
    #tb_name = 'tb_distribuicao';
    #entidade_negocio = 0;

    #field = {
        id: '',
        dt_distrib: '',
        id_vendedor: 0,
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

    set id(id) {this.#field.id = String(id)}
    get id() {return String(this.#field.id)}

    set dt_distrib(dt_distrib) {this.#field.dt_distrib = dt_distrib}
    get dt_distrib() {return this.#field.dt_distrib}

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#field.id_vendedor)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {

        const rows = await this.#conn.query(query, params);

        return rows;

    }

    async FindById(id) {
        
        const query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        
        const [rows] = await this.#conn.query(query,{id,entidade_negocio:this.#entidade_negocio});

        if (rows) {
            this.id = rows.id;
            this.dt_distrib = rows.dt_distrib;
            this.id_vendedor = rows.id_vendedor;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async ListarItens(id) {

        const query = `SELECT * FROM tb_itens_distrib 
                       WHERE entidade_negocio = :entidade_negocio AND id_distrib = :id_distrib`;

        const rows = await this.#conn.query(query,{
            entidade_negocio: this.#entidade_negocio,
            id_distrib: id
        });

        return rows;

    }

    async Save() {

        let query;

        if (this.#found) {

            query = `UPDATE ${this.#tb_name} 
                     SET id_vendedor = :id_vendedor, dt_distrib = :dt_distrib
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        } else {

            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} 
                     SET dt_distrib = :dt_distrib, id_vendedor = :id_vendedor,
                     entidade_negocio = :entidade_negocio, id = :id`;
        }

        if (this.#field.id_vendedor === 0) this.#field.id_vendedor = null;

        return await this.#conn.query(query,this.#field);
            
    }

    async Excluir() {
            
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio= :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{id:this.#field.id,entidade_negocio: this.#field.entidade_negocio});      
        
    }

    async #newId() {
        
        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid 
                        FROM ${this.#tb_name} 
                        WHERE entidade_negocio = :entidade_negocio`;
        
        const [rows] = await this.#conn.query(query,{
            entidade_negocio: this.#field.entidade_negocio
        });

        const query_check_ano = "SELECT ano_corrente FROM tb_check_ano WHERE id = 1";

        const [rows_check] = await this.#conn.query(query_check_ano);

        const ano_corrente = rows_check.ano_corrente;
        const ano = new Date(this.#field.dt_distrib).getFullYear();

        const id = ano > ano_corrente ? String(ano) + '1'.padStart(4, '0') : 
        String(ano) + String(Number(String(rows.newid).substring(4,8)) + 1).padStart(4, '0');


        return String(id);

    }

}
