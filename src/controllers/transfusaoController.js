const { paginar } = require('../utils/paginacao');
const TransfusaoService = require('../services/transfusaoService');
const AuditoriaModel = require('../models/auditoriaModel');
const { avisar, tratar } = require('../utils/erros');

const STATUS = require('../utils/status');
class TransfusaoController {
    static async index(req, res) {
        try {
            const [prontas, { linhas: historico, paginacao }] = await Promise.all([
                TransfusaoService.listarProntas(),
                paginar(req, () => TransfusaoService.contarHistorico(), (pag) => TransfusaoService.listarHistorico(pag))
            ]);
            res.render('transfusoes/index', { prontas, historico, paginacao, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao carregar transfusões');
        }
    }

    static async registrar(req, res) {
        const solicitacaoId = parseInt(req.body.solicitacao_id, 10);
        try {
            const r = await TransfusaoService.registrar(solicitacaoId, req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'TRANSFUSAO', 'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${r.codigo}`);
            avisar(req, 'ok', `Transfusão registrada: bolsa ${r.codigo} para ${r.paciente}.`);
            res.redirect(STATUS.VER_OUTRO, '/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, '/transfusoes', 'Erro ao registrar transfusão');
        }
    }
}

module.exports = TransfusaoController;
