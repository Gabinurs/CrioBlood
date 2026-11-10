const db = require('../database');

const FUSO = 'America/Sao_Paulo';

function dataValida(texto) {
    return /^\d{4}-\d{2}-\d{2}$/.test(texto || '') && !isNaN(new Date(texto));
}

// Período padrão: últimos 30 dias (no horário de Brasília)
function normalizarPeriodo(inicio, fim) {
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: FUSO }));
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const padraoFim = iso(hoje);
    const inicioDate = new Date(hoje);
    inicioDate.setDate(inicioDate.getDate() - 30);

    let i = dataValida(inicio) ? inicio : iso(inicioDate);
    let f = dataValida(fim) ? fim : padraoFim;
    if (i > f) [i, f] = [f, i];
    return { inicio: i, fim: f };
}

class RelatorioService {
    static normalizarPeriodo = normalizarPeriodo;

    static async resumo({ inicio, fim }) {
        const { rows } = await db.query(`
            SELECT
                (SELECT COUNT(*)::int FROM lotes_recebimento
                   WHERE (data_recebimento AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2) AS lotes,
                (SELECT COUNT(*)::int FROM hemocomponentes
                   WHERE (criado_em AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2) AS bolsas_cadastradas,
                (SELECT COUNT(*)::int FROM transusoes_saidas
                   WHERE (data_saida AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2) AS transfusoes,
                (SELECT COUNT(*)::int FROM solicitacoes_transfusionais
                   WHERE (criado_em AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2) AS solicitacoes,
                (SELECT COUNT(*)::int FROM hemocomponentes
                   WHERE status IN ('DESCARTADA', 'VENCIDA')
                     AND (atualizado_em AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2) AS perdas
        `, [inicio, fim]);
        return rows[0];
    }

    static async transfusoes({ inicio, fim }) {
        const { rows } = await db.query(`
            SELECT t.id, t.paciente_nome, t.prontuario, t.medico_solicitante,
                   h.codigo_original AS bolsa_codigo, h.tipo, h.abo, h.fator_rh,
                   to_char(t.data_saida AT TIME ZONE '${FUSO}', 'DD/MM/YYYY HH24:MI') AS data_saida_br
            FROM transusoes_saidas t
            JOIN hemocomponentes h ON h.id = t.hemocomponente_id
            WHERE (t.data_saida AT TIME ZONE '${FUSO}')::date BETWEEN $1 AND $2
            ORDER BY t.data_saida DESC
        `, [inicio, fim]);
        return rows;
    }

    static async estoquePorStatus() {
        const { rows } = await db.query(`
            SELECT tipo, status, COUNT(*)::int AS total
            FROM hemocomponentes
            GROUP BY tipo, status
            ORDER BY tipo, status
        `);
        return rows;
    }

    static async vencimentos(dias = 15) {
        const { rows } = await db.query(`
            SELECT h.codigo_original, h.tipo, h.abo, h.fator_rh, h.status,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes
            FROM hemocomponentes h
            WHERE h.status IN ('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')
              AND h.data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int
            ORDER BY h.data_validade ASC
        `, [dias]);
        return rows;
    }

    // CSV compatível com Excel em português (separador ";" e BOM)
    static montarCsv(linhas) {
        const cabecalho = ['Data', 'Paciente', 'Prontuário', 'Bolsa', 'Tipo', 'ABO/Rh', 'Médico solicitante'];
        const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const corpo = linhas.map(l => [
            l.data_saida_br, l.paciente_nome, l.prontuario, l.bolsa_codigo, l.tipo,
            (l.abo || '') + (l.fator_rh || ''), l.medico_solicitante
        ].map(esc).join(';'));
        return '\uFEFF' + [cabecalho.map(esc).join(';'), ...corpo].join('\r\n');
    }
}

module.exports = RelatorioService;
