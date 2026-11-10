const PacienteService = require('../services/pacienteService');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class PacienteController {
    static async listar(req, res) {
        try {
            const pacientes = await PacienteService.listar();
            res.render('pacientes/index', { pacientes, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar pacientes');
        }
    }

    static formNovo(req, res) {
        res.render('pacientes/form', { paciente: null, valores: {}, usuario: req.session.usuario });
    }

    static async criar(req, res) {
        try {
            const id = await PacienteService.criar(req.body, req.session.usuario.id);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'CADASTRO_PACIENTE', 'pacientes', id, '');
            avisar(req, 'ok', 'Paciente cadastrado com sucesso.');
            res.redirect('/pacientes');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(400).render('pacientes/form', {
                    paciente: null, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao cadastrar paciente');
        }
    }

    static async formEditar(req, res) {
        try {
            const paciente = await PacienteService.buscarPorId(req.params.id);
            if (!paciente) {
                avisar(req, 'erro', 'Paciente não encontrado.');
                return res.redirect('/pacientes');
            }
            res.render('pacientes/form', { paciente, valores: {}, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir paciente');
        }
    }

    static async atualizar(req, res) {
        try {
            await PacienteService.atualizar(req.params.id, req.body);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'EDICAO_PACIENTE', 'pacientes', Number(req.params.id), '');
            avisar(req, 'ok', 'Dados do paciente atualizados.');
            res.redirect('/pacientes');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const paciente = await PacienteService.buscarPorId(req.params.id);
                return res.status(400).render('pacientes/form', {
                    paciente, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao atualizar paciente');
        }
    }
}

module.exports = PacienteController;
