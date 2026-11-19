
const bcrypt = require('bcrypt');
const { PADROES } = require('../utils/padroes');

async function gerarHashSenha(senha) {
    return await bcrypt.hash(senha, 12);
}

async function verificarSenha(senha, hash) {
    return await bcrypt.compare(senha, hash);
}

// Regras para novas senhas (o bcrypt só usa os primeiros 72 bytes).
// Retorna a mensagem de erro ou null quando a senha é válida.
function validarNovaSenha(senha) {
    if (typeof senha !== 'string' || senha.length < 8) {
        return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (Buffer.byteLength(senha, 'utf8') > 72) {
        return 'A senha não pode ultrapassar 72 bytes.';
    }
    if (!PADROES.senha.regex.test(senha)) {
        return 'A senha deve ter pelo menos uma letra e um número.';
    }
    return null;
}

module.exports = {
    gerarHashSenha,
    verificarSenha,
    validarNovaSenha
};
