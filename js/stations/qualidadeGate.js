// Fábrica compartilhada por Sign Off e Túnel de Liberação: busca por VIN, e então
// "Liberar veículo" ou "Enviar para reparo" (estação + nível N1/N2/N3).
function mountQualidadeGate(container, stationId, { acaoLiberar, tituloFila }) {
  container.innerHTML = '';
  const station = STATIONS_BY_ID[stationId];
  let unsubDb = null;
  let chart = null;
  const clockEl = montarRelogio();
  const buscaInput = el('input', { class: 'input-dark', placeholder: 'Buscar VIN…' });
  const resultadoWrap = el('div', {});
  const filaWrap = el('div', { class: 'table-wrapper' });
  const contadores = el('div', { style: 'display:flex;gap:20px;margin-top:16px' });
  const canvas = el('canvas');

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', { style: `color:${station.accent}` }, station.nome)]),
    contadores,
  ]));
  container.appendChild(montarTabBarVoltar());
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'table-section', style: 'max-width:1000px' }, [
      el('h3', {}, 'Buscar VIN'),
      buscaInput,
      resultadoWrap,
    ]),
    el('div', { class: 'table-section', style: 'max-width:1000px' }, [
      el('h3', {}, tituloFila),
      filaWrap,
    ]),
    el('div', { class: 'chart-card', style: 'width:100%;max-width:1000px' }, [
      el('h3', {}, 'Veículos liberados vs. veículos para reparo (hoje)'),
      el('div', { class: 'canvas-container' }, [canvas]),
    ]),
  ]));

  function destinoSelect() {
    return el('select', { class: 'input-dark', style: "margin-bottom:0;font-family:'Segoe UI',sans-serif" },
      ALL_REPAIR_STATION_IDS.map(id => el('option', { value: id }, STATIONS_BY_ID[id].nome)));
  }
  function nivelSelect() {
    return el('select', { class: 'input-dark', style: "margin-bottom:0;font-family:'Segoe UI',sans-serif" },
      NIVEIS_REPARO.map(n => el('option', { value: n.id }, n.label)));
  }

  function liberar(vin) {
    moveVeiculo(vin, 'liberado', { usuario: getSessao()?.usuario, acao: acaoLiberar });
    toast(`${vin} liberado.`, 'success');
    buscaInput.value = '';
    renderBusca();
  }
  function enviarParaReparo(vin, destino, nivel) {
    if (destino === 'inspecao-shower') enviarParaInspecaoShower(vin, { usuario: getSessao()?.usuario, acao: 'enviar-reparo', nivel });
    else moveVeiculo(vin, destino, { usuario: getSessao()?.usuario, acao: 'enviar-reparo', nivel });
    toast(`${vin} enviado para ${STATIONS_BY_ID[destino].nome} (${nivel}).`, 'warn');
    buscaInput.value = '';
    renderBusca();
  }

  function linhaAcoes(v) {
    const select = destinoSelect();
    const nivel = nivelSelect();
    const liberarBtn = el('button', { class: 'btn-del', style: 'color:#22c55e;border-color:#22c55e', onclick: () => liberar(v.vin) }, 'Liberar veículo');
    const enviarBtn = el('button', { class: 'btn-del', onclick: () => enviarParaReparo(v.vin, select.value, nivel.value) }, 'Enviar para reparo');
    return el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Estação atual'), el('th', {}, 'Destino'), el('th', {}, 'Nível'), el('th', {}, 'Ações')])]),
      el('tbody', {}, [el('tr', {}, [
        el('td', {}, v.vin), el('td', {}, v.modelo), el('td', {}, STATIONS_BY_ID[v.station]?.nome || v.station),
        el('td', {}, select), el('td', {}, nivel),
        el('td', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [liberarBtn, enviarBtn]),
      ])]),
    ]);
  }

  function renderBusca() {
    const q = buscaInput.value.trim().toUpperCase();
    resultadoWrap.innerHTML = '';
    if (!q) return;
    const v = getVeiculo(q);
    if (!v) { resultadoWrap.appendChild(el('div', { class: 'log-vazio' }, 'VIN não encontrado.')); return; }
    resultadoWrap.appendChild(linhaAcoes(v));
  }

  function renderFila() {
    const lista = getVeiculosByStation(stationId);
    filaWrap.innerHTML = '';
    if (!lista.length) { filaWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo aguardando.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Chegada')])]),
    ]);
    const tbody = el('tbody');
    lista.forEach(v => tbody.appendChild(el('tr', {}, [
      el('td', {}, v.vin), el('td', {}, v.modelo), el('td', {}, horaAtualStr(new Date(v.atualizadoEm))),
    ])));
    table.appendChild(tbody);
    filaWrap.appendChild(table);
  }

  function eventosHoje() {
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    const eventos = [];
    getVeiculos().forEach(v => (v.history || []).forEach(h => {
      if (h.de === stationId && h.ts >= hoje0.getTime()) eventos.push(h);
    }));
    return eventos;
  }

  function renderContadores() {
    const eventos = eventosHoje();
    const liberados = eventos.filter(h => h.acao === acaoLiberar).length;
    const paraReparo = eventos.filter(h => h.acao === 'enviar-reparo').length;
    contadores.innerHTML = '';
    contadores.appendChild(el('div', { class: 'stat-box' }, [el('span', {}, 'Na fila'), el('strong', {}, String(getVeiculosByStation(stationId).length))]));
    contadores.appendChild(el('div', { class: 'stat-box highlight' }, [el('span', {}, 'Liberados hoje'), el('strong', {}, String(liberados))]));
    contadores.appendChild(el('div', { class: 'stat-box danger' }, [el('span', {}, 'Para reparo hoje'), el('strong', {}, String(paraReparo))]));
    const total = liberados + paraReparo;
    contadores.appendChild(el('div', { class: 'stat-box' }, [el('span', {}, 'Qualidade do dia'), el('strong', {}, total ? `${Math.round((liberados / total) * 100)}%` : '—')]));
  }

  function renderChart() {
    const eventos = eventosHoje();
    const liberados = eventos.filter(h => h.acao === acaoLiberar).length;
    const paraReparo = eventos.filter(h => h.acao === 'enviar-reparo').length;
    if (!chart) {
      chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: ['Liberados', 'Para reparo'], datasets: [{ data: [0, 0], backgroundColor: ['#22c55e', station.accent], borderRadius: 6, datalabels: { display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0, color: '#fff', anchor: 'end', align: 'top', font: { size: 12, weight: 700 } } }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8b93a4' }, grid: { display: false } },
            y: { ticks: { color: '#8b93a4', stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          },
        },
      });
    }
    chart.data.datasets[0].data = [liberados, paraReparo];
    chart.update();
  }

  function renderAll() {
    renderContadores();
    renderFila();
    renderBusca();
    renderChart();
  }

  buscaInput.addEventListener('input', renderBusca);
  renderAll();
  unsubDb = onDbChange(renderAll);

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
    if (chart) chart.destroy();
  };
}
