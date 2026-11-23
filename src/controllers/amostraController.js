const PacienteModel = require('../models/pacienteModel');
const AmostraModel = require('../models/amostraModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

class AmostraController {
    static async nova(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            if (!paciente) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Receptor não encontrado.');
            const amostras = await AmostraModel.listarPorPaciente(req.params.id);
            const amostraValida = amostras.find(a => a.valida);
            res.render('pacientes/amostra-form', {
                paciente, valores: {}, amostraValida, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir nova amostra');
        }
    }

    static async criar(req, res) {
        try {
            const id = await AmostraModel.criar(req.params.id, req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'CADASTRO_AMOSTRA', 'amostras_receptor', id, '');
            avisar(req, 'ok', 'Amostra cadastrada. Agora registre os testes na opção Imuno.');
            return res.redirect(STATUS.VER_OUTRO, '/pacientes/' + req.params.id + '/dossie');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const paciente = await PacienteModel.buscarPorId(req.params.id);
                const amostras = await AmostraModel.listarPorPaciente(req.params.id);
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/amostra-form', {
                    paciente, valores: req.body, amostraValida: amostras.find(a => a.valida),
                    erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao registrar amostra');
        }
    }

    static async imuno(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            const amostra = await AmostraModel.buscarPorId(req.params.id, req.params.amostraId);
            if (!paciente || !amostra) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Receptor ou amostra não encontrado.');
            res.render('pacientes/imuno-form', {
                paciente, amostra, valores: {}, somenteLeitura: amostra.status_imuno !== 'PENDENTE',
                usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir Imuno');
        }
    }

    static async salvarImuno(req, res) {
        try {
            const resultado = await AmostraModel.registrarImuno(
                req.params.id, req.params.amostraId, req.body, req.session.usuario.id
            );
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'IMUNO_AMOSTRA', 'amostras_receptor', Number(req.params.amostraId),
                resultado.bloqueada ? 'PAI ou Controle positivo; solicitação bloqueada.' : 'Resultados Imuno registrados.'
            );
            if (resultado.bloqueada) {
                avisar(req, 'aviso', 'Resultado positivo registrado com justificativa. A solicitação transfusional está bloqueada.');
            } else {
                avisar(req, 'ok', 'Resultados Imuno registrados com sucesso.');
            }
            return res.redirect(STATUS.VER_OUTRO, '/pacientes/' + req.params.id + '/dossie');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const paciente = await PacienteModel.buscarPorId(req.params.id);
                const amostra = await AmostraModel.buscarPorId(req.params.id, req.params.amostraId);
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/imuno-form', {
                    paciente, amostra, valores: req.body, erro: erro.message,
                    somenteLeitura: false, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao registrar exames Imuno');
        }
    }

    static async etiqueta(req, res) {
        try {
            const amostra = await AmostraModel.buscarPorId(req.params.id, req.params.amostraId);
            if (!amostra) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Amostra não encontrada.');
            res.render('pacientes/etiqueta-amostra', { amostra, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir etiqueta');
        }
    }

    static async dossie(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            if (!paciente) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Receptor não encontrado.');
            const amostras = await AmostraModel.listarPorPaciente(req.params.id);
            const liberacao = await AmostraModel.podeSolicitar(req.params.id);
            return res.render('pacientes/dossie', {
                paciente, amostras, liberacao, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir dossiê');
        }
    }
}

module.exports = AmostraController;
