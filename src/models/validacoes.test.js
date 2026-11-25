const test = require('node:test');
const assert = require('node:assert/strict');

const PacienteModel = require('./pacienteModel');
const EquipamentoModel = require('./equipamentoModel');
const { ErroValidacao } = require('../utils/erros');

const pacienteOk = {
    nome: 'Maria da Silva',
    nome_mae: 'Ana Maria da Silva',
    prontuario: '2024/123',
    data_nascimento: '1980-05-05',
    abo: 'A',
    fator_rh: '+'
};

test('paciente válido é normalizado (espaços e prontuário em maiúsculas)', () => {
    const r = PacienteModel.validar({ ...pacienteOk, nome: '  Maria   da  Silva ', prontuario: ' ab-12 ' });
    assert.equal(r.nome, 'Maria da Silva');
    assert.equal(r.prontuario, 'AB-12');
});

test('paciente: nome fora do padrão é recusado com ErroValidacao (422)', () => {
    for (const nome of ['', 'Al', 'Maria 123', '<script>', '123']) {
        assert.throws(() => PacienteModel.validar({ ...pacienteOk, nome }), (e) => e instanceof ErroValidacao && e.statusCode === 422, nome);
    }
});

test('paciente: prontuário vazio é opcional e formatos inválidos são recusados', () => {
    assert.equal(PacienteModel.validar({ ...pacienteOk, prontuario: '' }).prontuario, null);
    for (const prontuario of ['AB 12', '-1', 'x'.repeat(31), 'a;b']) {
        assert.throws(() => PacienteModel.validar({ ...pacienteOk, prontuario }), ErroValidacao, prontuario);
    }
});

test('paciente: data inexistente, futura ou antiga demais é recusada', () => {
    for (const data_nascimento of ['2023-02-30', '2999-01-01', '1800-01-01', '05/05/1980', '']) {
        assert.throws(() => PacienteModel.validar({ ...pacienteOk, data_nascimento }), ErroValidacao, data_nascimento);
    }
});

test('paciente: ABO e Rh andam juntos', () => {
    assert.throws(() => PacienteModel.validar({ ...pacienteOk, fator_rh: '' }), ErroValidacao);
    assert.throws(() => PacienteModel.validar({ ...pacienteOk, abo: 'X' }), ErroValidacao);
    assert.doesNotThrow(() => PacienteModel.validar({ ...pacienteOk, abo: '', fator_rh: '' }));
});

test('paciente: observações longas ou com caractere de controle são recusadas', () => {
    assert.throws(() => PacienteModel.validar({ ...pacienteOk, observacoes: 'a'.repeat(501) }), ErroValidacao);
    assert.throws(() => PacienteModel.validar({ ...pacienteOk, observacoes: 'oi\u0000' }), ErroValidacao);
});

test('equipamento: nome e tipo válidos', () => {
    const r = EquipamentoModel.validar({ nome: ' Freezer   Ultra-Baixa T-01 ', tipo: 'Freezer', temperatura_operacional: '' });
    assert.equal(r.nome, 'Freezer Ultra-Baixa T-01');
    assert.equal(r.temperatura, null);
});

test('equipamento: temperatura é padronizada para "<número> °C"', () => {
    const t = (valor) => EquipamentoModel.validar({ nome: 'Freezer 1', tipo: 'Freezer', temperatura_operacional: valor }).temperatura;
    assert.equal(t('-80'), '-80 °C');
    assert.equal(t('-80 °C'), '-80 °C');
    assert.equal(t('4,5'), '4,5 °C');
});

test('equipamento: dados inválidos viram ErroValidacao', () => {
    const v = (dados) => () => EquipamentoModel.validar({ nome: 'Freezer 1', tipo: 'Freezer', temperatura_operacional: '', ...dados });
    assert.throws(v({ nome: 'F' }), ErroValidacao);
    assert.throws(v({ nome: '@@@' }), ErroValidacao);
    assert.throws(v({ tipo: 'Micro-ondas' }), ErroValidacao);
    assert.throws(v({ temperatura_operacional: 'quente' }), ErroValidacao);
    assert.throws(v({ temperatura_operacional: '12345' }), ErroValidacao);
});
