// Destinos de reparo oferecidos no botão-engrenagem do Road Test.
const ROADTEST_REPARO_DESTINOS = [
  { id: 'pista', label: '🔥 Reparo Pista', cor: '#ff3d1a' },
  { id: 'eletrico', label: '⚡ Reparo Elétrico', cor: '#a855f7' },
];

// Botão de ação por veículo: pill verde "Aprovar" (ação direta) + botão-engrenagem que
// expande (largura via mola CSS) revelando os reparos possíveis para enviar o veículo.
function montarAcaoRoadTest(v) {
  const aprovarBtn = el('button', {
    class: 'rt-approve-btn',
    onclick: () => {
      enviarParaInspecaoShower(v.vin, { usuario: getSessao()?.usuario, acao: 'road-test' });
      toast(`${v.vin} enviado para Inspeção de Shower.`, 'success');
    },
  }, 'Aprovar');

  const gearBtn = el('button', { class: 'rt-repair-toggle gear', title: 'Enviar para reparo' }, '⚙');
  const closeBtn = el('button', { class: 'rt-repair-toggle close', title: 'Fechar' }, '✕');
  const options = el('div', { class: 'rt-repair-options' }, ROADTEST_REPARO_DESTINOS.map(d => el('button', {
    class: 'rt-repair-option', style: `background:${d.cor}`,
    onclick: () => {
      moveVeiculo(v.vin, d.id, { usuario: getSessao()?.usuario, acao: 'road-test' });
      toast(`${v.vin} enviado para ${STATIONS_BY_ID[d.id].nome}.`, 'success');
      collapse();
    },
  }, d.label)));

  const widget = el('div', { class: 'rt-repair-widget' }, [gearBtn, closeBtn, options]);
  widget.style.width = '52px';

  function expand() {
    widget.classList.add('expanded');
    widget.style.width = `${52 + options.scrollWidth}px`;
  }
  function collapse() {
    widget.classList.remove('expanded');
    widget.style.width = '52px';
  }
  gearBtn.addEventListener('click', expand);
  closeBtn.addEventListener('click', collapse);

  return el('div', { style: 'display:flex;align-items:center;gap:10px' }, [aprovarBtn, widget]);
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
  render();
  unsubDb = onDbChange(render);

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
  };
}
