import {Router} from 'express';
import { ControllerCobranca } from '../controller/controller_cobranca.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/cliente_com_rota_cobranca', ControllerCobranca.ClienteComRota);
router.get('/listar_cobrancas/:id/:com_rota_cobranca',ControllerCobranca.ListarCobrancas);
router.get('/listar_cobrancas_periodo/:com_rota_cobranca',ControllerCobranca.ListarCobrancasPeriodo);
router.get('/imprimir_cobrancas_periodo/:com_rota_cobranca',ControllerCobranca.ImprimirResumoPeriodo);
router.get('/listar_pagamentos/:id_venda',ControllerCobranca.ListarPagamentos);
router.post('/salvar_pagamento',ControllerCobranca.SalvarPagamento);
router.delete('/pagamentos/:id_pagamento/:id_venda', ControllerCobranca.ExcluirPagamento);
router.post('/vendas/:com_rota_cobranca/:id/desmarcar', ControllerCobranca.DesmarcarVendaPaga);
router.post('/destinar_venda',ControllerCobranca.DestinarVendas);
router.post('/redestinar_vendas',ControllerCobranca.RedestinarVendas);
router.get('/listar_cobrancas_rota/:id_rota',ControllerCobranca.ListaCobrancaPorRota);
router.get('/listar_cobrancas_cobrador/:id_cobrador',ControllerCobranca.ListaCobrancaPorCobrador);
router.put('/vendas/:id_venda/melhor_dia/:melhor_dia', ControllerCobranca.SalvarMelhorDia);
router.get('/listar_modalidades_pagamento',ControllerCobranca.ListarModalidadesPagamento);

export default router;
