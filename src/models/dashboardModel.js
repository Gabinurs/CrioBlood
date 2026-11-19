const db = require('../config/database');

// Consultas dos indicadores da tela inicial
class DashboardModel {
    // Contadores gerais (lotes abertos, solicitações e transfusões do mês)
    static async contagens() {
        const { rows } = await db.query(`
            SELECT
                (SELECT COUNT(*)::int FROM lotes_recebimento WHERE status = 'ABERTO') AS lotes_abertos,
                (SELECT COUNT(*)::int FROM solicitacoes_transfusionais WHERE status = 'PENDENTE') AS pendentes,
                (SELECT COUNT(*)::int FROM solicitacoes_transfusionais WHERE status = 'RESERVADA') AS aguardando,
                (SELECT COUNT(*)::int FROM transusoes_saidas
                   WHERE (data_saida AT TIME ZONE 'America/Sao_Paulo')::date >=
                         date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date) AS transfusoes_mes
        `);
        return rows[0];
    }

    // Solicitações pendentes mais urgentes (emergência primeiro, depois as mais antigas)
    static async solicitacoesUrgentes(limite = 5) {
        const { rows } = await db.query(`
            SELECT s.id, s.tipo, s.urgencia, p.nome AS paciente_nome,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh
            FROM solicitacoes_transfusionais s
            JOIN pacientes p ON p.id = s.paciente_id
            WHERE s.status = 'PENDENTE'
            ORDER BY CASE s.urgencia WHEN 'EMERGENCIA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END,
                     s.criado_em ASC
            LIMIT $1
        `, [limite]);
        return rows;
    }
}

module.exports = DashboardModel;
