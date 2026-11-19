const test = require('node:test');
const assert = require('node:assert/strict');

const { validarNovaSenha } = require('./authService');

test('aceita senha válida', () => {
    assert.equal(validarNovaSenha('senha-forte-123'), null);
});

test('recusa senha curta, vazia ou que não é texto', () => {
    assert.match(validarNovaSenha('1234567'), /pelo menos 8/);
    assert.match(validarNovaSenha(''), /pelo menos 8/);
    assert.match(validarNovaSenha(undefined), /pelo menos 8/);
});

test('recusa senha acima de 72 bytes (limite do bcrypt)', () => {
    assert.match(validarNovaSenha('a'.repeat(73)), /72 bytes/);
    assert.equal(validarNovaSenha('a'.repeat(71) + '1'), null);
    assert.match(validarNovaSenha('ç'.repeat(40)), /72 bytes/); // 80 bytes em UTF-8
});

test('exige ao menos uma letra e um número', () => {
    assert.match(validarNovaSenha('somenteletras'), /letra e um número/);
    assert.match(validarNovaSenha('12345678'), /letra e um número/);
    assert.equal(validarNovaSenha('letras123'), null);
    assert.equal(validarNovaSenha('Ação-forte 9'), null);
});
