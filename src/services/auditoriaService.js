const db = require('../database');

class AuditoriaService {
    static async registrarLog(usuario_id, acao, tabela, registro_id, detalhes = '') {
        try {
            await db.query(
                `INSERT INTO logs_auditoria
                    (usuario_id, acao, tabela_afetada, registro_id, detalhes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [usuario_id, acao, tabela, registro_id, detalhes]
            );
        } catch (erro) {
            // Só registra no console para não quebrar a tela do usuário
            console.error('[ERRO CRÍTICO DE AUDITORIA] Não foi possível salvar o log:', erro);
        }
    }
}

module.exports = AuditoriaService;
