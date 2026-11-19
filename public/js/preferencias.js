// Aplica o tema (claro/escuro) e o modo do menu ANTES da primeira pintura da página,
// para não "piscar". Fica em arquivo externo porque o CSP do helmet bloqueia scripts inline.
(function () {
    var raiz = document.documentElement;
    var tema = 'light';
    var menu = 'auto';

    try {
        tema = localStorage.getItem('crioblood.tema') === 'dark' ? 'dark' : 'light';
        menu = localStorage.getItem('crioblood.menu') === 'fixo' ? 'fixo' : 'auto';
    } catch (erro) { /* armazenamento indisponível: usa os padrões */ }

    raiz.setAttribute('data-tema', tema);
    raiz.setAttribute('data-menu', menu);
})();
