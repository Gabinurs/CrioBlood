const { paginar } = require('../utils/paginacao');
const SolicitacaoModel = require('../models/solicitacaoModel');
const PacienteModel = require('../models/pacienteModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

const STATUS = require('../utils/status');
class SolicitacaoController {
    static async listar(req, res) {
        try {
            const { linhas: solicitacoes, paginacao } = await paginar(
                req, () => SolicitacaoModel.contar(), (pag) => SolicitacaoModel.listar(pag));
            res.render('solicitacoes/index', { solicitacoes, paginacao, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar solicitações');
        }
    }

    static async formNova(req, res) {
        try {
            const pacientes = await PacienteModel.listarAtivos();
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
            const id = await SolicitacaoModel.criar(req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'NOVA_SOLICITACAO', 'solicitacoes_transfusionais', id, '');
            avisar(req, 'ok', 'Solicitação registrada. Agora busque uma bolsa compatível.');
            res.redirect(STATUS.VER_OUTRO, `/compatibilidade?solicitacao=${id}`);
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const pacientes = await PacienteModel.listarAtivos();
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('solicitacoes/form', {
                    pacientes, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/solicitacoes', 'Erro ao registrar solicitação');
        }
    }

    static async cancelar(req, res) {
        try {
            await SolicitacaoModel.cancelar(req.params.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'CANCELAMENTO_SOLICITACAO', 'solicitacoes_transfusionais', Number(req.params.id), '');
            avisar(req, 'ok', 'Solicitação cancelada.');
            res.redirect(STATUS.VER_OUTRO, '/solicitacoes');
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao cancelar solicitação');
        }
    }
}

module.exports = SolicitacaoController;
