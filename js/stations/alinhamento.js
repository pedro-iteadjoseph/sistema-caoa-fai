function mountAlinhamento(container) {
  container.className = 'alin-app';
  const sessao = getSessao();
  const role = sessao?.role === 'admin' ? 'admin' : 'operador';
  const podeGerenciar = role === 'admin';

  container.innerHTML = `
    <div class="modal-overlay" id="modal-novodia">
      <div class="modal">
        <h2>&#9888; INICIAR NOVO DIA</h2>
        <p>Todos os VINs, paradas e dados de produção do dia serão apagados.<br>Essa ação não pode ser desfeita.<br>Digite a senha de liberação para confirmar.</p>
        <input type="password" class="login-input" id="novodia-senha" placeholder="SENHA DE LIBERAÇÃO" autocomplete="off">
        <div class="login-erro" id="novodia-erro">&#10006; SENHA INCORRETA</div>
        <div class="modal-btns">
          <button class="modal-btn cancel" id="novodia-cancelar">CANCELAR</button>
          <button class="modal-btn confirm" id="novodia-confirmar">CONFIRMAR</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-parada">
      <div class="modal">
        <h2 style="color:var(--vermelho-suave)">&#9201; REGISTRAR PARADA</h2>
        <p>Tempo total da parada: <strong id="parada-tempo-display" style="color:var(--vermelho-suave); font-size:18px;"></strong></p>
        <select class="user-select" id="parada-motivo">
          ${ALINHAMENTO_MOTIVOS_PARADA.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
        <input type="text" class="login-input" id="parada-obs" placeholder="Observações (Opcional)">
        <div class="modal-btns">
          <button class="modal-btn cancel" id="parada-descartar">DESCARTAR</button>
          <button class="modal-btn confirm" id="parada-salvar">SALVAR REGISTRO</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-retorno">
      <div class="modal">
        <h2 style="color:var(--amarelo-destaque)">&#9888; VEÍCULO REPETIDO</h2>
        <p style="margin-bottom:16px;">O VIN <strong id="retorno-vin-display"></strong> já foi lançado.<br>Selecione o motivo do retorno:</p>
        <select class="user-select" id="retorno-motivo">
          ${ALINHAMENTO_MOTIVOS_RETORNO.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
        <input type="text" class="login-input" style="display:none;" id="retorno-especificar" placeholder="Escreva o motivo aqui...">
        <div class="modal-btns">
          <button class="modal-btn cancel" id="retorno-cancelar">CANCELAR</button>
          <button class="modal-btn confirm" style="background:var(--amarelo-destaque); color:#000;" id="retorno-confirmar">CONFIRMAR</button>
        </div>
      </div>
    </div>

    <div class="header">
      <div class="header-left">
        <div class="header-title">&bull; SISTEMA DE LANÇAMENTO</div>
        <div class="header-sub">ALINHAMENTO — ENTRADA DE VEÍCULOS</div>
      </div>
      <div class="header-right">
        <div class="user-status-box">
          <div class="user-status-label">OPERADOR ATIVO</div>
          <div class="user-status-name">${(sessao?.usuario || '—').toUpperCase()} (${role.toUpperCase()})</div>
          <button class="btn-logout" id="btn-alin-logout">Trocar usuário / Sair</button>
        </div>
        <div style="width:1px;height:40px;background:var(--border)"></div>
        <div class="hdr-cnt"><div class="hdr-cnt-label">MASSIVA</div><div class="hdr-cnt-val massiva" id="cnt-massiva">0</div></div>
        <div style="width:1px;height:40px;background:var(--border)"></div>
        <div class="hdr-cnt"><div class="hdr-cnt-label">PARCIAL TURNO</div><div class="hdr-cnt-val parcial" id="cnt-parcial">0</div></div>
        <div style="width:1px;height:40px;background:var(--border)"></div>
        <div class="hdr-cnt"><div class="hdr-cnt-label">TOTAL GERAL</div><div class="hdr-cnt-val geral" id="total-geral">0</div></div>
      </div>
    </div>

    <div class="turno-bar">
      <button class="btn-voltar-alin" id="btn-voltar-home">&larr; INÍCIO</button>
      <span class="turno-label">VISUALIZAR TURNO:</span>
      <div class="turno-btns">
        <button class="turno-btn active" id="t-btn-1">1&#186; TURNO</button>
        <button class="turno-btn" id="t-btn-2">2&#186; TURNO</button>
        <button class="turno-btn" id="t-btn-3">3&#186; TURNO</button>
      </div>
      <span class="turno-info" id="turno-info-label"></span>
      <button class="btn-novo-dia" id="btn-novo-dia">&#8634; INICIAR NOVO DIA</button>
    </div>

    <div class="nav" id="nav-bar">
      <button class="nav-btn active" data-aba="lancamento">&#11041; LANÇAMENTO</button>
      <button class="nav-btn" data-aba="alinhamento">&#9638; ALINHAMENTO</button>
      <button class="nav-btn" data-aba="indicador">&#10792; INDICADORES</button>
      <button class="nav-btn" data-aba="impactos">&#9888; IMPACTOS</button>
      <button class="nav-btn" data-aba="massiva">&#9888; CONTROLE DE MASSIVA</button>
      <button class="nav-btn" data-aba="usuarios">&#128101; GERENCIAR USUÁRIOS</button>
    </div>

    <div class="content">
      <div class="aba active" id="aba-lancamento">
        <div class="lancamento-wrap">
          <div class="relogio" id="relogio">00:00:00</div>
          <div class="parada-timer" id="parada-timer">TEMPO DE PARADA: 00:00</div>
          <button id="btn-parada" class="btn-parada">&#9203; INICIAR PARADA</button>
          <div class="turno-ativo-badge" id="turno-badge">1&#186; TURNO</div>
          <div class="alin-btns">
            <button class="alin-btn btn-azul active" id="btn-alin-1">ALINHAMENTO 1</button>
            <button class="alin-btn btn-amarelo" id="btn-alin-2">ALINHAMENTO 2</button>
          </div>
          <div class="form-wrap">
            <div class="form-label">Bipe ou digite o VIN</div>
            <input id="vin-input" class="vin-input input-azul" type="text" placeholder="VIN DO VEÍCULO" autocomplete="off">
            <button id="btn-lancar-vin" class="btn-lancar btn-lancar-azul"><span class="btn-lancar-texto" id="btn-lancar-texto">REGISTRAR</span></button>
          </div>
          <div id="feedback" style="display:none"></div>
          <div class="contadores">
            <div class="contador"><div class="contador-num" id="cnt-alin1">0</div><div class="contador-label">ALINHAMENTO 1</div></div>
            <div class="contador"><div class="contador-num" id="cnt-alin2">0</div><div class="contador-label">ALINHAMENTO 2</div></div>
          </div>
        </div>
      </div>

      <div class="aba" id="aba-alinhamento">
        <div class="search-container">
          <input type="text" class="search-input" id="search-vin" placeholder="DIGITE O VIN PARA BUSCAR...">
          <div id="search-status"></div>
        </div>
        <div class="sub-tabs">
          <button class="sub-tab active" id="subtab-1">ALINHAMENTO 1</button>
          <button class="sub-tab" id="subtab-2">ALINHAMENTO 2</button>
        </div>
        <div style="font-size:16px;font-weight:700;color:var(--cinza-destaque);letter-spacing:2px;margin-bottom:20px" id="alin-titulo"></div>
        <div class="faixas-wrap" id="faixas-wrap"></div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div class="tabela-label">TODOS OS VINs LANÇADOS NO TURNO</div>
          <button class="btn-filter-massiva" id="btn-filter-massiva">Filtrar Massiva</button>
        </div>
        <table class="tabela-nativa">
          <thead><tr><th>#</th><th>VIN</th><th>HORÁRIO</th><th>FAIXA</th><th>TURNO</th><th>OBS/RETORNO</th></tr></thead>
          <tbody id="tabela-body"></tbody>
        </table>
      </div>

      <div class="aba" id="aba-indicador">
        <div class="tabela-label" id="titulo-turno-tabela"></div>
        <div id="ind-parcial-tabelas"></div>
        <div class="tabela-label" style="margin-top:24px;">INDICADOR POR MODELO DE VEÍCULO</div>
        <div id="ind-modelos-wrap" style="margin-bottom:24px;"></div>
        <div class="tabela-label" style="margin-top:24px;">INDICADOR GERAL — RESUMO DOS TURNOS</div>
        <div id="ind-geral-wrap"></div>
      </div>

      <div class="aba" id="aba-impactos">
        <div style="font-size:16px;font-weight:700;color:var(--cinza-destaque);letter-spacing:2px;margin-bottom:20px">IMPACTOS NO PROCESSO (RETORNOS E PARADAS)</div>
        <div style="display:flex; gap:24px; margin-bottom:32px; flex-wrap:wrap;">
          <div class="user-status-box" style="flex:1; min-width:200px;">
            <div class="user-status-label">TOTAL DE VEÍCULOS RETORNADOS</div>
            <div class="user-status-name" id="impacto-total-retornos" style="font-size:32px; color:var(--amarelo-destaque);">0</div>
          </div>
          <div class="user-status-box" style="flex:1; min-width:200px;">
            <div class="user-status-label">TEMPO PARADO — ALINHAMENTO 1</div>
            <div class="user-status-name" id="impacto-tempo-alin1" style="font-size:32px; color:var(--azul-ativo);">00h 00m</div>
          </div>
          <div class="user-status-box" style="flex:1; min-width:200px;">
            <div class="user-status-label">TEMPO PARADO — ALINHAMENTO 2</div>
            <div class="user-status-name" id="impacto-tempo-alin2" style="font-size:32px; color:var(--amarelo-claro);">00h 00m</div>
          </div>
        </div>
        <div class="tabela-label">HISTÓRICO DE PARADAS</div>
        <table class="tabela-nativa">
          <thead><tr><th>ALINHAMENTO</th><th>INÍCIO</th><th>FIM</th><th>DURAÇÃO</th><th>MOTIVO</th><th>OBSERVAÇÃO</th></tr></thead>
          <tbody id="tabela-paradas-body"></tbody>
        </table>
        <div class="tabela-label" style="margin-top:32px;">VEÍCULOS COM RETORNO</div>
        <table class="tabela-nativa">
          <thead><tr><th>VIN</th><th>HORÁRIO</th><th>TURNO</th><th>MOTIVO DO RETORNO</th></tr></thead>
          <tbody id="tabela-retornos-body"></tbody>
        </table>
      </div>

      <div class="aba" id="aba-massiva">
        <div style="font-size:16px; font-weight:700; color:var(--branco); letter-spacing:2px; margin-bottom:12px;">CONFIGURAÇÃO DA LISTA MASSIVA</div>
        <div class="massiva-config-wrap">
          <textarea class="massiva-textarea" id="massiva-list-input" placeholder="Cole os VINs aqui, um por linha..."></textarea>
          <button class="btn-massiva-save" id="btn-massiva-save">SALVAR LISTA DE MASSIVA</button>
        </div>
      </div>

      <div class="aba" id="aba-usuarios">
        <div style="font-size:16px; font-weight:700; color:var(--branco); letter-spacing:2px; margin-bottom:12px;">GERENCIAR USUÁRIOS</div>
        <p style="color:var(--texto-sec); font-size:13px; max-width:600px; line-height:1.6; margin-bottom:20px;">
          O cadastro de usuários é compartilhado com todo o sistema (todas as estações). Use o painel abaixo para criar operadores e definir a quais estações eles têm acesso.
        </p>
        <button class="btn-massiva-save" style="background:var(--cinza-destaque); color:#000; max-width:340px;" id="btn-abrir-usuarios">ABRIR GERENCIAMENTO DE USUÁRIOS</button>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const $$ = (sel) => [...container.querySelectorAll(sel)];

  let turnoView = parseInt(localStorage.getItem('ali_turno') || '1', 10);
  let alinSelecionado = 'ALINHAMENTO 1';
  let subTabSelecionada = 'ALINHAMENTO 1';
  let vinPendenteRetorno = null;
  let filtroMassivaAtivo = false;
  let paradaInicioTs = null;
  let paradaInterval = null;
  let turnoRealAtual = getTurnoAtual().id;
  let fbTimer = null;
  let unsubDb = null;
  let relogioInterval = null;

  function verificarPermissao() { return role === 'admin'; }

  function bloquearAcao(msg) {
    toast(msg, 'warn');
  }

  // ---------- Navegação ----------
  function abrirAba(id) {
    $$('.aba').forEach(a => a.classList.remove('active'));
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    $('#aba-' + id).classList.add('active');
    $(`.nav-btn[data-aba="${id}"]`).classList.add('active');
    if (id === 'alinhamento') renderAlinhamentoTab();
    if (id === 'indicador') renderIndicadores();
    if (id === 'impactos') renderImpactos();
    if (id === 'massiva') renderMassivaTab();
    if (id === 'lancamento') setTimeout(() => $('#vin-input').focus(), 100);
  }
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.aba;
    if ((id === 'massiva' || id === 'usuarios') && !verificarPermissao()) {
      bloquearAcao('Apenas administradores podem acessar essa aba.');
      return;
    }
    abrirAba(id);
  }));
  $('#btn-voltar-home').addEventListener('click', () => voltarHome());
  $('#btn-alin-logout').addEventListener('click', logout);
  $('#btn-abrir-usuarios').addEventListener('click', () => {
    if (!verificarPermissao()) { bloquearAcao('Apenas administradores podem gerenciar usuários.'); return; }
    montarGerenciarUsuarios();
  });

  // ---------- Turno ----------
  function selecionarTurno(n) {
    turnoView = n;
    localStorage.setItem('ali_turno', turnoView);
    [1, 2, 3].forEach(i => $('#t-btn-' + i).classList.toggle('active', i === n));
    $('#turno-info-label').textContent = ALINHAMENTO_TURNOS_INFO[n].range;
    renderAll();
  }
  [1, 2, 3].forEach(n => $('#t-btn-' + n).addEventListener('click', () => selecionarTurno(n)));

  // ---------- Novo dia ----------
  $('#btn-novo-dia').addEventListener('click', () => {
    $('#novodia-senha').value = '';
    $('#novodia-erro').style.display = 'none';
    $('#modal-novodia').classList.add('show');
    setTimeout(() => $('#novodia-senha').focus(), 100);
  });
  $('#novodia-cancelar').addEventListener('click', () => $('#modal-novodia').classList.remove('show'));
  $('#novodia-confirmar').addEventListener('click', () => {
    const senha = $('#novodia-senha').value.trim();
    if (senha !== '122464') {
      $('#novodia-erro').style.display = 'block';
      $('#novodia-senha').value = '';
      $('#novodia-senha').focus();
      return;
    }
    registrarReinicio(sessao?.usuario || '—');
    $('#modal-novodia').classList.remove('show');
    abrirAba('lancamento');
    toast('Novo dia iniciado.', 'success');
  });
  $('#novodia-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#novodia-confirmar').click(); });

  // ---------- Alinhamento 1/2 ----------
  function selecionarAlin(alin) {
    alinSelecionado = alin;
    const input = $('#vin-input');
    const btnLancar = $('#btn-lancar-vin');
    if (alin === 'ALINHAMENTO 1') {
      $('#btn-alin-1').className = 'alin-btn btn-azul active';
      $('#btn-alin-2').className = 'alin-btn btn-amarelo';
      input.className = 'vin-input input-azul';
      btnLancar.className = 'btn-lancar btn-lancar-azul';
    } else {
      $('#btn-alin-1').className = 'alin-btn btn-azul';
      $('#btn-alin-2').className = 'alin-btn btn-amarelo active';
      input.className = 'vin-input input-amarelo';
      btnLancar.className = 'btn-lancar btn-lancar-amarelo';
    }
    input.focus();
  }
  $('#btn-alin-1').addEventListener('click', () => selecionarAlin('ALINHAMENTO 1'));
  $('#btn-alin-2').addEventListener('click', () => selecionarAlin('ALINHAMENTO 2'));

  // ---------- Parada ----------
  function checarEstadoParada() {
    const ts = localStorage.getItem('ali_parada_ts');
    if (ts) { paradaInicioTs = parseInt(ts, 10); iniciarUIParada(); }
  }
  function toggleParada() { if (!paradaInicioTs) { paradaInicioTs = Date.now(); localStorage.setItem('ali_parada_ts', paradaInicioTs); iniciarUIParada(); } else { finalizarUIParada(); } }
  function iniciarUIParada() {
    const btn = $('#btn-parada'), relogio = $('#relogio'), timerDisplay = $('#parada-timer');
    btn.classList.add('active'); btn.innerHTML = '&#9201; FINALIZAR PARADA';
    relogio.style.color = 'var(--vermelho-suave)'; timerDisplay.style.display = 'block';
    paradaInterval = setInterval(() => {
      const diff = Date.now() - paradaInicioTs;
      const m = Math.floor(diff / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      timerDisplay.textContent = `TEMPO DE PARADA: ${m}:${s}`;
    }, 1000);
  }
  function finalizarUIParada() {
    clearInterval(paradaInterval);
    const diffMs = Date.now() - paradaInicioTs;
    const m = Math.floor(diffMs / 60000).toString().padStart(2, '0');
    const s = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    const btn = $('#btn-parada'), relogio = $('#relogio'), timerDisplay = $('#parada-timer');
    btn.classList.remove('active'); btn.innerHTML = '&#9203; INICIAR PARADA';
    relogio.style.color = 'var(--cinza-destaque)'; timerDisplay.style.display = 'none';
    $('#parada-tempo-display').textContent = `${m}m ${s}s`;
    $('#modal-parada').classList.add('show');
    setTimeout(() => $('#parada-motivo').focus(), 100);
  }
  $('#btn-parada').addEventListener('click', toggleParada);
  $('#parada-salvar').addEventListener('click', () => {
    const motivo = $('#parada-motivo').value;
    const obs = $('#parada-obs').value;
    const diffMs = Date.now() - paradaInicioTs;
    registrarParada({
      alinhamento: alinSelecionado, inicio: paradaInicioTs, fim: Date.now(), duracaoMs: diffMs,
      motivo, obs, turno: identificarFaixaAlinhamento(paradaInicioTs).turno,
    });
    limparEstadoParada();
    mostrarFeedback('ok', 'PARADA REGISTRADA', '');
  });
  $('#parada-descartar').addEventListener('click', () => limparEstadoParada());
  function limparEstadoParada() {
    paradaInicioTs = null;
    localStorage.removeItem('ali_parada_ts');
    $('#parada-obs').value = '';
    $('#modal-parada').classList.remove('show');
    $('#vin-input').focus();
  }

  // ---------- Lançamento ----------
  function mostrarFeedback(tipo, msg, sub) {
    const elFb = $('#feedback');
    elFb.style.display = 'block';
    elFb.className = 'feedback ' + tipo;
    elFb.innerHTML = `<div class="feedback-msg">${msg}</div><div class="feedback-sub">${sub}</div>`;
    clearTimeout(fbTimer);
    fbTimer = setTimeout(() => {
      elFb.style.display = 'none';
      if (!vinPendenteRetorno && !paradaInicioTs) $('#vin-input').focus();
    }, 2500);
  }
  function animarBotaoLancar(classeAnim, texto) {
    const btn = $('#btn-lancar-vin');
    const span = $('#btn-lancar-texto');
    clearTimeout(btn._holdTimer); clearTimeout(btn._swapTimer);
    if (!btn._textoOriginal) btn._textoOriginal = span.textContent;
    btn.classList.remove('btn-lancar-sucesso', 'btn-lancar-erro');
    span.style.opacity = '1';
    span.textContent = texto;
    void btn.offsetWidth;
    btn.classList.add(classeAnim);
    btn._holdTimer = setTimeout(() => {
      span.style.opacity = '0';
      btn.classList.remove(classeAnim);
      btn._swapTimer = setTimeout(() => { span.textContent = btn._textoOriginal; span.style.opacity = '1'; }, 350);
    }, 1700);
  }
  function lancar() {
    const input = $('#vin-input');
    const vin = input.value.trim().toUpperCase();
    if (!vin) return;
    if (!vinTemPrefixoValidoAlinhamento(vin)) { animarBotaoLancar('btn-lancar-erro', 'VIN INCORRETO'); return; }
    const existente = getVeiculo(vin);
    if (existente) {
      vinPendenteRetorno = vin;
      mostrarFeedback('erro', vin, `REPETIDO — última estação: ${STATIONS_BY_ID[existente.station]?.nome || existente.station}.`);
      $('#retorno-vin-display').textContent = vin;
      $('#modal-retorno').classList.add('show');
      setTimeout(() => $('#retorno-motivo').focus(), 100);
      input.value = '';
      return;
    }
    try {
      lancarNoAlinhamento(vin, { usuario: sessao?.usuario, alinhamentoId: alinSelecionado });
      animarBotaoLancar('btn-lancar-sucesso', vin);
      input.value = '';
    } catch (e) {
      animarBotaoLancar('btn-lancar-erro', 'ERRO AO LANÇAR');
    }
  }
  $('#btn-lancar-vin').addEventListener('click', lancar);
  $('#vin-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') lancar(); });

  $('#retorno-motivo').addEventListener('change', (e) => {
    $('#retorno-especificar').style.display = e.target.value === 'Outro motivo' ? 'block' : 'none';
    if (e.target.value === 'Outro motivo') $('#retorno-especificar').focus();
  });
  $('#retorno-confirmar').addEventListener('click', () => {
    let m = $('#retorno-motivo').value;
    if (m === 'Outro motivo') m = $('#retorno-especificar').value.trim() || 'Outro motivo';
    if (vinPendenteRetorno) {
      relancarAlinhamentoComRetorno(vinPendenteRetorno, { usuario: sessao?.usuario, alinhamentoId: alinSelecionado, motivo: m });
      animarBotaoLancar('btn-lancar-sucesso', vinPendenteRetorno);
    }
    cancelarRetorno();
  });
  $('#retorno-cancelar').addEventListener('click', cancelarRetorno);
  function cancelarRetorno() {
    vinPendenteRetorno = null;
    $('#modal-retorno').classList.remove('show');
    $('#retorno-motivo').value = 'Realinhar Veículo';
    $('#retorno-especificar').style.display = 'none';
    $('#retorno-especificar').value = '';
    $('#vin-input').focus();
  }

  // ---------- Busca ----------
  $('#search-vin').addEventListener('input', (e) => pesquisarVIN(e.target.value));
  function pesquisarVIN(query) {
    const q = query.trim().toUpperCase();
    $('#search-vin').value = q;
    const status = $('#search-status');
    if (!q) { status.innerHTML = ''; return; }
    const passagens = getEventosAlinhamento().filter(v => v.vin.includes(q));
    status.innerHTML = passagens.length === 0
      ? `<span class="search-result" style="color:var(--vermelho-suave)">&#10006; NÃO ENCONTRADO</span>`
      : `<span class="search-result" style="color:var(--amarelo-destaque)">&#10003; DETECTADO em ${passagens[passagens.length - 1].alinhamentoId}</span>`;
  }

  // ---------- Sub-tabs (aba Alinhamento) ----------
  function selecionarSubTab(alin) {
    subTabSelecionada = alin;
    $('#subtab-1').classList.toggle('active', alin === 'ALINHAMENTO 1');
    $('#subtab-2').classList.toggle('active', alin === 'ALINHAMENTO 2');
    renderAlinhamentoTab();
  }
  $('#subtab-1').addEventListener('click', () => selecionarSubTab('ALINHAMENTO 1'));
  $('#subtab-2').addEventListener('click', () => selecionarSubTab('ALINHAMENTO 2'));
  $('#btn-filter-massiva').addEventListener('click', () => {
    filtroMassivaAtivo = !filtroMassivaAtivo;
    $('#btn-filter-massiva').classList.toggle('active', filtroMassivaAtivo);
    renderAlinhamentoTab();
  });

  // ---------- Massiva ----------
  $('#btn-massiva-save').addEventListener('click', () => {
    if (!verificarPermissao()) { bloquearAcao('Apenas administradores podem salvar a lista de massiva.'); return; }
    setMassivaTexto($('#massiva-list-input').value);
    toast('Lista de massiva salva.', 'success');
  });
  function renderMassivaTab() {
    const textarea = $('#massiva-list-input');
    if (document.activeElement !== textarea) textarea.value = getMassivaTexto();
  }

  // ---------- Relógio ----------
  function atualizarRelogio() {
    const agora = Date.now();
    $('#relogio').textContent = new Date(agora).toLocaleTimeString('pt-BR');
    const faixaAtual = identificarFaixaAlinhamento(agora);
    if (turnoRealAtual !== faixaAtual.turno) turnoRealAtual = faixaAtual.turno;
    $('#turno-badge').textContent = `${ALINHAMENTO_TURNOS_INFO[turnoRealAtual].label} • ${ALINHAMENTO_TURNOS_INFO[turnoRealAtual].range}`;
  }

  // ---------- Renderização ----------
  function atualizarContadoresHeader() {
    const eventos = getEventosAlinhamento();
    const massivaLista = getMassivaLista();
    const vT = eventos.filter(v => v.turno === turnoView);
    $('#cnt-massiva').textContent = eventos.filter(v => massivaLista.includes(v.vin)).length;
    $('#cnt-alin1').textContent = vT.filter(v => v.alinhamentoId === 'ALINHAMENTO 1').length;
    $('#cnt-alin2').textContent = vT.filter(v => v.alinhamentoId === 'ALINHAMENTO 2').length;
    $('#cnt-parcial').textContent = vT.length;
    $('#total-geral').textContent = eventos.length;
  }

  function renderAlinhamentoTab() {
    $('#alin-titulo').textContent = `${subTabSelecionada} — HORA A HORA (${ALINHAMENTO_TURNOS_INFO[turnoView].label})`;
    const eventos = getEventosAlinhamento();
    let listaTurno = eventos.filter(v => v.alinhamentoId === subTabSelecionada && v.turno === turnoView);
    const mAgora = alinhamentoMinutosDoDia(Date.now());
    const faixasDoTurno = ALINHAMENTO_FAIXAS.filter(f => f.turno === turnoView);
    const massivaLista = getMassivaLista();

    $('#faixas-wrap').innerHTML = faixasDoTurno.map(f => {
      const veics = listaTurno.filter(v => v.faixaId === f.id);
      const atual = mAgora >= f.mIni && mAgora < f.mFim;
      const meta = getMeta(f);
      const perc = meta > 0 ? Math.min((veics.length / meta) * 100, 100) : 0;
      const fillCor = subTabSelecionada === 'ALINHAMENTO 1' ? 'rgba(52,152,219,0.25)' : 'rgba(252,235,161,0.25)';
      return `<div class="faixa-card ${atual ? 'atual' : ''}">
        <div class="faixa-fill" style="height:${perc}%; background:${fillCor};"></div>
        <div class="faixa-content"><div class="faixa-header">${f.lbl}</div><div class="faixa-qtd">${veics.length}</div></div>
      </div>`;
    }).join('');

    if (filtroMassivaAtivo) listaTurno = listaTurno.filter(v => massivaLista.includes(v.vin));
    const tbody = $('#tabela-body');
    if (!listaTurno.length) { tbody.innerHTML = `<tr><td colspan="6" style="color:var(--texto-sec); padding:24px;">Nenhum veículo lançado neste turno</td></tr>`; return; }
    tbody.innerHTML = listaTurno.slice().reverse().map((v, i) => {
      const f = ALINHAMENTO_FAIXAS.find(fx => fx.id === v.faixaId);
      const faixaStr = f ? f.lbl.replace('h', ':00') : '-';
      return `<tr><td>${listaTurno.length - i}</td><td>${massivaLista.includes(v.vin) ? '🔺 ' : ''}${v.vin}</td><td>${new Date(v.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td>${faixaStr}</td><td>${v.turno}º Turno</td><td style="color:${v.retorno ? 'var(--vermelho-suave)' : 'var(--verde-suave)'}; font-weight:bold;">${v.retorno ? v.motivo : 'OK'}</td></tr>`;
    }).join('');
  }

  function renderIndicadores() {
    $('#titulo-turno-tabela').textContent = `INDICADOR PARCIAL — ${ALINHAMENTO_TURNOS_INFO[turnoView].label}`;
    const eventos = getEventosAlinhamento();
    const faixasTurno = ALINHAMENTO_FAIXAS.filter(f => f.turno === turnoView);
    let pTotMeta = 0, pTotProd = 0;
    const linhas = faixasTurno.map(f => {
      const prod = eventos.filter(v => v.faixaId === f.id).length;
      const meta = getMeta(f);
      const dif = prod - meta;
      pTotMeta += meta; pTotProd += prod;
      const metaCell = verificarPermissao()
        ? `<input type="number" class="input-meta-live" value="${meta}" data-faixa="${f.id}">`
        : meta;
      const cls = dif >= 0 ? 'positivo' : 'negativo';
      return `<tr><td>${f.lbl}</td><td>${metaCell}</td><td>${prod}</td><td class="${cls}">${dif >= 0 ? '+' + dif : dif}</td><td class="${cls}">${meta > 0 ? Math.round((prod / meta) * 100) : 0}%</td></tr>`;
    }).join('');
    const clsT = (pTotProd - pTotMeta) >= 0 ? 'positivo' : 'negativo';
    $('#ind-parcial-tabelas').innerHTML = `<table class="tabela-nativa"><thead><tr><th>H/H</th><th>META</th><th>PROD</th><th>DIF</th><th>%</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td>TTL</td><td>${pTotMeta}</td><td>${pTotProd}</td><td class="${clsT}">${(pTotProd - pTotMeta) >= 0 ? '+' + (pTotProd - pTotMeta) : (pTotProd - pTotMeta)}</td><td class="${clsT}">${pTotMeta > 0 ? Math.round((pTotProd / pTotMeta) * 100) : 0}%</td></tr></tfoot></table>`;
    $$('.input-meta-live').forEach(inp => inp.addEventListener('change', (e) => {
      if (!verificarPermissao()) { bloquearAcao('Sem permissão para alterar metas.'); renderIndicadores(); return; }
      setMeta(e.target.dataset.faixa, e.target.value);
    }));

    const contagem = { 'T-19': 0, 'T-1E': 0, 'T-18': 0, 'UNI-T': 0, 'CS75': 0, 'C655': 0, 'OUTROS': 0 };
    eventos.forEach(v => {
      const chave = lookupModeloAlinhamento(v.vin);
      contagem[chave] = (contagem[chave] || 0) + 1;
    });
    $('#ind-modelos-wrap').innerHTML = `<table class="tabela-nativa"><tbody><tr><td>T-19: ${contagem['T-19']}</td><td>T-1E: ${contagem['T-1E']}</td><td>T-18: ${contagem['T-18']}</td><td>UNI-T: ${contagem['UNI-T']}</td><td>CS75: ${contagem['CS75']}</td><td>C655: ${contagem['C655']}</td></tr></tbody></table>`;

    const resumo = { 1: { meta: 0, prod: 0 }, 2: { meta: 0, prod: 0 }, 3: { meta: 0, prod: 0 } };
    ALINHAMENTO_FAIXAS.forEach(f => { resumo[f.turno].meta += getMeta(f); });
    eventos.forEach(v => { if (resumo[v.turno]) resumo[v.turno].prod++; });
    let totM = 0, totP = 0;
    const linhasGerais = [1, 2, 3].map(t => {
      const d = resumo[t]; const dif = d.prod - d.meta; totM += d.meta; totP += d.prod;
      const cls = dif >= 0 ? 'positivo' : 'negativo';
      return `<tr><td class="titulo-linha" style="padding-left:24px; font-weight:bold;">${ALINHAMENTO_TURNOS_INFO[t].label}</td><td>${d.meta}</td><td>${d.prod}</td><td class="${cls}">${dif >= 0 ? '+' + dif : dif}</td><td class="${cls}">${d.meta > 0 ? Math.round((d.prod / d.meta) * 100) : 0}%</td></tr>`;
    }).join('');
    const clsG = (totP - totM) >= 0 ? 'positivo' : 'negativo';
    $('#ind-geral-wrap').innerHTML = `<table class="tabela-nativa"><thead><tr><th style="text-align:left; padding-left:24px;">TURNO</th><th>META TOTAL</th><th>PRODUZIDO</th><th>DIFERENÇA</th><th>EFICIÊNCIA</th></tr></thead><tbody>${linhasGerais}</tbody><tfoot><tr><td style="text-align:left; padding-left:24px;">TOTAL ACUMULADO</td><td>${totM}</td><td>${totP}</td><td class="${clsG}">${(totP - totM) >= 0 ? '+' + (totP - totM) : (totP - totM)}</td><td class="${clsG}">${totM > 0 ? Math.round((totP / totM) * 100) : 0}%</td></tr></tfoot></table>`;
  }

  function formatarHorasMinutos(totalMs) {
    const totalMin = Math.floor(totalMs / 60000);
    const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    return `${h}h ${m}m`;
  }
  function renderImpactos() {
    const eventos = getEventosAlinhamento();
    const retornos = eventos.filter(v => v.retorno);
    $('#impacto-total-retornos').textContent = retornos.length;
    const paradas = getParadas();
    const msAlin1 = paradas.filter(p => p.alinhamento === 'ALINHAMENTO 1').reduce((acc, p) => acc + p.duracaoMs, 0);
    const msAlin2 = paradas.filter(p => p.alinhamento === 'ALINHAMENTO 2').reduce((acc, p) => acc + p.duracaoMs, 0);
    $('#impacto-tempo-alin1').textContent = formatarHorasMinutos(msAlin1);
    $('#impacto-tempo-alin2').textContent = formatarHorasMinutos(msAlin2);

    const tbodyP = $('#tabela-paradas-body');
    tbodyP.innerHTML = !paradas.length ? `<tr><td colspan="6">Nenhuma parada registrada.</td></tr>` : paradas.map(p => {
      const m = Math.floor(p.duracaoMs / 60000).toString().padStart(2, '0');
      const s = Math.floor((p.duracaoMs % 60000) / 1000).toString().padStart(2, '0');
      return `<tr><td>${p.alinhamento}</td><td>${new Date(p.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td>${new Date(p.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td style="color:var(--vermelho-suave);font-weight:bold;">${m}:${s}</td><td>${p.motivo}</td><td>${p.obs || '-'}</td></tr>`;
    }).join('');

    const tbodyR = $('#tabela-retornos-body');
    tbodyR.innerHTML = !retornos.length ? `<tr><td colspan="4">Nenhum retorno registrado.</td></tr>` : retornos.slice().reverse().map(v => `<tr><td style="color:var(--amarelo-destaque);font-weight:bold;">${v.vin}</td><td>${new Date(v.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td>${v.turno}º Turno</td><td style="color:var(--vermelho-suave);">${v.motivo}</td></tr>`).join('');
  }

  function renderAll() {
    atualizarContadoresHeader();
    const activeAba = $('.aba.active')?.id?.replace('aba-', '');
    if (activeAba === 'alinhamento') renderAlinhamentoTab();
    if (activeAba === 'indicador') renderIndicadores();
    if (activeAba === 'impactos') renderImpactos();
  }

  // ---------- Inicialização ----------
  selecionarTurno(turnoView);
  atualizarRelogio();
  relogioInterval = setInterval(atualizarRelogio, 1000);
  checarEstadoParada();
  renderAll();
  unsubDb = onDbChange(renderAll);
  setTimeout(() => $('#vin-input').focus(), 100);

  return function unmount() {
    clearInterval(relogioInterval);
    clearInterval(paradaInterval);
    clearTimeout(fbTimer);
    if (unsubDb) unsubDb();
  };
}
