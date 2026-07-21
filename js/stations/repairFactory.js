function mountRepairStation(container, stationId) {
  container.innerHTML = '';
  const station = STATIONS_BY_ID[stationId];
  let unsubDb = null;
  const charts = {};
  let turnoSelecionado = getTurnoAtual().id;

  const clockEl = montarRelogio();
  const contadores = el('div', { class: 'header-right' });
  const shiftSelectors = el('div', { class: 'shift-selectors' },
    TURNOS.map(t => el('button', {
      class: `btn-shift ${t.id === turnoSelecionado ? 'active' : ''}`,
      onclick: () => { turnoSelecionado = t.id; renderAll(); atualizarShiftBtns(); },
    }, `${t.id}º Turno`)));

  function atualizarShiftBtns() {
    [...shiftSelectors.children].forEach((btn, i) => btn.classList.toggle('active', TURNOS[i].id === turnoSelecionado));
  }

  const temInadequado = station.temInadequado !== false;
  const aprovarBtn = el('button', { class: 'btn-lancar' }, temInadequado ? 'Lançar reparo aprovado' : 'Lançar reparo');
  const inadequadoBtn = temInadequado ? el('button', { class: 'btn-lancar-inadequado' }, 'Lançar reparo inadequado') : null;
  const grade = el('div', { class: 'grid-horas' });
  const filaWrap = el('div', { class: 'table-wrapper' });
  const rankingList = el('div', { class: 'ranking-list' });
  const logWrap = el('div', { class: 'table-wrapper' });

  function chartCard(titulo, wide, extraHeader) {
    const canvas = el('canvas');
    const card = el('div', { class: 'chart-card' }, [
      extraHeader ? el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:20px' }, [
        el('h3', { style: 'margin-bottom:0' }, titulo), extraHeader,
      ]) : el('h3', {}, titulo),
      el('div', { class: 'canvas-container' }, [canvas]),
    ]);
    card._canvas = canvas;
    return card;
  }

  const variacaoCard = chartCard('Variação por hora', false, el('span', { style: 'font-size:0.72rem;color:#22d3ee;border:1px solid rgba(34,211,238,0.45);padding:4px 12px;border-radius:20px;background:rgba(34,211,238,0.08);white-space:nowrap;letter-spacing:0.5px;text-transform:uppercase' }, `Meta: ${META_HORA_PADRAO}/h`));
  const rankingCard = el('div', { class: 'chart-card' }, [el('h3', {}, 'Ranking de reparadores'), rankingList]);
  const modeloCard = chartCard('Reparos por modelo');
  const marcaCard = chartCard('Reparos por marca');
  const fluxoCard = chartCard('Entrada no reparo vs. reparos realizados vs. quantidade atual');

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', {}, station.nome)]),
    contadores,
  ]));
  container.appendChild(montarTabBarVoltar([
    el('button', { class: 'tab-btn tab-gerenciar', onclick: () => solicitarMatriculaLider(stationId, `Operadores — ${station.nome}`, abrirGerenciarOperadores) }, 'Operadores'),
    temInadequado ? el('button', { class: 'tab-btn tab-gerenciar', onclick: () => solicitarMatriculaLider(stationId, `Reparo inadequado — ${station.nome}`, abrirPainelInadequado) }, 'Reparo Inadequado') : null,
  ]));
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'action-area' }, temInadequado ? [aprovarBtn, inadequadoBtn] : [aprovarBtn]),
    el('div', { class: 'hora-hora-section' }, [
      el('div', { class: 'hora-hora-header' }, [el('h3', {}, 'Aprovados x Inadequados por hora'), shiftSelectors]),
      grade,
    ]),
    el('div', { class: 'table-section' }, [
      el('h3', {}, 'Aguardando reparo nesta estação'),
      filaWrap,
    ]),
    el('div', { class: 'dashboard-grid' }, [variacaoCard, rankingCard]),
    el('div', { class: 'dashboard-grid split-even' }, [modeloCard, marcaCard]),
    el('div', { class: 'dashboard-grid single' }, [fluxoCard]),
    el('div', { class: 'table-section' }, [
      el('h3', {}, 'Lançamentos'),
      logWrap,
    ]),
  ]));

  function reparosDoDia() {
    const hoje = dataOperacional();
    const registros = [];
    getVeiculos().forEach(v => {
      const r = v.reparos[stationId];
      if (r && v.dataOperacional === hoje) registros.push({ v, r });
    });
    return registros;
  }

  function reparosDoTurno() {
    return reparosDoDia().filter(({ r }) => r.turno === turnoSelecionado);
  }

  function abrirGerenciarOperadores() {
    const lista = el('div', { class: 'list-manage' });
    function render() {
      lista.innerHTML = '';
      getOperadores(stationId).forEach(o => {
        const liderCb = el('input', { type: 'checkbox' });
        liderCb.checked = !!o.lider;
        if (!temPermissao('admin')) liderCb.disabled = true;
        liderCb.addEventListener('change', () => setOperadorLider(o.matricula, stationId, liderCb.checked));
        lista.appendChild(el('div', { class: 'manage-item' }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'info-linha' }, [
              el('span', { class: `status-dot ${o.lider ? 'admin' : 'operador'}` }),
              el('strong', { style: 'color:#eee' }, o.nome),
              el('label', { style: 'display:flex;align-items:center;gap:4px;font-size:0.72rem;color:#999;margin-left:8px' }, [liderCb, 'Líder/Team Leader']),
            ]),
            el('span', { style: 'font-size:0.78rem;color:#777' }, `Matrícula ${o.matricula}`),
          ]),
          el('button', { class: 'btn-del', onclick: () => { removeOperador(o.matricula, stationId); render(); } }, 'Excluir'),
        ]));
      });
      if (!getOperadores(stationId).length) lista.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum reparador cadastrado ainda.'));
    }
    render();
    const content = el('div', {}, [
      el('h2', {}, `Reparadores — ${station.nome}`),
      lista,
      el('button', { class: 'btn-action btn-close', onclick: () => closeIt() }, 'Fechar'),
    ]);
    const closeIt = openModal(content);
  }

  function abrirPainelInadequado() {
    const lista = el('div', { class: 'table-wrapper' });
    function render() {
      const doDia = reparosDoDia().filter(x => x.r.tipo === 'inadequado').sort((a, b) => b.r.ts - a.r.ts);
      lista.innerHTML = '';
      if (!doDia.length) { lista.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum reparo inadequado hoje.')); return; }
      const table = el('table', { class: 'log-table' }, [
        el('thead', {}, [el('tr', {}, [el('th', {}, 'Hora'), el('th', {}, 'VIN'), el('th', {}, 'Reparador'), el('th', {}, 'Motivo'), el('th', {}, 'Ação')])]),
      ]);
      const tbody = el('tbody');
      doDia.forEach(({ v, r }) => tbody.appendChild(el('tr', { class: 'inadequado' }, [
        el('td', {}, horaAtualStr(new Date(r.ts))), el('td', {}, v.vin), el('td', {}, r.reparador), el('td', {}, r.motivo || '—'),
        el('td', {}, el('button', {
          class: 'btn-del',
          onclick: async () => {
            const ok = await confirmarAcao(`Remover ${v.vin} e devolver para a estação anterior?`, 'Remover veículo');
            if (!ok) return;
            estornarParaEstacaoAnterior(v.vin, stationId, getSessao()?.usuario);
            render();
          },
        }, 'Remover')),
      ])));
      table.appendChild(tbody);
      lista.appendChild(table);
    }
    render();
    const content = el('div', {}, [
      el('h2', {}, `Reparo inadequado — ${station.nome}`),
      lista,
      el('button', { class: 'btn-action btn-close', onclick: () => closeIt() }, 'Fechar'),
    ]);
    const closeIt = openModal(content);
  }

  function abrirLancamento(tipo) {
    const disponiveis = getVeiculosByStation(stationId);
    if (!disponiveis.length) { toast('Nenhum veículo aguardando reparo nesta estação.', 'warn'); return; }

    const vinSelect = el('select', { class: 'input-dark', style: "font-family:'Segoe UI',sans-serif" },
      disponiveis.map(v => el('option', { value: v.vin }, `${v.vin} — ${v.modelo}`)));
    const matriculaInput = el('input', { class: 'input-dark', placeholder: 'Digite a matrícula do reparador' });
    const feedback = el('div', { class: 'feedback-matricula' });
    const nomeInput = el('input', { class: 'input-dark hidden', placeholder: 'Nome do reparador (novo)' });

    matriculaInput.addEventListener('input', () => {
      const op = getOperadores(stationId).find(o => o.matricula === matriculaInput.value.trim());
      feedback.className = 'feedback-matricula';
      if (op) { feedback.textContent = `✓ ${op.nome}`; feedback.classList.add('encontrado'); nomeInput.classList.add('hidden'); }
      else if (matriculaInput.value.trim()) { feedback.textContent = 'Matrícula não cadastrada — informe o nome abaixo.'; feedback.classList.add('nao-encontrado'); nomeInput.classList.remove('hidden'); }
      else { feedback.textContent = ''; nomeInput.classList.add('hidden'); }
    });

    let motivosContainer = null;
    let motivoOutro = null;
    if (tipo === 'inadequado') {
      motivosContainer = el('div', { class: 'lista-motivos' },
        MOTIVOS_INADEQUADO.map(m => el('label', { class: 'motivo-item' }, [el('input', { type: 'checkbox', value: m }), m])));
      motivoOutro = el('input', { class: 'input-dark', placeholder: 'Detalhe (se marcar "OUTRO")' });
    }

    const erro = el('div', { class: 'form-error hidden' });
    const confirmarBtn = el('button', { class: 'btn-action btn-add' }, 'Confirmar');
    const content = el('div', {}, [
      el('h2', {}, tipo === 'aprovado' ? 'Registrar reparo aprovado' : 'Registrar reparo inadequado'),
      el('label', { class: 'input-label' }, 'Veículo'), vinSelect,
      el('label', { class: 'input-label' }, 'Reparador'), matriculaInput, feedback, nomeInput,
      tipo === 'inadequado' ? el('label', { class: 'label-motivo' }, 'Motivo do reparo inadequado') : null,
      motivosContainer,
      motivoOutro,
      erro,
      confirmarBtn,
      el('button', { class: 'btn-action btn-close', onclick: () => close() }, 'Cancelar'),
    ]);
    const close = openModal(content);

    confirmarBtn.addEventListener('click', async () => {
      try {
        const matricula = matriculaInput.value.trim();
        if (!matricula) throw new Error('Informe a matrícula do reparador.');
        let operador = getOperadores(stationId).find(o => o.matricula === matricula);
        if (!operador) {
          const nome = nomeInput.value.trim();
          if (!nome) throw new Error('Informe o nome do reparador para cadastrá-lo.');
          addOperador({ matricula, nome, estacao: stationId });
          operador = { matricula, nome: nome.toUpperCase() };
        }
        let motivo = null;
        if (tipo === 'inadequado') {
          const marcados = [...motivosContainer.querySelectorAll('input:checked')].map(c => c.value);
          if (marcados.includes('OUTRO') && motivoOutro.value.trim()) {
            marcados[marcados.indexOf('OUTRO')] = motivoOutro.value.trim().toUpperCase();
          }
          if (!marcados.length) throw new Error('Selecione ao menos um motivo.');
          motivo = marcados.join(', ');
        }
        registrarReparo(vinSelect.value, stationId, {
          tipo, motivo, reparador: operador.nome, matricula,
        }, { usuario: getSessao()?.usuario });
        toast(`${vinSelect.value} lançado como ${tipo}.`, tipo === 'aprovado' ? 'success' : 'warn');
        close();
      } catch (e) {
        erro.textContent = e.message;
        erro.classList.remove('hidden');
      }
    });
  }

  aprovarBtn.addEventListener('click', () => abrirLancamento('aprovado'));
  if (inadequadoBtn) inadequadoBtn.addEventListener('click', () => abrirLancamento('inadequado'));

  function renderContadores() {
    const doTurno = reparosDoTurno();
    const doDia = reparosDoDia();
    contadores.innerHTML = '';
    contadores.appendChild(statBox('Parcial do turno', doTurno.length, 'highlight'));
    contadores.appendChild(statBox('Aprovados hoje', doDia.filter(x => x.r.tipo === 'aprovado').length, ''));
    contadores.appendChild(statBox('Inadequados hoje', doDia.filter(x => x.r.tipo === 'inadequado').length, 'danger'));
    contadores.appendChild(statBox('Em reparo', getVeiculosByStation(stationId).length, 'info'));
  }

  function statBox(label, value, cls) {
    return el('div', { class: `stat-box ${cls}` }, [
      el('span', {}, label),
      el('strong', {}, String(value)),
    ]);
  }

  function renderGrade() {
    const turno = TURNOS.find(t => t.id === turnoSelecionado);
    const doTurno = reparosDoTurno();
    grade.innerHTML = '';
    const horas = horasDoTurno(turno);
    for (let i = 0; i < horas; i++) {
      const ok = doTurno.filter(x => x.r.faixa === i && x.r.tipo === 'aprovado').length;
      if (!temInadequado) {
        grade.appendChild(el('div', { class: `box-hora ${ok >= META_HORA_PADRAO ? 'active' : ''}` }, [
          el('span', {}, rotuloHoraReal(turno, i)),
          el('strong', {}, String(ok)),
        ]));
        continue;
      }
      const ng = doTurno.filter(x => x.r.faixa === i && x.r.tipo === 'inadequado').length;
      grade.appendChild(el('div', { class: `box-hora ${(ok + ng) >= META_HORA_PADRAO ? 'active' : ''}` }, [
        el('span', {}, rotuloHoraReal(turno, i)),
        el('div', { class: 'box-hora-split' }, [
          el('div', { class: 'box-hora-metric ok' }, [el('strong', {}, String(ok)), el('small', {}, 'OK')]),
          el('div', { class: 'box-hora-metric ng' }, [el('strong', {}, String(ng)), el('small', {}, 'NG')]),
        ]),
      ]));
    }
  }

  function renderFila() {
    const lista = getVeiculosByStation(stationId);
    filaWrap.innerHTML = '';
    if (!lista.length) { filaWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo aguardando reparo.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Marca'), el('th', {}, 'Entrada')])]),
    ]);
    const tbody = el('tbody');
    lista.forEach(v => tbody.appendChild(el('tr', {}, [
      el('td', {}, v.vin), el('td', {}, v.modelo), el('td', {}, v.marca),
      el('td', {}, horaAtualStr(new Date(v.atualizadoEm))),
    ])));
    table.appendChild(tbody);
    filaWrap.appendChild(table);
  }

  function renderRanking() {
    const doDia = reparosDoDia();
    const mapa = {};
    doDia.forEach(({ r }) => {
      if (!mapa[r.reparador]) mapa[r.reparador] = { ok: 0, ng: 0 };
      mapa[r.reparador][r.tipo === 'aprovado' ? 'ok' : 'ng']++;
    });
    const ranking = Object.entries(mapa).map(([nome, c]) => ({ nome, ...c, total: c.ok + c.ng })).sort((a, b) => b.total - a.total);
    rankingList.innerHTML = '';
    if (!ranking.length) { rankingList.appendChild(el('div', { class: 'ranking-vazio' }, 'Nenhum reparo lançado hoje.')); return; }
    ranking.forEach((r, i) => {
      rankingList.appendChild(el('div', { class: 'ranking-item' }, [
        el('span', { class: 'ranking-posicao' }, `${i + 1}º`),
        el('span', { class: 'ranking-nome' }, r.nome),
        el('span', { class: 'ranking-qtd' }, String(r.total)),
      ]));
    });
  }

  function renderLog() {
    const doDia = reparosDoDia().sort((a, b) => b.r.ts - a.r.ts);
    logWrap.innerHTML = '';
    if (!doDia.length) { logWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum lançamento hoje.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', {}, 'Hora'), el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Reparador'),
        el('th', {}, 'Resultado'), el('th', {}, 'Motivo'), el('th', {}, 'Ações'),
      ])]),
    ]);
    const tbody = el('tbody');
    doDia.forEach(({ v, r }) => tbody.appendChild(el('tr', { class: r.tipo === 'inadequado' ? 'inadequado' : '' }, [
      el('td', {}, horaAtualStr(new Date(r.ts))),
      el('td', {}, v.vin), el('td', {}, v.modelo), el('td', {}, r.reparador),
      el('td', {}, el('span', { class: `badge-tipo ${r.tipo}` }, r.tipo)),
      el('td', {}, r.motivo || '—'),
      el('td', {}, temPermissao('admin') ? el('button', {
        class: 'btn-del',
        onclick: async () => {
          const ok = await confirmarAcao(`Remover ${v.vin} e devolver para a estação anterior?`, 'Remover veículo');
          if (!ok) return;
          estornarParaEstacaoAnterior(v.vin, stationId, getSessao()?.usuario);
        },
      }, 'Remover') : ''),
    ])));
    table.appendChild(tbody);
    logWrap.appendChild(table);
  }

  function ensureCharts() {
    if (charts.variacao) return;
    charts.variacao = new Chart(variacaoCard._canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [
        { label: 'Reparos', data: [], backgroundColor: station.accent, borderRadius: 4, datalabels: { display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0, color: '#fff', anchor: 'end', align: 'top', font: { size: 10, weight: 700 } } },
        { label: 'Meta', data: [], type: 'line', borderColor: '#22d3ee', pointRadius: 0, tension: 0.3 },
      ] },
      options: chartOptions(),
    });
    charts.modelo = new Chart(modeloCard._canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Reparos', data: [], backgroundColor: station.accent, borderRadius: 4 }] },
      options: chartOptions(),
    });
    charts.marca = new Chart(marcaCard._canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [station.accent, '#ffc36e', '#555555', '#888888'] }] },
      options: { plugins: { legend: { labels: { color: '#c8ccd6' } } } },
    });
    charts.fluxo = new Chart(fluxoCard._canvas.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [
        criarDatasetLinhaModerna('Entrada no reparo', '#38bdf8'),
        criarDatasetLinhaModerna('Reparos realizados', '#22c55e'),
        criarDatasetLinhaModerna('Quantidade atual', '#f59e0b'),
      ] },
      options: chartOptions(false, true),
    });
  }

  function chartOptions(stacked, moderno) {
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: moderno ? { mode: 'index', intersect: false } : undefined,
      plugins: { legend: { labels: { color: '#c8ccd6', usePointStyle: true, pointStyle: 'circle' } } },
      scales: {
        x: { stacked: !!stacked, ticks: { color: '#8b93a4' }, grid: { display: !moderno, color: 'rgba(255,255,255,0.05)' } },
        y: { stacked: !!stacked, ticks: { color: '#8b93a4', stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
      },
    };
  }

  // Entradas/saídas por hora do turno, a partir do histórico real do veículo
  // (history[].para === chegada nesta estação, history[].de === saída desta estação).
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
        if (h.para === stationId) entradas[idx]++;
        if (h.de === stationId) saidas[idx]++;
      });
    });
    return { entradas, saidas };
  }

  function renderCharts() {
    ensureCharts();
    const turno = TURNOS.find(t => t.id === turnoSelecionado);
    const doTurno = reparosDoTurno();
    const doDia = reparosDoDia();
    const horas = horasDoTurno(turno);

    const labelsHora = Array.from({ length: horas }, (_, i) => rotuloHoraReal(turno, i));
    const realizadosPorHora = labelsHora.map((_, i) => doTurno.filter(x => x.r.faixa === i).length);
    charts.variacao.data.labels = labelsHora;
    charts.variacao.data.datasets[0].data = realizadosPorHora;
    charts.variacao.data.datasets[1].data = labelsHora.map(() => META_HORA_PADRAO);
    charts.variacao.update();

    const { entradas, saidas } = fluxoPorHora(horas, turno);
    let acumulado = 0;
    const atualPorHora = entradas.map((e, i) => { acumulado += e - saidas[i]; return Math.max(0, acumulado); });
    charts.fluxo.data.labels = labelsHora;
    charts.fluxo.data.datasets[0].data = entradas;
    charts.fluxo.data.datasets[1].data = realizadosPorHora;
    charts.fluxo.data.datasets[2].data = atualPorHora;
    centralizarEixoY(charts.fluxo, entradas, realizadosPorHora, atualPorHora);
    charts.fluxo.update();

    const porModelo = {};
    doDia.forEach(({ v }) => { porModelo[v.modelo] = (porModelo[v.modelo] || 0) + 1; });
    const modeloEntries = Object.entries(porModelo).sort((a, b) => b[1] - a[1]);
    charts.modelo.data.labels = modeloEntries.map(m => m[0]);
    charts.modelo.data.datasets[0].data = modeloEntries.map(m => m[1]);
    charts.modelo.update();

    const porMarca = {};
    doDia.forEach(({ v }) => { porMarca[v.marca] = (porMarca[v.marca] || 0) + 1; });
    const marcaEntries = Object.entries(porMarca);
    charts.marca.data.labels = marcaEntries.map(m => m[0]);
    charts.marca.data.datasets[0].data = marcaEntries.map(m => m[1]);
    charts.marca.update();
  }

  function renderAll() {
    renderContadores();
    renderGrade();
    renderFila();
    renderRanking();
    renderLog();
    renderCharts();
  }

  renderAll();
  unsubDb = onDbChange(renderAll);

  return function unmount() {
    clockEl._stop();
    if (unsubDb) unsubDb();
    Object.values(charts).forEach(c => c.destroy());
  };
}
