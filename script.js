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
const EMAILJS_PUBLIC_KEY  = "CFTG7TF6SeLnNpF1g";   // já preenchida
const EMAILJS_SERVICE_ID  = "service_5rqtv5g";      // já preenchida (Gmail)
const EMAILJS_TEMPLATE_ID = "template_6ppavgv";    // já preenchida (Email Templates)
const NOTIFY_EMAIL        = "giselledantas89@gmail.com"; // único destinatário do e-mail de notificação
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
  try {
    if (!window.TCLE_PDF_BASE64) {
      showStatus('error', 'Não encontrei o arquivo do PDF (pdf-data.js). Confirme que ele está na mesma pasta do index.html.');
      return false;
    }
    const blob = base64ToBlob(window.TCLE_PDF_BASE64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TCLE_Processamento_Auditivo_Central.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    return true;
  } catch (err) {
    console.error('Falha ao gerar o PDF para download:', err);
    showStatus('error', 'Não foi possível gerar o PDF para download. Veja o console do navegador (F12) para detalhes.');
    return false;
  }
}

document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);
document.getElementById('closeSealBtn').addEventListener('click', ()=>{
  document.getElementById('sealOverlay').classList.remove('show');
});

// ---- Banco de dados (window.storage — disponível quando esta página roda
//      como artefato do Claude; se hospedada fora, essa função é ignorada
//      silenciosamente e o registro só existe via e-mail). ----
async function salvarNoBanco(record){
  if (!window.storage) return false;
  try {
    const key = 'consent:' + record.cpf.replace(/\D/g,'') + ':' + Date.now();
    await window.storage.set(key, JSON.stringify(record), true); // shared=true: visível a quem abrir este artefato
    return true;
  } catch (err) {
    console.error('Falha ao salvar no banco de dados:', err);
    return false;
  }
}

async function listarDoBanco(){
  if (!window.storage) return [];
  try {
    const idx = await window.storage.list('consent:', true);
    if (!idx || !idx.keys) return [];
    const registros = [];
    for (const k of idx.keys){
      try {
        const r = await window.storage.get(k, true);
        if (r && r.value) registros.push(JSON.parse(r.value));
      } catch (e) { /* ignora chave corrompida */ }
    }
    registros.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
    return registros;
  } catch (err) {
    console.error('Falha ao listar banco de dados:', err);
    return [];
  }
}

async function notificarAceite(nome, cpf, email, dataHora){
  if (!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && window.emailjs)) return false;
  // Notifica giselledantas89@gmail.com com os dados de quem assinou o termo.
  // O PDF não vai anexado — o participante baixa o arquivo direto pelo site.
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_name: 'Giselle',
    to_email: NOTIFY_EMAIL,
    participant_name: nome,
    participant_cpf: cpf,
    participant_email: email,
    data_hora: dataHora
  });
  return true;
}

submitBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Preparando...';
  showStatus('info', 'Registrando seu consentimento...');

  const nome = nomeInput.value.trim();
  const cpf = cpfInput.value.trim();
  const email = emailInput.value.trim();
  const dataHora = new Date().toLocaleString('pt-BR');
  const emailjsConfigured = !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID);

  // 1) Participante baixa o PDF direto
  const downloaded = downloadPdf();

  // 2) Notifica giselledantas89@gmail.com com nome, CPF e e-mail de quem assinou
  let notified = false;
  if (emailjsConfigured && window.emailjs) {
    try { notified = await notificarAceite(nome, cpf, email, dataHora); }
    catch (err) { console.error('Falha ao notificar:', err); }
  }

  // 3) Salva no banco de dados (window.storage)
  const savedToDb = await salvarNoBanco({ nome, cpf, email, dataHora, timestamp: Date.now() });

  document.getElementById('sealMeta').innerHTML = `
    <div><span>Nome</span><span>${nome}</span></div>
    <div><span>CPF</span><span>${cpf}</span></div>
    <div><span>E-mail</span><span>${email}</span></div>
    <div><span>Data</span><span>${dataHora}</span></div>
  `;
  document.getElementById('sealOverlay').classList.add('show');

  if (downloaded && notified){
    showStatus('success', 'Termo assinado e PDF baixado.' + (savedToDb ? ' Registro salvo no banco de dados.' : '') + ' A responsável pela pesquisa foi notificada.');
  } else if (downloaded){
    showStatus(emailjsConfigured ? 'error' : 'info', 'Termo assinado e PDF baixado.' + (savedToDb ? ' Registro salvo no banco de dados.' : '') + (emailjsConfigured ? ' Porém houve falha ao notificar a responsável pela pesquisa.' : ' A notificação por e-mail ainda não está configurada.'));
  } else {
    showStatus('error', 'Consentimento registrado' + (savedToDb ? ' e salvo no banco de dados' : '') + ', mas houve um problema ao baixar o PDF. Use o botão de download no resumo.');
  }

  submitBtn.textContent = 'Termo já assinado';
});

// ---- Painel do pesquisador: abra a página com ?admin=1 para ver os registros salvos ----
if (new URLSearchParams(location.search).get('admin') === '1'){
  (async () => {
    const registros = await listarDoBanco();
    const panel = document.createElement('div');
    panel.style.cssText = 'max-width:760px;margin:24px auto 0;padding:0 24px;';
    const rows = registros.map(r => `
      <tr>
        <td>${r.nome || ''}</td>
        <td>${r.cpf || ''}</td>
        <td>${r.email || ''}</td>
        <td>${r.dataHora || ''}</td>
      </tr>`).join('');
    panel.innerHTML = `
      <div style="background:#fff;border:1px solid #E6E7F0;border-radius:14px;padding:20px 24px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;">
        <div style="font-weight:600;margin-bottom:12px;font-family:'Inter',sans-serif;font-size:14px;">
          Painel — ${registros.length} consentimento(s) registrado(s)
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="text-align:left;color:#8A8FA3;">
            <th style="padding:6px 8px;">Nome</th><th style="padding:6px 8px;">CPF</th>
            <th style="padding:6px 8px;">E-mail</th><th style="padding:6px 8px;">Data</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="padding:8px;">Nenhum registro ainda.</td></tr>'}</tbody>
        </table>
      </div>`;
    document.querySelector('.main').prepend(panel);
  })();
}