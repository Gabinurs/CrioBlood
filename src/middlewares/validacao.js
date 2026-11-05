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
const validarHemocomponente = [
    body('lote_id')
        .isInt({ gt: 0 }).withMessage('O ID do lote deve ser um número válido.'),
    
    body('tipo')
        .notEmpty().withMessage('O tipo de hemocomponente é obrigatório.')
        .isIn(['Concentrado de Hemácias', 'Plasma Fresco Congelado', 'Concentrado de Plaquetas', 'Crioprecipitado'])
        .withMessage('Tipo de hemocomponente não reconhecido.'),
    
    body('volume_ml')
        .isFloat({ min: 10, max: 1000 }).withMessage('O volume deve ser um número entre 10ml e 1000ml.'),
    
    body('data_extracao')
        .isISO8601().withMessage('A data de extração informada é inválida.'),
    
    body('data_validade')
        .isISO8601().withMessage('A data de validade informada é inválida.')
        .custom((value, { req }) => {
            const extracao = new Date(req.body.data_extracao);
            const validade = new Date(value);
            if (validade <= extracao) {
                throw new Error('A data de validade deve ser obrigatoriamente posterior à data de extração.');
            }
            return true;
        }),
    
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
