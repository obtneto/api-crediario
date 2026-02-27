import {Router} from 'express';
import { ControllerDistribuicao } from '../controller/controller_vendas.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

/**** Usuarios ****/
router.get('/listar_distrib/:id_vendedor/',ControllerDistribuicao.Listar);
router.get('/listar_distrib_produto/:id_vendedor/:nom_produto',ControllerDistribuicao.ListarPorProduto);
router.get('/editar_distrib/:id',ControllerDistribuicao.Editar);
router.get('/excluir_distrib/:id',ControllerDistribuicao.Excluir);
router.post('/salvar_distrib',ControllerDistribuicao.Salvar);
router.post('/retornar_distrib',ControllerDistribuicao.DevolverProduto)

export default router
