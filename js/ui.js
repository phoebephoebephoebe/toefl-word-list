// ============================================================
// UI — 畫面渲染與事件綁定
// ============================================================

function renderPage(page) {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  main.scrollTop = 0;

  switch (page) {
    case 'home':     main.appendChild(buildHome());     break;
    case 'learn':    main.appendChild(buildLearn());    break;
    case 'pool':     main.appendChild(buildPool());     break;
    case 'practice': main.appendChild(buildPractice()); break;
    case 'settings': main.appendChild(buildSettings()); break;
  }
}

// ── 工具函式 ──────────────────────────────────────────────
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function div(cls, html) { return el('div', cls, html); }
function btn(cls, text, onClick) {
  const b = el('button', cls, text);
  b.addEventListener('click', onClick);
  return b;
}
const SPEAK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

// ============================================================
// 1. 首頁
// ============================================================
function buildHome() {
  const activeUnits = getActiveUnits();
  const poolWords = getPoolWords();
  const progress = getAllProgress();
  const wrongCount = getWrongWords().length;

  const isNewUser = activeUnits.length === 0;

  const wrap = div('page');

  const header = div('home-header');
  header.innerHTML = `<h1 class="app-title">TOEFL 單字學習計畫</h1>`;
  wrap.appendChild(header);

  if (isNewUser) {
    const guide = div('onboarding-card');
    guide.innerHTML = `
      <div class="onboarding-title">開始你的 TOEFL 單字旅程</div>
      <div class="onboard-steps">
        <div class="onboard-step"><span class="step-num">1</span><span>到「學習」瀏覽部分（閱讀／聽力單字本）與章節內容</span></div>
        <div class="onboard-step"><span class="step-num">2</span><span>到「題庫」勾選想背的清單，加入練習池</span></div>
        <div class="onboard-step"><span class="step-num">3</span><span>回到首頁，按開始練習！</span></div>
      </div>`;
    const goBtn = btn('btn-primary', '去設定題庫 →', () => navigateTo('pool'));
    guide.appendChild(goBtn);
    wrap.appendChild(guide);
  }

  const statsRow = div('stats-row stats-row-3');
  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${poolWords.length}</div>
      <div class="stat-label">題庫中</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${wrongCount}</div>
      <div class="stat-label">待加強</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(progress).length}</div>
      <div class="stat-label">已練習</div>
    </div>`;
  wrap.appendChild(statsRow);

  if (isNewUser) {
    const startBtn = btn('btn-primary btn-lg btn-full btn-disabled', '尚未設定題庫', () => {});
    startBtn.disabled = true;
    wrap.appendChild(startBtn);
  } else {
    const label = wrongCount > 0 ? `開始練習（${wrongCount} 個待加強）` : '開始練習';
    wrap.appendChild(btn('btn-primary btn-lg btn-full', label, () => navigateTo('practice', { scope: 'ALL' })));
  }

  const progressSection = div('progress-section');
  const progressTitle = div('progress-title', '題庫設定進度');
  progressSection.appendChild(progressTitle);
  UNITS.forEach(u => {
    const total = getPoolCountForUnit(u.id);
    if (total === 0) return; // 尚未建置資料的清單先不顯示
    const active = activeUnits.includes(u.id);
    const item = div('progress-item');
    item.innerHTML = `
      <span class="progress-label">${u.label}</span>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${active ? 100 : 0}%"></div></div>
      <span class="progress-count">${active ? total : 0}/${total}</span>`;
    progressSection.appendChild(item);
  });
  wrap.appendChild(progressSection);

  const guideSection = div('how-to-section');
  guideSection.innerHTML = `
    <div class="how-to-title">操作說明</div>
    <div class="how-to-item"><span class="how-to-tag">學習</span><span>依部分／章節瀏覽單字，點卡片才會發音</span></div>
    <div class="how-to-item"><span class="how-to-tag">題庫</span><span>勾選要加入練習池的清單</span></div>
    <div class="how-to-item"><span class="how-to-tag">練習</span><span>從下拉選單挑選清單／全部／錯題複習，閃卡或選擇題</span></div>
    <div class="how-to-item"><span class="how-to-tag">進度</span><span>只記錄對／錯次數，答錯多的字會更常出現</span></div>`;
  wrap.appendChild(guideSection);

  return wrap;
}

// ============================================================
// 2. 學習頁
// ============================================================
const PART_ORDER = ['reading', 'listening', 'reading_extra', 'listening_extra'];

function buildLearn() {
  const wrap = div('page');

  const tabs = div('tab-bar');
  tabs.innerHTML = PART_ORDER.map((p, i) =>
    `<button class="tab-btn${i === 0 ? ' active' : ''}" data-part="${p}">${PART_LABELS[p]}</button>`
  ).join('');
  wrap.appendChild(tabs);

  const content = div('tab-content');
  wrap.appendChild(content);

  function showPart(part) {
    tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.part === part));
    content.innerHTML = '';
    content.appendChild(buildPartContent(part));
  }

  tabs.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => showPart(b.dataset.part));
  });

  showPart(PART_ORDER[0]);
  return wrap;
}

function buildPartContent(part) {
  const wrap = div('');
  const chapterLabels = part === 'reading' ? READING_CHAPTER_LABELS
    : part === 'listening' ? LISTENING_CHAPTER_LABELS : null;

  if (!chapterLabels) {
    // 補充單字本：無章節，直接顯示單一清單
    const unitId = part;
    wrap.appendChild(buildWordListForUnit(unitId));
    return wrap;
  }

  const chapters = Object.keys(chapterLabels);

  const chapterBar = div('chapter-bar');
  chapterBar.innerHTML = chapters.map((ch, i) =>
    `<button class="chapter-btn${i === 0 ? ' active' : ''}" data-ch="${ch}">${chapterLabels[ch]}</button>`
  ).join('');
  wrap.appendChild(chapterBar);

  const listWrap = div('');
  wrap.appendChild(listWrap);

  function showChapter(ch) {
    chapterBar.querySelectorAll('.chapter-btn').forEach(b => b.classList.toggle('active', b.dataset.ch === ch));
    listWrap.innerHTML = '';
    listWrap.appendChild(buildWordListForUnit(`${part}__${ch}`));
  }
  chapterBar.querySelectorAll('.chapter-btn').forEach(b => {
    b.addEventListener('click', () => showChapter(b.dataset.ch));
  });

  showChapter(chapters[0]);
  return wrap;
}

function buildPoolBar(units) {
  const bar = div('pool-bar');
  bar.appendChild(el('span', 'pool-label', '加入練習題庫'));
  const pills = div('pool-pills');
  const active = getActiveUnits();
  units.forEach(u => {
    const count = getPoolCountForUnit(u.id);
    const label = part_short_label(u) + (count > 0 ? '' : '（尚無資料）');
    const pill = el('button', `pool-pill${active.includes(u.id) ? ' active' : ''}`, label);
    if (count === 0) { pill.disabled = true; pill.style.opacity = '0.4'; }
    pill.addEventListener('click', () => {
      toggleActiveUnit(u.id);
      pill.classList.toggle('active');
    });
    pills.appendChild(pill);
  });
  bar.appendChild(pills);
  return bar;
}

// ============================================================
// 3. 題庫頁 — 獨立管理「加入練習題庫」，與學習頁瀏覽分開
// ============================================================
function buildPool() {
  const wrap = div('page');

  const header = div('home-header');
  header.innerHTML = `<h1 class="app-title" style="font-size:20px">題庫管理</h1><p class="app-subtitle">勾選要加入練習池的清單</p>`;
  wrap.appendChild(header);

  PART_ORDER.forEach(part => {
    const chapterLabels = part === 'reading' ? READING_CHAPTER_LABELS
      : part === 'listening' ? LISTENING_CHAPTER_LABELS : null;
    const units = chapterLabels
      ? Object.keys(chapterLabels).map(ch => UNITS_MAP[`${part}__${ch}`])
      : [UNITS_MAP[part]];

    const section = div('settings-section');
    section.appendChild(el('div', 'settings-title', PART_LABELS[part]));
    section.appendChild(buildPoolBar(units));
    wrap.appendChild(section);
  });

  return wrap;
}

function part_short_label(u) {
  // 移除 Part 前綴，只顯示章節名稱（Part 已由分頁表達）
  const idx = u.label.indexOf('｜');
  return idx >= 0 ? u.label.slice(idx + 1) : u.label;
}

function buildWordListForUnit(unitId) {
  const words = WORDS.filter(w => w.unit === unitId);
  const wrap = div('word-list-wrap');
  if (words.length === 0) {
    wrap.appendChild(div('empty-list-hint', '此清單尚未建置單字資料'));
    return wrap;
  }
  const list = div('word-list');
  words.forEach(w => {
    const card = div('word-card');
    card.innerHTML = `
      <div class="word-main">
        <span class="word-en">${w.word}</span>
        <span class="word-pos">${w.pos || ''}</span>
      </div>
      <div class="word-meaning">${w.meaning}</div>
      ${w.example ? `<div class="word-example"><span class="ex-en">${w.example}</span><span class="ex-cn">${w.exampleMeaning || ''}</span></div>` : ''}`;
    card.addEventListener('click', () => speak(w.word));
    list.appendChild(card);
  });
  wrap.appendChild(list);
  return wrap;
}

// ============================================================
// 4. 練習頁
// ============================================================
let practiceState = {
  mode: 'flashcard',
  scope: 'ALL',
  queue: [],
  idx: 0,
  flipped: false,
  sessionCorrect: 0,
  sessionWrong: 0,
  wrongItems: [],
  isRetryRound: false,
};

function buildPractice() {
  const wrap = div('page');

  const initScope = pendingPracticeScope || practiceState.scope || 'ALL';
  pendingPracticeScope = null;

  const modeBar = div('mode-bar');
  modeBar.innerHTML = `
    <button class="mode-btn${practiceState.mode === 'flashcard' ? ' active' : ''}" data-mode="flashcard">閃卡</button>
    <button class="mode-btn${practiceState.mode === 'mc' ? ' active' : ''}" data-mode="mc">選擇題</button>`;
  wrap.appendChild(modeBar);

  const scopeWrap = div('scope-select-wrap');
  const select = el('select', 'scope-select');
  const activeUnits = getActiveUnits();
  const options = [];
  options.push(`<option value="ALL">全部（練習池所有單字）</option>`);
  options.push(`<option value="WRONG">錯題複習（答錯次數 ≥ 答對次數）</option>`);
  activeUnits.forEach(uid => {
    const u = UNITS_MAP[uid];
    if (!u) return;
    const count = getPoolCountForUnit(uid);
    if (count === 0) return;
    options.push(`<option value="${uid}">${u.label}</option>`);
  });
  select.innerHTML = options.join('');
  select.value = initScope;
  scopeWrap.appendChild(select);
  wrap.appendChild(scopeWrap);

  const practiceArea = div('practice-area');
  wrap.appendChild(practiceArea);

  practiceState.mode = practiceState.mode || 'flashcard';
  practiceState.scope = initScope;
  _startPracticeSession(practiceArea);

  modeBar.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => {
      modeBar.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      practiceState.mode = b.dataset.mode;
      _startPracticeSession(practiceArea);
    });
  });

  select.addEventListener('change', () => {
    practiceState.scope = select.value;
    _startPracticeSession(practiceArea);
  });

  return wrap;
}

function _startPracticeSession(container) {
  const activeUnits = getActiveUnits();
  if (activeUnits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div class="empty-title">尚未設定練習題庫</div>
        <div class="empty-sub">請先到「題庫」頁勾選要練習的清單</div>
      </div>`;
    return;
  }

  const queue = getStudyQueue(practiceState.scope);
  if (queue.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="empty-title">${practiceState.scope === 'WRONG' ? '目前沒有需要複習的錯題' : '此範圍尚無單字'}</div>
        <div class="empty-sub">換個範圍或先去學習頁加入更多題庫</div>
      </div>`;
    return;
  }

  practiceState.queue = queue;
  practiceState.idx = 0;
  practiceState.flipped = false;
  practiceState.sessionCorrect = 0;
  practiceState.sessionWrong = 0;
  practiceState.wrongItems = [];
  practiceState.isRetryRound = false;

  _renderCurrentCard(container);
}

function _renderCurrentCard(container) {
  const { mode, queue, idx, wrongItems } = practiceState;
  if (idx >= queue.length) {
    if (wrongItems.length > 0) _startRetryRound(container);
    else _renderSessionEnd(container);
    return;
  }
  if (mode === 'flashcard') _renderFlashcard(container, queue[idx]);
  else _renderMC(container, queue[idx]);
}

function _startRetryRound(container) {
  practiceState.queue = [...practiceState.wrongItems].sort(() => Math.random() - 0.5);
  practiceState.wrongItems = [];
  practiceState.idx = 0;
  practiceState.flipped = false;
  practiceState.isRetryRound = true;
  _renderCurrentCard(container);
}

// ── 閃卡 ──────────────────────────────────────────────────
function _renderFlashcard(container, item) {
  practiceState.flipped = false;
  const total = practiceState.queue.length;
  const idx = practiceState.idx;
  const progressBadge = practiceState.isRetryRound
    ? `<span class="card-type-badge retry-badge">錯題複習</span>`
    : `<span class="card-type-badge">${UNITS_MAP[item.unit] ? part_short_label(UNITS_MAP[item.unit]) : ''}</span>`;

  container.innerHTML = `
    <div class="card-progress">${progressBadge}${idx + 1} / ${total}</div>
    <div class="flashcard-wrap">
      <div class="flashcard" id="fc">
        <div class="fc-front">
          <div class="fc-question"><span class="q-word">${item.word}</span><span class="q-pos">${item.pos || ''}</span></div>
        </div>
        <div class="fc-back" style="display:none">
          <div class="fc-answer"><span class="ans-main">${item.meaning}</span><span class="ans-pos">${item.pos || ''}</span></div>
          <div class="fc-detail">${item.example ? `<div class="detail-example"><span class="ex-en">${item.example}</span><span class="ex-cn">${item.exampleMeaning || ''}</span></div>` : ''}</div>
        </div>
      </div>
    </div>
    <div class="fc-speak-area">
      <button class="btn-speak" id="fc-speak">${SPEAK_SVG}發音</button>
    </div>
    <div class="fc-rate-area" style="display:none">
      <button class="btn-wrong btn-lg" id="fc-wrong">Ｘ</button>
      <button class="btn-correct btn-lg" id="fc-correct">Ｏ</button>
    </div>`;

  const fc = container.querySelector('#fc');
  const rateArea = container.querySelector('.fc-rate-area');
  let hasRevealed = false;

  container.querySelector('#fc-speak').addEventListener('click', (e) => {
    e.stopPropagation();
    speak(item.word);
  });

  const toggleFlip = () => {
    practiceState.flipped = !practiceState.flipped;
    fc.querySelector('.fc-front').style.display = practiceState.flipped ? 'none' : 'flex';
    fc.querySelector('.fc-back').style.display = practiceState.flipped ? 'flex' : 'none';
    if (practiceState.flipped && !hasRevealed) {
      hasRevealed = true;
      rateArea.style.display = 'flex';
    }
  };

  fc.addEventListener('click', toggleFlip);

  container.querySelector('#fc-wrong').addEventListener('click', () => {
    updateItemProgress(item.id, false);
    practiceState.sessionWrong++;
    practiceState.wrongItems.push(item);
    practiceState.idx++;
    _renderCurrentCard(container);
  });
  container.querySelector('#fc-correct').addEventListener('click', () => {
    updateItemProgress(item.id, true);
    practiceState.sessionCorrect++;
    practiceState.idx++;
    _renderCurrentCard(container);
  });
}

// ── 選擇題 ────────────────────────────────────────────────
function _renderMC(container, item) {
  const total = practiceState.queue.length;
  const idx = practiceState.idx;
  const pool = practiceState.queue.length >= 4 ? practiceState.queue : WORDS;
  const progressBadge = practiceState.isRetryRound
    ? `<span class="card-type-badge retry-badge">錯題複習</span>`
    : `<span class="card-type-badge">${UNITS_MAP[item.unit] ? part_short_label(UNITS_MAP[item.unit]) : ''}</span>`;

  const correctAnswer = item.meaning;
  const distractors = pool
    .filter(w => w.id !== item.id && w.meaning !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.meaning);
  const options = [...distractors, correctAnswer].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div class="card-progress">${progressBadge}${idx + 1} / ${total}</div>
    <div class="mc-question"><span class="q-word">${item.word}</span><span class="q-pos">${item.pos || ''}</span></div>
    <div class="mc-options">
      ${options.map((o, i) => `<button class="mc-option" data-idx="${i}">${o}</button>`).join('')}
    </div>
    <div class="mc-result" style="display:none"></div>
    <div class="mc-next" style="display:none">
      <button class="btn-primary" id="mc-next-btn">下一題</button>
    </div>`;

  let answered = false;
  container.querySelectorAll('.mc-option').forEach(b => {
    b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const isCorrect = b.textContent === correctAnswer;
      b.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) {
        container.querySelectorAll('.mc-option').forEach(x => {
          if (x.textContent === correctAnswer) x.classList.add('correct');
        });
      }
      container.querySelectorAll('.mc-option').forEach(x => x.disabled = true);
      const result = container.querySelector('.mc-result');
      result.style.display = 'block';
      const exHtml = item.example ? `<br><span style="color:var(--color-text-3)">${item.example}</span>` : '';
      result.innerHTML = isCorrect
        ? `<span class="result-correct">✓ 正確！</span>${exHtml}`
        : `<span class="result-wrong">✗ 答案是：${correctAnswer}</span>${exHtml}`;
      container.querySelector('.mc-next').style.display = 'flex';

      updateItemProgress(item.id, isCorrect);
      if (isCorrect) practiceState.sessionCorrect++;
      else { practiceState.sessionWrong++; practiceState.wrongItems.push(item); }
      speak(item.word);
    });
  });

  container.querySelector('#mc-next-btn').addEventListener('click', () => {
    practiceState.idx++;
    _renderCurrentCard(container);
  });
}

