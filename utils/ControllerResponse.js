import GravarLog from './GravarLog.js';

const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor (500). Contate o administrador do sistema.';
const DEFAULT_PUBLIC_ERROR_MESSAGE = 'Erro ao processar solicitacao.';

export function criarRespostaPadrao(data = []) {
    return {
        err: 0,
        msg: '',
        status: 200,
        data
    };
}

export function getStatusCode(error) {
    const status = Number(error?.statusCode || 500);
    return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

export function getPublicErrorMessage(error, status, fallback = DEFAULT_PUBLIC_ERROR_MESSAGE) {
    if (status === 500) {
        return INTERNAL_ERROR_MESSAGE;
    }

    const message = String(error?.message || '').trim();
    return message || fallback;
}

export function preencherErroResposta(resdata, error, fallback = DEFAULT_PUBLIC_ERROR_MESSAGE) {
    const status = getStatusCode(error);

    resdata.err = status;
    resdata.msg = getPublicErrorMessage(error, status, fallback);
    resdata.status = status;

    return status;
}

export function enviarErroJson(res, error, fallback = DEFAULT_PUBLIC_ERROR_MESSAGE) {
    const status = getStatusCode(error);

    if (!res.headersSent) {
        res.status(status).json({
            err: status,
            msg: getPublicErrorMessage(error, status, fallback),
            status,
            data: []
        });
    }

    return status;
}

export function registrarErroServidor(context, error, status) {
    if (status === 500) {
        GravarLog(context, error?.stack || error?.message || String(error));
    }
}
