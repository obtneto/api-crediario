import {Router} from 'express';
import {ControllerRelatorios} from '../controller/controllers_relatorios.js'
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/relatorio_gerencial/:anobase-:mesbase',ControllerRelatorios.RelatorioGerencial);
router.get('/relatorio_vendas_por_vendedores/:anobase/:mesbase',ControllerRelatorios.RelatorioVendasPorVendedores);
router.get('/impressao_gerencial/:anobase-:mesbase',ControllerRelatorios.ImpressaoGerencial);
router.get('/impressao_vendas_por_vendedores/:anobase/:mesbase',ControllerRelatorios.ImpressaoVendasPorVendedores);

export default router;
