const db = require('../database');
const { ErroNegocio } = require('../utils/erros');
const AmostraReceptorService = require('./amostraReceptorService');

function lerDataHora(valor, rotulo) {
    const texto = String(valor || '').trim();
    if (!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(texto)) {
        throw new ErroNegocio(`Informe a data e o horário de ${rotulo}.`);
    }
    const data = new Date(`${texto}:00-03:00`);
    if (Number.isNaN(data.getTime()) || data > new Date()) {
        throw new ErroNegocio(`A data e o horário de ${rotulo} são inválidos ou futuros.`);
    }
    return data;
}

class TransfusaoService {
    static async listarProntas() {
        const { rows } = await db.query(`
            SELECT s.id, s.tipo, s.urgencia, s.medico_solicitante,
                   p.nome AS paciente_nome, p.prontuario,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh,
                   h.codigo_interno AS bolsa_codigo, h.abo AS bolsa_abo, h.fator_rh AS bolsa_rh,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes,
                   e.nome AS equipamento, ar.gaveta, ar.caixa, ar.posicao_exata
            FROM solicitacoes_transfusionais s
            JOIN pacientes p ON p.id = s.paciente_id
            JOIN hemocomponentes h ON h.id = s.hemocomponente_id
            LEFT JOIN armazenamento ar ON ar.hemocomponente_id = h.id
            LEFT JOIN equipamentos e ON e.id = ar.equipamento_id
            WHERE s.status = 'RESERVADA'
              AND NOT EXISTS (
                  SELECT 1 FROM transusoes_saidas t
                  WHERE t.hemocomponente_id = h.id AND t.status = 'EM_ANDAMENTO'
              )
            ORDER BY CASE s.urgencia WHEN 'EXTREMA_URGENCIA' THEN 0 WHEN 'SOLICITACAO_3H' THEN 1 WHEN 'SOLICITACAO_6H' THEN 2 WHEN 'URGENTE' THEN 1 WHEN 'EMERGENCIA' THEN 0 WHEN 'RESERVA_CIRURGICA' THEN 3 WHEN 'ROTINA_24H' THEN 4 ELSE 5 END,
                     s.criado_em ASC
        `);
        return rows;
    }

    static async listarEmAndamento() {
        const { rows } = await db.query(`
            SELECT t.id AS transfusao_id, t.inicio_em, t.responsavel_transfusao, t.observacoes,
                   to_char(t.inicio_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS inicio_br,
                   s.id AS solicitacao_id, s.tipo, s.urgencia,
                   p.nome AS paciente_nome, p.prontuario,
                   h.codigo_interno AS bolsa_codigo, h.abo AS bolsa_abo, h.fator_rh AS bolsa_rh
            FROM transusoes_saidas t
            JOIN solicitacoes_transfusionais s ON s.id = t.solicitacao_id
            JOIN pacientes p ON p.id = s.paciente_id
            JOIN hemocomponentes h ON h.id = t.hemocomponente_id
            WHERE t.status = 'EM_ANDAMENTO'
            ORDER BY t.inicio_em ASC
        `);
        return rows;
    }

    static async listarHistorico(limite = 50) {
        const { rows } = await db.query(`
            SELECT t.id, t.paciente_nome, t.prontuario, t.medico_solicitante, t.observacoes,
                   t.status, t.responsavel_transfusao,
                   h.codigo_interno AS bolsa_codigo, h.tipo, h.abo, h.fator_rh,
                   u.nome AS registrado_por_nome,
                   to_char(t.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS inicio_br,
                   to_char(t.termino_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS termino_br
            FROM transusoes_saidas t
            JOIN hemocomponentes h ON h.id = t.hemocomponente_id
            LEFT JOIN usuarios u ON u.id = t.registrado_por
            WHERE t.status = 'FINALIZADA'
            ORDER BY t.termino_em DESC NULLS LAST
            LIMIT $1
        `, [limite]);
        return rows;
    }

