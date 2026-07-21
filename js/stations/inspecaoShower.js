// Inspeção de Shower — subestação de qualidade do Shower: recebe veículos aprovados no
// Road Test ("Em teste") e os que voltaram do Reparo de Shower ("Em reteste"). Decide
// entre Negar (volta pro Reparo de Shower) ou Liberar (Sign Off/Túnel, ou montagem no
// próprio Reparo de Shower).
function mountInspecaoShower(container) {
  container.innerHTML = '';
  container.classList.add('alin-app');
  const station = STATIONS_BY_ID['inspecao-shower'];
  let unsubDb = null;
  const charts = {};
  let turnoSelecionado = getTurnoAtual().id;

  const clockEl = montarRelogio();
  const contadores = el('div', { class: 'header-right' });
  const shiftSelectors = el('div', { class: 'shift-selectors' },
    TURNOS.map(t => el('button', {
      class: `btn-shift ${t.id === turnoSelecionado ? 'active' : ''}`,
      onclick: () => { turnoSelecionado = t.id; render(); },
    }, `${t.id}º Turno`)));

  const grade = el('div', { class: 'grid-horas' });
  const testeWrap = el('div', { class: 'table-section' });
  const retesteWrap = el('div', { class: 'table-section' });
  const logWrap = el('div', { class: 'table-wrapper' });

  function chartCard2(titulo) {
    const canvas = el('canvas');
    const card = el('div', { class: 'chart-card' }, [el('h3', {}, titulo), el('div', { class: 'canvas-container' }, [canvas])]);
    card._canvas = canvas;
    return card;
  }
  const variacaoCard = chartCard2('Variação por hora');
  const fluxoCard = chartCard2('Entrada na inspeção vs. decisões realizadas vs. quantidade atual');

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', {}, `${station.emoji} ${station.nome}`)]),
    contadores,
  ]));
  container.appendChild(montarTabBarVoltar([
    el('button', { class: 'tab-btn tab-gerenciar', onclick: () => solicitarMatriculaLider('inspecao-shower', 'Operadores — Inspeção de Shower', abrirGerenciarOperadores) }, 'Operadores'),
  ]));
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'hora-hora-section' }, [
      el('div', { class: 'hora-hora-header' }, [el('h3', {}, 'Liberados x Negados por hora'), shiftSelectors]),
      grade,
    ]),
    testeWrap,
    retesteWrap,
    el('div', { class: 'dashboard-grid' }, [variacaoCard, fluxoCard]),
    el('div', { class: 'table-section' }, [el('h3', {}, 'Lançamentos'), logWrap]),
  ]));

  function veiculosEstacao() { return getVeiculosByStation('inspecao-shower'); }

  function eventosDoDia() {
    const hoje = dataOperacional();
    const eventos = [];
    getVeiculos().forEach(v => (v.showerEventos || []).forEach(ev => {
      if (v.dataOperacional === hoje && (ev.tipo === 'nega' || ev.tipo === 'libera-montagem' || ev.tipo === 'libera-final')) {
        eventos.push({ vin: v.vin, modelo: v.modelo, ...ev });
      }
    }));
    return eventos;
  }

  function eventosDoTurno() { return eventosDoDia().filter(e => e.turno === turnoSelecionado); }

  function abrirGerenciarOperadores() {
    const lista = el('div', { class: 'list-manage' });
    function render2() {
      lista.innerHTML = '';
      getOperadores('inspecao-shower').forEach(o => {
        const liderCb = el('input', { type: 'checkbox' });
        liderCb.checked = !!o.lider;
        if (!temPermissao('admin')) liderCb.disabled = true;
        liderCb.addEventListener('change', () => setOperadorLider(o.matricula, 'inspecao-shower', liderCb.checked));
        lista.appendChild(el('div', { class: 'manage-item' }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'info-linha' }, [
              el('span', { class: `status-dot ${o.lider ? 'admin' : 'operador'}` }),
              el('strong', { style: 'color:#eee' }, o.nome),
              el('label', { style: 'display:flex;align-items:center;gap:4px;font-size:0.72rem;color:#999;margin-left:8px' }, [liderCb, 'Líder/Team Leader']),
            ]),
            el('span', { style: 'font-size:0.78rem;color:#777' }, `Matrícula ${o.matricula}`),
          ]),
          el('button', { class: 'btn-del', onclick: () => { removeOperador(o.matricula, 'inspecao-shower'); render2(); } }, 'Excluir'),
        ]));
      });
      if (!getOperadores('inspecao-shower').length) lista.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum reparador cadastrado ainda.'));
    }
    render2();
    const content = el('div', {}, [el('h2', {}, 'Reparadores — Inspeção de Shower'), lista, el('button', { class: 'btn-action btn-close', onclick: () => closeIt() }, 'Fechar')]);
    const closeIt = openModal(content);
  }

  function acoesInspecao(v) {
    return el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      el('button', {
        class: 'rt-btn', style: '--btn-c:#ef4444', onclick: async () => {
          const ok = await confirmarAcao(`Negar ${v.vin} e enviar para o Reparo de Shower?`, 'Negar veículo');
          if (!ok) return;
          registrarEventoShower(v.vin, 'nega', { usuario: getSessao()?.usuario, motivo: 'Reprovado na inspeção' });
          toast(`${v.vin} negado — enviado para Reparo de Shower.`, 'warn');
        },
      }, 'Negar'),
      el('button', {
        class: 'rt-btn', style: '--btn-c:#22c55e', onclick: () => {
          const destino = el('select', { class: 'input-dark', style: "margin-bottom:0;font-family:'Segoe UI',sans-serif" }, [
            el('option', { value: 'signoff' }, 'Sign Off'),
            el('option', { value: 'tunel' }, 'Túnel de Liberação'),
            el('option', { value: 'montagem' }, 'Montagem (Reparo de Shower)'),
          ]);
          const content = el('div', {}, [
            el('h2', {}, 'Liberar veículo'),
            el('p', { style: 'color:#aaa;font-size:0.85rem;margin-bottom:15px' }, `Destino de ${v.vin}:`),
            destino,
            el('button', {
              class: 'btn-action btn-add', onclick: () => {
                if (destino.value === 'montagem') {
                  registrarEventoShower(v.vin, 'libera-montagem', { usuario: getSessao()?.usuario });
                  toast(`${v.vin} liberado para montagem no Reparo de Shower.`, 'success');
                } else {
                  registrarEventoShower(v.vin, 'libera-final', { usuario: getSessao()?.usuario });
                  moveVeiculo(v.vin, destino.value, { usuario: getSessao()?.usuario, acao: 'inspecao-shower-liberado' });
                  toast(`${v.vin} liberado para ${STATIONS_BY_ID[destino.value].nome}.`, 'success');
                }
                closeIt();
              },
            }, 'Confirmar'),
          ]);
          const closeIt = openModal(content);
        },
      }, 'Liberar'),
    ]);
  }

  function tabelaFila(titulo, lista) {
    const wrap = el('div', { class: 'table-section' });
    wrap.appendChild(el('h3', {}, titulo));
    const tableWrap = el('div', { class: 'table-wrapper' });
    if (!lista.length) {
      tableWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo nesta fila.'));
    } else {
      const table = el('table', { class: 'log-table' }, [
        el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Ações')])]),
      ]);
      const tbody = el('tbody');
      lista.forEach(v => tbody.appendChild(el('tr', {}, [el('td', {}, v.vin), el('td', {}, v.modelo), el('td', {}, acoesInspecao(v))])));
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function renderFilas() {
    testeWrap.innerHTML = '';
    retesteWrap.innerHTML = '';
    testeWrap.appendChild(tabelaFila('Em teste (1ª vez)', veiculosEstacao().filter(v => v.showerFase === 'teste')));
    retesteWrap.appendChild(tabelaFila('Em reteste', veiculosEstacao().filter(v => v.showerFase === 'reteste')));
  }

  function renderContadores() {
    const doTurno = eventosDoTurno();
    const doDia = eventosDoDia();
    const liberados = doDia.filter(e => e.tipo === 'libera-final' || e.tipo === 'libera-montagem').length;
    const negados = doDia.filter(e => e.tipo === 'nega').length;
    contadores.innerHTML = '';
    contadores.appendChild(el('div', { class: 'stat-box highlight' }, [el('span', {}, 'Parcial do turno'), el('strong', {}, String(doTurno.length))]));
    contadores.appendChild(el('div', { class: 'stat-box' }, [el('span', {}, 'Liberados hoje'), el('strong', {}, String(liberados))]));
    contadores.appendChild(el('div', { class: 'stat-box danger' }, [el('span', {}, 'Negados hoje'), el('strong', {}, String(negados))]));
    contadores.appendChild(el('div', { class: 'stat-box info' }, [el('span', {}, 'Em inspeção'), el('strong', {}, String(veiculosEstacao().length))]));
  }

  function renderGrade() {
    const turno = TURNOS.find(t => t.id === turnoSelecionado);
    const doTurno = eventosDoTurno();
    grade.innerHTML = '';
    const horas = horasDoTurno(turno);
    for (let i = 0; i < horas; i++) {
      const liberado = doTurno.filter(e => e.faixa === i && (e.tipo === 'libera-final' || e.tipo === 'libera-montagem')).length;
      const negado = doTurno.filter(e => e.faixa === i && e.tipo === 'nega').length;
      grade.appendChild(el('div', { class: `box-hora ${(liberado + negado) >= META_HORA_PADRAO ? 'active' : ''}` }, [
        el('span', {}, rotuloHoraReal(turno, i)),
        el('div', { class: 'box-hora-split' }, [
          el('div', { class: 'box-hora-metric ok' }, [el('strong', {}, String(liberado)), el('small', {}, 'OK')]),
          el('div', { class: 'box-hora-metric ng' }, [el('strong', {}, String(negado)), el('small', {}, 'NG')]),
        ]),
      ]));
    }
  }

  function renderLog() {
    const doDia = eventosDoDia().sort((a, b) => b.ts - a.ts);
    logWrap.innerHTML = '';
    if (!doDia.length) { logWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum lançamento hoje.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'Hora'), el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Resultado')])]),
    ]);
    const tbody = el('tbody');
    doDia.forEach(e => tbody.appendChild(el('tr', { class: e.tipo === 'nega' ? 'inadequado' : '' }, [
      el('td', {}, horaAtualStr(new Date(e.ts))), el('td', {}, e.vin), el('td', {}, e.modelo),
      el('td', {}, el('span', { class: `badge-tipo ${e.tipo === 'nega' ? 'inadequado' : 'aprovado'}` }, e.tipo === 'nega' ? 'Negado' : 'Liberado')),
    ])));
    table.appendChild(tbody);
    logWrap.appendChild(table);
  }

  function ensureCharts() {
    if (charts.variacao) return;
    charts.variacao = new Chart(variacaoCard._canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [
        { label: 'Decisões', data: [], backgroundColor: station.accent, borderRadius: 4, datalabels: { display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0, color: '#fff', anchor: 'end', align: 'top', font: { size: 10, weight: 700 } } },
        { label: 'Meta', data: [], type: 'line', borderColor: '#22d3ee', pointRadius: 0, tension: 0.3 },
      ] },
      options: chartOptions(),
    });
    charts.fluxo = new Chart(fluxoCard._canvas.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [
        criarDatasetLinhaModerna('Entrada na inspeção', '#38bdf8'),
        criarDatasetLinhaModerna('Decisões realizadas', '#22c55e'),
        criarDatasetLinhaModerna('Quantidade atual', '#f59e0b'),
      ] },
      options: chartOptions(true),
    });
  }

  function chartOptions(moderno) {
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: moderno ? { mode: 'index', intersect: false } : undefined,
      plugins: { legend: { labels: { color: '#c8ccd6', usePointStyle: true, pointStyle: 'circle' } } },
      scales: {
        x: { ticks: { color: '#8b93a4' }, grid: { display: !moderno, color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8b93a4', stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
      },
    };
  }

  function fluxoPorHora(horas, turno) {
    const entradas = new Array(horas).fill(0);
    const saidas = new Array(horas).fill(0);
    const hoje = dataOperacional();
    getVeiculos().forEach(v => {
      (v.history || []).forEach(h => {
        if (dataOperacional(new Date(h.ts)) !== hoje) return;
        const tHora = getTurnoAtual(new Date(h.ts));
        if (tHora.id !== turno.id) return;
        const idx = faixaHoraria(new Date(h.ts), tHora);
        if (idx < 0 || idx >= horas) return;
        if (h.para === 'inspecao-shower') entradas[idx]++;
        if (h.de === 'inspecao-shower') saidas[idx]++;
      });
    });
    return { entradas, saidas };
  }

  function renderCharts() {
    ensureCharts();
    const turno = TURNOS.find(t => t.id === turnoSelecionado);
    const doTurno = eventosDoTurno();
    const horas = horasDoTurno(turno);
    const labelsHora = Array.from({ length: horas }, (_, i) => rotuloHoraReal(turno, i));
    const decididosPorHora = labelsHora.map((_, i) => doTurno.filter(e => e.faixa === i).length);

    charts.variacao.data.labels = labelsHora;
    charts.variacao.data.datasets[0].data = decididosPorHora;
    charts.variacao.data.datasets[1].data = labelsHora.map(() => META_HORA_PADRAO);
    charts.variacao.update();

    const { entradas, saidas } = fluxoPorHora(horas, turno);
    let acumulado = 0;
    const atualPorHora = entradas.map((e, i) => { acumulado += e - saidas[i]; return Math.max(0, acumulado); });
    charts.fluxo.data.labels = labelsHora;
    charts.fluxo.data.datasets[0].data = entradas;
    charts.fluxo.data.datasets[1].data = decididosPorHora;
    charts.fluxo.data.datasets[2].data = atualPorHora;
    centralizarEixoY(charts.fluxo, entradas, decididosPorHora, atualPorHora);
    charts.fluxo.update();
  }

  function render() {
    renderContadores();
    renderGrade();
    renderFilas();
    renderLog();
    renderCharts();
  }

  render();
  unsubDb = onDbChange(render);

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
    Object.values(charts).forEach(c => c.destroy());
  };
}
