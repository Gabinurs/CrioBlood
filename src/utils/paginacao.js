// Paginação simples das listagens (20 registros por página por padrão)
const POR_PAGINA = 20;

// Trecho SQL "LIMIT x OFFSET y" (valores sempre numéricos). Sem paginação, devolve texto vazio.
function sqlLimite(pag = {}) {
    if (pag.limite === undefined || pag.limite === null) return '';

    const limite = Math.max(1, Math.trunc(Number(pag.limite)) || POR_PAGINA);
    const deslocamento = Math.max(0, Math.trunc(Number(pag.deslocamento)) || 0);
    return `LIMIT ${limite} OFFSET ${deslocamento}`;
}

// Conta o total, descobre a página pedida (?pagina=N, limitada ao intervalo válido) e busca só essa página.
// "contar" devolve o total; "buscar({ limite, deslocamento })" devolve as linhas da página.
async function paginar(req, contar, buscar, porPagina = POR_PAGINA) {
    const total = Number(await contar()) || 0;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const pedida = parseInt(req.query && req.query.pagina, 10) || 1;
    const pagina = Math.min(Math.max(1, pedida), totalPaginas);
    const deslocamento = (pagina - 1) * porPagina;

    const linhas = await buscar({ limite: porPagina, deslocamento });

    return {
        linhas,
        paginacao: {
            pagina,
            total,
            totalPaginas,
            porPagina,
            de: total === 0 ? 0 : deslocamento + 1,
            ate: Math.min(total, deslocamento + porPagina)
        }
    };
}

module.exports = { POR_PAGINA, sqlLimite, paginar };
