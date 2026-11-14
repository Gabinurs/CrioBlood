const db=require('../database');
const {ErroNegocio}=require('../utils/erros');
const AmostraReceptorService=require('./amostraReceptorService');
const TIPOS=['CH','PLASMA','PLAQUETAS','CRIO'];
const URGENCIAS=['ROTINA','URGENTE','EMERGENCIA'];
function validar(d){
 const pacienteId=Number(d.paciente_id), setorId=Number(d.setor_id);
 const quantidade=Number(d.quantidade||d.quantidade_solicitada||1);
 const medico=String(d.medico_solicitante||'').trim();
 if(!Number.isSafeInteger(pacienteId)||pacienteId<=0)throw new ErroNegocio('Selecione o receptor.');
 if(!TIPOS.includes(d.tipo))throw new ErroNegocio('Selecione o hemocomponente.');
 if(!URGENCIAS.includes(d.urgencia))throw new ErroNegocio('Selecione a urgência.');
 if(medico.length<3||medico.length>255)throw new ErroNegocio('Informe o médico solicitante.');
 if(!Number.isSafeInteger(setorId)||setorId<=0)throw new ErroNegocio('Selecione o setor solicitante.');
 if(!Number.isInteger(quantidade)||quantidade<1||quantidade>10)throw new ErroNegocio('Quantidade deve ser entre 1 e 10 bolsas.');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(d.horario_pedido||'')))throw new ErroNegocio('Informe a data e o horário do pedido médico.');
 const horario=new Date(d.horario_pedido+':00-03:00');
 if(isNaN(horario.getTime())||horario>new Date())throw new ErroNegocio('Horário do pedido médico inválido ou futuro.');
 const hemoglobina=d.hemoglobina===''||d.hemoglobina==null?null:Number(d.hemoglobina);
 const plaquetas=d.plaquetas===''||d.plaquetas==null?null:Number(d.plaquetas);
 if(hemoglobina!==null&&(!Number.isFinite(hemoglobina)||hemoglobina<0||hemoglobina>30))throw new ErroNegocio('Hemoglobina inválida.');
 if(plaquetas!==null&&(!Number.isSafeInteger(plaquetas)||plaquetas<0||plaquetas>3000000))throw new ErroNegocio('Contagem de plaquetas inválida.');
 return {pacienteId,setorId,quantidade,medico,horario,hemoglobina,plaquetas,
 indicacao:String(d.indicacao||'').trim()||null,diagnostico:String(d.diagnostico||'').trim()||null,
 consentimento:d.consentimento==='1'||d.consentimento===true,
 requisicao_recebida:d.requisicao_recebida==='1'||d.requisicao_recebida===true};
}
class SolicitacaoService{
 static async listar(){
  const {rows}=await db.query(`SELECT s.id,s.paciente_id,s.tipo,s.urgencia,s.medico_solicitante,s.indicacao,s.status,s.hemocomponente_id,
   s.quantidade_solicitada,s.horario_pedido,s.setor_id,s.hemoglobina,s.plaquetas,s.diagnostico,s.consentimento,s.requisicao_recebida,
   p.nome AS paciente_nome,p.prontuario,p.abo AS paciente_abo,p.fator_rh AS paciente_rh,
   h.codigo_original AS bolsa_codigo,ss.nome AS setor_nome,
   to_char(s.criado_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') AS criado_em_br
   FROM solicitacoes_transfusionais s JOIN pacientes p ON p.id=s.paciente_id
   LEFT JOIN hemocomponentes h ON h.id=s.hemocomponente_id
   LEFT JOIN setores_solicitacao ss ON ss.id=s.setor_id
   ORDER BY CASE s.status WHEN 'PENDENTE' THEN 0 WHEN 'RESERVADA' THEN 1 ELSE 2 END,
   CASE s.urgencia WHEN 'EMERGENCIA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END,s.criado_em DESC`);
  return rows;
 }
 static async listarPendentes(){return (await this.listar()).filter(s=>s.status==='PENDENTE');}
 static async buscarPorId(id){
  const {rows}=await db.query(`SELECT s.*,p.nome AS paciente_nome,p.prontuario,
   p.abo AS paciente_abo,p.fator_rh AS paciente_rh
   FROM solicitacoes_transfusionais s JOIN pacientes p ON p.id=s.paciente_id WHERE s.id=$1`,[id]);
  return rows[0];
 }
 static async criar(dados,usuarioId){
  const d=validar(dados);
  const cliente=await db.connect();
  try{
   await cliente.query('BEGIN');
   const paciente=(await cliente.query('SELECT id,ativo FROM pacientes WHERE id=$1',[d.pacienteId])).rows[0];
   if(!paciente||!paciente.ativo)throw new ErroNegocio('Receptor não encontrado ou inativo.');
   const setor=(await cliente.query('SELECT id FROM setores_solicitacao WHERE id=$1 AND ativo=TRUE',[d.setorId])).rows[0];
   if(!setor)throw new ErroNegocio('Setor inexistente ou inativo.');
   const liberacao=await AmostraReceptorService.podeSolicitar(d.pacienteId);
   if(!liberacao.permitido)throw new ErroNegocio(liberacao.motivo);
   const ids=[];
   for(let i=0;i<d.quantidade;i++){
    const {rows}=await cliente.query(`INSERT INTO solicitacoes_transfusionais
    (paciente_id,tipo,urgencia,medico_solicitante,indicacao,solicitado_por,quantidade_solicitada,
    horario_pedido,setor_id,hemoglobina,plaquetas,diagnostico,consentimento,requisicao_recebida)
    VALUES($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [d.pacienteId,dados.tipo,dados.urgencia,d.medico,d.indicacao,usuarioId,d.horario.toISOString(),
     d.setorId,d.hemoglobina,d.plaquetas,d.diagnostico,d.consentimento,d.requisicao_recebida]);
    ids.push(rows[0].id);
   }
   await cliente.query('COMMIT');return ids;
  }catch(e){await cliente.query('ROLLBACK');throw e;}finally{cliente.release();}
 }
 static async atualizar(id,dados){
  const d=validar({...dados,quantidade:1});
  const cliente=await db.connect();
  try{
   await cliente.query('BEGIN');
   const s=(await cliente.query('SELECT paciente_id,status FROM solicitacoes_transfusionais WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!s)throw new ErroNegocio('Solicitação não encontrada.');
   if(s.status!=='PENDENTE')throw new ErroNegocio('Somente solicitações pendentes podem ser editadas.');
   if(s.paciente_id!==d.pacienteId)throw new ErroNegocio('O receptor não pode ser alterado após o registro.');
   const setor=(await cliente.query('SELECT id FROM setores_solicitacao WHERE id=$1',[d.setorId])).rows[0];
   if(!setor)throw new ErroNegocio('Setor inválido.');
   await cliente.query(`UPDATE solicitacoes_transfusionais SET
    tipo=$1,urgencia=$2,medico_solicitante=$3,indicacao=$4,horario_pedido=$5,setor_id=$6,
    hemoglobina=$7,plaquetas=$8,diagnostico=$9,consentimento=$10,requisicao_recebida=$11,atualizado_em=CURRENT_TIMESTAMP
    WHERE id=$12`,[dados.tipo,dados.urgencia,d.medico,d.indicacao,d.horario.toISOString(),d.setorId,
     d.hemoglobina,d.plaquetas,d.diagnostico,d.consentimento,d.requisicao_recebida,id]);
   await cliente.query('COMMIT');
  }catch(e){await cliente.query('ROLLBACK');throw e;}finally{cliente.release();}
 }
 static async cancelar(id){
  const cliente=await db.connect();
  try{
   await cliente.query('BEGIN');
   const s=(await cliente.query('SELECT id,status,hemocomponente_id FROM solicitacoes_transfusionais WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!s)throw new ErroNegocio('Solicitação não encontrada.');
   if(!['PENDENTE','RESERVADA'].includes(s.status))throw new ErroNegocio('Somente solicitações pendentes ou reservadas podem ser canceladas.');
   if(s.status==='RESERVADA')await cliente.query(`UPDATE hemocomponentes
    SET status=CASE WHEN data_validade<CURRENT_DATE THEN 'VENCIDA' ELSE 'DISPONIVEL' END,
    atualizado_em=CURRENT_TIMESTAMP WHERE id=$1 AND status='RESERVADA'`,[s.hemocomponente_id]);
   await cliente.query(`UPDATE solicitacoes_transfusionais SET status='CANCELADA',hemocomponente_id=NULL,
    atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`,[id]);
   await cliente.query('COMMIT');
  }catch(e){await cliente.query('ROLLBACK');throw e;}finally{cliente.release();}
 }
}
module.exports=SolicitacaoService;
