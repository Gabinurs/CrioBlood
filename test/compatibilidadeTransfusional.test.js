'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { avaliarComponente } = require('../src/services/compatibilidadeTransfusionalService');

function avaliar(tipo, paciente, bolsa, pesoReceptorKg) {
    return avaliarComponente({
        tipo,
        paciente: { sexo: 'F', idade: 35, ...paciente },
        bolsa,
        pesoReceptorKg
    });
}

test('CH: matriz ABO permite O para A e bloqueia B para A', () => {
    const pacienteA = { abo: 'A', fator_rh: '+' };
    assert.equal(avaliar('CH', pacienteA, { abo: 'O', fator_rh: '+' }).permitido, true);
    assert.equal(avaliar('CH', pacienteA, { abo: 'B', fator_rh: '+' }).permitido, false);
});

test('CH: receptor RhD negativo não recebe RhD positivo como regra geral', () => {
    const resposta = avaliar(
        'CH',
        { abo: 'O', fator_rh: '-' },
        { abo: 'O', fator_rh: '+' }
    );
    assert.equal(resposta.permitido, false);
    assert.equal(resposta.status, 'INCOMPATIVEL_RHD');
});

test('CH: exceção O negativo para homem acima de 60 com bolsa O positivo exige autorização', () => {
    const resposta = avaliar(
        'CH',
        { abo: 'O', fator_rh: '-', sexo: 'M', idade: 61 },
        { abo: 'O', fator_rh: '+' }
    );
    assert.equal(resposta.permitido, false);
    assert.equal(resposta.excecaoPossivel, true);
    assert.equal(resposta.status, 'EXCECAO_RHD_HOMEM_MAIS_60');
});

test('Plasma: regra ABO é inversa à matriz de hemácias e RhD não é critério', () => {
    assert.equal(avaliar('PLASMA', { abo: 'A', fator_rh: '-' }, { abo: 'AB', fator_rh: '+' }).permitido, true);
    assert.equal(avaliar('PLASMA', { abo: 'A', fator_rh: '-' }, { abo: 'B', fator_rh: '-' }).permitido, false);
    assert.equal(avaliar('PLASMA', { abo: 'O', fator_rh: '+' }, { abo: 'AB', fator_rh: '-' }).permitido, true);
});

test('Plaquetas: considera a compatibilidade do plasma da unidade com as hemácias do receptor', () => {
    assert.equal(avaliar('PLAQUETAS', { abo: 'A', fator_rh: '+' }, { abo: 'AB', fator_rh: '+' }).permitido, true);
    assert.equal(avaliar('PLAQUETAS', { abo: 'A', fator_rh: '+' }, { abo: 'O', fator_rh: '+' }).permitido, false);
});

test('Plaquetas RhD positivas para receptora RhD negativa abaixo de 50 exigem avaliação', () => {
    const resposta = avaliar(
        'PLAQUETAS',
        { abo: 'O', fator_rh: '-', sexo: 'F', idade: 30 },
        { abo: 'O', fator_rh: '+' }
    );
    assert.equal(resposta.permitido, false);
    assert.equal(resposta.status, 'AVALIACAO_RHD_PLAQUETAS');
});

test('Crioprecipitado adulto acima de 35 kg não exige compatibilidade ABO/Rh', () => {
    const resposta = avaliar(
        'CRIO',
        { abo: 'O', fator_rh: '-', sexo: 'M', idade: 61 },
        { abo: 'AB', fator_rh: '+' },
        75
    );
    assert.equal(resposta.permitido, true);
    assert.equal(resposta.tipoVerificacao, 'CONFERENCIA_COMPATIBILIDADE');
});

test('Crioprecipitado para receptor com até 35 kg exige ABO compatível', () => {
    assert.equal(
        avaliar('CRIO', { abo: 'A', fator_rh: '+', idade: 12 }, { abo: 'AB', fator_rh: '-' }, 30).permitido,
        true
    );
    assert.equal(
        avaliar('CRIO', { abo: 'A', fator_rh: '+', idade: 12 }, { abo: 'B', fator_rh: '+' }, 30).permitido,
        false
    );
});

test('Crioprecipitado para adulto sem peso informado fica bloqueado para avaliação', () => {
    const resposta = avaliar('CRIO', { abo: 'A', fator_rh: '+', idade: 40 }, { abo: 'A', fator_rh: '+' });
    assert.equal(resposta.permitido, false);
    assert.equal(resposta.status, 'PESO_NECESSARIO');
});
