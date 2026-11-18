import { createClient } from './assets/supabase-client.js';
import { readWorkbook } from './assets/xlsx-reader.js';

const SUPABASE_URL = 'https://awnslocbcqolikzmaixz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uPqrlhFsvMXUE0QWDW432g_J4LBF9LM';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = selector => document.querySelector(selector);
const authScreen = $('#auth-screen');
const pendingScreen = $('#pending-screen');
const passwordRecoveryScreen = $('#password-recovery-screen');
const appScreen = $('#app-screen');
const sessionName = $('#session-name');
const signOutButton = $('#sign-out');
const authStatus = $('#auth-status');
const calculatorScreen = $('#calculator-screen');
const dashboardScreen = $('#dashboard-screen');
const authTabs = [...document.querySelectorAll('[data-auth-view]')];
const loginPanel = $('#login-panel');
const signupPanel = $('#signup-panel');
const calculatorForm = $('#calculator');
const patientId = $('#patient-id');
const concentration = $('#concentration');
const channels = $('#channels');
const protocolChannel = $('#protocol-channel');
const protocolChannelField = $('#protocol-channel-field');
const injector = $('#injector');
const exam = $('#exam');
const weight = $('#weight');
const result = $('#result');
const formError = $('#form-error');
const calculateButton = $('#calculate-button');
const preferencesStatus = $('#preferences-status');
const clearPreferencesButton = $('#clear-preferences');
const personalHistoryBody = $('#personal-history-body');
const dashboardHistoryBody = $('#dashboard-history-body');
const institutionsFilter = $('#institution-filter');
const operatorsFilter = $('#operator-filter');
const patientFilter = $('#patient-filter');
const institutionList = $('#institution-list');
const institutionSearch = $('#institution-search');
const institutionSearchCount = $('#institution-search-count');
const institutionsPagination = $('#institutions-pagination');
const institutionsPageSummary = $('#institutions-page-summary');
const institutionsPageIndicator = $('#institutions-page-indicator');
const institutionsPrevious = $('#institutions-previous');
const institutionsNext = $('#institutions-next');
const showActiveInstitutions = $('#show-active-institutions');
const showArchivedInstitutions = $('#show-archived-institutions');
const operatorsBody = $('#operators-body');
const operatorSearch = $('#operator-search');
const operatorSearchCount = $('#operator-search-count');
const operatorsPagination = $('#operators-pagination');
const operatorsPageSummary = $('#operators-page-summary');
const operatorsPageIndicator = $('#operators-page-indicator');
const operatorsPrevious = $('#operators-previous');
const operatorsNext = $('#operators-next');
const showCurrentOperators = $('#show-current-operators');
const showRemovedOperators = $('#show-removed-operators');
const archiveBody = $('#archive-body');
const institutionDialog = $('#institution-dialog');
const protocolManageDialog = $('#protocol-manage-dialog');
const protocolManageList = $('#protocol-manage-list');
const PREFERENCES_KEY = 'clariace-calculator.preferences.v1';
const OPERATORS_PAGE_SIZE = 5;
const INSTITUTIONS_PAGE_SIZE = 5;
const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value));
const displayName = name => ({
  CRANIO: 'Crânio', PESCOÇO: 'Pescoço', TORAX: 'Tórax', ABDOME: 'Abdome', PELVE: 'Pelve', MUSCULOS: 'Músculos',
  ANTEBRAÇO: 'Antebraço', BRAÇO: 'Braço', CALCANEO: 'Calcâneo', COTOVELO: 'Cotovelo', COXA: 'Coxa', JOELHO: 'Joelho',
  OMBRO: 'Ombro', PE: 'Pé', PERNA: 'Perna', 'PUNHO,MÃO': 'Punho, mão', QUADRIL: 'Quadril', TORNOZELO: 'Tornozelo',
  'ANGIO CRANIO': 'Angio crânio', 'ANGIO CARÓTIDAS': 'Angio carótidas', 'ANGIO CRANIO/CARÓTIDAS': 'Angio crânio/carótidas',
  'ANGIO TEP': 'Angio TEP', 'ANGIO AORTA': 'Angio aorta', 'ANGIO ABDOME': 'Angio abdome',
  'ANGIO MEMBROS INFERIORES': 'Angio membros inferiores', 'ANGIO DE CORONÁRIAS': 'Angio de coronárias'
}[name] || name);

let currentSession = null;
let currentProfile = null;
let sessionRevision = 0;
let passwordRecoveryMode = false;
let passwordRecoveryComplete = false;
let institutionsCache = [];
let operatorsCache = [];
let operatorsPage = 1;
let operatorsView = 'current';
let institutionsPage = 1;
let institutionsView = 'active';
let operatorProtocols = [];
let selectedOperatorProtocol = null;
let protocolRequiresChannelSelection = false;
let protocolLoadState = 'idle';
let savedExamPreference = '';
let savedInjectorPreference = '';
let protocolVersionsCache = [];
const protocolRulesCache = new Map();
let managedInstitution = null;
let protocolTargetInstitution = null;
let protocolEntryMode = 'manual';
let parsedWorkbookSheets = [];
let stagedProtocolRules = [];
let manualProtocolRules = [];
let importHeaderIndex = 0;
let importColumnMap = {};
let importValidationErrors = [];
let expandedProtocolVersionId = '';

function setStatus(element, message, tone = '') {
  element.textContent = message;
  element.classList.toggle('is-error', tone === 'error');
  element.classList.toggle('is-success', tone === 'success');
}

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function replaceWithMessage(tbody, columns, message) {
  const row = element('tr');
  const cell = element('td', 'table-empty', message);
  cell.colSpan = columns;
  row.append(cell);
  tbody.replaceChildren(row);
}

function formattedDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function displayPatientId(value) {
  return String(value ?? '—');
}

function outcomeLabel(outcome) {
  return ({ success: 'Conforme à tabela', limit_exceeded: 'Revisão necessária', not_defined: 'Sem valor na tabela' })[outcome] || 'Registro';
}

function outcomeClass(outcome) {
  return ({ success: 'badge-success', limit_exceeded: 'badge-warning', not_defined: 'badge-neutral' })[outcome] || 'badge-neutral';
}

function setAuthView(view) {
  const loginSelected = view === 'login';
  loginPanel.hidden = !loginSelected;
  signupPanel.hidden = loginSelected;
  authTabs.forEach(tab => {
    const selected = tab.dataset.authView === view;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  setStatus(authStatus, '');
}

authTabs.forEach(tab => tab.addEventListener('click', () => setAuthView(tab.dataset.authView)));

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  setStatus(authStatus, 'Entrando…');
  const { error } = await supabase.auth.signInWithPassword({
    email: $('#login-email').value.trim(),
    password: $('#login-password').value
  });
  if (error) setStatus(authStatus, 'Não foi possível entrar. Confira o e-mail e a senha.', 'error');
});

$('#forgot-password').addEventListener('click', async event => {
  const button = event.currentTarget;
  const email = $('#login-email').value.trim();
  if (!email) {
    setStatus(authStatus, 'Informe seu e-mail para receber o link de recuperação.', 'error');
    $('#login-email').focus();
    return;
  }
  button.disabled = true;
  setStatus(authStatus, 'Solicitando link de recuperação…');
  const redirectTo = new URL(window.location.pathname, window.location.origin).href;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      const emailLimitReached = error.status === 429 || error.code === 'over_email_send_rate_limit';
      setStatus(
        authStatus,
        emailLimitReached
          ? 'O limite de e-mails do Supabase foi atingido. Aguarde antes de tentar novamente. Se persistir, peça ao administrador da plataforma para configurar um SMTP próprio.'
          : 'Não foi possível solicitar o link agora. Verifique os dados e tente novamente. Se persistir, fale com o administrador da plataforma.',
        'error'
      );
      return;
    }
    setStatus(authStatus, 'Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.', 'success');
  } catch {
    setStatus(authStatus, 'Não foi possível solicitar o link agora. Verifique sua conexão e tente novamente.', 'error');
  } finally {
    button.disabled = false;
  }
});

$('#password-recovery-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = $('#recovery-password').value;
  const confirmation = $('#recovery-password-confirm').value;
  if (password.length < 12) {
    setStatus($('#password-recovery-status'), 'Use uma senha com pelo menos 12 caracteres.', 'error');
    $('#recovery-password').focus();
    return;
  }
  if (password !== confirmation) {
    setStatus($('#password-recovery-status'), 'As senhas não coincidem.', 'error');
    $('#recovery-password-confirm').focus();
    return;
  }

  const button = $('#save-recovery-password');
  button.disabled = true;
  setStatus($('#password-recovery-status'), 'Atualizando senha…');
  const { error } = await supabase.auth.updateUser({ password });
  button.disabled = false;
  if (error) {
    setStatus($('#password-recovery-status'), 'Não foi possível atualizar a senha. Solicite um novo link e tente novamente.', 'error');
    return;
  }
  passwordRecoveryMode = false;
  passwordRecoveryComplete = true;
  $('#password-recovery-form').hidden = true;
  $('#password-recovery-complete').hidden = false;
});

$('#continue-after-recovery').addEventListener('click', async () => {
  passwordRecoveryMode = false;
  passwordRecoveryComplete = false;
  $('#password-recovery-complete').hidden = true;
  $('#password-recovery-form').hidden = false;
  $('#password-recovery-form').reset();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    showOnly('auth');
    setAuthView('login');
    setStatus(authStatus, 'Senha atualizada. Entre com sua nova senha.', 'success');
    return;
  }
  await applySession(data.session);
});

$('#signup-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('#signup-name').value.trim();
  const institution = $('#signup-institution').value.trim();
  const email = $('#signup-email').value.trim();
  const password = $('#signup-password').value;
  if (!name || !institution || !email || password.length < 12) {
    setStatus(authStatus, 'Preencha os campos e use uma senha com pelo menos 12 caracteres.', 'error');
    return;
  }
  setStatus(authStatus, 'Enviando solicitação…');
  const redirectTo = new URL(window.location.pathname, window.location.origin).href;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name, requested_institution: institution }, emailRedirectTo: redirectTo }
  });
  if (error) {
    setStatus(authStatus, `Não foi possível criar a solicitação: ${error.message}`, 'error');
    return;
  }
  if (data.session) {
    setStatus(authStatus, 'Conta criada. Aguarde a aprovação da equipe ClariACE.');
    return;
  }
  setStatus(authStatus, 'Solicitação enviada. Confirme o e-mail e aguarde a aprovação da equipe ClariACE.');
});

signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  signOutButton.disabled = false;
  if (error) setStatus(authStatus, 'Não foi possível sair. Tente novamente.', 'error');
});

function showOnly(screen) {
  authScreen.hidden = screen !== 'auth';
  pendingScreen.hidden = screen !== 'pending';
  passwordRecoveryScreen.hidden = screen !== 'password-recovery';
  appScreen.hidden = screen !== 'app';
}

