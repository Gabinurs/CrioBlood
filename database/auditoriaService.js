const db = require('../database');

class AuditoriaService {
    static async registrarLog(usuario_id, acao, tabela, registro_id, detalhes = '') {
        try {
            const query = `
                INSERT INTO logs_auditoria (usuario_id, acao, tabela_afetada, registro_id, detalhes) 
                VALUES (?, ?, ?, ?, ?)
            `;
            await db.query(query, [usuario_id, acao, tabela, registro_id, detalhes]);
        } catch (erro) {
            // Apenas logamos o erro de auditoria no console do servidor para não quebrar a tela do usuário
            console.error('[ERRO CRÍTICO DE AUDITORIA] Não foi possível salvar o log:', erro);
        }
    }
}

module.exports = AuditoriaService;
