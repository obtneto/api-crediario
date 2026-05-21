export default class Relatorios {

    constructor(connection,entidade_negocio) {
        if (!connection) throw new Error('Conexao invalida.');
        this.connection = connection;
        this.entidade_negocio = entidade_negocio;
    }

    async consultarGerencial(anobase, mesbase) {

        const query = `SELECT * FROM vw_vendas_cobrancas
                       WHERE ano = :anobase AND mes = :mesbase AND entidade_negocio = :entidade_negocio`;

        return await this.connection.query(query, {anobase, mesbase, entidade_negocio: this.entidade_negocio});
    }

    async consultarNomeEntidade(id) {

        const query = 'SELECT nom_entidade FROM tb_entidades WHERE id = :id';

        const [entidade] = await this.connection.query(query, {id});

        return entidade?.nom_entidade ? String(entidade.nom_entidade) : '';
    }

    async VendasPorVendedores(anobase,mesbase) {

        const query = `SELECT id,nom_vendedor,qtde_vendas,valor_vendas,valor_medio,valor_a_vista,valor_a_prazo FROM vw_vendas_por_vendedores
                       WHERE anobase = :anobase AND mesbase = :mesbase AND entidade_negocio = :entidade_negocio`;

        return await this.connection.query(query, {anobase, mesbase, entidade_negocio: this.entidade_negocio});
    }

    async CobrancasPorCobrador(anobase, mesbase) {

        const query = `SELECT id,nom_cobrador,qtde_cobrancas,valor_pagamentos,valor_medio,valor_em_dinheiro,valor_em_pix 
                       FROM vw_cobrancas_por_cobrador 
                       WHERE anobase = :anobase AND mesbase = :mesbase AND entidade_negocio = :entidade_negocio`;

        return await this.connection.query(query, {anobase, mesbase, entidade_negocio: this.entidade_negocio});
    }

    async ConsultaDeVendas(id_vendedor) {

        const query = `SELECT id,dt_venda,cpf_cliente,nome_cliente,val_tot_venda, val_entrada,val_desconto,valor_pagamentos,saldo_a_pagar,prox_pagamnt,ult_pagamnt,situacao 
                       FROM vw_vendas_do_vendedores
                       WHERE id_vendedor = :id_vendedor AND entidade_negocio = :entidade_negocio`;

        return await this.connection.query(query, {id_vendedor, entidade_negocio: this.entidade_negocio});
    }

    async ConsultarVendasdoVendedor(id_vendedor) {
        return await this.ConsultaDeVendas(id_vendedor);
    }
}