async function applySession(session) {
  const revision = ++sessionRevision;
  currentSession = session;
  currentProfile = null;
  $('#pending-kicker').textContent = 'ACESSO EM ANÁLISE';
  $('#pending-icon').textContent = '⌛';
  $('#pending-intro').textContent = 'Um administrador global da plataforma ClariACE precisa vincular seu usuário a uma instituição antes de liberar a calculadora.';
  signOutButton.hidden = !session;
  sessionName.hidden = !session;
  if (!session) {
    passwordRecoveryMode = false;
    passwordRecoveryComplete = false;
    operatorProtocols = [];
    selectedOperatorProtocol = null;
    protocolRequiresChannelSelection = false;
    protocolLoadState = 'idle';
    showOnly('auth');
    sessionName.textContent = '';
    setStatus(authStatus, '');
    return;
  }

  if (passwordRecoveryMode || passwordRecoveryComplete) {
    signOutButton.hidden = true;
    sessionName.hidden = true;
    $('#password-recovery-form').hidden = passwordRecoveryComplete;
    $('#password-recovery-complete').hidden = !passwordRecoveryComplete;
    if (passwordRecoveryMode) setStatus($('#password-recovery-status'), '');
    showOnly('password-recovery');
    return;
  }

  sessionName.textContent = 'Carregando conta…';
  showOnly('pending');
  $('#pending-title').textContent = 'Carregando sua conta';
  $('#pending-details').textContent = '';
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id,email,display_name,role,institution_id,is_active,requested_institution,removed_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (revision !== sessionRevision) return;
  if (error || !profile) {
    showOnly('auth');
    setStatus(authStatus, 'Não foi possível carregar seu perfil. Atualize a página ou fale com o administrador da plataforma ClariACE.', 'error');
    sessionName.textContent = session.user.email || 'Conta conectada';
    return;
  }

  currentProfile = profile;
  sessionName.textContent = profile.display_name || profile.email;
  if (profile.removed_at) {
    showOnly('pending');
    $('#pending-title').textContent = 'Acesso removido';
    $('#pending-details').textContent = 'Seu acesso à plataforma foi removido. Se precisar de acesso novamente, entre em contato com a equipe ClariACE.';
    return;
  }
  if (!profile.is_active || !profile.institution_id && profile.role !== 'admin') {
    showOnly('pending');
    if (profile.institution_id) {
      $('#pending-title').textContent = 'Acesso suspenso';
      $('#pending-details').textContent = 'Seu acesso está suspenso. Entre em contato com a equipe ClariACE para revisar seu vínculo com a instituição.';
    } else {
      $('#pending-title').textContent = 'Sua conta aguarda aprovação';
      $('#pending-details').textContent = profile.requested_institution
        ? `Instituição informada: ${profile.requested_institution}. Um administrador da plataforma ClariACE fará o vínculo.`
        : 'Um administrador da plataforma ClariACE precisa liberar seu acesso e vincular sua conta a uma instituição.';
    }
    return;
  }
  if (!['admin', 'operator'].includes(profile.role)) {
    showOnly('pending');
    $('#pending-title').textContent = 'Acesso não configurado';
    $('#pending-details').textContent = 'Peça a um administrador da plataforma ClariACE para revisar seu perfil.';
    return;
  }

  const isAdmin = profile.role === 'admin';
  if (!isAdmin) {
    const optionsLoaded = await loadOperatorProtocolContext();
    if (revision !== sessionRevision) return;
    if (!optionsLoaded) {
      showOnly('pending');
      const states = {
        error: ['Não foi possível carregar o protocolo', 'Atualize a página. Se o problema continuar, peça ao administrador da plataforma ClariACE para verificar a conexão e a configuração do protocolo.'],
        missing: ['Protocolo da unidade não ativado', 'Peça ao administrador da plataforma ClariACE para revisar e ativar o protocolo desta unidade. A calculadora só abre quando houver regras ativas.'],
        multiple: ['Configuração de tomógrafo pendente', 'Há mais de um protocolo ativo para esta unidade. A seleção entre 16 e 64 canais é liberada somente para o CRD; peça ao administrador para revisar os protocolos.'],
        invalid: ['Protocolo sem regras válidas', 'Peça ao administrador da plataforma ClariACE para conferir a concentração e os exames do protocolo ativo.'],
        idle: ['Protocolo da unidade indisponível', 'Peça ao administrador da plataforma ClariACE para revisar a configuração do protocolo.']
      };
      const [title, details] = states[protocolLoadState] || states.idle;
      $('#pending-kicker').textContent = 'CONFIGURAÇÃO DA UNIDADE';
      $('#pending-icon').textContent = '!';
      $('#pending-intro').textContent = 'Seu acesso está ativo, mas a calculadora precisa de um protocolo institucional válido para exibir exames e parâmetros corretos.';
      $('#pending-title').textContent = title;
      $('#pending-details').textContent = details;
      return;
    }
  }

  showOnly('app');
  $('#app-tabs').hidden = !isAdmin;
  $('#show-calculator').hidden = isAdmin;
  $('#show-dashboard').hidden = !isAdmin;
  if (isAdmin) {
    await loadAdminPanel();
    showDashboard();
    await refreshDashboard();
  } else {
    showCalculator();
    await loadPersonalHistory();
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    passwordRecoveryMode = true;
    passwordRecoveryComplete = false;
  }
  if (event === 'SIGNED_OUT') {
    passwordRecoveryMode = false;
    passwordRecoveryComplete = false;
  }
  queueMicrotask(() => { void applySession(session); });
});

function showCalculator() {
  calculatorScreen.hidden = false;
  dashboardScreen.hidden = true;
  $('#show-calculator').classList.add('is-active');
  $('#show-dashboard').classList.remove('is-active');
}

function showDashboard() {
  if (currentProfile?.role !== 'admin') return;
  calculatorScreen.hidden = true;
  dashboardScreen.hidden = false;
  $('#show-calculator').classList.remove('is-active');
  $('#show-dashboard').classList.add('is-active');
}

$('#show-calculator').addEventListener('click', showCalculator);
$('#show-dashboard').addEventListener('click', () => {
  showDashboard();
  void refreshDashboard();
});

function optionsForCurrentParameters() {
  return selectedOperatorProtocol?.exam_keys || [];
}

function setOperatorProtocol(protocol) {
  selectedOperatorProtocol = protocol || null;
  concentration.value = protocol ? String(protocol.concentration) : '';
  channels.value = protocol ? String(protocol.channels) : '';
  updateExams();
}

async function loadOperatorProtocolContext() {
  protocolLoadState = 'loading';
  operatorProtocols = [];
  selectedOperatorProtocol = null;
  protocolRequiresChannelSelection = false;
  protocolChannelField.hidden = true;
  protocolChannel.replaceChildren(new Option('Selecione o tomógrafo', ''));
  concentration.value = '';
  channels.value = '';
  updateExams();

  const { data, error } = await supabase.rpc('operator_active_protocol_context');
  if (error || !Array.isArray(data)) {
    protocolLoadState = 'error';
    updateExams();
    return false;
  }
  operatorProtocols = data.map(protocol => ({
    ...protocol,
    concentration: Number(protocol.concentration),
    channels: Number(protocol.channels),
    rule_count: Number(protocol.rule_count),
    exam_keys: Array.isArray(protocol.exam_keys) ? protocol.exam_keys : []
  }));
  if (!operatorProtocols.length) {
    protocolLoadState = 'missing';
    return false;
  }
  const protocolsAreValid = operatorProtocols.every(protocol =>
    protocol.concentration === 370
    && Number.isInteger(protocol.channels)
    && protocol.rule_count > 0
    && protocol.exam_keys.length > 0
    && protocol.exam_keys.every(key => typeof key === 'string' && key.trim())
  );
  if (!protocolsAreValid) {
    protocolLoadState = 'invalid';
    return false;
  }

  if (operatorProtocols.length === 1) {
    protocolLoadState = 'ready';
    setOperatorProtocol(operatorProtocols[0]);
    return true;
  }

  const crdProtocols = operatorProtocols.length === 2
    && operatorProtocols.every(protocol => normalizeText(protocol.institution_name) === 'crd medicina diagnostica')
    && operatorProtocols.map(protocol => protocol.channels).sort((a, b) => a - b).join(',') === '16,64'
    && new Set(operatorProtocols.map(protocol => protocol.concentration)).size === 1;
  if (!crdProtocols) {
    protocolLoadState = 'multiple';
    return false;
  }

  protocolLoadState = 'ready';
  protocolRequiresChannelSelection = true;
  protocolChannelField.hidden = false;
  operatorProtocols.slice().sort((a, b) => a.channels - b.channels).forEach(protocol => {
    protocolChannel.add(new Option(`${protocol.channels} canais`, String(protocol.channels)));
  });
  setOperatorProtocol(null);
  return true;
}

function optionExists(select, value) {
  return typeof value === 'string' && [...select.options].some(option => option.value === value);
}

function savePreferences() {
  const preferences = {
    injector: injector.value || savedInjectorPreference,
    exam: exam.value || savedExamPreference
  };
  try {
    if (Object.values(preferences).some(Boolean)) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    else localStorage.removeItem(PREFERENCES_KEY);
    preferencesStatus.textContent = 'Preferências salvas neste navegador.';
  } catch {
    preferencesStatus.textContent = 'Não foi possível salvar as preferências neste navegador.';
  }
}

function clearSavedPreferences(message) {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
    preferencesStatus.textContent = message;
  } catch {
    preferencesStatus.textContent = 'Não foi possível apagar as preferências salvas neste navegador.';
  }
}

function updateExams() {
  const previous = exam.value;
  const options = selectedOperatorProtocol ? optionsForCurrentParameters() : [];
  const preferredExam = options.includes(previous)
    ? previous
    : options.includes(savedExamPreference) ? savedExamPreference : '';
  exam.replaceChildren(new Option(
    selectedOperatorProtocol ? (options.length ? 'Selecione o exame' : 'Sem exames neste protocolo') : 'Selecione o tomógrafo primeiro',
    ''
  ));
  options.forEach(name => exam.add(new Option(displayName(name), name)));
  if (preferredExam) exam.value = preferredExam;
  if (preferredExam === savedExamPreference) savedExamPreference = '';
  exam.disabled = options.length === 0;
  renderEmptyResult();
  formError.textContent = '';
}

function renderEmptyResult() {
  const empty = element('div', 'empty');
  empty.append(element('div', 'empty-icon', '◌'));
  empty.lastChild.setAttribute('aria-hidden', 'true');
  empty.append(element('h3', '', 'Seu resultado aparecerá aqui'));
  empty.append(element('p', '', 'Preencha os dados do exame e selecione “Calcular volume”.'));
  result.replaceChildren(empty);
}

protocolChannel.addEventListener('change', () => {
  const protocol = operatorProtocols.find(item => String(item.channels) === protocolChannel.value);
  setOperatorProtocol(protocol || null);
});
injector.addEventListener('change', () => {
  savePreferences();
});
[exam, weight, patientId].forEach(control => control.addEventListener('input', () => {
  renderEmptyResult();
  formError.textContent = '';
}));
exam.addEventListener('change', () => {
  savedExamPreference = '';
  savePreferences();
});
clearPreferencesButton.addEventListener('click', () => {
  savedExamPreference = '';
  savedInjectorPreference = '';
  clearSavedPreferences('Preferências apagadas. As escolhas atuais continuam nesta página.');
});
calculatorForm.addEventListener('reset', () => {
  setTimeout(() => {
    if (protocolRequiresChannelSelection) {
      protocolChannel.value = '';
      setOperatorProtocol(null);
    } else if (operatorProtocols.length === 1) {
      setOperatorProtocol(operatorProtocols[0]);
    }
    renderEmptyResult();
    savedExamPreference = '';
    savedInjectorPreference = '';
    clearSavedPreferences('Campos limpos e preferências apagadas deste navegador.');
  }, 0);
});

