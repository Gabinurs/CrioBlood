const SolicitacaoService = require('../services/solicitacaoService');
const CompatibilidadeService = require('../services/compatibilidadeService');
const AuditoriaService = require('../services/auditoriaService');
const { avisar, tratar } = require('../utils/erros');

class CompatibilidadeController {
    static async index(req, res) {
        try {
            const pendentes = await SolicitacaoService.listarPendentes();
            const id = parseInt(req.query.solicitacao, 10);

            let solicitacao = null;
            let bolsas = [];
            let aceitos = null;

            if (id) {
                solicitacao = await SolicitacaoService.buscarPorId(id);
                if (solicitacao && solicitacao.status === 'PENDENTE') {
                    bolsas = await CompatibilidadeService.listarBolsasCompativeis(solicitacao);
                    aceitos = CompatibilidadeService.descreverAceitos(
                        { abo: solicitacao.paciente_abo, fator_rh: solicitacao.paciente_rh },
                        solicitacao.tipo
                    );
                } else if (solicitacao) {
                    avisar(req, 'aviso', 'Essa solicitação não está mais pendente.');
                    return res.redirect('/solicitacoes');
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
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'RESERVA_BOLSA', 'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${resultado.codigo} (${resultado.nivel})`);
            avisar(req, 'ok', `Bolsa ${resultado.codigo} reservada. Registre a transfusão quando ela for realizada.`);
            res.redirect('/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, `/compatibilidade?solicitacao=${solicitacaoId || ''}`, 'Erro ao reservar bolsa');
        }
    }
}

module.exports = CompatibilidadeController;
