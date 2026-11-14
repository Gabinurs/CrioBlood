const db = require('../database');
const { ErroNegocio } = require('../utils/erros');
class SetorSolicitacaoService {
 static async listarAtivos() {
  const {rows}=await db.query('SELECT id,nome FROM setores_solicitacao WHERE ativo=TRUE ORDER BY nome');
  return rows;
 }
 static async listarTodos() {
  const {rows}=await db.query('SELECT id,nome,ativo FROM setores_solicitacao ORDER BY nome');
  return rows;
 }
 static async criar(nome) {
  nome=String(nome||'').trim();
  if(nome.length<2||nome.length>100) throw new ErroNegocio('Informe um setor com 2 a 100 caracteres.');
  await db.query('INSERT INTO setores_solicitacao(nome) VALUES($1)',[nome]);
 }
 static async alternar(id) {
  const {rowCount}=await db.query('UPDATE setores_solicitacao SET ativo=NOT ativo WHERE id=$1',[id]);
  if(!rowCount) throw new ErroNegocio('Setor não encontrado.');
 }
}
module.exports=SetorSolicitacaoService;
