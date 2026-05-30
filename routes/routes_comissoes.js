import { Router } from 'express';
import { ControllerComissoes } from '../controller/controller_comissoes.js';
import { criarMiddlewareSessao } from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

/*******************************************************
* Pagamentos de Adiantamentos a Cobradores e Vendedores
********************************************************/
router.get('/listar_adiantamentos_ativos/:id/:fieldname', ControllerComissoes.ListarAdiantamentosAtivos);
router.get('/imprimir_adiantamentos_ativos/:id/:fieldname', ControllerComissoes.ImprimirAdiantamentosAtivos);
router.get('/editar_adiantamento/:id_adiantamento/', ControllerComissoes.EditarAdiantamento);
router.post('/salvar_adiantamento', ControllerComissoes.SalvarAdiantamento);
router.delete('/adiantamentos/:id_adiantamento', ControllerComissoes.ExcluirAdiantamento);

 /*********************************************************
* Recibos de Pagamentos Comissões 
**********************************************************/
router.get('/listar_recibos/:num_recibo',ControllerComissoes.ListarRecibos)
router.get('/imprimir_cobrador/:num_recibo', ControllerComissoes.ImprimirReciboCobrador);
router.get('/imprimir_vendedor/:num_recibo', ControllerComissoes.ImprimirReciboVendedor);
router.get('/editar/:num_recibo', ControllerComissoes.EditarRecibo);

/*****************************************
* Pagamentos de Comissoes Cobrador
******************************************/
router.get('/listar_comissoes_cobrador/:id_cobrador', ControllerComissoes.ListarComissoesCobrador);
router.post('/salvar_recibo_cobrador', ControllerComissoes.SalvarReciboCobrador);
router.delete('/excluir/:num_recibo/:id_cobrador', ControllerComissoes.ExcluirReciboCobrador);
router.get('/listar_comissoes_nao_pagas_cobrador/:id_cobrador',ControllerComissoes.ListarComissoesNaoPagasCobrador)

/*****************************************
* Pagamentos de Comissoes Vendedor
******************************************/
router.get('/listar_comissoes_vendedor/:id_vendedor', ControllerComissoes.ListarComissoesVendedor);
router.post('/salvar_recibo_vendedor', ControllerComissoes.SalvarReciboVendedor);
router.delete('/excluir/:num_recibo/:id_vendedor', ControllerComissoes.ExcluirReciboVendedor);
router.get('/listar_comissoes_nao_pagas_vendedor/:id_vendedor',ControllerComissoes.ListarComissoesNaoPagasVendedor)

export default router;
