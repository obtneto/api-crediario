import express from 'express';
import cors from "cors";
import router_param from './routes/routes_parametrizacao.js';
import router_vendas from './routes/routes_vendas.js';
import router_estoque from './routes/routes_estoque.js';
import route_clientes from './routes/routes_clientes.js';
import route_cobranca from './routes/routes_cobranca.js';
import route_comissoes from './routes/routes_comissoes.js';
import route_staff from './routes/routes_staff.js';
import route_relatorios from './routes/routes_relatorios.js';
import route_backups from './routes/routes_backups.js';

import { config } from 'dotenv';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowPrivateNetworkCorsOrigins } from './utils/SecurityConfig.js';
import { getStatusCode, registrarErroServidor } from './utils/ControllerResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ quiet: true, path: path.resolve(__dirname, '../.env') });

const app = express();

process.env.TZ = 'America/Maceio'
const PORT = Number(process.env.PORT || 3000);
const HOST = String(process.env.HOST || '::');

app.disable('x-powered-by');
app.use(helmet());

app.use(
    express.urlencoded({
        extended: true,
        limit: '8kb',
        parameterLimit: 100,
        depth: 5
    })
);


app.use(express.json({ limit: '8kb' }));

const defaultAllowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
];

const envAllowedOrigins = String(process.env.CORS_ORIGIN || '');

const allowedOrigins = String(envAllowedOrigins || defaultAllowedOrigins.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeHostname(hostname = '') {
    return String(hostname || '').trim().replace(/^\[|\]$/g, '');
}

function isPrivateIpv4(hostname = '') {
    return /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
        || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
        || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

function isPrivateIpv6(hostname = '') {
    return /^fc[0-9a-f]{2}:/i.test(hostname)
        || /^fd[0-9a-f]{2}:/i.test(hostname)
        || /^fe80:/i.test(hostname);
}

function sanitizeLogValue(value = '') {
    return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, 200);
}

function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    if (allowedOrigins.includes(origin)) {
        return true;
    }

    try {
        const parsedOrigin = new URL(origin);
        const hostname = normalizeHostname(parsedOrigin.hostname);

        if (!allowPrivateNetworkCorsOrigins()) {
            return false;
        }

        return localHostnames.has(hostname)
            || hostname.endsWith('.local')
            || isPrivateIpv4(hostname)
            || isPrivateIpv6(hostname);
    } catch {
        return false;
    }
}

const corsOptions = {
    origin: (origin, callback) => {

        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        const error = new Error('Origem nao permitida pelo CORS.');
        error.statusCode = 403;
        console.warn('CORS denied for origin:', sanitizeLogValue(origin));
        return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-entidade-negocio', 'x-client-platform'],
    exposedHeaders: ['x-crediario-token', 'x-crediario-staff-token']
};

// Criar o middleware para permitir requisição externa
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use('/staff', route_staff);
app.use(router_param);
app.use(router_vendas);
app.use(router_estoque);
app.use(route_clientes);
app.use(route_cobranca);
app.use(route_comissoes);
app.use(route_relatorios);
app.use(route_backups);

app.use((req, res) => {
    res.status(404).json({
        err: 404,
        msg: 'Rota nao encontrada.',
        status: 404,
        data: []
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const status = getStatusCode(error);

    if (status >= 500) {
        registrarErroServidor('Express.GlobalErrorHandler', error, status);
    }

    return res.status(status).json({
        err: status,
        msg: status === 413
            ? 'Payload excede o limite permitido.'
            : status === 400
                ? 'Requisicao invalida.'
                : status === 403
                    ? 'Acesso negado.'
                    : 'Erro interno do servidor (500). Contate o administrador do sistema.',
        status,
        data: []
    });
});

app.listen(PORT, HOST, () => {
    console.log(`API executando em ${HOST}:${PORT}`);
});

/*https.createServer(options,app).listen(443, () => {
    console.log('Servidor HTTPS rodando na porta 443');
});*/
