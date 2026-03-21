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
router.get('/excluir_adiantamento/:id_adiantamento/', ControllerComissoes.ExcluirAdiantamento);

/*****************************************
* Pagamentos de Comissoes Cobrador
******************************************/
router.get('/listar/:id_cobrador', ControllerComissoes.ListarComissoesCobrador);
router.get('/editar/:num_recibo', ControllerComissoes.EditarReciboCobrador);
router.post('/salvar', ControllerComissoes.SalvarReciboCobrador);
router.delete('/excluir/:num_recibo/:id_cobrador', ControllerComissoes.ExcluirReciboCobrador);
router.get('/listar_comissoes_nao_pagas/:id_cobrador',ControllerComissoes.ListarComissoesNaoPagasCobrador)

export default router;
