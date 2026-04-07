import { Router } from 'express';
import { ControllerStaffAuth, ControllerStaffEntidades, ControllerStaffUsuarios } from '../controller/controller_staff.js';
import { ControllerBackups } from '../controller/controller_backups.js';
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
router.get('/listar_backups', ControllerBackups.Listar);

export default router;
