import {Router} from 'express';
import { ControllerCobranca } from '../controller/controller_cobranca.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/listar_cobrancas/:id/:com_rota_cobranca',ControllerCobranca.ListarCobrancas)

export default router