function restorePreferences() {
  let preferences = {};
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) preferences = parsed;
  } catch {
    preferencesStatus.textContent = 'Não foi possível ler as preferências salvas neste navegador.';
  }
  savedInjectorPreference = typeof preferences.injector === 'string' ? preferences.injector : '';
  savedExamPreference = typeof preferences.exam === 'string' ? preferences.exam : '';
  if (savedInjectorPreference === 'com' || savedInjectorPreference === 'sem') injector.value = savedInjectorPreference;
  try {
    const cleanPreferences = {};
    if (savedInjectorPreference) cleanPreferences.injector = savedInjectorPreference;
    if (savedExamPreference) cleanPreferences.exam = savedExamPreference;
    if (Object.keys(cleanPreferences).length) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(cleanPreferences));
    else localStorage.removeItem(PREFERENCES_KEY);
  } catch {
    preferencesStatus.textContent = 'Não foi possível atualizar as preferências salvas neste navegador.';
  }
  updateExams();
  weight.value = '';
  patientId.value = '';
}

restorePreferences();

function addResultSummary(container, label, value) {
  const item = element('div');
  item.append(element('span', '', label), element('strong', '', value));
  container.append(item);
}

function renderServerResult(data, weightKg) {
  result.replaceChildren();
  if (data.outcome === 'not_defined') {
    const message = element('div', 'result-message');
    message.append(element('h3', '', data.protocol_version ? 'Regra não encontrada neste protocolo' : 'Valor não definido na tabela'));
    message.append(element('p', '', data.protocol_version
      ? `O protocolo ${data.protocol_version} não tem uma regra para este exame e peso. Consulte o administrador da unidade antes de prosseguir.`
      : 'A tabela disponível não informa um volume para este peso e exame. Consulte o administrador da unidade antes de prosseguir.'));
    result.append(message);
    return;
  }
  if (data.outcome === 'limit_exceeded') {
    const message = element('div', 'result-message');
    message.append(element('h3', '', data.protocol_version ? 'Limite do protocolo excedido' : 'Limite da tabela excedido'));
    const sourceName = data.protocol_version ? `do protocolo ${data.protocol_version}` : 'da tabela';
    message.append(element('p', '', `O cálculo de ${fmt(data.volume_ml)} mL ultrapassa o limite de ${fmt(data.limit_ml)} mL informado ${sourceName}. Consulte o profissional responsável antes de prosseguir.`));
    result.append(message);
    return;
  }

  const answer = element('div', 'answer');
  answer.append(element('p', 'answer-label', 'VOLUME DA TABELA'));
  const volume = element('div', 'volume');
  volume.append(document.createTextNode(`${fmt(data.volume_ml)} `), element('span', '', 'mL'));
  answer.append(volume);
  answer.append(element('p', 'calculation', data.is_per_kg
    ? `${fmt(weightKg)} kg × ${fmt(data.table_amount)} mL/kg`
    : `Volume fixo: ${data.value_text}`));

  const summary = element('div', 'summary');
  addResultSummary(summary, 'Exame', displayName(exam.value));
  addResultSummary(summary, 'Contraste', concentration.value);
  addResultSummary(summary, 'Tomógrafo', `${channels.value} canais · ${injector.value === 'com' ? 'com' : 'sem'} injetora`);
  if (data.flow_ml_s !== null && data.flow_ml_s !== undefined) addResultSummary(summary, 'Fluxo do exame', `${fmt(data.flow_ml_s)} mL/seg`);
  answer.append(summary);

  if (data.jelco_reference && Object.keys(data.jelco_reference).length) {
    const jelco = element('div', 'jelco');
    jelco.append(element('strong', '', 'Jelco · referências de fluxo'));
    const list = element('div', 'jelco-list');
    Object.entries(data.jelco_reference).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([gauge, flow]) => {
      list.append(element('span', '', `${gauge}: até ${fmt(flow)} mL/seg`));
    });
    jelco.append(list, element('p', '', 'Referência de fluxo por calibre; confirme o acesso e o protocolo antes do exame.'));
    answer.append(jelco);
  }

  const protocolLabel = data.protocol_version ? ` · protocolo ${data.protocol_version}` : '';
  const jelcoLabel = data.jelco_reference && Object.keys(data.jelco_reference).length ? ' · referência de Jelco' : '';
  answer.append(element('p', 'source', `Fonte: concentração ${concentration.value} · ${data.source_sheet} · célula ${data.source_cell}${protocolLabel}${jelcoLabel}`));
  if (data.notes?.length) {
    const notes = element('div', 'notes');
    notes.append(element('strong', '', 'Observações da regra'));
    data.notes.forEach(note => notes.append(element('p', '', note)));
    notes.append(element('p', '', 'Confira a aplicação desses limites antes de usar o resultado.'));
    answer.append(notes);
  }
  result.append(answer);
}

calculatorForm.addEventListener('submit', async event => {
  event.preventDefault();
  formError.textContent = '';
  renderEmptyResult();
  if (!currentSession || !currentProfile?.is_active) {
    formError.textContent = 'Entre com uma conta ativa para registrar o cálculo.';
    return;
  }
  if (protocolRequiresChannelSelection && !protocolChannel.value) {
    formError.textContent = 'Selecione o tomógrafo usado neste exame.';
    protocolChannel.focus();
    return;
  }
  if (!selectedOperatorProtocol || !concentration.value || !channels.value) {
    formError.textContent = 'Não há um protocolo ativo para esta unidade. Peça ao administrador para revisar a configuração.';
    return;
  }
  if (!injector.value) {
    formError.textContent = 'Informe se o exame será realizado com ou sem injetora.';
    injector.focus();
    return;
  }
  const availableExams = optionsForCurrentParameters();
  if (!availableExams.length) {
    formError.textContent = 'Não há exames cadastrados neste protocolo. Peça ao administrador para revisar as regras.';
    exam.focus();
    return;
  }
  if (!availableExams.includes(exam.value)) {
    formError.textContent = 'Selecione o tipo de exame.';
    exam.focus();
    return;
  }
  const patient = patientId.value.trim();
  if (!patient || patient.length > 80 || /[\u0000-\u001f\u007f]/.test(patient)) {
    formError.textContent = 'Informe um ID de paciente válido, com até 80 caracteres.';
    patientId.focus();
    return;
  }
  const rawWeight = weight.value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(rawWeight) || Number(rawWeight) <= 0 || Number(rawWeight) > 500) {
    formError.textContent = 'Informe um peso maior que zero e até 500 kg.';
    weight.focus();
    return;
  }

  calculateButton.disabled = true;
  calculateButton.firstChild.textContent = 'Registrando cálculo… ';
  const { data, error } = await supabase.rpc('record_calculation', {
    p_patient_id: patient,
    p_concentration: Number(concentration.value),
    p_channels: Number(channels.value),
    p_injector: injector.value === 'com',
    p_exam: exam.value,
    p_weight_kg: Number(rawWeight)
  });
  calculateButton.disabled = false;
  calculateButton.firstChild.textContent = 'Calcular volume ';
  if (error) {
    formError.textContent = 'Não foi possível registrar o cálculo. Verifique a conexão e tente novamente.';
    return;
  }
  renderServerResult(data, Number(rawWeight));
  await loadPersonalHistory();
  if (currentProfile.role === 'admin' && !dashboardScreen.hidden) await refreshDashboard();
});

function appendHistoryRow(tbody, record, columns, mode = 'personal') {
  const row = element('tr');
  const add = text => row.append(element('td', '', text ?? '—'));
  add(formattedDate(record.occurred_at));
  add(displayPatientId(record.patient_id));
  if (mode === 'admin') {
    add(record.institution?.name || '—');
    add(record.operator?.display_name || record.operator?.email || '—');
  }
  add(displayName(record.exam));
  if (mode === 'admin') add(String(record.concentration));
  if (mode === 'admin') add(record.weight_kg === null ? '—' : `${fmt(record.weight_kg)} kg`);
  add(record.volume_ml === null ? '—' : `${fmt(record.volume_ml)} mL`);
  const status = element('span', `status-badge ${outcomeClass(record.outcome)}`, outcomeLabel(record.outcome));
  const statusCell = element('td');
  statusCell.append(status);
  row.append(statusCell);
  tbody.append(row);
}

async function loadPersonalHistory() {
  if (!currentSession || !currentProfile) return;
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('calculation_events')
    .select('id,occurred_at,patient_id,exam,volume_ml,outcome')
    .eq('operator_id', currentSession.user.id)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(20);
  if (error) {
    replaceWithMessage(personalHistoryBody, 5, 'Não foi possível carregar o histórico recente.');
    return;
  }
  personalHistoryBody.replaceChildren();
  if (!data.length) {
    replaceWithMessage(personalHistoryBody, 5, 'Nenhum cálculo registrado nos últimos 60 dias.');
    return;
  }
  data.forEach(record => appendHistoryRow(personalHistoryBody, record, 5));
}

async function populateAdminData() {
  const [institutionResponse, operatorResponse, protocolResponse] = await Promise.all([
    supabase.from('institutions').select('id,name,archived_at').order('name'),
    supabase.from('profiles').select('user_id,email,display_name,role,institution_id,is_active,requested_institution,removed_at').eq('role', 'operator').order('created_at', { ascending: false }),
    supabase.rpc('admin_list_institution_protocols')
  ]);
  if (institutionResponse.error || operatorResponse.error || protocolResponse.error) {
    setStatus($('#dashboard-status'), 'Não foi possível carregar as instituições e operadores.', 'error');
    return false;
  }
  institutionsCache = institutionResponse.data;
  operatorsCache = operatorResponse.data;
  protocolVersionsCache = protocolResponse.data || [];
  const institutionValue = institutionsFilter.value;
  institutionsFilter.replaceChildren(new Option('Todas as instituições', ''));
  institutionsCache.forEach(institution => {
    const label = institution.archived_at ? `${institution.name} (arquivada)` : institution.name;
    institutionsFilter.add(new Option(label, institution.id));
  });
  institutionsFilter.value = institutionValue;
  updateOperatorFilter();
  renderInstitutionManagement();
  renderOperatorManagement();
  return true;
}

function updateOperatorFilter() {
  const selectedInstitution = institutionsFilter.value;
  const previous = operatorsFilter.value;
  const eligible = operatorsCache.filter(operator => !selectedInstitution || operator.institution_id === selectedInstitution);
  operatorsFilter.replaceChildren(new Option('Todos os operadores', ''));
  eligible.forEach(operator => {
    const label = `${operator.display_name || operator.email}${operator.removed_at ? ' (removido)' : ''}`;
    operatorsFilter.add(new Option(label, operator.user_id));
  });
  operatorsFilter.value = eligible.some(operator => operator.user_id === previous) ? previous : '';
}

function updateInstitutionViewButtons() {
  showActiveInstitutions.setAttribute('aria-pressed', String(institutionsView === 'active'));
  showArchivedInstitutions.setAttribute('aria-pressed', String(institutionsView === 'archived'));
}

function getInstitutionItemsForView() {
  const archivedView = institutionsView === 'archived';
  const query = normalizeText(institutionSearch.value);
  return institutionsCache
    .filter(institution => Boolean(institution.archived_at) === archivedView)
    .filter(institution => !query || normalizeText(institution.name).includes(query));
}

