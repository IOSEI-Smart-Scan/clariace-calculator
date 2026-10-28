const fs = require('fs'), vm = require('vm');
const cases = JSON.parse(fs.readFileSync('audit_cases.json','utf8'));
const elements = {};
for (const id of ['calculator','concentration','channels','injector','exam','weight','result','form-error']) elements[id] = {value:'',innerHTML:'',textContent:'',options:[],handlers:{},addEventListener(event,fn){this.handlers[event]=fn},focus(){},replaceChildren(option){this.options=[option]},add(option){this.options.push(option)}};
const context = {document:{querySelector:s=>elements[s.slice(1)]},Option:function(text,value){this.text=text;this.value=value},Intl,setTimeout:fn=>fn(),console};
vm.createContext(context); vm.runInContext(fs.readFileSync('data.js','utf8')+'\n'+fs.readFileSync('app.js','utf8'),context);
let failures=[], counts={total:0,volume:0,undefined:0,limit:0,flow:0,jelco:0};
for (const c of cases) {
  for (const [id,val] of Object.entries({concentration:c.conc,channels:c.channels,injector:c.inj,exam:c.exam,weight:String(c.kg)})) elements[id].value=val;
  elements.calculator.handlers.submit({preventDefault(){}});
  let html=elements.result.innerHTML, errors=[];
  if (c.volume===null) {counts.undefined++; if(!html.includes('Valor não definido na tabela')) errors.push('ausência de valor');}
  else if(c.limit!==null && c.volume>c.limit) {counts.limit++; if(!html.includes('Limite da tabela excedido') || !html.includes(`${c.limit} mL`)) errors.push('limite');}
  else {
    counts.volume++; let expected=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(c.volume);
    if(!html.includes(`>${expected} <span>mL</span>`)) errors.push('volume');
    if(c.flow) {counts.flow++; if(!html.includes(c.flow.toLowerCase().replace('ml/seg','mL/seg'))) errors.push('fluxo');}
    if(c.inj==='com') {counts.jelco++; if(!html.includes('22: até 2,8 mL/seg')||!html.includes('20: até 4,5 mL/seg')||!html.includes('18: até 6,0 mL/seg')) errors.push('jelco');}
  }
  counts.total++; if(errors.length) failures.push({...c,errors,html});
}
console.log(JSON.stringify({counts,failures},null,2));
