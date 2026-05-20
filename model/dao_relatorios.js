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

        const query = `SELECT id,nom_vendedor,qtde_vendas,valor_vendas,valor_medio,valor_a_vista,valor_a_prazo FROM vw_vendas_por_vendedores
                       WHERE anobase = :anobase AND mesbase = :mesbase`;

        return await this.connection.query(query, {anobase, mesbase});
    }

    async VendasDoVendedor(id_vendedor, anobase, mesbase) {

        const query = ``;

        return await this.connection.query(query, {id_vendedor, anobase, mesbase});
    }
}
