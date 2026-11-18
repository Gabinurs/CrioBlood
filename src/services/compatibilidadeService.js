const db = require('../database');
const { ErroNegocio } = require('../utils/erros');
const AmostraReceptorService = require('./amostraReceptorService');

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
            `SELECT h.id, h.codigo_interno, h.codigo_original, h.tipo, h.abo, h.fator_rh,
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

    // Localiza uma bolsa pelo código físico informado pelo colaborador.
    static async buscarBolsaPorCodigo(solicitacao, codigo) {
        const informado = String(codigo || '').trim();
        if (informado.length < 4 || informado.length > 80) {
            throw new ErroNegocio('Digite um código de bolsa válido.');
        }

        const { rows } = await db.query(
            `SELECT h.id, h.codigo_interno, h.codigo_original, h.tipo, h.abo, h.fator_rh,
                    h.status, h.tipagem_confirmada,
                    (h.data_validade >= CURRENT_DATE) AS na_validade,
                    to_char(h.data_validade, 'DD/MM/YYYY') AS data_validade_br,
                    (h.data_validade - CURRENT_DATE) AS dias_restantes,
                    l.codigo AS codigo_lote
             FROM hemocomponentes h
             LEFT JOIN lotes_recebimento l ON l.id = h.lote_id
             WHERE UPPER(h.codigo_interno) = UPPER($1)
                OR UPPER(h.codigo_original) = UPPER($1)
             LIMIT 1`,
            [informado]
        );
        const bolsa = rows[0];
        if (!bolsa) throw new ErroNegocio('Nenhuma bolsa foi encontrada com esse código.');

        const nivel = bolsa.tipo === solicitacao.tipo
            ? avaliar(
                { abo: solicitacao.paciente_abo, fator_rh: solicitacao.paciente_rh },
                bolsa,
                solicitacao.tipo
            )
            : null;

        return {
            ...bolsa,
            nivel,
            codigo_corresponde: [bolsa.codigo_interno, bolsa.codigo_original]
                .some(c => String(c || '').toUpperCase() === informado.toUpperCase()),
            apta_para_reserva: bolsa.status === 'DISPONIVEL'
                && bolsa.na_validade === true
                && bolsa.tipagem_confirmada === true
                && bolsa.tipo === solicitacao.tipo
                && Boolean(nivel)
        };
    }

    // Reserva a bolsa para a solicitação (tudo ou nada)
    static async reservar(solicitacaoId, bolsaId, usuarioId, confirmacoes) {
        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');

            const colaborador = (await cliente.query(
                `SELECT id, nome, funcao, ativo, administrador
                 FROM usuarios WHERE id = $1 FOR SHARE`, [usuarioId]
            )).rows[0];
            const funcoesPermitidas = ['TECNICO_ENFERMAGEM', 'TECNICO_LABORATORIO', 'TECNICO_TRANSFUSAO'];
            if (!colaborador || !colaborador.ativo || (!colaborador.administrador && !funcoesPermitidas.includes(colaborador.funcao))) {
                throw new ErroNegocio('Seu usuário precisa estar cadastrado com uma função profissional válida para realizar a conferência.');
            }

            const s = (await cliente.query(
                `SELECT s.id, s.tipo, s.status, s.paciente_id,
                        p.abo AS paciente_abo, p.fator_rh AS paciente_rh
                 FROM solicitacoes_transfusionais s
                 JOIN pacientes p ON p.id = s.paciente_id
                 WHERE s.id = $1 FOR UPDATE OF s`, [solicitacaoId])).rows[0];
            if (!s) throw new ErroNegocio('Solicitação não encontrada.');
            if (s.status !== 'PENDENTE') throw new ErroNegocio('Só é possível reservar bolsa para solicitações pendentes.');
            const liberacao = await AmostraReceptorService.podeSolicitar(s.paciente_id);
            if (!liberacao.permitido) throw new ErroNegocio(liberacao.motivo);
            if (!s.paciente_abo || !s.paciente_rh) {
                throw new ErroNegocio('O paciente não tem tipagem (ABO/Rh) cadastrada.');
            }

            const b = (await cliente.query(
                `SELECT id, codigo_interno, codigo_original, tipo, abo, fator_rh, status, tipagem_confirmada,
                        (data_validade >= CURRENT_DATE) AS na_validade
                 FROM hemocomponentes WHERE id = $1 FOR UPDATE`, [bolsaId])).rows[0];
            if (!b) throw new ErroNegocio('Bolsa não encontrada.');

            const codigoInformado = String(confirmacoes?.codigo_informado || '').trim();
            const codigoConfere = [b.codigo_interno, b.codigo_original]
                .some(c => String(c || '').toUpperCase() === codigoInformado.toUpperCase());
            if (!codigoInformado || !codigoConfere) {
                throw new ErroNegocio('O código digitado não corresponde ao código interno ou original da bolsa.');
            }
            if (confirmacoes?.confirmou_codigo !== '1') {
                throw new ErroNegocio('Confirme a identificação física do código da bolsa.');
            }
            if (confirmacoes?.confirmou_tipagem !== '1') {
                throw new ErroNegocio('Confirme a conferência da tipagem ABO/Rh do receptor e da bolsa.');
            }
            if (confirmacoes?.confirmou_compatibilidade !== '1') {
                throw new ErroNegocio('Confirme que verificou o resultado de compatibilidade.');
            }
            if (b.status !== 'DISPONIVEL') throw new ErroNegocio('Essa bolsa não está disponível.');
            if (!b.na_validade) throw new ErroNegocio('Essa bolsa está vencida.');
            if (!b.tipagem_confirmada) throw new ErroNegocio('A tipagem cadastrada da bolsa ainda não foi confirmada.');
            if (b.tipo !== s.tipo) throw new ErroNegocio('O tipo da bolsa não corresponde ao tipo solicitado.');

            // Recalcula no servidor; a confirmação visual nunca substitui a regra técnica.
            const nivel = avaliar({ abo: s.paciente_abo, fator_rh: s.paciente_rh }, b, s.tipo);
            if (!nivel) throw new ErroNegocio('A bolsa não é compatível pela regra ABO/Rh cadastrada. Não é possível reservá-la.');

            await cliente.query(
                `INSERT INTO conferencias_compatibilidade
                    (solicitacao_id, hemocomponente_id, colaborador_id, funcao_colaborador,
                     codigo_informado, codigo_confirmado, tipagem_confirmada,
                     compatibilidade_confirmada, tipagem_receptor, tipagem_bolsa, resultado_sistema)
                 VALUES ($1,$2,$3,$4,$5,TRUE,TRUE,TRUE,$6,$7,$8)`,
                [solicitacaoId, bolsaId, colaborador.id, colaborador.administrador && !colaborador.funcao ? 'SUPERVISOR_ADMINISTRADOR' : (colaborador.funcao || 'SUPERVISOR_ADMINISTRADOR'), codigoInformado,
                 s.paciente_abo + s.paciente_rh, b.abo + b.fator_rh, nivel]
            );

            await cliente.query(
                `UPDATE hemocomponentes SET status = 'RESERVADA', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
                [bolsaId]);
            await cliente.query(
                `UPDATE solicitacoes_transfusionais
                 SET status = 'RESERVADA', hemocomponente_id = $1, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $2`, [bolsaId, solicitacaoId]);

            await cliente.query('COMMIT');
            return { codigo: b.codigo_interno, nivel, colaborador: colaborador.nome, funcao: colaborador.funcao || (colaborador.administrador ? 'SUPERVISOR_ADMINISTRADOR' : 'NAO_INFORMADO') };
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = CompatibilidadeService;
