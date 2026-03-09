import express from 'express';
import cors from "cors";
import router_param from './routes/routes_parametrizacao.js';
import router_vendas from './routes/routes_vendas.js';
import router_estoque from './routes/routes_estoque.js';
import route_clientes from './routes/routes_clientes.js';

import {config} from 'dotenv';
import helmet from 'helmet';

//config({quiet:true,path:'../.env'});

/*const options = {
    cert: fs.readFileSync('certicate/icpbrasilv5.crt')
};*/

const app = express();

process.env.TZ = 'America/Bahia'

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
    'http://localhost:8080'
];

const allowedOrigins = String(process.env.CORS_ORIGIN || defaultAllowedOrigins.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Criar o middleware para permitir requisição externa
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Origem nao permitida pelo CORS.'));
        },
        credentials: true,
        methods: ['POST','GET','OPTIONS'], // metodos permitidos
        allowedHeaders: ['Content-Type','Authorization','x-entidade-negocio'], // headers permitidos
        exposedHeaders: ['x-crediario-token']
    })
); 

app.use(router_param);
app.use(router_vendas);
app.use(router_estoque);
app.use(route_clientes);

app.listen(3000,() => {console.log('API executando na PORTA 3000')});

/*https.createServer(options,app).listen(443, () => {
    console.log('Servidor HTTPS rodando na porta 443');
});*/ 
