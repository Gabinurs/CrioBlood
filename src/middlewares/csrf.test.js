const test = require('node:test');
const assert = require('node:assert/strict');

const { protegerCsrf, tokensIguais } = require('./csrf');

function simular({ metodo = 'POST', caminho = '/pacientes/novo', usuario = { id: 1 }, csrfSessao, corpo = {}, cabecalho } = {}) {
    const req = {
        method: metodo,
        path: caminho,
        session: { usuario, csrfToken: csrfSessao },
        body: corpo,
        get: (nome) => (nome.toLowerCase() === 'x-csrf-token' ? cabecalho : undefined)
    };
    const res = {
        locals: {},
        status(c) { this.codigo = c; return this; },
        render(v) { this.view = v; return this; }
    };
    let passou = false;
    return { req, res, next: () => { passou = true; }, passou: () => passou };
}

test('tokensIguais compara com segurança', () => {
    assert.equal(tokensIguais('abc', 'abc'), true);
    assert.equal(tokensIguais('abc', 'abd'), false);
    assert.equal(tokensIguais('abc', 'abcd'), false);
    assert.equal(tokensIguais(undefined, 'abc'), false);
});

test('POST logado sem token é barrado com 403', () => {
    const t = simular({ csrfSessao: 'segredo' });
    protegerCsrf(t.req, t.res, t.next);
    assert.equal(t.res.codigo, 403);
    assert.equal(t.passou(), false);
});

test('POST logado com token errado é barrado', () => {
    const t = simular({ csrfSessao: 'segredo', corpo: { _csrf: 'outro' } });
    protegerCsrf(t.req, t.res, t.next);
    assert.equal(t.res.codigo, 403);
});

test('POST logado com o token certo (corpo ou cabeçalho) passa', () => {
    const a = simular({ csrfSessao: 'segredo', corpo: { _csrf: 'segredo' } });
    protegerCsrf(a.req, a.res, a.next);
    assert.equal(a.passou(), true);

    const b = simular({ csrfSessao: 'segredo', cabecalho: 'segredo' });
    protegerCsrf(b.req, b.res, b.next);
    assert.equal(b.passou(), true);
});

test('GET passa e o token é gerado para os formulários', () => {
    const t = simular({ metodo: 'GET' });
    protegerCsrf(t.req, t.res, t.next);
    assert.equal(t.passou(), true);
    assert.match(t.res.locals.csrfToken, /^[0-9a-f]{64}$/);
    assert.equal(t.req.session.csrfToken, t.res.locals.csrfToken);
});

test('login exige token mesmo sem usuário logado', () => {
    const sem = simular({ caminho: '/login', usuario: null, csrfSessao: 'segredo' });
    protegerCsrf(sem.req, sem.res, sem.next);
    assert.equal(sem.res.codigo, 403);

    const com = simular({ caminho: '/login', usuario: null, csrfSessao: 'segredo', corpo: { _csrf: 'segredo' } });
    protegerCsrf(com.req, com.res, com.next);
    assert.equal(com.passou(), true);
});

test('visitante anônimo fora do login não ganha sessão e segue para a checagem de login', () => {
    const t = simular({ usuario: null });
    protegerCsrf(t.req, t.res, t.next);
    assert.equal(t.passou(), true);
    assert.equal(t.req.session.csrfToken, undefined);
});
