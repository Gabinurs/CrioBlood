const PacienteModel = require('../models/pacienteModel');
const AmostraModel = require('../models/amostraModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroValidacao, avisar, tratar, enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

class AmostraController {
    static async nova(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            if (!paciente) return enviarErro(req,res,STATUS.NAO_ENCONTRADO,'Receptor não encontrado.');
            res.render('pacientes/amostra-form',{paciente,valores:{},usuario:req.session.usuario});
        } catch (erro) { tratar(req,res,erro,'/pacientes','Erro ao abrir nova amostra'); }
    }
    static async criar(req,res) {
        try {
            const id = await AmostraModel.criar(req.params.id,req.body,req.session.usuario.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id,'CADASTRO_AMOSTRA','amostras_receptor',id,'');
            avisar(req,'ok','Amostra registrada. Validade de 72 horas calculada a partir da coleta.');
            return res.redirect(STATUS.VER_OUTRO, '/pacientes/'+req.params.id+'/dossie');
        } catch (erro) {
            if (erro instanceof ErroValidacao) {
                const paciente=await PacienteModel.buscarPorId(req.params.id);
                return res.status(STATUS.ENTIDADE_INVALIDA).render('pacientes/amostra-form',{paciente,valores:req.body,erro:erro.message,usuario:req.session.usuario});
            }
            tratar(req,res,erro,'/pacientes','Erro ao registrar amostra');
        }
    }
    static async dossie(req,res) {
        try {
            const paciente=await PacienteModel.buscarPorId(req.params.id);
            if(!paciente) return enviarErro(req,res,STATUS.NAO_ENCONTRADO,'Receptor não encontrado.');
            const amostras=await AmostraModel.listarPorPaciente(req.params.id);
            return res.render('pacientes/dossie',{paciente,amostras,usuario:req.session.usuario});
        } catch (erro) { tratar(req,res,erro,'/pacientes','Erro ao abrir dossiê'); }
    }
}
module.exports = AmostraController;