const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let mainWindow;
let anthropicClient = null;
let pdfChunks = [];

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // corrupted config, start fresh
  }
  return {};
}

function saveConfig(config) {
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

function initAnthropicClient(apiKey) {
  if (!apiKey) return null;
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f1a',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Load saved API key on startup
  const config = loadConfig();
  if (config.apiKey) {
    initAnthropicClient(config.apiKey);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const MAX_CONTEXT_CHARS = 25000;

const CZECH_STOP_WORDS = new Set([
  'a', 'aby', 'aj', 'ale', 'ani', 'asi', 'az', 'až', 'bez', 'bude', 'budem',
  'budes', 'budete', 'budou', 'by', 'byl', 'byla', 'byli', 'bylo', 'být',
  'co', 'ci', 'což', 'další', 'do', 'ho', 'i', 'ja', 'já', 'jak', 'jako',
  'jaký', 'je', 'jeho', 'jej', 'její', 'jejich', 'jen', 'jenž', 'jest',
  'jeste', 'ještě', 'ji', 'jinak', 'jine', 'jiné', 'jiný', 'jiz', 'již',
  'jsem', 'jses', 'jsi', 'jsme', 'jsou', 'jste', 'k', 'kam', 'kde', 'kdo',
  'kdyz', 'když', 'ke', 'ktera', 'která', 'ktere', 'které', 'kteri', 'kteří',
  'který', 'kvůli', 'ma', 'má', 'mate', 'máte', 'me', 'mě', 'mezi', 'mi',
  'mit', 'mít', 'mne', 'mnou', 'moc', 'moje', 'можe', 'může', 'muze', 'my',
  'na', 'nad', 'nam', 'nám', 'nas', 'nás', 'náš', 'ne', 'nebo', 'nebyl',
  'necht', 'nechť', 'nejsou', 'neni', 'není', 'nez', 'než', 'nic', 'nich',
  'ním', 'no', 'o', 'od', 'on', 'ona', 'oni', 'ono', 'ony', 'pak', 'po',
  'pod', 'podle', 'pokud', 'potom', 'pouze', 'prave', 'právě', 'pred', 'před',
  'přes', 'přese', 'pri', 'při', 'pro', 'proc', 'proč', 'proto', 'protoze',
  'protože', 're', 's', 'se', 'si', 'sice', 'sve', 'své', 'svůj', 'svym',
  'svým', 'ta', 'tak', 'take', 'také', 'takze', 'takže', 'tam', 'tato', 'te',
  'tě', 'tedy', 'ten', 'tento', 'ti', 'tim', 'tím', 'to', 'toho', 'tohoto',
  'tom', 'tomto', 'tomu', 'tomuto', 'tu', 'tuto', 'ty', 'tyto', 'u', 'uz',
  'už', 'v', 've', 'vam', 'vám', 'vas', 'vás', 'váš', 'vice', 'více',
  'vsak', 'však', 'vy', 'z', 'za', 'ze', 'že', 'že',
  // common question words to ignore
  'co', 'jaké', 'jaký', 'jaká', 'kolik', 'kde', 'kdy', 'proč', 'jak',
  'řekni', 'popiš', 'vysvětli', 'najdi', 'ukaž',
]);

function splitIntoChunks(text) {
  const lines = text.split(/\n/);
  const chunks = [];
  let currentChunk = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      const overlapText = currentChunk.slice(-CHUNK_OVERLAP);
      currentChunk = overlapText + ' ' + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + trimmed : trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Synonym groups for Czech technical manuals — each array = interchangeable terms
const SYNONYM_GROUPS = [
  ['obsah balení', 'rozsah dodávky', 'součásti balení', 'příslušenství', 'dodávané příslušenství', 'obsah dodávky'],
  ['technické údaje', 'specifikace', 'parametry', 'technická data', 'technické parametry'],
  ['údržba', 'servis', 'ošetřování', 'čištění', 'péče'],
  ['bezpečnost', 'bezpečnostní pokyny', 'varování', 'nebezpečí', 'výstraha'],
  ['uvedení do provozu', 'spuštění', 'zapnutí', 'první použití', 'start'],
  ['vypnutí', 'zastavení', 'odstavení'],
  ['závada', 'porucha', 'chyba', 'problém', 'řešení problémů', 'odstraňování závad', 'troubleshooting'],
  ['návod k obsluze', 'návod k použití', 'uživatelská příručka', 'manuál'],
  ['záruka', 'záruční podmínky', 'reklamace'],
  ['instalace', 'montáž', 'sestavení', 'připojení'],
  ['rozměry', 'hmotnost', 'váha', 'velikost'],
];

function expandWithSynonyms(keywords) {
  const expanded = new Set(keywords);
  const questionLower = keywords.join(' ');

  for (const group of SYNONYM_GROUPS) {
    // Check if any synonym from this group matches part of the question
    const hasMatch = group.some((synonym) => {
      const synonymWords = synonym.split(' ');
      return synonymWords.some((sw) =>
        keywords.some((kw) => kw.startsWith(sw.slice(0, 3)) || sw.startsWith(kw.slice(0, 3)))
      );
    });

    if (hasMatch) {
      for (const synonym of group) {
        for (const word of synonym.split(' ')) {
          if (word.length > 2 && !CZECH_STOP_WORDS.has(word)) {
            expanded.add(word);
          }
        }
      }
    }
  }

  return Array.from(expanded);
}

function extractKeywords(question) {
  return question
    .toLowerCase()
    .replace(/[^a-záčďéěíňóřšťúůýž0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !CZECH_STOP_WORDS.has(word));
}

// Generate stem variants to handle Czech inflection (e.g. "obsahem" → ["obsahem","obsahe","obsah"])
function getStemVariants(keyword) {
  const variants = [keyword];
  for (let len = keyword.length - 1; len >= Math.max(3, keyword.length - 3); len--) {
    variants.push(keyword.slice(0, len));
  }
  return variants;
}

function findRelevantChunks(question) {
  if (pdfChunks.length === 0) return '';

  const keywords = extractKeywords(question);

  // Always include first chunks as baseline context (TOC, overview)
  const BASELINE_CHARS = 5000;
  let baselineText = '';
  const baselineIndices = new Set();
  for (let i = 0; i < pdfChunks.length; i++) {
    if (baselineText.length + pdfChunks[i].length > BASELINE_CHARS) break;
    baselineText += pdfChunks[i] + '\n\n';
    baselineIndices.add(i);
  }

  if (keywords.length === 0) {
    let result = baselineText;
    for (let i = baselineIndices.size; i < pdfChunks.length; i++) {
      if (result.length + pdfChunks[i].length > MAX_CONTEXT_CHARS) break;
      result += pdfChunks[i] + '\n\n';
    }
    return result;
  }

  // Expand keywords with synonyms, then build stem variants
  const expandedKeywords = expandWithSynonyms(keywords);
  const allVariants = expandedKeywords.flatMap(getStemVariants);

  const scored = pdfChunks.map((chunk, index) => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const variant of allVariants) {
      let pos = 0;
      while ((pos = lowerChunk.indexOf(variant, pos)) !== -1) {
        score++;
        pos += variant.length;
      }
    }
    return { chunk, score, index };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  // Start with baseline, then add highest-scoring chunks
  let totalLen = baselineText.length;
  const selected = [];
  for (const item of scored) {
    if (item.score === 0) break;
    if (baselineIndices.has(item.index)) continue;
    if (totalLen + item.chunk.length > MAX_CONTEXT_CHARS) continue;
    selected.push(item);
    totalLen += item.chunk.length;
  }

  // Combine baseline + matched chunks sorted by original order
  const allSelected = [
    ...Array.from(baselineIndices).map((i) => ({ chunk: pdfChunks[i], index: i })),
    ...selected,
  ];
  allSelected.sort((a, b) => a.index - b.index);
  return allSelected.map((item) => item.chunk).join('\n\n');
}

async function parsePdfFile(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);

  pdfChunks = splitIntoChunks(data.text);
  console.log(`[PDF] Parsed "${path.basename(filePath)}": ${data.text.length} chars → ${pdfChunks.length} chunks`);

  return {
    name: path.basename(filePath),
    pages: data.numpages,
    totalChunks: pdfChunks.length,
  };
}

// --- IPC Handlers ---

ipcMain.handle('get-api-key', () => {
  const config = loadConfig();
  return config.apiKey || null;
});

ipcMain.handle('set-api-key', (_event, apiKey) => {
  saveConfig({ apiKey });
  initAnthropicClient(apiKey);
  return true;
});

ipcMain.handle('open-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Vybrat PDF soubor',
    filters: [{ name: 'PDF soubory', extensions: ['pdf'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return parsePdfFile(result.filePaths[0]);
});

ipcMain.handle('parse-pdf-path', async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Soubor neexistuje.');
  }
  return parsePdfFile(filePath);
});

ipcMain.handle('ask-question', async (_event, { question, history }) => {
  if (!anthropicClient) {
    throw new Error('API klíč není nastaven.');
  }
  if (pdfChunks.length === 0) {
    throw new Error('Žádný PDF dokument není nahrán.');
  }

  const keywords = extractKeywords(question);
  const expanded = expandWithSynonyms(keywords);
  const relevantText = findRelevantChunks(question);
  console.log(`[Ask] Keywords: [${keywords.join(', ')}] +synonyms: [${expanded.filter((w) => !keywords.includes(w)).join(', ')}] → ${relevantText.length} chars context`);

  const systemPrompt = `Jsi užitečný AI asistent, který odpovídá na otázky o nahraném PDF dokumentu (návodu). Odpovídej vždy v češtině. Buď přesný a stručný. Pokud odpověď není v nalezených částech dokumentu, řekni to.

Relevantní části dokumentu:
${relevantText}`;

  const messages = [
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: question },
  ];

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      });
      return response.content[0].text;
    } catch (err) {
      if (err.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '30', 10);
        const waitMs = Math.min(retryAfter, 60) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
});
