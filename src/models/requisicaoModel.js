const db = require('../config/database');
const AmostraModel = require('./amostraModel');
const {
    PADROES,
    LIMITE_TEXTO_LIVRE,
    textoLivreValido,
    normalizarEspacos
} = require('../utils/padroes');
const { ErroConflito, ErroNaoEncontrado, ErroValidacao } = require('../utils/erros');

const TIPOS = ['CH', 'PLASMA', 'PLAQUETAS', 'CRIO'];
const PRAZOS = ['3_HORAS', '6_HORAS', '24_HORAS', 'RESERVA_CIRURGICA', 'EXTREMA_URGENCIA'];

function interpretarDataHoraLocal(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
        return new Date(NaN);
    }
    return new Date(valor + ':00-03:00');
}

function normalizarItens(valor) {
    let itens;
    try {
        itens = typeof valor === 'string' ? JSON.parse(valor) : valor;
    } catch (erro) {
        throw new ErroValidacao('A lista de hemocomponentes está inválida. Revise os itens inseridos.');
    }
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 20) {
        throw new ErroValidacao('Insira pelo menos um hemocomponente. O limite é de 20 tipos por requisição.');
    }

    let total = 0;
    const normalizados = itens.map((item) => {
        const tipo = String(item.tipo || '').trim().toUpperCase();
        const quantidade = Number(item.quantidade);
        if (!TIPOS.includes(tipo)) throw new ErroValidacao('Existe um tipo de hemocomponente inválido na requisição.');
        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
            throw new ErroValidacao('A quantidade de cada hemocomponente deve ser de 1 a 10 unidades.');
        }
        total += quantidade;
        return { tipo, quantidade };
    });
    if (total > 50) throw new ErroValidacao('A requisição pode conter no máximo 50 unidades.');
    return normalizados;
}

function urgenciaDoPrazo(prazo) {
    if (prazo === 'EXTREMA_URGENCIA') return 'EMERGENCIA';
    if (prazo === '3_HORAS' || prazo === '6_HORAS') return 'URGENTE';
    return 'ROTINA';
}

class RequisicaoModel {
    static async buscarContextoPaciente(pacienteId) {
        const { rows } = await db.query(`
            SELECT p.id, p.nome, p.nome_mae, p.prontuario, p.data_nascimento,
                   to_char(p.data_nascimento, 'DD/MM/YYYY') AS nascimento_br,
                   p.abo, p.fator_rh,
                   a.id AS amostra_id,
                   a.codigo AS amostra_codigo,
                   a.coletado_em,
                   to_char(a.coletado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS coleta_br,
                   to_char((a.coletado_em + INTERVAL '72 hours') AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS validade_br,
                   (a.coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS amostra_valida,
                   a.status_imuno, a.pai, a.controle_rh, a.solicitacao_transfusao,
                   p.ativo
            FROM pacientes p
            LEFT JOIN LATERAL (
                SELECT ar.*
                FROM amostras_receptor ar
                WHERE ar.paciente_id = p.id
                ORDER BY ar.coletado_em DESC, ar.id DESC
                LIMIT 1
            ) a ON TRUE
            WHERE p.id = $1
        `, [pacienteId]);
        const paciente = rows[0];
        if (!paciente) return null;
        const liberacao = await AmostraModel.podeSolicitar(pacienteId);
        return { ...paciente, liberacao };
    }

