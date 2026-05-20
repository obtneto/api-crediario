export default class Relatorios {

    constructor(connection) {
        if (!connection) throw new Error('Conexao invalida.');
        this.connection = connection;
    }

    async consultarGerencial(anobase, mesbase) {

        const query = `SELECT * FROM vw_vendas_cobrancas
                       WHERE ano = :anobase AND mes = :mesbase`;

        return await this.connection.query(query, {anobase, mesbase});
    }

    async consultarNomeEntidade(id) {

        const query = 'SELECT nom_entidade FROM tb_entidades WHERE id = :id';

        const [entidade] = await this.connection.query(query, {id});

        return entidade?.nom_entidade ? String(entidade.nom_entidade) : '';
    }

    async VendasPorVendedores(anobase,mesbase) {

        const query = `SELECT vr.id,vr.nom_vendedor, COUNT(vd.id) as qtde_vendas,SUM(vd.val_tot_venda) as valor_vendas, AVG(vd.val_tot_venda) as valor_medio,
                       SUM(CASE WHEN vd.cod_forma_pagamento = 'AV' THEN vd.val_tot_venda ELSE 0 END) as valor_a_vista,
                       SUM(CASE WHEN vd.cod_forma_pagamento = 'AP' THEN vd.val_tot_venda ELSE 0 END) as valor_a_prazo
                       FROM tb_vendas vd
                       LEFT JOIN tb_vendedores vr ON vr.entidade_negocio = vd.entidade_negocio AND vr.id = vd.id_vendedor
                       WHERE YEAR(vd.dt_venda) = :anobase AND MONTH(vd.dt_venda) = :mesbase
                       GROUP BY vr.id,vr.nom_vendedor`;

        return await this.connection.query(query, {anobase, mesbase});
    }

}
