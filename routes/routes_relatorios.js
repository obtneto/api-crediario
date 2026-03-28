import {Router} from 'express';
import {ControllerRelatorios} from '../controller/controllers_relatorios.js'
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/relatorio_gerencial/:anobase-:mesbase',ControllerRelatorios.RelatorioGerencial);
router.get('/impressao_gerencial/:anobase-:mesbase',ControllerRelatorios.ImpressaoGerencial);

export default router;