    static async criar(dados, usuarioId) {
        const pacienteId = Number(dados.paciente_id);
        if (!Number.isInteger(pacienteId) || pacienteId <= 0) throw new ErroValidacao('Selecione um receptor válido.');

        const dataHora = interpretarDataHoraLocal(String(dados.data_hora_requisicao || ''));
        if (Number.isNaN(dataHora.getTime()) || dataHora > new Date()) {
            throw new ErroValidacao('Informe uma data e hora de requisição válidas, sem horário futuro.');
        }

        const medico = normalizarEspacos(dados.medico_solicitante || '');
        if (!PADROES.nomePessoa.regex.test(medico)) {
            throw new ErroValidacao(`Informe o médico solicitante. ${PADROES.nomePessoa.mensagem}`);
        }

        const setor = normalizarEspacos(dados.setor_solicitante || '');
        if (setor.length < 2 || setor.length > 120 || !textoLivreValido(setor)) {
            throw new ErroValidacao('Informe o setor solicitante (até 120 caracteres).');
        }

        const diagnostico = String(dados.diagnostico || '').trim();
        if (!diagnostico || !textoLivreValido(diagnostico)) {
            throw new ErroValidacao('Informe o diagnóstico/indicação clínica (até 500 caracteres).');
        }

        if (!PRAZOS.includes(dados.prazo_solicitacao)) {
            throw new ErroValidacao('Selecione o tempo ou a modalidade da solicitação.');
        }

        const hemoglobinaTexto = String(dados.hemoglobina || '').trim().replace(',', '.');
        const hemoglobina = hemoglobinaTexto ? Number(hemoglobinaTexto) : null;
        if (hemoglobinaTexto && (!Number.isFinite(hemoglobina) || hemoglobina < 0 || hemoglobina > 50)) {
            throw new ErroValidacao('Informe um valor de hemoglobina válido, entre 0 e 50 g/dL.');
        }

        if (dados.consentimento_confirmado !== 'on') {
            throw new ErroValidacao('Confirme o termo de consentimento antes de continuar.');
        }
        if (dados.requisicao_conforme !== 'on') {
            throw new ErroValidacao('Confirme que a requisição médica está conforme.');
        }

        const itens = normalizarItens(dados.itens_json);
        const liberacao = await AmostraModel.podeSolicitar(pacienteId);
        if (!liberacao.permitido) throw new ErroConflito(liberacao.motivo);

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const paciente = (await cliente.query(
                'SELECT id, ativo FROM pacientes WHERE id = $1 FOR SHARE', [pacienteId]
            )).rows[0];
            if (!paciente || !paciente.ativo) throw new ErroNaoEncontrado('Receptor não encontrado ou inativo.');

            const amostra = (await cliente.query(`
                SELECT id, status_imuno, pai, controle_rh, solicitacao_transfusao,
                       (coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
                FROM amostras_receptor
                WHERE paciente_id = $1
                ORDER BY coletado_em DESC, id DESC
                LIMIT 1
                FOR SHARE
            `, [pacienteId])).rows[0];
            if (!amostra || !amostra.valida || amostra.status_imuno !== 'CONCLUIDO' ||
                amostra.pai !== 'NEGATIVO' || amostra.controle_rh !== 'NEGATIVO' ||
                !amostra.solicitacao_transfusao) {
                throw new ErroConflito('A amostra mais recente não está válida e liberada para transfusão. Atualize a coleta e os testes Imuno.');
            }

            const { rows: requisicao } = await cliente.query(`
                INSERT INTO requisicoes_transfusionais
                    (paciente_id, amostra_id, data_hora_requisicao, solicitado_por,
                     medico_solicitante, hemoglobina, consentimento_confirmado,
                     requisicao_conforme, setor_solicitante, diagnostico, prazo_solicitacao)
                VALUES ($1,$2,$3,$4,$5,$6,TRUE,TRUE,$7,$8,$9)
                RETURNING id
            `, [
                pacienteId, amostra.id, dataHora.toISOString(), usuarioId, medico,
                hemoglobina, setor, diagnostico, dados.prazo_solicitacao
            ]);
            const requisicaoId = requisicao[0].id;
            const urgencia = urgenciaDoPrazo(dados.prazo_solicitacao);
            let itemNumero = 0;

            for (const item of itens) {
                for (let unidade = 0; unidade < item.quantidade; unidade++) {
                    itemNumero += 1;
                    await cliente.query(`
                        INSERT INTO solicitacoes_transfusionais
                            (requisicao_id, item_numero, paciente_id, tipo, urgencia,
                             medico_solicitante, indicacao, solicitado_por)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    `, [
                        requisicaoId, itemNumero, pacienteId, item.tipo, urgencia,
                        medico, diagnostico, usuarioId
                    ]);
                }
            }

            await cliente.query('COMMIT');
            return requisicaoId;
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }

