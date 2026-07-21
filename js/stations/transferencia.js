function mountTransferencia(container) {
  container.innerHTML = '';
  let unsubDb = null;
  const clockEl = montarRelogio();
  const buscaGlobalInput = el('input', { class: 'input-dark', placeholder: 'Buscar qualquer VIN no sistema…' });
  const buscaResultado = el('div', {});
  const filaWrap = el('div', { class: 'table-wrapper' });

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', {}, 'Transferência')]),
  ]));
  container.appendChild(montarTabBarVoltar());
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'table-section', style: 'max-width:1100px' }, [
      el('h3', {}, 'Buscar VIN em qualquer estação'),
      buscaGlobalInput,
      buscaResultado,
    ]),
    el('div', { class: 'table-section', style: 'max-width:1100px' }, [
      el('h3', {}, 'Aguardando validação da Qualidade'),
      filaWrap,
    ]),
  ]));

  function destinoSelect() {
    return el('select', { class: 'input-dark', style: "margin-bottom:0;font-family:'Segoe UI',sans-serif" },
      [...ALL_REPAIR_STATION_IDS, 'signoff', 'tunel'].map(id => el('option', { value: id }, STATIONS_BY_ID[id].nome)));
  }

  function transferir(vin, destino) {
    if (destino === 'inspecao-shower') enviarParaInspecaoShower(vin, { usuario: getSessao()?.usuario, acao: 'transferencia' });
    else moveVeiculo(vin, destino, { usuario: getSessao()?.usuario, acao: 'transferencia' });
    toast(`${vin} transferido para ${STATIONS_BY_ID[destino].nome}.`, 'success');
  }

  function linhaVeiculo(v) {
    const select = destinoSelect();
    const btn = el('button', { class: 'btn-del', style: 'color:#818cf8;border-color:#818cf8', onclick: () => transferir(v.vin, select.value) }, 'Transferir');
    return el('tr', {}, [
      el('td', {}, v.vin),
      el('td', {}, v.modelo),
      el('td', {}, STATIONS_BY_ID[v.station]?.nome || v.station),
      el('td', {}, select),
      el('td', {}, btn),
    ]);
  }

  function renderBusca() {
    const q = buscaGlobalInput.value.trim().toUpperCase();
    buscaResultado.innerHTML = '';
    if (!q) return;
    const v = getVeiculo(q);
    if (!v) { buscaResultado.appendChild(el('div', { class: 'log-vazio' }, 'VIN não encontrado.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Estação atual'), el('th', {}, 'Destino'), el('th', {}, 'Ação')])]),
      el('tbody', {}, [linhaVeiculo(v)]),
    ]);
    buscaResultado.appendChild(table);
  }

  function renderFila() {
    const lista = getVeiculosByStation('transferencia');
    filaWrap.innerHTML = '';
    if (!lista.length) { filaWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo aguardando transferência.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Último reparo'), el('th', {}, 'Destino'), el('th', {}, 'Ação')])]),
    ]);
    const tbody = el('tbody');
    lista.forEach(v => {
      const ultimo = Object.entries(v.reparos || {}).sort((a, b) => b[1].ts - a[1].ts)[0];
      const select = destinoSelect();
      const btn = el('button', { class: 'btn-del', style: 'color:#818cf8;border-color:#818cf8', onclick: () => transferir(v.vin, select.value) }, 'Transferir');
      tbody.appendChild(el('tr', {}, [
        el('td', {}, v.vin),
        el('td', {}, v.modelo),
        el('td', {}, ultimo ? `${STATIONS_BY_ID[ultimo[0]]?.nome} (${ultimo[1].tipo})` : '—'),
        el('td', {}, select),
        el('td', {}, btn),
      ]));
    });
    table.appendChild(tbody);
    filaWrap.appendChild(table);
  }

  buscaGlobalInput.addEventListener('input', renderBusca);
  renderFila();
  unsubDb = onDbChange(() => { renderFila(); renderBusca(); });

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
  };
}