// ── 練習結束 ──────────────────────────────────────────────
function _renderSessionEnd(container) {
  const { sessionCorrect, sessionWrong } = practiceState;
  const total = sessionCorrect + sessionWrong;
  const pct = total > 0 ? Math.round(sessionCorrect / total * 100) : 0;

  container.innerHTML = `
    <div class="session-end">
      <div class="end-icon">${pct >= 80
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        : pct >= 60
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
      }</div>
      <div class="end-title">練習完成！</div>
      <div class="end-stats">
        <span class="end-correct">✓ ${sessionCorrect}</span>
        <span class="end-wrong">✗ ${sessionWrong}</span>
        <span class="end-pct">${pct}%</span>
      </div>
      <button class="btn-primary btn-lg" id="end-restart">再練一次</button>
      <button class="btn-secondary" id="end-home">回首頁</button>
    </div>`;

  container.querySelector('#end-restart').addEventListener('click', () => {
    _startPracticeSession(container);
  });
  container.querySelector('#end-home').addEventListener('click', () => navigateTo('home'));
}

// ============================================================
// 5. 設定頁
// ============================================================
function buildSettings() {
  const wrap = div('page');

  wrap.innerHTML = `
    <div class="settings-section">
      <div class="settings-title">資料備份</div>
      <button class="btn-secondary settings-action" id="btn-export">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        匯出進度
      </button>
      <label class="btn-secondary settings-action" for="import-file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        匯入進度
      </label>
      <input type="file" id="import-file" accept=".json" style="display:none">
    </div>

    <div class="settings-section settings-danger">
      <div class="settings-title">危險操作</div>
      <button class="btn-danger settings-action" id="btn-reset">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        重置所有進度
      </button>
    </div>

    <div class="settings-version">TOEFL 單字學習計畫 v1.0.0</div>`;

  wrap.querySelector('#btn-export').addEventListener('click', () => {
    const json = exportProgress();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toefl_progress_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  wrap.querySelector('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importProgress(ev.target.result);
        alert('匯入成功！');
        renderPage('home');
      } catch {
        alert('匯入失敗：檔案格式不正確。');
      }
    };
    reader.readAsText(file);
  });

  wrap.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('確定要重置所有學習進度嗎？這個動作無法復原。')) {
      resetProgress();
      alert('已重置所有進度。');
      renderPage('home');
    }
  });

  return wrap;
}

// ── App 初始化 ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initRouter();
});
