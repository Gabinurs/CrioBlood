const test = require('node:test');
const assert = require('node:assert/strict');

const { resolverStatusEdicao } = require('./hemocomponenteModel');

test('a edição alterna entre EM_CONFERENCIA e DISPONIVEL', () => {
    assert.equal(resolverStatusEdicao('EM_CONFERENCIA', 'DISPONIVEL'), 'DISPONIVEL');
    assert.equal(resolverStatusEdicao('DISPONIVEL', 'EM_CONFERENCIA'), 'EM_CONFERENCIA');
});

test('a edição não consegue descartar nem vencer a bolsa (descarte é só do Supervisor)', () => {
    assert.equal(resolverStatusEdicao('DISPONIVEL', 'DESCARTADA'), 'DISPONIVEL');
    assert.equal(resolverStatusEdicao('EM_CONFERENCIA', 'VENCIDA'), 'EM_CONFERENCIA');
});

test('bolsa em status final nunca volta a ficar disponível pela edição', () => {
    for (const final of ['DESCARTADA', 'VENCIDA', 'TRANSFUNDIDA', 'RESERVADA']) {
        assert.equal(resolverStatusEdicao(final, 'DISPONIVEL'), final);
        assert.equal(resolverStatusEdicao(final, undefined), final);
    }
});

test('sem status informado, mantém o atual', () => {
    assert.equal(resolverStatusEdicao('DISPONIVEL', undefined), 'DISPONIVEL');
    assert.equal(resolverStatusEdicao('DISPONIVEL', ''), 'DISPONIVEL');
});
