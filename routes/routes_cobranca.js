import {Router} from 'express';
import { ControllerCobranca } from '../controller/controller_cobranca.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

router.get('/listar_cobrancas/:id/:com_rota_cobranca',ControllerCobranca.ListarCobrancas);
router.get('/listar_pagamentos/:id_venda',ControllerCobranca.ListarPagamentos);
router.post('/salvar_pagamento',ControllerCobranca.SalvarPagamento);
router.get('/excluir_pagamento/:id_pagamento/:id_venda',ControllerCobranca.ExcluirPagamento);
router.get('/desmarcar_vendas/:com_rota_cobranca/:id',ControllerCobranca.DesmarcarVendaPaga);

export default router;
