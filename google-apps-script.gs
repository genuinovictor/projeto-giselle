/**
 * GOOGLE APPS SCRIPT — REGISTRO DOS ACEITES DO TCLE
 *
 * Use este arquivo em uma planilha Google Sheets:
 * Extensões > Apps Script > cole > Salve.
 *
 * Depois:
 * Implantar > Nova implantação > App da Web
 * - Executar como: Eu
 * - Quem tem acesso: Qualquer pessoa
 *
 * A URL /exec será colocada no script.js do site.
 */

const ABA = 'Aceites';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ABA);
  if (!sheet) sheet = ss.insertSheet(ABA);

  const headers = [
    'ID',
    'Data/Hora do servidor',
    'Data/Hora do participante',
    'Nome completo',
    'CPF',
    'E-mail',
    'Termo',
    'Versão do TCLE',
    'Hash SHA-256 do termo',
    'User-Agent',
    'Origem',
    'Status'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  }

  return 'Planilha preparada com sucesso.';
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'TCLE — Registro de consentimentos',
    message: 'Serviço ativo.'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    setup();

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Requisição vazia.' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'JSON inválido.' });
    }

    const nome = clean(data.nome);
    const cpf = clean(data.cpf);
    const email = clean(data.email);
    const dataHoraParticipante = clean(data.dataHora);
    const termo = clean(data.termo);
    const termoVersao = clean(data.termoVersao);
    const termoHash = clean(data.termoHash);
    const userAgent = clean(data.userAgent);
    const origem = clean(data.origem);

    if (nome.length < 2) {
      return jsonResponse({ ok: false, error: 'Nome inválido.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ ok: false, error: 'E-mail inválido.' });
    }

    if (!termoVersao || !termoHash) {
      return jsonResponse({ ok: false, error: 'Versão/hash do termo ausentes.' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ABA);

    const id = Utilities.getUuid();
    const serverDate = new Date();

    sheet.appendRow([
      id,
      serverDate,
      dataHoraParticipante,
      safeCell(nome),
      safeCell(cpf),
      safeCell(email),
      safeCell(termo),
      safeCell(termoVersao),
      safeCell(termoHash),
      safeCell(userAgent),
      safeCell(origem),
      'ACEITO'
    ]);

    return jsonResponse({ ok: true, id: id });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ok: false, error: 'Erro interno ao registrar.' });
  } finally {
    lock.releaseLock();
  }
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, 2000);
}

/**
 * Evita que texto enviado pelo participante seja interpretado
 * pelo Google Sheets como fórmula.
 */
function safeCell(value) {
  const s = clean(value);
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
