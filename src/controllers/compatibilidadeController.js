const SolicitacaoModel = require('../models/solicitacaoModel');
const RequisicaoModel = require('../models/requisicaoModel');
const CompatibilidadeTransfusional = require('../services/compatibilidadeTransfusionalService');
const CompatibilidadeService = require('../services/compatibilidadeService');
const AuditoriaModel = require('../models/auditoriaModel');
const { avisar, tratar } = require('../utils/erros');

const STATUS = require('../utils/status');
class CompatibilidadeController {
    static async index(req, res) {
        try {
            const pendentes = await SolicitacaoModel.listarPendentes();
            const aguardandoCompatibilidade = await RequisicaoModel.listarAguardandoCompatibilidade();
            for (const item of aguardandoCompatibilidade) {
                const amostraLiberada = item.amostra_liberada &&
                    item.status_imuno === 'CONCLUIDO' &&
                    item.pai === 'NEGATIVO' &&
                    item.controle_rh === 'NEGATIVO' &&
                    item.solicitacao_transfusao;
                item.compatibilidade = amostraLiberada
                    ? CompatibilidadeTransfusional.avaliarComponente({
                        paciente: {
                            abo: item.paciente_abo,
                            fator_rh: item.paciente_rh,
                            sexo: item.paciente_sexo,
                            idade: item.paciente_idade
                        },
                        bolsa: { abo: item.bolsa_abo, fator_rh: item.bolsa_rh },
                        tipo: item.tipo,
                        pesoReceptorKg: item.peso_receptor_kg
                    })
                    : {
                        permitido: false,
                        excecaoPossivel: false,
                        mensagem: 'A amostra vinculada venceu ou não está liberada. Atualize a coleta e conclua os testes Imuno antes da prova/conferência.'
                    };
            }
            const id = parseInt(req.query.solicitacao, 10);

            let solicitacao = null;
            let bolsas = [];
            let aceitos = null;

            if (id) {
                solicitacao = await SolicitacaoModel.buscarPorId(id);
                if (solicitacao && solicitacao.requisicao_id) {
                    avisar(req, 'aviso', 'Esta unidade pertence a uma requisição em etapas. A bolsa vinculada será avaliada nesta etapa de Compatibilidade.');
                    return res.redirect(STATUS.REDIRECIONAR, '/solicitacoes/' + solicitacao.requisicao_id + '/bolsas?compatibilidade=1');
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
                pendentes, solicitacao, bolsas, aceitos, aguardandoCompatibilidade, usuario: req.session.usuario
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
