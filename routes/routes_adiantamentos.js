import {Router} from 'express';
import { ControllerCobranca } from '../controller/controller_cobranca.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/listar_adiantamentos_ativos/:id_vendedor', ControllerCobranca.ListarAdiantamentosAtivos);
router.get('/listar_adiantamentos_historico/:id_vendedor', ControllerCobranca.ListarHistoricoAdiantamentos);
router.get('/editar_adiantamento/:id_adiantamento/:id_vendedor', ControllerCobranca.EditarAdiantamento);
router.post('/salvar_adiantamento', ControllerCobranca.SalvarAdiantamento);
router.get('/excluir_adiantamento/:id_adiantamento/:id_vendedor', ControllerCobranca.ExcluirAdiantamento);

export default router;