const db=require('../database');
const COLUNAS_DATAS=`to_char(h.data_coleta,'DD/MM/YYYY') AS data_coleta_br,to_char(h.data_validade,'DD/MM/YYYY') AS data_validade_br,to_char(h.data_coleta,'YYYY-MM-DD') AS data_coleta_iso,to_char(h.data_validade,'YYYY-MM-DD') AS data_validade_iso`;

function calcularDataValidade(tipo, dataColeta) {
    const prazos = { CH: { dias: 35 }, PLAQUETAS: { dias: 5 }, PLASMA: { anos: 1 }, CRIO: { anos: 1 } };
    const prazo = prazos[tipo];
    if (!prazo || !/^\d{4}-\d{2}-\d{2}$/.test(String(dataColeta || ''))) {
        throw new Error('Informe o tipo de hemocomponente e uma data de coleta válida.');
    }
    const [ano, mes, dia] = dataColeta.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    if (prazo.dias) data.setUTCDate(data.getUTCDate() + prazo.dias);
    if (prazo.anos) data.setUTCFullYear(data.getUTCFullYear() + prazo.anos);
    return data.toISOString().slice(0, 10);
}

const EXAMES=['anti_hbc','anti_hcv','anti_hiv_1_2','anti_htlv_i_ii','chagas','hbsag','nat_hbv','nat_hcv','nat_hiv','nat_malaria','sifilis','pesquisa_hbs','pai_negativo'];
class HemocomponenteService{
static async listarTodos(f={}){let q=`SELECT h.*,l.codigo AS codigo_lote,${COLUNAS_DATAS} FROM hemocomponentes h LEFT JOIN lotes_recebimento l ON h.lote_id=l.id WHERE 1=1`;const p=[];if(f.lote_id){p.push(f.lote_id);q+=` AND h.lote_id=$${p.length}`;}if(f.status){p.push(f.status);q+=` AND h.status=$${p.length}`;}q+=' ORDER BY h.data_validade ASC,h.id DESC';return (await db.query(q,p)).rows;}
static async buscarPorId(id){return (await db.query(`SELECT h.*,${COLUNAS_DATAS} FROM hemocomponentes h WHERE h.id=$1`,[id])).rows[0];}
static async criar(d,u){
const lote=(await db.query('SELECT status FROM lotes_recebimento WHERE id=$1',[d.lote_id])).rows[0];
if(!lote){const e=new Error('Lote não encontrado.');e.code='23503';throw e;}if(lote.status!=='ABERTO'){const e=new Error('Lote fechado.');e.code='LOTE_FECHADO';throw e;}
const volume=Number(d.volume_ml);if(!Number.isInteger(volume)||volume<1||volume>5000)throw new Error('Informe um volume válido em mL.');
if(!d.abo||!['A','B','AB','O'].includes(d.abo)||!['+','-'].includes(d.fator_rh||''))throw new Error('Informe o grupo ABO e o fator Rh da bolsa.');
if(!d.codigo_original||!d.codigo_original.trim())throw new Error('O código original é obrigatório.');
const dataValidadeCalculada=calcularDataValidade(d.tipo,d.data_coleta);
const codigo=(await db.query(`SELECT 'CB-'||to_char(CURRENT_DATE,'YY')||'-'||lpad(nextval('hemocomponentes_codigo_interno_seq')::text,7,'0') codigo`)).rows[0].codigo;
const cols=EXAMES.join(',');const vals=EXAMES.map((_,i)=>`$${16+i}`).join(',');
const sql=`INSERT INTO hemocomponentes(lote_id,codigo_original,codigo_interno,tipo,abo,fator_rh,data_coleta,data_validade,volume_ml,inspecao_visual,integridade_confirmada,tipagem_confirmada,status,observacoes,cadastrado_por,${cols}) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,${vals}) RETURNING id,codigo_interno`;
const params=[d.lote_id,d.codigo_original.trim(),codigo,d.tipo,d.abo,d.fator_rh,d.data_coleta,dataValidadeCalculada,volume,d.inspecao_visual==='on',d.integridade_confirmada==='on',d.tipagem_confirmada==='on',d.status||'EM_CONFERENCIA',d.observacoes||null,u,...EXAMES.map(k=>d[k]==='on')];
return (await db.query(sql,params)).rows[0];
}
static async atualizar(id,d){const atual=await this.buscarPorId(id);if(!atual)return false;let status=d.status||atual.status;if(['RESERVADA','TRANSFUNDIDA'].includes(atual.status)||['RESERVADA','TRANSFUNDIDA'].includes(status))status=atual.status;const r=await db.query(`UPDATE hemocomponentes SET tipo=$1,abo=$2,fator_rh=$3,data_validade=$4,inspecao_visual=$5,integridade_confirmada=$6,tipagem_confirmada=$7,status=$8,observacoes=$9,atualizado_em=CURRENT_TIMESTAMP WHERE id=$10`,[d.tipo,d.abo||null,d.fator_rh||null,d.data_validade,d.inspecao_visual==='on',d.integridade_confirmada==='on',d.tipagem_confirmada==='on',status,d.observacoes||null,id]);return r.rowCount>0;}
static async deletar(id){const a=await this.buscarPorId(id);if(a&&a.status==='RESERVADA'){const e=new Error('Bolsa reservada');e.code='BOLSA_RESERVADA';throw e;}const r=await db.query(`UPDATE hemocomponentes SET status='DESCARTADA',atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`,[id]);await db.query('DELETE FROM armazenamento WHERE hemocomponente_id=$1',[id]);return r.rowCount>0;}
}
module.exports=HemocomponenteService;