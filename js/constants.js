// Sequência real de estações pelas quais um veículo passa na planta:
// Alinhamento -> Road Test (Qualidade decide Pista ou Shower) -> reparos (que podem
// se transferir entre si via Transferência, exclusiva da Qualidade, antes mesmo de
// chegar no Sign Off) -> Sign Off / Túnel de Liberação (Qualidade libera ou manda
// para mais reparo).
window.STATIONS = [
  { id: 'alinhamento', nome: 'Alinhamento', curto: 'Alinhamento', tipo: 'entrada', accent: '#38bdf8', grupo: 'ALINHAMENTO', emoji: '🛞', desc: 'Estação de alinhamento de rodas e geometria — entrada de veículos na produção.' },
  { id: 'roadtest', nome: 'Road Test', curto: 'Road Test', tipo: 'qualidade', accent: '#eab308', grupo: 'QUALIDADE', emoji: '🏁', desc: 'Teste de pista pós-alinhamento — decide o destino: Reparo de Pista ou Shower.' },
  { id: 'pista', nome: 'Reparo de Pista', curto: 'Pista', tipo: 'reparo', accent: '#ff3d1a', grupo: 'REPARO', emoji: '🔥', temInadequado: false, desc: 'Estação de reparo de pista.' },
  { id: 'inspecao-shower', nome: 'Inspeção de Shower', curto: 'Insp. Shower', tipo: 'reparo', accent: '#3b82f6', grupo: 'REPARO', emoji: '🔍', bespoke: true, desc: 'Inspeção de teste e reteste do Shower — libera para Sign Off/Túnel ou envia para reparo/montagem.' },
  { id: 'reparo-shower', nome: 'Reparo de Shower', curto: 'Reparo Shower', tipo: 'reparo', accent: '#2563eb', grupo: 'REPARO', emoji: '🚿', bespoke: true, temInadequado: false, desc: 'Reparo e montagem de Shower.' },
  { id: 'eletrico', nome: 'Reparo Elétrico', curto: 'Elétrico', tipo: 'reparo', accent: '#a855f7', grupo: 'REPARO', emoji: '⚡', temInadequado: false, desc: 'Estação de reparo elétrico.' },
  { id: 'funilaria', nome: 'Reparo Funilaria', curto: 'Funilaria', tipo: 'reparo', accent: '#94a3b8', grupo: 'REPARO', emoji: '🔧', temInadequado: true, desc: 'Estação de reparo de funilaria.' },
  { id: 'pintura', nome: 'Reparo Pintura', curto: 'Pintura', tipo: 'reparo', accent: '#fb923c', grupo: 'REPARO', emoji: '🎨', temInadequado: true, desc: 'Estação de reparo de pintura.' },
  { id: 'polimento', nome: 'Reparo Polimento', curto: 'Polimento', tipo: 'reparo', accent: '#ff8c00', grupo: 'ACABAMENTO', emoji: '✨', temInadequado: true, desc: 'Estação de reparo de polimento e acabamento.' },
  { id: 'exok', nome: 'Reparo Ex Ok', curto: 'Ex Ok', tipo: 'reparo', accent: '#86efac', grupo: 'FINALIZAÇÃO', emoji: '🚗', temInadequado: true, desc: 'Estação de reparo Ex Ok — expedição de veículos aprovados.' },
  { id: 'signoff', nome: 'Sign Off', curto: 'Sign Off', tipo: 'qualidade', accent: '#a78bfa', grupo: 'QUALIDADE', emoji: '📋', desc: 'Aprovação final — libera o veículo ou envia para mais reparo.' },
  { id: 'tunel', nome: 'Túnel de Liberação', curto: 'Túnel', tipo: 'qualidade', accent: '#ef4444', grupo: 'QUALIDADE', emoji: '✔✔', desc: 'Túnel de liberação — libera o veículo ou retorna para reparo.' },
  { id: 'transferencia', nome: 'Transferência', curto: 'Transferência', tipo: 'qualidade', accent: '#818cf8', grupo: 'QUALIDADE', emoji: '🔄', desc: 'Uso exclusivo da Qualidade — transfere veículos entre estações de reparo antes do Sign Off.' },
];

// Estações de reparo "genéricas" (usam repairFactory.js). Shower é reparo mas tem
// fluxo próprio (bespoke) por causa do reteste/inspeção/montagem.
window.REPAIR_STATION_IDS = window.STATIONS.filter(s => s.tipo === 'reparo' && !s.bespoke).map(s => s.id);
// Todas as estações de reparo (inclui Shower), usado como lista de possíveis destinos.
window.ALL_REPAIR_STATION_IDS = window.STATIONS.filter(s => s.tipo === 'reparo').map(s => s.id);
window.NIVEIS_REPARO = [
  { id: 'N1', label: 'N1 — Fácil' },
  { id: 'N2', label: 'N2 — Médio' },
  { id: 'N3', label: 'N3 — Difícil' },
];

window.STATIONS_BY_ID = window.STATIONS.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

// Três turnos, com limites em minutos desde 00:00 — mesma lógica dos sistemas de origem.
// inicioMin/fimMin em minutos desde 00:00. O 2º turno cruza a meia-noite
// (inicioMin > fimMin), tratado explicitamente em getTurnoAtual().
window.TURNOS = [
  { id: 1, nome: '1º Turno', inicioMin: 6 * 60 + 5, fimMin: 15 * 60 + 50, label: '06:05 – 15:50' },
  { id: 2, nome: '2º Turno', inicioMin: 15 * 60 + 50, fimMin: 58, label: '15:50 – 00:58' },
  { id: 3, nome: '3º Turno', inicioMin: 58, fimMin: 6 * 60 + 5, label: '00:58 – 06:05' },
];

