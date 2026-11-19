const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ErroNegocio, ErroValidacao, ErroConflito, ErroNaoEncontrado, enviarErro, tratar, tituloDoStatus
} = require('./erros');
const STATUS = require('./status');

function simular({ logado = true, aceita = 'html' } = {}) {
    const req = {
        session: logado ? { usuario: { id: 1 } } : {},
        accepts: () => aceita
    };
    const res = {
        codigo: null, view: null, dados: null, redirecionado: null,
        status(c) { this.codigo = c; return this; },
        render(v, d) { this.view = v; this.dados = d; return this; },
        json(o) { this.jsonCorpo = o; return this; },
        redirect(c, r) { this.redirecionado = [c, r]; return this; }
    };
    return { req, res };
}

test('cada classe de erro carrega o status HTTP certo', () => {
    assert.equal(new ErroNegocio('x').statusCode, 422);
    assert.equal(new ErroValidacao('x').statusCode, 422);
    assert.equal(new ErroConflito('x').statusCode, 409);
    assert.equal(new ErroNaoEncontrado('x').statusCode, 404);
    assert.ok(new ErroConflito('x') instanceof ErroNegocio);
    assert.ok(new ErroNaoEncontrado('x') instanceof Error);
});

test('os códigos de status têm os valores corretos', () => {
    assert.deepEqual(
        [STATUS.OK, STATUS.REDIRECIONAR, STATUS.VER_OUTRO, STATUS.REQUISICAO_INVALIDA, STATUS.NAO_AUTENTICADO,
         STATUS.PROIBIDO, STATUS.NAO_ENCONTRADO, STATUS.CONFLITO, STATUS.ENTIDADE_INVALIDA,
         STATUS.MUITAS_REQUISICOES, STATUS.ERRO_INTERNO, STATUS.INDISPONIVEL],
        [200, 302, 303, 400, 401, 403, 404, 409, 422, 429, 500, 503]);
});

test('enviarErro: usuário logado recebe a página de erro com o layout do sistema', () => {
    const { req, res } = simular();
    enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Não achei.');
    assert.equal(res.codigo, 404);
    assert.equal(res.view, 'erro/erro');
    assert.equal(res.dados.codigo, 404);
    assert.equal(res.dados.mensagem, 'Não achei.');
});

test('enviarErro: visitante sem login recebe a página simples', () => {
    const { req, res } = simular({ logado: false });
    enviarErro(req, res, STATUS.PROIBIDO, 'Sem acesso.');
    assert.equal(res.codigo, 403);
    assert.equal(res.view, 'erro/erro-simples');
});

test('enviarErro: quem pede JSON recebe JSON com o status', () => {
    const { req, res } = simular({ aceita: 'json' });
    enviarErro(req, res, STATUS.ENTIDADE_INVALIDA, 'Dados ruins.', ['campo A', 'campo B']);
    assert.equal(res.codigo, 422);
    assert.deepEqual(res.jsonCorpo, {
        status: 422, erro: 'Dados inválidos', mensagem: 'Dados ruins.', detalhes: ['campo A', 'campo B']
    });
    assert.equal(res.view, null);
});

test('tratar: erro de negócio vira aviso + redirecionamento 303', () => {
    const { req, res } = simular();
    tratar(req, res, new ErroConflito('Lote já fechado.'), '/lotes', 'Falhou');
    assert.deepEqual(res.redirecionado, [303, '/lotes']);
    assert.equal(req.session.flash.tipo, 'aviso');
    assert.equal(req.session.flash.texto, 'Lote já fechado.');
});

test('tratar: erro inesperado mostra mensagem genérica (sem vazar detalhes)', () => {
    const { req, res } = simular();
    const original = console.error; console.error = () => {};
    try { tratar(req, res, new Error('senha do banco: 1234'), '/lotes', 'Erro ao fechar lote'); }
    finally { console.error = original; }
    assert.equal(req.session.flash.texto, 'Erro ao fechar lote');
    assert.equal(req.session.flash.tipo, 'erro');
});

test('tituloDoStatus', () => {
    assert.equal(tituloDoStatus(409), 'Conflito');
    assert.equal(tituloDoStatus(418), 'Erro');
    assert.equal(tituloDoStatus(502), 'Erro no servidor');
});
