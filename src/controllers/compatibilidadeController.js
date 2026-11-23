const SolicitacaoModel = require('../models/solicitacaoModel');
const CompatibilidadeService = require('../services/compatibilidadeService');
const AuditoriaModel = require('../models/auditoriaModel');
const { avisar, tratar } = require('../utils/erros');

const STATUS = require('../utils/status');
class CompatibilidadeController {
    static async index(req, res) {
        try {
            const pendentes = await SolicitacaoModel.listarPendentes();
            const id = parseInt(req.query.solicitacao, 10);

            let solicitacao = null;
            let bolsas = [];
            let aceitos = null;

            if (id) {
                solicitacao = await SolicitacaoModel.buscarPorId(id);
                if (solicitacao && solicitacao.requisicao_id) {
                    avisar(req, 'aviso', 'Esta solicitação faz parte de uma requisição em etapas. Registre a prova cruzada na aba Bolsas / Transfusão.');
                    return res.redirect(STATUS.REDIRECIONAR, '/solicitacoes/' + solicitacao.requisicao_id + '/bolsas');
                }
                if (solicitacao && solicitacao.status === 'PENDENTE') {
                    bolsas = await CompatibilidadeService.listarBolsasCompativeis(solicitacao);
                    aceitos = CompatibilidadeService.descreverAceitos(
                        { abo: solicitacao.paciente_abo, fator_rh: solicitacao.paciente_rh },
                        solicitacao.tipo
                    );
                } else if (solicitacao) {
                    avisar(req, 'aviso', 'Essa solicitação não está mais pendente.');
                    return res.redirect(STATUS.REDIRECIONAR, '/solicitacoes');
                }
            }

            res.render('compatibilidade/index', {
                pendentes, solicitacao, bolsas, aceitos, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro na tela de compatibilidade');
        }
    }

    static async reservar(req, res) {
        const solicitacaoId = parseInt(req.body.solicitacao_id, 10);
        const bolsaId = parseInt(req.body.hemocomponente_id, 10);
        try {
            const resultado = await CompatibilidadeService.reservar(solicitacaoId, bolsaId, req.session.usuario.id);
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'RESERVA_BOLSA', 'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${resultado.codigo} (${resultado.nivel})`);
            avisar(req, 'ok', `Bolsa ${resultado.codigo} reservada. Registre a transfusão quando ela for realizada.`);
            res.redirect(STATUS.VER_OUTRO, '/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, `/compatibilidade?solicitacao=${solicitacaoId || ''}`, 'Erro ao reservar bolsa');
        }
    }
}

module.exports = CompatibilidadeController;
