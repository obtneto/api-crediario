import { Router } from 'express';
import { ControllerComissoes } from '../controller/controller_comissoes.js';
import { criarMiddlewareSessao } from '../utils/RouteSessionMiddleware.js';

const router = Router();

router.use(criarMiddlewareSessao());

/**** COMISSÕES - COBRADOR ****/

// GET - Listar comissões de um cobrador com paginação e filtro de data
router.get('/listar/:id_cobrador', ControllerComissoes.ListarComissoesCobrador);

// GET - Consultar um recibo específico
router.get('/consultar/:num_recibo', ControllerComissoes.ConsultarReciboCobrador);

// POST - Salvar/Atualizar recibo de comissão
router.post('/salvar', ControllerComissoes.SalvarReciboCobrador);

// DELETE - Excluir recibo de comissão
router.delete('/excluir/:num_recibo', ControllerComissoes.ExcluirReciboCobrador);

export default router;
