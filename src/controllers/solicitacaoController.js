const SolicitacaoService = require('../services/solicitacaoService');
const PacienteService = require('../services/pacienteService');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class SolicitacaoController {
    static async listar(req, res) {
        try {
            const solicitacoes = await SolicitacaoService.listar();
            res.render('solicitacoes/index', { solicitacoes, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar solicitações');
        }
    }

    static async formNova(req, res) {
        try {
            const pacientes = await PacienteService.listarAtivos();
            res.render('solicitacoes/form', {
                pacientes,
                valores: { paciente_id: req.query.paciente_id || '' },
                usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao abrir formulário de solicitação');
        }
    }

    static async criar(req, res) {
        try {
            const id = await SolicitacaoService.criar(req.body, req.session.usuario.id);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'NOVA_SOLICITACAO', 'solicitacoes_transfusionais', id, '');
            avisar(req, 'ok', 'Solicitação registrada. Agora busque uma bolsa compatível.');
            res.redirect(`/compatibilidade?solicitacao=${id}`);
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const pacientes = await PacienteService.listarAtivos();
                return res.status(400).render('solicitacoes/form', {
                    pacientes, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/solicitacoes', 'Erro ao registrar solicitação');
        }
    }

    static async cancelar(req, res) {
        try {
            await SolicitacaoService.cancelar(req.params.id);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'CANCELAMENTO_SOLICITACAO', 'solicitacoes_transfusionais', Number(req.params.id), '');
            avisar(req, 'ok', 'Solicitação cancelada.');
            res.redirect('/solicitacoes');
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao cancelar solicitação');
        }
    }
}

module.exports = SolicitacaoController;
