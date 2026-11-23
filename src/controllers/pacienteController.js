const PacienteModel = require('../models/pacienteModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

class PacienteController {
    // Abre a tela vazia ou recupera o receptor recém-cadastrado/selecionado.
    static async listar(req, res) {
        try {
            let selecionado = null;
            if (req.query.selecionado && /^\\d+$/.test(String(req.query.selecionado))) {
                selecionado = await PacienteModel.buscarPorId(req.query.selecionado);
            }
            res.render('pacientes/index', {
                pacientes: [],
                valores: {},
                abrirCadastro: false,
                selecionado,
                usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao abrir Receptores');
        }
    }

    // Endpoint JSON usado pela pesquisa dinâmica por nome parcial.
    static async buscar(req, res) {
        try {
            const termo = String(req.query.q || '').trim();
            if (termo.length < 2) return res.status(STATUS.OK).json([]);
            const pacientes = await PacienteModel.buscarPorNome(termo);
            return res.status(STATUS.OK).json(pacientes.map(p => ({
                id: p.id,
                nome: p.nome,
                nascimento: p.data_nascimento_br,
                prontuario: p.prontuario || '—',
                nome_mae: p.nome_mae || 'Não informado',
                tipagem: p.abo ? p.abo + (p.fator_rh || '') : 'Tipagem pendente',
                ultima_amostra_id: p.ultima_amostra_id || null,
                ativo: Boolean(p.ativo)
            })));
        } catch (erro) {
            console.error('Erro ao pesquisar receptores:', erro.message);
            return res.status(STATUS.ERRO_INTERNO).json({ erro: 'Não foi possível pesquisar os receptores.' });
        }
    }

    static formNovo(req, res) {
        res.render('pacientes/index', {
            pacientes: [],
            valores: {},
            abrirCadastro: true,
            selecionado: null,
            usuario: req.session.usuario
        });
    }

    static async criar(req, res) {
        try {
            const id = await PacienteModel.criar(req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'CADASTRO_PACIENTE', 'pacientes', id, '');
            avisar(req, 'ok', 'Receptor cadastrado com sucesso.');
            return res.redirect(STATUS.VER_OUTRO, '/pacientes?selecionado=' + id);
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/index', {
                    pacientes: [],
                    valores: req.body,
                    abrirCadastro: true,
                    selecionado: null,
                    erro: erro.message,
                    usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao cadastrar receptor');
        }
    }

    static async formEditar(req, res) {
        try {
            const paciente = await PacienteModel.buscarPorId(req.params.id);
            if (!paciente) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Receptor não encontrado.');
            res.render('pacientes/form', { paciente, valores: {}, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/pacientes', 'Erro ao abrir receptor');
        }
    }

    static async atualizar(req, res) {
        try {
            await PacienteModel.atualizar(req.params.id, req.body);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'EDICAO_PACIENTE', 'pacientes', Number(req.params.id), '');
            avisar(req, 'ok', 'Dados do receptor atualizados.');
            return res.redirect(STATUS.VER_OUTRO, '/pacientes?selecionado=' + req.params.id);
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const paciente = await PacienteModel.buscarPorId(req.params.id);
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('pacientes/form', {
                    paciente, valores: req.body, erro: erro.message, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/pacientes', 'Erro ao atualizar receptor');
        }
    }
}

module.exports = PacienteController;