window.MODELOS_POR_PREFIXO = {
  '9BWAB19': { modelo: 'T-19', marca: 'CAOA CHERY' },
  '9BWAB1E': { modelo: 'T-1E', marca: 'CAOA CHERY' },
  '9BWAB18': { modelo: 'T-18', marca: 'CAOA CHERY' },
  '9BWUNIT': { modelo: 'UNI-T', marca: 'CAOA CHERY' },
  '9BWCS75': { modelo: 'CS75', marca: 'CAOA CHERY' },
  '9BWC655': { modelo: 'C655', marca: 'CAOA CHERY' },
};

window.MOTIVOS_INADEQUADO = [
  'ESCORRIDO', 'MANCHA', 'QUEIMADO', 'RISCO', 'BOLHA', 'FALHA DE COR',
  'CASCA DE LARANJA', 'CONTAMINAÇÃO', 'ONDULAÇÃO', 'OUTRO',
];

window.META_HORA_PADRAO = 10;

// ---------- Constantes específicas do módulo Alinhamento (fiéis ao sistema original) ----------

window.ALINHAMENTO_TURNOS_INFO = {
  1: { label: '1º TURNO', range: '06:10 – 15:48' },
  2: { label: '2º TURNO', range: '15:48 – 1:02' },
  3: { label: '3º TURNO', range: '01:00 – 6:10' },
};

// Trocas reais de turno usadas para classificar os lançamentos: 06:05, 15:50 e 01:00.
window.ALINHAMENTO_FAIXAS = [
  { id: 't1_06', turno: 1, lbl: '06h', mIni: 365, mFim: 420, meta: 28 },
  { id: 't1_07', turno: 1, lbl: '07h', mIni: 420, mFim: 480, meta: 30 },
  { id: 't1_08', turno: 1, lbl: '08h', mIni: 480, mFim: 540, meta: 30 },
  { id: 't1_09', turno: 1, lbl: '09h', mIni: 540, mFim: 600, meta: 30 },
  { id: 't1_10', turno: 1, lbl: '10h', mIni: 600, mFim: 660, meta: 23 },
  { id: 't1_11', turno: 1, lbl: '11h', mIni: 660, mFim: 720, meta: 16 },
  { id: 't1_12', turno: 1, lbl: '12h', mIni: 720, mFim: 780, meta: 20 },
  { id: 't1_13', turno: 1, lbl: '13h', mIni: 780, mFim: 840, meta: 30 },
  { id: 't1_14', turno: 1, lbl: '14h', mIni: 840, mFim: 900, meta: 28 },
  { id: 't1_15', turno: 1, lbl: '15h', mIni: 900, mFim: 950, meta: 20 },
  { id: 't2_16', turno: 2, lbl: '16h', mIni: 950, mFim: 1020, meta: 20 },
  { id: 't2_17', turno: 2, lbl: '17h', mIni: 1020, mFim: 1080, meta: 21 },
  { id: 't2_18', turno: 2, lbl: '18h', mIni: 1080, mFim: 1140, meta: 19 },
  { id: 't2_19', turno: 2, lbl: '19h', mIni: 1140, mFim: 1200, meta: 14 },
  { id: 't2_20', turno: 2, lbl: '20h', mIni: 1200, mFim: 1260, meta: 14 },
  { id: 't2_21', turno: 2, lbl: '21h', mIni: 1260, mFim: 1320, meta: 20 },
  { id: 't2_22', turno: 2, lbl: '22h', mIni: 1320, mFim: 1380, meta: 20 },
  { id: 't2_23', turno: 2, lbl: '23h', mIni: 1380, mFim: 1440, meta: 21 },
  { id: 't2_00', turno: 2, lbl: '00h', mIni: 1440, mFim: 1500, meta: 21 },
  { id: 't3_01', turno: 3, lbl: '01h', mIni: 60, mFim: 120, meta: 17 },
  { id: 't3_02', turno: 3, lbl: '02h', mIni: 120, mFim: 180, meta: 17 },
  { id: 't3_03', turno: 3, lbl: '03h', mIni: 180, mFim: 240, meta: 11 },
  { id: 't3_04', turno: 3, lbl: '04h', mIni: 240, mFim: 300, meta: 17 },
  { id: 't3_05', turno: 3, lbl: '05h', mIni: 300, mFim: 365, meta: 17 },
];

window.ALINHAMENTO_PREFIXOS_MODELOS = {
  'T-19': ['95PB'], 'T-1E': ['95PE'], 'T-18': ['95PF'],
  'UNI-T': ['95PL'], 'CS75': ['95PK'], 'C655': ['95PJCL61D'],
};

window.ALINHAMENTO_MOTIVOS_RETORNO = [
  'Realinhar Veículo', 'Refazer Teste de Rolo', 'Falha de Válvulas', 'Outro motivo',
];

window.ALINHAMENTO_MOTIVOS_PARADA = [
  'Manutenção de Equipamento', 'Fluxo Baixo', 'Reunião / Treinamento', 'Testes Engenharia', 'Outro Motivo',
];
