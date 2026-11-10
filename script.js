

import defaultQuizQuestions from './questions.json' with { type: 'json' };

    // Fisher-Yates Array Shuffle Algorithm
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    function loadStarredQuestions() {
      try {
        const savedIds = localStorage.getItem(STARRED_QUESTIONS_STORAGE_KEY);
        if (savedIds === null) return;

        const parsedIds = JSON.parse(savedIds);
        const questionIds = new Set(defaultQuizQuestions.map(question => question.id));
        if (!Array.isArray(parsedIds) ||
            !parsedIds.every(id => Number.isInteger(id) && questionIds.has(id))) {
          throw new Error('Stored starred questions have an invalid format.');
        }

        starredQuestionIds = new Set(parsedIds);
      } catch (error) {
        starredQuestionsStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '無法讀取星號單字，請確認瀏覽器儲存空間設定。';
        console.error('Unable to load starred questions:', error);
      }
    }

    function saveStarredQuestions() {
      if (!starredQuestionsStorageReady) {
        setStarredQuestionsStatus('星號設定無法讀取，請確認瀏覽器儲存空間設定。');
        return false;
      }

      try {
        localStorage.setItem(STARRED_QUESTIONS_STORAGE_KEY, JSON.stringify([...starredQuestionIds]));
        setStarredQuestionsStatus('');
        return true;
      } catch (error) {
        starredQuestionsStorageReady = false;
        setStarredQuestionsStatus('星號設定儲存失敗，請確認瀏覽器儲存空間設定。');
        console.error('Unable to save starred questions:', error);
        return false;
      }
    }

    function setStarredQuestionsStatus(message) {
      document.getElementById('starStatus').innerText = message;
      document.getElementById('wordStatsStarStatus').innerText = message;
    }

    function updateQuestionStarButton() {
      const question = quizQuestions[currentIndex];
      const isStarred = starredQuestionIds.has(question.id);
      const button = document.getElementById('questionStarBtn');
      button.setAttribute('aria-pressed', String(isStarred));
      button.setAttribute('aria-label', isStarred ? '移除星號' : '加入星號');
      button.title = isStarred ? '移除星號' : '加入星號';
      button.className = `absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        isStarred
          ? 'bg-amber-50 text-amber-500 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
          : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-slate-700'
      }`;
      document.getElementById('questionStarIcon').className =
        `${isStarred ? 'fa-solid' : 'fa-regular'} fa-star text-lg`;
    }

    function toggleQuestionStar() {
      const question = quizQuestions[currentIndex];
      if (starredQuestionIds.has(question.id)) {
        starredQuestionIds.delete(question.id);
      } else {
        starredQuestionIds.add(question.id);
      }
      updateQuestionStarButton();
      saveStarredQuestions();
    }

    // Quiz State Variables
    let quizQuestions = [];
    let currentIndex = 0;
    let score = 0;
    let answeredState = [];
    let userWrongQuestions = [];
    let selectedQuestionCount = 20;
    let selectedQuestionOrder = 'random';
    let wordStats = {};
    let wordStatsSort = { field: 'id', direction: 'desc' };
    let wordStatsStarFilterEnabled = false;
    let starredQuestionIds = new Set();
    let statsRecordedForQuiz = false;
    let wordStatsStorageReady = true;
    let quizHistory = [];
    let quizHistoryStorageReady = true;
    let timerEnabled = false;
    let timerPreferenceStorageReady = true;
    let starredQuestionsStorageReady = true;
    let quizTimerStartedAt = null;
    let quizTimerInterval = null;
    let completedDurationMs = null;
    let quizHistoryRecordedForQuiz = false;
    let activeQuizOrder = '隨機';
    const WORD_STATS_STORAGE_KEY = 'toeicVocabularyStats';
    const QUIZ_HISTORY_STORAGE_KEY = 'toeicQuizHistory';
    const TIMER_PREFERENCE_STORAGE_KEY = 'toeicQuizTimerEnabled';
    const STARRED_QUESTIONS_STORAGE_KEY = 'toeicStarredQuestions';
    const PROGRESS_BACKUP_FORMAT = 'toeic-vocabulary-progress';
    const PROGRESS_BACKUP_VERSION = 1;
    const WRONG_REVIEW_ORDER_LABEL = '錯題複習（隨機）';
    const availableQuestionCounts = [20, 40, 50, 80, 100, 150, 200, 400, 600, 800, 1000];
    const allQuestionsOption = 'all';
    const questionOrderLabels = {
      random: '隨機抽題',
      accuracy: '錯題優先',
      fixed: '固定排序',
      starred: '星號優先',
      newest: '由新到舊'
    };
    const legacyQuestionOrderLabels = {
      隨機: questionOrderLabels.random,
      按照答題機率升冪: questionOrderLabels.accuracy
    };

    function loadWordStats() {
      try {
        const savedStats = localStorage.getItem(WORD_STATS_STORAGE_KEY);
        if (!savedStats) return;

        const parsedStats = JSON.parse(savedStats);
        if (!parsedStats || Array.isArray(parsedStats) || typeof parsedStats !== 'object') {
          throw new Error('Stored word statistics have an invalid format.');
        }

        for (const [id, stats] of Object.entries(parsedStats)) {
          if (!/^\d+$/.test(id) || !stats ||
              !Number.isInteger(stats.correct) || stats.correct < 0 ||
              !Number.isInteger(stats.wrong) || stats.wrong < 0) {
            throw new Error(`Stored word statistics are invalid for question ${id}.`);
          }
        }

        wordStats = parsedStats;
      } catch (error) {
        wordStatsStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '無法讀取學習統計，請確認瀏覽器儲存空間設定。';
        console.error('Unable to load word statistics:', error);
      }
    }

    function saveWordStats() {
      if (!wordStatsStorageReady) return false;

      try {
        localStorage.setItem(WORD_STATS_STORAGE_KEY, JSON.stringify(wordStats));
        wordStatsStorageReady = true;
        document.getElementById('wordStatsStatus').innerText = '';
        return true;
      } catch (error) {
        wordStatsStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '統計儲存失敗，請確認瀏覽器儲存空間設定。';
        console.error('Unable to save word statistics:', error);
        return false;
      }
    }

    function recordQuizStats() {
      if (statsRecordedForQuiz) return;

      quizQuestions.forEach((question, index) => {
        const id = String(question.id);
        const stats = wordStats[id] || { correct: 0, wrong: 0 };
        const isCorrect = answeredState[index].trim().toLowerCase() === question.word.trim().toLowerCase();

        if (isCorrect) {
          stats.correct++;
        } else {
          stats.wrong++;
        }
        wordStats[id] = stats;
      });

      statsRecordedForQuiz = true;
      saveWordStats();
    }

    function getWordAccuracy(stats) {
      const attempts = stats.correct + stats.wrong;
      return attempts ? `${Math.round((stats.correct / attempts) * 100)}%` : '—';
    }

    function formatDuration(durationMs) {
      const totalSeconds = Math.floor(durationMs / 1000);
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      const minutes = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
      const hours = Math.floor(totalSeconds / 3600);
      return hours ? `${String(hours).padStart(2, '0')}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
    }

    function updateQuizTimer() {
      if (quizTimerStartedAt === null) return;
      document.getElementById('quizTimerValue').innerText = formatDuration(Date.now() - quizTimerStartedAt);
    }

    function stopQuizTimer() {
      if (quizTimerInterval !== null) {
        clearInterval(quizTimerInterval);
        quizTimerInterval = null;
      }
    }

    function setTimerEnabled(enabled) {
      timerEnabled = enabled;
      try {
        localStorage.setItem(TIMER_PREFERENCE_STORAGE_KEY, String(timerEnabled));
        timerPreferenceStorageReady = true;
        document.getElementById('wordStatsStatus').innerText = '';
      } catch (error) {
        timerPreferenceStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '計時器設定無法儲存，請確認瀏覽器儲存空間設定。';
        console.error('Unable to save quiz timer preference:', error);
      }
    }

    function loadTimerPreference() {
      try {
        const savedPreference = localStorage.getItem(TIMER_PREFERENCE_STORAGE_KEY);
        if (savedPreference !== null && savedPreference !== 'true' && savedPreference !== 'false') {
          throw new Error('Stored timer preference has an invalid format.');
        }

        timerEnabled = savedPreference === 'true';
        document.getElementById('timerEnabled').checked = timerEnabled;
      } catch (error) {
        timerPreferenceStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '無法讀取計時器設定，請確認瀏覽器儲存空間設定。';
        console.error('Unable to load quiz timer preference:', error);
      }
    }

    function isValidQuizHistoryEntry(entry) {
      const validOrders = [
        ...Object.values(questionOrderLabels),
        ...Object.keys(legacyQuestionOrderLabels),
        WRONG_REVIEW_ORDER_LABEL
      ];
      return entry &&
        typeof entry.completedAt === 'string' &&
        !Number.isNaN(Date.parse(entry.completedAt)) &&
        Number.isInteger(entry.questionCount) && entry.questionCount > 0 &&
        Number.isInteger(entry.correct) && entry.correct >= 0 &&
        Number.isInteger(entry.wrong) && entry.wrong >= 0 &&
        entry.correct + entry.wrong === entry.questionCount &&
        Number.isInteger(entry.accuracy) && entry.accuracy >= 0 && entry.accuracy <= 100 &&
        validOrders.includes(entry.order) &&
        (entry.durationMs === null || (Number.isInteger(entry.durationMs) && entry.durationMs >= 0));
    }

    function loadQuizHistory() {
      try {
        const savedHistory = localStorage.getItem(QUIZ_HISTORY_STORAGE_KEY);
        if (savedHistory === null) return;

        const parsedHistory = JSON.parse(savedHistory);
        if (!Array.isArray(parsedHistory) || !parsedHistory.every(isValidQuizHistoryEntry)) {
          throw new Error('Stored quiz history has an invalid format.');
        }
        quizHistory = parsedHistory
          .filter(entry => entry.order !== WRONG_REVIEW_ORDER_LABEL)
          .map(entry => ({
            ...entry,
            order: legacyQuestionOrderLabels[entry.order] || entry.order
          }));
        if (JSON.stringify(quizHistory) !== JSON.stringify(parsedHistory)) {
          saveQuizHistory();
        }
      } catch (error) {
        quizHistoryStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '無法讀取歷史測驗資料，請確認瀏覽器儲存空間設定。';
        console.error('Unable to load quiz history:', error);
      }
    }

    function saveQuizHistory() {
      try {
        localStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify(quizHistory));
        quizHistoryStorageReady = true;
        document.getElementById('wordStatsStatus').innerText = '';
      } catch (error) {
        quizHistoryStorageReady = false;
        document.getElementById('wordStatsStatus').innerText = '歷史測驗資料儲存失敗，請確認瀏覽器儲存空間設定。';
        console.error('Unable to save quiz history:', error);
      }
    }

    function validateProgressBackup(backup) {
      if (!backup || Array.isArray(backup) || typeof backup !== 'object' ||
          backup.format !== PROGRESS_BACKUP_FORMAT ||
          backup.version !== PROGRESS_BACKUP_VERSION ||
          !backup.wordStats || Array.isArray(backup.wordStats) || typeof backup.wordStats !== 'object' ||
          !Array.isArray(backup.quizHistory) ||
          typeof backup.timerEnabled !== 'boolean') {
        throw new Error('備份檔格式或版本不支援。');
      }

      const questionIds = new Set(defaultQuizQuestions.map(question => question.id));
      const starredIds = backup.starredQuestionIds === undefined ? [] : backup.starredQuestionIds;
      if (!Array.isArray(starredIds) ||
          !starredIds.every(id => Number.isInteger(id) && questionIds.has(id))) {
        throw new Error('備份檔的星號單字資料格式不正確。');
      }

      for (const [id, stats] of Object.entries(backup.wordStats)) {
        if (!/^\d+$/.test(id) || !stats ||
            !Number.isInteger(stats.correct) || stats.correct < 0 ||
            !Number.isInteger(stats.wrong) || stats.wrong < 0) {
          throw new Error(`備份檔的單字統計資料無效（題目 ${id}）。`);
        }
      }

      if (!backup.quizHistory.every(isValidQuizHistoryEntry)) {
        throw new Error('備份檔的歷史測驗資料格式不正確。');
      }

      return {
        wordStats: backup.wordStats,
        quizHistory: backup.quizHistory
          .filter(entry => entry.order !== WRONG_REVIEW_ORDER_LABEL)
          .map(entry => ({
            ...entry,
            order: legacyQuestionOrderLabels[entry.order] || entry.order
          })),
        timerEnabled: backup.timerEnabled,
        starredQuestionIds: starredIds
      };
    }

    function replaceProgressStorage(progress) {
      const entries = [
        [WORD_STATS_STORAGE_KEY, JSON.stringify(progress.wordStats)],
        [QUIZ_HISTORY_STORAGE_KEY, JSON.stringify(progress.quizHistory)],
        [TIMER_PREFERENCE_STORAGE_KEY, String(progress.timerEnabled)],
        [STARRED_QUESTIONS_STORAGE_KEY, JSON.stringify(progress.starredQuestionIds)]
      ];
      const previousValues = entries.map(([key]) => [key, localStorage.getItem(key)]);

      try {
        entries.forEach(([key, value]) => localStorage.setItem(key, value));
      } catch (error) {
        const rollbackErrors = [];
        previousValues.forEach(([key, value]) => {
          try {
            if (value === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, value);
            }
          } catch (rollbackError) {
            rollbackErrors.push({ key, error: rollbackError });
          }
        });

        if (rollbackErrors.length) {
          console.error('Unable to fully roll back imported progress:', rollbackErrors);
          throw new Error('儲存匯入資料失敗，且本機資料未能完整還原；請檢查瀏覽器儲存空間。', { cause: error });
        }
        throw error;
      }
    }

    function exportProgressBackup() {
      if (!wordStatsStorageReady || !quizHistoryStorageReady || !timerPreferenceStorageReady || !starredQuestionsStorageReady) {
        document.getElementById('backupStatus').innerText = '目前無法讀取完整統計資料，請先確認瀏覽器儲存空間設定。';
        return;
      }

      try {
        const backup = {
          format: PROGRESS_BACKUP_FORMAT,
          version: PROGRESS_BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          wordStats,
          quizHistory: quizHistory.filter(entry => entry.order !== WRONG_REVIEW_ORDER_LABEL),
          timerEnabled,
          starredQuestionIds: [...starredQuestionIds]
        };
        const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json'
        }));
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = `toeic-progress-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        document.getElementById('backupStatus').className = 'text-sm text-emerald-600 dark:text-emerald-400';
        document.getElementById('backupStatus').innerText = '紀錄備份檔已匯出。';
      } catch (error) {
        document.getElementById('backupStatus').innerText = '匯出失敗，請確認瀏覽器是否允許下載檔案。';
        console.error('Unable to export progress backup:', error);
      }
    }

    async function importProgressBackup(event) {
      const fileInput = event.currentTarget;
      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        const backup = validateProgressBackup(JSON.parse(await file.text()));
        if (!confirm('匯入將取代這台裝置目前的單字統計、星號單字、歷史測驗紀錄與計時器設定，確定繼續嗎？')) {
          return;
        }

        replaceProgressStorage(backup);
        wordStats = backup.wordStats;
        quizHistory = backup.quizHistory;
        timerEnabled = backup.timerEnabled;
        starredQuestionIds = new Set(backup.starredQuestionIds);
        wordStatsStorageReady = true;
        quizHistoryStorageReady = true;
        timerPreferenceStorageReady = true;
        starredQuestionsStorageReady = true;
        document.getElementById('timerEnabled').checked = timerEnabled;
        document.getElementById('backupStatus').className = 'text-sm text-emerald-600 dark:text-emerald-400';
        document.getElementById('backupStatus').innerText = '紀錄已成功匯入並取代本機資料。';
      } catch (error) {
        document.getElementById('backupStatus').innerText =
          error instanceof SyntaxError
            ? '匯入失敗：檔案不是有效的 JSON 備份。'
            : `匯入失敗：${error.message}`;
        console.error('Unable to import progress backup:', error);
      } finally {
        fileInput.value = '';
      }
    }

    function showQuizHistory() {
      document.getElementById('quizHistorySummary').innerText = `總測驗次數：${quizHistory.length} 次`;
      document.getElementById('quizHistoryList').innerHTML = quizHistory.length
        ? [...quizHistory].reverse().map((entry, index) => {
          const date = new Date(entry.completedAt).toLocaleString('zh-TW');
          const attemptNumber = quizHistory.length - index;
          const duration = entry.durationMs === null
            ? ''
            : `<p class="text-sm text-slate-600 dark:text-slate-300"><i class="fa-solid fa-stopwatch mr-1 text-brand-500"></i>作答時間：${formatDuration(entry.durationMs)}</p>`;
          return `
            <article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h3 class="font-bold text-slate-900 dark:text-white">第 ${attemptNumber} 次測驗</h3>
                <time class="text-xs text-slate-500 dark:text-slate-400">${date}</time>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <p class="text-slate-600 dark:text-slate-300">題數：<strong>${entry.questionCount} 題</strong></p>
                <p class="text-slate-600 dark:text-slate-300">排序：<strong>${entry.order}</strong></p>
                <p class="text-emerald-600 dark:text-emerald-400">答對：<strong>${entry.correct} 題</strong></p>
                <p class="text-rose-600 dark:text-rose-400">答錯：<strong>${entry.wrong} 題</strong></p>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <p class="text-sm font-bold text-brand-600 dark:text-brand-400">總正確率：${entry.accuracy}%</p>
                ${duration}
              </div>
            </article>
          `;
        }).join('')
        : '<p class="py-10 text-center text-slate-500 dark:text-slate-400">尚無已完成的測驗紀錄。</p>';
      document.getElementById('quizHistoryModal').classList.remove('hidden');
    }

    function hideQuizHistory() {
      document.getElementById('quizHistoryModal').classList.add('hidden');
    }

    function showBackupModal() {
      document.getElementById('backupStatus').innerText = '';
      document.getElementById('backupStatus').className = 'text-sm text-rose-500';
      document.getElementById('backupModal').classList.remove('hidden');
    }

    function hideBackupModal() {
      document.getElementById('backupModal').classList.add('hidden');
    }

    function showWordStats() {
      const attemptedWords = Object.values(wordStats);
      const totalCorrect = attemptedWords.reduce((sum, stats) => sum + stats.correct, 0);
      const totalWrong = attemptedWords.reduce((sum, stats) => sum + stats.wrong, 0);
      const totalAttempts = totalCorrect + totalWrong;
      const totalAccuracy = totalAttempts ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : '—';

      document.getElementById('wordStatsSummary').innerText =
        `題庫共 ${defaultQuizQuestions.length} 題｜累計答對 ${totalCorrect} 題、答錯 ${totalWrong} 題，整體正確率 ${totalAccuracy}`;
      document.getElementById('wordStatsSearch').value = '';
      document.getElementById('wordStatsPronunciationStatus').innerText = '';
      document.getElementById('wordStatsStarStatus').innerText = '';
      wordStatsStarFilterEnabled = false;
      updateWordStatsStarFilterButton();
      wordStatsSort = { field: 'id', direction: 'desc' };
      renderWordStatsTable();
      document.getElementById('wordStatsModal').classList.remove('hidden');
    }

    function filterWordStats(searchTerm) {
      renderWordStatsTable(searchTerm);
    }

    function toggleWordStatsStarFilter() {
      wordStatsStarFilterEnabled = !wordStatsStarFilterEnabled;
      updateWordStatsStarFilterButton();
      renderWordStatsTable(document.getElementById('wordStatsSearch').value);
    }

    function updateWordStatsStarFilterButton() {
      const button = document.getElementById('wordStatsStarFilterBtn');
      button.setAttribute('aria-pressed', String(wordStatsStarFilterEnabled));
      button.setAttribute('aria-label', wordStatsStarFilterEnabled ? '顯示全部單字' : '只顯示星號單字');
      button.title = wordStatsStarFilterEnabled ? '顯示全部單字' : '只顯示星號單字';
      button.className = `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        wordStatsStarFilterEnabled
          ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300'
          : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-slate-700'
      }`;
      document.getElementById('wordStatsStarFilterIcon').className =
        `${wordStatsStarFilterEnabled ? 'fa-solid' : 'fa-regular'} fa-star`;
    }

    function toggleWordStatsStar(questionId) {
      if (starredQuestionIds.has(questionId)) {
        starredQuestionIds.delete(questionId);
      } else {
        starredQuestionIds.add(questionId);
      }
      saveStarredQuestions();
      renderWordStatsTable(document.getElementById('wordStatsSearch').value);
    }

    function sortWordStats(field) {
      if (wordStatsSort.field !== field) {
        wordStatsSort = { field, direction: 'desc' };
      } else if (wordStatsSort.direction === 'desc') {
        wordStatsSort = { field, direction: 'asc' };
      } else if (field === 'id') {
        wordStatsSort = { field, direction: 'desc' };
      } else {
        wordStatsSort = { field: null, direction: null };
      }

      renderWordStatsTable(document.getElementById('wordStatsSearch').value);
    }

    function renderWordStatsSortButton(field, label) {
      const direction = wordStatsSort.field === field ? wordStatsSort.direction : null;
      const icon = direction === 'desc' ? '↓' : direction === 'asc' ? '↑' : '↕';
      const state = direction === 'desc' ? '降冪' : direction === 'asc' ? '升冪' : '原排序';

      return `<button type="button" onclick="sortWordStats('${field}')" aria-label="${label}排序，目前${state}" aria-pressed="${Boolean(direction)}" class="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-slate-600">${label}<span aria-hidden="true" class="text-xs">${icon}</span></button>`;
    }

    function renderWordStatsTable(searchTerm = '') {
      const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
      const filteredQuestions = defaultQuizQuestions.filter(question =>
        (!wordStatsStarFilterEnabled || starredQuestionIds.has(question.id)) &&
        [question.word, question.pos, question.meaning]
          .some(value => value.toLocaleLowerCase().includes(normalizedSearch))
      );
      const sortedQuestions = !wordStatsSort.field
        ? filteredQuestions
        : filteredQuestions
          .map((question, index) => ({ question, index }))
          .sort((a, b) => {
            const aStats = wordStats[String(a.question.id)] || { correct: 0, wrong: 0 };
            const bStats = wordStats[String(b.question.id)] || { correct: 0, wrong: 0 };
            const aAttempts = aStats.correct + aStats.wrong;
            const bAttempts = bStats.correct + bStats.wrong;
            const aValue = wordStatsSort.field === 'accuracy'
                ? (aAttempts ? aStats.correct / aAttempts : 0)
                : wordStatsSort.field === 'id'
                  ? a.question.id
                  : aStats[wordStatsSort.field];
            const bValue = wordStatsSort.field === 'accuracy'
                ? (bAttempts ? bStats.correct / bAttempts : 0)
                : wordStatsSort.field === 'id'
                  ? b.question.id
                  : bStats[wordStatsSort.field];
            const sortMultiplier = wordStatsSort.direction === 'desc' ? -1 : 1;
            return (aValue - bValue) * sortMultiplier || a.index - b.index;
          })
          .map(({ question }) => question);

      document.getElementById('wordStatsTable').innerHTML = `
        <table class="w-full text-sm text-left border-separate border-spacing-0">
          <thead class="text-slate-600 dark:text-slate-200">
            <tr>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-left shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">${renderWordStatsSortButton('id', '單字 ID')}</th>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-center shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">星號</th>
              <th class="sticky top-0 z-10 bg-slate-100 p-3 text-left shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">詞性／意思</th>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-right shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">${renderWordStatsSortButton('correct', '答對')}</th>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-right shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">${renderWordStatsSortButton('wrong', '答錯')}</th>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-right shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">${renderWordStatsSortButton('accuracy', '正確率')}</th>
              <th class="sticky top-0 z-10 whitespace-nowrap bg-slate-100 p-3 text-center shadow-[0_1px_0_0_rgba(148,163,184,0.3)] dark:bg-slate-700 dark:shadow-[0_1px_0_0_rgba(71,85,105,0.7)]">發音</th>
            </tr>
          </thead>
          <tbody>
            ${sortedQuestions.length ? sortedQuestions.map((question, index) => {
              const stats = wordStats[String(question.id)] || { correct: 0, wrong: 0 };
              return `
                <tr class="border-b border-slate-100 dark:border-slate-700">
                  <td class="p-3 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">${question.word}</td>
                  <td class="p-3 text-center">
                    <button type="button" data-star-question-id="${question.id}" aria-label="${starredQuestionIds.has(question.id) ? '移除星號' : '加入星號'}" aria-pressed="${starredQuestionIds.has(question.id)}" title="${starredQuestionIds.has(question.id) ? '移除星號' : '加入星號'}" class="inline-flex h-9 w-9 items-center justify-center rounded-lg ${starredQuestionIds.has(question.id) ? 'text-amber-500 dark:text-amber-300' : 'text-slate-300 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-300'}">
                      <i class="${starredQuestionIds.has(question.id) ? 'fa-solid' : 'fa-regular'} fa-star" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td class="p-3 min-w-48">
                    <span class="text-xs text-slate-500 dark:text-slate-400">${question.pos}</span>
                    <span class="block text-slate-700 dark:text-slate-200">${question.meaning}</span>
                  </td>
                  <td class="p-3 text-right text-emerald-600 dark:text-emerald-400">${stats.correct}</td>
                  <td class="p-3 text-right text-rose-600 dark:text-rose-400">${stats.wrong}</td>
                  <td class="p-3 text-right font-semibold text-slate-700 dark:text-slate-200">${getWordAccuracy(stats)}</td>
                  <td class="p-3 text-center">
                    <button type="button" data-pronunciation-index="${index}" aria-label="播放單字發音" title="播放單字發音" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-brand-300 dark:hover:bg-slate-700">
                      <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" class="p-8 text-center text-slate-500 dark:text-slate-400">${wordStatsStarFilterEnabled ? '找不到星號單字' : '找不到符合的單字'}</td>
              </tr>
            `}
          </tbody>
        </table>
      `;
      document.querySelectorAll('#wordStatsTable [data-star-question-id]').forEach(button => {
        button.addEventListener('click', () => {
          toggleWordStatsStar(Number(button.dataset.starQuestionId));
        });
      });
      document.querySelectorAll('#wordStatsTable [data-pronunciation-index]').forEach(button => {
        button.addEventListener('click', () => {
          const question = sortedQuestions[Number(button.dataset.pronunciationIndex)];
          playWordPronunciation(question.word, document.getElementById('wordStatsPronunciationStatus'));
        });
      });
    }

    function hideWordStats() {
      document.getElementById('wordStatsModal').classList.add('hidden');
    }

    function updateQuestionCountButtons() {
      availableQuestionCounts.forEach(count => {
        const button = document.getElementById(`questionCount${count}Btn`);
        const isAvailable = count <= defaultQuizQuestions.length;
        const isSelected = count === selectedQuestionCount;

        button.disabled = !isAvailable;
        button.setAttribute('aria-pressed', String(isSelected));
        button.className = `question-count-btn px-3 py-3 rounded-xl border font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          !isAvailable
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            : isSelected
              ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
        }`;
      });

      const allQuestionsButton = document.getElementById('questionCountAllBtn');
      const allQuestionsSelected = selectedQuestionCount === allQuestionsOption;
      allQuestionsButton.setAttribute('aria-pressed', String(allQuestionsSelected));
      allQuestionsButton.className = `question-count-btn px-3 py-3 rounded-xl border font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        allQuestionsSelected
            ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
      }`;

      const unavailableCounts = availableQuestionCounts.filter(count => count > defaultQuizQuestions.length);
      document.getElementById('questionCountHint').innerText = unavailableCounts.length
        ? `目前題庫共 ${defaultQuizQuestions.length} 題，${unavailableCounts.join('、')} 題選項暫不可用。`
        : `目前題庫共 ${defaultQuizQuestions.length} 題。`;
      document.getElementById('restartQuizText').innerText = selectedQuestionCount === allQuestionsOption
        ? '再次挑戰全題庫'
        : `再次挑戰 ${selectedQuestionCount} 題`;
    }

    function selectQuestionCount(count) {
      if (count === allQuestionsOption) {
        selectedQuestionCount = allQuestionsOption;
        updateQuestionCountButtons();
        return;
      }

      if (!availableQuestionCounts.includes(count) || count > defaultQuizQuestions.length) return;

      selectedQuestionCount = count;
      updateQuestionCountButtons();
    }

    function selectQuestionOrder(order) {
      if (!Object.hasOwn(questionOrderLabels, order)) return;

      selectedQuestionOrder = order;
      document.querySelectorAll('.question-order-btn').forEach(button => {
        const isSelected = button.id === `questionOrder${order.charAt(0).toUpperCase()}${order.slice(1)}Btn`;
        button.setAttribute('aria-pressed', String(isSelected));
        button.className = `question-order-btn px-3 py-3 rounded-xl border font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          isSelected
            ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
        }`;
      });
    }

    function playAnswerPronunciation() {
      playWordPronunciation(quizQuestions[currentIndex].word, document.getElementById('pronunciationStatus'));
    }

    function playWordPronunciation(word, status) {
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        status.innerText = '此瀏覽器不支援語音播放，請改用其他瀏覽器。';
        return;
      }

      try {
        const speech = window.speechSynthesis;
        speech.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.volume = 1;
        utterance.voice = speech.getVoices().find(voice => voice.lang.toLowerCase() === 'en-us') ||
          speech.getVoices().find(voice => voice.lang.toLowerCase().startsWith('en-')) ||
          null;
        utterance.onstart = () => {
          status.innerText = '正在播放英文發音…';
        };
        utterance.onend = () => {
          status.innerText = '播放完成；若仍聽不到，請確認裝置與瀏覽器音量。';
        };
        utterance.onerror = event => {
          status.innerText = `語音播放失敗（${event.error}），請確認瀏覽器支援及裝置音量。`;
        };

        status.innerText = '正在準備英文發音…';
        speech.speak(utterance);
      } catch (error) {
        status.innerText = '無法播放發音，請確認瀏覽器支援及裝置音量。';
        console.error('Unable to play answer pronunciation:', error);
      }
    }

    // Start Quiz Function
    function startQuiz(customQuestions = null) {
      stopQuizTimer();
      if (customQuestions) {
        quizQuestions = shuffleArray(customQuestions);
      } else {
        let orderedQuestions;
        if (selectedQuestionOrder === 'random') {
          orderedQuestions = shuffleArray(defaultQuizQuestions);
        } else if (selectedQuestionOrder === 'accuracy') {
          orderedQuestions = defaultQuizQuestions
            .map((question, index) => {
              const stats = wordStats[String(question.id)] || { correct: 0, wrong: 0 };
              const attempts = stats.correct + stats.wrong;
              const accuracy = attempts ? stats.correct / attempts : 0;
              return { question, index, accuracy };
            })
            .sort((a, b) => a.accuracy - b.accuracy || a.index - b.index)
            .map(({ question }) => question);
        } else if (selectedQuestionOrder === 'starred') {
          orderedQuestions = [
            ...defaultQuizQuestions.filter(question => starredQuestionIds.has(question.id)),
            ...defaultQuizQuestions.filter(question => !starredQuestionIds.has(question.id))
          ];
        } else if (selectedQuestionOrder === 'newest') {
          orderedQuestions = [...defaultQuizQuestions].reverse();
        } else {
          orderedQuestions = [...defaultQuizQuestions];
        }

        const questionCount = selectedQuestionCount === allQuestionsOption
          ? orderedQuestions.length
          : selectedQuestionCount;
        quizQuestions = orderedQuestions.slice(0, questionCount);
      }
      const quizOrder = customQuestions
        ? WRONG_REVIEW_ORDER_LABEL
        : questionOrderLabels[selectedQuestionOrder];
      currentIndex = 0;
      score = 0;
      answeredState = new Array(quizQuestions.length).fill(null);
      userWrongQuestions = [];
      statsRecordedForQuiz = false;
      quizHistoryRecordedForQuiz = false;
      completedDurationMs = null;
      quizTimerStartedAt = timerEnabled ? Date.now() : null;
      activeQuizOrder = quizOrder;

      document.getElementById('startCard').classList.add('hidden');
      document.getElementById('resultScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('hidden');
      document.getElementById('quizScreen').classList.add('flex');
      const timerElement = document.getElementById('quizTimer');
      timerElement.classList.toggle('hidden', !timerEnabled);
      timerElement.classList.toggle('flex', timerEnabled);
      document.getElementById('quizTimerValue').innerText = '00:00';

      updateScoreDisplay();
      renderQuestion();
      if (timerEnabled) {
        updateQuizTimer();
        quizTimerInterval = setInterval(updateQuizTimer, 1000);
      }

    }

    // Global keydown handler for seamless Enter key navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !document.getElementById('wordStatsModal').classList.contains('hidden')) {
        hideWordStats();
        return;
      }
      if (e.key === 'Escape' && !document.getElementById('quizHistoryModal').classList.contains('hidden')) {
        hideQuizHistory();
        return;
      }
      if (e.key === 'Escape' && !document.getElementById('backupModal').classList.contains('hidden')) {
        hideBackupModal();
        return;
      }
      if (e.key === 'Enter') {
        const quizScreen = document.getElementById('quizScreen');
        // Only trigger when on the quiz screen
        if (!quizScreen.classList.contains('hidden')) {
          const userChoice = answeredState[currentIndex];
          // If current question is already answered, pressing Enter triggers Next Question
          if (userChoice !== null) {
            e.preventDefault();
            nextQuestion();
          }
        }
      }
    });

    // Handle Form Submit or Next Question when Enter/Click is triggered
    function handleFormSubmit(event) {
      event.preventDefault();

      const userChoice = answeredState[currentIndex];
      if (userChoice === null) {
        // First Enter -> Submit & Check
        submitAnswer();
      } else {
        // Second Enter -> Next Question
        nextQuestion();
      }
    }

    // Render Current Question
    function renderQuestion() {
      const q = quizQuestions[currentIndex];
      updateQuestionStarButton();

      // Update counters
      document.getElementById('questionCounter').innerText = `${currentIndex + 1} / ${quizQuestions.length}`;
      const progressPercent = ((currentIndex + 1) / quizQuestions.length) * 100;
      document.getElementById('progressBar').style.width = `${progressPercent}%`;

      // Update content
      document.getElementById('posBadge').innerText = q.pos;
      document.getElementById('targetChinese').innerText = q.meaning;

      // Sentence with blank placeholder
      document.getElementById('sentenceEn').innerHTML = q.sentenceEn.replace(
        '____',
        `<span class="underline underline-offset-4 decoration-brand-500 font-bold text-brand-600 dark:text-brand-400">____</span>`
      );
      document.getElementById('sentenceZh').innerText = q.sentenceZh;

      const wordInput = document.getElementById('wordInput');
      const submitAnswerBtn = document.getElementById('submitAnswerBtn');
      const submitBtnText = document.getElementById('submitBtnText');
      const submitBtnIcon = document.getElementById('submitBtnIcon');
      const feedbackBox = document.getElementById('feedbackBox');
      const nextBtn = document.getElementById('nextBtn');

      const userChoice = answeredState[currentIndex];

      // Get first letter of the target word for prompt hint
      const firstLetter = q.word.charAt(0).toLowerCase();

      if (userChoice === null) {
        // Unanswered state
        wordInput.value = '';
        wordInput.placeholder = `請輸入英文單字（提示字首：${firstLetter}...）`;
        wordInput.disabled = false;
        wordInput.className = "w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:border-brand-500 focus:outline-none transition-all text-base placeholder:font-normal placeholder:text-slate-400";

        submitAnswerBtn.className = "px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap";
        submitBtnText.innerText = "送出核對 (Enter)";
        submitBtnIcon.className = "fa-solid fa-paper-plane text-xs";

        feedbackBox.classList.add('hidden');
        nextBtn.classList.add('hidden');
        nextBtn.classList.remove('flex');

        // Automatically focus input on load / next question
        setTimeout(() => wordInput.focus(), 50);
      } else {
        // Answered state
        wordInput.value = userChoice;
        wordInput.disabled = true;

        submitAnswerBtn.className = "px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap";
        submitBtnText.innerText = "下一題 (Enter ↵)";
        submitBtnIcon.className = "fa-solid fa-chevron-right text-xs";

        const isCorrect = userChoice.trim().toLowerCase() === q.word.trim().toLowerCase();

        if (isCorrect) {
          wordInput.className = "w-full px-4 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold text-base";
        } else {
          wordInput.className = "w-full px-4 py-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-800 dark:text-rose-300 font-bold text-base";
        }

        feedbackBox.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        nextBtn.classList.add('flex');

        const feedbackTitle = document.getElementById('feedbackTitle');
        const feedbackText = document.getElementById('feedbackText');

        if (isCorrect) {
          feedbackBox.className = 'rounded-xl p-5 mb-4 border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200';
          feedbackTitle.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500"></i> <span>拼寫正確！</span>`;
        } else {
          feedbackBox.className = 'rounded-xl p-5 mb-4 border bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200';
          feedbackTitle.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-500"></i> <span>拼寫錯誤！正確答案是：<strong class="underline font-black">${q.word}</strong></span>`;
        }

        const filledSentence = q.sentenceEn.replace('____', `<strong class="text-brand-600 dark:text-brand-400 font-bold">${q.word}</strong>`);
        feedbackText.innerHTML = `
          <p class="font-medium mb-1">【完整例句】${filledSentence}</p>
          <p class="text-xs opacity-80">【中文對照】${q.sentenceZh}</p>
          <button type="button" onclick="playAnswerPronunciation()" class="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/70 dark:bg-slate-800/70 px-3 py-2 font-semibold hover:bg-white dark:hover:bg-slate-700 transition-colors">
            <i class="fa-solid fa-volume-high"></i>
            <span>播放單字發音</span>
          </button>
        `;
        document.getElementById('pronunciationStatus').innerText = '';
      }
    }

    // Submit Answer Logic
    function submitAnswer() {
      if (answeredState[currentIndex] !== null) return;

      const inputVal = document.getElementById('wordInput').value.trim();
      if (!inputVal) return;

      const q = quizQuestions[currentIndex];
      answeredState[currentIndex] = inputVal;

      if (inputVal.toLowerCase() === q.word.toLowerCase()) {
        score++;
        updateScoreDisplay();
      } else {
        userWrongQuestions.push({
          ...q,
          userChoice: inputVal
        });
      }

      renderQuestion();
      playAnswerPronunciation();
    }

    // Next Question or Finish
    function nextQuestion() {
      if (currentIndex < quizQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
      } else {
        showResults();
      }
    }

    // Update Score Badge
    function updateScoreDisplay() {
      document.getElementById('scoreDisplay').innerText = score;
    }

    // Show Results
    function showResults() {
      if (quizHistoryRecordedForQuiz) return;
      recordQuizStats();
      stopQuizTimer();
      if (quizTimerStartedAt !== null) {
        completedDurationMs = Date.now() - quizTimerStartedAt;
        quizTimerStartedAt = null;
      }
      const total = quizQuestions.length;
      const percentage = Math.round((score / total) * 100);
      if (activeQuizOrder !== WRONG_REVIEW_ORDER_LABEL) {
        quizHistory.push({
          completedAt: new Date().toISOString(),
          questionCount: total,
          order: activeQuizOrder,
          correct: score,
          wrong: total - score,
          accuracy: percentage,
          durationMs: completedDurationMs
        });
        saveQuizHistory();
      }
      quizHistoryRecordedForQuiz = true;

      document.getElementById('quizScreen').classList.add('hidden');
      document.getElementById('resultScreen').classList.remove('hidden');
      document.getElementById('resultScreen').classList.add('flex');

      document.getElementById('finalScorePercent').innerText = `${percentage}%`;
      document.getElementById('finalCorrectCount').innerText = score;
      document.getElementById('finalTotalCount').innerText = total;
      const finalDuration = document.getElementById('finalDuration');
      finalDuration.classList.toggle('hidden', completedDurationMs === null);
      if (completedDurationMs !== null) {
        finalDuration.innerText = `作答時間：${formatDuration(completedDurationMs)}`;
      }

      const resultIcon = document.getElementById('resultIcon');
      const resultTitle = document.getElementById('resultTitle');
      const resultSubtitle = document.getElementById('resultSubtitle');

      if (percentage >= 90) {
        resultIcon.className = "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl bg-amber-100 dark:bg-amber-900/40 text-amber-500";
        resultIcon.innerHTML = `<i class="fa-solid fa-trophy"></i>`;
        resultTitle.innerText = "優秀！拼字大師！";
        resultSubtitle.innerText = "你的手寫拼字精準度極高，多益高分指日可待！";
      } else if (percentage >= 70) {
        resultIcon.className = "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500";
        resultIcon.innerHTML = `<i class="fa-solid fa-star"></i>`;
        resultTitle.innerText = "做得好！基礎相當紮實！";
        resultSubtitle.innerText = "複習一下少量拼錯的單字，就能達到 100% 完美狀態！";
      } else {
        resultIcon.className = "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl bg-brand-100 dark:bg-brand-900/40 text-brand-500";
        resultIcon.innerHTML = `<i class="fa-solid fa-book-open"></i>`;
        resultTitle.innerText = "持續努力！加強拼音！";
        resultSubtitle.innerText = "手動拼字難度較高，多練習幾次能幫助大腦深化記憶！";
      }

      // Render Wrong Questions List
      const wrongListContainer = document.getElementById('wrongListContainer');
      const wrongCountBadge = document.getElementById('wrongCountBadge');
      const reviewWrongBtn = document.getElementById('reviewWrongBtn');

      wrongCountBadge.innerText = userWrongQuestions.length;

      if (userWrongQuestions.length === 0) {
        reviewWrongBtn.disabled = true;
        reviewWrongBtn.classList.add('opacity-50', 'cursor-not-allowed');
        wrongListContainer.innerHTML = `
          <div class="text-center py-8 text-slate-400 dark:text-slate-500">
            <i class="fa-solid fa-circle-check text-4xl text-emerald-500 mb-2"></i>
            <p>太棒了！本次拼字測驗零錯題！</p>
          </div>
        `;
      } else {
        reviewWrongBtn.disabled = false;
        reviewWrongBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        wrongListContainer.innerHTML = userWrongQuestions.map(item => {
          const stats = wordStats[String(item.id)] || { correct: 0, wrong: 0 };
          return `
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700 text-left">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-lg text-brand-600 dark:text-brand-400">${item.word}</span>
                <span class="text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">${item.pos}</span>
                <span class="text-sm text-slate-600 dark:text-slate-300 font-medium">${item.meaning}</span>
              </div>
              <span class="text-xs font-semibold px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 rounded-lg">
                你的輸入: ${item.userChoice || '(未填寫)'}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
              <strong class="text-slate-700 dark:text-slate-300">例句:</strong> ${item.sentenceEn.replace('____', `<u class="font-bold text-brand-600 dark:text-brand-400">${item.word}</u>`)}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
              歷史統計：答對 ${stats.correct} 次、答錯 ${stats.wrong} 次，正確率 ${getWordAccuracy(stats)}
            </p>
          </div>
          `;
        }).join('');
      }
    }

    // Review Wrong Questions Only
    function reviewWrongQuestions() {
      if (userWrongQuestions.length > 0) {
        startQuiz(userWrongQuestions);
      }
    }

    // Confirm Restart
    function confirmRestart() {
      if (confirm('確定要重新開始測驗嗎？當前進度將會重置。')) {
        startQuiz();
      }
    }

    function exitQuiz() {
      if (!confirm('確定要退出測驗嗎？目前作答進度將會重置。')) return;

      returnToHome();
    }

    function returnToHome() {
      stopQuizTimer();
      quizTimerStartedAt = null;
      quizQuestions = [];
      currentIndex = 0;
      score = 0;
      answeredState = [];
      userWrongQuestions = [];

      document.getElementById('quizScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('flex');
      document.getElementById('resultScreen').classList.add('hidden');
      document.getElementById('resultScreen').classList.remove('flex');
      document.getElementById('startCard').classList.remove('hidden');
    }

    // Modal Control Functions
    function showScheduleModal() {
      document.getElementById('scheduleModal').classList.remove('hidden');
    }
    function hideScheduleModal() {
      document.getElementById('scheduleModal').classList.add('hidden');
    }

    updateQuestionCountButtons();
    selectQuestionOrder(selectedQuestionOrder);
    loadWordStats();
    loadStarredQuestions();
    loadTimerPreference();
    loadQuizHistory();

    Object.assign(window, {
      selectQuestionCount,
      startQuiz,
      confirmRestart,
      exitQuiz,
      returnToHome,
      nextQuestion,
      reviewWrongQuestions,
      handleFormSubmit,
      playAnswerPronunciation,
      toggleQuestionStar,
      toggleWordStatsStarFilter,
      selectQuestionOrder,
      showWordStats,
      hideWordStats,
      filterWordStats,
      sortWordStats,
      showQuizHistory,
      hideQuizHistory,
      showBackupModal,
      hideBackupModal,
      setTimerEnabled,
      exportProgressBackup,
      importProgressBackup
    });
