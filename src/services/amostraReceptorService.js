const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

class AmostraReceptorService {
    static async listarPorPaciente(pacienteId) {
        const { rows } = await db.query(`
            SELECT a.*, u.nome AS responsavel_nome,
                   to_char(a.coletado_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS coleta_br,
                   to_char(a.recebido_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS recebimento_br,
                   to_char((a.coletado_em + INTERVAL '72 hours') AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS validade_br,
                   (a.coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
            FROM amostras_receptor a
            LEFT JOIN usuarios u ON u.id = a.realizado_por
            WHERE a.paciente_id = $1
            ORDER BY a.coletado_em DESC
        `, [pacienteId]);
        return rows;
    }

    static async criar(pacienteId, dados, usuarioId) {
        const obrigatorios = ['coletado_em','recebido_em','dupla_checagem','abo','fator_rh','controle_rh','pai'];
        for (const campo of obrigatorios) if (!String(dados[campo] || '').trim()) {
            throw new ErroNegocio('Preencha todos os campos obrigatórios da amostra e dos exames.');
        }
        if (!['A','B','AB','O'].includes(dados.abo) || !['+','-'].includes(dados.fator_rh)) {
            throw new ErroNegocio('Informe corretamente o grupo ABO e o fator Rh.');
        }
        if (!['NEGATIVO','POSITIVO'].includes(dados.controle_rh) || !['NEGATIVO','POSITIVO'].includes(dados.pai)) {
            throw new ErroNegocio('Controle Rh e PAI devem ser Negativo ou Positivo.');
        }
        if (dados.controle_rh === 'POSITIVO' && String(dados.controle_rh_justificativa || '').trim().length < 5) {
            throw new ErroNegocio('Justifique o Controle Rh positivo.');
        }
        if (dados.pai === 'POSITIVO' && String(dados.pai_justificativa || '').trim().length < 5) {
            throw new ErroNegocio('Justifique o PAI positivo.');
        }
        const interpretarHorarioLocal = valor => new Date(valor.length === 16 ? valor + ':00-03:00' : valor);
        const coleta = interpretarHorarioLocal(dados.coletado_em);
        const recebimento = interpretarHorarioLocal(dados.recebido_em);
        if (isNaN(coleta) || isNaN(recebimento) || recebimento < coleta) {
            throw new ErroNegocio('Confira as datas e horários de coleta e recebimento.');
        }
        const paciente = (await db.query('SELECT id, ativo FROM pacientes WHERE id=$1',[pacienteId])).rows[0];
        if (!paciente || !paciente.ativo) throw new ErroNegocio('Receptor não encontrado ou inativo.');

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');
            const codigo = 'AM-' + Date.now().toString(36).toUpperCase();
            const { rows } = await cliente.query(`
                INSERT INTO amostras_receptor
                (paciente_id,codigo,coletado_em,recebido_em,responsavel_coleta,responsavel_recebimento,
                 dupla_checagem,abo,fator_rh,controle_rh,controle_rh_justificativa,pai,pai_justificativa,realizado_por)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                RETURNING id
            `, [pacienteId,codigo,coleta.toISOString(),recebimento.toISOString(),
                (dados.responsavel_coleta||'').trim()||null,(dados.responsavel_recebimento||'').trim()||null,
                dados.dupla_checagem.trim(),dados.abo,dados.fator_rh,dados.controle_rh,
                (dados.controle_rh_justificativa||'').trim()||null,dados.pai,
                (dados.pai_justificativa||'').trim()||null,usuarioId]);
            // Atualiza o grupo do cadastro a partir do resultado registrado na amostra.
            await cliente.query('UPDATE pacientes SET abo=$1,fator_rh=$2,atualizado_em=CURRENT_TIMESTAMP WHERE id=$3',
                [dados.abo,dados.fator_rh,pacienteId]);
            await cliente.query('COMMIT');
            return rows[0].id;
        } catch (e) { await cliente.query('ROLLBACK'); throw e; }
        finally { cliente.release(); }
    }

    static async podeSolicitar(pacienteId) {
        const { rows } = await db.query(`
            SELECT id, pai, pai_justificativa, coletado_em,
                   (coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
            FROM amostras_receptor WHERE paciente_id=$1
            ORDER BY coletado_em DESC LIMIT 1
        `, [pacienteId]);
        const a = rows[0];
        if (!a) return { permitido:false, motivo:'O receptor ainda não possui amostra com tipagem e PAI registrados.' };
        if (!a.valida) return { permitido:false, motivo:'A amostra está vencida. Colete e registre uma nova amostra (validade de 72 horas).' };
        if (a.pai === 'POSITIVO') return { permitido:false, motivo:'PAI positivo registrado. A solicitação transfusional está bloqueada e exige avaliação/liberação formal conforme protocolo do serviço.' };
        return { permitido:true };
    }
}
module.exports = AmostraReceptorService;