    static async buscarPorId(id) {
        const { rows } = await db.query(`
            SELECT r.*, p.nome AS paciente_nome, p.prontuario,
                   p.nome_mae, p.abo AS paciente_abo, p.fator_rh AS paciente_rh,
                   to_char(p.data_nascimento, 'DD/MM/YYYY') AS nascimento_br,
                   to_char(r.data_hora_requisicao AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS requisicao_br,
                   to_char(a.coletado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS coleta_br,
                   to_char((a.coletado_em + INTERVAL '72 hours') AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS validade_amostra_br,
                   u.nome AS solicitado_por_nome,
                   (a.coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS amostra_valida
            FROM requisicoes_transfusionais r
            JOIN pacientes p ON p.id = r.paciente_id
            JOIN amostras_receptor a ON a.id = r.amostra_id
            JOIN usuarios u ON u.id = r.solicitado_por
            WHERE r.id = $1
        `, [id]);
        return rows[0] || null;
    }

    static async listarItens(requisicaoId) {
        const { rows } = await db.query(`
            SELECT s.id, s.requisicao_id, s.item_numero, s.tipo, s.urgencia,
                   s.status, s.hemocomponente_id,
                   h.codigo_original AS bolsa_codigo,
                   h.codigo_interno AS bolsa_codigo_interno,
                   h.abo AS bolsa_abo, h.fator_rh AS bolsa_rh, h.volume_ml,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS bolsa_validade_br,
                   (SELECT pc.id FROM provas_cruzadas pc
                    WHERE pc.solicitacao_id = s.id AND pc.resultado = 'COMPATIVEL'
                    ORDER BY pc.criado_em DESC LIMIT 1) AS prova_compativel_id
            FROM solicitacoes_transfusionais s
            LEFT JOIN hemocomponentes h ON h.id = s.hemocomponente_id
            WHERE s.requisicao_id = $1
            ORDER BY s.item_numero ASC, s.id ASC
        `, [requisicaoId]);
        return rows;
    }

    static async listarBolsasDisponiveis(item) {
        const { rows } = await db.query(`
            SELECT h.id, h.codigo_original, h.codigo_interno, h.tipo, h.abo, h.fator_rh,
                   h.volume_ml,
                   to_char(h.data_validade, 'DD/MM/YYYY') AS data_validade_br,
                   (h.data_validade - CURRENT_DATE) AS dias_restantes,
                   l.codigo AS codigo_lote
            FROM hemocomponentes h
            JOIN lotes_recebimento l ON l.id = h.lote_id
            WHERE h.tipo = $1
              AND h.status = 'DISPONIVEL'
              AND h.data_validade >= CURRENT_DATE
              AND h.tipagem_confirmada = TRUE
              AND h.abo IS NOT NULL AND h.fator_rh IS NOT NULL
            ORDER BY h.data_validade ASC, h.id ASC
        `, [item.tipo]);
        return rows;
    }

    static async listarProvas(requisicaoId) {
        const { rows } = await db.query(`
            SELECT pc.id, pc.solicitacao_id, pc.resultado, pc.responsavel_nome,
                   to_char(pc.data_hora_prova AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data_hora_br,
                   pc.codigo_original, pc.codigo_interno, pc.abo_bolsa, pc.fator_rh_bolsa,
                   pc.volume_ml, s.item_numero, s.tipo
            FROM provas_cruzadas pc
            JOIN solicitacoes_transfusionais s ON s.id = pc.solicitacao_id
            WHERE pc.requisicao_id = $1
            ORDER BY pc.criado_em DESC, pc.id DESC
        `, [requisicaoId]);
        return rows;
    }

