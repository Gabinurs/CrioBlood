const TransfusaoService = require('../services/transfusaoService');
const AuditoriaService = require('../services/auditoriaService');
const { avisar, tratar } = require('../utils/erros');

class TransfusaoController {
    static async index(req, res) {
        try {
            const [prontas, andamento, historico] = await Promise.all([
                TransfusaoService.listarProntas(),
                TransfusaoService.listarEmAndamento(),
                TransfusaoService.listarHistorico()
            ]);
            res.render('transfusoes/index', {
                prontas, andamento, historico, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao carregar transfusões');
        }
    }

    static async iniciar(req, res) {
        const solicitacaoId = parseInt(req.body.solicitacao_id, 10);
        try {
            const r = await TransfusaoService.iniciar(solicitacaoId, req.body, req.session.usuario.id);
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'INICIO_TRANSFUSAO',
                'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${r.codigo}; paciente: ${r.paciente}; início: ${r.inicio.toISOString()}; responsável: ${r.responsavel}`
            );
            avisar(req, 'ok', `Transfusão iniciada para ${r.paciente}. Responsável: ${r.responsavel}.`);
            res.redirect('/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, '/transfusoes', 'Erro ao iniciar transfusão');
        }
    }

    static async finalizar(req, res) {
        const transfusaoId = parseInt(req.params.id, 10);
        try {
            const r = await TransfusaoService.finalizar(transfusaoId, req.body, req.session.usuario.id);
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'FINALIZACAO_TRANSFUSAO',
                'transusoes_saidas', transfusaoId,
                `Paciente: ${r.paciente}; término: ${r.termino.toISOString()}`
            );
            avisar(req, 'ok', `Transfusão de ${r.paciente} finalizada. Bolsa baixada do estoque.`);
            res.redirect('/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, '/transfusoes', 'Erro ao finalizar transfusão');
        }
    }
}

module.exports = TransfusaoController;
