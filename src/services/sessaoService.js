const db = require('../config/database');

// Apaga as sessões abertas de um usuário (opcionalmente preservando uma delas).
// Usado ao redefinir/trocar senha e ao desativar a conta.
async function encerrarSessoesDoUsuario(usuarioId, manterSid = null) {
    const resultado = await db.query(
        `DELETE FROM session
         WHERE (sess::jsonb) -> 'usuario' ->> 'id' = $1
           AND ($2::text IS NULL OR sid <> $2)`,
        [String(usuarioId), manterSid]
    );

    return resultado.rowCount;
}

module.exports = { encerrarSessoesDoUsuario };
