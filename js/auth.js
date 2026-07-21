const SESSION_KEY = 'caoa_sessao_v1';

function getSessao() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function setSessao(usuario, role, estacoes) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ usuario, role, estacoes: estacoes || [] }));
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

function temPermissao(minima) {
  const s = getSessao();
  if (!s) return false;
  if (s.role === 'admin') return true;
  return minima === 'operador';
}

function podeAcessarEstacao(stationId) {
  const s = getSessao();
  if (!s) return false;
  if (s.role === 'admin') return true;
  return (s.estacoes || []).includes(stationId);
}

// Pede login (se necessário) para acessar uma estação específica e só então chama onSuccess.
// Se a sessão atual já tem acesso, chama onSuccess direto sem pedir nada.
function solicitarAcessoEstacao(stationId, onSuccess) {
  if (podeAcessarEstacao(stationId)) { onSuccess(); return; }
  abrirLoginModal({
    titulo: `Acesso — ${STATIONS_BY_ID[stationId].nome}`,
    validar: (u) => u.role === 'admin' || (u.estacoes || []).includes(stationId),
    mensagemNegado: 'Usuário sem acesso a esta estação.',
    onSuccess,
  });
}

function solicitarLoginAdmin(onSuccess) {
  abrirLoginModal({
    titulo: 'Acesso administrativo',
    validar: (u) => u.role === 'admin',
    mensagemNegado: 'Esta conta não tem privilégio de administrador.',
    onSuccess,
  });
}

function abrirLoginModal({ titulo, validar, mensagemNegado, onSuccess }) {
  const usuarioInput = el('input', { class: 'input-dark', placeholder: 'Usuário', autocomplete: 'username' });
  const senhaInput = el('input', { class: 'input-dark', type: 'password', placeholder: 'Senha', autocomplete: 'current-password' });
  const erro = el('div', { class: 'form-error hidden' });
  const confirmarBtn = el('button', { class: 'btn-action btn-add' }, 'Entrar');
  const content = el('div', {}, [
    el('h2', {}, titulo),
    usuarioInput, senhaInput, erro,
    confirmarBtn,
    el('button', { class: 'btn-action btn-close', onclick: () => close() }, 'Cancelar'),
  ]);
  const close = openModal(content);

  async function tentar() {
    const u = await verificarLogin(usuarioInput.value.trim(), senhaInput.value);
    if (!u) { erro.textContent = 'Usuário ou senha inválidos.'; erro.classList.remove('hidden'); return; }
    if (!validar(u)) { erro.textContent = mensagemNegado; erro.classList.remove('hidden'); return; }
    setSessao(u.usuario, u.role, u.estacoes);
    close();
    onSuccess();
  }
  confirmarBtn.addEventListener('click', tentar);
  senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); });
  setTimeout(() => usuarioInput.focus(), 30);
}

// "Senha" dos botões protegidos de cada estação de reparo (gerenciar operadores,
// painel de reparo inadequado): é sempre a matrícula de um reparador marcado como
// líder/team leader NAQUELA estação. Admin da sessão sempre passa direto.
function solicitarMatriculaLider(stationId, titulo, onSuccess) {
  if (temPermissao('admin')) { onSuccess(); return; }
  const matriculaInput = el('input', { class: 'input-dark', placeholder: 'Matrícula do líder/team leader' });
  const erro = el('div', { class: 'form-error hidden' });
  const confirmarBtn = el('button', { class: 'btn-action btn-add' }, 'Confirmar');
  const content = el('div', {}, [
    el('h2', {}, titulo || 'Acesso restrito'),
    matriculaInput, erro, confirmarBtn,
    el('button', { class: 'btn-action btn-close', onclick: () => close() }, 'Cancelar'),
  ]);
  const close = openModal(content);
  function tentar() {
    if (verificarMatriculaLider(matriculaInput.value.trim(), stationId)) {
      close();
      onSuccess();
    } else {
      erro.textContent = 'Matrícula não reconhecida como líder/team leader desta estação.';
      erro.classList.remove('hidden');
    }
  }
  confirmarBtn.addEventListener('click', tentar);
  matriculaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); });
  setTimeout(() => matriculaInput.focus(), 30);
}

function montarGerenciarUsuarios() {
  const lista = el('div', { class: 'list-manage' });
  function render() {
    lista.innerHTML = '';
    getUsuarios().forEach(u => {
      const estacoesTxt = u.role === 'admin' ? 'Todas as estações' : (u.estacoes || []).map(id => STATIONS_BY_ID[id]?.curto).join(', ') || 'Nenhuma estação';
      lista.appendChild(el('div', { class: 'manage-item' }, [
        el('div', { class: 'info' }, [
          el('div', { class: 'info-linha' }, [
            el('span', { class: `status-dot ${u.role}` }),
            el('strong', { style: 'color:#eee' }, u.usuario),
            el('span', { class: 'status-label' }, u.role),
          ]),
          el('span', { style: 'font-size:0.78rem;color:#777' }, estacoesTxt),
        ]),
        u.usuario.toLowerCase() === 'admin'
          ? ''
          : el('button', { class: 'btn-del', onclick: () => { removeUsuario(u.usuario); render(); } }, 'Excluir'),
      ]));
    });
  }
  render();

  const novoUsuario = el('input', { class: 'input-dark', placeholder: 'Usuário' });
  const novaSenha = el('input', { class: 'input-dark', type: 'password', placeholder: 'Senha' });
  const roleSelect = el('select', { class: 'input-dark', style: "font-family:'Segoe UI',sans-serif" }, [
    el('option', { value: 'operador' }, 'Operador (acesso restrito por estação)'),
    el('option', { value: 'admin' }, 'Administrador (acesso total)'),
  ]);
  const stationsChecklist = el('div', { class: 'stations-checklist' },
    STATIONS.map(s => {
      const cb = el('input', { type: 'checkbox', value: s.id });
      cb._stationId = s.id;
      return el('label', { class: 'station-item' }, [cb, s.nome]);
    }));
  roleSelect.addEventListener('change', () => {
    stationsChecklist.classList.toggle('hidden', roleSelect.value === 'admin');
  });

  const erro = el('div', { class: 'form-error hidden' });
  const addBtn = el('button', { class: 'btn-action btn-add' }, 'Salvar cadastro');
  addBtn.addEventListener('click', async () => {
    try {
      if (!novoUsuario.value.trim() || !novaSenha.value) throw new Error('Preencha usuário e senha.');
      const estacoes = [...stationsChecklist.querySelectorAll('input:checked')].map(cb => cb._stationId);
      if (roleSelect.value === 'operador' && !estacoes.length) throw new Error('Selecione ao menos uma estação para este operador.');
      await addUsuario({ usuario: novoUsuario.value.trim(), senha: novaSenha.value, role: roleSelect.value, estacoes });
      novoUsuario.value = ''; novaSenha.value = '';
      stationsChecklist.querySelectorAll('input').forEach(cb => cb.checked = false);
      erro.classList.add('hidden');
      render();
      toast('Usuário cadastrado.', 'success');
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.remove('hidden');
    }
  });

  const content = el('div', {}, [
    el('h2', {}, 'Gerenciar usuários'),
    lista,
    el('div', { class: 'input-label', style: 'margin-top:10px' }, 'Novo usuário'),
    novoUsuario, novaSenha, roleSelect,
    stationsChecklist,
    erro,
    addBtn,
    el('button', { class: 'btn-action btn-close', onclick: () => closeIt() }, 'Fechar'),
  ]);
  const closeIt = openModal(content);
}
