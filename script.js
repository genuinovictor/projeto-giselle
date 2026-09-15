/* REGISTRO DE ACEITES — Google Sheets / Apps Script
CONFIGURAÇÃO:
1. Crie/abra uma planilha no Google Sheets.
2. Extensões -> Apps Script.
3. Cole google-apps-script.gs e salve.
4. Implantar -> Nova implantação -> App da Web.
   Executar como: Eu | Quem tem acesso: Qualquer pessoa
5. Copie a URL /exec e cole em SHEETS_WEBAPP_URL abaixo.
*/
const SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwbCewQGF14clDdEmqLGx12nK3UvDjTCAJUV_it00J5CvZOoJjYB0r02YiVVPtFMTo/exec";
const TCLE_VERSION = "1.0";
const TCLE_HASH = "dbdebda48f12014f3951bd19187c49386d334f3dd254cdfc0b40d61698dd2968";

const cpfInput = document.getElementById('cpf');
cpfInput.addEventListener('input', () => {
  let v = cpfInput.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  cpfInput.value = v; validateForm();
});
function validarCPF(cpfRaw){
  const cpf = cpfRaw.replace(/\D/g,'');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum=0; for(let i=0;i<9;i++) sum += +cpf[i]*(10-i);
  let rev=11-(sum%11); if(rev>=10) rev=0; if(rev!==+cpf[9]) return false;
  sum=0; for(let i=0;i<10;i++) sum += +cpf[i]*(11-i);
  rev=11-(sum%11); if(rev>=10) rev=0; return rev===+cpf[10];
}

const docScroll=document.getElementById('docScroll');
const progressFill=document.getElementById('progressFill');
const scrollHint=document.getElementById('scrollHint');
const consentRow=document.getElementById('consentRow');
const consentCheck=document.getElementById('consentCheck');
consentCheck.disabled=false; consentRow.classList.remove('locked');
function updateScrollProgress(){
  const {scrollTop,scrollHeight,clientHeight}=docScroll;
  const max=scrollHeight-clientHeight;
  const pct=max<=0?100:Math.min(100,Math.round(scrollTop/max*100));
  progressFill.style.width=pct+'%';
  if(pct>=98){
    scrollHint.classList.add('done');
    scrollHint.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>Leitura concluída</span>';
  } else {
    scrollHint.classList.remove('done');
    scrollHint.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg><span>Progresso de leitura — <b>'+pct+'%</b></span>';
  }
}
docScroll.addEventListener('scroll',updateScrollProgress); updateScrollProgress();

const nomeInput=document.getElementById('nome');
const emailInput=document.getElementById('email');
const submitBtn=document.getElementById('submitBtn');
const statusMsg=document.getElementById('statusMsg');
function isNomeValid(v){return v.trim().split(/\s+/).filter(Boolean).length>=2;}
function isEmailValid(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());}
function validateForm(){
  const nomeOk=isNomeValid(nomeInput.value);
  const cpfOk=cpfInput.value.trim()===''||validarCPF(cpfInput.value);
  const emailOk=isEmailValid(emailInput.value);
  document.getElementById('errNome').classList.toggle('show',nomeInput.value.length>0&&!nomeOk);
  document.getElementById('errCpf').classList.toggle('show',cpfInput.value.length>0&&!cpfOk);
  document.getElementById('errEmail').classList.toggle('show',emailInput.value.length>0&&!emailOk);
  nomeInput.classList.toggle('invalid',nomeInput.value.length>0&&!nomeOk);
  cpfInput.classList.toggle('invalid',cpfInput.value.length>0&&!cpfOk);
  emailInput.classList.toggle('invalid',emailInput.value.length>0&&!emailOk);
  submitBtn.disabled=!(nomeOk&&cpfOk&&emailOk&&consentCheck.checked);
  return !submitBtn.disabled;
}
[nomeInput,emailInput].forEach(el=>el.addEventListener('input',validateForm));
consentCheck.addEventListener('change',validateForm);

function showStatus(kind,text){statusMsg.className='status-msg show '+kind;statusMsg.textContent=text;}
function base64ToBlob(b64,mime){
  const byteChars=atob(b64), bytes=new Uint8Array(byteChars.length);
  for(let i=0;i<byteChars.length;i++) bytes[i]=byteChars.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}
function downloadPdf(){
  try{
    if(!window.TCLE_PDF_BASE64){showStatus('error','PDF não encontrado.');return false;}
    const blob=base64ToBlob(window.TCLE_PDF_BASE64,'application/pdf');
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='TCLE_Processamento_Auditivo_Central.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000); return true;
  }catch(err){console.error(err);showStatus('error','Não foi possível gerar o PDF.');return false;}
}
document.getElementById('closeSealBtn').addEventListener('click',()=>document.getElementById('sealOverlay').classList.remove('show'));

async function registrarNaPlanilha(record){
  if(!SHEETS_WEBAPP_URL || SHEETS_WEBAPP_URL.includes('COLE_AQUI')) return false;
  try{
    await fetch(SHEETS_WEBAPP_URL,{
      method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(record)
    });
    return true;
  }catch(err){console.error('Falha ao registrar consentimento:',err);return false;}
}

submitBtn.addEventListener('click',async()=>{
  if(!validateForm()) return;
  submitBtn.disabled=true; submitBtn.textContent='Registrando...';
  showStatus('info','Registrando seu consentimento...');

  const nome=nomeInput.value.trim(), cpf=cpfInput.value.trim(), email=emailInput.value.trim();
  const now=new Date();
  const dataHora=now.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});
  const record={
    nome, cpf, email, dataHora,
    timestamp:now.toISOString(),
    termo:'TCLE — Processamento Auditivo Central no Desempenho Acadêmico',
    termoVersao:TCLE_VERSION,
    termoHash:TCLE_HASH,
    userAgent:navigator.userAgent,
    origem:location.hostname
  };

  const registered=await registrarNaPlanilha(record);
  if(!registered){
    submitBtn.disabled=false; submitBtn.textContent='Aceitar termo e baixar PDF';
    showStatus('error','Não foi possível registrar o consentimento. Verifique a configuração do Google Sheets e tente novamente. O PDF não será considerado como aceite até o registro ser confirmado.');
    return;
  }

  const downloaded=downloadPdf();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  document.getElementById('sealMeta').innerHTML=
    `<div><span>Nome</span><span>${esc(nome)}</span></div>
     <div><span>CPF</span><span>${esc(cpf||'Não informado')}</span></div>
     <div><span>E-mail</span><span>${esc(email)}</span></div>
     <div><span>Data</span><span>${esc(dataHora)}</span></div>
     <div><span>Versão</span><span>${TCLE_VERSION}</span></div>`;
  document.getElementById('sealOverlay').classList.add('show');
  showStatus(downloaded?'success':'info',downloaded?'Consentimento registrado e PDF baixado.':'Consentimento registrado. Use o botão de download no resumo.');
  submitBtn.textContent='Termo já assinado';

  // Após confirmar o registro e o download do TCLE, direciona automaticamente
  // o participante para o formulário da pesquisa. O botão continua disponível
  // caso o navegador bloqueie a abertura automática.
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSepnzKz2FN6Q4koSimgKFjZ-4hp44fdjZsTrGmeCD-kpBq_NQ/viewform?usp=header';
  setTimeout(() => {
    window.location.href = FORM_URL;
  }, 1800);
});
