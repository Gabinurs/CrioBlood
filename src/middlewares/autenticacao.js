
const usuarioModel = require('../models/usuarioModel');
const { enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

// A cada requisição, confere no banco se a conta continua ativa e quais
// permissões ela tem. Assim, desativar um usuário ou mudar suas permissões
// vale na hora, sem esperar a sessão expirar.
async function carregarPermissoes(req, res, next) {
    const sessao = req.session.usuario;

    req.permissoes = new Set();
    res.locals.pode = () => false;

    if (!sessao) {
        return next();
    }

    try {
        const acesso = await usuarioModel.carregarAcesso(sessao.id);

        if (!acesso || !acesso.ativo) {
            return req.session.destroy(() => {
                res.clearCookie('crioblood.sid');
                res.redirect(STATUS.REDIRECIONAR, '/login');
            });
        }

        sessao.administrador = acesso.administrador;
        req.permissoes = new Set(acesso.codigos);
        res.locals.pode = (codigo) => acesso.administrador || req.permissoes.has(codigo);

        next();
    } catch (erro) {
        next(erro);
    }
}

// Verificar se o usuário está autenticado
function exigirAutenticacao(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect(STATUS.REDIRECIONAR, '/login');
    }

    next();
}

function negarAcesso(req, res, mensagem) {
    return enviarErro(req, res, STATUS.PROIBIDO, mensagem);
}

// Verificar se o usuário é administrador
function exigirAdministrador(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect(STATUS.REDIRECIONAR, '/login');
    }

    if (!req.session.usuario.administrador) {
        return negarAcesso(req, res, 'Somente administradores podem acessar esta área.');
    }

    next();
}

// Verificar se o usuário possui uma permissão específica (administradores passam sempre)
function exigirPermissao(codigoPermissao) {
    return function (req, res, next) {
        const usuario = req.session.usuario;

        if (!usuario) {
            return res.redirect(STATUS.REDIRECIONAR, '/login');
        }

        if (usuario.administrador || (req.permissoes && req.permissoes.has(codigoPermissao))) {
            return next();
        }

        return negarAcesso(req, res, 'Você não tem permissão para acessar esta área. Fale com o administrador.');
    };
}

module.exports = {
    carregarPermissoes,
    exigirAutenticacao,
    exigirAdministrador,
    exigirPermissao
};
