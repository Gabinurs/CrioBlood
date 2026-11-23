const PacienteService = require('../services/pacienteService');
const AmostraService = require('../services/amostraReceptorService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class AmostraReceptorController {
    static async nova(req,res) {
        try {
            const paciente = await PacienteService.buscarPorId(req.params.id);
            if (!paciente) { avisar(req,'erro','Receptor não encontrado.'); return res.redirect('/pacientes'); }
            const amostras = await AmostraService.listarPorPaciente(req.params.id);
            const amostraValida = amostras.find(a => a.valida);
            res.render('pacientes/amostra-form',{
                paciente, valores:{}, amostraValida, usuario:req.session.usuario
            });
        } catch(e) { tratar(req,res,e,'/pacientes','Erro ao abrir nova amostra'); }
    }
    static async criar(req,res) {
        try {
            const amostraId = await AmostraService.criar(req.params.id,req.body,req.session.usuario.id);
            avisar(req,'ok','Amostra cadastrada. Agora registre os testes na opção Imuno.');
            res.redirect('/pacientes/'+req.params.id+'/amostras/'+amostraId+'/imuno');
        } catch(e) {
            if (e instanceof ErroNegocio) {
                const paciente=await PacienteService.buscarPorId(req.params.id);
                const amostras=await AmostraService.listarPorPaciente(req.params.id);
                return res.status(400).render('pacientes/amostra-form',{
                    paciente,valores:req.body,amostraValida:amostras.find(a=>a.valida),erro:e.message,usuario:req.session.usuario
                });
            }
            tratar(req,res,e,'/pacientes','Erro ao registrar amostra');
        }
    }
    static async imuno(req,res) {
        try {
            const paciente=await PacienteService.buscarPorId(req.params.id);
            const amostra=await AmostraService.buscarPorId(req.params.id,req.params.amostraId);
            if(!paciente||!amostra){avisar(req,'erro','Receptor ou amostra não encontrado.');return res.redirect('/pacientes');}
            res.render('pacientes/imuno-form',{paciente,amostra,usuario:req.session.usuario});
        } catch(e){tratar(req,res,e,'/pacientes','Erro ao abrir Imuno');}
    }
    static async salvarImuno(req,res) {
        try {
            const resultado=await AmostraService.registrarImuno(req.params.id,req.params.amostraId,req.body,req.session.usuario.id);
            if(resultado.bloqueada) avisar(req,'aviso','Resultado positivo registrado com justificativa. Solicitação transfusional bloqueada para este receptor.');
            else avisar(req,'ok','Resultados imuno-hematológicos registrados com sucesso.');
            res.redirect('/pacientes/'+req.params.id+'/dossie');
        } catch(e) {
            if(e instanceof ErroNegocio) {
                const paciente=await PacienteService.buscarPorId(req.params.id);
                const amostra=await AmostraService.buscarPorId(req.params.id,req.params.amostraId);
                return res.status(400).render('pacientes/imuno-form',{paciente,amostra,erro:e.message,usuario:req.session.usuario});
            }
            tratar(req,res,e,'/pacientes','Erro ao registrar exames imuno-hematológicos');
        }
    }
    static async etiqueta(req,res) {
        try {
            const amostra=await AmostraService.buscarPorId(req.params.id,req.params.amostraId);
            if(!amostra){avisar(req,'erro','Amostra não encontrada.');return res.redirect('/pacientes');}
            res.render('pacientes/etiqueta-amostra',{amostra,usuario:req.session.usuario});
        } catch(e){tratar(req,res,e,'/pacientes','Erro ao abrir etiqueta');}
    }
    static async dossie(req,res) {
        try {
            const paciente=await PacienteService.buscarPorId(req.params.id);
            if(!paciente){avisar(req,'erro','Receptor não encontrado.');return res.redirect('/pacientes');}
            const amostras=await AmostraService.listarPorPaciente(req.params.id);
            const liberacao=await AmostraService.podeSolicitar(req.params.id);
            res.render('pacientes/dossie',{paciente,amostras,liberacao,usuario:req.session.usuario});
        } catch(e){tratar(req,res,e,'/pacientes','Erro ao abrir dossiê');}
    }
}
module.exports=AmostraReceptorController;
