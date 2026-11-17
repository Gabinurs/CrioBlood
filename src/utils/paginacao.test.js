const test = require('node:test');
const assert = require('node:assert/strict');

const { paginar, sqlLimite } = require('./paginacao');

const req = (pagina) => ({ query: pagina === undefined ? {} : { pagina } });

test('sqlLimite monta LIMIT/OFFSET e só aceita números', () => {
    assert.equal(sqlLimite({ limite: 20, deslocamento: 40 }), 'LIMIT 20 OFFSET 40');
    assert.equal(sqlLimite({}), '');
    assert.equal(sqlLimite(), '');
    assert.equal(sqlLimite({ limite: '20; DROP TABLE x', deslocamento: 'abc' }), 'LIMIT 20 OFFSET 0');
    assert.equal(sqlLimite({ limite: 10, deslocamento: -5 }), 'LIMIT 10 OFFSET 0');
});

test('paginar: primeira página, total e intervalo exibido', async () => {
    let pedido;
    const r = await paginar(req(), async () => 45, async (p) => { pedido = p; return ['x']; }, 20);
    assert.deepEqual(pedido, { limite: 20, deslocamento: 0 });
    assert.equal(r.paginacao.totalPaginas, 3);
    assert.equal(r.paginacao.de, 1);
    assert.equal(r.paginacao.ate, 20);
    assert.equal(r.paginacao.total, 45);
});

test('paginar: última página parcial', async () => {
    let pedido;
    const r = await paginar(req('3'), async () => 45, async (p) => { pedido = p; return []; }, 20);
    assert.deepEqual(pedido, { limite: 20, deslocamento: 40 });
    assert.equal(r.paginacao.de, 41);
    assert.equal(r.paginacao.ate, 45);
});

test('paginar: página inválida ou fora do intervalo é corrigida', async () => {
    assert.equal((await paginar(req('999'), async () => 45, async () => [], 20)).paginacao.pagina, 3);
    assert.equal((await paginar(req('0'), async () => 45, async () => [], 20)).paginacao.pagina, 1);
    assert.equal((await paginar(req('-4'), async () => 45, async () => [], 20)).paginacao.pagina, 1);
    assert.equal((await paginar(req('abc'), async () => 45, async () => [], 20)).paginacao.pagina, 1);
});

test('paginar: lista vazia', async () => {
    const r = await paginar(req(), async () => 0, async () => [], 20);
    assert.equal(r.paginacao.totalPaginas, 1);
    assert.equal(r.paginacao.de, 0);
    assert.equal(r.paginacao.ate, 0);
});
