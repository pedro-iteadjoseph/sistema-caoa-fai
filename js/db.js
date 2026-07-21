// Camada de dados. Hoje fala só com localStorage; quando window.APP_CONFIG.backend
// virar 'firebase', só esta função de baixo (loadDB/saveDB) precisa trocar de implementação —
// todo o resto do app já trabalha em cima de getVeiculos/moveVeiculo/etc.
const DB_KEY = 'caoa_fai_v1';

function defaultDB() {
  return {
    veiculos: {},
    operadores: [],
    usuarios: [],
    logReinicios: [],
    paradas: [],
    massiva: '',
    metas: {},
  };
}

// Migra veículos da antiga estação única "shower" para as duas estações atuais
// (Inspeção de Shower / Reparo de Shower), usando a fase salva para decidir o destino.
function migrarShower(db) {
  Object.values(db.veiculos || {}).forEach(v => {
    if (v.station !== 'shower') return;
    v.station = (v.showerFase === 'reparo' || v.showerFase === 'montagem') ? 'reparo-shower' : 'inspecao-shower';
  });
  return db;
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultDB();
    const parsed = JSON.parse(raw);
    return migrarShower({ ...defaultDB(), ...parsed });
  } catch {
    return defaultDB();
  }
}

let DB = loadDB();

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  window.dispatchEvent(new CustomEvent('db:changed'));
}

// Bootstrap: cria a conta admin padrão (senha com hash) na primeira execução, e migra
// contas de versões antigas do app que ainda guardavam a senha em texto puro (campo
// `senha` em vez de `senhaHash`) — sem isso, login antigo passava a falhar sempre
// depois que o hashing foi introduzido.
(async function garantirAdminPadrao() {
  let mudou = false;
  for (const u of DB.usuarios) {
    if (!u.senhaHash && u.senha) {
      u.senhaHash = await hashSenha(u.senha);
      delete u.senha;
      if (!u.estacoes) u.estacoes = [];
      mudou = true;
    }
  }
  if (!DB.usuarios.length) {
    const senhaHash = await hashSenha('caoa2026*');
    DB.usuarios.push({ usuario: 'admin', senhaHash, role: 'admin', estacoes: [] });
    mudou = true;
  }
  if (mudou) saveDB();
})();

function onDbChange(fn) {
  window.addEventListener('db:changed', fn);
  return () => window.removeEventListener('db:changed', fn);
}

// ---------- Veículos ----------

