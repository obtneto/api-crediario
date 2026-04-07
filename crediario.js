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

import {config} from 'dotenv';
import helmet from 'helmet';

config({quiet:true,path:'../.env'});

const app = express();

process.env.TZ = 'America/Maceio'

app.disable('x-powered-by');
app.use(helmet());

app.use(
    express.urlencoded({
      extended: true,
      limit: '8kb'
    })
);


app.use(express.json({limit:'8kb'}));

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.0.7:8080',
    'http://10.0.0.99:8080',
    'http://localhost:8080',
    'http://localhost',
    'http://192.168.0.7',
];

const envAllowedOrigins = String(process.env.CORS_ORIGIN || '');

const allowedOrigins = String(envAllowedOrigins || defaultAllowedOrigins.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    if (allowedOrigins.includes(origin)) {
        return true;
    }

    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

const corsOptions = {
    origin: (origin, callback) => {

        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        console.log('CORS denied for origin:', origin);
        return callback(new Error('Origem nao permitida pelo CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-entidade-negocio'],
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

app.listen(3000,() => {console.log('API executando na PORTA 3000')});

/*https.createServer(options,app).listen(443, () => {
    console.log('Servidor HTTPS rodando na porta 443');
});*/ 
