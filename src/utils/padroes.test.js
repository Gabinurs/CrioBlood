const test = require('node:test');
const assert = require('node:assert/strict');

const { PADROES, textoLivreValido, normalizarEspacos, ehDataValida, paraViews } = require('./padroes');

const ok = (nome, valor) => assert.ok(PADROES[nome].regex.test(valor), `${nome} deveria aceitar "${valor}"`);
const nao = (nome, valor) => assert.ok(!PADROES[nome].regex.test(valor), `${nome} deveria recusar "${valor}"`);

test('nomePessoa: letras com acento, espaço, apóstrofo, ponto e hífen', () => {
    ok('nomePessoa', 'Maria Silva');
    ok('nomePessoa', 'José da Conceição');
    ok('nomePessoa', "D'Ávila Souza-Lima");
    ok('nomePessoa', 'Dr. João');
    ok('nomePessoa', 'Ana');
    nao('nomePessoa', 'Al');            // curto
    nao('nomePessoa', 'Maria123');      // número
    nao('nomePessoa', '1Maria');        // não começa por letra
    nao('nomePessoa', 'Maria <b>');     // símbolos
    nao('nomePessoa', 'A'.repeat(121)); // longo
});

test('prontuario: letras, números e . / -', () => {
    ok('prontuario', '123');
    ok('prontuario', '2024/00123');
    ok('prontuario', 'AB-12.3');
    nao('prontuario', '');
    nao('prontuario', '-123');
    nao('prontuario', 'AB 12');
    nao('prontuario', 'A'.repeat(31));
});

test('codigoBolsa: 3 a 30 letras/números/hífen', () => {
    ok('codigoBolsa', 'B001');
    ok('codigoBolsa', 'W0123-24-000456');
    nao('codigoBolsa', 'B1');
    nao('codigoBolsa', 'B 001');
    nao('codigoBolsa', 'B_001');
    nao('codigoBolsa', '-B001');
});

test('login: sem espaço, 3 a 30 caracteres', () => {
    ok('login', 'Supervisor');
    ok('login', 'maria.silva_01');
    nao('login', 'ab');
    nao('login', 'maria silva');
    nao('login', 'joão');
    nao('login', '.maria');
});

test('senha: 8 a 72 com letra e número', () => {
    ok('senha', 'abcdefg1');
    ok('senha', 'Senha forte 2026');
    nao('senha', 'abcdefgh');
    nao('senha', '12345678');
    nao('senha', 'abc12');
});

test('nomeEquipamento: letras, números, espaço e . / -', () => {
    ok('nomeEquipamento', 'Freezer Ultra-Baixa T-01');
    ok('nomeEquipamento', 'Geladeira 2');
    nao('nomeEquipamento', 'F');
    nao('nomeEquipamento', '-Freezer');
    nao('nomeEquipamento', 'Freezer @1');
});

test('temperatura: número com até 2 decimais e unidade opcional', () => {
    ok('temperatura', '-80');
    ok('temperatura', '-80 °C');
    ok('temperatura', '4,5');
    ok('temperatura', '22.25°C');
    nao('temperatura', 'abc');
    nao('temperatura', '1234');
    nao('temperatura', '4,567');
    nao('temperatura', '--5');
});

test('posicao: gaveta, caixa e posição', () => {
    ok('posicao', 'A1');
    ok('posicao', 'B12');
    ok('posicao', '3');
    ok('posicao', 'A-1');
    nao('posicao', 'A 1');
    nao('posicao', '-1');
    nao('posicao', 'ABCDEFGHIJK');
});

test('idNumerico e dataIso', () => {
    ok('idNumerico', '15');
    nao('idNumerico', '15abc');
    nao('idNumerico', '-1');
    ok('dataIso', '2026-11-19');
    nao('dataIso', '19/11/2026');
});

test('ehDataValida rejeita datas que não existem no calendário', () => {
    assert.equal(ehDataValida('2024-02-29'), true);    // ano bissexto
    assert.equal(ehDataValida('2023-02-29'), false);
    assert.equal(ehDataValida('2026-13-01'), false);
    assert.equal(ehDataValida('2026-04-31'), false);
    assert.equal(ehDataValida(''), false);
    assert.equal(ehDataValida(undefined), false);
});

test('textoLivreValido: limite de tamanho e sem caracteres de controle', () => {
    assert.equal(textoLivreValido(''), true);
    assert.equal(textoLivreValido('Paciente com febre.\nObservar.'), true);
    assert.equal(textoLivreValido('a'.repeat(500)), true);
    assert.equal(textoLivreValido('a'.repeat(501)), false);
    assert.equal(textoLivreValido('texto\u0000oculto'), false);
    assert.equal(textoLivreValido(123), false);
});

test('normalizarEspacos', () => {
    assert.equal(normalizarEspacos('  Maria   da  Silva '), 'Maria da Silva');
    assert.equal(normalizarEspacos(undefined), '');
    assert.equal(normalizarEspacos(null), '');
});

test('paraViews: fontes servem para o atributo HTML pattern (modos u e v)', () => {
    const views = paraViews();
    for (const [nome, p] of Object.entries(views)) {
        assert.doesNotThrow(() => new RegExp(`^(?:${p.fonte})$`, 'u'), `${nome} (modo u)`);
        // O modo "v" (usado por navegadores modernos no atributo pattern) é mais rígido
        assert.doesNotThrow(() => new RegExp(`^(?:${p.fonte})$`, 'v'), `${nome} (modo v)`);
        assert.ok(p.mensagem.length > 5, `${nome} precisa de mensagem`);
    }
});

test('CNS, CPF, RG e telefone: formatos aceitos e recusados', () => {
    ok('cns', '123456789012345');
    ok('cns', '123 4567 8901 2345');
    nao('cns', '12345678901234');
    ok('cpf', '12345678901');
    ok('cpf', '123.456.789-01');
    nao('cpf', '123.456.789-0');
    ok('rg', '12.345.678-X');
    ok('rg', 'MG 1234567');
    nao('rg', '@@@@');
    ok('telefone', '11987654321');
    ok('telefone', '(11) 98765-4321');
    ok('telefone', '(11) 3333-4444');
    nao('telefone', '119876543');
});
