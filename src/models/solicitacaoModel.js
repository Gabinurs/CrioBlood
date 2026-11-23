const db = require('../config/database');
const { PADROES, LIMITE_TEXTO_LIVRE, textoLivreValido, normalizarEspacos } = require('../utils/padroes');
const { sqlLimite } = require('../utils/paginacao');
const { ErroConflito, ErroNaoEncontrado, ErroValidacao } = require('../utils/erros');
const AmostraModel = require('./amostraModel');

const TIPOS = ['CH', 'PLASMA', 'PLAQUETAS', 'CRIO'];
const URGENCIAS = ['ROTINA', 'URGENTE', 'EMERGENCIA'];

class SolicitacaoModel {
    static async listar(pag = {}) {
        const { rows } = await db.query(`
            SELECT s.id, s.tipo, s.urgencia, s.medico_solicitante, s.indicacao, s.status,
                   s.hemocomponente_id,
                   p.nome AS paciente_nome, p.prontuario,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh,
                   h.codigo_original AS bolsa_codigo,
                   to_char(s.criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS criado_em_br
            FROM solicitacoes_transfusionais s
            JOIN pacientes p ON p.id = s.paciente_id
            LEFT JOIN hemocomponentes h ON h.id = s.hemocomponente_id
            ORDER BY CASE s.status WHEN 'PENDENTE' THEN 0 WHEN 'RESERVADA' THEN 1 ELSE 2 END,
                     CASE s.urgencia WHEN 'EMERGENCIA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END,
                     s.criado_em DESC
            ${sqlLimite(pag)}
        `);
        return rows;
    }

    static async contar() {
        const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM solicitacoes_transfusionais');
        return rows[0].total;
    }

    static async listarPendentes() {
        const todas = await SolicitacaoModel.listar();
        return todas.filter(s => s.status === 'PENDENTE');
    }

    static async buscarPorId(id) {
        const { rows } = await db.query(`
            SELECT s.*, p.nome AS paciente_nome, p.prontuario,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh
            FROM solicitacoes_transfusionais s
            JOIN pacientes p ON p.id = s.paciente_id
            WHERE s.id = $1
        `, [id]);
        return rows[0];
    }

    static async criar(dados, usuarioId) {
        const pacienteId = parseInt(dados.paciente_id, 10);
        const medico = normalizarEspacos(dados.medico_solicitante);
        const indicacao = (dados.indicacao || '').trim();

        if (!pacienteId) throw new ErroValidacao('Selecione o paciente.');
        if (!TIPOS.includes(dados.tipo)) throw new ErroValidacao('Selecione o tipo de hemocomponente.');
        if (!URGENCIAS.includes(dados.urgencia)) throw new ErroValidacao('Selecione a urgência.');
        if (!PADROES.nomePessoa.regex.test(medico)) {
            throw new ErroValidacao(`Nome do médico inválido. ${PADROES.nomePessoa.mensagem}`);
        }
        if (!textoLivreValido(indicacao)) {
            throw new ErroValidacao(`Indicação: use até ${LIMITE_TEXTO_LIVRE} caracteres, sem caracteres de controle.`);
        }

        const paciente = (await db.query(
            'SELECT id, ativo FROM pacientes WHERE id = $1', [pacienteId])).rows[0];
        if (!paciente) throw new ErroNaoEncontrado('Paciente não encontrado.');
        if (!paciente.ativo) throw new ErroConflito('Esse paciente está inativo.');

        // A solicitação só pode ser registrada após amostra válida, marcada para transfusão/reserva
        // e com os testes Imuno concluídos sem PAI ou Controle positivos.
        const liberacao = await AmostraModel.podeSolicitar(pacienteId);
        if (!liberacao.permitido) throw new ErroConflito(liberacao.motivo);

        const { rows } = await db.query(
            `INSERT INTO solicitacoes_transfusionais
                (paciente_id, tipo, urgencia, medico_solicitante, indicacao, solicitado_por)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [pacienteId, dados.tipo, dados.urgencia, medico,
             indicacao || null, usuarioId]
        );
        return rows[0].id;
    }

    // Cancela e, se havia bolsa reservada, devolve a bolsa ao estoque
    static async cancelar(id) {
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const s = (await cliente.query(
                'SELECT id, status, hemocomponente_id FROM solicitacoes_transfusionais WHERE id = $1 FOR UPDATE',
                [id])).rows[0];
            if (!s) throw new ErroNaoEncontrado('Solicitação não encontrada.');
            if (!['PENDENTE', 'RESERVADA'].includes(s.status)) {
                throw new ErroConflito('Só é possível cancelar solicitações pendentes ou com bolsa reservada.');
            }

            if (s.status === 'RESERVADA') {
                await cliente.query(
                    `UPDATE hemocomponentes
                     SET status = CASE WHEN data_validade < CURRENT_DATE THEN 'VENCIDA' ELSE 'DISPONIVEL' END,
                         atualizado_em = CURRENT_TIMESTAMP
                     WHERE id = $1 AND status = 'RESERVADA'`,
                    [s.hemocomponente_id]);
            }

            await cliente.query(
                `UPDATE solicitacoes_transfusionais
                 SET status = 'CANCELADA', hemocomponente_id = NULL, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $1`, [id]);

            await cliente.query('COMMIT');
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = SolicitacaoModel;
