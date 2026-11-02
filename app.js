import { createClient } from './assets/supabase-client.js';

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
const institutionsPagination = $('#institutions-pagination');
const institutionsPageSummary = $('#institutions-page-summary');
const institutionsPageIndicator = $('#institutions-page-indicator');
const institutionsPrevious = $('#institutions-previous');
const institutionsNext = $('#institutions-next');
const showActiveInstitutions = $('#show-active-institutions');
const showArchivedInstitutions = $('#show-archived-institutions');
const operatorsBody = $('#operators-body');
const operatorsPagination = $('#operators-pagination');
const operatorsPageSummary = $('#operators-page-summary');
const operatorsPageIndicator = $('#operators-page-indicator');
const operatorsPrevious = $('#operators-previous');
const operatorsNext = $('#operators-next');
const showCurrentOperators = $('#show-current-operators');
const showRemovedOperators = $('#show-removed-operators');
const archiveBody = $('#archive-body');
const PREFERENCES_KEY = 'clariace-calculator.preferences.v1';
const OPERATORS_PAGE_SIZE = 5;
const INSTITUTIONS_PAGE_SIZE = 5;
const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value));
const displayName = name => ({
  CRANIO: 'Crânio', PESCOÇO: 'Pescoço', TORAX: 'Tórax', ABDOME: 'Abdome', PELVE: 'Pelve', MUSCULOS: 'Músculos',
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
let calculatorOptions = [];
let savedExamPreference = '';

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
  signOutButton.hidden = !session;
  sessionName.hidden = !session;
  if (!session) {
    passwordRecoveryMode = false;
    passwordRecoveryComplete = false;
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
    const optionsLoaded = await loadCalculatorOptions();
    if (revision !== sessionRevision) return;
    if (!optionsLoaded) {
      showOnly('pending');
      $('#pending-title').textContent = 'Não foi possível carregar os exames';
      $('#pending-details').textContent = 'Atualize a página. Se o problema continuar, fale com o administrador da plataforma ClariACE.';
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
  return calculatorOptions.filter(option =>
    Number(option.concentration) === Number(concentration.value)
    && Number(option.channels) === Number(channels.value)
    && Boolean(option.injector) === (injector.value === 'com')
  );
}

async function loadCalculatorOptions() {
  const { data, error } = await supabase.rpc('list_calculator_options');
  if (error || !Array.isArray(data)) {
    calculatorOptions = [];
    updateExams();
    return false;
  }
  calculatorOptions = data;
  updateExams();
  if (optionExists(exam, savedExamPreference)) exam.value = savedExamPreference;
  savedExamPreference = '';
  return true;
}

function optionExists(select, value) {
  return typeof value === 'string' && [...select.options].some(option => option.value === value);
}

function savePreferences() {
  const preferences = {
    concentration: concentration.value,
    channels: channels.value,
    injector: injector.value,
    exam: exam.value
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
  const options = optionsForCurrentParameters();
  const hasParameters = Boolean(concentration.value && channels.value && injector.value);
  exam.replaceChildren(new Option(
    hasParameters ? (options.length ? 'Selecione o exame' : 'Sem exames para esta combinação') : 'Selecione os parâmetros anteriores',
    ''
  ));
  [...new Set(options.map(option => option.exam_key))].forEach(name => exam.add(new Option(displayName(name), name)));
  if ([...exam.options].some(option => option.value === previous)) exam.value = previous;
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

[concentration, channels, injector].forEach(control => control.addEventListener('change', () => {
  updateExams();
  savePreferences();
}));
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
  clearSavedPreferences('Preferências apagadas. As escolhas atuais continuam nesta página.');
});
calculatorForm.addEventListener('reset', () => {
  setTimeout(() => {
    updateExams();
    renderEmptyResult();
    savedExamPreference = '';
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
  concentration.value = optionExists(concentration, preferences.concentration) ? preferences.concentration : '';
  channels.value = optionExists(channels, preferences.channels) ? preferences.channels : '';
  injector.value = optionExists(injector, preferences.injector) ? preferences.injector : '';
  savedExamPreference = typeof preferences.exam === 'string' ? preferences.exam : '';
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
    message.append(element('h3', '', 'Valor não definido na tabela'));
    message.append(element('p', '', 'A tabela não informa um volume para este peso e exame. Consulte o protocolo e o profissional responsável.'));
    result.append(message);
    return;
  }
  if (data.outcome === 'limit_exceeded') {
    const message = element('div', 'result-message');
    message.append(element('h3', '', 'Limite da tabela excedido'));
    message.append(element('p', '', `O cálculo de ${fmt(data.volume_ml)} mL ultrapassa o limite de ${fmt(data.limit_ml)} mL informado na tabela. Consulte o protocolo e o profissional responsável antes de prosseguir.`));
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
    jelco.append(element('strong', '', 'Jelco · fluxo máximo na tabela'));
    const list = element('div', 'jelco-list');
    Object.entries(data.jelco_reference).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([gauge, flow]) => {
      list.append(element('span', '', `${gauge}: até ${fmt(flow)} mL/seg`));
    });
    jelco.append(list, element('p', '', 'Referência de fluxo por calibre; confirme o acesso e o protocolo antes do exame.'));
    answer.append(jelco);
  }

  answer.append(element('p', 'source', `Fonte: concentração ${concentration.value} · ${data.source_sheet} · célula ${data.source_cell}${injector.value === 'com' ? ' · referência de Jelco da tabela' : ''}`));
  if (data.notes?.length) {
    const notes = element('div', 'notes');
    notes.append(element('strong', '', 'Observações da tabela'));
    data.notes.forEach(note => notes.append(element('p', '', note)));
    notes.append(element('p', '', 'Confira a aplicação desses limites antes de usar o resultado.'));
    answer.append(notes);
  }
  if (injector.value === 'com') answer.append(element('p', 'height-note', 'A tabela registra altura de 1,80 m; confirme sua aplicação ao caso.'));
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
  for (const control of [concentration, channels, injector]) {
    if (!control.value) {
      formError.textContent = 'Selecione todos os parâmetros do exame.';
      control.focus();
      return;
    }
  }
  const availableExams = optionsForCurrentParameters();
  if (!availableExams.length) {
    formError.textContent = 'Não há exames disponíveis para essa combinação de parâmetros.';
    injector.focus();
    return;
  }
  if (!availableExams.some(option => option.exam_key === exam.value)) {
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
  const [institutionResponse, operatorResponse] = await Promise.all([
    supabase.from('institutions').select('id,name,archived_at').order('name'),
    supabase.from('profiles').select('user_id,email,display_name,role,institution_id,is_active,requested_institution,removed_at').eq('role', 'operator').order('created_at', { ascending: false })
  ]);
  if (institutionResponse.error || operatorResponse.error) {
    setStatus($('#dashboard-status'), 'Não foi possível carregar as instituições e operadores.', 'error');
    return false;
  }
  institutionsCache = institutionResponse.data;
  operatorsCache = operatorResponse.data;
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

function renderInstitutionManagement() {
  const archivedView = institutionsView === 'archived';
  const items = institutionsCache.filter(institution => Boolean(institution.archived_at) === archivedView);
  institutionList.replaceChildren();

  if (!items.length) {
    const message = archivedView ? 'Nenhuma instituição arquivada.' : 'Nenhuma instituição cadastrada.';
    const empty = element('p', 'operator-empty', message);
    empty.setAttribute('role', 'status');
    institutionList.append(empty);
    institutionsPagination.hidden = true;
    return;
  }

  const pageCount = Math.ceil(items.length / INSTITUTIONS_PAGE_SIZE);
  institutionsPage = Math.min(institutionsPage, pageCount);
  const start = (institutionsPage - 1) * INSTITUTIONS_PAGE_SIZE;
  items.slice(start, start + INSTITUTIONS_PAGE_SIZE).forEach(institution => {
    const card = element('article', 'institution-item');
    const identity = element('div', 'institution-identity');
    identity.append(
      element('h3', 'institution-name', institution.name),
      element('p', 'institution-state-copy', archivedView ? 'Arquivada; mantida para preservar o histórico.' : 'Disponível para novos vínculos.')
    );
    const state = element('span', `institution-state ${archivedView ? 'is-archived' : 'is-active'}`, archivedView ? 'Arquivada' : 'Ativa');
    const action = element('button', archivedView ? 'small-button institution-action' : 'danger-button institution-action', archivedView ? 'Restaurar' : 'Excluir');
    action.type = 'button';
    action.addEventListener('click', () => { void changeInstitutionState(institution, archivedView, action); });
    card.append(identity, state, action);
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

function renderOperatorManagement() {
  operatorsBody.replaceChildren();
  const removedView = operatorsView === 'removed';
  const items = operatorsCache.filter(operator => Boolean(operator.removed_at) === removedView);
  if (!items.length) {
    const empty = element('p', 'operator-empty', removedView ? 'Nenhum operador removido.' : 'Nenhuma solicitação de operador.');
    empty.setAttribute('role', 'status');
    operatorsBody.append(empty);
    operatorsPagination.hidden = true;
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

operatorsPrevious.addEventListener('click', () => {
  if (operatorsPage > 1) {
    operatorsPage -= 1;
    renderOperatorManagement();
  }
});

operatorsNext.addEventListener('click', () => {
  const itemCount = operatorsCache.filter(operator => Boolean(operator.removed_at) === (operatorsView === 'removed')).length;
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
  const itemCount = institutionsCache.filter(institution => Boolean(institution.archived_at) === (institutionsView === 'archived')).length;
  if (institutionsPage < Math.ceil(itemCount / INSTITUTIONS_PAGE_SIZE)) {
    institutionsPage += 1;
    renderInstitutionManagement();
  }
});

$('#institution-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('#institution-name').value.trim();
  if (!name) return;
  setStatus($('#institution-status'), 'Salvando instituição…');
  const { error } = await supabase.from('institutions').insert({ name }).select('id').single();
  if (error) setStatus($('#institution-status'), 'Não foi possível cadastrar. Confira se esse nome já está ativo ou arquivado.', 'error');
  else {
    $('#institution-form').reset();
    setStatus($('#institution-status'), 'Instituição cadastrada.', 'success');
    await populateAdminData();
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

