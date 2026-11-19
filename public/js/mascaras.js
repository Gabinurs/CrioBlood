// Máscaras e validação em tempo real dos campos.
// Uso no HTML:  <input data-mascara="prontuario" pattern="..." title="mensagem">
// IMPORTANTE: isto só ajuda quem digita. A validação de verdade é sempre refeita no servidor
// (src/utils/padroes.js), com as mesmas expressões regulares.
(function (raiz) {
    'use strict';

    // Cada máscara recebe o texto digitado e devolve o texto já "limpo".
    var MASCARAS = {
        // Nome de pessoa: letras, espaço, ' . - ; sem espaços repetidos; começa por letra
        'nome': function (v) {
            return v.replace(/[^\p{L}'’. \-]/gu, '').replace(/ {2,}/g, ' ').replace(/^[^\p{L}]+/u, '').slice(0, 120);
        },
        // Nome de equipamento: letras, números, espaço e . / -
        'nome-equipamento': function (v) {
            return v.replace(/[^\p{L}\p{N} .\/\-]/gu, '').replace(/ {2,}/g, ' ').replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 100);
        },
        // Prontuário: maiúsculas, números e . / -
        'prontuario': function (v) {
            return v.toUpperCase().replace(/[^A-Z0-9.\/\-]/g, '').replace(/^[^A-Z0-9]+/, '').slice(0, 30);
        },
        // Código da bolsa: maiúsculas, números e hífen
        'codigo-bolsa': function (v) {
            return v.toUpperCase().replace(/[^A-Z0-9\-]/g, '').replace(/^-+/, '').slice(0, 30);
        },
        // Gaveta, caixa e posição: A1, B12, 3...
        'posicao': function (v) {
            return v.toUpperCase().replace(/[^A-Z0-9\-]/g, '').replace(/^-+/, '').slice(0, 10);
        },
        // Login: sem espaços nem acentos
        'login': function (v) {
            return v.replace(/[^A-Za-z0-9._\-]/g, '').replace(/^[^A-Za-z0-9]+/, '').slice(0, 30);
        },
        // Temperatura: sinal opcional, até 3 dígitos e até 2 casas decimais
        'temperatura': function (v) {
            var sinal = v.charAt(0) === '-' ? '-' : '';
            var resto = v.replace(/[^0-9.,]/g, '');
            var separador = (resto.match(/[.,]/) || [''])[0];
            var partes = resto.split(/[.,]/);
            var inteiro = (partes[0] || '').slice(0, 3);
            var decimais = partes.length > 1 ? partes.slice(1).join('').slice(0, 2) : '';
            return sinal + inteiro + (separador ? separador + decimais : '');
        }
    };

    // Acabamento ao sair do campo (ex.: -80 vira "-80 °C")
    var AO_SAIR = {
        'temperatura': function (v) {
            return /^-?\d{1,3}(?:[.,]\d{1,2})?$/.test(v) ? v + ' °C' : v;
        }
    };

    raiz.MASCARAS_CRIOBLOOD = { MASCARAS: MASCARAS, AO_SAIR: AO_SAIR };
    if (typeof module !== 'undefined' && module.exports) module.exports = raiz.MASCARAS_CRIOBLOOD;
    if (typeof document === 'undefined') return;

    function aplicarMascara(campo, funcao) {
        var antes = campo.value;
        var depois = funcao(antes);
        if (antes === depois) return;

        var posicao = campo.selectionStart;
        campo.value = depois;
        if (typeof posicao === 'number') {
            var nova = Math.max(0, posicao - (antes.length - depois.length));
            try { campo.setSelectionRange(nova, nova); } catch (erro) { /* tipo de campo sem seleção */ }
        }
    }

    function dicaDoCampo(campo) {
        var dica = campo.parentNode.querySelector('.erro-campo[data-de="' + (campo.id || campo.name) + '"]');
        if (!dica) {
            dica = document.createElement('small');
            dica.className = 'erro-campo';
            dica.setAttribute('role', 'alert');
            dica.setAttribute('data-de', campo.id || campo.name);
            campo.insertAdjacentElement('afterend', dica);
        }
        return dica;
    }

    // Mostra (ou some com) a mensagem de erro logo abaixo do campo
    function mostrarValidade(campo) {
        var dica = campo.parentNode.querySelector('.erro-campo[data-de="' + (campo.id || campo.name) + '"]');
        if (campo.value === '' || campo.checkValidity()) {
            campo.classList.remove('invalido');
            if (dica) dica.remove();
            return;
        }
        campo.classList.add('invalido');
        dicaDoCampo(campo).textContent = campo.getAttribute('title') || 'Valor inválido.';
    }

    document.querySelectorAll('[data-mascara]').forEach(function (campo) {
        var funcao = MASCARAS[campo.getAttribute('data-mascara')];
        if (!funcao) return;

        campo.addEventListener('input', function (evento) {
            if (evento.isComposing) return;
            aplicarMascara(campo, funcao);
            if (campo.classList.contains('invalido')) mostrarValidade(campo);
        });

        var acabamento = AO_SAIR[campo.getAttribute('data-mascara')];
        campo.addEventListener('blur', function () {
            if (acabamento) campo.value = acabamento(campo.value);
            mostrarValidade(campo);
        });
    });

    // Campos com regex (pattern) sem máscara, como a senha, também mostram o erro ao sair
    document.querySelectorAll('input[pattern]:not([data-mascara])').forEach(function (campo) {
        campo.addEventListener('blur', function () { mostrarValidade(campo); });
        campo.addEventListener('input', function () { if (campo.classList.contains('invalido')) mostrarValidade(campo); });
    });

    // Contador de caracteres para áreas de texto: <textarea data-contador="500">
    document.querySelectorAll('textarea[data-contador]').forEach(function (area) {
        var limite = parseInt(area.getAttribute('data-contador'), 10) || 500;
        var contador = document.createElement('span');
        contador.className = 'contador-texto';
        area.insertAdjacentElement('afterend', contador);

        function atualizar() {
            var usados = area.value.length;
            contador.textContent = usados + ' / ' + limite;
            contador.classList.toggle('no-limite', usados >= limite);
        }
        area.setAttribute('maxlength', String(limite));
        area.addEventListener('input', atualizar);
        atualizar();
    });
})(typeof window !== 'undefined' ? window : globalThis);
