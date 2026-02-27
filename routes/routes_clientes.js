import {Router} from 'express';
import {ControllerClientes} from '../controller/controller_clientes.js'
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

router.get('/listar_clientes/:pesq',ControllerClientes.Listar);
router.post('/salvar_cliente',ControllerClientes.Salvar);

export default router;
