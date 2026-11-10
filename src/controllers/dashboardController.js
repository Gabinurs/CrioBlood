const db = require('../database');
const EstoqueConsultaService = require('../services/estoqueConsultaService');
const { tratar } = require('../utils/erros');

class DashboardController {
    static async index(req, res) {
        try {
            const [resumo, matriz, vencimentos, contagens, urgentes] = await Promise.all([
                EstoqueConsultaService.resumo(),
                EstoqueConsultaService.matriz(),
                EstoqueConsultaService.proximosVencimentos(5),
                db.query(`
                    SELECT
                        (SELECT COUNT(*)::int FROM lotes_recebimento WHERE status = 'ABERTO') AS lotes_abertos,
                        (SELECT COUNT(*)::int FROM solicitacoes_transfusionais WHERE status = 'PENDENTE') AS pendentes,
                        (SELECT COUNT(*)::int FROM solicitacoes_transfusionais WHERE status = 'RESERVADA') AS aguardando,
                        (SELECT COUNT(*)::int FROM transusoes_saidas
                           WHERE (data_saida AT TIME ZONE 'America/Sao_Paulo')::date >=
                                 date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date) AS transfusoes_mes
                `),
                db.query(`
                    SELECT s.id, s.tipo, s.urgencia, p.nome AS paciente_nome,
                           p.abo AS paciente_abo, p.fator_rh AS paciente_rh
                    FROM solicitacoes_transfusionais s
                    JOIN pacientes p ON p.id = s.paciente_id
                    WHERE s.status = 'PENDENTE'
                    ORDER BY CASE s.urgencia WHEN 'EMERGENCIA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END,
                             s.criado_em ASC
                    LIMIT 5
                `)
            ]);

            // Total disponível por tipagem (A+, A-, ...) somando os produtos
            const porTipagem = matriz.linhas.map(l => ({ rotulo: l.rotulo, total: l.total }));
            const maiorTipo = Math.max(1, ...matriz.porTipo.map(t => t.total));

            res.render('dashboard/index', {
                usuario: req.session.usuario,
                resumo,
                contagens: contagens.rows[0],
                porTipo: matriz.porTipo,
                maiorTipo,
                porTipagem,
                vencimentos,
                urgentes: urgentes.rows
            });
        } catch (erro) {
            tratar(req, res, erro, '/login', 'Erro ao carregar o dashboard');
        }
    }
}

module.exports = DashboardController;
