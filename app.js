const form = document.querySelector('#calculator');
const concentration = document.querySelector('#concentration');
const channels = document.querySelector('#channels');
const injector = document.querySelector('#injector');
const exam = document.querySelector('#exam');
const weight = document.querySelector('#weight');
const result = document.querySelector('#result');
const error = document.querySelector('#form-error');
const empty = result.innerHTML;
const cleanName = name => name.replace(/\s+ATÉ 80 KG|\s+ACIMA DE 81 KG/gi, '').trim();
const displayName = name => ({'CRANIO':'Crânio','PESCOÇO':'Pescoço','TORAX':'Tórax','ABDOME':'Abdome','PELVE':'Pelve','MUSCULOS':'Músculos','ANGIO CRANIO':'Angio crânio','ANGIO CARÓTIDAS':'Angio carótidas','ANGIO CRANIO/CARÓTIDAS':'Angio crânio/carótidas','ANGIO TEP':'Angio TEP','ANGIO AORTA':'Angio aorta','ANGIO ABDOME':'Angio abdome','ANGIO MEMBROS INFERIORES':'Angio membros inferiores','ANGIO DE CORONÁRIAS':'Angio de coronárias'}[name] || name);
const fmt = n => new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 3}).format(n);
function table() { return TABLES[concentration.value]?.[`${channels.value}-${injector.value}`]; }
function updateExams() {
  const previous = exam.value; const t = table();
  exam.replaceChildren(new Option(t ? 'Selecione o exame' : 'Selecione os parâmetros anteriores', ''));
  if (t) [...new Set(t.entries.map(e => cleanName(e.name)))].forEach(n => exam.add(new Option(displayName(n), n)));
  if ([...exam.options].some(o => o.value === previous)) exam.value = previous;
  result.innerHTML = empty; error.textContent = '';
}
[concentration,channels,injector].forEach(el => el.addEventListener('change', updateExams));
[exam,weight].forEach(el => el.addEventListener('input', () => { result.innerHTML = empty; error.textContent = ''; }));
form.addEventListener('reset', () => { setTimeout(() => { updateExams(); result.innerHTML = empty; }, 0); });
form.addEventListener('submit', event => {
  event.preventDefault(); error.textContent = ''; result.innerHTML = empty;
  for (const el of [concentration, channels, injector]) if (!el.value) { error.textContent = 'Selecione todos os parâmetros do exame.'; el.focus(); return; }
  const t = table();
  if (!t) { error.textContent = 'Não há tabela para essa combinação. Sem injetora está disponível apenas para 8 canais.'; injector.focus(); return; }
  if (!exam.value) { error.textContent = 'Selecione o tipo de exame.'; exam.focus(); return; }
  const raw = weight.value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(raw) || Number(raw) <= 0) { error.textContent = 'Informe um peso maior que zero, em kg.'; weight.focus(); return; }
  const kg = Number(raw); const matches = t.entries.filter(e => cleanName(e.name) === exam.value);
  const entry = matches.find(e => /ATÉ 80 KG/i.test(e.name) ? kg <= 80 : /ACIMA DE 81 KG/i.test(e.name) ? kg > 81 : true);
  if (!entry) { result.innerHTML = '<div class="result-message"><h3>Valor não definido na tabela</h3><p>A tabela não informa um volume para este peso e exame. Consulte o protocolo e o profissional responsável.</p></div>'; return; }
  const factor = /ML\/KG/i.test(entry.value); const amount = Number(entry.value.replace(',', '.').match(/[\d.]+/)[0]); const volume = factor ? amount * kg : amount;
  const limits = t.notes.filter(n => !/CORON/i.test(n));
  const general = limits.find(n => /^OBS/i.test(n));
  const coronary = exam.value === 'ANGIO DE CORONÁRIAS' ? limits.find(n => !/^OBS/i.test(n)) : null;
  const caps = [general, coronary].filter(Boolean).map(n => Number(n.match(/\d+/)?.[0])).filter(Number.isFinite);
  if (caps.length && volume > Math.min(...caps)) { result.innerHTML = `<div class="result-message"><h3>Limite da tabela excedido</h3><p>O cálculo de ${fmt(volume)} mL ultrapassa o limite de ${fmt(Math.min(...caps))} mL informado na tabela. Consulte o protocolo e o profissional responsável antes de prosseguir.</p></div>`; return; }
  const notes = [general, coronary].filter(Boolean).map(n => `<p>${n}</p>`).join('');
  result.innerHTML = `<div class="answer"><p class="answer-label">VOLUME DA TABELA</p><div class="volume">${fmt(volume)} <span>mL</span></div><p class="calculation">${factor ? `${fmt(kg)} kg × ${fmt(amount)} mL/kg` : `Volume fixo: ${entry.value}`}</p><div class="summary"><div><span>Exame</span><strong>${displayName(exam.value)}</strong></div><div><span>Contraste</span><strong>${concentration.value}</strong></div><div><span>Tomógrafo</span><strong>${channels.value} canais · ${injector.value} injetora</strong></div>${entry.flow ? `<div><span>Fluxo do exame</span><strong>${entry.flow.toLowerCase().replace('ml/seg','mL/seg')}</strong></div>` : ''}</div>${injector.value === 'com' ? '<div class="jelco"><strong>Jelco · fluxo máximo na tabela</strong><div class="jelco-list"><span>22: até 2,8 mL/seg</span><span>20: até 4,5 mL/seg</span><span>18: até 6,0 mL/seg</span></div><p>Referência de fluxo por calibre; confirme o acesso e o protocolo antes do exame.</p></div>' : ''}<p class="source">Fonte: concentração ${concentration.value} · ${t.sheet} · célula ${entry.cell}${injector.value === 'com' ? ' · Jelco: I5:J7' : ''}</p>${notes ? `<div class="notes"><strong>Observações da tabela</strong>${notes}<p>Confira a aplicação desses limites antes de usar o resultado.</p></div>` : ''}${injector.value === 'com' ? '<p class="height-note">A tabela registra altura de 1,80 m; confirme sua aplicação ao caso.</p>' : ''}</div>`;
});
