// Hash de senha (SHA-256). Usa crypto.subtle quando disponível (https/localhost);
// em file:// ou navegadores sem SubtleCrypto, cai num hash simples (FNV-1a) —
// suficiente para não guardar a senha em texto puro num app local sem backend.
async function hashSenha(texto) {
  const alvo = 'caoa-fai::' + texto;
  if (window.crypto && window.crypto.subtle) {
    try {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(alvo));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { /* cai no fallback abaixo */ }
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < alvo.length; i++) {
    h ^= alvo.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'fnv1a-' + (h >>> 0).toString(16);
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Dataset padrão para os gráficos de linha "modernos" (entrada/saída/backlog): curva suave,
// linha fina, sem pontos fixos (só ao passar o mouse) e preenchimento em degradê sob a linha.
function criarDatasetLinhaModerna(label, cor, data = []) {
  return {
    label, data, borderColor: cor, borderWidth: 2.5, tension: 0.42,
    fill: 'origin',
    backgroundColor: (ctx) => {
      const { chartArea, ctx: c } = ctx.chart;
      if (!chartArea) return hexToRgba(cor, 0.15);
      const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      grad.addColorStop(0, hexToRgba(cor, 0.32));
      grad.addColorStop(1, hexToRgba(cor, 0));
      return grad;
    },
    pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 12,
    pointBackgroundColor: cor, pointBorderColor: '#0f0f0f', pointBorderWidth: 2,
    borderCapStyle: 'round', borderJoinStyle: 'round',
    datalabels: {
      display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
      color: cor, align: 'top', offset: 6, font: { size: 10, weight: 700 },
    },
  };
}

// Centraliza o eixo Y no zero (em vez de começar na base) para os gráficos de linha tipo
// "entrada/realizados/backlog" — dá espaço visual pra enxergar a variação pra cima e pra
// baixo, mesmo quando os valores atuais são só positivos.
function centralizarEixoY(chart, ...series) {
  const todos = series.flat();
  const maxV = Math.max(1, ...todos);
  const pad = Math.max(2, maxV);
  chart.options.scales.y.min = -pad;
  chart.options.scales.y.max = pad;
}

// Plugin de rótulos de valor nos gráficos (mostra o número em cada ponto/pico) — desligado
// por padrão; cada gráfico liga explicitamente onde faz sentido (ver chartOptions()).
if (window.Chart && window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
  Chart.defaults.plugins.datalabels = { display: false };
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function horaAtualStr(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function minutosDoDia(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function getTurnoAtual(d = new Date()) {
  const m = minutosDoDia(d);
  const [t1, t2, t3] = TURNOS;
  if (m >= t1.inicioMin && m < t1.fimMin) return t1;
  if (m >= t2.inicioMin || m < t2.fimMin) return t2; // cruza a meia-noite
  return t3;
}

// Dia operacional: o ciclo de 3 turnos vira à 06:05 (início do 1º turno), não à meia-noite.
// Tudo antes disso (2º turno tardio e o 3º turno inteiro) pertence ao dia anterior.
function dataOperacional(d = new Date()) {
  const m = minutosDoDia(d);
  const dia = new Date(d);
  if (m < TURNOS[0].inicioMin) dia.setDate(dia.getDate() - 1);
  return dia.toISOString().slice(0, 10);
}

// Índice de hora "cheia" dentro do turno (0,1,2...), usado para os quadros hora-a-hora.
function faixaHoraria(d, turno) {
  let m = minutosDoDia(d);
  if (m < turno.inicioMin) m += 24 * 60; // turno cruzou a meia-noite
  return Math.floor((m - turno.inicioMin) / 60);
}

// Quantas "horas cheias" o turno cobre — usado para dimensionar grades e eixos de gráfico.
function horasDoTurno(turno) {
  const total = turno.fimMin >= turno.inicioMin ? turno.fimMin - turno.inicioMin : (turno.fimMin + 1440) - turno.inicioMin;
  return Math.max(1, Math.ceil(total / 60));
}

// Rótulo com a hora real do relógio para a i-ésima hora do turno (ex.: "08h"), em vez
// do rótulo ordinal "1ª h" — usado nas grades e gráficos hora-a-hora.
function rotuloHoraReal(turno, i) {
  const m = (((turno.inicioMin + i * 60) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}h`;
}

// ---------- Específico do módulo Alinhamento (fiel ao sistema original) ----------

function alinhamentoMinutosDoDia(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function identificarFaixaAlinhamento(ts) {
  const m = alinhamentoMinutosDoDia(ts);
  return ALINHAMENTO_FAIXAS.find(f => m >= f.mIni && m < f.mFim) || ALINHAMENTO_FAIXAS[0];
}

function vinTemPrefixoValidoAlinhamento(vin) {
  const todosPrefixos = Object.values(ALINHAMENTO_PREFIXOS_MODELOS).flat();
  return todosPrefixos.some(p => vin.startsWith(p));
}

function lookupModeloAlinhamento(vin) {
  for (const [modelo, prefixos] of Object.entries(ALINHAMENTO_PREFIXOS_MODELOS)) {
    if (prefixos.some(p => vin.startsWith(p))) return modelo;
  }
  return 'OUTROS';
}

function obterDataOperacionalAlinhamento(ts) {
  const d = new Date(ts);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function lookupModelo(vin) {
  const v = (vin || '').toUpperCase();
  for (const prefixo in MODELOS_POR_PREFIXO) {
    if (v.startsWith(prefixo)) return MODELOS_POR_PREFIXO[prefixo];
  }
  return { modelo: 'NÃO IDENTIFICADO', marca: 'OUTRA' };
}

function formatDuracao(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${pad2(m)}m` : `${pad2(m)}m ${pad2(sec)}s`;
}

// ---------- Modal / toast genéricos ----------

function openModal(contentEl, { onClose } = {}) {
  const overlay = el('div', { class: 'modal-overlay' });
  const box = el('div', { class: 'modal-box' }, [contentEl]);
  const closeBtn = el('button', { class: 'modal-close', 'aria-label': 'Fechar', onclick: () => close() }, '✕');
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', escHandler);
  function escHandler(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.removeEventListener('keydown', escHandler);
    overlay.remove();
    if (onClose) onClose();
  }
  document.body.appendChild(overlay);
  return close;
}

function confirmSenha(senhaEsperada, titulo = 'Confirmação necessária') {
  return new Promise((resolve) => {
    const input = el('input', { type: 'password', class: 'input', placeholder: 'Senha', autofocus: 'true' });
    const erro = el('div', { class: 'form-error hidden' }, 'Senha incorreta.');
    const content = el('div', { class: 'password-modal' }, [
      el('h3', {}, titulo),
      input,
      erro,
      el('button', {
        class: 'btn btn-primary', onclick: () => tentar(),
      }, 'Confirmar'),
    ]);
    let resolved = false;
    const close = openModal(content, { onClose: () => { if (!resolved) resolve(false); } });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); });
    setTimeout(() => input.focus(), 30);
    function tentar() {
      if (input.value === senhaEsperada) {
        resolved = true;
        close();
        resolve(true);
      } else {
        erro.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    }
  });
}

// Modal de confirmação simples (Confirmar/Cancelar) — usado antes de ações que alteram
// o estado do veículo de forma perceptível, como "Remover" (ex-"Estornar").
function confirmarAcao(mensagem, titulo = 'Confirmar ação') {
  return new Promise((resolve) => {
    let resolved = false;
    const content = el('div', {}, [
      el('h2', {}, titulo),
      el('p', { style: 'color:#ccc;font-size:0.9rem;margin-bottom:20px;text-align:center;line-height:1.5' }, mensagem),
      el('button', {
        class: 'btn-action btn-add', onclick: () => { resolved = true; close(); resolve(true); },
      }, 'Confirmar'),
      el('button', {
        class: 'btn-action btn-close', onclick: () => { resolved = true; close(); resolve(false); },
      }, 'Cancelar'),
    ]);
    const close = openModal(content, { onClose: () => { if (!resolved) resolve(false); } });
  });
}

function toast(msg, tipo = 'info') {
  const t = el('div', { class: `toast toast-${tipo}` }, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 3200);
}

function montarTabBarVoltar(extraTabs = []) {
  return el('nav', { class: 'tab-bar' }, [
    el('button', { class: 'tab-btn', onclick: () => voltarHome() }, '← Início'),
    ...extraTabs,
    el('button', { class: 'tab-btn tab-sair', onclick: logout }, 'Sair'),
  ]);
}

// Monta um bloco de relógio + badge de turno que se atualiza sozinho a cada segundo.
// Retorna uma função de limpeza — chame ao desmontar a tela para não vazar o interval.
function montarRelogio() {
  const hora = el('div', { class: 'clock' });
  const badge = el('div', { class: 'shift-badge' });
  const wrap = el('div', { class: 'clock-container' }, [hora, badge]);
  function tick() {
    const now = new Date();
    hora.textContent = horaAtualStr(now);
    const turno = getTurnoAtual(now);
    badge.textContent = `${turno.nome} · ${turno.label}`;
  }
  tick();
  const timer = setInterval(tick, 1000);
  wrap._stop = () => clearInterval(timer);
  return wrap;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}
