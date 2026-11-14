class ErroNegocio extends Error {
    constructor(mensagem) {
        super(mensagem);
        this.name = 'ErroNegocio';
    }
}

function avisar(req, tipo, mensagem) {
    if (!req.session) {
        console.warn(`[${tipo.toUpperCase()}] ${mensagem}`);
        return;
    }

    req.session.flash = { tipo, texto: mensagem };
}

function tratar(req, res, erro, rota, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        avisar(req, 'aviso', erro.message);
    } else {
        console.error(`${mensagemPadrao}:`, erro);
        avisar(req, 'erro', mensagemPadrao);
    }

    return res.redirect(rota);
}

module.exports = {
    ErroNegocio,
    avisar,
    tratar
};