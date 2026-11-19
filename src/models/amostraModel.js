const crypto = require('crypto');
const db = require('../config/database');
const { ErroValidacao, ErroConflito } = require('../utils/erros');

class AmostraModel {
    static async listarPorPaciente(pacienteId) {
        const { rows } = await db.query(`
            SELECT a.*, u.nome AS responsavel_nome,
                   to_char(a.coletado_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS coleta_br,
                   to_char(a.recebido_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS recebimento_br,
                   to_char((a.coletado_em + INTERVAL '72 hours') AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS validade_br,
                   (a.coletado_em + INTERVAL '72 hours' > CURRENT_TIMESTAMP) AS valida
            FROM amostras_receptor a LEFT JOIN usuarios u ON u.id = a.realizado_por
            WHERE a.paciente_id = $1 ORDER BY a.coletado_em DESC
        `, [pacienteId]);
        return rows;
    }

    static async criar(pacienteId, dados, usuarioId) {
        const obrigatorios = ['coletado_em','recebido_em','dupla_checagem','abo','fator_rh','controle_rh','pai'];
        for (const campo of obrigatorios) if (!String(dados[campo] || '').trim()) throw new ErroValidacao('Preencha todos os campos obrigatórios da amostra e dos exames.');
        if (!['A','B','AB','O'].includes(dados.abo) || !['+','-'].includes(dados.fator_rh)) throw new ErroValidacao('Informe corretamente o grupo ABO e o fator Rh.');
        if (!['NEGATIVO','POSITIVO'].includes(dados.controle_rh) || !['NEGATIVO','POSITIVO'].includes(dados.pai)) throw new ErroValidacao('Controle Rh e PAI devem ser Negativo ou Positivo.');
        if (dados.pai === 'POSITIVO' && String(dados.pai_justificativa || '').trim().length < 5) throw new ErroValidacao('Justifique o PAI positivo.');
        const parseLocal = valor => new Date(valor.length === 16 ? valor + ':00-03:00' : valor);
        const coleta = parseLocal(dados.coletado_em), recebimento = parseLocal(dados.recebido_em);
        if (isNaN(coleta) || isNaN(recebimento) || coleta > new Date() || recebimento > new Date() || recebimento < coleta) throw new ErroValidacao('Confira as datas e horários de coleta e recebimento.');
        const paciente = (await db.query('SELECT id, ativo FROM pacientes WHERE id=$1', [pacienteId])).rows[0];
        if (!paciente || !paciente.ativo) throw new ErroValidacao('Receptor não encontrado ou inativo.');
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const codigo = 'AM-' + crypto.randomBytes(5).toString('hex').toUpperCase();
            const { rows } = await client.query(`
                INSERT INTO amostras_receptor
                (paciente_id,codigo,coletado_em,recebido_em,responsavel_coleta,responsavel_recebimento,
                 dupla_checagem,abo,fator_rh,controle_rh,controle_rh_justificativa,pai,pai_justificativa,realizado_por)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id
            `, [pacienteId,codigo,coleta.toISOString(),recebimento.toISOString(),
                (dados.responsavel_coleta||'').trim()||null,(dados.responsavel_recebimento||'').trim()||null,
                dados.dupla_checagem.trim(),dados.abo,dados.fator_rh,dados.controle_rh,
                (dados.controle_rh_justificativa||'').trim()||null,dados.pai,
                (dados.pai_justificativa||'').trim()||null,usuarioId]);
            await client.query('UPDATE pacientes SET abo=$1,fator_rh=$2,atualizado_em=CURRENT_TIMESTAMP WHERE id=$3', [dados.abo,dados.fator_rh,pacienteId]);
            await client.query('COMMIT');
            return rows[0].id;
        } catch (erro) { await client.query('ROLLBACK'); throw erro; }
        finally { client.release(); }
    }
}
module.exports = AmostraModel;