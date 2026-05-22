import {Router} from 'express';
import {ControllerRelatorios} from '../controller/controllers_relatorios.js'
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/relatorio_gerencial/:anobase-:mesbase',ControllerRelatorios.RelatorioGerencial);
router.get('/relatorio_vendas_por_vendedores/:anobase/:mesbase',ControllerRelatorios.RelatorioVendasPorVendedores);
router.get('/relatorio_cobrancas_por_cobrador/:anobase/:mesbase',ControllerRelatorios.RelatorioCobrancasPorCobrador);
router.get('/consulta_de_vendas/:id_vendedor/:anobase/:mesbase',ControllerRelatorios.ConsultaDeVendas);
router.get('/consulta_de_cobrancas/:id_cobrador/:anobase/:mesbase',ControllerRelatorios.ConsultaDeCobrancas);
router.get('/impressao_gerencial/:anobase-:mesbase',ControllerRelatorios.ImpressaoGerencial);
router.get('/impressao_vendas_por_vendedores/:anobase/:mesbase',ControllerRelatorios.ImpressaoVendasPorVendedores);
router.get('/impressao_consulta_de_vendas/:id_vendedor/:anobase/:mesbase',ControllerRelatorios.ImpressaoConsultaDeVendas);
router.get('/impressao_cobrancas_por_cobrador/:anobase/:mesbase',ControllerRelatorios.ImpressaoCobrancasPorCobrador);
router.get('/impressao_consulta_de_cobrancas/:id_cobrador/:anobase/:mesbase',ControllerRelatorios.ImpressaoConsultaDeCobrancas);
router.get('/consulta_cobranca_do_cobrador/:id_cobrador/:anobase/:mesbase',ControllerRelatorios.ConsultaDeCobrancas);

export default router;
