let currentUnmount = null;

function iniciarApp() {
  montarHome();
}

// Chegadas/saídas por hora do dia a partir do histórico real de cada veículo
// (history[].para === chegada nesta estação, history[].de === saída desta estação).
// Genérico para qualquer estação — todas agora são estados reais de `station`.
function estacaoSeriesHoje(stationId) {
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const hoje0ts = hoje0.getTime();
  const chegadas = new Array(24).fill(0), saidas = new Array(24).fill(0);
  getVeiculos().forEach(v => {
    (v.history || []).forEach(h => {
      if (h.ts < hoje0ts) return;
      const hora = new Date(h.ts).getHours();
      // Road Test não é um `station` real (é sempre visto sobre a fila do Alinhamento),
      // então "chegada" é o lançamento/retorno no Alinhamento e "saída" é a decisão do
      // Road Test (acao:'road-test') — sem isso, os dois arrays ficam sempre zerados.
      if (stationId === 'roadtest') {
        if (h.acao === 'lancamento' || h.acao === 'retorno') chegadas[hora]++;
        if (h.acao === 'road-test') saidas[hora]++;
        return;
      }
      if (h.para === stationId) chegadas[hora]++;
      if (h.de === stationId) saidas[hora]++;
    });
  });
  return { chegadas, saidas };
}

function janelaHorasHoje() {
  const atual = new Date().getHours();
  const inicio = Math.max(0, atual - 6);
  const horas = [];
  for (let h = inicio; h <= atual; h++) horas.push(h);
  return horas;
}

function contarReparoTipo(stationId, tipo) {
  const hoje = dataOperacional();
  return getVeiculos().filter(v => v.dataOperacional === hoje && v.reparos[stationId] && v.reparos[stationId].tipo === tipo).length;
}

// Métricas mostradas no card e no painel — nunca soma "liberado" com "foi pra reparo"
// como se fosse a mesma coisa: cada tipo de estação mostra a dupla/tripla certa.
function estacaoMetricas(station) {
  if (station.tipo === 'entrada') {
    const hoje = dataOperacional();
    const eventosHoje = getEventosAlinhamento().filter(e => obterDataOperacionalAlinhamento(e.ts) === hoje);
    return [{ label: 'Entradas na produção hoje', value: eventosHoje.length }];
  }
  if (station.id === 'roadtest') {
    // Road Test nunca vira `v.station` de fato (opera direto sobre a fila do Alinhamento),
    // então os eventos que contam são os de acao:'road-test', não h.de === 'roadtest'.
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    let aprovados = 0, paraReparo = 0;
    getVeiculos().forEach(v => (v.history || []).forEach(h => {
      if (h.acao !== 'road-test' || h.ts < hoje0.getTime()) return;
      if (h.para === 'inspecao-shower') aprovados++;
      else if (ALL_REPAIR_STATION_IDS.includes(h.para)) paraReparo++;
    }));
    return [
      { label: 'Aprovados hoje', value: aprovados },
      { label: 'Para reparo hoje', value: paraReparo },
    ];
  }
  if (station.tipo === 'qualidade') {
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    let liberados = 0, paraReparo = 0;
    getVeiculos().forEach(v => (v.history || []).forEach(h => {
      if (h.de !== station.id || h.ts < hoje0.getTime()) return;
      if (h.para === 'liberado') liberados++;
      else if (ALL_REPAIR_STATION_IDS.includes(h.para)) paraReparo++;
    }));
    return [
      { label: 'Liberados hoje', value: liberados },
      { label: 'Para reparo hoje', value: paraReparo },
    ];
  }
  // reparo
  return [
    { label: 'Aprovados hoje', value: contarReparoTipo(station.id, 'aprovado') },
    { label: 'Inadequados hoje', value: contarReparoTipo(station.id, 'inadequado') },
    { label: 'Em reparo', value: getVeiculosByStation(station.id).length },
  ];
}

function buildSparkPath(values, w, h, max, pad) {
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  return values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
}

// Texto com o valor em cada "pico" (ponto que não é menor que os vizinhos) da mini-série
// do card — só nos picos (não em cada ponto) pra não poluir uma área tão pequena.
function buildSparkLabels(values, w, h, max, pad, color) {
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  let out = '';
  values.forEach((v, i) => {
    if (v <= 0) return;
    const prev = values[i - 1], next = values[i + 1];
    const ehPico = (prev === undefined || v >= prev) && (next === undefined || v >= next);
    if (!ehPico) return;
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    out += `<text class="spark-label" x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" fill="${color}">${v}</text>`;
  });
  return out;
}

