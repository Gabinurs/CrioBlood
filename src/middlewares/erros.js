const STATUS = require('../utils/status');
const { ErroNegocio, enviarErro } = require('../utils/erros');

// Último recurso para endereços que não existem (404)
function rotaNaoEncontrada(req, res) {
    return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'A página que você procurou não existe ou foi movida.');
}

// Trata qualquer erro que chegar ao fim da cadeia (next(erro) ou exceção não capturada)
function tratarErros(erro, req, res, next) {
    if (res.headersSent) return next(erro);

    // Erros do próprio Express/body-parser trazem o status (ex.: 400 para JSON malformado)
    const status = Number.isInteger(erro.statusCode) ? erro.statusCode
                 : Number.isInteger(erro.status) ? erro.status
                 : STATUS.ERRO_INTERNO;
    const codigo = status >= 400 && status < 600 ? status : STATUS.ERRO_INTERNO;

    if (codigo >= 500) {
        console.error('Erro não tratado:', erro);
        return enviarErro(req, res, codigo, 'Ocorreu um erro inesperado. Tente novamente em instantes.');
    }

    // Erros 4xx esperados (ErroNegocio) podem mostrar a própria mensagem
    const mensagem = erro instanceof ErroNegocio
        ? erro.message
        : 'A requisição não pôde ser processada.';
    return enviarErro(req, res, codigo, mensagem);
}

module.exports = { rotaNaoEncontrada, tratarErros };