function renderInstitutionManagement() {
  const archivedView = institutionsView === 'archived';
  const queryText = institutionSearch.value.trim();
  const items = getInstitutionItemsForView();
  institutionList.replaceChildren();
  institutionSearchCount.textContent = queryText
    ? `${items.length} ${items.length === 1 ? 'unidade encontrada' : 'unidades encontradas'}`
    : `${items.length} ${archivedView ? 'unidades arquivadas' : 'unidades ativas'}`;

  if (!items.length) {
    const message = queryText
      ? `Nenhuma unidade encontrada para “${queryText}”.`
      : archivedView ? 'Nenhuma instituição arquivada.' : 'Nenhuma instituição cadastrada.';
    const emptyState = element('div', 'search-empty-state');
    const empty = element('p', 'operator-empty', message);
    empty.setAttribute('role', 'status');
    emptyState.append(empty);
    if (queryText) {
      const clear = element('button', 'search-empty-clear', 'Limpar busca');
      clear.type = 'button';
      clear.setAttribute('aria-label', 'Limpar busca por instituições');
      clear.addEventListener('click', () => {
        institutionSearch.value = '';
        institutionsPage = 1;
        renderInstitutionManagement();
        institutionSearch.focus();
      });
      emptyState.append(clear);
    }
    institutionList.append(emptyState);
    institutionsPagination.hidden = true;
    institutionsPage = 1;
    return;
  }

  const pageCount = Math.ceil(items.length / INSTITUTIONS_PAGE_SIZE);
  institutionsPage = Math.min(institutionsPage, pageCount);
  const start = (institutionsPage - 1) * INSTITUTIONS_PAGE_SIZE;
  items.slice(start, start + INSTITUTIONS_PAGE_SIZE).forEach(institution => {
    const card = element('article', 'institution-item');
    const identity = element('div', 'institution-identity');
    const versions = protocolVersionsCache.filter(protocol => protocol.institution_id === institution.id);
    const activeProtocol = versions.find(protocol => protocol.status === 'active');
    const pendingCount = versions.filter(protocol => protocol.status === 'draft').length;
    const protocolSummary = activeProtocol
      ? `Protocolo 370 em uso · ${activeProtocol.channels} canais${pendingCount ? ` · ${pendingCount} versão(ões) em revisão` : ''}`
      : versions.length
        ? `${versions.length} versão(ões) aguardando revisão ou ativação`
        : 'Protocolo ainda não cadastrado';
    identity.append(
      element('h3', 'institution-name', institution.name),
      element('p', 'institution-state-copy', archivedView ? 'Arquivada; mantida para preservar o histórico.' : 'Disponível para novos vínculos.'),
      element('p', 'institution-protocol-summary', protocolSummary)
    );
    const state = element('span', `institution-state ${archivedView ? 'is-archived' : 'is-active'}`, archivedView ? 'Arquivada' : 'Ativa');
    const action = element('button', archivedView ? 'small-button institution-action' : 'danger-button institution-action', archivedView ? 'Restaurar' : 'Excluir');
    action.type = 'button';
    action.addEventListener('click', () => { void changeInstitutionState(institution, archivedView, action); });
    const actions = element('div', 'institution-card-actions');
    const manage = element('button', 'small-button institution-manage-protocol', versions.length ? 'Gerenciar protocolo' : 'Configurar protocolo');
    manage.type = 'button';
    manage.addEventListener('click', () => { void openProtocolManager(institution); });
    actions.append(manage, action);
    card.append(identity, state, actions);
    institutionList.append(card);
  });

  const end = Math.min(start + INSTITUTIONS_PAGE_SIZE, items.length);
  institutionsPageSummary.textContent = `Exibindo ${start + 1}–${end} de ${items.length} instituições ${archivedView ? 'arquivadas' : 'ativas'}`;
  institutionsPageIndicator.textContent = `Página ${institutionsPage} de ${pageCount}`;
  institutionsPrevious.disabled = institutionsPage === 1;
  institutionsNext.disabled = institutionsPage === pageCount;
  institutionsPagination.hidden = pageCount <= 1;
}

async function changeInstitutionState(institution, restoring, button) {
  const message = restoring
    ? `Restaurar “${institution.name}”? Ela voltará a aparecer para novos vínculos. Operadores vinculados continuarão sem acesso até serem reativados.`
    : `Excluir “${institution.name}”? Se houver operadores ou histórico, ela será arquivada para preservar os registros. Operadores vinculados perderão acesso. A instituição poderá ser restaurada.`;
  if (!window.confirm(message)) return;

  button.disabled = true;
  const { data, error } = restoring
    ? await supabase.rpc('admin_restore_institution', { p_institution_id: institution.id })
    : await supabase.rpc('admin_delete_institution', { p_institution_id: institution.id });
  button.disabled = false;

  if (error) {
    setStatus($('#institution-status'), 'Não foi possível atualizar a instituição. Atualize a página e tente novamente.', 'error');
    return;
  }

  if (restoring) {
    institutionsView = 'active';
    institutionsPage = 1;
    updateInstitutionViewButtons();
    setStatus($('#institution-status'), 'Instituição restaurada. Os operadores vinculados continuam sem acesso até serem reativados.', 'success');
  } else if (data === 'archived') {
    setStatus($('#institution-status'), 'Instituição arquivada para preservar os registros. Os operadores vinculados tiveram o acesso suspenso.', 'success');
  } else {
    setStatus($('#institution-status'), 'Instituição excluída.', 'success');
  }

  await populateAdminData();
  await refreshDashboard();
}

function updateOperatorViewButtons() {
  showCurrentOperators.setAttribute('aria-pressed', String(operatorsView === 'current'));
  showRemovedOperators.setAttribute('aria-pressed', String(operatorsView === 'removed'));
}

function getOperatorItemsForView() {
  const removedView = operatorsView === 'removed';
  const query = normalizeText(operatorSearch.value);
  return operatorsCache.filter(operator => {
    if (Boolean(operator.removed_at) !== removedView) return false;
    if (!query) return true;
    const linkedInstitution = institutionsCache.find(institution => institution.id === operator.institution_id);
    return [operator.display_name, operator.email, operator.requested_institution, linkedInstitution?.name]
      .some(value => normalizeText(value).includes(query));
  });
}

function renderOperatorManagement() {
  operatorsBody.replaceChildren();
  const removedView = operatorsView === 'removed';
  const queryText = operatorSearch.value.trim();
  const items = getOperatorItemsForView();
  operatorSearchCount.textContent = queryText
    ? `${items.length} ${items.length === 1 ? 'operador encontrado' : 'operadores encontrados'}`
    : `${items.length} ${removedView ? 'operadores removidos' : 'operadores'}`;
  if (!items.length) {
    const emptyMessage = queryText
      ? `Nenhum operador encontrado para “${queryText}”.`
      : removedView ? 'Nenhum operador removido.' : 'Nenhuma solicitação de operador.';
    const emptyState = element('div', 'search-empty-state');
    const empty = element('p', 'operator-empty', emptyMessage);
    empty.setAttribute('role', 'status');
    emptyState.append(empty);
    if (queryText) {
      const clear = element('button', 'search-empty-clear', 'Limpar busca');
      clear.type = 'button';
      clear.setAttribute('aria-label', 'Limpar busca por operadores');
      clear.addEventListener('click', () => {
        operatorSearch.value = '';
        operatorsPage = 1;
        renderOperatorManagement();
        operatorSearch.focus();
      });
      emptyState.append(clear);
    }
    operatorsBody.append(emptyState);
    operatorsPagination.hidden = true;
    operatorsPage = 1;
    return;
  }
  const pageCount = Math.ceil(items.length / OPERATORS_PAGE_SIZE);
  operatorsPage = Math.min(operatorsPage, pageCount);
  const start = (operatorsPage - 1) * OPERATORS_PAGE_SIZE;
  const visibleOperators = items.slice(start, start + OPERATORS_PAGE_SIZE);

  visibleOperators.forEach((operator, index) => {
    const card = element('article', 'operator-item');
    const heading = element('div', 'operator-card-head');
    const identity = element('div', 'operator-identity');
    const name = operator.display_name || 'Operador';
    identity.append(element('h3', 'operator-name', name), element('p', 'operator-email', operator.email || '—'));
    const state = operator.removed_at ? 'is-removed' : operator.is_active ? 'is-active' : 'is-pending';
    const stateLabel = operator.removed_at ? 'Acesso removido' : operator.is_active ? 'Acesso liberado' : 'Pendente';
    heading.append(identity, element('span', `operator-state ${state}`, stateLabel));

    const details = element('div', 'operator-details');
    const requested = element('div', 'operator-data');
    requested.append(element('span', 'operator-data-label', 'Instituição informada'), element('p', 'operator-data-value', operator.requested_institution || 'Não informada'));

    const institutionField = element('div', 'operator-data');
    const linkedInstitution = institutionsCache.find(institution => institution.id === operator.institution_id);
    details.append(requested, institutionField);
    if (removedView) {
      const linkedName = linkedInstitution
        ? `${linkedInstitution.name}${linkedInstitution.archived_at ? ' (arquivada)' : ''}`
        : 'Nenhum vínculo';
      institutionField.append(element('span', 'operator-data-label', 'Instituição vinculada'), element('p', 'operator-data-value', linkedName));
    } else {
      const selectId = `operator-institution-${start + index}`;
      const selectLabel = element('label', 'operator-data-label', 'Vincular à instituição cadastrada');
      selectLabel.htmlFor = selectId;
      const selectWrap = element('div', 'operator-select-wrap');
      const select = element('select', 'operator-institution');
      select.id = selectId;
      select.add(new Option('Selecione uma instituição', ''));
      institutionsCache.filter(institution => !institution.archived_at)
        .forEach(institution => select.add(new Option(institution.name, institution.id)));
      if (linkedInstitution?.archived_at) {
        const archivedOption = new Option(`${linkedInstitution.name} (arquivada)`, linkedInstitution.id);
        archivedOption.disabled = true;
        archivedOption.dataset.archived = 'true';
        select.add(archivedOption);
      }
      select.value = operator.institution_id || '';
      selectWrap.append(select);
      institutionField.append(selectLabel, selectWrap);

      const actions = element('div', 'operator-actions');
      const activeLabel = element('label', 'active-control');
      const active = element('input');
      active.type = 'checkbox';
      active.checked = Boolean(operator.is_active);
      active.disabled = Boolean(linkedInstitution?.archived_at);
      activeLabel.append(active, document.createTextNode('Liberar acesso'));
      select.addEventListener('change', () => {
        const selectedInstitution = institutionsCache.find(item => item.id === select.value);
        active.disabled = Boolean(selectedInstitution?.archived_at);
        if (active.disabled) active.checked = false;
      });

      const actionButtons = element('div', 'operator-action-buttons');
      const save = element('button', 'small-button operator-save', 'Salvar vínculo');
      save.type = 'button';
      save.addEventListener('click', async () => {
        const selectedInstitution = institutionsCache.find(item => item.id === select.value);
        if (active.checked && (!select.value || selectedInstitution?.archived_at)) {
          setStatus($('#dashboard-status'), 'Escolha uma instituição ativa antes de liberar o acesso.', 'error');
          select.focus();
          return;
        }
        save.disabled = true;
        const { error } = await supabase.from('profiles').update({ institution_id: select.value || null, is_active: active.checked }).eq('user_id', operator.user_id).select('user_id').single();
        save.disabled = false;
        if (error) setStatus($('#dashboard-status'), 'Não foi possível atualizar o operador. Confira se a instituição está ativa.', 'error');
        else {
          setStatus($('#dashboard-status'), 'Operador atualizado.', 'success');
          await populateAdminData();
          await refreshDashboard();
        }
      });

      const remove = element('button', 'danger-button operator-remove', 'Remover');
      remove.type = 'button';
      remove.addEventListener('click', () => { void changeOperatorRemoval(operator, true, remove); });
      actionButtons.append(save, remove);
      actions.append(activeLabel, actionButtons);
      card.append(heading, details, actions);
    }

    if (removedView) {
      const actions = element('div', 'operator-actions');
      const restore = element('button', 'small-button operator-restore', 'Restaurar operador');
      restore.type = 'button';
      restore.addEventListener('click', () => { void changeOperatorRemoval(operator, false, restore); });
      actions.append(restore);
      card.append(heading, details, actions);
    }
    operatorsBody.append(card);
  });

  const end = Math.min(start + OPERATORS_PAGE_SIZE, items.length);
  operatorsPageSummary.textContent = `Exibindo ${start + 1}–${end} de ${items.length} ${removedView ? 'operadores removidos' : 'operadores'}`;
  operatorsPageIndicator.textContent = `Página ${operatorsPage} de ${pageCount}`;
  operatorsPrevious.disabled = operatorsPage === 1;
  operatorsNext.disabled = operatorsPage === pageCount;
  operatorsPagination.hidden = pageCount <= 1;
}

