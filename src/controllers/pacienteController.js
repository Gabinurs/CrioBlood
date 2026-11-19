const { paginar } = require('../utils/paginacao');
const PacienteModel = require('../models/pacienteModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');

const STATUS = require('../utils/status');
class PacienteController {
    static async listar(req, res) {
        try {
            const { linhas: pacientes, paginacao } = await paginar(
                req, () => PacienteModel.contar(), (pag) => PacienteModel.listar(pag));
            res.render('pacientes/index', { pacientes, paginacao, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar pacientes');
        }
    }

    static formNovo(req, res) {
        res.render('pacientes/form', { paciente: null, valores: {}, usuario: req.session.usuario });
    }

    static async criar(req, res) {
        try {
            const id = await PacienteModel.criar(req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'CADASTRO_PACIENTE', 'pacientes', id, '');
            avisar(req, 'ok', 'Paciente cadastrado com sucesso.');
            res.redirect(STATUS.VER_OUTRO, '/pacientes');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/form', {
                    paciente: null, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao cadastrar paciente');
        }
    }

    static async formEditar(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            if (!paciente) {
                return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Paciente não encontrado.');
            }
            res.render('pacientes/form', { paciente, valores: {}, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir paciente');
        }
    }

    static async atualizar(req, res) {
        try {
            await PacienteModel.atualizar(req.params.id, req.body);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'EDICAO_PACIENTE', 'pacientes', Number(req.params.id), '');
            avisar(req, 'ok', 'Dados do paciente atualizados.');
            res.redirect(STATUS.VER_OUTRO, '/pacientes');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const paciente = await PacienteModel.buscarPorId(req.params.id);
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/form', {
                    paciente, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao atualizar paciente');
        }
    }
}

module.exports = PacienteController;
