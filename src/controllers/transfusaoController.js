const TransfusaoService = require('../services/transfusaoService');
const AuditoriaService = require('../services/auditoriaService');
const { avisar, tratar } = require('../utils/erros');

class TransfusaoController {
    static async index(req, res) {
        try {
            const [prontas, historico] = await Promise.all([
                TransfusaoService.listarProntas(),
                TransfusaoService.listarHistorico()
            ]);
            res.render('transfusoes/index', { prontas, historico, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao carregar transfusões');
        }
    }

    static async registrar(req, res) {
        const solicitacaoId = parseInt(req.body.solicitacao_id, 10);
        try {
            const r = await TransfusaoService.registrar(solicitacaoId, req.body.observacoes, req.session.usuario.id);
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'TRANSFUSAO', 'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${r.codigo}`);
            avisar(req, 'ok', `Transfusão registrada: bolsa ${r.codigo} para ${r.paciente}.`);
            res.redirect('/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, '/transfusoes', 'Erro ao registrar transfusão');
        }
    }
}

module.exports = TransfusaoController;
