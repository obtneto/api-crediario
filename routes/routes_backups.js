import {Router} from 'express';
import {ControllerBackups} from '../controller/controller_backups.js'
import {criarMiddlewareSessaoStaff} from '../utils/StaffRouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessaoStaff());

router.get('/listar_backups',ControllerBackups.Listar);

export default router;
