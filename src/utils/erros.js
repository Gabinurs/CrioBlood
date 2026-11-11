// utilitário para gerenciar mensagens de alerta e erro (flash messages)
function avisar(req, tipo, mensagem) {
    // Verifica se o pacote connect-flash está sendo usado
    if (typeof req.flash === 'function') {
        req.flash(tipo, mensagem);
    } 
    // Alternativa: salva o aviso diretamente na sessão caso não use o flash
    else if (req.session) {
        if (!req.session.avisos) {
            req.session.avisos = [];
        }
        req.session.avisos.push({ tipo, mensagem });
    } else {
        console.warn(`[${tipo.toUpperCase()}] ${mensagem}`);
    }
}

module.exports = {
    avisar
};