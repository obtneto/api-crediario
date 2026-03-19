import {Router} from 'express';
import { ControllerComissoes } from '../controller/controller_comissoes.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/listar_adiantamentos_ativos/:id/:fieldname', ControllerComissoes.ListarAdiantamentosAtivos);
router.get('/imprimir_adiantamentos_ativos/:id/:fieldname', ControllerComissoes.ImprimirAdiantamentosAtivos);
router.get('/listar_adiantamentos_historico/', ControllerComissoes.ListarHistoricoAdiantamentos);
router.get('/editar_adiantamento/:id_adiantamento/', ControllerComissoes.EditarAdiantamento);
router.post('/salvar_adiantamento', ControllerComissoes.SalvarAdiantamento);
router.get('/excluir_adiantamento/:id_adiantamento/', ControllerComissoes.ExcluirAdiantamento);

export default router;
