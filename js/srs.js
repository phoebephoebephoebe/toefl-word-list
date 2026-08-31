// ============================================================
// 進度追蹤 — 只記對/錯次數（不分階段、無日期排程、無連續天數）
// LocalStorage keys:
//   toefl_progress → { [wordId]: { id, correct, wrong } }
//   toefl_settings → { activeUnits: string[] }
// ============================================================

const LS = {
  PROGRESS: 'toefl_progress',
  SETTINGS: 'toefl_settings',
  SESSION: 'toefl_session',
};

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── 進度資料 ──────────────────────────────────────────────
function getAllProgress() { return lsGet(LS.PROGRESS, {}); }
function saveProgress(data) { lsSet(LS.PROGRESS, data); }

function getItemProgress(id) {
  const data = getAllProgress();
  return data[id] ?? { id, correct: 0, wrong: 0 };
}

function updateItemProgress(id, isCorrect) {
  const data = getAllProgress();
  const item = data[id] ?? { id, correct: 0, wrong: 0 };
  if (isCorrect) item.correct++;
  else item.wrong++;
  data[id] = item;
  saveProgress(data);
  return item;
}

// ── 設定 ──────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  activeUnits: [],
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...lsGet(LS.SETTINGS, {}) };
}
function saveSettings(s) { lsSet(LS.SETTINGS, s); }

function getActiveUnits() { return getSettings().activeUnits || []; }

function toggleActiveUnit(unitId) {
  const s = getSettings();
  const list = [...(s.activeUnits || [])];
  const i = list.indexOf(unitId);
  if (i >= 0) list.splice(i, 1); else list.push(unitId);
  s.activeUnits = list;
  saveSettings(s);
  return list;
}

// ── 練習池 ────────────────────────────────────────────────
function getPoolWords() {
  const active = getActiveUnits();
  if (active.length === 0) return [];
  return WORDS.filter(w => active.includes(w.unit));
}

function getPoolCountForUnit(unitId) {
  return WORDS.filter(w => w.unit === unitId).length;
}

function getWrongWords() {
  const data = getAllProgress();
  return getPoolWords().filter(w => {
    const p = data[w.id];
    return p && p.wrong > 0 && p.wrong >= p.correct;
  });
}

// 已熟悉：答對次數多於答錯次數（且至少答對過一次）
function getMasteredWords() {
  const data = getAllProgress();
  return getPoolWords().filter(w => {
    const p = data[w.id];
    return p && p.correct > 0 && p.correct > p.wrong;
  });
}

// 單一單字的學習狀態：'mastered' | 'struggling' | 'new'（未練習過）
function getWordStatus(wordId) {
  const p = getAllProgress()[wordId];
  if (!p || (p.correct === 0 && p.wrong === 0)) return 'new';
  if (p.wrong > 0 && p.wrong >= p.correct) return 'struggling';
  if (p.correct > p.wrong) return 'mastered';
  return 'new';
}

// scope: 'ALL' | 'WRONG' | <unitId>
function getScopePool(scope) {
  if (scope === 'WRONG') return getWrongWords();
  if (!scope || scope === 'ALL') return getPoolWords();
  return WORDS.filter(w => w.unit === scope);
}

// 加權隨機排序：答錯次數越多的單字，排序權重越高（越容易排在前面）
function _weightedShuffle(items) {
  const data = getAllProgress();
  return items
    .map(item => {
      const p = data[item.id];
      const wrong = p ? p.wrong : 0;
      const weight = 1 + wrong * 3;
      const key = Math.pow(Math.random(), 1 / weight);
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .map(x => x.item);
}

function getStudyQueue(scope) {
  const pool = getScopePool(scope);
  return _weightedShuffle(pool);
}

// ── TTS ───────────────────────────────────────────────────
// 明確挑選英文語音，避免瀏覽器 fallback 到系統預設（例如中文）語音
// 導致單字被用錯誤腔調/語言唸出的問題。getVoices() 在部分瀏覽器要等
// voiceschanged 事件後才有資料，因此做快取＋事件監聽。
let _englishVoice = null;
let _voiceListReady = false;

// 常見的高品質英文語音（優先使用）
const GOOD_VOICE_NAMES = /Samantha|Ava|Zoe|Evan|Nicky|Allison|Susan|Victoria|Google US English|Microsoft (Aria|Jenny|Guy|Zira)/i;
// macOS 內建的「特效／玩具」語音（沙啞、機械音、卡通音等，避免選到）
const BAD_VOICE_NAMES = /Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Kathy|Organ|Ralph|Trinoids|Whisper|Zarvox|Bruce|Wobble|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i;

function _pickEnglishVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  _voiceListReady = true;
  const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (enVoices.length === 0) return null;
  return (
    enVoices.find(v => v.lang === 'en-US' && GOOD_VOICE_NAMES.test(v.name)) ||
    enVoices.find(v => GOOD_VOICE_NAMES.test(v.name)) ||
    enVoices.find(v => v.lang === 'en-US' && !BAD_VOICE_NAMES.test(v.name)) ||
    enVoices.find(v => !BAD_VOICE_NAMES.test(v.name)) ||
    enVoices[0]
  );
}

if (window.speechSynthesis) {
  _englishVoice = _pickEnglishVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    _englishVoice = _pickEnglishVoice();
  };
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  if (!_voiceListReady) _englishVoice = _pickEnglishVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  u.pitch = 1;
  if (_englishVoice) u.voice = _englishVoice;
  window.speechSynthesis.speak(u);
}

// ── 匯出 / 匯入 / 重置 ────────────────────────────────────
function exportProgress() {
  return JSON.stringify({
    progress: getAllProgress(),
    settings: getSettings(),
  }, null, 2);
}

function importProgress(jsonStr) {
  const d = JSON.parse(jsonStr);
  if (d.progress) lsSet(LS.PROGRESS, d.progress);
  if (d.settings) lsSet(LS.SETTINGS, d.settings);
}

function resetProgress() {
  localStorage.removeItem(LS.PROGRESS);
}

// ── 練習 session 持久化（離開頁面／關閉瀏覽器後可恢復進度）────
// 只存單字 id，不存整個物件，避免資料重複；還原時用 WORDS_MAP 查回。
function saveSession(state) {
  lsSet(LS.SESSION, {
    mode: state.mode,
    scope: state.scope,
    queueIds: state.queue.map(w => w.id),
    idx: state.idx,
    sessionCorrect: state.sessionCorrect,
    sessionWrong: state.sessionWrong,
    wrongItemIds: state.wrongItems.map(w => w.id),
    isRetryRound: state.isRetryRound,
  });
}

function loadSession() {
  const s = lsGet(LS.SESSION, null);
  if (!s || !Array.isArray(s.queueIds)) return null;
  const queue = s.queueIds.map(id => WORDS_MAP[id]).filter(Boolean);
  if (queue.length === 0 || s.idx >= queue.length) return null;
  const wrongItems = (s.wrongItemIds || []).map(id => WORDS_MAP[id]).filter(Boolean);
  return {
    mode: s.mode,
    scope: s.scope,
    queue,
    idx: s.idx,
    sessionCorrect: s.sessionCorrect || 0,
    sessionWrong: s.sessionWrong || 0,
    wrongItems,
    isRetryRound: !!s.isRetryRound,
  };
}

function clearSession() {
  localStorage.removeItem(LS.SESSION);
}
