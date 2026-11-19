const test = require('node:test');
const assert = require('node:assert/strict');

const { avaliar, descreverAceitos } = require('./compatibilidadeService');

const pac = (abo, fator_rh) => ({ abo, fator_rh });
const bolsa = (abo, fator_rh) => ({ abo, fator_rh });

test('hemácias: grupo O negativo é doador universal', () => {
    for (const abo of ['A', 'B', 'AB', 'O']) {
        for (const rh of ['+', '-']) {
            assert.notEqual(avaliar(pac(abo, rh), bolsa('O', '-'), 'CH'), null, `${abo}${rh} deve aceitar O-`);
        }
    }
});

test('hemácias: grupo O só recebe hemácias O', () => {
    assert.equal(avaliar(pac('O', '+'), bolsa('A', '+'), 'CH'), null);
    assert.equal(avaliar(pac('O', '+'), bolsa('B', '-'), 'CH'), null);
    assert.equal(avaliar(pac('O', '+'), bolsa('AB', '+'), 'CH'), null);
    assert.equal(avaliar(pac('O', '+'), bolsa('O', '+'), 'CH'), 'IDENTICA');
});

test('hemácias: paciente Rh negativo nunca recebe Rh positivo', () => {
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '+'), 'CH'), null);
    assert.equal(avaliar(pac('AB', '-'), bolsa('O', '+'), 'CH'), null);
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '-'), 'CH'), 'IDENTICA');
});

test('hemácias: paciente Rh positivo pode receber Rh negativo (compatível, não idêntica)', () => {
    assert.equal(avaliar(pac('A', '+'), bolsa('A', '-'), 'CH'), 'COMPATIVEL');
    assert.equal(avaliar(pac('A', '+'), bolsa('O', '+'), 'CH'), 'COMPATIVEL');
});

test('plasma: regra invertida (AB é doador universal, O recebe de todos)', () => {
    for (const abo of ['A', 'B', 'AB', 'O']) {
        assert.notEqual(avaliar(pac(abo, '+'), bolsa('AB', '+'), 'PLASMA'), null, `${abo} deve aceitar plasma AB`);
    }
    assert.notEqual(avaliar(pac('O', '+'), bolsa('A', '+'), 'PLASMA'), null);
    assert.notEqual(avaliar(pac('O', '+'), bolsa('B', '+'), 'PLASMA'), null);
    assert.equal(avaliar(pac('AB', '+'), bolsa('O', '+'), 'PLASMA'), null);
    assert.equal(avaliar(pac('A', '+'), bolsa('B', '+'), 'PLASMA'), null);
});

test('plasma e crio: o Rh é indiferente', () => {
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '+'), 'PLASMA'), 'IDENTICA');
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '+'), 'CRIO'), 'IDENTICA');
});

test('plaquetas: exige Rh para paciente Rh negativo', () => {
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '+'), 'PLAQUETAS'), null);
    assert.equal(avaliar(pac('A', '-'), bolsa('A', '-'), 'PLAQUETAS'), 'IDENTICA');
});

test('paciente sem tipagem não tem bolsa compatível', () => {
    assert.equal(avaliar(pac(null, null), bolsa('O', '-'), 'CH'), null);
    assert.equal(descreverAceitos(pac(null, null), 'CH'), null);
});

test('descreverAceitos informa grupos e Rh aceitos', () => {
    assert.match(descreverAceitos(pac('A', '-'), 'CH'), /A, O.*apenas Rh negativo/i);
    assert.match(descreverAceitos(pac('AB', '+'), 'PLASMA'), /AB.*Rh indiferente/);
});
