const Setores=require('../services/setorSolicitacaoService');
const {avisar,tratar}=require('../utils/erros');
module.exports={
 async listar(req,res){try{res.render('solicitacoes/setores',{setores:await Setores.listarTodos(),usuario:req.session.usuario});}catch(e){tratar(req,res,e,'/solicitacoes','Erro ao listar setores');}},
 async criar(req,res){try{await Setores.criar(req.body.nome);avisar(req,'ok','Setor cadastrado.');res.redirect('/solicitacoes/setores');}catch(e){tratar(req,res,e,'/solicitacoes/setores','Erro ao cadastrar setor');}},
 async alternar(req,res){try{await Setores.alternar(Number(req.params.id));avisar(req,'ok','Status do setor atualizado.');res.redirect('/solicitacoes/setores');}catch(e){tratar(req,res,e,'/solicitacoes/setores','Erro ao atualizar setor');}}
};
