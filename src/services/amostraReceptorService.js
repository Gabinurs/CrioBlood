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

    static async buscarPorId(pacienteId, amostraId) {
        const { rows } = await db.query(`
            SELECT a.*, p.nome AS paciente_nome, p.nome_mae, p.data_nascimento,
                   to_char(p.data_nascimento,'DD/MM/YYYY') AS nascimento_br,
                   to_char(a.coletado_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS coleta_br,
                   to_char(a.recebido_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS recebimento_br,
                   to_char((a.coletado_em + INTERVAL '72 hours') AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS validade_br,
                   (a.coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
            FROM amostras_receptor a
            JOIN pacientes p ON p.id = a.paciente_id
            WHERE a.paciente_id = $1 AND a.id = $2
        `, [pacienteId, amostraId]);
        return rows[0];
    }

    static async criar(pacienteId, dados, usuarioId) {
        const obrigatorios = ['coletado_em','recebido_em','responsavel_coleta','dupla_checagem'];
        for (const campo of obrigatorios) if (!String(dados[campo] || '').trim()) {
            throw new ErroNegocio('Informe a coleta, o recebimento, o responsável pela coleta e a dupla checagem.');
        }

        const interpretarHorarioLocal = valor => new Date(valor.length === 16 ? valor + ':00-03:00' : valor);
        const coleta = interpretarHorarioLocal(dados.coletado_em);
        const recebimento = interpretarHorarioLocal(dados.recebido_em);
        if (isNaN(coleta) || isNaN(recebimento) || coleta > new Date() || recebimento > new Date() || recebimento < coleta) {
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
                 dupla_checagem,local_coleta,solicitacao_transfusao,realizado_por,status_imuno)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDENTE')
                RETURNING id
            `, [pacienteId,codigo,coleta.toISOString(),recebimento.toISOString(),
                dados.responsavel_coleta.trim(),(dados.responsavel_recebimento||'').trim()||null,
                dados.dupla_checagem.trim(),(dados.local_coleta||'').trim()||null,
                dados.solicitacao_transfusao === 'on',usuarioId]);
            await cliente.query('COMMIT');
            return rows[0].id;
        } catch (e) { await cliente.query('ROLLBACK'); throw e; }
        finally { cliente.release(); }
    }

    static async registrarImuno(pacienteId, amostraId, dados, usuarioId) {
        if (!['A','B','AB','O'].includes(dados.abo) || !['+','-'].includes(dados.fator_rh)) {
            throw new ErroNegocio('Informe corretamente o grupo ABO e o fator Rh.');
        }
        if (!['NEGATIVO','POSITIVO'].includes(dados.controle_rh) || !['NEGATIVO','POSITIVO'].includes(dados.pai)) {
            throw new ErroNegocio('Controle Rh e PAI devem ser Negativo ou Positivo.');
        }
        if (dados.controle_rh === 'POSITIVO' && String(dados.controle_rh_justificativa||'').trim().length < 5) {
            throw new ErroNegocio('Justifique o Controle Rh positivo.');
        }
        if (dados.pai === 'POSITIVO' && String(dados.pai_justificativa||'').trim().length < 5) {
            throw new ErroNegocio('Justifique o PAI positivo.');
        }

        const cliente = await db.connect();
        try {
            await cliente.query('BEGIN');
            const amostra = (await cliente.query(
                'SELECT id, status_imuno FROM amostras_receptor WHERE id=$1 AND paciente_id=$2 FOR UPDATE',
                [amostraId,pacienteId])).rows[0];
            if (!amostra) throw new ErroNegocio('Amostra não encontrada para este receptor.');
            if (amostra.status_imuno !== 'PENDENTE') throw new ErroNegocio('Os testes desta amostra já foram registrados. Para repetir ou corrigir a análise, cadastre uma nova amostra e registre novos resultados.');

            const bloqueada = dados.pai === 'POSITIVO' || dados.controle_rh === 'POSITIVO';
            await cliente.query(`
                UPDATE amostras_receptor
                SET abo=$1,fator_rh=$2,controle_rh=$3,controle_rh_justificativa=$4,
                    pai=$5,pai_justificativa=$6,status_imuno=$7,
                    imuno_realizado_por=$8,imuno_realizado_em=CURRENT_TIMESTAMP
                WHERE id=$9 AND paciente_id=$10
            `, [dados.abo,dados.fator_rh,dados.controle_rh,
                (dados.controle_rh_justificativa||'').trim()||null,dados.pai,
                (dados.pai_justificativa||'').trim()||null,bloqueada?'BLOQUEADO':'CONCLUIDO',
                usuarioId,amostraId,pacienteId]);

            // A tipagem fica registrada no cadastro mesmo quando PAI/Controle exigem bloqueio transfusional.
            await cliente.query('UPDATE pacientes SET abo=$1,fator_rh=$2,atualizado_em=CURRENT_TIMESTAMP WHERE id=$3',
                [dados.abo,dados.fator_rh,pacienteId]);
            await cliente.query('COMMIT');
            return { bloqueada };
        } catch(e) { await cliente.query('ROLLBACK'); throw e; }
        finally { cliente.release(); }
    }

    static async podeSolicitar(pacienteId) {
        const { rows } = await db.query(`
            SELECT id, pai, controle_rh, status_imuno, solicitacao_transfusao,
                   (coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
            FROM amostras_receptor WHERE paciente_id=$1
            ORDER BY coletado_em DESC LIMIT 1
        `, [pacienteId]);
        const a = rows[0];
        if (!a) return { permitido:false, motivo:'O receptor ainda não possui amostra cadastrada.' };
        if (!a.valida) return { permitido:false, motivo:'A amostra está vencida. Colete e registre uma nova amostra (validade de 72 horas).' };
        if (a.status_imuno === 'PENDENTE') return { permitido:false, motivo:'A amostra está cadastrada, mas os testes imuno-hematológicos ainda não foram concluídos.' };
        if (a.status_imuno === 'BLOQUEADO' || a.pai === 'POSITIVO' || a.controle_rh === 'POSITIVO') {
            return { permitido:false, motivo:'PAI ou Controle Rh positivo registrado. A solicitação transfusional está bloqueada e exige avaliação/liberação formal conforme protocolo institucional.' };
        }
        if (!a.solicitacao_transfusao) return { permitido:false, motivo:'A amostra não foi marcada para Transfusão / Reserva.' };
        return { permitido:true };
    }
}
module.exports = AmostraReceptorService;
