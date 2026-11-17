const HemocomponenteService = require('../services/hemocomponenteService');
const AuditoriaService = require('../services/auditoriaService');

// Compara a bolsa antes e depois da edição e descreve o que mudou (para a auditoria)
function descreverMudancas(antes, depois) {
    const campos = [
        ['tipo', 'tipo'], ['abo', 'ABO'], ['fator_rh', 'Rh'],
        ['data_validade_iso', 'validade'], ['status', 'status']
    ];
    return campos
        .filter(([chave]) => (antes[chave] || '') !== (depois[chave] || ''))
        .map(([chave, rotulo]) => `${rotulo}: ${antes[chave] || '—'} → ${depois[chave] || '—'}`)
        .join('; ');
}

// Traduz erros do PostgreSQL para mensagens que o usuário entende
function mensagemDeErro(erro) {
    switch (erro.code) {
        case '23505':
            return 'Já existe uma bolsa cadastrada com esse código original.';
        case '23503':
            return 'O lote informado não existe. Confira o ID do lote.';
        case 'LOTE_FECHADO':
            return 'Esse lote já está fechado e não recebe novas bolsas.';
        case 'BOLSA_FINALIZADA':
            return 'Essa bolsa já foi transfundida ou descartada.';
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
        try {
            const lotes = await HemocomponenteService.listarLotesAbertos();
            res.render('hemocomponentes/cadastro', {
                lote_id: req.query.lote_id || '',
                lotes,
                usuario: req.session.usuario,
                title: 'Cadastrar Hemocomponente'
            });
        } catch (erro) {
            console.error('Erro ao abrir cadastro de hemocomponente:', erro);
            res.status(500).send('Erro ao abrir o formulário de cadastro.');
        }
    }

    // Salva um novo hemocomponente
    static async salvarNovo(req, res) {
        try {
            const id = await HemocomponenteService.criar(req.body, req.session.usuario.id);
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'CADASTRO_BOLSA', 'hemocomponentes', id, req.body.codigo_original.trim());
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
            const antes = await HemocomponenteService.buscarPorId(id);
            if (!antes) return res.status(404).send('Hemocomponente não encontrado.');

            await HemocomponenteService.atualizar(id, req.body);

            const depois = await HemocomponenteService.buscarPorId(id);
            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'EDICAO_BOLSA', 'hemocomponentes', Number(id),
                `${antes.codigo_original}. ${descreverMudancas(antes, depois) || 'Sem mudança nos campos principais.'}`);
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
            const encontrada = await HemocomponenteService.deletar(id);
            if (!encontrada) return res.status(404).send('Hemocomponente não encontrado.');

            await AuditoriaService.registrarLog(
                req.session.usuario.id, 'DESCARTE_BOLSA', 'hemocomponentes', Number(id), '');
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
