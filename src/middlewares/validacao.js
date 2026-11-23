const { body, validationResult } = require('express-validator');
const { enviarErro } = require('../utils/erros');
const { PADROES, LIMITE_TEXTO_LIVRE, textoLivreValido, normalizarEspacos } = require('../utils/padroes');
const STATUS = require('../utils/status');

// Interceptador genérico: se houver erros de validação, responde 422 com a lista de problemas
const checarErros = (req, res, next) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        const mensagens = [...new Set(erros.array().map(e => e.msg))];
        return enviarErro(req, res, STATUS.ENTIDADE_INVALIDA,
            'Alguns campos não passaram na validação. Corrija e tente novamente.', mensagens);
    }
    next(); // Se não houver erros, passa para o Controller
};

// ==========================================
// REGRAS DE VALIDAÇÃO: HEMOCOMPONENTES
// ==========================================
const TIPOS = ['CH', 'PLASMA', 'PLAQUETAS', 'CRIO'];
const STATUS_BOLSA = ['EM_CONFERENCIA', 'DISPONIVEL', 'RESERVADA', 'TRANSFUNDIDA', 'DESCARTADA', 'VENCIDA'];

const validarHemocomponente = [
    // O lote e o código original só existem no cadastro (não na edição)
    body('lote_id')
        .if((value, { req }) => req.method === 'POST' && req.path === '/novo')
        .isInt({ gt: 0 }).withMessage('Selecione um lote válido.'),

    // Código da bolsa: maiúsculas, letras/números/hífen, de 3 a 30 caracteres
    body('codigo_original')
        .if((value, { req }) => req.method === 'POST' && req.path === '/novo')
        .customSanitizer((valor) => normalizarEspacos(valor).toUpperCase())
        .notEmpty().withMessage('O código original da bolsa é obrigatório.').bail()
        .matches(PADROES.codigoBolsa.regex).withMessage(`Código da bolsa inválido. ${PADROES.codigoBolsa.mensagem}`),

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
        .isISO8601({ strict: true, strictSeparator: true }).withMessage('A data de coleta informada é inválida.'),

    body('data_validade')
        .notEmpty().withMessage('Informe a data de validade da bolsa.').bail()
        .isISO8601({ strict: true, strictSeparator: true }).withMessage('A data de validade informada é inválida.')
        .custom((value, { req }) => {
            // Campos type="date" chegam como AAAA-MM-DD; comparar as strings ISO evita
            // deslocamentos de fuso horário e mantém a comparação por dia de calendário.
            if (req.body.data_coleta && value < req.body.data_coleta) {
                throw new Error('A data de validade não pode ser anterior à data de coleta.');
            }
            return true;
        }),

    body('status')
        .optional({ values: 'falsy' })
        .isIn(STATUS_BOLSA).withMessage('Status não reconhecido.'),

    body('observacoes')
        .optional({ values: 'falsy' })
        .custom((valor) => textoLivreValido(String(valor)))
        .withMessage(`Observações: use até ${LIMITE_TEXTO_LIVRE} caracteres, sem caracteres de controle.`),

    checarErros
];

module.exports = {
    validarHemocomponente
};
