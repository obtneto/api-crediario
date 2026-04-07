export default class RestricaoCredito {

    #conn = null;
    #found = null;
    #tb_name = 'tb_restricao_credito';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        dt_restricao: '',
        cpf_cliente: null,
        id_venda : null,
        com_restricao: true,
        entidade_negocio: ''
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

    set dt_restricao(dt_restricao) {this.#field.dt_restricao = dt_restricao}
    get dt_restricao() {return this.#field.dt_restricao}

    set cpf_cliente(cpf_cliente) {this.#field.cpf_cliente = cpf_cliente}
    get cpf_cliente() {return this.#field.cpf_cliente}

    set id_venda(id_venda) {
        if (id_venda === null || id_venda === undefined) {
            this.#field.id_venda = null;
            return;
        }

        const valor = String(id_venda).trim();
        this.#field.id_venda = valor && valor.toLowerCase() !== 'null' ? valor : null;
    }
    get id_venda() {return this.#field.id_venda}

    set com_restricao(com_restricao) { this.#field.com_restricao = Boolean(com_restricao)}
    get com_restricao() {return Boolean(this.#field.com_restricao)}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);
        return rows;
        
    }

    async FindByCpf(cpf_cliente) {
        
        let query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND cpf_cliente = :cpf_cliente`;
        
        const [rows] = await this.#conn.query(query,{cpf_cliente,entidade_negocio: this.#entidade_negocio});

        if (rows) {
            this.id = Number(rows.id);
            this.dt_restricao = rows.dt_restricao;
            this.cpf_cliente = rows.cpf_cliente;
            this.id_venda = rows.id_venda;
            this.com_restricao = Boolean(rows.com_restricao);
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {

        let query;

        console.log(this.#field)

        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET dt_restricao = :dt_restricao, cpf_cliente = :cpf_cliente,
                     com_restricao = :com_restricao, id_venda = :id_venda
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        } else {
            this.#field.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET dt_restricao = :dt_restricao, cpf_cliente = :cpf_cliente,
                     com_restricao = :com_restricao, id_venda = :id_venda, entidade_negocio = :entidade_negocio, id = :id`;
        }

        return await this.#conn.query(query,this.#field);
        
    }

    async Excluir() {
            
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{
            id: this.#field.id,
            entidade_negocio: this.#field.entidade_negocio
        });  
        
    }

    async #newId() {
    
        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid 
                        FROM ${this.#tb_name} 
                        WHERE entidade_negocio = :entidade_negocio`;
                        
        const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

        return Number(rows.newid);

    }

}
