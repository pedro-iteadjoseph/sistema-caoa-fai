// Reparo de Shower — recebe veículos negados na Inspeção de Shower ("Aguardando reparo")
// e os liberados para montagem ("Aguardando montagem"). Não tem conceito de inadequado —
// cada veículo só sai daqui "Concluindo" o reparo (volta pra Inspeção, em reteste) ou a
// montagem (segue pro destino final escolhido).
function mountReparoShower(container) {
  container.innerHTML = '';
  container.classList.add('alin-app');
  const station = STATIONS_BY_ID['reparo-shower'];
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
  const reparoWrap = el('div', { class: 'table-section' });
  const montagemWrap = el('div', { class: 'table-section' });
  const logWrap = el('div', { class: 'table-wrapper' });

  function chartCard2(titulo) {
    const canvas = el('canvas');
    const card = el('div', { class: 'chart-card' }, [el('h3', {}, titulo), el('div', { class: 'canvas-container' }, [canvas])]);
    card._canvas = canvas;
    return card;
  }
  const variacaoCard = chartCard2('Variação por hora');
  const fluxoCard = chartCard2('Entrada no reparo vs. reparos realizados vs. quantidade atual');

  container.appendChild(el('header', { class: 'app-header' }, [
    el('div', { class: 'header-left' }, [el('h1', {}, `${station.emoji} ${station.nome}`)]),
    contadores,
  ]));
  container.appendChild(montarTabBarVoltar([
    el('button', { class: 'tab-btn tab-gerenciar', onclick: () => solicitarMatriculaLider('reparo-shower', 'Operadores — Reparo de Shower', abrirGerenciarOperadores) }, 'Operadores'),
  ]));
  container.appendChild(el('main', { class: 'app-main' }, [
    clockEl,
    el('div', { class: 'hora-hora-section' }, [
      el('div', { class: 'hora-hora-header' }, [el('h3', {}, 'Reparos + montagens por hora'), shiftSelectors]),
      grade,
    ]),
    reparoWrap,
    montagemWrap,
    el('div', { class: 'dashboard-grid' }, [variacaoCard, fluxoCard]),
    el('div', { class: 'table-section' }, [el('h3', {}, 'Lançamentos'), logWrap]),
  ]));

  function veiculosEstacao() { return getVeiculosByStation('reparo-shower'); }

  function eventosDoDia() {
    const hoje = dataOperacional();
    const eventos = [];
    getVeiculos().forEach(v => (v.showerEventos || []).forEach(ev => {
      if (v.dataOperacional === hoje && (ev.tipo === 'reparo-concluido' || ev.tipo === 'montagem-concluida')) {
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
      getOperadores('reparo-shower').forEach(o => {
        const liderCb = el('input', { type: 'checkbox' });
        liderCb.checked = !!o.lider;
        if (!temPermissao('admin')) liderCb.disabled = true;
        liderCb.addEventListener('change', () => setOperadorLider(o.matricula, 'reparo-shower', liderCb.checked));
        lista.appendChild(el('div', { class: 'manage-item' }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'info-linha' }, [
              el('span', { class: `status-dot ${o.lider ? 'admin' : 'operador'}` }),
              el('strong', { style: 'color:#eee' }, o.nome),
              el('label', { style: 'display:flex;align-items:center;gap:4px;font-size:0.72rem;color:#999;margin-left:8px' }, [liderCb, 'Líder/Team Leader']),
            ]),
            el('span', { style: 'font-size:0.78rem;color:#777' }, `Matrícula ${o.matricula}`),
          ]),
          el('button', { class: 'btn-del', onclick: () => { removeOperador(o.matricula, 'reparo-shower'); render2(); } }, 'Excluir'),
        ]));
      });
      if (!getOperadores('reparo-shower').length) lista.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum reparador cadastrado ainda.'));
    }
    render2();
    const content = el('div', {}, [el('h2', {}, 'Reparadores — Reparo de Shower'), lista, el('button', { class: 'btn-action btn-close', onclick: () => closeIt() }, 'Fechar')]);
    const closeIt = openModal(content);
  }

  function pedirMatricula(onOk) {
    const matriculaInput = el('input', { class: 'input-dark', placeholder: 'Matrícula do responsável' });
    const feedback = el('div', { class: 'feedback-matricula' });
    const nomeInput = el('input', { class: 'input-dark hidden', placeholder: 'Nome (novo cadastro)' });
    matriculaInput.addEventListener('input', () => {
      const op = getOperadores('reparo-shower').find(o => o.matricula === matriculaInput.value.trim());
      feedback.className = 'feedback-matricula';
      if (op) { feedback.textContent = `✓ ${op.nome}`; feedback.classList.add('encontrado'); nomeInput.classList.add('hidden'); }
      else if (matriculaInput.value.trim()) { feedback.textContent = 'Matrícula não cadastrada — informe o nome.'; feedback.classList.add('nao-encontrado'); nomeInput.classList.remove('hidden'); }
      else { feedback.textContent = ''; nomeInput.classList.add('hidden'); }
    });
    const erro = el('div', { class: 'form-error hidden' });
    const confirmarBtn = el('button', { class: 'btn-action btn-add' }, 'Confirmar');
    const content = el('div', {}, [
      el('h2', {}, 'Responsável'), matriculaInput, feedback, nomeInput, erro, confirmarBtn,
      el('button', { class: 'btn-action btn-close', onclick: () => close() }, 'Cancelar'),
    ]);
    const close = openModal(content);
    confirmarBtn.addEventListener('click', () => {
      const matricula = matriculaInput.value.trim();
      if (!matricula) { erro.textContent = 'Informe a matrícula.'; erro.classList.remove('hidden'); return; }
      let operador = getOperadores('reparo-shower').find(o => o.matricula === matricula);
      if (!operador) {
        const nome = nomeInput.value.trim();
        if (!nome) { erro.textContent = 'Informe o nome para cadastrar.'; erro.classList.remove('hidden'); return; }
        addOperador({ matricula, nome, estacao: 'reparo-shower' });
        operador = { matricula, nome: nome.toUpperCase() };
      }
      close();
      onOk(operador);
    });
  }

  function destinoFinalSelect() {
    return el('select', { class: 'input-dark', style: "margin-bottom:0;font-family:'Segoe UI',sans-serif" }, [
      el('option', { value: 'signoff' }, 'Sign Off'),
      el('option', { value: 'tunel' }, 'Túnel de Liberação'),
    ]);
  }

  function tabelaFila(titulo, lista, labelBtn, onConcluir) {
    const wrap = el('div', { class: 'table-section' });
    wrap.appendChild(el('h3', {}, titulo));
    const tableWrap = el('div', { class: 'table-wrapper' });
    if (!lista.length) {
      tableWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum veículo nesta fila.'));
    } else {
      const table = el('table', { class: 'log-table' }, [
        el('thead', {}, [el('tr', {}, [el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Ação')])]),
      ]);
      const tbody = el('tbody');
      lista.forEach(v => tbody.appendChild(el('tr', {}, [
        el('td', {}, v.vin), el('td', {}, v.modelo),
        el('td', {}, el('button', { class: 'rt-btn', style: `--btn-c:${station.accent}`, onclick: () => onConcluir(v) }, labelBtn)),
      ])));
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function renderFilas() {
    reparoWrap.innerHTML = '';
    montagemWrap.innerHTML = '';
    const aguardandoReparo = veiculosEstacao().filter(v => v.showerFase === 'reparo');
    const aguardandoMontagem = veiculosEstacao().filter(v => v.showerFase === 'montagem');

    reparoWrap.appendChild(tabelaFila('Aguardando reparo', aguardandoReparo, 'Concluir reparo', (v) => {
      pedirMatricula(() => {
        registrarEventoShower(v.vin, 'reparo-concluido', { usuario: getSessao()?.usuario });
        toast(`${v.vin} — reparo concluído, aguardando reteste na Inspeção de Shower.`, 'success');
      });
    }));

    montagemWrap.appendChild(tabelaFila('Aguardando montagem', aguardandoMontagem, 'Concluir montagem', (v) => {
      pedirMatricula(() => {
        const destino = destinoFinalSelect();
        const content = el('div', {}, [
          el('h2', {}, 'Concluir montagem'),
          el('p', { style: 'color:#aaa;font-size:0.85rem;margin-bottom:15px' }, `Enviar ${v.vin} para:`),
          destino,
          el('button', {
            class: 'btn-action btn-add', onclick: () => {
              registrarEventoShower(v.vin, 'montagem-concluida', { usuario: getSessao()?.usuario });
              moveVeiculo(v.vin, destino.value, { usuario: getSessao()?.usuario, acao: 'shower-montagem' });
              toast(`${v.vin} — montagem concluída, enviado para ${STATIONS_BY_ID[destino.value].nome}.`, 'success');
              closeIt();
            },
          }, 'Confirmar'),
        ]);
        const closeIt = openModal(content);
      });
    }));
  }

  function renderContadores() {
    const doTurno = eventosDoTurno();
    const doDia = eventosDoDia();
    contadores.innerHTML = '';
    contadores.appendChild(el('div', { class: 'stat-box highlight' }, [el('span', {}, 'Parcial do turno'), el('strong', {}, String(doTurno.length))]));
    contadores.appendChild(el('div', { class: 'stat-box' }, [el('span', {}, 'Concluídos hoje'), el('strong', {}, String(doDia.length))]));
    contadores.appendChild(el('div', { class: 'stat-box info' }, [el('span', {}, 'Em reparo/montagem'), el('strong', {}, String(veiculosEstacao().length))]));
  }

  function renderGrade() {
    const turno = TURNOS.find(t => t.id === turnoSelecionado);
    const doTurno = eventosDoTurno();
    grade.innerHTML = '';
    const horas = horasDoTurno(turno);
    for (let i = 0; i < horas; i++) {
      const qtd = doTurno.filter(e => e.faixa === i).length;
      grade.appendChild(el('div', { class: `box-hora ${qtd >= META_HORA_PADRAO ? 'active' : ''}` }, [
        el('span', {}, rotuloHoraReal(turno, i)), el('strong', {}, String(qtd)),
      ]));
    }
  }

  function renderLog() {
    const doDia = eventosDoDia().sort((a, b) => b.ts - a.ts);
    logWrap.innerHTML = '';
    if (!doDia.length) { logWrap.appendChild(el('div', { class: 'log-vazio' }, 'Nenhum lançamento hoje.')); return; }
    const table = el('table', { class: 'log-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', {}, 'Hora'), el('th', {}, 'VIN'), el('th', {}, 'Modelo'), el('th', {}, 'Tipo')])]),
    ]);
    const tbody = el('tbody');
    doDia.forEach(e => tbody.appendChild(el('tr', {}, [
      el('td', {}, horaAtualStr(new Date(e.ts))), el('td', {}, e.vin), el('td', {}, e.modelo),
      el('td', {}, el('span', { class: 'badge-tipo aprovado' }, e.tipo === 'reparo-concluido' ? 'Reparo' : 'Montagem')),
    ])));
    table.appendChild(tbody);
    logWrap.appendChild(table);
  }

  function ensureCharts() {
    if (charts.variacao) return;
    charts.variacao = new Chart(variacaoCard._canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [
        { label: 'Reparos + montagens', data: [], backgroundColor: station.accent, borderRadius: 4, datalabels: { display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0, color: '#fff', anchor: 'end', align: 'top', font: { size: 10, weight: 700 } } },
        { label: 'Meta', data: [], type: 'line', borderColor: '#22d3ee', pointRadius: 0, tension: 0.3 },
      ] },
      options: chartOptions(),
    });
    charts.fluxo = new Chart(fluxoCard._canvas.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [
        criarDatasetLinhaModerna('Entrada no reparo', '#38bdf8'),
        criarDatasetLinhaModerna('Reparos realizados', '#22c55e'),
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
        if (h.para === 'reparo-shower') entradas[idx]++;
        if (h.de === 'reparo-shower') saidas[idx]++;
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
    const realizadosPorHora = labelsHora.map((_, i) => doTurno.filter(e => e.faixa === i).length);

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
