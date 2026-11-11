const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

// Para cada grupo ABO do RECEPTOR, quais grupos ABO do DOADOR são aceitos.
// Hemácias: o receptor não pode ter anticorpos contra os antígenos da bolsa.
const DOADORES_HEMACIAS = { A: ['A', 'O'], B: ['B', 'O'], AB: ['A', 'B', 'AB', 'O'], O: ['O'] };
// Plasma, crioprecipitado e plaquetas: a regra do plasma é invertida.
const DOADORES_PLASMA = { A: ['A', 'AB'], B: ['B', 'AB'], AB: ['AB'], O: ['O', 'A', 'B', 'AB'] };

function tabelaDoTipo(tipo) {
    return tipo === 'CH' ? DOADORES_HEMACIAS : DOADORES_PLASMA;
}

// Rh só é exigido em hemácias e plaquetas: receptor Rh negativo recebe apenas Rh negativo.
function exigeRh(tipo) {
    return tipo === 'CH' || tipo === 'PLAQUETAS';
}

// Retorna null se a bolsa não é compatível; senão, o nível da compatibilidade.
function avaliar(paciente, bolsa, tipo) {
    if (!paciente.abo || !paciente.fator_rh) return null;

    const aceitos = tabelaDoTipo(tipo)[paciente.abo];
    if (!aceitos.includes(bolsa.abo)) return null;

    if (exigeRh(tipo) && paciente.fator_rh === '-' && bolsa.fator_rh !== '-') return null;

    const mesmoAbo = bolsa.abo === paciente.abo;
    const mesmoRh = bolsa.fator_rh === paciente.fator_rh;
    return mesmoAbo && (mesmoRh || !exigeRh(tipo)) ? 'IDENTICA' : 'COMPATIVEL';
}

function descreverAceitos(paciente, tipo) {
    if (!paciente.abo || !paciente.fator_rh) return null;
    const abo = tabelaDoTipo(tipo)[paciente.abo].join(', ');
    let rh = 'Rh indiferente para este produto';
    if (exigeRh(tipo)) {
        rh = paciente.fator_rh === '-' ? 'apenas Rh negativo' : 'Rh positivo ou negativo';
    }
    return `Grupos ABO aceitos: ${abo}. ${rh.charAt(0).toUpperCase() + rh.slice(1)}.`;
}

class CompatibilidadeService {
    static avaliar = avaliar;
    static descreverAceitos = descreverAceitos;

    // Bolsas disponíveis, dentro da validade e compatíveis com o paciente da solicitação
    static async listarBolsasCompativeis(solicitacao) {
        const paciente = { abo: solicitacao.paciente_abo, fator_rh: solicitacao.paciente_rh };
        if (!paciente.abo || !paciente.fator_rh) return [];

        const { rows } = await db.query(
            `SELECT h.id, h.codigo_original, h.tipo, h.abo, h.fator_rh,
                    to_char(h.data_validade, 'DD/MM/YYYY') AS data_validade_br,
                    (h.data_validade - CURRENT_DATE) AS dias_restantes,
                    l.codigo AS codigo_lote,
                    e.nome AS equipamento, a.gaveta, a.caixa, a.posicao_exata
             FROM hemocomponentes h
             JOIN lotes_recebimento l ON l.id = h.lote_id
             LEFT JOIN armazenamento a ON a.hemocomponente_id = h.id
             LEFT JOIN equipamentos e ON e.id = a.equipamento_id
             WHERE h.tipo = $1
               AND h.status = 'DISPONIVEL'
               AND h.data_validade >= CURRENT_DATE
               AND h.tipagem_confirmada = TRUE
             ORDER BY h.data_validade ASC, h.id ASC`,
            [solicitacao.tipo]
        );

        return rows
            .map(b => ({ ...b, nivel: avaliar(paciente, b, solicitacao.tipo) }))
            .filter(b => b.nivel)
            .sort((a, b) => {
                if (a.nivel !== b.nivel) return a.nivel === 'IDENTICA' ? -1 : 1;
                return a.dias_restantes - b.dias_restantes; // vence primeiro, sai primeiro
            });
    }

    // Reserva a bolsa para a solicitação (tudo ou nada)
    static async reservar(solicitacaoId, bolsaId, usuarioId) {
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const s = (await cliente.query(
                `SELECT s.id, s.tipo, s.status, p.abo AS paciente_abo, p.fator_rh AS paciente_rh
                 FROM solicitacoes_transfusionais s
                 JOIN pacientes p ON p.id = s.paciente_id
                 WHERE s.id = $1 FOR UPDATE OF s`, [solicitacaoId])).rows[0];
            if (!s) throw new ErroNegocio('Solicitação não encontrada.');
            if (s.status !== 'PENDENTE') throw new ErroNegocio('Só é possível reservar bolsa para solicitações pendentes.');
            if (!s.paciente_abo || !s.paciente_rh) {
                throw new ErroNegocio('O paciente não tem tipagem (ABO/Rh) cadastrada.');
            }

            const b = (await cliente.query(
                `SELECT id, codigo_original, tipo, abo, fator_rh, status, tipagem_confirmada,
                        (data_validade >= CURRENT_DATE) AS na_validade
                 FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [bolsaId])).rows[0];
            if (!b) throw new ErroNegocio('Bolsa não encontrada.');
            if (b.status !== 'DISPONIVEL') throw new ErroNegocio('Essa bolsa não está mais disponível.');
            if (!b.na_validade) throw new ErroNegocio('Essa bolsa está vencida.');
            if (!b.tipagem_confirmada) throw new ErroNegocio('A tipagem dessa bolsa não foi confirmada.');
            if (b.tipo !== s.tipo) throw new ErroNegocio('O tipo da bolsa não corresponde ao tipo solicitado.');

            // Confere a compatibilidade no servidor, sem confiar no que veio da tela
            const nivel = avaliar({ abo: s.paciente_abo, fator_rh: s.paciente_rh }, b, s.tipo);
            if (!nivel) throw new ErroNegocio('Bolsa incompatível com o paciente.');

            await cliente.query(
                `UPDATE hemocomponentes SET status = 'RESERVADA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [bolsaId]);
            await cliente.query(
                `UPDATE solicitacoes_transfusionais
                 SET status = 'RESERVADA', hemocomponente_id = $1, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $2`, [bolsaId, solicitacaoId]);

            await cliente.query('COMMIT');
            return { codigo: b.codigo_original, nivel };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = CompatibilidadeService;
