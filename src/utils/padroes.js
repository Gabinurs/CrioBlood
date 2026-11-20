// Fonte única das expressões regulares dos campos do sistema.
//
// O mesmo padrão é usado em três lugares:
//   1. no servidor (validação obrigatória, nunca depende do navegador);
//   2. no atributo HTML pattern (validação nativa do navegador);
//   3. nas máscaras de digitação (public/js/mascaras.js).
//
// As "fontes" são escritas para funcionar nos modos "u" e "v" do JavaScript
// (por isso "-" e "/" aparecem escapados dentro de colchetes).

const TEXTO_PROIBIDO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const PADROES = {
    // Nome de pessoa (paciente, usuário, médico): começa com letra; aceita acentos, espaço, ' . -
    nomePessoa: {
        fonte: "\\p{L}[\\p{L}'’. \\-]{2,119}",
        max: 120,
        mascara: 'nome',
        mensagem: 'Use de 3 a 120 caracteres: letras, espaços, apóstrofo, ponto e hífen.'
    },
    // Número do prontuário: letras/números, podendo ter . / -
    prontuario: {
        fonte: '[A-Za-z0-9][A-Za-z0-9.\\/\\-]{0,29}',
        max: 30,
        mascara: 'prontuario',
        mensagem: 'Use até 30 caracteres: letras, números, ponto, barra e hífen (ex.: 2024/00123).'
    },
    // Código original da bolsa (número de doação)
    codigoBolsa: {
        fonte: '[A-Za-z0-9][A-Za-z0-9\\-]{2,29}',
        max: 30,
        mascara: 'codigo-bolsa',
        mensagem: 'Use de 3 a 30 caracteres: letras, números e hífen (ex.: W0123-24-000456).'
    },
    // Login do sistema
    login: {
        fonte: '[A-Za-z0-9][A-Za-z0-9._\\-]{2,29}',
        max: 30,
        mascara: 'login',
        mensagem: 'Use de 3 a 30 caracteres: letras, números, ponto, sublinhado e hífen, sem espaços.'
    },
    // Senha nova: pelo menos 8 caracteres, com ao menos uma letra e um número
    senha: {
        fonte: '(?=.*\\p{L})(?=.*\\d).{8,72}',
        max: 72,
        mascara: null,
        mensagem: 'Use de 8 a 72 caracteres, com pelo menos uma letra e um número.'
    },
    // Nome de equipamento: aceita letras, números, espaço e . - /
    nomeEquipamento: {
        fonte: '[\\p{L}\\p{N}][\\p{L}\\p{N} .\\/\\-]{1,99}',
        max: 100,
        mascara: 'nome-equipamento',
        mensagem: 'Use de 2 a 100 caracteres: letras, números, espaço, ponto, barra e hífen.'
    },
    // Temperatura de operação: -80, -80 °C, 4,5 °C
    temperatura: {
        fonte: '-?\\d{1,3}(?:[.,]\\d{1,2})?(?: ?°C)?',
        max: 20,
        mascara: 'temperatura',
        mensagem: 'Informe só o número, com até 2 casas decimais (ex.: -80 ou 4,5).'
    },
    // Gaveta, caixa e posição no equipamento (A1, B12, 3...)
    posicao: {
        fonte: '[A-Za-z0-9][A-Za-z0-9\\-]{0,9}',
        max: 10,
        mascara: 'posicao',
        mensagem: 'Use até 10 caracteres: letras, números e hífen (ex.: A1, B12).'
    },
    // Cartão Nacional de Saúde: 15 dígitos, com ou sem separadores visuais.
    cns: {
        fonte: '(?:\\\\d{15}|\\\\d{3} \\\\d{4} \\\\d{4} \\\\d{4})',
        max: 18,
        mascara: 'cns',
        mensagem: 'Informe os 15 dígitos do CNS.'
    },
    // CPF: 11 dígitos, com ou sem pontuação.
    cpf: {
        fonte: '(?:\\\\d{11}|\\\\d{3}\\\\.\\\\d{3}\\\\.\\\\d{3}-\\\\d{2})',
        max: 14,
        mascara: 'cpf',
        mensagem: 'Informe um CPF com 11 dígitos.'
    },
    // RG varia conforme o estado; valida estrutura sem impor uma máscara nacional.
    rg: {
        fonte: '[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N} .\\\\/-]{3,19}',
        max: 20,
        mascara: null,
        mensagem: 'Use de 4 a 20 caracteres: letras, números, ponto, barra, espaço ou hífen.'
    },
    // Telefone brasileiro: DDD + número, com ou sem formatação.
    telefone: {
        fonte: '(?:\\\\d{10,11}|\\\\(\\\\d{2}\\\\) \\\\d{4,5}-\\\\d{4})',
        max: 15,
        mascara: 'telefone',
        mensagem: 'Informe DDD e telefone com 10 ou 11 dígitos.'
    },
    // Data no formato AAAA-MM-DD (campo type="date")
    dataIso: {
        fonte: '\\d{4}-\\d{2}-\\d{2}',
        max: 10,
        mascara: null,
        mensagem: 'Informe uma data válida.'
    },
    // Identificador numérico (ids em URLs e formulários)
    idNumerico: {
        fonte: '\\d{1,10}',
        max: 10,
        mascara: null,
        mensagem: 'Informe um número válido.'
    }
};

// Cria o RegExp completo (início ao fim) de cada padrão
for (const padrao of Object.values(PADROES)) {
    padrao.regex = new RegExp(`^(?:${padrao.fonte})$`, 'u');
}

// Texto livre (observações, indicação): sem caracteres de controle e com limite de tamanho
const LIMITE_TEXTO_LIVRE = 500;

function textoLivreValido(texto) {
    return typeof texto === 'string' && texto.length <= LIMITE_TEXTO_LIVRE && !TEXTO_PROIBIDO.test(texto);
}

// Tira espaços das pontas e troca sequências de espaços por um só
function normalizarEspacos(texto) {
    return String(texto === undefined || texto === null ? '' : texto).trim().replace(/\s+/g, ' ');
}

function ehDataValida(iso) {
    if (!PADROES.dataIso.regex.test(iso || '')) return false;

    const [ano, mes, dia] = iso.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

// Só o necessário para as views (HTML pattern, máscara e mensagem)
function paraViews() {
    const saida = {};
    for (const [nome, p] of Object.entries(PADROES)) {
        saida[nome] = { fonte: p.fonte, max: p.max, mascara: p.mascara, mensagem: p.mensagem };
    }
    return saida;
}

module.exports = {
    PADROES,
    LIMITE_TEXTO_LIVRE,
    textoLivreValido,
    normalizarEspacos,
    ehDataValida,
    paraViews
};
