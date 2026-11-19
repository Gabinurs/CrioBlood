const test = require('node:test');
const assert = require('node:assert/strict');

const { MASCARAS, AO_SAIR } = require('../../public/js/mascaras.js');
const { PADROES } = require('./padroes');

test('máscara prontuario: maiúsculas e só caracteres permitidos', () => {
    assert.equal(MASCARAS.prontuario('ab-12/x y!'), 'AB-12/XY');
    assert.equal(MASCARAS.prontuario('---'), '');
});

test('máscara codigo-bolsa e posicao: maiúsculas, números e hífen', () => {
    assert.equal(MASCARAS['codigo-bolsa']('w01 23-24_000'), 'W0123-24000');
    assert.equal(MASCARAS.posicao('a 1!'), 'A1');
    assert.equal(MASCARAS.posicao('abcdefghijklmno'), 'ABCDEFGHIJ');
});

test('máscara nome: sem números, sem espaços repetidos', () => {
    assert.equal(MASCARAS.nome('  joão  da   silva3'), 'joão da silva');
    assert.equal(MASCARAS.nome("d'ávila-souza"), "d'ávila-souza");
});

test('máscara login: sem espaço nem acento', () => {
    assert.equal(MASCARAS.login('Jo ão.Silva'), 'Joo.Silva');
});

test('máscara temperatura: sinal, 3 dígitos e 2 decimais', () => {
    assert.equal(MASCARAS.temperatura('-80,555'), '-80,55');
    assert.equal(MASCARAS.temperatura('12345'), '123');
    assert.equal(MASCARAS.temperatura('abc'), '');
    assert.equal(AO_SAIR.temperatura('-80'), '-80 °C');
    assert.equal(AO_SAIR.temperatura('4,5'), '4,5 °C');
    assert.equal(AO_SAIR.temperatura('-'), '-');
});

test('o que a máscara devolve (campo completo) sempre passa na regex do servidor', () => {
    const entradas = ['maria da silva', 'joão d\'ávila', 'ab-12/3', 'w0123-24-000456', 'a1', 'b12', 'maria.silva', 'freezer t-01', '-80', '4,5'];
    const mapa = {
        nome: 'nomePessoa', prontuario: 'prontuario', 'codigo-bolsa': 'codigoBolsa', posicao: 'posicao',
        login: 'login', 'nome-equipamento': 'nomeEquipamento'
    };
    for (const [mascara, padrao] of Object.entries(mapa)) {
        for (const entrada of entradas) {
            const saida = MASCARAS[mascara](entrada);
            // só vale quando a entrada era um valor "completo" plausível para o campo
            if (saida.length >= 3 && saida === MASCARAS[mascara](saida)) {
                const valido = PADROES[padrao].regex.test(saida);
                if (!valido) assert.fail(`máscara ${mascara}("${entrada}") -> "${saida}" não passa em ${padrao}`);
            }
        }
    }
    assert.ok(PADROES.temperatura.regex.test(AO_SAIR.temperatura(MASCARAS.temperatura('-80'))));
});

test('as máscaras são idempotentes (aplicar duas vezes dá o mesmo resultado)', () => {
    for (const [nome, funcao] of Object.entries(MASCARAS)) {
        for (const v of ['  AbC-12 / x', "O'Neil  Souza", '-80,5', '###']) {
            assert.equal(funcao(funcao(v)), funcao(v), `${nome}("${v}")`);
        }
    }
});
