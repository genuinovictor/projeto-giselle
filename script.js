/* =========================================================================
   CONFIGURAÇÃO DE ENVIO DE E-MAIL (EmailJS)
   -------------------------------------------------------------------------
   Preencha os três valores abaixo com os dados da sua conta EmailJS
   (www.emailjs.com — plano gratuito permite emails simples; para anexar o
   PDF automaticamente, verifique o limite de tamanho de anexo do seu plano).
   Sem esses valores preenchidos, o site funciona normalmente, mas ao aceitar
   o termo ele apenas mostra a confirmação na tela e libera o botão de
   download do PDF, sem enviar e-mail automático.
   ========================================================================= */
const EMAILJS_PUBLIC_KEY  = "";   // ex: "AbCdEfGhIjKlMnOp"
const EMAILJS_SERVICE_ID  = "";   // ex: "service_unipe"
const EMAILJS_TEMPLATE_ID = "";   // ex: "template_tcle"
const RESEARCHER_EMAIL    = "chirlene.cunha@unipe.edu.br";
/* ========================================================================= */

if (EMAILJS_PUBLIC_KEY && window.emailjs) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ---- CPF mask + validation ----
const cpfInput = document.getElementById('cpf');
cpfInput.addEventListener('input', () => {
  let v = cpfInput.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  cpfInput.value = v;
  validateForm();
});

function validarCPF(cpfRaw){
  const cpf = cpfRaw.replace(/\D/g,'');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i=0;i<9;i++) sum += parseInt(cpf[i],10) * (10-i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9],10)) return false;
  sum = 0;
  for (let i=0;i<10;i++) sum += parseInt(cpf[i],10) * (11-i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[10],10)) return false;
  return true;
}

// ---- Progress bar: apenas indicativo de leitura, não bloqueia o aceite ----
const docScroll = document.getElementById('docScroll');
const progressFill = document.getElementById('progressFill');
const scrollHint = document.getElementById('scrollHint');
const consentRow = document.getElementById('consentRow');
const consentCheck = document.getElementById('consentCheck');

// O checkbox de aceite já começa liberado — a única exigência é preencher os dados corretamente.
consentCheck.disabled = false;
consentRow.classList.remove('locked');

function updateScrollProgress(){
  const { scrollTop, scrollHeight, clientHeight } = docScroll;
  const max = scrollHeight - clientHeight;
  const pct = max <= 0 ? 100 : Math.min(100, Math.round((scrollTop / max) * 100));
  progressFill.style.width = pct + '%';
  if (pct >= 98){
    scrollHint.classList.add('done');
    scrollHint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>Leitura concluída</span>';
  } else {
    scrollHint.classList.remove('done');
    scrollHint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg><span>Progresso de leitura — <b>' + pct + '%</b></span>';
  }
}
docScroll.addEventListener('scroll', updateScrollProgress);
updateScrollProgress();

// ---- Form validation ----
const nomeInput = document.getElementById('nome');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('statusMsg');

function isNomeValid(v){ return v.trim().split(/\s+/).filter(Boolean).length >= 2; }
function isEmailValid(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

function validateForm(){
  const nomeOk = isNomeValid(nomeInput.value);
  const cpfOk = validarCPF(cpfInput.value);
  const emailOk = isEmailValid(emailInput.value);

  document.getElementById('errNome').classList.toggle('show', nomeInput.value.length>0 && !nomeOk);
  document.getElementById('errCpf').classList.toggle('show', cpfInput.value.length>0 && !cpfOk);
  document.getElementById('errEmail').classList.toggle('show', emailInput.value.length>0 && !emailOk);
  nomeInput.classList.toggle('invalid', nomeInput.value.length>0 && !nomeOk);
  cpfInput.classList.toggle('invalid', cpfInput.value.length>0 && !cpfOk);
  emailInput.classList.toggle('invalid', emailInput.value.length>0 && !emailOk);

  const allOk = nomeOk && cpfOk && emailOk && consentCheck.checked;
  submitBtn.disabled = !allOk;
  return allOk;
}
[nomeInput, emailInput].forEach(el => el.addEventListener('input', validateForm));
consentCheck.addEventListener('change', validateForm);

// ---- Submit / send flow ----
function showStatus(kind, text){
  statusMsg.className = 'status-msg show ' + kind;
  statusMsg.textContent = text;
}

function base64ToBlob(b64, mime){
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i=0;i<byteChars.length;i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

function downloadPdf(){
  const blob = base64ToBlob(window.TCLE_PDF_BASE64, 'application/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TCLE_Processamento_Auditivo_Central.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);
document.getElementById('closeSealBtn').addEventListener('click', ()=>{
  document.getElementById('sealOverlay').classList.remove('show');
});

submitBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  showStatus('info', 'Registrando seu consentimento...');

  const nome = nomeInput.value.trim();
  const cpf = cpfInput.value.trim();
  const email = emailInput.value.trim();
  const dataHora = new Date().toLocaleString('pt-BR');

  let emailSent = false;
  let emailError = null;

  if (EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && window.emailjs) {
    try {
      // Template params — configure seu template no EmailJS com estes campos.
      // Para anexar o PDF automaticamente, adicione um campo de anexo no
      // template do EmailJS (recurso disponível conforme o plano da conta)
      // e mapeie para {{pdf_attachment}} usando o base64 abaixo.
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name: nome,
        to_email: email,
        cpf: cpf,
        data_hora: dataHora,
        researcher_email: RESEARCHER_EMAIL,
        pdf_attachment: window.TCLE_PDF_BASE64
      });
      emailSent = true;
    } catch (err) {
      emailError = err;
    }
  }

  document.getElementById('sealMeta').innerHTML = `
    <div><span>Nome</span><span>${nome}</span></div>
    <div><span>CPF</span><span>${cpf}</span></div>
    <div><span>E-mail</span><span>${email}</span></div>
    <div><span>Data</span><span>${dataHora}</span></div>
  `;
  document.getElementById('sealOverlay').classList.add('show');

  if (emailSent){
    showStatus('success', 'Termo assinado e cópia enviada por e-mail para ' + email + '.');
  } else if (EMAILJS_PUBLIC_KEY) {
    showStatus('error', 'Consentimento registrado, mas houve falha ao enviar o e-mail automaticamente. Use o botão de download no resumo, ou anexe o PDF manualmente ao contatar ' + RESEARCHER_EMAIL + '.');
  } else {
    showStatus('info', 'Consentimento registrado. O envio automático de e-mail ainda não foi configurado neste site (veja EMAILJS_* no código) — use o botão de download no resumo para obter o PDF.');
  }

  submitBtn.textContent = 'Termo já assinado';
});