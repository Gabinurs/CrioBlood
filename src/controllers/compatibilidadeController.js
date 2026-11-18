const SolicitacaoService = require('../services/solicitacaoService');
const CompatibilidadeService = require('../services/compatibilidadeService');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class CompatibilidadeController {
    static async index(req, res) {
        try {
            const pendentes = await SolicitacaoService.listarPendentes();
            const id = parseInt(req.query.solicitacao, 10);
            let solicitacao = null;
            let bolsa = null;
            let aceitos = null;
            let erroBusca = null;
            const codigo = String(req.query.codigo || '').trim();

            if (id) {
                solicitacao = await SolicitacaoService.buscarPorId(id);
                if (solicitacao && solicitacao.status === 'PENDENTE') {
                    aceitos = CompatibilidadeService.descreverAceitos(
                        { abo: solicitacao.paciente_abo, fator_rh: solicitacao.paciente_rh },
                        solicitacao.tipo
                    );
                    if (codigo) {
                        try {
                            bolsa = await CompatibilidadeService.buscarBolsaPorCodigo(solicitacao, codigo);
                        } catch (erro) {
                            if (erro instanceof ErroNegocio) erroBusca = erro.message;
                            else throw erro;
                        }
                    }
                } else if (solicitacao) {
                    avisar(req, 'aviso', 'Essa solicitação não está mais pendente.');
                    return res.redirect('/solicitacoes');
                }
            }

            res.render('compatibilidade/index', {
                pendentes, solicitacao, bolsa, aceitos, codigo, erroBusca,
                usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro na tela de compatibilidade');
        }
    }

    static async reservar(req, res) {
        const solicitacaoId = parseInt(req.body.solicitacao_id, 10);
        try {
            const resultado = await CompatibilidadeService.reservar(
                solicitacaoId,
                Number(req.body.hemocomponente_id),
                req.session.usuario.id,
                req.body
            );
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'CONFERENCIA_COMPATIBILIDADE',
                'solicitacoes_transfusionais', solicitacaoId,
                `Bolsa ${resultado.codigo}; colaborador logado: ${resultado.colaborador}; função: ${resultado.funcao}; resultado: ${resultado.resultadoConferencia}; tipagem: ${req.body.tipagem_conferida_abo}${req.body.tipagem_conferida_rh}; responsável pela tipagem: ${resultado.responsavelTipagem}`
            );
            if (!resultado.reservada) {
                avisar(req, 'erro', `Conferência registrada como INCOMPATÍVEL. A bolsa ${resultado.codigo} NÃO foi reservada.`);
                return res.redirect(`/compatibilidade?solicitacao=${solicitacaoId || ''}&codigo=${encodeURIComponent(req.body.codigo_informado || '')}`);
            }
            avisar(req, 'ok', `Conferência registrada como COMPATÍVEL e bolsa ${resultado.codigo} reservada. Profissional responsável pela tipagem: ${resultado.responsavelTipagem}.`);
            res.redirect('/transfusoes');
        } catch (erro) {
            tratar(req, res, erro, `/compatibilidade?solicitacao=${solicitacaoId || ''}&codigo=${encodeURIComponent(req.body.codigo_informado || '')}`, 'Erro ao confirmar compatibilidade');
        }
    }
}

module.exports = CompatibilidadeController;
