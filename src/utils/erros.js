const STATUS = require('./status');

// Erros "esperados" do sistema: a mensagem é mostrada ao usuário e carrega o status HTTP adequado.
class ErroNegocio extends Error {
    constructor(mensagem, statusCode = STATUS.ENTIDADE_INVALIDA) {
        super(mensagem);
        this.name = 'ErroNegocio';
        this.statusCode = statusCode;
    }
}

// 422: dado inválido (formato, tamanho, valor fora do permitido)
class ErroValidacao extends ErroNegocio {
    constructor(mensagem) {
        super(mensagem, STATUS.ENTIDADE_INVALIDA);
        this.name = 'ErroValidacao';
    }
}

// 409: a operação conflita com o estado atual (já existe, já está fechado, posição ocupada...)
class ErroConflito extends ErroNegocio {
    constructor(mensagem) {
        super(mensagem, STATUS.CONFLITO);
        this.name = 'ErroConflito';
    }
}

// 404: o registro procurado não existe
class ErroNaoEncontrado extends ErroNegocio {
    constructor(mensagem) {
        super(mensagem, STATUS.NAO_ENCONTRADO);
        this.name = 'ErroNaoEncontrado';
    }
}

const TITULOS = {
    [STATUS.REQUISICAO_INVALIDA]: 'Requisição inválida',
    [STATUS.NAO_AUTENTICADO]: 'Não autenticado',
    [STATUS.PROIBIDO]: 'Acesso negado',
    [STATUS.NAO_ENCONTRADO]: 'Não encontrado',
    [STATUS.CONFLITO]: 'Conflito',
    [STATUS.ENTIDADE_INVALIDA]: 'Dados inválidos',
    [STATUS.MUITAS_REQUISICOES]: 'Muitas requisições',
    [STATUS.ERRO_INTERNO]: 'Erro interno',
    [STATUS.INDISPONIVEL]: 'Serviço indisponível'
};

function tituloDoStatus(codigo) {
    return TITULOS[codigo] || (codigo >= 500 ? 'Erro no servidor' : 'Erro');
}

function avisar(req, tipo, mensagem) {
    if (!req.session) {
        console.warn(`[${tipo.toUpperCase()}] ${mensagem}`);
        return;
    }

    req.session.flash = { tipo, texto: mensagem };
}

// Resposta de erro padrão do sistema: define o status HTTP e mostra uma página
// (ou JSON, para quem pediu JSON). "detalhes" é uma lista opcional de mensagens.
function enviarErro(req, res, codigo, mensagem, detalhes = []) {
    res.status(codigo);

    const titulo = tituloDoStatus(codigo);
    const querJson = req.accepts && req.accepts(['html', 'json']) === 'json';

    if (querJson) {
        return res.json({ status: codigo, erro: titulo, mensagem, detalhes });
    }

    const logado = Boolean(req.session && req.session.usuario);
    return res.render(logado ? 'erro/erro' : 'erro/erro-simples', { codigo, titulo, mensagem, detalhes });
}

// Erro numa ação que termina em redirecionamento (cancelar, reservar, fechar lote...):
// guarda o aviso, volta para a tela da lista e responde 303.
function tratar(req, res, erro, rota, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        avisar(req, 'aviso', erro.message);
    } else {
        console.error(`${mensagemPadrao}:`, erro);
        avisar(req, 'erro', mensagemPadrao);
    }

    return res.redirect(STATUS.VER_OUTRO, rota);
}

module.exports = {
    ErroNegocio,
    ErroValidacao,
    ErroConflito,
    ErroNaoEncontrado,
    tituloDoStatus,
    avisar,
    enviarErro,
    tratar
};
