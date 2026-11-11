const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

class TransfusaoService {
    // Solicitações com bolsa reservada, prontas para a transfusão
    static async listarProntas() {
        const { rows } = await db.query(`
            SELECT s.id, s.tipo, s.urgencia, s.medico_solicitante,
                   p.nome AS paciente_nome, p.prontuario,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh,
                   h.codigo_original AS bolsa_codigo, h.abo AS bolsa_abo, h.fator_rh AS bolsa_rh,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes,
                   e.nome AS equipamento, ar.gaveta, ar.caixa, ar.posicao_exata
            FROM solicitacoes_transfusionais s
            JOIN pacientes p ON p.id = s.paciente_id
            JOIN hemocomponentes h ON h.id = s.hemocomponente_id
            LEFT JOIN armazenamento ar ON ar.hemocomponente_id = h.id
            LEFT JOIN equipamentos e ON e.id = ar.equipamento_id
            WHERE s.status = 'RESERVADA'
            ORDER BY CASE s.urgencia WHEN 'EMERGENCIA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END,
                     s.criado_em ASC
        `);
        return rows;
    }

    static async listarHistorico(limite = 50) {
        const { rows } = await db.query(`
            SELECT t.id, t.paciente_nome, t.prontuario, t.medico_solicitante, t.observacoes,
                   h.codigo_original AS bolsa_codigo, h.tipo, h.abo, h.fator_rh,
                   u.nome AS registrado_por_nome,
                   to_char(t.data_saida AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data_saida_br
            FROM transusoes_saidas t
            JOIN hemocomponentes h ON h.id = t.hemocomponente_id
            LEFT JOIN usuarios u ON u.id = t.registrado_por
            ORDER BY t.data_saida DESC
            LIMIT $1
        `, [limite]);
        return rows;
    }

    // Registra a saída e baixa a bolsa (tudo ou nada)
    static async registrar(solicitacaoId, observacoes, usuarioId) {
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const s = (await cliente.query(
                `SELECT s.id, s.status, s.hemocomponente_id, s.medico_solicitante,
                        p.nome AS paciente_nome, p.prontuario
                 FROM solicitacoes_transfusionais s
                 JOIN pacientes p ON p.id = s.paciente_id
                 WHERE s.id = $1 FOR UPDATE OF s`, [solicitacaoId])).rows[0];
            if (!s) throw new ErroNegocio('Solicitação não encontrada.');
            if (s.status !== 'RESERVADA') {
                throw new ErroNegocio('Só é possível registrar a transfusão de solicitações com bolsa reservada.');
            }

            const b = (await cliente.query(
                `SELECT id, codigo_original, status, (data_validade >= CURRENT_DATE) AS na_validade
                 FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [s.hemocomponente_id])).rows[0];
            if (!b || b.status !== 'RESERVADA') {
                throw new ErroNegocio('A bolsa reservada não está mais em estado de reserva.');
            }
            if (!b.na_validade) {
                throw new ErroNegocio('A bolsa reservada está vencida. Cancele a solicitação e reserve outra bolsa.');
            }

            await cliente.query(
                `INSERT INTO transusoes_saidas
                    (hemocomponente_id, paciente_nome, prontuario, medico_solicitante,
                     observacoes, solicitacao_id, registrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [b.id, s.paciente_nome, s.prontuario, s.medico_solicitante,
                 (observacoes || '').trim() || null, s.id, usuarioId]);

            await cliente.query(
                `UPDATE hemocomponentes SET status = 'TRANSFUNDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [b.id]);
            await cliente.query('DELETE FROM armazenamento WHERE hemocomponente_id = $1', [b.id]);
            await cliente.query(
                `UPDATE solicitacoes_transfusionais SET status = 'ATENDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [s.id]);

            await cliente.query('COMMIT');
            return { codigo: b.codigo_original, paciente: s.paciente_nome };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = TransfusaoService;
