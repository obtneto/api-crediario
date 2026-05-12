const QUERY_RELATORIO_GERENCIAL = `
    SELECT * FROM vw_vendas_cobrancas
    WHERE ano = :anobase AND mes = :mesbase
`;

export default class Relatorios {

    constructor(connection) {
        if (!connection) throw new Error('Conexao invalida.');
        this.connection = connection;
    }

    async consultarGerencial(anobase, mesbase) {
        return await this.connection.query(QUERY_RELATORIO_GERENCIAL, {anobase, mesbase});
    }

    async consultarNomeEntidade(id) {
        const [entidade] = await this.connection.query(
            'SELECT nom_entidade FROM tb_entidades WHERE id = :id',
            {id}
        );

        return entidade?.nom_entidade ? String(entidade.nom_entidade) : '';
    }

}
