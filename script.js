

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

    // Quiz State Variables
    let quizQuestions = [];
    let currentIndex = 0;
    let score = 0;
    let answeredState = [];
    let userWrongQuestions = [];
    let selectedQuestionCount = 40;
    let wordStats = {};
    let statsRecordedForQuiz = false;
    let wordStatsStorageReady = true;
    const WORD_STATS_STORAGE_KEY = 'toeicVocabularyStats';
    const availableQuestionCounts = [20, 40, 50, 80, 100];

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
        document.getElementById('wordStatsStatus').innerText = '';
        return true;
      } catch (error) {
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

    function showWordStats() {
      const attemptedWords = Object.values(wordStats);
      const totalCorrect = attemptedWords.reduce((sum, stats) => sum + stats.correct, 0);
      const totalWrong = attemptedWords.reduce((sum, stats) => sum + stats.wrong, 0);
      const totalAttempts = totalCorrect + totalWrong;
      const totalAccuracy = totalAttempts ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : '—';

      document.getElementById('wordStatsSummary').innerText =
        `題庫共 ${defaultQuizQuestions.length} 題｜累計答對 ${totalCorrect} 題、答錯 ${totalWrong} 題，整體正確率 ${totalAccuracy}`;
      document.getElementById('wordStatsSearch').value = '';
      renderWordStatsTable();
      document.getElementById('wordStatsModal').classList.remove('hidden');
    }

    function filterWordStats(searchTerm) {
      renderWordStatsTable(searchTerm);
    }

    function renderWordStatsTable(searchTerm = '') {
      const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
      const filteredQuestions = defaultQuizQuestions.filter(question =>
        [question.word, question.pos, question.meaning]
          .some(value => value.toLocaleLowerCase().includes(normalizedSearch))
      );

      document.getElementById('wordStatsTable').innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
          <thead class="sticky top-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
            <tr>
              <th class="p-3 whitespace-nowrap">單字</th>
              <th class="p-3">詞性／意思</th>
              <th class="p-3 text-right whitespace-nowrap">答對</th>
              <th class="p-3 text-right whitespace-nowrap">答錯</th>
              <th class="p-3 text-right whitespace-nowrap">正確率</th>
            </tr>
          </thead>
          <tbody>
            ${filteredQuestions.length ? filteredQuestions.map(question => {
              const stats = wordStats[String(question.id)] || { correct: 0, wrong: 0 };
              return `
                <tr class="border-b border-slate-100 dark:border-slate-700">
                  <td class="p-3 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">${question.word}</td>
                  <td class="p-3 min-w-48">
                    <span class="text-xs text-slate-500 dark:text-slate-400">${question.pos}</span>
                    <span class="block text-slate-700 dark:text-slate-200">${question.meaning}</span>
                  </td>
                  <td class="p-3 text-right text-emerald-600 dark:text-emerald-400">${stats.correct}</td>
                  <td class="p-3 text-right text-rose-600 dark:text-rose-400">${stats.wrong}</td>
                  <td class="p-3 text-right font-semibold text-slate-700 dark:text-slate-200">${getWordAccuracy(stats)}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="5" class="p-8 text-center text-slate-500 dark:text-slate-400">找不到符合的單字</td>
              </tr>
            `}
          </tbody>
        </table>
      `;
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

      const unavailableCounts = availableQuestionCounts.filter(count => count > defaultQuizQuestions.length);
      document.getElementById('questionCountHint').innerText = unavailableCounts.length
        ? `目前題庫共 ${defaultQuizQuestions.length} 題，${unavailableCounts.join('、')} 題選項暫不可用。`
        : `目前題庫共 ${defaultQuizQuestions.length} 題。`;
      document.getElementById('restartQuizText').innerText = `再次挑戰 ${selectedQuestionCount} 題`;
    }

    function selectQuestionCount(count) {
      if (!availableQuestionCounts.includes(count) || count > defaultQuizQuestions.length) return;

      selectedQuestionCount = count;
      updateQuestionCountButtons();
    }

    // Theme toggle function
    function toggleTheme() {
      document.documentElement.classList.toggle('dark');
      const themeIcon = document.getElementById('themeIcon');
      if (document.documentElement.classList.contains('dark')) {
        themeIcon.className = 'fa-solid fa-sun';
      } else {
        themeIcon.className = 'fa-solid fa-moon';
      }
    }

    function playAnswerPronunciation() {
      const status = document.getElementById('pronunciationStatus');
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        status.innerText = '此瀏覽器不支援語音播放，請改用其他瀏覽器。';
        return;
      }

      try {
        const speech = window.speechSynthesis;
        speech.cancel();

        const utterance = new SpeechSynthesisUtterance(quizQuestions[currentIndex].word);
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
      if (customQuestions) {
        quizQuestions = shuffleArray(customQuestions);
      } else {
        const shuffledAll = shuffleArray(defaultQuizQuestions);
        quizQuestions = shuffledAll.slice(0, selectedQuestionCount);
      }
      currentIndex = 0;
      score = 0;
      answeredState = new Array(quizQuestions.length).fill(null);
      userWrongQuestions = [];
      statsRecordedForQuiz = false;

      document.getElementById('startCard').classList.add('hidden');
      document.getElementById('resultScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('hidden');
      document.getElementById('quizScreen').classList.add('flex');

      updateScoreDisplay();
      renderQuestion();
    }

    // Global keydown handler for seamless Enter key navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !document.getElementById('wordStatsModal').classList.contains('hidden')) {
        hideWordStats();
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
      recordQuizStats();
      document.getElementById('quizScreen').classList.add('hidden');
      document.getElementById('resultScreen').classList.remove('hidden');
      document.getElementById('resultScreen').classList.add('flex');

      const total = quizQuestions.length;
      const percentage = Math.round((score / total) * 100);

      document.getElementById('finalScorePercent').innerText = `${percentage}%`;
      document.getElementById('finalCorrectCount').innerText = score;
      document.getElementById('finalTotalCount').innerText = total;

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
    loadWordStats();

    Object.assign(window, {
      toggleTheme,
      selectQuestionCount,
      startQuiz,
      confirmRestart,
      exitQuiz,
      returnToHome,
      nextQuestion,
      reviewWrongQuestions,
      handleFormSubmit,
      playAnswerPronunciation,
      showWordStats,
      hideWordStats,
      filterWordStats
    });
