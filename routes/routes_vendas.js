import {Router} from 'express';
import { ControllerDistribuicao, ControllerVendas } from '../controller/controller_vendas.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

/**** Distribioções ****/
router.get('/listar_distrib/:id_vendedor/',ControllerDistribuicao.Listar);
router.get('/listar_distrib_produto/:id_vendedor/:nom_produto',ControllerDistribuicao.ListarPorProduto);
router.get('/listar_distrib_com_saldo/:id_vendedor',ControllerDistribuicao.ListarDistruicaoComSaldo)
router.get('/imprimir_distrib/:id_vendedor',ControllerDistribuicao.Imprimir);
router.get('/editar_distrib/:id_distrib',ControllerDistribuicao.Editar);
router.delete('/distribuicao/:dt_distrib-:id_distrib', ControllerDistribuicao.Excluir);
router.post('/salvar_distrib',ControllerDistribuicao.Salvar);
//router.post('/retornar_distrib',ControllerDistribuicao.DevolverProduto)

/******* Vendas *******/
router.get('/listar_vendas/:id_vendedor',ControllerVendas.Listar)
router.get('/listar_vendas_periodo',ControllerVendas.ListarPeriodo)
router.get('/imprimir_venda/:id',ControllerVendas.Imprimir)
router.get('/destinar_venda/:com_rota_cobranca',ControllerVendas.ListarVendasDestinar)
router.get('/editar_venda/:id',ControllerVendas.Editar)
router.post('/salvar_venda',ControllerVendas.Salvar)
router.post('/excluir_itens_venda/:id_venda/:id_item',ControllerVendas.ExcluirItemVenda)
router.get('/consultar_vendas_clientes/:cpf',ControllerVendas.ConsultaVendasPorCliente)

export default router;
