const RelatorioService = require('../services/relatorioService');
const { tratar } = require('../utils/erros');

class RelatorioController {
    static async index(req, res) {
        try {
            const periodo = RelatorioService.normalizarPeriodo(req.query.inicio, req.query.fim);
            const [resumo, transfusoes, estoque, vencimentos] = await Promise.all([
                RelatorioService.resumo(periodo),
                RelatorioService.transfusoes(periodo),
                RelatorioService.estoquePorStatus(),
                RelatorioService.vencimentos(15)
            ]);
            res.render('relatorios/index', {
                periodo, resumo, transfusoes, estoque, vencimentos, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao gerar relatório');
        }
    }

    static async csv(req, res) {
        try {
            const periodo = RelatorioService.normalizarPeriodo(req.query.inicio, req.query.fim);
            const linhas = await RelatorioService.transfusoes(periodo);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="transfusoes_${periodo.inicio}_a_${periodo.fim}.csv"`);
            res.send(RelatorioService.montarCsv(linhas));
        } catch (erro) {
            tratar(req, res, erro, '/relatorios', 'Erro ao exportar CSV');
        }
    }
}

module.exports = RelatorioController;
