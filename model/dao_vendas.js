export default class Vendas {

    #conn = null;
    #found = null;
    #tb_name = 'tb_vendas';
    #entidade_negocio = 0;

    #field = {
        id: '0',
        dt_venda: '',
        id_vendedor: 0,
        id_cobrador:null,
        id_rota: null,
        id_tipo_pag: 0,
        cpf_cliente: '',
        marca_venda: 0,
        num_recibo: null,
        referencia: '',
        val_tot_venda: 0,
        situacao: 0,
        dia_pagam: '',
        melhor_dia: '',
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

    set dt_venda(dt_venda) {this.#field.dt_venda = dt_venda}
    get dt_venda() {return this.#field.dt_venda}

    set id_vendedor(id_vendedor) {this.#field.id_vendedor = Number(id_vendedor)}
    get id_vendedor() {return Number(this.#field.id_vendedor)}

    set id_cobrador(id_cobrador) {this.#field.id_cobrador = Number(id_cobrador)}
    get id_cobrador() {return Number(this.#field.id_cobrador)}

    set id_rota(id_rota) {this.#field.id_rota = Number(id_rota)}
    get id_rota() {return Number(this.#field.id_rota)}

    set id_tipo_pag(id_tipo_pag) {this.#field.id_tipo_pag = Number(id_tipo_pag)}
    get id_tipo_pag() {return Number(this.#field.id_tipo_pag)}

    set cpf_cliente(cpf_cliente) {this.#field.cpf_cliente = cpf_cliente}
    get cpf_cliente() {return this.#field.cpf_cliente}

    set marca_venda(marca_venda) {this.#field.marca_venda = marca_venda}
    get marca_venda() {return this.#field.marca_venda}

    set num_recibo(num_recibo) {this.#field.num_recibo = Number(num_recibo)}
    get num_recibo() {return Number(this.#field.num_recibo)}

    set referencia(referencia) {this.#field.referencia = referencia}
    get referencia() {return this.#field.referencia}

    set val_tot_venda(val_tot_venda) {this.#field.val_tot_venda = parseFloat(val_tot_venda)}
    get val_tot_venda() {return parseFloat(this.#field.val_tot_venda)}

    set situacao(situacao) {this.#field.situacao = situacao}
    get situacao() {return this.#field.situacao}

    set dia_pagam(dia_pagam) {this.#field.dia_pagam = dia_pagam}
    get dia_pagam() {return this.#field.dia_pagam}

    set melhor_dia(melhor_dia) {this.#field.melhor_dia = melhor_dia}
    get melhor_dia() {return this.#field.melhor_dia}

    get entidade_negocio() {return Number(this.#entidade_negocio)}

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

            let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;

            const [rows] = await this.#conn.query(query,{id,entidade_negocio: this.#entidade_negocio});

            if (rows) {
                this.id = rows.id;
                this.dt_venda = rows.dt_venda;
                this.id_vendedor = rows.id_vendedor;
                this.id_cobrador = rows.id_cobrador;
                this.id_rota = rows.id_rota;
                this.id_tipo_pag = rows.id_tipo_pag;
                this.cpf_cliente = rows.cpf_cliente;
                this.marca_venda = rows.marca_venda;
                this.num_recibo = rows.num_recibo;
                this.referencia = rows.referencia;
                this.val_tot_venda = rows.val_tot_venda;
                this.situacao = rows.situacao;
                this.dia_pagam = rows.dia_pagam;
                this.melhor_dia = rows.melhor_dia;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;

        } catch (error) {
            throw error;
        }

    }

    async FindByCpf(cpf_cliente,id_venda) {

        try {

            let query = `SELECT * FROM ${this.#tb_name} 
            WHERE entidade_negocio = :entidade_negocio AND id_venda = :id_venda AND cpf_cliente = :cpf`;

            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#entidade_negocio,id_venda,cpf_cliente});

            if (rows) {
                this.id = rows.id;
                this.dt_venda = rows.dt_venda;
                this.id_vendedor = rows.id_vendedor;
                this.id_cobrador = rows.id_cobrador;
                this.id_rota = rows.id_rota;
                this.id_tipo_pag = rows.id_tipo_pag;
                this.cpf_cliente = rows.cpf_cliente;
                this.marca_venda = rows.marca_venda;
                this.num_recibo = rows.num_recibo;
                this.referencia = rows.referencia;
                this.val_tot_venda = rows.val_tot_venda;
                this.situacao = rows.situacao;
                this.dia_pagam = rows.dia_pagam;
                this.melhor_dia = rows.melhor_dia;                
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
                query = `UPDATE ${this.#tb_name} SET dt_venda = :dt_venda, id_vendedor = :id_vendedor, 
                id_cobrador = :id_cobrador, id_rota = :id_rota, id_tipo_pag = :id_tipo_pag, cpf_cliente = :cpf_cliente,
                marca_venda = :marca_venda, num_recibo = :num_recibo, referencia = :referencia, val_tot_venda = :val_tot_venda,
                situacao = :situacao, dia_pagam = :dia_pagam, melhor_dia = :melhor_dia
                WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            } else {

                this.id = await this.#newId();

                query = `INSERT INTO ${this.#tb_name} SET dt_venda = :dt_venda, id_vendedor = :id_vendedor, 
                id_cobrador = :id_cobrador, id_rota = :id_rota, id_tipo_pag = :id_tipo_pag, cpf_cliente = :cpf_cliente,
                marca_venda = :marca_venda, num_recibo = :num_recibo, referencia = :referencia, val_tot_venda = :val_tot_venda,
                situacao = :situacao, dia_pagam = :dia_pagam, melhor_dia = :melhor_dia, id = :id,entidade_negocio = :entidade_negocio`;
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
            
            const query_new_id =  `SELECT IFNULL(MAX(id),0) as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            
            const [rows] = await this.#conn.query(query_new_id,{entidade_negocio: this.#field.entidade_negocio});

            const query_check_ano = "SELECT ano_corrente FROM tb_check_ano WHERE id = 1";

            const [rows_check] = await this.#conn.query(query_check_ano);

            const ano_corrente = rows_check.ano_corrente;
            const ano = new Date(this.#field.dt_venda).getFullYear();

            let id = ano > ano_corrente ? '1' : String(Number(String(rows.newid).substr(8,11)) + 1);

            let x = 1
            let entidade = String(this.#field.entidade_negocio);

            while (x <= String(entidade).length) {
                
                if (x == 1) {entidade = '00' + entidade; break}
                if (x == 2) {entidade = '0' + entidade; break}
                
                x++;

            }

            while (x <= String(id).length) {

                if (x == 1) {id = '000' + id; break}
                if (x == 2) {id = '00' + id; break}
                if (x == 3) {id = '0' + id; break}
                
                x++;
            }

            return (String(ano)+entidade+id);
            
        } catch (error) {
            throw error;
        }

    }

}
