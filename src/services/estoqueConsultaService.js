const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

const STATUS_EM_ESTOQUE = "('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')";

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

    // ---------- Localização física das bolsas ----------
    static async buscarBolsa(id) {
        const { rows } = await db.query(`
            SELECT h.id, h.codigo_original, h.tipo, h.abo, h.fator_rh, h.status,
                   l.codigo AS codigo_lote,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br
            FROM hemocomponentes h
            JOIN lotes_recebimento l ON l.id = h.lote_id
            WHERE h.id = $1
        `, [id]);
        return rows[0];
    }

    static async buscarLocalizacao(bolsaId) {
        const { rows } = await db.query(
            `SELECT a.*, e.nome AS equipamento
             FROM armazenamento a JOIN equipamentos e ON e.id = a.equipamento_id
             WHERE a.hemocomponente_id = $1`, [bolsaId]);
        return rows[0];
    }

    // Guarda (ou muda) o local da bolsa. Não deixa duas bolsas na mesma posição.
    static async alocar(bolsaId, dados) {
        const equipamentoId = parseInt(dados.equipamento_id, 10);
        const gaveta = (dados.gaveta || '').trim();
        const caixa = (dados.caixa || '').trim();
        const posicao = (dados.posicao_exata || '').trim();

        if (!equipamentoId) throw new ErroNegocio('Selecione o equipamento.');
        if ([gaveta, caixa, posicao].some(v => v.length > 50)) {
            throw new ErroNegocio('Gaveta, caixa e posição aceitam no máximo 50 caracteres.');
        }

        const bolsa = await EstoqueConsultaService.buscarBolsa(bolsaId);
        if (!bolsa) throw new ErroNegocio('Bolsa não encontrada.');
        if (!['DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA'].includes(bolsa.status)) {
            throw new ErroNegocio('Só é possível alocar bolsas que estão em estoque.');
        }

        const equipamento = (await db.query(
            'SELECT id, ativo FROM equipamentos WHERE id = $1', [equipamentoId])).rows[0];
        if (!equipamento) throw new ErroNegocio('Equipamento não encontrado.');
        if (!equipamento.ativo) throw new ErroNegocio('Esse equipamento está desativado.');

        if (posicao) {
            const ocupada = (await db.query(`
                SELECT h.codigo_original
                FROM armazenamento a
                JOIN hemocomponentes h ON h.id = a.hemocomponente_id
                WHERE a.equipamento_id = $1
                  AND lower(COALESCE(a.gaveta, '')) = lower($2)
                  AND lower(COALESCE(a.caixa, '')) = lower($3)
                  AND lower(a.posicao_exata) = lower($4)
                  AND a.hemocomponente_id <> $5
                  AND h.status IN ${STATUS_EM_ESTOQUE}
            `, [equipamentoId, gaveta, caixa, posicao, bolsaId])).rows[0];
            if (ocupada) {
                throw new ErroNegocio(`Essa posição já está ocupada pela bolsa ${ocupada.codigo_original}.`);
            }
        }

        await db.query(`
            INSERT INTO armazenamento (hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (hemocomponente_id) DO UPDATE SET
                equipamento_id = EXCLUDED.equipamento_id,
                gaveta = EXCLUDED.gaveta,
                caixa = EXCLUDED.caixa,
                posicao_exata = EXCLUDED.posicao_exata,
                data_entrada = CURRENT_TIMESTAMP
        `, [bolsaId, equipamentoId, gaveta || null, caixa || null, posicao || null]);

        return bolsa;
    }

    static async remover(bolsaId) {
        await db.query('DELETE FROM armazenamento WHERE hemocomponente_id = $1', [bolsaId]);
    }
}

module.exports = EstoqueConsultaService;