// Card fica cinza e não clicável só quando HÁ sessão ativa sem acesso a essa estação
// (sem sessão nenhuma, o card continua clicável — é assim que se faz login).
function estacaoBloqueadaVisualmente(stationId) {
  const s = getSessao();
  return !!s && s.role !== 'admin' && !(s.estacoes || []).includes(stationId);
}

function montarHome() {
  if (currentUnmount) { currentUnmount(); currentUnmount = null; }
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const sessao = getSessao();
  const headerActions = [];
  if (sessao) {
    headerActions.push(el('span', { class: 'session-tag' }, `${sessao.usuario} · ${sessao.role}`));
    if (sessao.role === 'admin') headerActions.push(el('button', { class: 'admin', onclick: montarGerenciarUsuarios }, 'Usuários'));
    headerActions.push(el('button', { class: 'admin', onclick: logout }, 'Sair'));
  } else {
    headerActions.push(el('button', { class: 'admin', onclick: () => solicitarLoginAdmin(montarHome) }, 'Acesso administrativo'));
  }

  const header = el('header', {}, [
    el('div', { class: 'brand' }, [el('b', {}, 'FAI'), el('span', {}, 'Controle de Produção')]),
    el('div', { class: 'hdr-actions' }, headerActions),
  ]);

  const hero = el('div', { class: 'hero' }, [
    el('h1', { html: 'Linha de<br>Produção.' }),
    el('div', { class: 'desc', html: 'Passe o mouse em uma estação para<br>ver a evolução de chegadas e saídas<br>de veículos hoje.' }),
  ]);

  const grid = el('div', { class: 'grid' });
  const panelMain = el('div', {});
  const panelSide = el('div', { class: 'side' });

  function renderPanel(station) {
    const unlocked = podeAcessarEstacao(station.id);
    const idx = STATIONS.findIndex(s => s.id === station.id);
    panelMain.innerHTML = '';
    panelMain.appendChild(el('div', { class: 'tag' }, `Estação 0${idx + 1} de ${STATIONS.length}`));
    panelMain.appendChild(el('h2', {}, `${station.emoji} ${station.nome}`));
    panelMain.appendChild(el('div', { class: 'grp', style: `color:${station.accent}` }, station.grupo));
    panelMain.appendChild(el('p', {}, station.desc));

    panelSide.innerHTML = '';
    const kpisEl = el('div', { class: 'kpis' }, estacaoMetricas(station).map(k => el('div', { class: 'kpi' }, [
      el('span', {}, k.label), el('b', {}, String(k.value)),
    ])));
    panelSide.appendChild(kpisEl);
    panelSide.appendChild(el('div', { class: `lock ${unlocked ? 'ok' : ''}` }, unlocked ? '● Acesso liberado' : '🔒 Login necessário'));
    panelSide.appendChild(el('button', {
      class: 'go-btn',
      onclick: () => solicitarAcessoEstacao(station.id, () => abrirEstacao(station.id)),
    }, 'Acessar estação'));
  }

  STATIONS.forEach((s, i) => {
    const { chegadas, saidas } = estacaoSeriesHoje(s.id);
    const horas = janelaHorasHoje();
    const releasedVals = horas.map(h => saidas[h]);
    const enteredVals = horas.map(h => chegadas[h]);
    const max = Math.max(...releasedVals, ...enteredVals, 2) + 2;
    const W = 150, H = 46, PAD = 4;
    const dPath = buildSparkPath(releasedVals, W, H, max, PAD);
    const ePath = buildSparkPath(enteredVals, W, H, max, PAD);
    const step = (W - PAD * 2) / Math.max(1, releasedVals.length - 1);
    const lastX = PAD + (releasedVals.length - 1) * step;
    const lastY = H - PAD - (releasedVals[releasedVals.length - 1] / max) * (H - PAD * 2);
    const metricas = estacaoMetricas(s);
    const unlocked = podeAcessarEstacao(s.id);
    const bloqueada = estacaoBloqueadaVisualmente(s.id);

    const card = el('button', { class: `card ${bloqueada ? 'locked' : ''}`, style: `--c:${s.accent}` });
    if (bloqueada) card.disabled = true;
    const metricasHtml = metricas.map(m => `<div class="metric"><b>${m.value}</b><span>${m.label}</span></div>`).join('');
    card.innerHTML = `
      <div class="chead">
        <div class="badge" style="font-size:14px">${s.emoji}</div>
        <div class="names">
          <div class="eyebrow">Estação 0${i + 1}</div>
          <div class="title">${s.curto}</div>
        </div>
        <div class="lockdot ${unlocked ? 'unlocked' : ''}"></div>
      </div>
      <div class="metric-row">${metricasHtml}</div>
      <div class="chart-wrap">
        <svg viewBox="0 0 ${W} ${H}" width="100%" height="46">
          <path class="spark entrada" d="${ePath}" fill="none" stroke="#54545080" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="spark liberado" d="${dPath}" fill="none" stroke="${s.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle class="live-dot" cx="${lastX}" cy="${lastY}" r="2.6" fill="${s.accent}"/>
          ${buildSparkLabels(enteredVals, W, H, max, PAD, '#8a8a86')}
          ${buildSparkLabels(releasedVals, W, H, max, PAD, s.accent)}
        </svg>
        <div class="hrs">${horas.map(h => `<span>${h}h</span>`).join('')}</div>
      </div>
      <div class="legend">
        <div><i style="background:${s.accent}"></i>Liberado</div>
        <div><i style="background:#545450"></i>Entrada</div>
      </div>`;

    if (!bloqueada) {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.card').forEach(x => x.classList.remove('active'));
        card.classList.add('active');
        renderPanel(s);
      });
    }
    grid.appendChild(card);

    requestAnimationFrame(() => {
      const paths = card.querySelectorAll('.spark');
      let len = 0;
      paths.forEach(p => {
        len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      });
      const dot = card.querySelector('.live-dot');
      dot.style.opacity = 0;
      dot.style.transformOrigin = `${lastX}px ${lastY}px`;
      dot.style.transform = 'scale(0)';
      dot.style.transition = 'opacity .3s ease, transform .3s ease';

      card.addEventListener('pointerenter', () => {
        paths.forEach((p, pi) => {
          p.style.transition = `stroke-dashoffset ${900 + pi * 150}ms cubic-bezier(.22,1,.36,1) ${pi * 120}ms`;
          p.style.strokeDashoffset = 0;
        });
        setTimeout(() => { dot.style.opacity = 1; dot.style.transform = 'scale(1)'; }, 900);
      });
      card.addEventListener('pointerleave', () => {
        paths.forEach(p => {
          p.style.transition = 'stroke-dashoffset .4s ease';
          p.style.strokeDashoffset = len;
        });
        dot.style.opacity = 0;
        dot.style.transform = 'scale(0)';
      });
    });
  });

  const primeiraDesbloqueada = STATIONS.find(s => podeAcessarEstacao(s.id)) || STATIONS[0];
  const primeiroCard = grid.children[STATIONS.indexOf(primeiraDesbloqueada)];
  if (primeiroCard) primeiroCard.classList.add('active');
  renderPanel(primeiraDesbloqueada);

  root.appendChild(el('div', { class: 'home-v2' }, [
    header,
    hero,
    grid,
    el('div', { class: 'panel' }, [el('div', { class: 'pcard' }, [panelMain, panelSide])]),
  ]));
}

function abrirEstacao(stationId) {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  const station = STATIONS_BY_ID[stationId];
  const container = el('div', { style: `--accent-main:${station.accent}` });
  root.appendChild(container);

  if (stationId === 'alinhamento') currentUnmount = mountAlinhamento(container);
  else if (stationId === 'roadtest') currentUnmount = mountRoadTest(container);
  else if (stationId === 'transferencia') currentUnmount = mountTransferencia(container);
  else if (stationId === 'signoff') currentUnmount = mountSignOff(container);
  else if (stationId === 'tunel') currentUnmount = mountTunel(container);
  else if (stationId === 'inspecao-shower') currentUnmount = mountInspecaoShower(container);
  else if (stationId === 'reparo-shower') currentUnmount = mountReparoShower(container);
  else if (station.tipo === 'reparo') currentUnmount = mountRepairStation(container, stationId);
}

function voltarHome() {
  montarHome();
}

document.addEventListener('DOMContentLoaded', iniciarApp);
