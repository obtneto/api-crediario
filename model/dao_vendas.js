export default class Vendas {

    #conn = null;
    #found = null;
    #tb_name = 'tb_vendas';
    #entidade_negocio = 0;

    #field = {
        id: '0',
        dt_venda: '',
        id_vendedor: 0,
        id_cobrador: null,
        id_rota: null,
        id_tipo_pag: 0,
        cpf_cliente: '',
        marca_venda: null,
        num_recibo: null,
        referencia: '',
        val_tot_venda: 0,
        val_desconto: 0,
        situacao: 0,
        dia_pagam: null,
        melhor_dia: null,
        ult_dat_pagamto: null,
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

    set num_recibo(num_recibo) {this.#field.num_recibo = num_recibo}
    get num_recibo() {return this.#field.num_recibo}

    set referencia(referencia) {this.#field.referencia = referencia}
    get referencia() {return this.#field.referencia}

    set val_tot_venda(val_tot_venda) {this.#field.val_tot_venda = parseFloat(val_tot_venda)}
    get val_tot_venda() {return parseFloat(this.#field.val_tot_venda)}

    set val_desconto(val_desconto) {this.#field.val_desconto = parseFloat(val_desconto)}
    get val_desconto() {return parseFloat(this.#field.val_desconto)}

    set situacao(situacao) {this.#field.situacao = Number(situacao)}
    get situacao() {return Number(this.#field.situacao)}

    set dia_pagam(dia_pagam) {this.#field.dia_pagam = dia_pagam}
    get dia_pagam() {return this.#field.dia_pagam}

    set melhor_dia(melhor_dia) {this.#field.melhor_dia = melhor_dia}
    get melhor_dia() {return this.#field.melhor_dia}

    set ult_dat_pagamto(ult_dat_pagamto) {this.#field.ult_dat_pagamto = ult_dat_pagamto}
    get ult_dat_pagamto() {return this.#field.ult_dat_pagamto}

    get entidade_negocio() {return Number(this.#entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);
        return rows;
        
    }

    async FindById(id) {

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
            this.val_desconto = rows.val_desconto;
            this.situacao = rows.situacao;
            this.dia_pagam = rows.dia_pagam;
            this.melhor_dia = rows.melhor_dia;
            this.ult_dat_pagamto = rows.ult_dat_pagamto;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async FindByCpf(cpf_cliente,id_venda) {

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
            this.val_desconto = rows.val_desconto;
            this.situacao = rows.situacao;
            this.dia_pagam = rows.dia_pagam;
            this.melhor_dia = rows.melhor_dia;
            this.ult_dat_pagamto = rows.ult_dat_pagamto;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {

        let query;

        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET dt_venda = :dt_venda, id_vendedor = :id_vendedor, 
            id_cobrador = :id_cobrador, id_rota = :id_rota, id_tipo_pag = :id_tipo_pag, cpf_cliente = :cpf_cliente,
            marca_venda = :marca_venda, num_recibo = :num_recibo, referencia = :referencia, val_tot_venda = :val_tot_venda, val_desconto = :val_desconto,
            situacao = :situacao, dia_pagam = :dia_pagam, melhor_dia = :melhor_dia, ult_dat_pagamto = :ult_dat_pagamto
            WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        } else {

            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET dt_venda = :dt_venda, id_vendedor = :id_vendedor, ult_dat_pagamto = :ult_dat_pagamto,
            id_cobrador = :id_cobrador, id_rota = :id_rota, id_tipo_pag = :id_tipo_pag, cpf_cliente = :cpf_cliente,
            marca_venda = :marca_venda, num_recibo = :num_recibo, referencia = :referencia, val_tot_venda = :val_tot_venda, val_desconto = :val_desconto,
            situacao = :situacao, dia_pagam = :dia_pagam, melhor_dia = :melhor_dia, id = :id,entidade_negocio = :entidade_negocio`;
        }

        if(this.#field.id_cobrador === 0) this.#field.id_cobrador = null;
        if(this.#field.id_rota === 0) this.#field.id_rota = null;
        if(this.#field.num_recibo === '0') this.#field.num_recibo = null;

        return await this.#conn.query(query,this.#field);
        
    }

    async Excluir(id) {
        
        const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
            
    }

    async #newId() {
        
        const query_new_id =  `SELECT IFNULL(MAX(id),0) as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
        
        const [rows] = await this.#conn.query(query_new_id,{entidade_negocio: this.#field.entidade_negocio});

        const newid = rows?.newId === 0 ?? 1;

        const query_check_ano = "SELECT ano_corrente FROM tb_check_ano WHERE id = 1";

        const [rows_check] = await this.#conn.query(query_check_ano);

        const ano_corrente = rows_check?.ano_corrente ?? new Date().getFullYear();
        const ano = new Date(this.#field.dt_venda).getFullYear();
        const entidade = String(this.#field.entidade_negocio).padStart(3, '0');

        const id = ano > ano_corrente ? String(ano) + entidade + '1'.padStart(5, '0') : 
        String(ano) + entidade + String(Number(String(newid).substring(8,12)) + 1).padStart(5, '0');

        return (String(id));

    }

}
