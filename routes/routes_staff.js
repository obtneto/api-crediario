import { Router } from 'express';
import { ControllerStaffAuth, ControllerStaffEntidades } from '../controller/controller_staff.js';
import { criarMiddlewareSessaoStaff } from '../utils/StaffRouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessaoStaff());

router.post('/auth/session', ControllerStaffAuth.IniciarSessao);
router.get('/auth/session', ControllerStaffAuth.SessaoAtual);
router.post('/auth/logout', ControllerStaffAuth.EncerrarSessao);

router.get('/entidades', ControllerStaffEntidades.Listar);
router.post('/entidades', ControllerStaffEntidades.Salvar);
router.post('/entidades/:id/ativo', ControllerStaffEntidades.AtualizarStatus);

export default router;
