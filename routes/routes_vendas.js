import {Router} from 'express';
import { ControllerDistribuicao, ControllerVendas } from '../controller/controller_vendas.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

/**** Distribioções ****/
router.get('/listar_distrib/:id_vendedor/',ControllerDistribuicao.Listar);
router.get('/listar_distrib_produto/:id_vendedor/:nom_produto',ControllerDistribuicao.ListarPorProduto);
router.get('/editar_distrib/:id',ControllerDistribuicao.Editar);
router.get('/excluir_distrib/:id',ControllerDistribuicao.Excluir);
router.post('/salvar_distrib',ControllerDistribuicao.Salvar);
router.post('/retornar_distrib',ControllerDistribuicao.DevolverProduto)

/******* Vendas *******/
router.get('/listar_vendas/:id_vendedor',ControllerVendas.Listar)
router.get('/editar_venda/:id',ControllerVendas.Editar)
router.post('/salvar_venda',ControllerVendas.Salvar)
router.post('/excluir_itens_venda/:id_venda/:id_item',ControllerVendas.Excluir)

export default router
