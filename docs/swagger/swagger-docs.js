import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.resolve(__dirname, '../../routes');
const openApiPath = path.resolve(__dirname, 'openapi.json');

const STAFF_ROUTE_FILE = 'routes_staff.js';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const TAG_BY_PATH = [
  { prefix: '/staff/auth', tag: 'Staff Auth' },
  { prefix: '/staff/entidades', tag: 'Staff Entidades' },
  { prefix: '/staff/usuarios', tag: 'Staff Usuarios' },
  { prefix: '/staff/forma_pagamentos', tag: 'Staff Forma Pagamentos' },
  { prefix: '/staff/modalidades_pagamento', tag: 'Staff Modalidades Pagamento' },
  { prefix: '/staff', tag: 'Staff' },
  { prefix: '/auth', tag: 'Autenticacao' },
  { prefix: '/listar_clientes', tag: 'Clientes' },
  { prefix: '/editar/cliente', tag: 'Clientes' },
  { prefix: '/salvar_cliente', tag: 'Clientes' },
  { prefix: '/restricoes', tag: 'Restricao Credito' },
  { prefix: '/listar_restricoes', tag: 'Restricao Credito' },
  { prefix: '/listar_distrib', tag: 'Distribuicao' },
  { prefix: '/distribuicao', tag: 'Distribuicao' },
  { prefix: '/salvar_distrib', tag: 'Distribuicao' },
  { prefix: '/listar_vendas', tag: 'Vendas' },
  { prefix: '/vendas', tag: 'Vendas' },
  { prefix: '/salvar_venda', tag: 'Vendas' },
  { prefix: '/consulta_de_vendas', tag: 'Relatorios' },
  { prefix: '/relatorio_', tag: 'Relatorios' },
  { prefix: '/impressao_', tag: 'Relatorios' },
  { prefix: '/listar_cobrancas', tag: 'Cobranca' },
  { prefix: '/salvar_pagamento', tag: 'Pagamentos' },
  { prefix: '/pagamentos', tag: 'Pagamentos' },
  { prefix: '/listar_adiantamentos', tag: 'Comissoes' },
  { prefix: '/salvar_adiantamento', tag: 'Comissoes' },
  { prefix: '/listar_comissoes', tag: 'Comissoes' },
  { prefix: '/salvar_recibo', tag: 'Comissoes' },
  { prefix: '/listar_estoque', tag: 'Estoque' },
  { prefix: '/salvar_estoque', tag: 'Estoque' },
  { prefix: '/forma_pagamentos', tag: 'Forma Pagamento' },
  { prefix: '/modalidades_pagamento', tag: 'Modalidade Pagamento' },
  { prefix: '/listar_', tag: 'Consultas' },
  { prefix: '/editar_', tag: 'Cadastros' },
  { prefix: '/salvar_', tag: 'Cadastros' },
  { prefix: '/geocode', tag: 'Geolocalizacao' },
  { prefix: '/reverse_geocode', tag: 'Geolocalizacao' },
  { prefix: '/route', tag: 'Geolocalizacao' },
];

function normalizeExpressPath(routePath) {
  return routePath
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\/+$/g, '') || '/';
}

function extractPathParams(routePath) {
  const params = new Set();
  const regex = /:([A-Za-z0-9_]+)/g;
  let match = regex.exec(routePath);

  while (match) {
    params.add(match[1]);
    match = regex.exec(routePath);
  }

  return [...params].map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: `Parametro de rota ${name}`
  }));
}

function inferTag(fullPath) {
  for (const rule of TAG_BY_PATH) {
    if (fullPath.startsWith(rule.prefix)) {
      return rule.tag;
    }
  }
  return 'Outros';
}

function inferSummary(method, fullPath) {
  const normalized = fullPath
    .replace(/\{[^}]+\}/g, '')
    .replace(/\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .join(' ')
    .replace(/_/g, ' ')
    .trim();

  const base = normalized || 'raiz';
  return `${method.toUpperCase()} ${base}`;
}

function buildOperation({ method, routePath, fullPath }) {
  const operation = {
    tags: [inferTag(fullPath)],
    summary: inferSummary(method, fullPath),
    parameters: [
      ...extractPathParams(routePath),
      {
        name: 'x-entidade-negocio',
        in: 'header',
        required: !fullPath.startsWith('/staff') && !fullPath.startsWith('/auth/session') && !fullPath.startsWith('/listar_entidades_publico'),
        schema: { type: 'string' },
        description: 'Identificador da entidade de negocio para escopo da sessao.'
      }
    ],
    responses: {
      '200': {
        description: 'Sucesso',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponse' }
          }
        }
      },
      '400': {
        description: 'Requisicao invalida',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      '403': {
        description: 'Acesso negado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      '404': {
        description: 'Recurso nao encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      '500': {
        description: 'Erro interno',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  };

  if (['post', 'put', 'patch'].includes(method)) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    };
  }

  return operation;
}

function parseRoutesFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const endpoints = [];
  const regex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;

  let match = regex.exec(content);
  while (match) {
    endpoints.push({
      method: match[1].toLowerCase(),
      routePath: match[2]
    });
    match = regex.exec(content);
  }

  return endpoints;
}

function buildOpenApiSpec() {
  const files = fs.readdirSync(routesDir).filter((file) => file.startsWith('routes_') && file.endsWith('.js'));

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Crediario API',
      version: '1.0.0',
      description: 'Especificacao gerada automaticamente a partir das rotas Express do projeto.'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Ambiente local' }
    ],
    paths: {},
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            err: { type: 'integer', example: 0 },
            msg: { type: 'string', example: 'OK' },
            status: { type: 'integer', example: 200 },
            data: {
              oneOf: [
                { type: 'array', items: { type: 'object', additionalProperties: true } },
                { type: 'object', additionalProperties: true },
                { type: 'null' }
              ]
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            err: { type: 'integer', example: 400 },
            msg: { type: 'string', example: 'Requisicao invalida.' },
            status: { type: 'integer', example: 400 },
            data: { type: 'array', items: {}, example: [] }
          },
          required: ['err', 'msg', 'status', 'data']
        }
      }
    }
  };

  for (const file of files) {
    const endpoints = parseRoutesFile(path.join(routesDir, file));
    const prefix = file === STAFF_ROUTE_FILE ? '/staff' : '';

    for (const endpoint of endpoints) {
      if (!HTTP_METHODS.includes(endpoint.method)) {
        continue;
      }

      const openApiPath = normalizeExpressPath(`${prefix}${endpoint.routePath}`);
      if (!spec.paths[openApiPath]) {
        spec.paths[openApiPath] = {};
      }

      spec.paths[openApiPath][endpoint.method] = buildOperation({
        method: endpoint.method,
        routePath: endpoint.routePath,
        fullPath: openApiPath
      });
    }
  }

  return spec;
}

export function generateOpenApiSpec() {
  return buildOpenApiSpec();
}

export function generateAndSaveOpenApiSpec() {
  const spec = buildOpenApiSpec();
  fs.writeFileSync(openApiPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  return spec;
}
