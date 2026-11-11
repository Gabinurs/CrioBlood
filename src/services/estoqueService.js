const db = require('../database');

class EstoqueService {

    // ==========================================
    // MÓDULO 1: ARMAZENAMENTO FÍSICO
    // ==========================================
    static async alocarHemocomponente(dadosArmazenamento) {
        const { hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata } = dadosArmazenamento;

        // Insere a localização física ou atualiza se a bolsa já estiver alocada
        const query = `
            INSERT INTO armazenamento (hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (hemocomponente_id) DO UPDATE SET
                equipamento_id = EXCLUDED.equipamento_id,
                gaveta = EXCLUDED.gaveta,
                caixa = EXCLUDED.caixa,
                posicao_exata = EXCLUDED.posicao_exata
            RETURNING *
        `;
        const { rows } = await db.query(query, [
            hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata
        ]);
        return rows[0];
    }

    static async buscarLocalizacao(hemocomponente_id) {
        const query = `
            SELECT a.*, e.nome AS equipamento_nome, e.tipo AS equipamento_tipo
            FROM armazenamento a
            JOIN equipamentos e ON a.equipamento_id = e.id
            WHERE a.hemocomponente_id = $1
        `;
        const { rows } = await db.query(query, [hemocomponente_id]);
        return rows[0];
    }

    // ==========================================
    // MÓDULO 2: SAÍDA E TRANSFUSÃO
    // ==========================================
    static async registrarTransfusao(dadosSaida) {
        const { hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes } = dadosSaida;

        // Transação: a bolsa só sai se o status for atualizado com sucesso
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            // 1. Registra a saída para o paciente
            await cliente.query(
                `INSERT INTO transusoes_saidas
                    (hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes]
            );

            // 2. Atualiza o status do hemocomponente para 'TRANSFUNDIDA'
            await cliente.query(
                `UPDATE hemocomponentes SET status = 'TRANSFUNDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [hemocomponente_id]
            );

            await cliente.query('COMMIT');
            return true;
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }

    // ==========================================
    // MÓDULO 3: ROTINA DE VALIDADE
    // ==========================================
    static async invalidarVencidos() {
        // Marca como VENCIDA qualquer bolsa cujo prazo expirou
        // e que ainda estava disponível ou em quarentena.
        const resultado = await db.query(`
            UPDATE hemocomponentes
            SET status = 'VENCIDA', atualizado_em = CURRENT_TIMESTAMP
            WHERE data_validade < CURRENT_DATE
            AND status IN ('DISPONIVEL', 'EM_CONFERENCIA', 'RESERVADA')
        `);
        // Bolsas vencidas saem do equipamento: libera a posição
        await db.query(`
            DELETE FROM armazenamento
            WHERE hemocomponente_id IN (SELECT id FROM hemocomponentes WHERE status = 'VENCIDA')
        `);
        return resultado.rowCount; // Quantas bolsas foram vencidas nesta varredura
    }
}

module.exports = EstoqueService;