    // Inicia o acompanhamento sem baixar definitivamente a bolsa do estoque.
    static async iniciar(solicitacaoId, dados, usuarioId) {
        const inicio = lerDataHora(dados.inicio_em, 'início da transfusão');
        const responsavel = String(dados.responsavel_transfusao || '').trim();
        if (responsavel.length < 3 || responsavel.length > 150) {
            throw new ErroNegocio('Informe o nome do profissional responsável pela transfusão.');
        }

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');
            const s = (await cliente.query(
                `SELECT s.id, s.paciente_id, s.status, s.hemocomponente_id, s.medico_solicitante,
                        p.nome AS paciente_nome, p.prontuario
                 FROM solicitacoes_transfusionais s
                 JOIN pacientes p ON p.id = s.paciente_id
                 WHERE s.id = $1 FOR UPDATE OF s`, [solicitacaoId])).rows[0];

            if (!s) throw new ErroNegocio('Solicitação não encontrada.');
            if (s.status !== 'RESERVADA') throw new ErroNegocio('Só é possível iniciar uma transfusão com bolsa reservada.');

            const liberacao = await AmostraReceptorService.podeSolicitar(s.paciente_id);
            if (!liberacao.permitido) throw new ErroNegocio(liberacao.motivo);

            const b = (await cliente.query(
                `SELECT id, codigo_interno, status, (data_validade >= CURRENT_DATE) AS na_validade
                 FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [s.hemocomponente_id])).rows[0];

            if (!b || b.status !== 'RESERVADA') throw new ErroNegocio('A bolsa não está mais reservada.');
            if (!b.na_validade) throw new ErroNegocio('A bolsa reservada está vencida. Cancele a solicitação e reserve outra bolsa.');

            const existente = (await cliente.query(
                `SELECT id FROM transusoes_saidas WHERE hemocomponente_id = $1`, [b.id])).rows[0];
            if (existente) throw new ErroNegocio('Já existe um registro de transfusão para esta bolsa.');

            await cliente.query(
                `INSERT INTO transusoes_saidas
                    (hemocomponente_id, paciente_nome, prontuario, medico_solicitante,
                     observacoes, solicitacao_id, registrado_por, data_saida,
                     inicio_em, responsavel_transfusao, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,'EM_ANDAMENTO')`,
                [b.id, s.paciente_nome, s.prontuario, s.medico_solicitante,
                 String(dados.observacoes || '').trim() || null, s.id, usuarioId,
                 inicio.toISOString(), responsavel]);

            await cliente.query('COMMIT');
            return { codigo: b.codigo_interno, paciente: s.paciente_nome, responsavel, inicio };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }

    // Finaliza a transfusão e somente então baixa a bolsa do estoque.
    static async finalizar(transfusaoId, dados, usuarioId) {
        const termino = lerDataHora(dados.termino_em, 'término da transfusão');
        const observacaoFinal = String(dados.observacoes_finais || '').trim();

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');
            const t = (await cliente.query(
                `SELECT t.id, t.hemocomponente_id, t.solicitacao_id, t.inicio_em,
                        t.status, t.observacoes, t.paciente_nome
                 FROM transusoes_saidas t
                 WHERE t.id = $1 FOR UPDATE`, [transfusaoId])).rows[0];

            if (!t) throw new ErroNegocio('Registro de transfusão não encontrado.');
            if (t.status !== 'EM_ANDAMENTO') throw new ErroNegocio('Esta transfusão não está em andamento.');
            if (termino <= new Date(t.inicio_em)) throw new ErroNegocio('O término deve ser posterior ao início da transfusão.');

            const b = (await cliente.query(
                `SELECT id, status FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [t.hemocomponente_id])).rows[0];
            if (!b || b.status !== 'RESERVADA') throw new ErroNegocio('A bolsa não está mais reservada; confira o estoque antes de finalizar.');

            await cliente.query(
                `UPDATE transusoes_saidas
                 SET status = 'FINALIZADA', termino_em = $1,
                     observacoes = CASE WHEN $2 = '' THEN observacoes
                         WHEN observacoes IS NULL OR observacoes = '' THEN $2
                         ELSE observacoes || E'\\n' || $2 END,
                     finalizado_por = $3
                 WHERE id = $4`,
                [termino.toISOString(), observacaoFinal, usuarioId, transfusaoId]);

            await cliente.query(
                `UPDATE hemocomponentes SET status = 'TRANSFUNDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [b.id]);
            await cliente.query('DELETE FROM armazenamento WHERE hemocomponente_id = $1', [b.id]);
            await cliente.query(
                `UPDATE solicitacoes_transfusionais
                 SET status = 'ATENDIDA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [t.solicitacao_id]);

            await cliente.query('COMMIT');
            return { codigo: b.id, paciente: t.paciente_nome, termino };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = TransfusaoService;
