const db = require('../config/database');
const { sqlLimite } = require('../utils/paginacao');
const { ErroConflito, ErroNaoEncontrado } = require('../utils/erros');

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

    static async listarHistorico(pag = { limite: 50, deslocamento: 0 }) {
        const { rows } = await db.query(`
            SELECT t.id, t.paciente_nome, t.prontuario, t.medico_solicitante, t.observacoes,
                   h.codigo_original AS bolsa_codigo, h.tipo, h.abo, h.fator_rh,
                   u.nome AS registrado_por_nome, t.transfundido_por_nome,
                   to_char(t.inicio_transfusao AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS inicio_transfusao_br,
                   to_char(t.fim_transfusao AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS fim_transfusao_br,
                   to_char(t.data_saida AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data_saida_br
            FROM transusoes_saidas t
            JOIN hemocomponentes h ON h.id = t.hemocomponente_id
            LEFT JOIN usuarios u ON u.id = t.registrado_por
            ORDER BY t.data_saida DESC
            ${sqlLimite(pag)}
        `);
        return rows;
    }

    static async contarHistorico() {
        const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM transusoes_saidas');
        return rows[0].total;
    }

    // Registra a saída e baixa a bolsa (tudo ou nada)
    static async registrar(solicitacaoId, dados, usuarioId) {
        const nomeTransfundiu = String(dados.transfundido_por_nome || '').trim();
        if (nomeTransfundiu.length < 3 || nomeTransfundiu.length > 160) throw new ErroConflito('Informe o nome do profissional que realizou a transfusão.');
        const converterDataHora = valor => {
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(valor || ''))) return null;
            const d = new Date(valor + ':00-03:00');
            return Number.isNaN(d.getTime()) ? null : d;
        };
        const inicio = converterDataHora(dados.inicio_transfusao);
        const fim = converterDataHora(dados.fim_transfusao);
        const agora = new Date();
        if (!inicio || !fim) throw new ErroConflito('Informe a data e hora de início e término da transfusão.');
        if (fim < inicio) throw new ErroConflito('O término da transfusão não pode ser anterior ao início.');
        if (inicio > agora || fim > agora) throw new ErroConflito('Os horários da transfusão não podem estar no futuro.');
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const s = (await cliente.query(
                `SELECT s.id, s.requisicao_id, s.paciente_id, s.status, s.hemocomponente_id, s.medico_solicitante,
                        p.nome AS paciente_nome, p.prontuario
                 FROM solicitacoes_transfusionais s
                 JOIN pacientes p ON p.id = s.paciente_id
                 WHERE s.id = $1 FOR UPDATE OF s`, [solicitacaoId])).rows[0];
            if (!s) throw new ErroNaoEncontrado('Solicitação não encontrada.');
            if (s.status !== 'RESERVADA') {
                throw new ErroConflito('Só é possível registrar a transfusão de solicitações com bolsa reservada.');
            }

            if (s.requisicao_id) {
                const amostra = (await cliente.query(`
                    SELECT a.status_imuno, a.pai, a.controle_rh, a.solicitacao_transfusao,
                           (a.coletado_em <= $2::timestamptz
                            AND a.coletado_em + INTERVAL '72 hours' > $2::timestamptz) AS valida
                    FROM requisicoes_transfusionais r
                    JOIN amostras_receptor a ON a.id = r.amostra_id
                    WHERE r.id = $1 AND r.paciente_id = $3
                    FOR SHARE OF a
                `, [s.requisicao_id, inicio.toISOString(), s.paciente_id])).rows[0];
                if (!amostra || !amostra.valida || amostra.status_imuno !== 'CONCLUIDO' ||
                    amostra.pai !== 'NEGATIVO' || amostra.controle_rh !== 'NEGATIVO' ||
                    !amostra.solicitacao_transfusao) {
                    throw new ErroConflito('A amostra vinculada não estava válida e liberada no horário de início da transfusão. A equipe deve reavaliar o caso conforme protocolo institucional.');
                }
            }

            const b = (await cliente.query(
                `SELECT id, codigo_original, status, (data_validade >= CURRENT_DATE) AS na_validade
                 FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [s.hemocomponente_id])).rows[0];
            if (!b || b.status !== 'RESERVADA') {
                throw new ErroConflito('A bolsa reservada não está mais em estado de reserva.');
            }
            if (!b.na_validade) {
                throw new ErroConflito('A bolsa reservada está vencida. Cancele a solicitação e reserve outra bolsa.');
            }

            await cliente.query(
                `INSERT INTO transusoes_saidas
                    (hemocomponente_id, paciente_nome, prontuario, medico_solicitante,
                     observacoes, solicitacao_id, registrado_por, inicio_transfusao, fim_transfusao, transfundido_por_nome)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [b.id, s.paciente_nome, s.prontuario, s.medico_solicitante,
                 (dados.observacoes || '').trim() || null, s.id, usuarioId, inicio.toISOString(), fim.toISOString(), nomeTransfundiu]);

            await cliente.query(
                `UPDATE hemocomponentes SET status = 'TRANSFUNDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [b.id]);
            await cliente.query('DELETE FROM armazenamento WHERE hemocomponente_id = $1', [b.id]);
            await cliente.query(
                `UPDATE solicitacoes_transfusionais SET status = 'ATENDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [s.id]);

            if (s.requisicao_id) {
                const resumo = (await cliente.query(
                    `SELECT COUNT(*)::int AS total,
                            COUNT(*) FILTER (WHERE status = 'ATENDIDA')::int AS atendidas,
                            COUNT(*) FILTER (WHERE status = 'RESERVADA')::int AS reservadas,
                            COUNT(*) FILTER (WHERE status = 'CANCELADA')::int AS canceladas
                     FROM solicitacoes_transfusionais WHERE requisicao_id = $1`,
                    [s.requisicao_id]
                )).rows[0];
                const statusRequisicao = resumo.total > 0 && resumo.atendidas === resumo.total
                    ? 'ATENDIDA'
                    : (resumo.reservadas === resumo.total ? 'RESERVADA'
                        : (resumo.atendidas > 0 || resumo.reservadas > 0 || resumo.canceladas > 0 ? 'PARCIAL' : 'PENDENTE'));
                await cliente.query(
                    'UPDATE requisicoes_transfusionais SET status = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
                    [statusRequisicao, s.requisicao_id]
                );
            }

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
