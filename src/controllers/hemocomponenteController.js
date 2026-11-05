const HemocomponenteService = require('../services/hemocomponenteService');

class HemocomponenteController {
    // Renderiza a lista de hemocomponentes
    static async index(req, res) {
        try {
            const { lote_id, status } = req.query;
            const hemocomponentes = await HemocomponenteService.listarTodos({ lote_id, status });
            
            res.render('hemocomponentes/index', { 
                hemocomponentes,
                usuario: req.session.usuario,
                title: 'Gestão de Hemocomponentes' 
            });
        } catch (erro) {
            console.error('Erro ao listar hemocomponentes:', erro);
            res.status(500).send('Erro interno do servidor ao carregar hemocomponentes.');
        }
    }

    // Renderiza o formulário de cadastro
    static async renderizarCadastro(req, res) {
        // Se vier com ?lote_id=1, já preenchemos o form para aquele lote
        const lote_id = req.query.lote_id || '';
        res.render('hemocomponentes/cadastro', { 
            lote_id,
            usuario: req.session.usuario,
            title: 'Cadastrar Hemocomponente' 
        });
    }

    // Processa o salvamento de um novo hemocomponente
    static async salvarNovo(req, res) {
        try {
            const dados = req.body;
            await HemocomponenteService.criar(dados);
            // Redireciona para a lista geral após salvar
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao salvar hemocomponente:', erro);
            res.status(500).send('Erro ao salvar os dados.');
        }
    }

    // Renderiza a tela de edição
    static async renderizarEdicao(req, res) {
        try {
            const { id } = req.params;
            const hemocomponente = await HemocomponenteService.buscarPorId(id);
            
            if (!hemocomponente) {
                return res.status(404).send('Hemocomponente não encontrado.');
            }

            res.render('hemocomponentes/editar', { 
                hemocomponente,
                usuario: req.session.usuario,
                title: 'Editar Hemocomponente' 
            });
        } catch (erro) {
            console.error('Erro ao carregar hemocomponente:', erro);
            res.status(500).send('Erro ao carregar os dados para edição.');
        }
    }

    // Processa a atualização dos dados
    static async atualizar(req, res) {
        try {
            const { id } = req.params;
            const dados = req.body;
            await HemocomponenteService.atualizar(id, dados);
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao atualizar hemocomponente:', erro);
            res.status(500).send('Erro ao atualizar os dados.');
        }
    }

    // Processa o descarte logico do hemocomponente
    static async descartar(req, res) {
        try {
            const { id } = req.params;
            await HemocomponenteService.deletar(id);
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao descartar hemocomponente:', erro);
            res.status(500).send('Erro ao descartar o item.');
        }
    }
}

module.exports = HemocomponenteController;