async function changeOperatorRemoval(operator, removing, button) {
  const name = operator.display_name || operator.email || 'este operador';
  const message = removing
    ? `Remover ${name} do ClariACE? O acesso será revogado, mas o histórico de cálculos será preservado. Você poderá restaurar o operador depois.`
    : `Restaurar ${name}? O acesso continuará suspenso até que um administrador revise o vínculo e libere a conta.`;
  if (!window.confirm(message)) return;

  button.disabled = true;
  const { error } = await supabase.rpc('admin_set_operator_removed', {
    p_operator_id: operator.user_id,
    p_removed: removing
  });
  button.disabled = false;

  if (error) {
    setStatus($('#dashboard-status'), 'Não foi possível atualizar o operador. Atualize a página e tente novamente.', 'error');
    return;
  }

  if (!removing) {
    operatorsView = 'current';
    operatorsPage = 1;
    updateOperatorViewButtons();
    setStatus($('#dashboard-status'), 'Operador restaurado. Revise a instituição e libere o acesso quando apropriado.', 'success');
  } else {
    setStatus($('#dashboard-status'), 'Operador removido. O histórico de cálculos foi preservado.', 'success');
  }
  await populateAdminData();
  await refreshDashboard();
}

function setInstitutionView(view) {
  institutionsView = view;
  institutionsPage = 1;
  updateInstitutionViewButtons();
  renderInstitutionManagement();
}

function setOperatorView(view) {
  operatorsView = view;
  operatorsPage = 1;
  updateOperatorViewButtons();
  renderOperatorManagement();
}

showActiveInstitutions.addEventListener('click', () => setInstitutionView('active'));
showArchivedInstitutions.addEventListener('click', () => setInstitutionView('archived'));
showCurrentOperators.addEventListener('click', () => setOperatorView('current'));
showRemovedOperators.addEventListener('click', () => setOperatorView('removed'));
institutionSearch.addEventListener('input', () => {
  institutionsPage = 1;
  renderInstitutionManagement();
});
operatorSearch.addEventListener('input', () => {
  operatorsPage = 1;
  renderOperatorManagement();
});

operatorsPrevious.addEventListener('click', () => {
  if (operatorsPage > 1) {
    operatorsPage -= 1;
    renderOperatorManagement();
  }
});

operatorsNext.addEventListener('click', () => {
  const itemCount = getOperatorItemsForView().length;
  if (operatorsPage < Math.ceil(itemCount / OPERATORS_PAGE_SIZE)) {
    operatorsPage += 1;
    renderOperatorManagement();
  }
});

institutionsPrevious.addEventListener('click', () => {
  if (institutionsPage > 1) {
    institutionsPage -= 1;
    renderInstitutionManagement();
  }
});

institutionsNext.addEventListener('click', () => {
  const itemCount = getInstitutionItemsForView().length;
  if (institutionsPage < Math.ceil(itemCount / INSTITUTIONS_PAGE_SIZE)) {
    institutionsPage += 1;
    renderInstitutionManagement();
  }
});

const protocolExamKeys = [
  'CRANIO', 'PESCOÇO', 'TORAX', 'ABDOME', 'PELVE', 'MUSCULOS', 'OMBRO', 'BRAÇO', 'COTOVELO',
  'ANTEBRAÇO', 'PUNHO,MÃO', 'QUADRIL', 'COXA', 'JOELHO', 'PERNA', 'TORNOZELO', 'CALCANEO', 'PE',
  'ANGIO CRANIO', 'ANGIO CARÓTIDAS', 'ANGIO CRANIO/CARÓTIDAS', 'ANGIO TEP', 'ANGIO AORTA',
  'ANGIO MEMBROS INFERIORES', 'ANGIO DE CORONÁRIAS', 'ANGIO ABDOME'
];
const columnTargets = [
  { key: 'exam_key', label: 'Exame', required: true, hints: ['exame', 'procedimento', 'regiao anatomica', 'regiao'] },
  { key: 'table_amount', label: 'Volume geral / por linha', hints: ['volume', 'quantidade', 'contraste', 'dose'], excludes: ['maximo', 'limite', 'ate 80', 'acima de 80', 'acima de 81'] },
  { key: 'amount_up_to_80', label: 'Volume até 80 kg', hints: ['ate 80', '<= 80', 'ate80'] },
  { key: 'amount_over_81', label: 'Volume a partir de 81 kg', hints: ['acima de 81', 'a partir de 81', '> 80', '> 81', '81 kg'] },
  { key: 'weight_band', label: 'Faixa de peso (opcional)', hints: ['faixa de peso', 'faixa', 'peso'] },
  { key: 'unit', label: 'Unidade do volume (opcional)', hints: ['unidade', 'ml/kg', 'ml por kg'] },
  { key: 'flow_ml_s', label: 'Fluxo (mL/seg)', hints: ['fluxo', 'ml/seg', 'ml/s'] },
  { key: 'jelco_22', label: 'Jelco 22G (mL/seg)', hints: ['jelco 22', '22g'] },
  { key: 'jelco_20', label: 'Jelco 20G (mL/seg)', hints: ['jelco 20', '20g'] },
  { key: 'jelco_18', label: 'Jelco 18G (mL/seg)', hints: ['jelco 18', '18g'] },
  { key: 'limit_ml', label: 'Volume máximo (mL)', hints: ['limite', 'maximo', 'teto', 'volume max'] },
  { key: 'notes', label: 'Observações', hints: ['observacao', 'observacoes', 'nota', 'obs'] }
];

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeExamKey(value) {
  const candidate = String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
  const canonical = protocolExamKeys.find(key => normalizeText(key) === normalizeText(candidate));
  return canonical || candidate;
}

