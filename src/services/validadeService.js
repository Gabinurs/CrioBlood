const db = require('../config/database');

class ValidadeService {
    // Varredura de validade (tudo ou nada):
    //  1. solicitações com bolsa reservada que venceu voltam para PENDENTE (sem bolsa),
    //     para o atendimento escolher outra bolsa compatível;
    //  2. as bolsas vencidas viram VENCIDA;
    //  3. a posição física delas é liberada;
    //  4. cada solicitação liberada é registrada na auditoria (ação do sistema, sem usuário).
    static async invalidarVencidos() {
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const liberadas = await cliente.query(`
                UPDATE solicitacoes_transfusionais s
                SET status = 'PENDENTE',
                    hemocomponente_id = NULL,
                    atualizado_em = CURRENT_TIMESTAMP
                FROM hemocomponentes h
                WHERE s.hemocomponente_id = h.id
                  AND s.status = 'RESERVADA'
                  AND h.status = 'RESERVADA'
                  AND h.data_validade < CURRENT_DATE
                RETURNING s.id, h.codigo_original
            `);

            const vencidas = await cliente.query(`
                UPDATE hemocomponentes
                SET status = 'VENCIDA', atualizado_em = CURRENT_TIMESTAMP
                WHERE data_validade < CURRENT_DATE
                  AND status IN ('DISPONIVEL', 'EM_CONFERENCIA', 'RESERVADA')
            `);

            await cliente.query(`
                DELETE FROM armazenamento
                WHERE hemocomponente_id IN (SELECT id FROM hemocomponentes WHERE status = 'VENCIDA')
            `);

            // A auditoria nunca pode impedir a baixa das bolsas vencidas: se falhar
            // (ex.: o script database/09 ainda não foi aplicado), só avisa no log.
            for (const s of liberadas.rows) {
                await cliente.query('SAVEPOINT auditoria');
                try {
                    await cliente.query(
                        `INSERT INTO logs_auditoria (usuario_id, acao, tabela_afetada, registro_id, detalhes)
                         VALUES (NULL, 'RESERVA_DESFEITA_VENCIMENTO', 'solicitacoes_transfusionais', $1, $2)`,
                        [s.id, `Bolsa ${s.codigo_original} venceu; a solicitação voltou para pendente.`]
                    );
                    await cliente.query('RELEASE SAVEPOINT auditoria');
                } catch (erroAuditoria) {
                    await cliente.query('ROLLBACK TO SAVEPOINT auditoria');
                    console.warn('[CRON] Auditoria não registrada (aplique database/09_sessoes_e_auditoria.sql):',
                        erroAuditoria.message);
                }
            }

            await cliente.query('COMMIT');

            return { vencidas: vencidas.rowCount, solicitacoesLiberadas: liberadas.rowCount };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = ValidadeService;
