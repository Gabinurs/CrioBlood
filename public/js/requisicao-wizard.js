(function () {
    'use strict';
    var root = document.querySelector('[data-requisicao-wizard]');
    if (!root) return;

    var form = root.querySelector('[data-form-requisicao]');
    var pacienteSelect = root.querySelector('[data-paciente-select]');
    var seletorPaciente = root.querySelector('[data-seletor-paciente]');
    var cartao = root.querySelector('[data-cartao-receptor]');
    var cartaoAmostra = root.querySelector('[data-cartao-amostra]');
    var lista = root.querySelector('[data-lista-itens]');
    var vazio = root.querySelector('[data-vazio-itens]');
    var itensInput = root.querySelector('[data-itens-json]');
    var tipoSelect = root.querySelector('[data-tipo-item]');
    var quantidadeInput = root.querySelector('[data-quantidade-item]');
    var avancar = root.querySelector('[data-avancar-etapa]');
    var proximaAba = root.querySelector('[data-etapa-aba="2"]');
    var etapa1 = root.querySelector('[data-etapa-painel="1"]');
    var etapa2 = root.querySelector('[data-etapa-painel="2"]');
    var botaoVoltar = root.querySelector('[data-voltar-etapa]');
    var itens = [];
    var contexto = null;
    var requisicaoBusca = null;
    var tipos = {
        CH: 'Concentrado de hemácias',
        PLASMA: 'Plasma',
        PLAQUETAS: 'Plaquetas',
        CRIO: 'Crioprecipitado'
    };

    try {
        var iniciais = JSON.parse(itensInput.value || '[]');
        if (Array.isArray(iniciais)) {
            itens = iniciais.filter(function (i) {
                return tipos[i.tipo] && Number.isInteger(Number(i.quantidade)) &&
                    Number(i.quantidade) > 0 && Number(i.quantidade) <= 10;
            }).map(function (i) { return { tipo: i.tipo, quantidade: Number(i.quantidade) }; });
        }
    } catch (erro) { itens = []; }

    function definirTexto(seletor, valor) {
        var el = root.querySelector(seletor);
        if (el) el.textContent = valor || '—';
    }

    function renderizarContexto(dados) {
        contexto = dados;
        cartao.hidden = false;
        cartaoAmostra.hidden = false;
        definirTexto('[data-receptor-nome]', dados.nome);
        definirTexto('[data-receptor-nascimento]', dados.nascimento_br);
        definirTexto('[data-receptor-mae]', dados.nome_mae || 'Não informado');
        definirTexto('[data-receptor-prontuario]', dados.prontuario || '—');
        var aboAmostra = dados.amostra_abo || dados.abo;
        var rhAmostra = dados.amostra_rh || dados.fator_rh;
        definirTexto('[data-receptor-tipagem]', aboAmostra && rhAmostra ? aboAmostra + rhAmostra : 'ABO/Rh pendente');

        var temAmostra = Boolean(dados.amostra_id);
        definirTexto('[data-amostra-titulo]', temAmostra ? 'Amostra mais recente' : 'Amostra não localizada');
        definirTexto('[data-amostra-resumo]', temAmostra
            ? 'Coleta: ' + (dados.coleta_br || '—') + ' · Válida até: ' + (dados.validade_br || '—')
            : 'Registre uma coleta e conclua o Imuno antes de solicitar.');
        var mensagem = dados.liberacao ? dados.liberacao.motivo : 'Não foi possível confirmar a liberação da amostra.';
        definirTexto('[data-amostra-mensagem]', mensagem || 'Amostra dentro da validade e liberada para solicitação.');
        var badge = root.querySelector('[data-amostra-badge]');
        badge.textContent = dados.liberacao && dados.liberacao.permitido ? 'Liberada' : 'Bloqueada';
        badge.classList.toggle('s-verde', Boolean(dados.liberacao && dados.liberacao.permitido));
        badge.classList.toggle('s-vermelho', !(dados.liberacao && dados.liberacao.permitido));
        var link = root.querySelector('[data-link-nova-amostra]');
        link.href = '/pacientes/' + encodeURIComponent(dados.id) + '/amostras/nova';
        atualizarProgresso();
    }

    async function carregarContexto(id) {
        contexto = null;
        cartao.hidden = true;
        cartaoAmostra.hidden = true;
        if (!id) { atualizarProgresso(); return; }
        if (requisicaoBusca) requisicaoBusca.abort();
        requisicaoBusca = new AbortController();
        try {
            var resposta = await fetch('/solicitacoes/pacientes/' + encodeURIComponent(id) + '/contexto', {
                headers: { 'Accept': 'application/json' },
                signal: requisicaoBusca.signal
            });
            var dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível localizar o receptor.');
            renderizarContexto(dados);
        } catch (erro) {
            if (erro.name !== 'AbortError') {
                definirTexto('[data-amostra-titulo]', 'Não foi possível carregar a amostra');
                definirTexto('[data-amostra-mensagem]', erro.message);
                cartao.hidden = false;
                cartaoAmostra.hidden = false;
                atualizarProgresso();
            }
        }
    }

    function atualizarItensJson() {
        itensInput.value = JSON.stringify(itens);
    }

    function renderizarItens() {
        lista.replaceChildren();
        vazio.hidden = itens.length > 0;
        itens.forEach(function (item, indice) {
            var linha = document.createElement('div');
            linha.className = 'item-requisicao-inserido';

            var identificacao = document.createElement('div');
            identificacao.className = 'item-requisicao-identificacao';
            var nome = document.createElement('strong');
            nome.textContent = tipos[item.tipo];
            var codigo = document.createElement('small');
            codigo.textContent = item.tipo + ' · ' + item.quantidade + (item.quantidade === 1 ? ' unidade' : ' unidades');
            identificacao.append(nome, codigo);

            var remover = document.createElement('button');
            remover.type = 'button';
            remover.className = 'botao-remover-item';
            remover.textContent = 'Remover';
            remover.setAttribute('aria-label', 'Remover ' + tipos[item.tipo]);
            remover.addEventListener('click', function () {
                itens.splice(indice, 1);
                atualizarItensJson();
                renderizarItens();
                atualizarProgresso();
            });
            linha.append(identificacao, remover);
            lista.appendChild(linha);
        });
        atualizarItensJson();
        atualizarProgresso();
    }

    function etapaUmValida() {
        if (!pacienteSelect.checkValidity()) {
            pacienteSelect.reportValidity();
            return false;
        }
        var campos = etapa1.querySelectorAll('[required]');
        for (var i = 0; i < campos.length; i++) {
            if (!campos[i].checkValidity()) {
                campos[i].reportValidity();
                return false;
            }
        }
        if (!itens.length) {
            window.alert('Clique em Inserir para adicionar pelo menos um hemocomponente.');
            return false;
        }
        if (!contexto || !contexto.liberacao || !contexto.liberacao.permitido) {
            window.alert('A amostra deste receptor ainda não está liberada. Confira o alerta da amostra antes de continuar.');
            return false;
        }
        return true;
    }

    function atualizarProgresso() {
        var liberado = Boolean(contexto && contexto.liberacao && contexto.liberacao.permitido);
        var habilitado = Boolean(pacienteSelect.value && liberado && itens.length);
        avancar.disabled = !habilitado;
        proximaAba.disabled = !habilitado;
    }

    function mostrarEtapa(numero) {
        root.setAttribute('data-etapa-atual', String(numero));
        if (seletorPaciente) seletorPaciente.hidden = numero !== 1;
        pacienteSelect.required = numero === 1;
        etapa1.hidden = numero !== 1;
        etapa2.hidden = numero !== 2;
        root.querySelectorAll('[data-etapa-aba]').forEach(function (aba) {
            var ativa = Number(aba.getAttribute('data-etapa-aba')) === numero;
            aba.classList.toggle('ativa', ativa);
            if (ativa) aba.setAttribute('aria-current', 'step');
            else aba.removeAttribute('aria-current');
        });
        if (numero === 2) etapa2.querySelector('input,select,textarea')?.focus();
        else pacienteSelect.focus();
    }

    pacienteSelect.addEventListener('change', function () {
        carregarContexto(pacienteSelect.value);
    });

    root.querySelector('[data-inserir-item]').addEventListener('click', function () {
        var tipo = tipoSelect.value;
        var quantidade = Number(quantidadeInput.value);
        if (!tipos[tipo]) { tipoSelect.focus(); tipoSelect.reportValidity(); return; }
        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
            quantidadeInput.focus();
            quantidadeInput.reportValidity();
            return;
        }
        var existente = itens.find(function (i) { return i.tipo === tipo; });
        if (existente) {
            if (existente.quantidade + quantidade > 10) {
                window.alert('O limite é de 10 unidades por hemocomponente.');
                return;
            }
            existente.quantidade += quantidade;
        } else {
            itens.push({ tipo: tipo, quantidade: quantidade });
        }
        tipoSelect.value = '';
        quantidadeInput.value = '1';
        renderizarItens();
        // No padrão do RealBlood, inserir o componente avança para os dados complementares.
        mostrarEtapa(2);
    });

    avancar.addEventListener('click', function () {
        if (etapaUmValida()) mostrarEtapa(2);
    });
    proximaAba.addEventListener('click', function () {
        if (etapaUmValida()) mostrarEtapa(2);
    });
    root.querySelector('[data-etapa-aba="1"]').addEventListener('click', function () { mostrarEtapa(1); });
    root.querySelector('[data-etapa-aba="2"]').addEventListener('click', function () {
        if (etapaUmValida()) mostrarEtapa(2);
    });
    botaoVoltar.addEventListener('click', function () { mostrarEtapa(1); });

    form.addEventListener('submit', function (evento) {
        atualizarItensJson();
        if (!etapaUmValida()) {
            evento.preventDefault();
            mostrarEtapa(1);
            return;
        }
        if (root.getAttribute('data-etapa-atual') !== '2') {
            evento.preventDefault();
            mostrarEtapa(2);
            return;
        }
    });

    renderizarItens();
    mostrarEtapa(root.getAttribute('data-etapa-inicial') === '2' ? 2 : 1);
    if (pacienteSelect.value) carregarContexto(pacienteSelect.value);
})();