function parseDecimal(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const match = String(value).trim().replace(/\s/g, '').match(/[-+]?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : NaN;
}

function parseUnit(value, volumeValue, fallback) {
  const volumeText = normalizeText(volumeValue).replace(/\s/g, '');
  const unitText = normalizeText(value).replace(/\s/g, '');
  if (/ml\/?kg|\/kg|kg-1|por\s*kg/.test(volumeText) || /ml\/?kg|\/kg|kg-1|por\s*kg/.test(unitText)) return true;
  if (volumeText.includes('ml') || /\bml\b|mililitro|fixo/.test(unitText)) return false;
  if (/^kg$|\/kg|kg-1|por\s*kg/.test(unitText)) return true;
  if (fallback === 'per_kg') return true;
  if (fallback === 'ml') return false;
  return null;
}

function parseWeightBand(value) {
  const text = normalizeText(value);
  if (!text || /^(geral|regra geral|qualquer|todos|todas|any|—|-)$/.test(text)) return 'ANY';
  if (/ate\s*80|<=\s*80|≤\s*80|ate80/.test(text)) return 'UP_TO_80';
  if (/81|acima|a partir|maior|>|over/.test(text)) return 'OVER_81';
  return null;
}

function formatBand(band) {
  return band === 'UP_TO_80' ? 'Até 80 kg' : band === 'OVER_81' ? 'A partir de 81 kg' : 'Regra geral';
}

function formatRuleJelco(rule) {
  const jelco = rule.jelco_reference || {};
  return Object.keys(jelco).length
    ? Object.entries(jelco).sort((a, b) => Number(a[0]) - Number(b[0])).map(([gauge, flow]) => `${gauge}G: ${fmt(flow)}`).join(' · ')
    : '—';
}

function renderProtocolPreview(rules, errors = [], visible = rules.length > 0) {
  stagedProtocolRules = rules;
  const section = $('#protocol-preview-section');
  section.hidden = !visible;
  const summary = $('#protocol-preview-summary');
  const body = $('#protocol-preview-body');
  const more = $('#protocol-preview-more');
  summary.textContent = errors.length
    ? `${rules.length} regra(s) mapeada(s); corrija ${errors.length} pendência(s) antes de salvar.`
    : `${rules.length} regra(s) pronta(s) para revisão.`;
  body.replaceChildren();
  rules.slice(0, 25).forEach(rule => {
    const row = element('tr');
    const values = [
      displayName(rule.exam_key),
      formatBand(rule.weight_band),
      `${fmt(rule.table_amount)} ${rule.is_per_kg ? 'mL/kg' : 'mL'}`,
      rule.flow_ml_s === null ? '—' : `${fmt(rule.flow_ml_s)} mL/seg`,
      formatRuleJelco(rule),
      rule.limit_ml === null ? '—' : `${fmt(rule.limit_ml)} mL`,
      `${rule.source_sheet} · ${rule.source_cell}`
    ];
    values.forEach(value => row.append(element('td', '', value)));
    body.append(row);
  });
  if (!rules.length) {
    const row = element('tr');
    const cell = element('td', 'table-empty', errors.length ? 'Ajuste o mapeamento para gerar uma prévia.' : 'Adicione regras para visualizar a prévia.');
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }
  more.textContent = rules.length > 25 ? `Exibindo 25 de ${rules.length} regras. Todas serão enviadas após sua confirmação.` : '';
  if (protocolEntryMode === 'import') {
    setStatus($('#protocol-import-status'), errors.slice(0, 5).join(' '), errors.length ? 'error' : 'success');
  }
}

function getSuggestedVersion(institutionId, channels) {
  const current = protocolVersionsCache.filter(protocol => protocol.institution_id === institutionId && protocol.channels === Number(channels));
  const numbers = current.map(protocol => Number(String(protocol.version_label).match(/^v(\d+)$/i)?.[1] || 0));
  return `v${Math.max(0, ...numbers) + 1}`;
}

function setProtocolEntryMode(mode) {
  protocolEntryMode = mode;
  $('#manual-protocol-panel').hidden = mode !== 'manual';
  $('#import-protocol-panel').hidden = mode !== 'import';
  document.querySelectorAll('[data-protocol-mode]').forEach(button => {
    const selected = button.dataset.protocolMode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (mode === 'manual') renderProtocolPreview(manualProtocolRules, [], manualProtocolRules.length > 0);
  else if (parsedWorkbookSheets.length) updateImportedProtocolPreview();
  else renderProtocolPreview([], [], false);
}

function resetInstitutionProtocolForm(institution = null) {
  protocolTargetInstitution = institution;
  manualProtocolRules = [];
  stagedProtocolRules = [];
  parsedWorkbookSheets = [];
  importColumnMap = {};
  importValidationErrors = [];
  importHeaderIndex = 0;
  $('#institution-protocol-form').reset();
  $('#institution-name').disabled = Boolean(institution);
  $('#institution-name').value = institution?.name || '';
  $('#institution-dialog-title').textContent = institution ? `Protocolo de ${institution.name}` : 'Nova instituição';
  $('#institution-dialog-description').textContent = institution
    ? 'Adicione uma versão em rascunho; a instituição existente e seus registros serão preservados.'
    : 'Informe a unidade e configure o protocolo antes de salvar.';
  $('#protocol-channels').value = '';
  $('#protocol-version-label').value = institution ? '' : 'v1';
  $('#protocol-file').value = '';
  $('#protocol-sheet').replaceChildren(new Option('Selecione um arquivo primeiro', ''));
  $('#protocol-sheet').disabled = true;
  $('#protocol-header-row').replaceChildren(new Option('Selecione uma aba primeiro', ''));
  $('#protocol-header-row').disabled = true;
  $('#protocol-column-mapping').replaceChildren();
  $('#protocol-column-mapping').hidden = true;
  $('#manual-rule-list').replaceChildren(element('p', 'operator-empty', 'Nenhuma regra adicionada.'));
  $('#protocol-preview-section').hidden = true;
  $('#protocol-default-unit').value = '';
  setStatus($('#institution-protocol-status'), '');
  setStatus($('#manual-rule-status'), '');
  setStatus($('#protocol-import-status'), '');
  const active = institution && protocolVersionsCache.find(protocol => protocol.institution_id === institution.id && protocol.status === 'active');
  if (institution && active) $('#protocol-channels').value = String(active.channels);
  if (institution && active) $('#protocol-version-label').value = getSuggestedVersion(institution.id, active.channels);
  setProtocolEntryMode('manual');
  if (institution) $('#protocol-channels').focus();
}

function openInstitutionProtocolDialog(institution = null) {
  resetInstitutionProtocolForm(institution);
  institutionDialog.showModal();
  if (!institution) $('#institution-name').focus();
}

function columnLetter(index) {
  let number = index + 1;
  let result = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function chooseHeaderRow(rows) {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, 20).forEach((row, rowIndex) => {
    const headers = row.map(normalizeText).filter(Boolean);
    const joined = headers.join(' ');
    let score = 0;
    if (/exame|procedimento|regiao/.test(joined)) score += 2;
    if (/volume|quantidade|contraste|dose|ml/.test(joined)) score += 2;
    if (/fluxo|jelco|peso|80|81/.test(joined)) score += 1;
    score += Math.min(headers.length, 4) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  });
  return bestIndex;
}

function guessColumnMap(headers) {
  const map = {};
  const normalized = headers.map(normalizeText);
  for (const target of columnTargets) {
    const found = normalized.findIndex(header => {
      if (!header || target.excludes?.some(part => header.includes(normalizeText(part)))) return false;
      return target.hints.some(hint => header.includes(normalizeText(hint)));
    });
    map[target.key] = found < 0 ? '' : String(found);
  }
  const volumeTarget = columnTargets.find(target => target.key === 'table_amount');
  const volumeIndex = normalized.findIndex(header => header && !volumeTarget.excludes?.some(part => header.includes(normalizeText(part))) && volumeTarget.hints.some(hint => header.includes(normalizeText(hint))));
  if (volumeIndex >= 0 && map.amount_up_to_80 === String(volumeIndex)) map.amount_up_to_80 = '';
  return map;
}

function currentImportSheet() {
  const sheetName = $('#protocol-sheet').value;
  return parsedWorkbookSheets.find(sheet => sheet.name === sheetName) || null;
}

function renderColumnMappings() {
  const sheet = currentImportSheet();
  const container = $('#protocol-column-mapping');
  container.replaceChildren();
  if (!sheet) {
    container.hidden = true;
    return;
  }
  const headers = sheet.rows[importHeaderIndex] || [];
  const columns = Array.from({ length: Math.max(1, ...headers.map((_, index) => index + 1)) }, (_, index) => ({
    index,
    title: String(headers[index] ?? '').trim() || `Coluna ${columnLetter(index)}`
  }));
  const heading = element('div', 'protocol-mapping-heading');
  heading.append(element('h4', '', 'Mapeie as colunas'), element('p', '', 'Revise as sugestões automáticas e corrija os campos antes de confirmar.'));
  container.append(heading);
  const grid = element('div', 'protocol-mapping-grid');
  for (const target of columnTargets) {
    const field = element('div', 'field protocol-map-field');
    const label = element('label', '', target.label + (target.required ? ' *' : ''));
    const select = element('select');
    select.id = `protocol-map-${target.key}`;
    select.add(new Option(target.key === 'exam_key' ? 'Selecione a coluna' : 'Não mapear', ''));
    columns.forEach(column => select.add(new Option(`${column.title} (${columnLetter(column.index)})`, String(column.index))));
    select.value = importColumnMap[target.key] || '';
    select.addEventListener('change', () => {
      importColumnMap[target.key] = select.value;
      updateImportedProtocolPreview();
    });
    label.htmlFor = select.id;
    field.append(label, select);
    grid.append(field);
  }
  container.append(grid);
  container.hidden = false;
  updateImportedProtocolPreview();
}

function setImportHeaderOptions() {
  const sheet = currentImportSheet();
  const selector = $('#protocol-header-row');
  selector.replaceChildren();
  if (!sheet || !sheet.rows.length) {
    selector.add(new Option('A aba está vazia', ''));
    selector.disabled = true;
    $('#protocol-column-mapping').hidden = true;
    return;
  }
  const count = Math.min(sheet.rows.length, 20);
  for (let index = 0; index < count; index += 1) {
    const sample = sheet.rows[index].map(value => String(value ?? '').trim()).filter(Boolean).join(' · ').slice(0, 100);
    selector.add(new Option(`Linha ${index + 1}${sample ? ` — ${sample}` : ''}`, String(index)));
  }
  importHeaderIndex = chooseHeaderRow(sheet.rows);
  selector.value = String(importHeaderIndex);
  selector.disabled = false;
  const headers = sheet.rows[importHeaderIndex] || [];
  importColumnMap = guessColumnMap(headers);
  renderColumnMappings();
}

function handleImportSheetChange() {
  setImportHeaderOptions();
}

async function handleProtocolFile(file) {
  parsedWorkbookSheets = [];
  importColumnMap = {};
  renderProtocolPreview([], [], false);
  setStatus($('#protocol-import-status'), '');
  if (!file) return;
  setStatus($('#protocol-import-status'), 'Lendo a planilha neste navegador…');
  try {
    parsedWorkbookSheets = await readWorkbook(file);
    const selector = $('#protocol-sheet');
    selector.replaceChildren();
    parsedWorkbookSheets.forEach(sheet => selector.add(new Option(sheet.name, sheet.name)));
    selector.disabled = false;
    handleImportSheetChange();
    if (!parsedWorkbookSheets.some(sheet => sheet.rows.length)) throw new Error('Nenhuma aba possui linhas para importar.');
  } catch (error) {
    parsedWorkbookSheets = [];
    $('#protocol-sheet').replaceChildren(new Option('Selecione um arquivo primeiro', ''));
    $('#protocol-sheet').disabled = true;
    $('#protocol-header-row').replaceChildren(new Option('Selecione uma aba primeiro', ''));
    $('#protocol-header-row').disabled = true;
    $('#protocol-column-mapping').replaceChildren();
    $('#protocol-column-mapping').hidden = true;
    renderProtocolPreview([], [], false);
    setStatus($('#protocol-import-status'), error?.message || 'Não foi possível ler a planilha. Confira o arquivo e tente novamente.', 'error');
  }
}

function mappedCellReference(rowNumber, columnIndexes) {
  return [...new Set(columnIndexes.filter(index => index !== null && index !== undefined).map(index => `${columnLetter(index)}${rowNumber}`))].join(' / ') || `Linha ${rowNumber}`;
}

function updateImportedProtocolPreview() {
  const sheet = currentImportSheet();
  if (!sheet) return;
  const headers = sheet.rows[importHeaderIndex] || [];
  const getIndex = key => importColumnMap[key] === '' || importColumnMap[key] === undefined ? null : Number(importColumnMap[key]);
  const examIndex = getIndex('exam_key');
  const amountIndex = getIndex('table_amount');
  const underIndex = getIndex('amount_up_to_80');
  const overIndex = getIndex('amount_over_81');
  const weightIndex = getIndex('weight_band');
  const unitIndex = getIndex('unit');
  const flowIndex = getIndex('flow_ml_s');
  const jelcoIndexes = [['22', getIndex('jelco_22')], ['20', getIndex('jelco_20')], ['18', getIndex('jelco_18')]];
  const limitIndex = getIndex('limit_ml');
  const notesIndex = getIndex('notes');
  const errors = [];
  const rules = [];
  const seen = new Set();

  const availableAmount = amountIndex !== null || underIndex !== null || overIndex !== null;
  if (examIndex === null) errors.push('Selecione a coluna do exame.');
  if (!availableAmount) errors.push('Mapeie o volume geral ou uma coluna de volume por faixa de peso.');

  for (let rowIndex = importHeaderIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] || [];
    if (row.every(value => String(value ?? '').trim() === '')) continue;
    const rawExam = examIndex === null ? '' : row[examIndex];
    const examKey = normalizeExamKey(rawExam);
    const rawBand = weightIndex === null ? '' : row[weightIndex];
    const bandFromColumn = parseWeightBand(rawBand);
    const rawNotes = notesIndex === null ? '' : String(row[notesIndex] ?? '').trim();
    const rowRules = [];
    const volumeColumns = [
      { key: 'table_amount', index: amountIndex, fixedBand: null },
      { key: 'amount_up_to_80', index: underIndex, fixedBand: 'UP_TO_80' },
      { key: 'amount_over_81', index: overIndex, fixedBand: 'OVER_81' }
    ];
    for (const volumeColumn of volumeColumns) {
      if (volumeColumn.index === null) continue;
      const rawVolume = row[volumeColumn.index];
      if (rawVolume === null || rawVolume === undefined || String(rawVolume).trim() === '') continue;
      if (!examKey) {
        errors.push(`Linha ${rowIndex + 1}: há volume sem exame associado.`);
        continue;
      }
      if (weightIndex !== null && String(rawBand ?? '').trim() && !bandFromColumn) {
        errors.push(`Linha ${rowIndex + 1}: faixa de peso não reconhecida (“${String(rawBand).slice(0, 40)}”).`);
        continue;
      }
      const amount = parseDecimal(rawVolume);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Linha ${rowIndex + 1}: volume inválido para ${examKey}.`);
        continue;
      }
      const rawUnit = unitIndex === null ? '' : row[unitIndex];
      const isPerKg = parseUnit(rawUnit, rawVolume, $('#protocol-default-unit').value);
      if (isPerKg === null) {
        errors.push(`Linha ${rowIndex + 1}: informe se o volume de ${examKey} é mL ou mL/kg.`);
        continue;
      }
      const weightBand = volumeColumn.fixedBand || bandFromColumn || 'ANY';
      const flow = flowIndex === null ? null : parseDecimal(row[flowIndex]);
      const limit = limitIndex === null ? null : parseDecimal(row[limitIndex]);
      if (flow !== null && (!Number.isFinite(flow) || flow <= 0)) {
        errors.push(`Linha ${rowIndex + 1}: fluxo inválido para ${examKey}.`);
        continue;
      }
      if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
        errors.push(`Linha ${rowIndex + 1}: limite inválido para ${examKey}.`);
        continue;
      }
      const jelco = {};
      let invalidJelco = false;
      for (const [gauge, index] of jelcoIndexes) {
        if (index === null || row[index] === null || row[index] === undefined || String(row[index]).trim() === '') continue;
        const value = parseDecimal(row[index]);
        if (!Number.isFinite(value) || value <= 0) invalidJelco = true;
        else jelco[gauge] = value;
      }
      if (invalidJelco) {
        errors.push(`Linha ${rowIndex + 1}: referência de Jelco inválida para ${examKey}.`);
        continue;
      }
      const amountColumnIndex = volumeColumn.index;
      const sourceCell = mappedCellReference(rowIndex + 1, [examIndex, amountColumnIndex, flowIndex, ...jelcoIndexes.map(item => item[1]), limitIndex]);
      const formattedAmount = String(rawVolume).trim();
      const valueText = normalizeText(formattedAmount).includes('ml')
        ? formattedAmount
        : `${fmt(amount)} ${isPerKg ? 'mL/kg' : 'mL'}`;
      rowRules.push({
        exam_key: examKey,
        weight_band: weightBand,
        value_text: valueText,
        table_amount: amount,
        is_per_kg: isPerKg,
        flow_ml_s: flow,
        jelco_reference: Object.keys(jelco).length ? jelco : null,
        limit_ml: limit,
        source_sheet: sheet.name,
        source_cell: sourceCell,
        notes: rawNotes ? [rawNotes] : []
      });
    }
    if (!rowRules.length) continue;
    rowRules.forEach(rule => {
      const key = `${rule.exam_key}|${rule.weight_band}`;
      if (seen.has(key)) errors.push(`Regra duplicada: ${displayName(rule.exam_key)} · ${formatBand(rule.weight_band)}.`);
      else {
        seen.add(key);
        rules.push(rule);
      }
    });
  }
  importValidationErrors = errors;
  renderProtocolPreview(rules, errors, true);
}

function renderManualRuleList() {
  const list = $('#manual-rule-list');
  list.replaceChildren();
  if (!manualProtocolRules.length) {
    list.append(element('p', 'operator-empty', 'Nenhuma regra adicionada.'));
    renderProtocolPreview([], [], false);
    return;
  }
  manualProtocolRules.forEach((rule, index) => {
    const item = element('article', 'staged-rule-item');
    const copy = element('div', 'staged-rule-copy');
    copy.append(
      element('strong', '', `${displayName(rule.exam_key)} · ${formatBand(rule.weight_band)}`),
      element('span', '', `${fmt(rule.table_amount)} ${rule.is_per_kg ? 'mL/kg' : 'mL'}${rule.flow_ml_s ? ` · ${fmt(rule.flow_ml_s)} mL/seg` : ''}`)
    );
    const remove = element('button', 'danger-button staged-rule-remove', 'Remover');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      manualProtocolRules.splice(index, 1);
      renderManualRuleList();
    });
    item.append(copy, remove);
    list.append(item);
  });
  renderProtocolPreview(manualProtocolRules, [], true);
}

function addManualProtocolRule() {
  const examKey = normalizeExamKey($('#manual-exam').value);
  const band = $('#manual-weight-band').value;
  const amount = parseDecimal($('#manual-amount').value);
  const flow = parseDecimal($('#manual-flow').value);
  const limit = parseDecimal($('#manual-limit').value);
  if (!examKey || examKey.length > 100 || !Number.isFinite(amount) || amount <= 0) {
    setStatus($('#manual-rule-status'), 'Informe um exame e um volume maior que zero.', 'error');
    $('#manual-exam').focus();
    return;
  }
  if (flow !== null && (!Number.isFinite(flow) || flow <= 0)) {
    setStatus($('#manual-rule-status'), 'Informe um fluxo maior que zero ou deixe o campo vazio.', 'error');
    $('#manual-flow').focus();
    return;
  }
  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    setStatus($('#manual-rule-status'), 'Informe um volume máximo maior que zero ou deixe o campo vazio.', 'error');
    $('#manual-limit').focus();
    return;
  }
  if (manualProtocolRules.some(rule => rule.exam_key === examKey && rule.weight_band === band)) {
    setStatus($('#manual-rule-status'), 'Essa combinação de exame e faixa já foi adicionada.', 'error');
    return;
  }
  const jelco = {};
  for (const [gauge, inputId] of [['22', 'manual-jelco-22'], ['20', 'manual-jelco-20'], ['18', 'manual-jelco-18']]) {
    const value = parseDecimal($(`#${inputId}`).value);
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      setStatus($('#manual-rule-status'), `A referência de Jelco ${gauge}G precisa ser maior que zero ou ficar vazia.`, 'error');
      $(`#${inputId}`).focus();
      return;
    }
    if (value !== null) jelco[gauge] = value;
  }
  const rawAmount = $('#manual-amount').value.trim().replace(',', '.');
  const perKg = $('#manual-unit').value === 'per_kg';
  manualProtocolRules.push({
    exam_key: examKey,
    weight_band: band,
    value_text: `${rawAmount} ${perKg ? 'mL/kg' : 'mL'}`,
    table_amount: amount,
    is_per_kg: perKg,
    flow_ml_s: flow,
    jelco_reference: Object.keys(jelco).length ? jelco : null,
    limit_ml: limit,
    source_sheet: 'Cadastro manual',
    source_cell: `Regra ${manualProtocolRules.length + 1}`,
    notes: $('#manual-notes').value.trim() ? [$('#manual-notes').value.trim()] : []
  });
  setStatus($('#manual-rule-status'), 'Regra adicionada à prévia.', 'success');
  $('#manual-exam').value = '';
  $('#manual-weight-band').value = 'ANY';
  $('#manual-amount').value = '';
  $('#manual-flow').value = '';
  $('#manual-limit').value = '';
  $('#manual-jelco-22').value = '';
  $('#manual-jelco-20').value = '';
  $('#manual-jelco-18').value = '';
  $('#manual-notes').value = '';
  renderManualRuleList();
  $('#manual-exam').focus();
}

$('#add-institution').addEventListener('click', () => openInstitutionProtocolDialog());
$('#add-manual-rule').addEventListener('click', addManualProtocolRule);
document.querySelectorAll('[data-protocol-mode]').forEach(button => button.addEventListener('click', () => setProtocolEntryMode(button.dataset.protocolMode)));
$('#protocol-file').addEventListener('change', event => { void handleProtocolFile(event.target.files?.[0]); });
$('#protocol-sheet').addEventListener('change', handleImportSheetChange);
$('#protocol-header-row').addEventListener('change', event => {
  importHeaderIndex = Number(event.target.value) || 0;
  importColumnMap = guessColumnMap(currentImportSheet()?.rows[importHeaderIndex] || []);
  renderColumnMappings();
});
$('#protocol-default-unit').addEventListener('change', updateImportedProtocolPreview);
$('#protocol-channels').addEventListener('change', () => {
  if (protocolTargetInstitution) $('#protocol-version-label').value = getSuggestedVersion(protocolTargetInstitution.id, $('#protocol-channels').value);
});
$('#close-institution-dialog').addEventListener('click', () => institutionDialog.close());
$('#cancel-institution-dialog').addEventListener('click', () => institutionDialog.close());
$('#close-protocol-manage').addEventListener('click', () => protocolManageDialog.close());
$('#done-protocol-manage').addEventListener('click', () => protocolManageDialog.close());
$('#add-institution-protocol').addEventListener('click', () => {
  if (!managedInstitution || managedInstitution.archived_at) return;
  protocolManageDialog.close();
  openInstitutionProtocolDialog(managedInstitution);
});

$('#institution-protocol-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('#institution-name').value.trim();
  const channelsValue = Number($('#protocol-channels').value);
  const versionLabel = $('#protocol-version-label').value.trim();
  const rules = protocolEntryMode === 'manual' ? manualProtocolRules : stagedProtocolRules;
  const duplicates = new Set();
  let duplicateRule = false;
  rules.forEach(rule => {
    const key = `${rule.exam_key}|${rule.weight_band}`;
    if (duplicates.has(key)) duplicateRule = true;
    duplicates.add(key);
  });
  if (!protocolTargetInstitution && (!name || name.length > 120)) {
    setStatus($('#institution-protocol-status'), 'Informe o nome da instituição (até 120 caracteres).', 'error');
    $('#institution-name').focus();
    return;
  }
  if (![16, 64, 160].includes(channelsValue)) {
    setStatus($('#institution-protocol-status'), 'Selecione a quantidade de canais do tomógrafo.', 'error');
    $('#protocol-channels').focus();
    return;
  }
  if (!versionLabel || versionLabel.length > 40) {
    setStatus($('#institution-protocol-status'), 'Informe o nome da versão do protocolo.', 'error');
    $('#protocol-version-label').focus();
    return;
  }
  if (!rules.length) {
    setStatus($('#institution-protocol-status'), 'Adicione ou mapeie pelo menos uma regra antes de salvar.', 'error');
    return;
  }
  if (duplicateRule || (protocolEntryMode === 'import' && importValidationErrors.length)) {
    setStatus($('#institution-protocol-status'), 'Corrija as regras duplicadas ou as pendências de mapeamento antes de salvar.', 'error');
    return;
  }

  const saveButton = $('#save-institution-protocol');
  saveButton.disabled = true;
  setStatus($('#institution-protocol-status'), 'Salvando instituição e protocolo como rascunho…');
  const sourceFile = protocolEntryMode === 'import' ? $('#protocol-file').files?.[0]?.name || 'Planilha importada' : 'Cadastro manual';
  const sourceSheet = protocolEntryMode === 'import' ? currentImportSheet()?.name || 'Aba importada' : 'Cadastro manual';
  const { data, error } = await supabase.rpc('admin_save_institution_protocol', {
    p_institution_id: protocolTargetInstitution?.id || null,
    p_institution_name: name,
    p_channels: channelsValue,
    p_version_label: versionLabel,
    p_source_file: sourceFile,
    p_source_sheet: sourceSheet,
    p_rules: rules
  });
  saveButton.disabled = false;
  if (error) {
    const serverMessage = String(error.message || '').toLowerCase();
    const message = serverMessage.includes('institutions_name_ci_unique') || serverMessage.includes('duplicate institution')
      ? 'Já existe uma instituição com esse nome. Confira as instituições ativas e arquivadas.'
      : serverMessage.includes('protocol version already exists') || (serverMessage.includes('version') && serverMessage.includes('exist'))
        ? 'Já existe essa versão para a instituição e o tomógrafo selecionados. Escolha outro nome de versão.'
        : 'Não foi possível salvar. Revise os dados e confirme se a configuração do Supabase está atualizada.';
    setStatus($('#institution-protocol-status'), message, 'error');
    return;
  }

  institutionDialog.close();
  await populateAdminData();
  setStatus($('#institution-status'), `Protocolo ${data?.version_label || versionLabel} salvo como rascunho. Revise e ative em “Gerenciar protocolo”.`, 'success');
  if (protocolTargetInstitution) {
    const institution = institutionsCache.find(item => item.id === protocolTargetInstitution.id);
    if (institution) await openProtocolManager(institution);
  }
});

async function loadArchivedMetrics() {
  const { data, error } = await supabase
    .from('institution_monthly_metrics')
    .select('month_start,calculation_count,successful_count,review_count,volume_total_ml,institution:institutions(name)')
    .order('month_start', { ascending: false })
    .limit(120);
  if (error) {
    replaceWithMessage(archiveBody, 6, 'Não foi possível carregar os totais mensais.');
    return;
  }
  archiveBody.replaceChildren();
  if (!data.length) {
    replaceWithMessage(archiveBody, 6, 'Os totais serão arquivados após 60 dias.');
    return;
  }
  data.forEach(month => {
    const row = element('tr');
    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.month_start}T00:00:00Z`));
    [monthLabel, month.institution?.name || '—', String(month.calculation_count), String(month.successful_count), String(month.review_count), `${fmt(month.volume_total_ml)} mL`]
      .forEach(value => row.append(element('td', '', value)));
    archiveBody.append(row);
  });
}

async function loadAdminPanel() {
  await populateAdminData();
  await loadArchivedMetrics();
}

async function openProtocolManager(institution) {
  managedInstitution = institution;
  expandedProtocolVersionId = '';
  $('#protocol-manage-title').textContent = `Protocolos · ${institution.name}`;
  $('#protocol-manage-description').textContent = institution.archived_at
    ? 'Unidade arquivada. As versões e regras podem ser consultadas, mas não ativadas.'
    : 'Revise cada versão antes de ativá-la para cálculos novos.';
  setStatus($('#protocol-manage-status'), '');
  protocolManageDialog.showModal();
  renderProtocolManagement();
}

function renderProtocolManagement() {
  protocolManageList.replaceChildren();
  const addVersion = $('#add-institution-protocol');
  addVersion.disabled = Boolean(managedInstitution?.archived_at);
  addVersion.title = managedInstitution?.archived_at ? 'Restaure a instituição para adicionar uma versão.' : '';
  const versions = protocolVersionsCache
    .filter(protocol => protocol.institution_id === managedInstitution?.id)
    .sort((a, b) => Number(b.channels) - Number(a.channels) || String(b.created_at).localeCompare(String(a.created_at)));
  if (!versions.length) {
    protocolManageList.append(element('p', 'operator-empty', 'Nenhum protocolo cadastrado para esta instituição.'));
    return;
  }

  versions.forEach(protocol => {
    const card = element('article', 'protocol-item');
    const header = element('div', 'protocol-item-head');
    const identity = element('div', 'protocol-identity');
    identity.append(
      element('h3', 'protocol-name', `Versão ${protocol.version_label}`),
      element('p', 'protocol-meta', `${protocol.concentration} · tomógrafo de ${protocol.channels} canais`)
    );
    const stateClass = protocol.status === 'active' ? 'is-active' : protocol.status === 'draft' ? 'is-draft' : 'is-superseded';
    const stateText = protocol.status === 'active' ? 'Em uso' : protocol.status === 'draft' ? 'Rascunho' : 'Substituído';
    header.append(identity, element('span', `protocol-state ${stateClass}`, stateText));
    const detail = element('p', 'protocol-meta', `${protocol.rule_count} regras · aba “${protocol.source_sheet}” · origem: ${protocol.source_file}`);
    const actions = element('div', 'protocol-actions');
    const review = element('button', 'small-button', expandedProtocolVersionId === protocol.id ? 'Ocultar regras' : 'Revisar regras');
    review.type = 'button';
    review.setAttribute('aria-expanded', String(expandedProtocolVersionId === protocol.id));
    review.addEventListener('click', () => { void toggleProtocolRules(protocol.id); });
    actions.append(review);
    if (protocol.status === 'draft') {
      const activate = element('button', 'primary protocol-activate', 'Ativar protocolo');
      activate.type = 'button';
      activate.disabled = Boolean(managedInstitution?.archived_at);
      activate.addEventListener('click', () => { void activateProtocol(protocol, activate); });
      actions.append(activate);
    }
    card.append(header, detail, actions);
    if (expandedProtocolVersionId === protocol.id) {
      const rulesPanel = element('div', 'protocol-rules-panel');
      const rules = protocolRulesCache.get(protocol.id);
      if (rules === undefined) {
        rulesPanel.append(element('p', 'protocol-loading', 'Carregando regras…'));
      } else if (!rules.length) {
        rulesPanel.append(element('p', 'protocol-loading', 'Esta versão não contém regras.'));
      } else {
        const tableWrap = element('div', 'protocol-table-wrap');
        const table = element('table', 'protocol-table');
        const thead = element('thead');
        const headRow = element('tr');
        ['Exame', 'Aplicação do peso', 'Volume', 'Fluxo', 'Jelco', 'Limite', 'Origem'].forEach(label => headRow.append(element('th', '', label)));
        thead.append(headRow);
        const tbody = element('tbody');
        rules.forEach(rule => {
          const row = element('tr');
          const band = rule.weight_band === 'UP_TO_80' ? 'Até 80 kg' : rule.weight_band === 'OVER_81' ? 'A partir de 81 kg' : 'Regra geral';
          const volume = `${fmt(rule.table_amount)} ${rule.is_per_kg ? 'mL/kg' : 'mL'}`;
          const jelco = rule.jelco_reference && Object.keys(rule.jelco_reference).length
            ? Object.entries(rule.jelco_reference).sort((a, b) => Number(a[0]) - Number(b[0])).map(([gauge, flow]) => `${gauge}G: ${fmt(flow)} mL/seg`).join(' · ')
            : '—';
          const limit = rule.limit_ml == null ? '—' : `${fmt(rule.limit_ml)} mL`;
          const source = `${rule.source_sheet} · ${rule.source_cell}`;
          [displayName(rule.exam_key), band, volume, rule.flow_ml_s == null ? '—' : `${fmt(rule.flow_ml_s)} mL/seg`, jelco, limit, source]
            .forEach(value => row.append(element('td', '', value)));
          tbody.append(row);
          if (Array.isArray(rule.notes) && rule.notes.length) {
            const noteRow = element('tr', 'protocol-note-row');
            const cell = element('td', '', rule.notes.join(' · '));
            cell.colSpan = 7;
            noteRow.append(cell);
            tbody.append(noteRow);
          }
        });
        table.append(thead, tbody);
        tableWrap.append(table);
        rulesPanel.append(tableWrap);
      }
      card.append(rulesPanel);
    }
    protocolManageList.append(card);
  });
}

async function toggleProtocolRules(protocolId) {
  if (expandedProtocolVersionId === protocolId) {
    expandedProtocolVersionId = '';
    renderProtocolManagement();
    return;
  }
  expandedProtocolVersionId = protocolId;
  renderProtocolManagement();
  if (!protocolRulesCache.has(protocolId)) {
    const { data, error } = await supabase.rpc('admin_list_protocol_rules', { p_protocol_version_id: protocolId });
    if (error || !Array.isArray(data)) {
      expandedProtocolVersionId = '';
      setStatus($('#protocol-manage-status'), 'Não foi possível carregar as regras desta versão.', 'error');
      renderProtocolManagement();
      return;
    }
    protocolRulesCache.set(protocolId, data);
  }
  renderProtocolManagement();
}

async function activateProtocol(protocol, button) {
  const message = `Ativar a versão ${protocol.version_label} para ${managedInstitution?.name}, no tomógrafo de ${protocol.channels} canais?\n\nEla será usada nos novos cálculos com contraste 370. Os registros anteriores não serão alterados.`;
  if (!window.confirm(message)) return;
  button.disabled = true;
  const { error } = await supabase.rpc('admin_activate_protocol_version', { p_protocol_version_id: protocol.id });
  button.disabled = false;
  if (error) {
    setStatus($('#protocol-manage-status'), 'Não foi possível ativar este protocolo. Atualize a página e confira o status da unidade.', 'error');
    return;
  }
  setStatus($('#protocol-manage-status'), `Versão ${protocol.version_label} ativada para ${managedInstitution?.name} · ${protocol.channels} canais.`, 'success');
  await populateAdminData();
  renderProtocolManagement();
}

function dashboardRange() {
  const days = Number($('#period-filter').value) || 30;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function refreshDashboard() {
  if (currentProfile?.role !== 'admin') return;
  const { start, end } = dashboardRange();
  const institutionId = institutionsFilter.value || null;
  const operatorId = operatorsFilter.value || null;
  const patientSearch = patientFilter.value.trim();
  setStatus($('#dashboard-status'), 'Atualizando painel…');

  const [summaryResponse, historyResponse] = await Promise.all([
    supabase.rpc('admin_dashboard_summary', {
      p_start_at: start,
      p_end_at: end,
      p_institution_id: institutionId,
      p_operator_id: operatorId
    }),
    (async () => {
      let query = supabase.from('calculation_events')
        .select('id,occurred_at,patient_id,exam,concentration,weight_kg,volume_ml,outcome,operator:profiles!calculation_events_operator_id_fkey(display_name,email),institution:institutions!calculation_events_institution_id_fkey(name)')
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (institutionId) query = query.eq('institution_id', institutionId);
      if (operatorId) query = query.eq('operator_id', operatorId);
      if (patientSearch) query = query.eq('patient_id', patientSearch);
      return query;
    })()
  ]);

  if (summaryResponse.error || historyResponse.error) {
    setStatus($('#dashboard-status'), 'Não foi possível atualizar o painel. Confira seu acesso e tente novamente.', 'error');
    return;
  }
  const summary = summaryResponse.data || {};
  $('#metric-count').textContent = String(summary.calculation_count ?? 0);
  $('#metric-volume').textContent = `${fmt(summary.volume_total_ml ?? 0)} mL`;
  $('#metric-success').textContent = String(summary.successful_count ?? 0);
  $('#metric-review').textContent = String(summary.review_count ?? 0);
  dashboardHistoryBody.replaceChildren();
  if (!historyResponse.data.length) replaceWithMessage(dashboardHistoryBody, 9, 'Nenhum cálculo encontrado para estes filtros.');
  else historyResponse.data.forEach(record => appendHistoryRow(dashboardHistoryBody, record, 9, 'admin'));
  const suffix = historyResponse.data.length === 500 ? ' Exibindo os 500 registros mais recentes; as métricas consideram o período completo.' : '';
  setStatus($('#dashboard-status'), `Painel atualizado.${suffix}`, 'success');
}

$('#refresh-dashboard').addEventListener('click', () => { void refreshDashboard(); });
institutionsFilter.addEventListener('change', () => {
  updateOperatorFilter();
  void refreshDashboard();
});
operatorsFilter.addEventListener('change', () => { void refreshDashboard(); });
$('#period-filter').addEventListener('change', () => { void refreshDashboard(); });
patientFilter.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void refreshDashboard();
  }
});

supabase.auth.getSession().then(({ data, error }) => {
  if (error) setStatus(authStatus, 'Não foi possível restaurar sua sessão. Entre novamente.', 'error');
  void applySession(data?.session || null);
});