    static async registrarProva(requisicaoId, dados, usuarioId) {
        const solicitacaoId = Number(dados.solicitacao_id);
        const bolsaId = Number(dados.hemocomponente_id);
        const resultado = String(dados.resultado || '').toUpperCase();
        const responsavel = normalizarEspacos(dados.responsavel_nome || '');
        const dataHora = interpretarDataHoraLocal(String(dados.data_hora_prova || ''));

        if (!Number.isInteger(solicitacaoId) || solicitacaoId <= 0 ||
            !Number.isInteger(bolsaId) || bolsaId <= 0) {
            throw new ErroValidacao('Selecione o item da solicitação e a bolsa.');
        }
        if (!['COMPATIVEL', 'INCOMPATIVEL'].includes(resultado)) {
            throw new ErroValidacao('Selecione o resultado registrado da prova cruzada.');
        }
        if (!PADROES.nomePessoa.regex.test(responsavel)) {
            throw new ErroValidacao(`Informe o nome do profissional que realizou a prova. ${PADROES.nomePessoa.mensagem}`);
        }
        if (Number.isNaN(dataHora.getTime()) || dataHora > new Date()) {
            throw new ErroValidacao('Informe uma data e hora válidas para a prova cruzada.');
        }
        if (dados.tipagem_bolsa_confirmada !== 'on') {
            throw new ErroValidacao('Confirme a conferência da tipagem ABO/Rh da bolsa.');
        }

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const requisicao = (await cliente.query(`
                SELECT r.id, r.paciente_id, r.amostra_id, r.status,
                       p.abo AS paciente_abo, p.fator_rh AS paciente_rh
                FROM requisicoes_transfusionais r
                JOIN pacientes p ON p.id = r.paciente_id
                WHERE r.id = $1
                FOR UPDATE OF r
            `, [requisicaoId])).rows[0];
            if (!requisicao) throw new ErroNaoEncontrado('Requisição transfusional não encontrada.');
            if (requisicao.status === 'CANCELADA' || requisicao.status === 'ATENDIDA') {
                throw new ErroConflito('Esta requisição não aceita novas provas cruzadas.');
            }

            const amostra = (await cliente.query(`
                SELECT id, status_imuno, pai, controle_rh, solicitacao_transfusao,
                       (coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
                FROM amostras_receptor
                WHERE id = $1 AND paciente_id = $2
                FOR SHARE
            `, [requisicao.amostra_id, requisicao.paciente_id])).rows[0];
            if (!amostra || !amostra.valida || amostra.status_imuno !== 'CONCLUIDO' ||
                amostra.pai !== 'NEGATIVO' || amostra.controle_rh !== 'NEGATIVO' ||
                !amostra.solicitacao_transfusao) {
                throw new ErroConflito('A amostra vinculada à requisição não está mais válida ou liberada para transfusão.');
            }

            const item = (await cliente.query(`
                SELECT id, tipo, status, hemocomponente_id
                FROM solicitacoes_transfusionais
                WHERE id = $1 AND requisicao_id = $2
                FOR UPDATE
            `, [solicitacaoId, requisicaoId])).rows[0];
            if (!item) throw new ErroNaoEncontrado('Item não encontrado nesta requisição.');
            if (item.status !== 'PENDENTE' || item.hemocomponente_id) {
                throw new ErroConflito('Este item já possui bolsa vinculada ou não está pendente.');
            }

            const bolsa = (await cliente.query(`
                SELECT id, codigo_original, codigo_interno, tipo, abo, fator_rh, volume_ml,
                       status, tipagem_confirmada, data_validade,
                       (data_validade >= CURRENT_DATE) AS na_validade
                FROM hemocomponentes
                WHERE id = $1
                FOR UPDATE
            `, [bolsaId])).rows[0];
            if (!bolsa) throw new ErroNaoEncontrado('Bolsa não encontrada.');
            if (bolsa.status !== 'DISPONIVEL') throw new ErroConflito('Esta bolsa não está disponível no estoque.');
            if (!bolsa.na_validade) throw new ErroConflito('Esta bolsa está vencida.');
            if (!bolsa.tipagem_confirmada || !bolsa.abo || !bolsa.fator_rh) {
                throw new ErroConflito('A tipagem ABO/Rh da bolsa precisa estar confirmada no cadastro.');
            }
            if (bolsa.tipo !== item.tipo) throw new ErroConflito('O componente da bolsa não corresponde ao item da requisição.');

            // O resultado da prova cruzada é informado pelo profissional executor.
            // O sistema não realiza nem interpreta o exame: registra a declaração e
            // só reserva a bolsa quando o resultado informado for COMPATÍVEL.

            const { rows: provaRows } = await cliente.query(`
                INSERT INTO provas_cruzadas
                    (requisicao_id, solicitacao_id, paciente_id, hemocomponente_id,
                     realizado_por, responsavel_nome, data_hora_prova, resultado,
                     tipagem_bolsa_confirmada, abo_bolsa, fator_rh_bolsa, volume_ml,
                     codigo_original, codigo_interno)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,$11,$12,$13)
                RETURNING id
            `, [
                requisicaoId, solicitacaoId, requisicao.paciente_id, bolsaId,
                usuarioId, responsavel, dataHora.toISOString(), resultado,
                bolsa.abo, bolsa.fator_rh, bolsa.volume_ml, bolsa.codigo_original, bolsa.codigo_interno
            ]);
            const provaId = provaRows[0].id;

            if (resultado === 'COMPATIVEL') {
                await cliente.query(`
                    UPDATE hemocomponentes
                    SET status = 'RESERVADA', atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = $1 AND status = 'DISPONIVEL'
                `, [bolsaId]);
                await cliente.query(`
                    UPDATE solicitacoes_transfusionais
                    SET status = 'RESERVADA', hemocomponente_id = $1, atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [bolsaId, solicitacaoId]);
            }

            const contagem = (await cliente.query(`
                SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE status = 'RESERVADA')::int AS reservadas
                FROM solicitacoes_transfusionais
                WHERE requisicao_id = $1
            `, [requisicaoId])).rows[0];
            const statusRequisicao = contagem.total > 0 && contagem.total === contagem.reservadas
                ? 'RESERVADA'
                : (contagem.reservadas > 0 ? 'PARCIAL' : 'PENDENTE');
            await cliente.query(`
                UPDATE requisicoes_transfusionais
                SET status = $1, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [statusRequisicao, requisicaoId]);

            await cliente.query('COMMIT');
            return { id: provaId, resultado, reservada: resultado === 'COMPATIVEL', codigo: bolsa.codigo_original };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }

    static async buscarEtiqueta(provaId) {
        const { rows } = await db.query(`
            SELECT pc.id, pc.resultado, pc.responsavel_nome, pc.codigo_original,
                   pc.codigo_interno, pc.abo_bolsa, pc.fator_rh_bolsa, pc.volume_ml,
                   to_char(pc.data_hora_prova AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_prova_br,
                   to_char(pc.data_hora_prova AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora_prova_br,
                   p.nome AS paciente_nome, p.nome_mae,
                   p.abo AS paciente_abo, p.fator_rh AS paciente_rh,
                   to_char(p.data_nascimento, 'DD/MM/YYYY') AS nascimento_br,
                   r.id AS requisicao_id
            FROM provas_cruzadas pc
            JOIN pacientes p ON p.id = pc.paciente_id
            JOIN requisicoes_transfusionais r ON r.id = pc.requisicao_id
            JOIN solicitacoes_transfusionais s ON s.id = pc.solicitacao_id
            WHERE pc.id = $1
              AND pc.resultado = 'COMPATIVEL'
              AND r.status <> 'CANCELADA'
              AND s.status <> 'CANCELADA'
        `, [provaId]);
        return rows[0] || null;
    }
}

module.exports = RequisicaoModel;
