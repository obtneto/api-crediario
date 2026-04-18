import {Router} from 'express';
import {ControllerEntidades, 
    ControllerAuth,
    ControllerPerfis, 
    ControllerUsuarios, 
    ControllerVendedores,
    ControllerCobradores,
    ControllerProdutos,
    ControllerRotas,
    ControllerTiposPagamentos,
    ControllerModoAcessos
    
} from '../controller/controller_parametrizacao.js'

import GeoLocalizacao from '../utils/classGeoLocaliza.js';
import {criarMiddlewareSessao} from '../utils/RouteSessionMiddleware.js';

const router = Router();
router.use(criarMiddlewareSessao());

/**** Entidades de Negocios (autenticacao) ****/
router.post('/auth/session',ControllerAuth.IniciarSessao);
router.get('/auth/session',ControllerAuth.SessaoAtual);
router.post('/auth/logout',ControllerAuth.EncerrarSessao);
router.post('/auth/change-password',ControllerAuth.AlterarSenha);
router.get('/listar_entidades_publico',ControllerEntidades.Listar);
router.get('/listar_entidades',ControllerEntidades.ListarAtivos);

/**** Usuarios ****/
router.get('/listar_usuarios/:pesq/',ControllerUsuarios.Listar);
router.get('/listar_usuarios/:entidade/:pesq/',ControllerUsuarios.Listar);
router.get('/editar_usuario/:id',ControllerUsuarios.Editar);
router.get('/excluir_usuario/:id',ControllerUsuarios.Excluir);
router.post('/salvar_usuario',ControllerUsuarios.Salvar);

/**** Modo de Acessos ****/
router.get('/listar_modo_acessos_desktop',ControllerModoAcessos.ListarModoAcessosDesktop)

/**** Perfis ****/
router.get('/listar_perfis/:pesq',ControllerPerfis.Listar);
router.get('/editar_perfil/:id',ControllerPerfis.Editar);
router.get('/excluir_perfil/:id',ControllerPerfis.Excluir);
router.post('/salvar_perfil',ControllerPerfis.Salvar);
router.get('/listar_tipos_perfis',ControllerPerfis.ListarTiposPerfis);

/**** Tipos de Pagamentos ****/
router.get('/listar_tipos_pagamentos/:pesq',ControllerTiposPagamentos.Listar);
router.get('/listar_tipos_pagamentos_ativos/:pesq',ControllerTiposPagamentos.ListarAtivos);
router.get('/editar_tipos_pagamentos/:id',ControllerTiposPagamentos.Editar);
router.get('/excluir_tipos_pagamentos/:id',ControllerTiposPagamentos.Excluir);
router.post('/salvar_tipos_pagamentos',ControllerTiposPagamentos.Salvar);

/**** Vendedores ****/
router.get('/listar_vendedores/:pesq',ControllerVendedores.Listar);
router.get('/listar_vendedores_ativos/:pesq',ControllerVendedores.ListarAtivos);
router.get('/editar_vendedores/:id',ControllerVendedores.Editar);
router.get('/excluir_vendedores/:id',ControllerVendedores.Excluir);
router.post('/salvar_vendedores',ControllerVendedores.Salvar);

/**** Cobradores ****/
router.get('/listar_cobradores/:pesq',ControllerCobradores.Listar);
router.get('/listar_cobradores_ativos/:pesq',ControllerCobradores.ListarAtivos);
router.get('/editar_cobradores/:id',ControllerCobradores.Editar);
router.get('/excluir_cobradores/:id',ControllerCobradores.Excluir);
router.post('/salvar_cobradores',ControllerCobradores.Salvar);

/**** Produtos ****/
router.get('/listar_produtos/:pesq',ControllerProdutos.Listar);
router.get('/listar_produtos_ativos/:pesq',ControllerProdutos.ListarAtivos);
router.get('/editar_produtos/:id',ControllerProdutos.Editar);
router.get('/excluir_produtos/:id',ControllerProdutos.Excluir);
router.post('/salvar_produtos',ControllerProdutos.Salvar);

/**** Rotas ****/
router.get('/listar_rotas/:pesq',ControllerRotas.Listar);
router.get('/listar_rotas_ativas/:pesq',ControllerRotas.ListarAtivas);
router.get('/editar_rota/:id',ControllerRotas.Editar);
router.get('/excluir_rota/:id',ControllerRotas.Excluir);
router.post('/salvar_rota',ControllerRotas.Salvar);

/**** Geo ****/
router.get('/reverse_geocode/:lat/:lon',GeoLocalizacao.Reverse);

export default router;
