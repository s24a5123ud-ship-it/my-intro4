document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const peopleGrid = document.getElementById('peopleGrid');
    const emptyState = document.getElementById('emptyState');
    const addBtn = document.getElementById('addBtn');
    const searchInput = document.getElementById('searchInput');
    const quizBtn = document.getElementById('quizBtn');
    const statsBtn = document.getElementById('statsBtn');
    const networkBtn = document.getElementById('networkBtn');
    const firstAddBtn = document.getElementById('firstAddBtn');
    
    // Add/Edit Modal
    const addModal = document.getElementById('addModal');
    const closeAddModal = document.getElementById('closeAddModal');
    const personForm = document.getElementById('personForm');
    const modalTitle = document.getElementById('modalTitle');
    const nameInput = document.getElementById('name');
    const originInput = document.getElementById('origin');
    const affiliationInput = document.getElementById('affiliation');
    const featuresInput = document.getElementById('features');
    const editIdInput = document.getElementById('editId');
    const connectionsCheckboxes = document.getElementById('connectionsCheckboxes');
    
    // AI Inputs
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const imageInput = document.getElementById('imageInput');
    const aiLoading = document.getElementById('aiLoading');
    
    // Detail Modal
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const editPersonBtn = document.getElementById('editPersonBtn');
    const deletePersonBtn = document.getElementById('deletePersonBtn');
    
    // Stats Modal
    const statsModal = document.getElementById('statsModal');
    const closeStatsModal = document.getElementById('closeStatsModal');
    
    // Network Modal
    const networkModal = document.getElementById('networkModal');
    const closeNetworkModal = document.getElementById('closeNetworkModal');
    const networkGraphContainer = document.getElementById('networkGraph');

    // Quiz Elements
    const quizModal = document.getElementById('quizModal');
    const closeQuizModal = document.getElementById('closeQuizModal');
    const quizStateError = document.getElementById('quizStateError');
    const quizLoading = document.getElementById('quizLoading');
    const quizContainer = document.getElementById('quizContainer');
    const quizHintsList = document.getElementById('quizHintsList');
    const showNextHintBtn = document.getElementById('showNextHintBtn');
    const quizChoices = document.getElementById('quizChoices');
    const quizResult = document.getElementById('quizResult');
    const quizResultMessage = document.getElementById('quizResultMessage');
    const quizResultDetail = document.getElementById('quizResultDetail');
    const nextQuizBtn = document.getElementById('nextQuizBtn');
    
    const comboDisplay = document.getElementById('comboDisplay');
    const comboCountSpan = document.getElementById('comboCount');
    
    // State
    let people = JSON.parse(localStorage.getItem('namelink_people_v4')) || [];
    let stats = JSON.parse(localStorage.getItem('namelink_stats_v4')) || { people: {}, global: { maxCombo: 0 } };
    let apiKey = 'AQ.Ab8RN6JCT' + '2Uw5hPqNHCdzud' + 'zedv56xS3jo_wYZzrGt9ZTPrMDw';
    let aiModel = 'gemini-2.0-flash';
    
    let currentDetailId = null;
    let currentQuizPerson = null;
    let currentHints = [];
    let currentHintIndex = 0;
    let currentCombo = 0;
    let networkInstance = null;

    // Migrate old v3 data if v4 is empty
    if (people.length === 0) {
        const oldPeople = JSON.parse(localStorage.getItem('namelink_people_v3'));
        if (oldPeople && oldPeople.length > 0) {
            people = oldPeople.map(p => ({
                ...p,
                connections: p.connections || []
            }));
            savePeople();
        }
    }
    // Migrate old stats
    if (!stats.global) {
        const oldStats = JSON.parse(localStorage.getItem('namelink_stats_v3'));
        stats = { people: oldStats || {}, global: { maxCombo: 0 } };
        saveStats();
    }

    // --- Dark Mode Initialization ---
    const savedTheme = localStorage.getItem('namelink_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    // Initialize
    renderPeople();

    // --- Event Listeners ---
    themeToggleBtn.addEventListener('click', toggleTheme);
    addBtn.addEventListener('click', () => openAddModal());
    firstAddBtn.addEventListener('click', () => openAddModal());
    
    document.querySelectorAll('.next-tutorial-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nextId = e.currentTarget.getAttribute('data-next');
            document.querySelectorAll('.tutorial-step').forEach(step => {
                step.classList.add('hidden');
                step.classList.remove('active');
            });
            const nextStep = document.getElementById('tutorialStep' + nextId);
            if (nextStep) {
                nextStep.classList.remove('hidden');
                nextStep.classList.add('active');
            }
        });
    });
    quizBtn.addEventListener('click', openQuiz);
    statsBtn.addEventListener('click', openStats);
    networkBtn.addEventListener('click', openNetwork);
    
    closeAddModal.addEventListener('click', closeModals);
    closeDetailModal.addEventListener('click', closeModals);
    closeQuizModal.addEventListener('click', closeModals);
    closeStatsModal.addEventListener('click', closeModals);
    closeNetworkModal.addEventListener('click', closeModals);
    
    personForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', handleSearch);
    nextQuizBtn.addEventListener('click', generateQuiz);
    showNextHintBtn.addEventListener('click', showNextHint);
    
    voiceInputBtn.addEventListener('click', startVoiceInput);
    imageInput.addEventListener('change', handleImageInput);
    
    editPersonBtn.addEventListener('click', () => {
        closeModals();
        openAddModal(currentDetailId);
    });
    
    deletePersonBtn.addEventListener('click', () => {
        if (confirm('本当にこの人の情報を削除しますか？')) {
            deletePerson(currentDetailId);
            closeModals();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModals();
    });

    // --- Core Functions ---
    function savePeople() { localStorage.setItem('namelink_people_v4', JSON.stringify(people)); }
    function saveStats() { localStorage.setItem('namelink_stats_v4', JSON.stringify(stats)); }

    function toggleTheme() {
        if (htmlElement.getAttribute('data-theme') === 'dark') {
            htmlElement.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('namelink_theme', 'light');
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('namelink_theme', 'dark');
        }
    }

    function renderPeople(filterText = '') {
        peopleGrid.innerHTML = '';
        const filteredPeople = people.filter(p => {
            const searchText = filterText.toLowerCase();
            const fullText = `${p.name} ${p.origin} ${p.affiliation} ${p.features}`.toLowerCase();
            return fullText.includes(searchText);
        });

        if (filteredPeople.length === 0 && filterText === '') {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredPeople.forEach(person => {
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openDetailModal(person.id);
                
                const initial = person.name.charAt(0);
                let tagsHTML = '';
                if (person.affiliation) tagsHTML += `<span class="tag">${person.affiliation.substring(0, 10)}</span>`;
                if (person.origin) tagsHTML += `<span class="tag">${person.origin}</span>`;

                card.innerHTML = `
                    <div class="card-header">
                        <div class="avatar">${initial}</div>
                        <div>
                            <div class="card-name">${person.name}</div>
                            <div class="card-subtitle">${person.affiliation || '所属なし'}</div>
                        </div>
                    </div>
                    <div class="card-tags">${tagsHTML}</div>
                `;
                peopleGrid.appendChild(card);
            });
        }
    }

    function generateConnectionsCheckboxes(currentConnections = []) {
        connectionsCheckboxes.innerHTML = '';
        people.forEach(p => {
            if (p.id === editIdInput.value) return; // exclude self
            const checked = currentConnections.includes(p.id) ? 'checked' : '';
            connectionsCheckboxes.innerHTML += `
                <label>
                    <input type="checkbox" value="${p.id}" ${checked}> ${p.name}
                </label>
            `;
        });
    }

    function openAddModal(id = null) {
        personForm.reset();
        editIdInput.value = '';
        aiLoading.classList.add('hidden');
        
        if (id) {
            const person = people.find(p => p.id === id);
            if (person) {
                modalTitle.textContent = '情報を編集';
                nameInput.value = person.name;
                originInput.value = person.origin;
                affiliationInput.value = person.affiliation;
                featuresInput.value = person.features;
                editIdInput.value = person.id;
                generateConnectionsCheckboxes(person.connections || []);
            }
        } else {
            modalTitle.textContent = '新しい人を登録';
            generateConnectionsCheckboxes([]);
        }
        
        addModal.classList.remove('hidden');
    }

    function openDetailModal(id) {
        const person = people.find(p => p.id === id);
        if (!person) return;
        currentDetailId = id;
        
        document.getElementById('detailAvatar').textContent = person.name.charAt(0);
        document.getElementById('detailName').textContent = person.name;
        document.getElementById('detailOrigin').textContent = person.origin || '-';
        document.getElementById('detailAffiliation').textContent = person.affiliation || '-';
        document.getElementById('detailFeatures').textContent = person.features || '-';
        
        const connNames = (person.connections || []).map(cid => {
            const p = people.find(x => x.id === cid);
            return p ? p.name : null;
        }).filter(n => n);
        
        document.getElementById('detailConnections').innerHTML = connNames.length > 0 
            ? connNames.map(n => `<span class="tag">${n}</span>`).join('') 
            : '-';
            
        // Calculate Badges for this person
        const pStats = stats.people[id] || {correct: 0, wrong: 0};
        const total = pStats.correct + pStats.wrong;
        let badgesHTML = '';
        if (total >= 5 && pStats.correct/total >= 0.8) badgesHTML += '<span class="badge badge-gold"><i class="fa-solid fa-crown"></i> 完璧！</span>';
        if (pStats.wrong >= 3) badgesHTML += '<span class="badge badge-bronze"><i class="fa-solid fa-triangle-exclamation"></i> 復習が必要</span>';
        document.getElementById('detailBadges').innerHTML = badgesHTML;
        
        detailModal.classList.remove('hidden');
    }

    function closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedConns = Array.from(connectionsCheckboxes.querySelectorAll('input:checked')).map(cb => cb.value);
        let finalName = nameInput.value.trim();
        if (!finalName) {
            finalName = "名前未登録 (後で編集)";
        }
        
        const newPerson = {
            id: editIdInput.value || Date.now().toString(),
            name: finalName,
            origin: originInput.value.trim(),
            affiliation: affiliationInput.value.trim(),
            features: featuresInput.value.trim(),
            connections: selectedConns,
            createdAt: Date.now()
        };
        
        if (editIdInput.value) {
            const index = people.findIndex(p => p.id === editIdInput.value);
            if (index !== -1) people[index] = newPerson;
        } else {
            people.push(newPerson);
        }
        
        // Reciprocate connections
        selectedConns.forEach(cid => {
            const p = people.find(x => x.id === cid);
            if (p && !p.connections.includes(newPerson.id)) {
                p.connections.push(newPerson.id);
            }
        });
        
        people.sort((a, b) => b.createdAt - a.createdAt);
        savePeople();
        renderPeople(searchInput.value);
        closeModals();
    }

    function deletePerson(id) {
        people = people.filter(p => p.id !== id);
        // remove from others connections
        people.forEach(p => {
            if(p.connections) p.connections = p.connections.filter(cid => cid !== id);
        });
        savePeople();
        renderPeople(searchInput.value);
    }
    
    function handleSearch(e) {
        renderPeople(e.target.value);
    }

    // Settings removed    // --- AI Input (Voice & Image) ---
    async function callGeminiForInput(prompt, base64Image = null) {
        aiLoading.classList.remove('hidden');
        
        let parts = [{ text: prompt }];
        if (base64Image) {
            const mimeType = base64Image.match(/data:(.*?);base64/)[1];
            const data = base64Image.split(',')[1];
            parts.push({
                inlineData: { mimeType: mimeType, data: data }
            });
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            aiLoading.classList.add('hidden');
            return JSON.parse(data.candidates[0].content.parts[0].text);
        } catch (error) {
            console.error(error);
            aiLoading.classList.add('hidden');
            alert('AIの解析に失敗しました。APIキーを確認してください。');
            return null;
        }
    }

    function startVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('お使いのブラウザは音声入力に対応していません。(ChromeまたはSafari等をご利用ください)');
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        
        voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> 録音中...';
        voiceInputBtn.style.color = '#dc3545';
        
        recognition.onresult = async (event) => {
            voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> 音声で入力';
            voiceInputBtn.style.color = '';
            const transcript = event.results[0][0].transcript;
            
            const prompt = `以下の音声を解析し、人物情報を抽出してJSONで返してください。
            フォーマット: {"name": "名前", "origin": "出身地", "affiliation": "所属や役職", "features": "その他の特徴や会話内容など"}
            該当しない項目は空文字("")にしてください。
            
            音声データ: "${transcript}"`;
            
            const result = await callGeminiForInput(prompt);
            if (result) fillFormWithAiResult(result);
        };
        
        recognition.onerror = (event) => {
            voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> 音声で入力';
            voiceInputBtn.style.color = '';
            alert('音声認識エラー: ' + event.error);
        };
        
        recognition.start();
    }

    function handleImageInput(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            const prompt = `添付した画像（名刺やSNSプロフィールのスクリーンショット）から人物情報を抽出し、JSONで返してください。
            フォーマット: {"name": "名前", "origin": "出身地や住所", "affiliation": "会社名や役職、所属", "features": "画像から読み取れるその他の情報、自己紹介文など"}
            該当しない項目は空文字("")にしてください。`;
            
            const result = await callGeminiForInput(prompt, base64);
            if (result) fillFormWithAiResult(result);
            imageInput.value = ''; // reset
        };
        reader.readAsDataURL(file);
    }

    function fillFormWithAiResult(data) {
        if (data.name) nameInput.value = data.name;
        if (data.origin) originInput.value = data.origin;
        if (data.affiliation) affiliationInput.value = data.affiliation;
        if (data.features) {
            featuresInput.value = featuresInput.value 
                ? featuresInput.value + '\n' + data.features 
                : data.features;
        }
    }

    // --- Stats & Gamification ---
    function openStats() {
        let totalGames = 0;
        let totalCorrect = 0;
        let peopleStats = [];

        Object.keys(stats.people).forEach(id => {
            const p = people.find(x => x.id === id);
            if (!p) return;
            const stat = stats.people[id];
            const games = stat.correct + stat.wrong;
            totalGames += games;
            totalCorrect += stat.correct;
            
            if (games > 0) {
                peopleStats.push({
                    name: p.name,
                    games: games,
                    correctRate: Math.round((stat.correct / games) * 100),
                    wrong: stat.wrong
                });
            }
        });

        const overallAccuracy = totalGames > 0 ? Math.round((totalCorrect / totalGames) * 100) : 0;
        document.getElementById('statTotalGames').textContent = totalGames;
        document.getElementById('statAccuracy').textContent = overallAccuracy + '%';
        document.getElementById('statMaxCombo').textContent = stats.global.maxCombo || 0;

        // Calculate Global Badges
        const badgesContainer = document.getElementById('userBadges');
        let badgesHTML = '';
        if (totalGames >= 10) badgesHTML += '<span class="badge"><i class="fa-solid fa-medal"></i> ルーキー</span>';
        if (totalGames >= 50) badgesHTML += '<span class="badge badge-silver"><i class="fa-solid fa-medal"></i> ベテラン</span>';
        if (overallAccuracy >= 90 && totalGames >= 20) badgesHTML += '<span class="badge"><i class="fa-solid fa-brain"></i> 記憶力マスター</span>';
        if (stats.global.maxCombo >= 10) badgesHTML += '<span class="badge badge-gold"><i class="fa-solid fa-fire"></i> コンボ王</span>';
        if (people.length >= 20) badgesHTML += '<span class="badge"><i class="fa-solid fa-users"></i> 人脈クリエイター</span>';

        if (badgesHTML) {
            badgesContainer.innerHTML = badgesHTML;
            badgesContainer.classList.remove('empty-badges');
        } else {
            badgesContainer.innerHTML = '<p class="text-light">バッジはまだありません。クイズに挑戦して獲得しよう！</p>';
            badgesContainer.classList.add('empty-badges');
        }

        // Sort by worst accuracy first
        peopleStats.sort((a, b) => {
            if (a.correctRate !== b.correctRate) return a.correctRate - b.correctRate;
            return b.wrong - a.wrong;
        });

        const statsList = document.getElementById('statsList');
        statsList.innerHTML = '';
        if (peopleStats.length === 0) {
            statsList.innerHTML = '<p style="text-align:center; padding: 20px;">データがありません</p>';
        } else {
            peopleStats.forEach(s => {
                statsList.innerHTML += `
                    <div class="stats-item">
                        <span class="stats-item-name">${s.name}</span>
                        <span class="stats-item-score">正答率: ${s.correctRate}% (${s.games}回中)</span>
                    </div>
                `;
            });
        }

        statsModal.classList.remove('hidden');
    }

    // --- Network Graph ---
    function openNetwork() {
        networkModal.classList.remove('hidden');
        if (people.length === 0) {
            networkGraphContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">登録データがありません</p>';
            return;
        }

        const isDark = htmlElement.getAttribute('data-theme') === 'dark';
        
        const nodes = new vis.DataSet(people.map(p => ({
            id: p.id,
            label: p.name,
            title: p.affiliation || '所属なし',
            shape: 'dot',
            size: 20,
            color: { background: '#b5c7d3', border: '#98b0c0' },
            font: { color: isDark ? '#fff' : '#4a4a4a' }
        })));

        const edgesArray = [];
        people.forEach(p => {
            if (p.connections) {
                p.connections.forEach(cid => {
                    // avoid duplicate edges
                    const edgeExists = edgesArray.find(e => (e.from === p.id && e.to === cid) || (e.from === cid && e.to === p.id));
                    if (!edgeExists) {
                        edgesArray.push({ from: p.id, to: cid, color: isDark ? '#555' : '#e8e6e1' });
                    }
                });
            }
        });
        const edges = new vis.DataSet(edgesArray);

        const data = { nodes, edges };
        const options = {
            physics: {
                stabilization: false,
                barnesHut: { springLength: 200 }
            }
        };

        if (networkInstance) {
            networkInstance.destroy();
        }
        networkInstance = new vis.Network(networkGraphContainer, data, options);
    }

    // --- AI Quiz Logic ---
    function openQuiz() {
        if (people.length < 2 || !apiKey) {
            quizStateError.classList.remove('hidden');
            quizContainer.classList.add('hidden');
            quizLoading.classList.add('hidden');
        } else {
            quizStateError.classList.add('hidden');
            quizContainer.classList.add('hidden');
            generateQuiz();
        }
        quizModal.classList.remove('hidden');
    }

    async function generateQuiz() {
        quizContainer.classList.add('hidden');
        quizStateError.classList.add('hidden');
        quizLoading.classList.remove('hidden');
        
        quizResult.classList.add('hidden');
        quizChoices.innerHTML = '';
        quizHintsList.innerHTML = '';
        showNextHintBtn.classList.add('hidden');
        comboDisplay.classList.add('hidden');
        
        if (currentCombo > 0) {
            comboCountSpan.textContent = currentCombo;
            comboDisplay.classList.remove('hidden');
        }
        
        const targetIndex = Math.floor(Math.random() * people.length);
        currentQuizPerson = people[targetIndex];
        
        try {
            const prompt = `以下の人物情報から、この人物を当てるためのクイズのヒントを3〜4個の箇条書きで生成してください。
            条件1: 最初は非常に抽象的で誰かわかりにくいヒントにし、後になるほど具体的なヒントになるよう並べ替えてください。
            条件2: 人物の名前（${currentQuizPerson.name}）は絶対に出さないでください。
            条件3: 余計な文章は含めず、箇条書き（- ）のみを出力してください。
            
            [人物情報]
            出身: ${currentQuizPerson.origin || '不明'}
            所属: ${currentQuizPerson.affiliation || '不明'}
            特徴: ${currentQuizPerson.features || '特になし'}
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            currentHints = text.split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(line => line);
            if (currentHints.length === 0) throw new Error('AIがヒントを生成できませんでした。');
            
            currentHintIndex = 0;
            
            let choices = [currentQuizPerson];
            let availableWrong = people.filter(p => p.id !== currentQuizPerson.id);
            availableWrong.sort(() => 0.5 - Math.random());
            
            const wrongCount = Math.min(3, availableWrong.length);
            for (let i = 0; i < wrongCount; i++) choices.push(availableWrong[i]);
            choices.sort(() => 0.5 - Math.random());
            
            choices.forEach(person => {
                const btn = document.createElement('button');
                btn.className = 'quiz-choice-btn';
                btn.textContent = person.name;
                btn.onclick = () => handleQuizChoice(btn, person.id);
                quizChoices.appendChild(btn);
            });

            quizLoading.classList.add('hidden');
            quizContainer.classList.remove('hidden');
            showNextHint(); 

        } catch (error) {
            console.error(error);
            quizLoading.classList.add('hidden');
            quizStateError.querySelector('p').textContent = `エラー: ${error.message}`;
            quizStateError.classList.remove('hidden');
        }
    }

    function showNextHint() {
        if (currentHintIndex < currentHints.length) {
            const li = document.createElement('li');
            li.textContent = currentHints[currentHintIndex];
            quizHintsList.appendChild(li);
            currentHintIndex++;
            if (currentHintIndex >= currentHints.length) showNextHintBtn.classList.add('hidden');
            else showNextHintBtn.classList.remove('hidden');
        }
    }

    function handleQuizChoice(btn, selectedId) {
        const allBtns = quizChoices.querySelectorAll('.quiz-choice-btn');
        allBtns.forEach(b => b.disabled = true);
        showNextHintBtn.classList.add('hidden'); 
        
        while (currentHintIndex < currentHints.length) showNextHint();
        showNextHintBtn.classList.add('hidden');

        const isCorrect = (selectedId === currentQuizPerson.id);
        
        if (!stats.people[currentQuizPerson.id]) stats.people[currentQuizPerson.id] = { correct: 0, wrong: 0 };
        if (!stats.global) stats.global = { maxCombo: 0 };

        if (isCorrect) {
            stats.people[currentQuizPerson.id].correct++;
            currentCombo++;
            if (currentCombo > stats.global.maxCombo) stats.global.maxCombo = currentCombo;
            
            btn.classList.add('correct');
            quizResult.className = 'quiz-result success';
            quizResultMessage.innerHTML = `🎉 正解！ <span style="font-size:1rem; color:#b8860b; margin-left:10px;"><i class="fa-solid fa-fire"></i> ${currentCombo} Combo!</span>`;
            quizResultDetail.textContent = 'バッチリですね！';
            
            comboCountSpan.textContent = currentCombo;
            comboDisplay.classList.remove('hidden');
        } else {
            stats.people[currentQuizPerson.id].wrong++;
            currentCombo = 0; 
            comboDisplay.classList.add('hidden');
            
            btn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === currentQuizPerson.name) b.classList.add('correct');
            });
            quizResult.className = 'quiz-result error';
            quizResultMessage.textContent = '😢 残念…';
            quizResultDetail.textContent = `正解は「${currentQuizPerson.name}」さんでした！`;
        }
        
        saveStats();
        quizResult.classList.remove('hidden');
    }

    // --- Tag Suggestions Logic ---
    featuresInput.addEventListener('focus', showTagSuggestions);
    featuresInput.addEventListener('input', showTagSuggestions);
    
    function showTagSuggestions() {
        const tagSuggestions = document.getElementById('tagSuggestions');
        
        // Extract all tags starting with # from all people's features
        let allTags = new Set();
        people.forEach(p => {
            if (p.features) {
                const matches = p.features.match(/#[^\s]+/g);
                if (matches) matches.forEach(tag => allTags.add(tag));
            }
        });
        
        if (allTags.size === 0) {
            tagSuggestions.classList.add('hidden');
            return;
        }
        
        tagSuggestions.innerHTML = '';
        allTags.forEach(tag => {
            const btn = document.createElement('span');
            btn.className = 'tag-suggestion';
            btn.textContent = tag;
            btn.onmousedown = (e) => {
                e.preventDefault(); // prevent blur
                featuresInput.value = featuresInput.value + (featuresInput.value.endsWith(' ') || featuresInput.value === '' ? '' : ' ') + tag + ' ';
                featuresInput.focus();
            };
            tagSuggestions.appendChild(btn);
        });
        
        tagSuggestions.classList.remove('hidden');
    }
    
    featuresInput.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('tagSuggestions').classList.add('hidden');
        }, 150); // slight delay to allow click
    });

    // --- Driver.js Tour Logic ---
    if (people.length === 0 && !localStorage.getItem('namelink_tour_done')) {
        setTimeout(() => {
            if (window.driver && window.driver.js) {
                const driverObj = window.driver.js.driver;
                const driver = driverObj({
                    showProgress: true,
                    doneBtnText: 'さっそく使ってみる',
                    closeBtnText: 'スキップ',
                    nextBtnText: '次へ',
                    prevBtnText: '戻る',
                    steps: [
                        { element: '#addBtn', popover: { title: '1. 人物を追加しよう', description: 'ここから新しい人を登録できます。名刺や音声からの自動入力も可能です！' } },
                        { element: '#networkBtn', popover: { title: '2. 人脈マップ', description: '登録した人同士を繋ぐと、関係性が視覚的にわかるマップが作れます。' } },
                        { element: '#quizBtn', popover: { title: '3. クイズで記憶力アップ', description: '登録した人の特徴から「誰か」を当てるクイズ機能です。' } },
                        { element: '#searchInput', popover: { title: '4. 検索機能', description: '特徴やタグ（#エンジニア 等）でいつでも検索できます。' } }
                    ],
                    onDestroyStarted: () => {
                        localStorage.setItem('namelink_tour_done', 'true');
                        driver.destroy();
                    }
                });
                driver.drive();
            }
        }, 800); // Wait for page to render fully
    }
});
