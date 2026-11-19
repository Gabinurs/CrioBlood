const test = require('node:test');
const assert = require('node:assert/strict');

const { rotaNaoEncontrada, tratarErros } = require('./erros');
const { ErroConflito } = require('../utils/erros');

function simular() {
    const req = { session: { usuario: { id: 1 } }, accepts: () => 'html' };
    const res = {
        headersSent: false,
        status(c) { this.codigo = c; return this; },
        render(v, d) { this.view = v; this.dados = d; return this; }
    };
    return { req, res };
}

test('rota inexistente responde 404 com página de erro', () => {
    const { req, res } = simular();
    rotaNaoEncontrada(req, res);
    assert.equal(res.codigo, 404);
    assert.equal(res.view, 'erro/erro');
});

test('erro inesperado vira 500 e NÃO vaza a mensagem interna', () => {
    const { req, res } = simular();
    const original = console.error; console.error = () => {};
    try { tratarErros(new Error('connection to server at 10.0.0.5 failed'), req, res, () => {}); }
    finally { console.error = original; }
    assert.equal(res.codigo, 500);
    assert.ok(!res.dados.mensagem.includes('10.0.0.5'));
});

test('erro de negócio chegando ao tratador mantém o seu status e mensagem', () => {
    const { req, res } = simular();
    tratarErros(new ErroConflito('Posição ocupada.'), req, res, () => {});
    assert.equal(res.codigo, 409);
    assert.equal(res.dados.mensagem, 'Posição ocupada.');
});

test('erro 4xx do Express (ex.: corpo malformado) mantém o status e usa mensagem genérica', () => {
    const { req, res } = simular();
    const erro = Object.assign(new Error('Unexpected token < in JSON'), { status: 400 });
    tratarErros(erro, req, res, () => {});
    assert.equal(res.codigo, 400);
    assert.ok(!res.dados.mensagem.includes('JSON'));
});

test('com a resposta já enviada, repassa o erro adiante', () => {
    const { req, res } = simular();
    res.headersSent = true;
    let repassou = null;
    tratarErros(new Error('x'), req, res, (e) => { repassou = e; });
    assert.ok(repassou);
});
