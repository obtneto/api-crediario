import express from 'express';
import cors from "cors";
import router_param from './routes/routes_parametrizacao.js';
import router_vendas from './routes/routes_vendas.js';
import router_estoque from './routes/routes_estoque.js';
import route_clientes from './routes/routes_clientes.js';
import route_cobranca from './routes/routes_cobranca.js';
import route_adiantamento from './routes/routes_adiantamentos.js';

import {config} from 'dotenv';
import helmet from 'helmet';

config({quiet:true,path:'../.env'});

process.env.TZ ='-03:00';

/*const options = {
    cert: fs.readFileSync('certicate/icpbrasilv5.crt')
};*/

const app = express();

process.env.TZ = 'America/Bahia'

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
const allowedOrigins = (process.env.NODE_ENV === 'production' && !envAllowedOrigins)
    ? []
    : String(envAllowedOrigins || defaultAllowedOrigins.join(','))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

// Criar o middleware para permitir requisição externa
app.use(
    cors({
        origin: (origin, callback) => {
            console.log('CORS check for origin:', origin); // Debug log
            if (!origin) return callback(null, true); // Allow requests with no origin (like mobile apps or curl requests)
            if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.0.7')) {
                console.log('CORS allowed for origin:', origin);
                return callback(null, true);
            }
            console.log('CORS denied for origin:', origin);
            return callback(new Error('Origem nao permitida pelo CORS.'));
        },
        credentials: true,
        methods: ['POST','GET','DELETE','OPTIONS'], // metodos permitidos
        allowedHeaders: ['Content-Type','Authorization','x-entidade-negocio'], // headers permitidos
        exposedHeaders: ['x-crediario-token']
    })
); 

app.use(router_param);
app.use(router_vendas);
app.use(router_estoque);
app.use(route_clientes);
app.use(route_cobranca);
app.use(route_adiantamento);

app.listen(3000,() => {console.log('API executando na PORTA 3000')});

/*https.createServer(options,app).listen(443, () => {
    console.log('Servidor HTTPS rodando na porta 443');
});*/ 
