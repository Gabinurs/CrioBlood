const db = require('../config/database');
const { ErroValidacao, ErroConflito } = require('../utils/erros');

const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 500;

class DescarteService {
    static async descartar(id, usuarioId, motivoInformado) {
        const motivo = typeof motivoInformado === 'string' ? motivoInformado.trim() : '';

        if (motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
            throw new ErroValidacao(`Informe uma justificativa entre ${MOTIVO_MINIMO} e ${MOTIVO_MAXIMO} caracteres.`);
        }

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Bloqueia a linha durante a operação para impedir dois descartes simultâneos.
            const consulta = await client.query(
                `SELECT id, lote_id, codigo_original, codigo_interno, status
                 FROM hemocomponentes
                 WHERE id = $1
                 FOR UPDATE`,
                [id]
            );

            const bolsa = consulta.rows[0];
            if (!bolsa) {
                throw new ErroValidacao('Bolsa não encontrada.');
            }

            if (['RESERVADA', 'TRANSFUNDIDA', 'DESCARTADA'].includes(bolsa.status)) {
                throw new ErroConflito('Esta bolsa está reservada, já foi transfundida ou já foi descartada. Não é possível realizar o descarte.');
            }

            await client.query(
                `UPDATE hemocomponentes
                 SET status = 'DESCARTADA',
                     descarte_motivo = $1,
                     descartado_por = $2,
                     descartado_em = CURRENT_TIMESTAMP,
                     atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [motivo, usuarioId, id]
            );

            // A bolsa deixa de ocupar uma posição, mas seu cadastro e histórico permanecem.
            await client.query(
                'DELETE FROM armazenamento WHERE hemocomponente_id = $1',
                [id]
            );

            // Auditoria na mesma transação: se o log falhar, o descarte também é revertido.
            await client.query(
                `INSERT INTO logs_auditoria
                    (usuario_id, acao, tabela_afetada, registro_id, detalhes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    usuarioId,
                    'DESCARTE_BOLSA',
                    'hemocomponentes',
                    id,
                    `Código original: ${bolsa.codigo_original}; Código CrioBlood: ${bolsa.codigo_interno}; Motivo: ${motivo}`
                ]
            );

            await client.query('COMMIT');
            return bolsa;
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    }
}

module.exports = DescarteService;
