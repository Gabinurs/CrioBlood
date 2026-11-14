const SolicitacaoService=require('../services/solicitacaoService');
const PacienteService=require('../services/pacienteService');
const Setores=require('../services/setorSolicitacaoService');
const AuditoriaService=require('../services/auditoriaService');
const {ErroNegocio,avisar,tratar}=require('../utils/erros');
async function formulario(req,res,valores={},edicao=false,erro=null){
 const [pacientes,setores]=await Promise.all([PacienteService.listarAtivos(),Setores.listarAtivos()]);
 if(edicao&&valores.setor_id&&!setores.some(s=>s.id===Number(valores.setor_id))){
  const all=await Setores.listarTodos();const antigo=all.find(s=>s.id===Number(valores.setor_id));
  if(antigo)setores.push(antigo);
 }
 return res.status(erro?400:200).render('solicitacoes/form',{pacientes,setores,valores,edicao,erro,usuario:req.session.usuario});
}
function horarioLocal(v){
 if(!v)return '';
 const d=new Date(v);
 if(isNaN(d))return '';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace(' ','T');
}
class SolicitacaoController{
 static async listar(req,res){try{res.render('solicitacoes/index',{solicitacoes:await SolicitacaoService.listar(),usuario:req.session.usuario});}catch(e){tratar(req,res,e,'/dashboard','Erro ao listar solicitações');}}
 static async formNova(req,res){try{await formulario(req,res,{paciente_id:req.query.paciente_id||'',urgencia:req.query.urgencia||'ROTINA'});}catch(e){tratar(req,res,e,'/solicitacoes','Erro ao abrir solicitação');}}
 static async criar(req,res){
  try{
   const ids=await SolicitacaoService.criar(req.body,req.session.usuario.id);
   for(const id of ids)await AuditoriaService.registrarLog(req.session.usuario.id,'NOVA_SOLICITACAO','solicitacoes_transfusionais',id,'');
   avisar(req,'ok',ids.length===1?'Solicitação registrada.':'Registradas '+ids.length+' solicitações, uma para cada bolsa.');
   return res.redirect('/solicitacoes');
  }catch(e){if(e instanceof ErroNegocio){try{return await formulario(req,res,req.body,false,e.message);}catch(x){return tratar(req,res,x,'/solicitacoes','Erro ao abrir formulário');}}
   return tratar(req,res,e,'/solicitacoes','Erro ao registrar solicitação');}
 }
 static async formEditar(req,res){try{
  const s=await SolicitacaoService.buscarPorId(Number(req.params.id));
  if(!s)return res.status(404).send('Solicitação não encontrada.');
  if(s.status!=='PENDENTE'){avisar(req,'aviso','Somente solicitações pendentes podem ser editadas.');return res.redirect('/solicitacoes');}
  return await formulario(req,res,{...s,horario_pedido:horarioLocal(s.horario_pedido),quantidade:1},true);
 }catch(e){tratar(req,res,e,'/solicitacoes','Erro ao abrir edição');}}
 static async atualizar(req,res){try{
  await SolicitacaoService.atualizar(Number(req.params.id),req.body);
  await AuditoriaService.registrarLog(req.session.usuario.id,'EDICAO_SOLICITACAO','solicitacoes_transfusionais',Number(req.params.id),'');
  avisar(req,'ok','Solicitação atualizada.');res.redirect('/solicitacoes');
 }catch(e){if(e instanceof ErroNegocio){try{return await formulario(req,res,{...req.body,id:req.params.id},true,e.message);}catch(x){return tratar(req,res,x,'/solicitacoes','Erro ao abrir edição');}}
  tratar(req,res,e,'/solicitacoes','Erro ao atualizar solicitação');}}
 static async cancelar(req,res){try{
  await SolicitacaoService.cancelar(req.params.id);
  await AuditoriaService.registrarLog(req.session.usuario.id,'CANCELAMENTO_SOLICITACAO','solicitacoes_transfusionais',Number(req.params.id),'');
  avisar(req,'ok','Solicitação cancelada.');res.redirect('/solicitacoes');
 }catch(e){tratar(req,res,e,'/solicitacoes','Erro ao cancelar solicitação');}}
}
module.exports=SolicitacaoController;
