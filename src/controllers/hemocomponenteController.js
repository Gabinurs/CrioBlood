const HemocomponenteService = require('../services/hemocomponenteService');

// Traduz erros do PostgreSQL para mensagens que o usuário entende
function mensagemDeErro(erro) {
    switch (erro.code) {
        case '23505':
            return 'Já existe uma bolsa cadastrada com esse código original.';
        case '23503':
            return 'O lote informado não existe. Confira o ID do lote.';
        case 'LOTE_FECHADO':
            return 'Esse lote já está fechado e não recebe novas bolsas.';
        case 'BOLSA_RESERVADA':
            return 'Essa bolsa está reservada para um paciente. Cancele a solicitação antes de descartá-la.';
        case '23514':
            return 'Para marcar a bolsa como DISPONÍVEL é preciso confirmar a inspeção visual, ' +
                   'a integridade e a tipagem, e informar ABO e Rh. A validade também não pode ' +
                   'ser anterior à coleta.';
        default:
            return null;
    }
}

function paginaDeErro(res, mensagem) {
    return res.status(400).send(`
        <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #d9534f; border-left: 5px solid #d9534f; background-color: #fdf7f7; color: #333;">
            <h2 style="color: #d9534f; margin-top: 0;">Não foi possível salvar</h2>
            <p>${mensagem}</p>
            <button onclick="history.back()" style="padding: 10px 15px; background-color: #333; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 15px;">
                &larr; Voltar e Corrigir
            </button>
        </div>
    `);
}

class HemocomponenteController {
    // Lista de hemocomponentes
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

    // Formulário de cadastro
    static async renderizarCadastro(req, res) {
        const lote_id = req.query.lote_id || '';
        res.render('hemocomponentes/cadastro', {
            lote_id,
            usuario: req.session.usuario,
            title: 'Cadastrar Hemocomponente'
        });
    }

    // Salva um novo hemocomponente
    static async salvarNovo(req, res) {
        try {
            await HemocomponenteService.criar(req.body, req.session.usuario.id);
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao salvar hemocomponente:', erro);
            const mensagem = mensagemDeErro(erro);
            if (mensagem) return paginaDeErro(res, mensagem);
            res.status(500).send('Erro ao salvar os dados.');
        }
    }

    // Tela de edição
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

    // Atualiza os dados
    static async atualizar(req, res) {
        try {
            const { id } = req.params;
            await HemocomponenteService.atualizar(id, req.body);
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao atualizar hemocomponente:', erro);
            const mensagem = mensagemDeErro(erro);
            if (mensagem) return paginaDeErro(res, mensagem);
            res.status(500).send('Erro ao atualizar os dados.');
        }
    }

    // Descarte lógico
    static async descartar(req, res) {
        try {
            const { id } = req.params;
            await HemocomponenteService.deletar(id);
            res.redirect('/hemocomponentes');
        } catch (erro) {
            console.error('Erro ao descartar hemocomponente:', erro);
            const mensagem = mensagemDeErro(erro);
            if (mensagem) return paginaDeErro(res, mensagem);
            res.status(500).send('Erro ao descartar o item.');
        }
    }
}

module.exports = HemocomponenteController;
