document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const peopleGrid = document.getElementById('peopleGrid');
    const emptyState = document.getElementById('emptyState');
    const addBtn = document.getElementById('addBtn');
    const searchInput = document.getElementById('searchInput');
    const quizBtn = document.getElementById('quizBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const statsBtn = document.getElementById('statsBtn');
    
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
    
    // Detail Modal
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const editPersonBtn = document.getElementById('editPersonBtn');
    const deletePersonBtn = document.getElementById('deletePersonBtn');
    
    // Settings Modal
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const apiKeyInput = document.getElementById('apiKey');

    // Stats Modal
    const statsModal = document.getElementById('statsModal');
    const closeStatsModal = document.getElementById('closeStatsModal');

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
    
    // --- State ---
    let people = JSON.parse(localStorage.getItem('namelink_people_v3')) || [];
    let stats = JSON.parse(localStorage.getItem('namelink_stats_v3')) || {};
    let apiKey = localStorage.getItem('namelink_gemini_apikey') || '';
    
    let currentDetailId = null;
    let currentQuizPerson = null;
    let currentHints = [];
    let currentHintIndex = 0;

    // Migrate old v2 data if exists
    if (people.length === 0) {
        const oldPeople = JSON.parse(localStorage.getItem('namelink_people'));
        if (oldPeople && oldPeople.length > 0) {
            people = oldPeople.map(p => ({
                id: p.id,
                name: p.name,
                origin: p.origin || '',
                affiliation: p.affiliation || '',
                features: `好きなもの: ${p.likes || ''}\n嫌いなもの: ${p.dislikes || ''}`,
                createdAt: p.createdAt || Date.now()
            }));
            savePeople();
        }
    }

    // Initialize
    renderPeople();

    // --- Event Listeners ---
    addBtn.addEventListener('click', () => openAddModal());
    quizBtn.addEventListener('click', openQuiz);
    settingsBtn.addEventListener('click', openSettings);
    statsBtn.addEventListener('click', openStats);
    
    closeAddModal.addEventListener('click', closeModals);
    closeDetailModal.addEventListener('click', closeModals);
    closeQuizModal.addEventListener('click', closeModals);
    closeSettingsModal.addEventListener('click', closeModals);
    closeStatsModal.addEventListener('click', closeModals);
    
    personForm.addEventListener('submit', handleFormSubmit);
    settingsForm.addEventListener('submit', handleSettingsSubmit);
    searchInput.addEventListener('input', handleSearch);
    nextQuizBtn.addEventListener('click', generateQuiz);
    showNextHintBtn.addEventListener('click', showNextHint);
    
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
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // --- Core Functions ---
    function savePeople() {
        localStorage.setItem('namelink_people_v3', JSON.stringify(people));
    }
    function saveStats() {
        localStorage.setItem('namelink_stats_v3', JSON.stringify(stats));
    }

    function renderPeople(filterText = '') {
        peopleGrid.innerHTML = '';
        
        const filteredPeople = people.filter(p => {
            const searchText = filterText.toLowerCase();
            const fullText = `${p.name} ${p.origin} ${p.affiliation} ${p.features}`.toLowerCase();
            return fullText.includes(searchText);
        });

        if (filteredPeople.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            filteredPeople.forEach(person => {
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openDetailModal(person.id);
                
                const initial = person.name.charAt(0);
                
                let tagsHTML = '';
                if (person.affiliation) {
                    tagsHTML += `<span class="tag">${person.affiliation.substring(0, 10)}</span>`;
                }
                if (person.origin) {
                    tagsHTML += `<span class="tag">${person.origin}</span>`;
                }

                card.innerHTML = `
                    <div class="card-header">
                        <div class="avatar">${initial}</div>
                        <div>
                            <div class="card-name">${person.name}</div>
                            <div class="card-subtitle">${person.affiliation || '所属なし'}</div>
                        </div>
                    </div>
                    <div class="card-tags">
                        ${tagsHTML}
                    </div>
                `;
                peopleGrid.appendChild(card);
            });
        }
    }

    function openAddModal(id = null) {
        personForm.reset();
        editIdInput.value = '';
        
        if (id) {
            const person = people.find(p => p.id === id);
            if (person) {
                modalTitle.textContent = '情報を編集';
                nameInput.value = person.name;
                originInput.value = person.origin;
                affiliationInput.value = person.affiliation;
                featuresInput.value = person.features;
                editIdInput.value = person.id;
            }
        } else {
            modalTitle.textContent = '新しい人を登録';
        }
        
        addModal.classList.remove('hidden');
        nameInput.focus();
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
        
        detailModal.classList.remove('hidden');
    }

    function closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const newPerson = {
            id: editIdInput.value || Date.now().toString(),
            name: nameInput.value.trim(),
            origin: originInput.value.trim(),
            affiliation: affiliationInput.value.trim(),
            features: featuresInput.value.trim(),
            createdAt: Date.now()
        };
        
        if (editIdInput.value) {
            const index = people.findIndex(p => p.id === editIdInput.value);
            if (index !== -1) people[index] = newPerson;
        } else {
            people.push(newPerson);
        }
        
        people.sort((a, b) => b.createdAt - a.createdAt);
        savePeople();
        renderPeople(searchInput.value);
        closeModals();
    }

    function deletePerson(id) {
        people = people.filter(p => p.id !== id);
        savePeople();
        renderPeople(searchInput.value);
    }
    
    function handleSearch(e) {
        renderPeople(e.target.value);
    }

    // --- Settings & Stats ---
    function openSettings() {
        apiKeyInput.value = apiKey;
        settingsModal.classList.remove('hidden');
    }

    function handleSettingsSubmit(e) {
        e.preventDefault();
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('namelink_gemini_apikey', apiKey);
        closeModals();
        alert('設定を保存しました。');
    }

    function openStats() {
        // Calculate totals
        let totalGames = 0;
        let totalCorrect = 0;
        let peopleStats = [];

        people.forEach(p => {
            const stat = stats[p.id] || { correct: 0, wrong: 0 };
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

        document.getElementById('statTotalGames').textContent = totalGames;
        document.getElementById('statAccuracy').textContent = totalGames > 0 ? Math.round((totalCorrect / totalGames) * 100) + '%' : '0%';

        // Sort by worst accuracy first, then by most wrong
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

    // --- AI Quiz Logic ---
    function openQuiz() {
        if (people.length < 2 || !apiKey) {
            quizStateError.classList.remove('hidden');
            quizContainer.classList.add('hidden');
            quizLoading.classList.add('hidden');
        } else {
            quizStateError.classList.add('hidden');
            quizContainer.classList.add('hidden');
            quizModal.classList.remove('hidden');
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

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            
            // Parse hints
            currentHints = text.split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(line => line);
            if (currentHints.length === 0) throw new Error('AIがヒントを生成できませんでした。');
            
            currentHintIndex = 0;
            
            // Generate Choices
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
            showNextHint(); // Show first hint

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
            
            if (currentHintIndex >= currentHints.length) {
                showNextHintBtn.classList.add('hidden');
            } else {
                showNextHintBtn.classList.remove('hidden');
            }
        }
    }

    function handleQuizChoice(btn, selectedId) {
        const allBtns = quizChoices.querySelectorAll('.quiz-choice-btn');
        allBtns.forEach(b => b.disabled = true);
        showNextHintBtn.classList.add('hidden'); // Disable hints
        
        // Ensure all hints are shown when answered
        while (currentHintIndex < currentHints.length) {
            showNextHint();
        }
        showNextHintBtn.classList.add('hidden');

        const isCorrect = (selectedId === currentQuizPerson.id);
        
        // Log Stats
        if (!stats[currentQuizPerson.id]) stats[currentQuizPerson.id] = { correct: 0, wrong: 0 };
        if (isCorrect) {
            stats[currentQuizPerson.id].correct++;
        } else {
            stats[currentQuizPerson.id].wrong++;
        }
        saveStats();
        
        if (isCorrect) {
            btn.classList.add('correct');
            quizResult.className = 'quiz-result success';
            quizResultMessage.textContent = '🎉 正解！';
            quizResultDetail.textContent = 'バッチリですね！';
        } else {
            btn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === currentQuizPerson.name) b.classList.add('correct');
            });
            quizResult.className = 'quiz-result error';
            quizResultMessage.textContent = '😢 残念…';
            quizResultDetail.textContent = `正解は「${currentQuizPerson.name}」さんでした！`;
        }
        
        quizResult.classList.remove('hidden');
    }
});