function getVeiculos() {
  return Object.values(DB.veiculos).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

function getVeiculo(vin) {
  return DB.veiculos[vin] || null;
}

function getVeiculosByStation(stationId) {
  return getVeiculos().filter(v => v.station === stationId);
}

function vinJaAtivo(vin) {
  const v = DB.veiculos[vin];
  return v && v.station !== 'liberado';
}

// VIN novo (nunca visto) — cria o registro. Para um VIN já existente, use
// relancarAlinhamentoComRetorno (o veículo voltou fisicamente ao alinhamento).
function lancarNoAlinhamento(vin, { usuario, alinhamentoId }) {
  vin = vin.toUpperCase().trim();
  if (DB.veiculos[vin]) {
    throw new Error('VIN_JA_LANCADO');
  }
  const now = Date.now();
  const d = new Date(now);
  const turno = getTurnoAtual(d);
  const faixaAlin = identificarFaixaAlinhamento(now);
  const { modelo, marca } = lookupModelo(vin);
  const registro = {
    vin, modelo, marca,
    station: 'alinhamento',
    alinhamentoId: alinhamentoId || 'ALINHAMENTO 1',
    dataOperacional: dataOperacional(d),
    turnoEntrada: turno.id,
    faixaEntrada: faixaHoraria(d, turno),
    criadoEm: now,
    atualizadoEm: now,
    reparos: {},
    alinhamentoEventos: [{
      ts: now, alinhamentoId: alinhamentoId || 'ALINHAMENTO 1', turno: faixaAlin.turno, faixaId: faixaAlin.id,
      retorno: false, motivo: '',
    }],
    history: [{ ts: now, de: null, para: 'alinhamento', acao: 'lancamento', usuario: usuario || '—' }],
  };
  DB.veiculos[vin] = registro;
  saveDB();
  return registro;
}

// Relança um VIN que já passou pelo sistema (retorno físico ao alinhamento — ex: realinhar,
// refazer teste). Traz o veículo de volta para a fila do alinhamento e registra o motivo.
function relancarAlinhamentoComRetorno(vin, { usuario, alinhamentoId, motivo }) {
  vin = vin.toUpperCase().trim();
  const v = DB.veiculos[vin];
  if (!v) throw new Error(`VIN ${vin} não encontrado.`);
  const now = Date.now();
  const faixaAlin = identificarFaixaAlinhamento(now);
  v.station = 'alinhamento';
  v.alinhamentoId = alinhamentoId || 'ALINHAMENTO 1';
  v.turnoEntrada = faixaAlin.turno;
  v.faixaEntrada = faixaHoraria(new Date(now), getTurnoAtual(new Date(now)));
  v.atualizadoEm = now;
  if (!v.alinhamentoEventos) v.alinhamentoEventos = [];
  v.alinhamentoEventos.push({
    ts: now, alinhamentoId: alinhamentoId || 'ALINHAMENTO 1', turno: faixaAlin.turno, faixaId: faixaAlin.id,
    retorno: true, motivo: motivo || '',
  });
  v.history.push({ ts: now, de: v.station, para: 'alinhamento', acao: 'retorno', usuario: usuario || '—', motivo: motivo || null });
  saveDB();
  return v;
}

// Todos os eventos de lançamento já registrados no alinhamento (um VIN pode ter vários,
// se retornou fisicamente mais de uma vez) — usado por hora-a-hora/indicadores/impactos.
function getEventosAlinhamento() {
  const eventos = [];
  getVeiculos().forEach(v => {
    (v.alinhamentoEventos || []).forEach(ev => eventos.push({ vin: v.vin, modelo: v.modelo, ...ev }));
  });
  return eventos.sort((a, b) => a.ts - b.ts);
}

function moveVeiculo(vin, novaStation, { usuario, acao, motivo, nivel } = {}) {
  const v = DB.veiculos[vin];
  if (!v) throw new Error(`VIN ${vin} não encontrado.`);
  const de = v.station;
  v.station = novaStation;
  v.atualizadoEm = Date.now();
  if (nivel) v.nivelAtual = nivel;
  v.history.push({ ts: v.atualizadoEm, de, para: novaStation, acao: acao || 'transferencia', usuario: usuario || '—', motivo: motivo || null, nivel: nivel || null });
  saveDB();
  return v;
}

// Ao concluir qualquer reparo "genérico" (repairFactory), o veículo NÃO vai mais
// direto pro túnel — ele fica marcado como concluído, aguardando a Qualidade validar
// e transferir (estação "transferencia"), já que reparos podem acontecer entre si
// antes mesmo de chegar no Sign Off.
function registrarReparo(vin, stationId, resultado, { usuario } = {}) {
  const v = DB.veiculos[vin];
  if (!v) throw new Error(`VIN ${vin} não encontrado.`);
  const now = Date.now();
  const d = new Date(now);
  const turno = getTurnoAtual(d);
  v.reparos[stationId] = {
    ...resultado,
    turno: turno.id,
    faixa: faixaHoraria(d, turno),
    ts: now,
  };
  v.atualizadoEm = now;
  v.history.push({ ts: now, de: stationId, para: 'transferencia', acao: resultado.tipo, usuario: usuario || '—', motivo: resultado.motivo || null });
  v.station = 'transferencia';
  saveDB();
  return v;
}

// ---------- Shower (Inspeção de Shower + Reparo de Shower, com reteste) ----------

// Move o veículo para a Inspeção de Shower e o coloca em fila de teste (1ª vez).
function enviarParaInspecaoShower(vin, opts) {
  moveVeiculo(vin, 'inspecao-shower', opts);
  DB.veiculos[vin].showerFase = 'teste';
  saveDB();
  return DB.veiculos[vin];
}

// tipo: 'reparo-concluido' | 'montagem-concluida' | 'nega' | 'libera-montagem' | 'libera-final'
// Além de atualizar a fase, move o veículo entre as duas estações reais de Shower
// (Inspeção <-> Reparo) e loga a origem/destino corretos no histórico.
function registrarEventoShower(vin, tipo, { usuario, motivo } = {}) {
  const v = DB.veiculos[vin];
  if (!v) throw new Error(`VIN ${vin} não encontrado.`);
  const now = Date.now();
  const turno = getTurnoAtual(new Date(now));
  if (!v.showerEventos) v.showerEventos = [];
  v.showerEventos.push({ ts: now, tipo, turno: turno.id, faixa: faixaHoraria(new Date(now), turno), motivo: motivo || null });
  const de = v.station;
  let para = de;
  if (tipo === 'reparo-concluido') { v.showerFase = 'reteste'; para = 'inspecao-shower'; }
  else if (tipo === 'montagem-concluida') { v.showerFase = 'pronta'; }
  else if (tipo === 'nega') { v.showerFase = 'reparo'; para = 'reparo-shower'; }
  else if (tipo === 'libera-montagem') { v.showerFase = 'montagem'; para = 'reparo-shower'; }
  else if (tipo === 'libera-final') { v.showerFase = null; }
  v.station = para;
  v.atualizadoEm = now;
  v.history.push({ ts: now, de, para, acao: tipo, usuario: usuario || '—', motivo: motivo || null });
  saveDB();
  return v;
}

function removerVeiculo(vin) {
  delete DB.veiculos[vin];
  saveDB();
}

// "Remover" (antigo "estornar"): desfaz o veredito de reparo e devolve o veículo para
// a estação em que ele estava ANTES de chegar em stationId (achada pelo histórico real),
// em vez de simplesmente jogá-lo de volta na mesma estação de reparo.
function estornarParaEstacaoAnterior(vin, stationId, usuario) {
  const v = DB.veiculos[vin];
  if (!v) throw new Error(`VIN ${vin} não encontrado.`);
  const entrada = [...v.history].reverse().find(h => h.para === stationId);
  const anterior = (entrada && entrada.de) ? entrada.de : stationId;
  delete v.reparos[stationId];
  v.station = anterior;
  v.atualizadoEm = Date.now();
  v.history.push({ ts: Date.now(), de: stationId, para: anterior, acao: 'remocao', usuario: usuario || '—' });
  saveDB();
  return v;
}

// ---------- Operadores ----------

function getOperadores(stationId) {
  return DB.operadores.filter(o => !stationId || o.estacao === stationId);
}

function addOperador({ matricula, nome, estacao, lider }) {
  if (DB.operadores.some(o => o.matricula === matricula && o.estacao === estacao)) {
    throw new Error('Matrícula já cadastrada nesta estação.');
  }
  DB.operadores.push({ matricula, nome: nome.toUpperCase(), estacao, lider: !!lider });
  saveDB();
}

function removeOperador(matricula, estacao) {
  DB.operadores = DB.operadores.filter(o => !(o.matricula === matricula && o.estacao === estacao));
  saveDB();
}

// Só o admin deve chamar isto (verificação de papel é feita em auth.js/UI, não aqui).
function setOperadorLider(matricula, estacao, valor) {
  const o = DB.operadores.find(x => x.matricula === matricula && x.estacao === estacao);
  if (!o) throw new Error('Operador não encontrado.');
  o.lider = !!valor;
  saveDB();
}

// A "senha" dos botões protegidos (gerenciar operadores, painel de reparo inadequado)
// é sempre a matrícula de um reparador marcado como líder/team leader naquela estação.
function verificarMatriculaLider(matricula, estacao) {
  return DB.operadores.some(o => o.matricula === (matricula || '').trim() && o.estacao === estacao && o.lider);
}

// ---------- Usuários / sessão ----------

function getUsuarios() {
  return DB.usuarios;
}

function findUsuario(usuario) {
  return DB.usuarios.find(u => u.usuario.toLowerCase() === (usuario || '').toLowerCase());
}

async function addUsuario({ usuario, senha, role, estacoes }) {
  if (findUsuario(usuario)) throw new Error('Usuário já existe.');
  const senhaHash = await hashSenha(senha);
  DB.usuarios.push({ usuario, senhaHash, role, estacoes: role === 'admin' ? [] : (estacoes || []) });
  saveDB();
}

function removeUsuario(usuario) {
  if (usuario.toLowerCase() === 'admin') throw new Error('A conta admin não pode ser removida.');
  DB.usuarios = DB.usuarios.filter(u => u.usuario.toLowerCase() !== usuario.toLowerCase());
  saveDB();
}

async function verificarLogin(usuario, senhaPlana) {
  const u = findUsuario(usuario);
  if (!u) return null;
  const hash = await hashSenha(senhaPlana);
  return hash === u.senhaHash ? u : null;
}

// ---------- Reinício de dia ----------

function registrarReinicio(usuario) {
  DB.logReinicios.unshift({ ts: Date.now(), usuario });
  DB.logReinicios = DB.logReinicios.slice(0, 5);
  DB.veiculos = {};
  DB.paradas = [];
  saveDB();
}

// ---------- Paradas (tempo parado por alinhamento) ----------

function getParadas() {
  return DB.paradas.slice().sort((a, b) => b.inicio - a.inicio);
}

function registrarParada({ alinhamento, inicio, fim, duracaoMs, motivo, obs, turno }) {
  DB.paradas.push({ alinhamento, inicio, fim, duracaoMs, motivo, obs, turno });
  saveDB();
}

// ---------- Massiva ----------

function getMassivaTexto() {
  return DB.massiva || '';
}

function getMassivaLista() {
  return (DB.massiva || '').split('\n').map(v => v.trim().toUpperCase()).filter(Boolean);
}

function setMassivaTexto(texto) {
  DB.massiva = texto;
  saveDB();
}

// ---------- Metas por faixa (editável por admin) ----------

function getMeta(faixa) {
  return DB.metas[faixa.id] !== undefined ? DB.metas[faixa.id] : faixa.meta;
}

function setMeta(faixaId, valor) {
  DB.metas[faixaId] = parseInt(valor, 10) || 0;
  saveDB();
}
