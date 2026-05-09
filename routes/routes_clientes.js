import {Router} from 'express';
import {ControllerClientes} from '../controller/controller_clientes.js'
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

router.get('/listar_clientes/:pesq',ControllerClientes.Listar);
router.get('/editar/cliente/:cpf',ControllerClientes.Editar);
router.post('/salvar_cliente',ControllerClientes.Salvar);
router.post('/salvar_cliente_mobile',ControllerClientes.Salvar_Mobile);

router.get('/listar_restricoes/:pesq',ControllerClientes.ListarRestricoes);
router.get('/listar_restricoes_mobile/',ControllerClientes.ListarRestricoesMobile);
router.get('/inserir_restricao/:cpf',ControllerClientes.EditarRestricao);
router.post('/salvar_restricao',ControllerClientes.SalvarRestricao);
router.get('/excluir_restricao/:cpf',ControllerClientes.ExcluirRestricao);
router.get('/existe_restricao/:cpf',ControllerClientes.ExisteRestricao);
router.get('/retira_restricao/:cpf',ControllerClientes.RetiraRestricao)

export default router;
