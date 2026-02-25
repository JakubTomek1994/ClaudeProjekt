const chatArea = document.getElementById('chat-area');
const welcome = document.getElementById('welcome');
const fileInfo = document.getElementById('file-info');
const questionInput = document.getElementById('question-input');
const btnSend = document.getElementById('btn-send');
const btnUpload = document.getElementById('btn-upload');
const btnSettings = document.getElementById('btn-settings');
const apiModal = document.getElementById('api-modal');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySave = document.getElementById('api-key-save');
const apiKeyCancel = document.getElementById('api-key-cancel');
const apiKeyError = document.getElementById('api-key-error');

let pdfLoaded = false;
let pdfName = null;
let chatHistory = []; // { role: 'user'|'assistant', content: string }
let isLoading = false;

// --- Init ---
async function init() {
  const key = await window.api.getApiKey();
  if (!key) {
    showModal();
  }
}

// --- Modal ---
function showModal() {
  apiModal.classList.remove('hidden');
  apiKeyInput.focus();
  apiKeyError.classList.add('hidden');
}

function hideModal() {
  apiModal.classList.add('hidden');
  apiKeyInput.value = '';
  apiKeyError.classList.add('hidden');
}

apiKeySave.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key || !key.startsWith('sk-')) {
    apiKeyError.classList.remove('hidden');
    return;
  }
  await window.api.setApiKey(key);
  hideModal();
});

apiKeyCancel.addEventListener('click', hideModal);

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    apiKeySave.click();
  }
});

btnSettings.addEventListener('click', async () => {
  const key = await window.api.getApiKey();
  if (key) {
    apiKeyInput.value = key;
  }
  showModal();
});

// --- PDF Loading (shared) ---
function handlePdfLoaded(result) {
  pdfLoaded = true;
  pdfName = result.name;

  const label = fileInfo.querySelector('.file-label');
  label.textContent = `${result.name} (${result.pages} ${result.pages === 1 ? 'strana' : result.pages < 5 ? 'strany' : 'stran'})`;
  label.classList.add('active');

  chatHistory = [];
  chatArea.innerHTML = '';
  const welcomeEl = document.getElementById('welcome');
  if (welcomeEl) welcomeEl.remove();

  addSystemMessage(`Soubor "${result.name}" byl úspěšně nahrán (${result.pages} stran). Ptejte se na cokoliv!`);

  questionInput.disabled = false;
  btnSend.disabled = false;
  questionInput.focus();
}

// --- PDF Upload (button) ---
btnUpload.addEventListener('click', async () => {
  const result = await window.api.openPdf();
  if (!result) return;
  handlePdfLoaded(result);
});

// --- Drag & Drop ---
const dropOverlay = document.getElementById('drop-overlay');
let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) {
    dropOverlay.classList.remove('hidden');
  }
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropOverlay.classList.add('hidden');
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.add('hidden');

  const file = e.dataTransfer.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    addErrorMessage('Podporovány jsou pouze PDF soubory.');
    return;
  }

  try {
    const result = await window.api.parsePdfPath(file.path);
    handlePdfLoaded(result);
  } catch (err) {
    addErrorMessage(err.message || 'Nepodařilo se načíst PDF soubor.');
  }
});

// --- Chat ---
function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.innerHTML = `
    <span class="label">Systém</span>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatArea.appendChild(div);
  scrollToBottom();
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-message user';
  div.innerHTML = `
    <span class="label">Vy</span>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatArea.appendChild(div);
  scrollToBottom();
}

function addAssistantMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.innerHTML = `
    <span class="label">Claude AI</span>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatArea.appendChild(div);
  scrollToBottom();
}

function addErrorMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-message error assistant';
  div.innerHTML = `
    <span class="label">Chyba</span>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatArea.appendChild(div);
  scrollToBottom();
}

function showLoading() {
  const div = document.createElement('div');
  div.className = 'loading-indicator';
  div.id = 'loading';
  div.innerHTML = `
    <div class="loading-dot"></div>
    <div class="loading-dot"></div>
    <div class="loading-dot"></div>
  `;
  chatArea.appendChild(div);
  scrollToBottom();
}

function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.remove();
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || !pdfLoaded || isLoading) return;

  addUserMessage(question);
  questionInput.value = '';
  autoResize();

  isLoading = true;
  questionInput.disabled = true;
  btnSend.disabled = true;
  showLoading();

  try {
    const answer = await window.api.askQuestion({
      question,
      history: chatHistory,
    });

    hideLoading();
    addAssistantMessage(answer);

    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: answer });
  } catch (err) {
    hideLoading();
    addErrorMessage(err.message || 'Nastala neočekávaná chyba.');
  } finally {
    isLoading = false;
    questionInput.disabled = false;
    btnSend.disabled = false;
    questionInput.focus();
  }
}

btnSend.addEventListener('click', sendQuestion);

questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

// Auto-resize textarea
function autoResize() {
  questionInput.style.height = 'auto';
  questionInput.style.height = Math.min(questionInput.scrollHeight, 120) + 'px';
}

questionInput.addEventListener('input', autoResize);

// --- Start ---
init();
