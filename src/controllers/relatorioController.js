const STATUS = require('../utils/status');
const RelatorioModel = require('../models/relatorioModel');
const { tratar } = require('../utils/erros');

class RelatorioController {
    static async index(req, res) {
        try {
            const periodo = RelatorioModel.normalizarPeriodo(req.query.inicio, req.query.fim);
            const [resumo, transfusoes, estoque, vencimentos] = await Promise.all([
                RelatorioModel.resumo(periodo),
                RelatorioModel.transfusoes(periodo),
                RelatorioModel.estoquePorStatus(),
                RelatorioModel.vencimentos(15)
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
            const periodo = RelatorioModel.normalizarPeriodo(req.query.inicio, req.query.fim);
            const linhas = await RelatorioModel.transfusoes(periodo);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="transfusoes_${periodo.inicio}_a_${periodo.fim}.csv"`);
            res.status(STATUS.OK).send(RelatorioModel.montarCsv(linhas));
        } catch (erro) {
            tratar(req, res, erro, '/relatorios', 'Erro ao exportar CSV');
        }
    }
}

module.exports = RelatorioController;
