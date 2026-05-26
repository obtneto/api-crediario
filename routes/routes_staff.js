import { Router } from 'express';
import { ControllerStaffAuth, ControllerStaffEntidades, ControllerStaffUsuarios } from '../controller/controller_staff.js';
import { ControllerBackups } from '../controller/controller_backups.js';
import {ControllerFormaPagamento,ControllerModalidadePagamento} from '../controller/controller_parametrizacao.js'
import { criarMiddlewareSessaoStaff } from '../utils/StaffRouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessaoStaff());

router.post('/auth/session', ControllerStaffAuth.IniciarSessao);
router.get('/auth/session', ControllerStaffAuth.SessaoAtual);
router.post('/auth/logout', ControllerStaffAuth.EncerrarSessao);

router.get('/entidades', ControllerStaffEntidades.Listar);
router.post('/entidades', ControllerStaffEntidades.Salvar);
router.post('/entidades/:id/ativo', ControllerStaffEntidades.AtualizarStatus);

router.get('/usuarios', ControllerStaffUsuarios.Listar);
router.get('/usuarios/:id', ControllerStaffUsuarios.Editar);
router.post('/usuarios', ControllerStaffUsuarios.Salvar);
router.post('/usuarios/:id/excluir', ControllerStaffUsuarios.Excluir);
router.get('/listar_backups', ControllerBackups.ListarLocal);
router.get('/listar_backups_local', ControllerBackups.ListarLocal);
router.get('/listar_backups_mega', ControllerBackups.ListarMega);

router.get('/forma_pagamentos/listar',ControllerFormaPagamento.Listar);
router.get('/forma_pagamentos/buscar_por_id/:id',ControllerFormaPagamento.BuscarPorId);
router.get('/forma_pagamentos/buscar_por_codigo/:cod_forma',ControllerFormaPagamento.BuscarPorCodigo);
router.post('/forma_pagamentos/salvar',ControllerFormaPagamento.Salvar);
router.delete('/forma_pagamentos/excluir/:cod_forma',ControllerFormaPagamento.Excluir);

router.get('/modalidades_pagamento/listar',ControllerModalidadePagamento.Listar);
router.get('/modalidades_pagamento/buscar_por_id/:id',ControllerModalidadePagamento.BuscarPorId);
router.get('/modalidades_pagamento/buscar_por_codigo/:cod_mod',ControllerModalidadePagamento.BuscarPorCodigo);
router.post('/modalidades_pagamento/salvar',ControllerModalidadePagamento.Salvar);
router.delete('/modalidades_pagamento/excluir/:cod_mod',ControllerModalidadePagamento.Excluir);

export default router;
