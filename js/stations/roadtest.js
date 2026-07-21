// Destinos de reparo oferecidos no botão-engrenagem do Road Test.
const ROADTEST_REPARO_DESTINOS = [
  { id: 'pista', label: '🔥 Reparo Pista', cor: '#ff3d1a' },
  { id: 'eletrico', label: '⚡ Reparo Elétrico', cor: '#a855f7' },
];

// Botão de ação por veículo: pill verde "Aprovar" (ação direta) + dropdown "Reparo" que
// abre um menu flutuante (não altera o layout da linha) com os destinos possíveis.
function montarAcaoRoadTest(v) {
  const aprovarBtn = el('button', {
    class: 'rt-approve-btn',
    onclick: () => {
      enviarParaInspecaoShower(v.vin, { usuario: getSessao()?.usuario, acao: 'road-test' });
      toast(`${v.vin} enviado para Inspeção de Shower.`, 'success');
    },
  }, 'Aprovar');

  const wrap = el('div', { class: 'rt-reparo-wrap' });
  const trigger = el('button', {
    class: 'rt-reparo-btn',
    onclick: (e) => {
      e.stopPropagation();
      const abrir = !wrap.classList.contains('open');
      document.querySelectorAll('.rt-reparo-wrap.open').forEach(w => w.classList.remove('open'));
      if (abrir) wrap.classList.add('open');
    },
  }, [el('span', { class: 'rt-reparo-icon' }, '⚙'), 'Reparo']);
  const menu = el('div', { class: 'rt-reparo-menu' }, ROADTEST_REPARO_DESTINOS.map(d => el('button', {
    class: 'rt-reparo-item',
    onclick: () => {
      moveVeiculo(v.vin, d.id, { usuario: getSessao()?.usuario, acao: 'road-test' });
      toast(`${v.vin} enviado para ${STATIONS_BY_ID[d.id].nome}.`, 'success');
      wrap.classList.remove('open');
    },
  }, [el('span', { class: 'dot', style: `background:${d.cor}` }), d.label])));

  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  return el('div', { style: 'display:flex;align-items:center;gap:10px' }, [aprovarBtn, wrap]);
}

// Único listener global (fecha qualquer dropdown "Reparo" aberto ao clicar fora dele).
function fecharDropdownsReparoRoadTest(e) {
  if (e.target.closest('.rt-reparo-wrap')) return;
  document.querySelectorAll('.rt-reparo-wrap.open').forEach(w => w.classList.remove('open'));
}

function mountRoadTest(container) {
  container.innerHTML = '';
  container.classList.add('alin-app');
  let unsubDb = null;
  const clockEl = montarRelogio();
  const buscaInput = el('input', { class: 'input-dark', style: 'max-width:260px;margin-bottom:0', placeholder: 'Buscar VIN…' });
  const tabelaWrap = el('div', { class: 'table-wrapper' });

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', {}, 'Road Test')]),
  ]));
  container.appendChild(montarTabBarVoltar());
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'table-section', style: 'max-width:1000px' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px' }, [
        el('h3', { style: 'margin-bottom:0' }, 'Teste de pista pós-alinhamento'),
        buscaInput,
      ]),
      tabelaWrap,
    ]),
  ]));

  function render() {
    const filtro = buscaInput.value.trim().toUpperCase();
    const lista = getVeiculosByStation('alinhamento').filter(v => !filtro || v.vin.includes(filtro));
    tabelaWrap.innerHTML = '';
    if (!lista.length) {
      tabelaWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo aguardando road test.'));
      return;
    }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Origem'), el('th', {}, 'Destino'),
      ])]),
    ]);
    const tbody = el('tbody');
    lista.forEach(v => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, v.vin),
        el('td', {}, v.modelo),
        el('td', {}, v.alinhamentoId),
        el('td', {}, montarAcaoRoadTest(v)),
      ]));
    });
    table.appendChild(tbody);
    tabelaWrap.appendChild(table);
  }

  buscaInput.addEventListener('input', render);
  document.addEventListener('click', fecharDropdownsReparoRoadTest);
  render();
  unsubDb = onDbChange(render);

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
    document.removeEventListener('click', fecharDropdownsReparoRoadTest);
  };
}
