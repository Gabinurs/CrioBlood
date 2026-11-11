const { body, validationResult } = require('express-validator');

// Interceptador genérico: se houver erros, barra a requisição e exibe para o usuário
const checarErros = (req, res, next) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        const listaErros = erros.array().map(e => `<li>${e.msg}</li>`).join('');
        // Renderiza um HTML simples para o usuário poder voltar ao formulário e corrigir
        return res.status(400).send(`
            <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #d9534f; border-left: 5px solid #d9534f; background-color: #fdf7f7; color: #333;">
                <h2 style="color: #d9534f; margin-top: 0;">Falha na Validação dos Dados</h2>
                <ul>${listaErros}</ul>
                <button onclick="history.back()" style="padding: 10px 15px; background-color: #333; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 15px;">
                    &larr; Voltar e Corrigir
                </button>
            </div>
        `);
    }
    next(); // Se não houver erros, passa o bastão para o Controller
};

// ==========================================
// REGRAS DE VALIDAÇÃO: HEMOCOMPONENTES
// ==========================================
const TIPOS = ['CH', 'PLASMA', 'PLAQUETAS', 'CRIO'];
const STATUS = ['EM_CONFERENCIA', 'DISPONIVEL', 'RESERVADA', 'TRANSFUNDIDA', 'DESCARTADA', 'VENCIDA'];

const validarHemocomponente = [
    // O lote e o código original só existem no cadastro (não na edição)
    body('lote_id')
        .if((value, { req }) => req.method === 'POST' && req.path === '/novo')
        .isInt({ gt: 0 }).withMessage('O ID do lote deve ser um número válido.'),

    body('codigo_original')
        .if((value, { req }) => req.method === 'POST' && req.path === '/novo')
        .trim().notEmpty().withMessage('O código original da bolsa é obrigatório.')
        .isLength({ max: 50 }).withMessage('O código original deve ter no máximo 50 caracteres.'),

    body('tipo')
        .notEmpty().withMessage('O tipo de hemocomponente é obrigatório.')
        .isIn(TIPOS).withMessage('Tipo de hemocomponente não reconhecido.'),

    body('abo')
        .optional({ values: 'falsy' })
        .isIn(['A', 'B', 'AB', 'O']).withMessage('Grupo ABO inválido.'),

    body('fator_rh')
        .optional({ values: 'falsy' })
        .isIn(['+', '-']).withMessage('Fator Rh inválido.'),

    body('data_coleta')
        .if((value, { req }) => req.method === 'POST' && req.path === '/novo')
        .isISO8601().withMessage('A data de coleta informada é inválida.'),

    body('data_validade')
        .isISO8601().withMessage('A data de validade informada é inválida.')
        .custom((value, { req }) => {
            if (req.body.data_coleta && new Date(value) < new Date(req.body.data_coleta)) {
                throw new Error('A data de validade não pode ser anterior à data de coleta.');
            }
            return true;
        }),

    body('status')
        .optional({ values: 'falsy' })
        .isIn(STATUS).withMessage('Status não reconhecido.'),

    checarErros
];

// ==========================================
// REGRAS DE VALIDAÇÃO: SAÍDA/TRANSFUSÃO
// ==========================================
const validarTransfusao = [
    body('hemocomponente_id')
        .isInt({ gt: 0 }).withMessage('ID do hemocomponente inválido.'),
    
    body('paciente_nome')
        .trim().isLength({ min: 3, max: 255 }).withMessage('O nome do paciente deve ter entre 3 e 255 caracteres.')
        .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/).withMessage('O nome do paciente não pode conter números ou símbolos especiais.'),
    
    body('prontuario')
        .trim().notEmpty().withMessage('O número do prontuário é obrigatório.'),
    
    checarErros
];

module.exports = {
    validarHemocomponente,
    validarTransfusao
};
