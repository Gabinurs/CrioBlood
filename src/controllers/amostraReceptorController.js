const PacienteService = require('../services/pacienteService');
const AmostraService = require('../services/amostraReceptorService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class AmostraReceptorController {
    static async nova(req,res) {
        try {
            const paciente = await PacienteService.buscarPorId(req.params.id);
            if (!paciente) { avisar(req,'erro','Receptor não encontrado.'); return res.redirect('/pacientes'); }
            res.render('pacientes/amostra-form',{ paciente, valores:{}, usuario:req.session.usuario });
        } catch(e) { tratar(req,res,e,'/pacientes','Erro ao abrir nova amostra'); }
    }
    static async criar(req,res) {
        try {
            await AmostraService.criar(req.params.id,req.body,req.session.usuario.id);
            avisar(req,'ok','Amostra registrada. Validade calculada por 72 horas a partir da coleta.');
            res.redirect('/pacientes/'+req.params.id+'/dossie');
        } catch(e) {
            if (e instanceof ErroNegocio) {
                const paciente=await PacienteService.buscarPorId(req.params.id);
                return res.status(400).render('pacientes/amostra-form',{paciente,valores:req.body,erro:e.message,usuario:req.session.usuario});
            }
            tratar(req,res,e,'/pacientes','Erro ao registrar amostra');
        }
    }
    static async dossie(req,res) {
        try {
            const paciente=await PacienteService.buscarPorId(req.params.id);
            if(!paciente){avisar(req,'erro','Receptor não encontrado.');return res.redirect('/pacientes');}
            const amostras=await AmostraService.listarPorPaciente(req.params.id);
            res.render('pacientes/dossie',{paciente,amostras,usuario:req.session.usuario});
        } catch(e){tratar(req,res,e,'/pacientes','Erro ao abrir dossiê');}
    }
}
module.exports=AmostraReceptorController;
