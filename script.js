// script.js

// Firestoreストレージのインスタンス化
const storage = new window.FirestoreJournalStorage();

document.addEventListener('DOMContentLoaded', () => {
    console.log("ストイックジャーナル アプリケーションが読み込まれました。");

    // --- 要素の取得 ---
    const themeInput = document.getElementById('theme-input');
    const memoInput = document.getElementById('memo-input');
    const questionInput1 = document.getElementById('question-input-1');
    const answerInput1 = document.getElementById('answer-input-1');
    const questionInput2 = document.getElementById('question-input-2');
    const answerInput2 = document.getElementById('answer-input-2');
    const saveButton = document.getElementById('save-button');
    const journalListElement = document.getElementById('journal-list');
    const currentDateDisplay = document.getElementById('current-date');
    const deleteButton = document.getElementById('delete-button');
    const snackbar = document.getElementById('snackbar');
    const aiResponseInput = document.getElementById('ai-response-input');
    const saveAiResponseButton = document.getElementById('save-ai-response-button');
    const copyAiPromptButton = document.getElementById('copy-ai-prompt-button');
    const aiResponsePreview = document.getElementById('ai-response-preview');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userInfo = document.getElementById('user-info');
    const saveAndCopyButton = document.getElementById('save-and-copy-button');
    const saveButtonsRow = document.querySelector('.save-buttons-row');
    const aiResponseNotice = document.createElement('div');
    aiResponseNotice.style.color = '#dc2626';
    aiResponseNotice.style.fontSize = '0.98em';
    aiResponseNotice.style.marginTop = '6px';
    aiResponseNotice.style.display = 'none';
    aiResponseNotice.textContent = 'まずジャーナルを保存してください';
    saveAiResponseButton.parentNode.appendChild(aiResponseNotice);

    // --- データ管理 ---
    let journalEntries = [];
    let currentlyEditingEntryId = null;

    // --- ローディングインジケーター制御 ---
    function showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }
    function hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    // --- スナックバー表示（エラー詳細対応） ---
    function showSnackbar(message) {
        snackbar.textContent = message;
        snackbar.classList.add('show');
        setTimeout(() => snackbar.classList.remove('show'), 3500);
    }

    // --- 日付表示 ---
    function displayCurrentDate() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        currentDateDisplay.textContent = today.toLocaleDateString('ja-JP', options);
    }
    displayCurrentDate();

    // --- ジャーナルリストをHTMLに描画 ---
    function renderJournalList() {
        journalListElement.innerHTML = '';
        if (journalEntries.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state';
            emptyDiv.innerHTML = `
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="14" width="32" height="20" rx="4" fill="#fafdff" stroke="#2563eb" stroke-width="2.2"/>
                <path d="M24 14v20" stroke="#2563eb" stroke-width="1.6"/>
                <path d="M8 17c5-2 10-2 16 0 6-2 11-2 16 0" stroke="#2563eb" stroke-width="1" fill="none"/>
              </svg>
              <div>まだジャーナルがありません<br>「新規作成」ボタンから始めましょう！</div>
            `;
            journalListElement.appendChild(emptyDiv);
            return;
        }
        const sortedEntries = [...journalEntries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        sortedEntries.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.textContent = `${entry.theme.substring(0, 20)}${entry.theme.length > 20 ? '...' : ''}`;
            listItem.dataset.entryId = entry.id;
            if (entry.id === currentlyEditingEntryId) {
                listItem.style.backgroundColor = '#cce5ff';
            }
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'journal-actions';
            const delBtn = document.createElement('button');
            delBtn.className = 'journal-action-btn delete';
            delBtn.textContent = '削除';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await storage.deleteJournal(entry.id);
                    currentlyEditingEntryId = null;
                    await loadJournalEntries();
                    prepareNewEntryForm();
                    showSnackbar('ジャーナルを削除しました');
                } catch (e) {
                    showSnackbar('削除に失敗しました');
                }
            });
            actionsDiv.appendChild(delBtn);
            listItem.appendChild(actionsDiv);
            listItem.addEventListener('click', () => {
                displayJournalEntry(entry.id);
            });
            journalListElement.appendChild(listItem);
        });
    }

    // --- ジャーナルエントリーをメインエリアに表示 ---
    function displayJournalEntry(entryId) {
        const entry = journalEntries.find(e => e.id === entryId);
        if (entry) {
            currentlyEditingEntryId = entry.id;
            localStorage.setItem('lastEditingEntryId', entry.id);
            themeInput.value = entry.theme;
            memoInput.value = entry.memo || '';
            questionInput1.value = entry.questions[0]?.question || '';
            answerInput1.value = entry.questions[0]?.answer || '';
            questionInput2.value = entry.questions[1]?.question || '';
            answerInput2.value = entry.questions[1]?.answer || '';
            aiResponseInput.value = entry.aiResponse || '';
            renderAiResponsePreview();
            document.getElementById('journal-tab').querySelector('h2').textContent = 'ジャーナル編集';
            deleteButton.style.display = 'inline-block';
            showTab('journal-tab');
            renderJournalList();
            const createdAtLabel = document.getElementById('created-at-label');
            const updatedAtLabel = document.getElementById('updated-at-label');
            if (createdAtLabel && updatedAtLabel) {
                createdAtLabel.textContent = 'Create: ' + (entry.createdAt ? formatDate(entry.createdAt) : '--');
                updatedAtLabel.textContent = 'Update: ' + (entry.updatedAt ? formatDate(entry.updatedAt) : '--');
            }
            updateAiResponseButtonState();
            openDialogueFor(entry.id);
        }
    }

    // --- グローバル関数: タブ切り替え ---
    function showTab(tabId) {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        const targetButton = Array.from(tabButtons).find(btn => btn.getAttribute('onclick')?.includes(tabId));
        const targetContent = document.getElementById(tabId);
        if (targetButton) targetButton.classList.add('active');
        if (targetContent) targetContent.classList.add('active');
    }
    window.showTab = showTab;

    // --- 保存＋AIプロンプトをコピー ---
    saveAndCopyButton.addEventListener('click', async () => {
        const result = await saveFullJournalEntry('ジャーナルを保存＆AIプロンプトをコピーしました');
        if (!result) return;
        // ここから下はプロンプトコピー処理
        const theme = themeInput.value.trim();
        const q1 = questionInput1.value.trim();
        const a1 = answerInput1.value.trim();
        const q2 = questionInput2.value.trim();
        const a2 = answerInput2.value.trim();
        let promptText = `以下は私のストイックジャーナルのエントリーです。私の省察に対するフィードバックと新しい視点を提供してください。特に私の思考や気づきを深めるような洞察や、新たな視点からの振り返りを重視します。\n\n`;
        promptText += `---\n`;
        promptText += `# テーマ: ${theme}\n\n`;
        promptText += `## 問い1: ${q1}\n私の解答1:\n${a1}\n\n`;
        promptText += `## 問い2: ${q2}\n私の解答2:\n${a2}\n`;
        promptText += `---\n\n`;
        promptText += '## フィードバックで特に重視してほしい点\n\n';
        promptText += '以下の各観点から、具体的かつ実践的なフィードバックをお願いします。\n\n';
        promptText += '### 1. ストア派哲学に基づく分析\n';
        promptText += '* 私の思考、感情、行動のパターンは、ストア派の主要な教え（例: **コントロールの二分法**〔制御可否〕、**徳の追求**〔善き行い〕、**運命愛**〔現状受容〕、理性的な判断、感情の扱い方）とどのように関連していますか？肯定的な側面と、改善の余地がある側面の両方について教えてください。\n';
        promptText += '* このエントリー内容から、ストア派の観点でどのような**強み**や**成長の機会**が見出せますか？\n';
        promptText += '* もしストア派の賢人（マルクス・アウレリウス、エピクテトス、セネカなど）がこの状況に置かれたとしたら、どのように考え、どのような言葉で自らを励まし、あるいは戒め、どのように行動したと思われますか？具体的な彼らの言葉や哲学的なアプローチを交えて示唆を与えてください。\n\n';
        promptText += '### 2. 脳科学・心理学的洞察\n';
        promptText += '* 私の記述から見られる思考パターン（例：自己批判、反芻思考〔堂々巡り〕、行動の先延ばし）や感情の動きについて、脳科学的にどのようなメカニズム（例：扁桃体の過活動、前頭前野の機能低下、報酬系の不活性化など）が働いている可能性がありますか？\n';
        promptText += '* 心理学の観点から、私の自己認識（例：自己評価、自己効力感〔自信〕）、問題への対処スタイル（例：回避的行動、完璧主義）、あるいは認知の偏り（例：ネガティブフィルター、過度な一般化）について、どのような解釈ができますか？\n';
        promptText += '* これらの科学的知見を踏まえ、私の思考や感情を客観的に理解し、より建設的に自己と向き合うためのヒントはありますか？\n\n';
        promptText += '### 3. 自己理解の深化と傾向分析\n';
        promptText += '* 私の問いに対する解答の傾向から、どのような**価値観**、**信念**（特に自己制限的なもの）、あるいは無意識の**前提**が読み取れますか？\n';
        promptText += '* エントリーのテーマ（例：「自分を信じる」）に関して、私の現在の**心理的な課題**や、それを乗り越えるために活用できる**内的なリソース**（強みや過去の成功体験など）は何だと考えられますか？\n';
        promptText += '* このエントリーを通じて、私自身がまだ明確に**言語化できていないかもしれない重要な気づき**や、**隠れたポテンシャル**、あるいはより深く掘り下げるべき**自己探求のテーマ**は何でしょうか？\n\n';
        promptText += '### 4. 実践的なアドバイスと今後の活用\n';
        promptText += '* 今回の省察と上記の分析を踏まえ、日常生活で具体的に実践できるストア派の**精神的エクササイズ**（例：ネガティブ・ビジュアライゼーション〔最悪想定〕、自己への問いかけ、感謝の習慣）や**思考法**を3つ提案してください。\n';
        promptText += '* 同様の状況や感情に再び直面した際に、よりストア派的に、かつ心理的にレジリエント〔精神的回復力〕に対処するための具体的なステップや**心構えの転換方法**を教えてください。\n';
        promptText += '* このジャーナルの記録を、単なる「ストック」で終わらせず、長期的な自己成長、精神的な安定、そして目標達成に**効果的に活かしていくためのヒント**や、記録を続ける上での**注意点**があれば教えてください。\n\n';
        promptText += '---\n';
        promptText += '## 希望する出力形式\n\n';
        promptText += '以下の形式での出力を厳守してください。\n\n';
        promptText += '* 出力の冒頭に `# フィードバック` の大見出しを置く\n';
        promptText += '* 見出し（#, ##, ###）で内容を階層化する\n';
        promptText += '* 各見出しの下は2〜3文で簡潔にまとめる\n';
        promptText += '* 箇条書きを活用し、1行1アイデアとする\n';
        promptText += '* 引用 `>` を使って重要ポイントを強調する\n';
        promptText += '* 可能であれば表を用いて比較情報を整理する\n';
        promptText += '* 太字・斜体・コードブロックなど Markdown の装飾を適切に用いる\n';
        promptText += '* 専門用語には〔10字以内〕で注釈を添える\n';
        promptText += '* フォーマルなビジネス文体で記述する\n';
        promptText += '* プレーンテキストのみの回答は禁止\n\n';
        promptText += '---\n';
        promptText += '上記の内容で、私の内省が深まり、日々の実践に繋がるような質の高いフィードバックを期待しています。どうぞよろしくお願いいたします。\n';
        navigator.clipboard.writeText(promptText)
            .then(() => {
                showSnackbar('ジャーナルを保存＆AIプロンプトをコピーしました');
            })
            .catch(() => {
                showSnackbar('プロンプトのコピーに失敗しました');
            });
    });

    // --- 入力監視と保存ボタン制御 ---
    function checkAllInputsEmpty() {
        return !themeInput.value.trim();
    }

    function updateSaveButtonStateAndEmptyMessage() {
        saveButton.disabled = false;
    }

    // すべての入力欄にイベントリスナーを追加
    [themeInput, memoInput, questionInput1, answerInput1, questionInput2, answerInput2, aiResponseInput].forEach(input => {
        input.addEventListener('input', updateSaveButtonStateAndEmptyMessage);
    });

    // 初期表示時にも反映
    updateSaveButtonStateAndEmptyMessage();

    // --- 新規作成フォームのリセット ---
    function prepareNewEntryForm() {
        currentlyEditingEntryId = null;
        localStorage.removeItem('lastEditingEntryId');
        themeInput.value = '';
        memoInput.value = '';
        questionInput1.value = '';
        answerInput1.value = '';
        questionInput2.value = '';
        answerInput2.value = '';
        aiResponseInput.value = '';
        aiResponsePreview.innerHTML = '';
        document.getElementById('journal-tab').querySelector('h2').textContent = 'ジャーナル作成';
        deleteButton.style.display = 'none';
        showTab('journal-tab');
        themeInput.focus();
        renderJournalList();
        const createdAtLabel = document.getElementById('created-at-label');
        const updatedAtLabel = document.getElementById('updated-at-label');
        if (createdAtLabel && updatedAtLabel) {
            createdAtLabel.textContent = 'Create: --';
            updatedAtLabel.textContent = 'Update: --';
        }
        updateAiResponseButtonState();
        updateSaveButtonStateAndEmptyMessage();
        openDialogueFor(null);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    // --- タブ切り替え時にフィードバックプレビューを再描画 ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('onclick')?.match(/'(.*?)'/)?.[1];
            if (tabId === 'ai-response-tab') {
                // フィードバックを見るタブを押したときだけ装飾を適用
                const md = aiResponseInput.value;
                if (typeof marked === 'function') {
                    aiResponsePreview.innerHTML = marked(md);
                } else if (marked && typeof marked.default === 'function') {
                    aiResponsePreview.innerHTML = marked.default(md);
                } else {
                    // 装飾なしのプレーンテキスト（エスケープ済み）
                    aiResponsePreview.textContent = md;
                }
            }
            if (tabId === 'input-preview-tab') {
                const theme = themeInput.value.trim();
                const memo = memoInput.value.trim();
                const q1 = questionInput1.value.trim();
                const a1 = answerInput1.value.trim();
                const q2 = questionInput2.value.trim();
                const a2 = answerInput2.value.trim();
                // 3行2列グリッド用
                const themeCell = document.querySelector('.theme-cell');
                const memoCell = document.querySelector('.memo-cell');
                const question1Cell = document.querySelector('.question1-cell');
                const answer1Cell = document.querySelector('.answer1-cell');
                const question2Cell = document.querySelector('.question2-cell');
                const answer2Cell = document.querySelector('.answer2-cell');
                if (themeCell && memoCell && question1Cell && answer1Cell && question2Cell && answer2Cell) {
                    // 改行を<br>に変換して表示
                    const themeHtml = theme ? `<h3>テーマ</h3>${theme.replace(/\n/g, '<br>')}` : '';
                    const memoHtml = memo ? `<h3>メモ</h3>${memo.replace(/\n/g, '<br>')}` : '';
                    const q1Html = q1 ? `<h3>問い1</h3>${q1.replace(/\n/g, '<br>')}` : '';
                    const a1Html = a1 ? `<h3>解答1</h3>${a1.replace(/\n/g, '<br>')}` : '';
                    const q2Html = q2 ? `<h3>問い2</h3>${q2.replace(/\n/g, '<br>')}` : '';
                    const a2Html = a2 ? `<h3>解答2</h3>${a2.replace(/\n/g, '<br>')}` : '';
                    themeCell.innerHTML = themeHtml;
                    memoCell.innerHTML = memoHtml;
                    question1Cell.innerHTML = q1Html;
                    answer1Cell.innerHTML = a1Html;
                    question2Cell.innerHTML = q2Html;
                    answer2Cell.innerHTML = a2Html;
                    // 何もなければ空表示
                    if (!theme) themeCell.innerHTML = '';
                    if (!memo) memoCell.innerHTML = '';
                    if (!q1) question1Cell.innerHTML = '';
                    if (!a1) answer1Cell.innerHTML = '';
                    if (!q2) question2Cell.innerHTML = '';
                    if (!a2) answer2Cell.innerHTML = '';
                    // すべて空なら1セルにメッセージ
                    if (!theme && !memo && !q1 && !a1 && !q2 && !a2) themeCell.innerHTML = '入力内容がありません。';
                }
            }
        });
    });

    // --- 初回ログイン用のサンプル ---
    const SAMPLE_ENTRIES = [
        {
            theme: 'コントロールの二分法',
            memo: '（サンプル）自分で変えられることと、そうでないことを分ける練習。',
            questions: [
                { question: '今日、自分にはどうにもできない事に心を乱された瞬間は？', answer: '電車の遅延で予定が崩れ、苛立ってしまった。' },
                { question: 'そのうち「自分に変えられる部分」は何だった？', answer: '遅延そのものは変えられないが、待ち時間に何をするかは選べた。' }
            ],
            aiResponse: '',
            _thoughts: ['遅延は天気と同じ。怒っても電車は早く来ない。', '次は待ち時間に読む本を1冊カバンに入れておく。']
        },
        {
            theme: '夜の振り返り（感謝）',
            memo: '（サンプル）一日の終わりに、当たり前を見直す。',
            questions: [
                { question: '今日あった小さな良いことを3つ挙げると？', answer: '温かいコーヒー、同僚の一言、静かな夜。' },
                { question: 'それは「当たり前」ではなく「有り難い」と言えるのはなぜ？', answer: 'どれも、無くなって初めて大きさに気づくものだから。' }
            ],
            aiResponse: ''
        },
        {
            theme: 'ネガティブ・ビジュアライゼーション',
            memo: '（サンプル）最悪を先に思い描き、今あるものに感謝する技法。',
            questions: [
                { question: 'もし今日が最後の一日なら、誰に何を伝えたい？', answer: '家族に素直に「ありがとう」と言いたい。' },
                { question: 'その気持ちを、今日の行動にどう一つだけ反映できる？', answer: '帰ったら一言、感謝を口に出して伝える。' }
            ],
            aiResponse: ''
        }
    ];

    // 初回ログイン（このブラウザで未投入 かつ ジャーナル0件）のときだけサンプルを作成
    async function seedSamplesIfFirstTime(user) {
        const flagKey = 'stoic_seeded_' + user.uid;
        if (localStorage.getItem(flagKey)) return false;
        if (journalEntries.length > 0) { localStorage.setItem(flagKey, '1'); return false; }
        try {
            for (const s of SAMPLE_ENTRIES) {
                const created = await storage.addJournal({
                    theme: s.theme, memo: s.memo, questions: s.questions, aiResponse: s.aiResponse
                });
                if (s._thoughts && created && created.id) {
                    for (const t of s._thoughts) {
                        // 対話ルール未設定でもサンプル本体は残す
                        try { await storage.addThought(created.id, t); } catch (e) { /* noop */ }
                    }
                }
            }
            localStorage.setItem(flagKey, '1');
            return true;
        } catch (e) {
            return false; // journalsルール未設定時などはサンプル無しで継続
        }
    }

    // --- ジャーナル一覧を再取得して描画する関数 ---
    async function loadJournalEntries() {
        const user = auth.currentUser;
        if (!user) return;
        journalEntries = await storage.getAllJournals();
        // 初回ログイン時のみ、サンプルを2〜3件投入してから再取得
        if (await seedSamplesIfFirstTime(user)) {
            journalEntries = await storage.getAllJournals();
        }
        renderJournalList();
        // localStorageから直前のIDを取得し自動表示
        const lastId = localStorage.getItem('lastEditingEntryId');
        if (lastId && journalEntries.some(e => e.id === lastId)) {
            displayJournalEntry(lastId);
        } else if (journalEntries.length > 0) {
            displayJournalEntry(journalEntries[0].id);
        }
        updateAiResponseButtonState();
    }

    // --- 初期ロード ---
    window.auth.onAuthStateChanged(user => {
        if (user) {
            loadJournalEntries();
        } else {
            journalEntries = [];
            renderJournalList();
            prepareNewEntryForm();
        }
    });

    // --- 新規作成ボタンのイベントリスナー ---
    const newEntryButton = document.getElementById('new-entry-button');
    if (newEntryButton) {
        newEntryButton.addEventListener('click', () => {
            prepareNewEntryForm();
        });
    }

    // --- 保存処理を共通化 ---
    async function saveFullJournalEntry(showSnackbarMessage) {
        const theme = themeInput.value.trim();
        const memo = memoInput.value.trim();
        const q1 = questionInput1.value.trim();
        const a1 = answerInput1.value.trim();
        const q2 = questionInput2.value.trim();
        const a2 = answerInput2.value.trim();
        const aiResponse = aiResponseInput.value.trim();
        const now = new Date().toISOString();
        try {
            if (currentlyEditingEntryId) {
                await storage.updateJournal(currentlyEditingEntryId, {
                    id: currentlyEditingEntryId,
                    theme,
                    memo,
                    questions: [
                        { question: q1, answer: a1 },
                        { question: q2, answer: a2 }
                    ],
                    aiResponse,
                    updatedAt: now
                });
            } else {
                const newEntry = {
                    theme,
                    memo,
                    questions: [
                        { question: q1, answer: a1 },
                        { question: q2, answer: a2 }
                    ],
                    aiResponse,
                    createdAt: now,
                    updatedAt: now
                };
                const added = await storage.addJournal(newEntry);
                // idをFirestoreにも保存
                await storage.updateJournal(added.id, { id: added.id });
                currentlyEditingEntryId = added.id;
                localStorage.setItem('lastEditingEntryId', added.id);
            }
            await loadJournalEntries();
            updateAiResponseButtonState();
            if (showSnackbarMessage) showSnackbar(showSnackbarMessage);
            return true;
        } catch (e) {
            showSnackbar('保存に失敗しました');
            return false;
        }
    }

    // --- 保存ボタンのイベントリスナー追加 ---
    saveButton.addEventListener('click', async () => {
        await saveFullJournalEntry('ジャーナルを保存しました');
    });

    // --- AI返答を保存ボタンのイベントリスナー ---
    saveAiResponseButton.addEventListener('click', async () => {
        await saveFullJournalEntry('AIフィードバックを保存しました');
    });

    function updateAiResponseButtonState() {
        if (!currentlyEditingEntryId) {
            saveAiResponseButton.disabled = true;
            aiResponseNotice.style.display = 'block';
        } else {
            saveAiResponseButton.disabled = false;
            aiResponseNotice.style.display = 'none';
        }
    }

    // 初期ロード時にも状態を反映
    updateAiResponseButtonState();

    // --- AIフィードバック欄の編集時にプレビューを更新 ---
    function renderAiResponsePreview() {
        const md = aiResponseInput.value;
        if (typeof marked === 'function') {
            aiResponsePreview.innerHTML = marked(md);
        } else if (marked && typeof marked.default === 'function') {
            aiResponsePreview.innerHTML = marked.default(md);
        } else {
            aiResponsePreview.textContent = md;
        }
    }

    // --- AIプロンプトをコピー（保存なし） ---
    copyAiPromptButton.addEventListener('click', () => {
        const theme = themeInput.value.trim();
        const q1 = questionInput1.value.trim();
        const a1 = answerInput1.value.trim();
        const q2 = questionInput2.value.trim();
        const a2 = answerInput2.value.trim();
        let promptText = `以下は私のストイックに関する書籍にある問いとそれに対する解答を記載したものです。\n\n`;
        promptText += `---\n`;
        promptText += `# テーマ: ${theme}\n\n`;
        promptText += `## 問い1: ${q1}\n私の解答1:\n${a1}\n\n`;
        promptText += `## 問い2: ${q2}\n私の解答2:\n${a2}\n`;
        promptText += `---\n\n`;
        promptText += '## フィードバックで特に重視してほしい点\n\n';
        promptText += '以下の各観点から、具体的かつ実践的なフィードバックをお願いします。\n\n';
        promptText += '### 1. ストア派哲学に基づく分析\n';
        promptText += '* 私の思考、感情、行動のパターンは、ストア派の主要な教え（例: **コントロールの二分法**〔制御可否〕、**徳の追求**〔善き行い〕、**運命愛**〔現状受容〕、理性的な判断、感情の扱い方）とどのように関連していますか？肯定的な側面と、改善の余地がある側面の両方について教えてください。\n';
        promptText += '* このエントリー内容から、ストア派の観点でどのような**強み**や**成長の機会**が見出せますか？\n';
        promptText += '* もしストア派の賢人（マルクス・アウレリウス、エピクテトス、セネカなど）がこの状況に置かれたとしたら、どのように考え、どのような言葉で自らを励まし、あるいは戒め、どのように行動したと思われますか？具体的な彼らの言葉や哲学的なアプローチを交えて示唆を与えてください。\n\n';
        promptText += '### 2. 脳科学・心理学的洞察\n';
        promptText += '* 私の記述から見られる思考パターン（例：自己批判、反芻思考〔堂々巡り〕、行動の先延ばし）や感情の動きについて、脳科学的にどのようなメカニズム（例：扁桃体の過活動、前頭前野の機能低下、報酬系の不活性化など）が働いている可能性がありますか？\n';
        promptText += '* 心理学の観点から、私の自己認識（例：自己評価、自己効力感〔自信〕）、問題への対処スタイル（例：回避的行動、完璧主義）、あるいは認知の偏り（例：ネガティブフィルター、過度な一般化）について、どのような解釈ができますか？\n';
        promptText += '* これらの科学的知見を踏まえ、私の思考や感情を客観的に理解し、より建設的に自己と向き合うためのヒントはありますか？\n\n';
        promptText += '### 3. 自己理解の深化と傾向分析\n';
        promptText += '* 私の問いに対する解答の傾向から、どのような**価値観**、**信念**（特に自己制限的なもの）、あるいは無意識の**前提**が読み取れますか？\n';
        promptText += '* エントリーのテーマ（例：「自分を信じる」）に関して、私の現在の**心理的な課題**や、それを乗り越えるために活用できる**内的なリソース**（強みや過去の成功体験など）は何だと考えられますか？\n';
        promptText += '* このエントリーを通じて、私自身がまだ明確に**言語化できていないかもしれない重要な気づき**や、**隠れたポテンシャル**、あるいはより深く掘り下げるべき**自己探求のテーマ**は何でしょうか？\n\n';
        promptText += '### 4. 実践的なアドバイスと今後の活用\n';
        promptText += '* 今回の省察と上記の分析を踏まえ、日常生活で具体的に実践できるストア派の**精神的エクササイズ**（例：ネガティブ・ビジュアライゼーション〔最悪想定〕、自己への問いかけ、感謝の習慣）や**思考法**を3つ提案してください。\n';
        promptText += '* 同様の状況や感情に再び直面した際に、よりストア派的に、かつ心理的にレジリエント〔精神的回復力〕に対処するための具体的なステップや**心構えの転換方法**を教えてください。\n';
        promptText += '* このジャーナルの記録を、単なる「ストック」で終わらせず、長期的な自己成長、精神的な安定、そして目標達成に**効果的に活かしていくためのヒント**や、記録を続ける上での**注意点**があれば教えてください。\n\n';
        promptText += '---\n';
        promptText += '## 希望する出力形式\n\n';
        promptText += '以下の形式での出力を厳守してください。\n\n';
        promptText += '* 出力の冒頭に `# フィードバック` の大見出しを置く\n';
        promptText += '* 見出し（#, ##, ###）で内容を階層化する\n';
        promptText += '* 各見出しの下は2〜3文で簡潔にまとめる\n';
        promptText += '* 箇条書きを活用し、1行1アイデアとする\n';
        promptText += '* 引用 `>` を使って重要ポイントを強調する\n';
        promptText += '* 可能であれば表を用いて比較情報を整理する\n';
        promptText += '* 太字・斜体・コードブロックなど Markdown の装飾を適切に用いる\n';
        promptText += '* 専門用語には〔10字以内〕で注釈を添える\n';
        promptText += '* フォーマルなビジネス文体で記述する\n';
        promptText += '* プレーンテキストのみの回答は禁止\n\n';
        promptText += '---\n';
        promptText += '上記の内容で、私の内省が深まり、日々の実践に繋がるような質の高いフィードバックを期待しています。どうぞよろしくお願いいたします。\n';
        navigator.clipboard.writeText(promptText)
            .then(() => {
                showSnackbar('AIプロンプトをコピーしました');
            })
            .catch(() => {
                showSnackbar('プロンプトのコピーに失敗しました');
            });
    });

    // ===== 自分との対話（書き出し＋コメント / 05のリアルタイム購読を応用） =====
    const dialogueList = document.getElementById('dialogue-list');
    const thoughtInput = document.getElementById('thought-input');
    const thoughtAddBtn = document.getElementById('thought-add');
    const dialogueNotice = document.getElementById('dialogue-notice');
    const dialogueBody = document.getElementById('dialogue-body');
    let dialogueUnsub = null;

    // ジャーナルを開くたびに、その書き出しをリアルタイム購読し直す
    function openDialogueFor(journalId) {
        if (dialogueUnsub) { dialogueUnsub(); dialogueUnsub = null; }
        if (!journalId) {
            if (dialogueNotice) dialogueNotice.style.display = 'block';
            if (dialogueBody) dialogueBody.style.display = 'none';
            if (dialogueList) dialogueList.innerHTML = '';
            return;
        }
        if (dialogueNotice) dialogueNotice.style.display = 'none';
        if (dialogueBody) dialogueBody.style.display = 'block';
        // onSnapshot = 05の onChildAdded 相当。書き出し・コメントの瞬間に再描画される
        dialogueUnsub = storage.subscribeDialogue(journalId, renderDialogue);
    }

    function renderDialogue(thoughts) {
        if (!dialogueList) return;
        dialogueList.innerHTML = '';
        if (!thoughts.length) {
            const empty = document.createElement('div');
            empty.className = 'dialogue-empty';
            empty.textContent = 'まだ何も書き出していません。頭の中にあるものを、そのまま書いてみましょう。';
            dialogueList.appendChild(empty);
            return;
        }
        thoughts.forEach(t => {
            const card = document.createElement('div');
            card.className = 'thought-card';

            // 書き出した本文
            const bubble = document.createElement('div');
            bubble.className = 'thought-bubble';
            bubble.textContent = t.text; // .textContent でXSS安全
            card.appendChild(bubble);

            // コメント（自分との対話）一覧
            const comments = Array.isArray(t.comments) ? t.comments : [];
            if (comments.length) {
                const clist = document.createElement('div');
                clist.className = 'thought-comments';
                comments.forEach(c => {
                    const cb = document.createElement('div');
                    cb.className = 'thought-comment';
                    cb.textContent = c.text;
                    clist.appendChild(cb);
                });
                card.appendChild(clist);
            }

            // コメント追加フォーム（最初は隠す）
            const form = document.createElement('div');
            form.className = 'thought-comment-form';
            form.style.display = 'none';
            const cinput = document.createElement('textarea');
            cinput.rows = 2;
            cinput.placeholder = 'この書き出しに、いまの自分から返してみる';
            const csubmit = document.createElement('button');
            csubmit.textContent = '追加';
            csubmit.addEventListener('click', async () => {
                const text = (cinput.value || '').trim();
                if (!text) return;
                try {
                    await storage.addComment(currentlyEditingEntryId, t.id, text);
                    cinput.value = '';
                } catch (e) {
                    showSnackbar('コメントの追加に失敗しました（Firestoreルールを確認）');
                }
            });
            form.appendChild(cinput);
            form.appendChild(csubmit);

            // 「コメント」ボタン → 対話フォームを開閉
            const toggle = document.createElement('button');
            toggle.className = 'thought-comment-toggle';
            toggle.textContent = 'コメント';
            toggle.addEventListener('click', () => {
                form.style.display = (form.style.display === 'none') ? 'block' : 'none';
                if (form.style.display === 'block') cinput.focus();
            });

            card.appendChild(toggle);
            card.appendChild(form);
            dialogueList.appendChild(card);
        });
        dialogueList.scrollTop = dialogueList.scrollHeight;
    }

    // 「書き出す」：頭の中を1件追加
    if (thoughtAddBtn) {
        thoughtAddBtn.addEventListener('click', async () => {
            const text = (thoughtInput.value || '').trim();
            if (!text) return;
            if (!currentlyEditingEntryId) { showSnackbar('まずジャーナルを保存してください'); return; }
            try {
                await storage.addThought(currentlyEditingEntryId, text);
                thoughtInput.value = '';
                thoughtInput.focus();
            } catch (e) {
                showSnackbar('書き出しの保存に失敗しました（Firestoreルールを確認）');
            }
        });
    }

    // 初期状態（まだジャーナル未選択なら案内を表示）
    openDialogueFor(currentlyEditingEntryId || null);

}); // DOMContentLoaded の終わり 