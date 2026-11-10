const db = require('../database');

const TIPOS = ['CH', 'PLASMA', 'PLAQUETAS', 'CRIO'];
const TIPAGENS = [
    ['A', '+'], ['A', '-'], ['B', '+'], ['B', '-'],
    ['AB', '+'], ['AB', '-'], ['O', '+'], ['O', '-']
];

class EstoqueConsultaService {
    static TIPOS = TIPOS;

    static async resumo() {
        const { rows } = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'DISPONIVEL')::int     AS disponiveis,
                COUNT(*) FILTER (WHERE status = 'RESERVADA')::int      AS reservadas,
                COUNT(*) FILTER (WHERE status = 'EM_CONFERENCIA')::int AS em_conferencia,
                COUNT(*) FILTER (
                    WHERE status IN ('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')
                      AND data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
                )::int AS vencendo
            FROM hemocomponentes
        `);
        return rows[0];
    }

    // Bolsas disponíveis por tipagem (A+, A-, ...) e por tipo de produto
    static async matriz() {
        const { rows } = await db.query(`
            SELECT abo, fator_rh, tipo, COUNT(*)::int AS total
            FROM hemocomponentes
            WHERE status = 'DISPONIVEL' AND data_validade >= CURRENT_DATE
            GROUP BY abo, fator_rh, tipo
        `);

        const linhas = TIPAGENS.map(([abo, rh]) => {
            const valores = {};
            let total = 0;
            TIPOS.forEach(tipo => {
                const achado = rows.find(r => r.abo === abo && r.fator_rh === rh && r.tipo === tipo);
                valores[tipo] = achado ? achado.total : 0;
                total += valores[tipo];
            });
            return { rotulo: abo + rh, valores, total };
        });

        const porTipo = TIPOS.map(tipo => ({
            tipo,
            total: linhas.reduce((soma, l) => soma + l.valores[tipo], 0)
        }));

        return { linhas, porTipo };
    }

    static async listarBolsas() {
        const { rows } = await db.query(`
            SELECT h.id, h.codigo_original, h.tipo, h.abo, h.fator_rh, h.status,
                   l.codigo AS codigo_lote,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes,
                   e.nome AS equipamento, a.gaveta, a.caixa, a.posicao_exata
            FROM hemocomponentes h
            JOIN lotes_recebimento l ON l.id = h.lote_id
            LEFT JOIN armazenamento a ON a.hemocomponente_id = h.id
            LEFT JOIN equipamentos e ON e.id = a.equipamento_id
            WHERE h.status IN ('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')
            ORDER BY h.data_validade ASC, h.id ASC
        `);
        return rows;
    }

    static async proximosVencimentos(limite = 5) {
        const { rows } = await db.query(`
            SELECT h.id, h.codigo_original, h.tipo, h.abo, h.fator_rh, h.status,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes
            FROM hemocomponentes h
            WHERE h.status IN ('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')
              AND h.data_validade >= CURRENT_DATE
            ORDER BY h.data_validade ASC, h.id ASC
            LIMIT $1
        `, [limite]);
        return rows;
    }
}

module.exports = EstoqueConsultaService;
