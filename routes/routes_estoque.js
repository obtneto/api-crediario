import {Router} from 'express';
import {ControllerEstoque,ControllerEstoqMov} from '../controller/controller_estoque.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

/**** Estoque ****/
router.get('/listar_estoque/:pesq/',ControllerEstoque.Listar);
router.get('/imprimir_estoque/:pesq',ControllerEstoque.Imprimir);
router.get('/editar_estoque/:id/:id_produto',ControllerEstoque.Editar);
router.post('/salvar_estoque',ControllerEstoque.Salvar);
router.post('/salvar_estoque_mov',ControllerEstoqMov.Salvar);

export default router
