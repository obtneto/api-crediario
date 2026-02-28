export function obterEntidadeNegocio(req) {
    return Number(req.entidade_negocio || req.body?.entidade_negocio || req.params?.entidade || req.query?.entidade_negocio || 0);
}
