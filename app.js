document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const peopleGrid = document.getElementById('peopleGrid');
    const emptyState = document.getElementById('emptyState');
    const addBtn = document.getElementById('addBtn');
    const searchInput = document.getElementById('searchInput');
    const quizBtn = document.getElementById('quizBtn');
    
    // Quiz Modal Elements
    const quizModal = document.getElementById('quizModal');
    const closeQuizModal = document.getElementById('closeQuizModal');
    const quizStateError = document.getElementById('quizStateError');
    const quizContainer = document.getElementById('quizContainer');
    const quizChoices = document.getElementById('quizChoices');
    const quizResult = document.getElementById('quizResult');
    const quizResultMessage = document.getElementById('quizResultMessage');
    const quizResultDetail = document.getElementById('quizResultDetail');
    const nextQuizBtn = document.getElementById('nextQuizBtn');
    
    // Add/Edit Modal
    const addModal = document.getElementById('addModal');
    const closeAddModal = document.getElementById('closeAddModal');
    const personForm = document.getElementById('personForm');
    const modalTitle = document.getElementById('modalTitle');
    
    // Detail Modal
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const editPersonBtn = document.getElementById('editPersonBtn');
    const deletePersonBtn = document.getElementById('deletePersonBtn');
    
    // Form Inputs
    const nameInput = document.getElementById('name');
    const originInput = document.getElementById('origin');
    const affiliationInput = document.getElementById('affiliation');
    const likesInput = document.getElementById('likes');
    const dislikesInput = document.getElementById('dislikes');
    const editIdInput = document.getElementById('editId');
    
    // State
    let people = JSON.parse(localStorage.getItem('namelink_people')) || [];
    let currentDetailId = null;
    let currentQuizPerson = null;

    // Initialize
    renderPeople();

    // Event Listeners
    addBtn.addEventListener('click', () => openAddModal());
    quizBtn.addEventListener('click', openQuiz);
    closeAddModal.addEventListener('click', closeModals);
    closeDetailModal.addEventListener('click', closeModals);
    closeQuizModal.addEventListener('click', closeModals);
    personForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', handleSearch);
    nextQuizBtn.addEventListener('click', generateQuiz);
    
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

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addModal || e.target === detailModal || e.target === quizModal) {
            closeModals();
        }
    });

    // Functions
    function savePeople() {
        localStorage.setItem('namelink_people', JSON.stringify(people));
    }

    function renderPeople(filterText = '') {
        peopleGrid.innerHTML = '';
        
        const filteredPeople = people.filter(p => {
            const searchText = filterText.toLowerCase();
            const fullText = `${p.name} ${p.origin} ${p.affiliation} ${p.likes} ${p.dislikes}`.toLowerCase();
            return fullText.includes(searchText);
        });

        if (filteredPeople.length === 0) {
            emptyState.classList.remove('hidden');
            if (filterText) {
                emptyState.querySelector('p').innerHTML = '検索条件に一致する人がいません。';
            } else {
                emptyState.querySelector('p').innerHTML = 'まだ誰も登録されていません。<br>右上の「追加」ボタンから登録しましょう。';
            }
        } else {
            emptyState.classList.add('hidden');
            
            filteredPeople.forEach(person => {
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openDetailModal(person.id);
                
                const initial = person.name.charAt(0);
                
                // Parse tags
                const likesArray = person.likes.split(',').map(s => s.trim()).filter(s => s);
                let tagsHTML = '';
                if (likesArray.length > 0) {
                    tagsHTML += `<span class="tag tag-like">${likesArray[0]}</span>`;
                }
                if (person.affiliation) {
                    tagsHTML += `<span class="tag">${person.affiliation.substring(0, 10)}${person.affiliation.length > 10 ? '...' : ''}</span>`;
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
                likesInput.value = person.likes;
                dislikesInput.value = person.dislikes;
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
        
        // Setup Likes
        const likesContainer = document.getElementById('detailLikes');
        const likesArray = person.likes.split(',').map(s => s.trim()).filter(s => s);
        if (likesArray.length > 0) {
            likesContainer.innerHTML = likesArray.map(like => `<span class="tag tag-like">${like}</span>`).join('');
        } else {
            likesContainer.textContent = '-';
        }
        
        // Setup Dislikes
        const dislikesContainer = document.getElementById('detailDislikes');
        const dislikesArray = person.dislikes.split(',').map(s => s.trim()).filter(s => s);
        if (dislikesArray.length > 0) {
            dislikesContainer.innerHTML = dislikesArray.map(dislike => `<span class="tag" style="background:var(--accent-dislike)">${dislike}</span>`).join('');
        } else {
            dislikesContainer.textContent = '-';
        }
        
        detailModal.classList.remove('hidden');
    }

    function closeModals() {
        addModal.classList.add('hidden');
        detailModal.classList.add('hidden');
        quizModal.classList.add('hidden');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const newPerson = {
            id: editIdInput.value || Date.now().toString(),
            name: nameInput.value.trim(),
            origin: originInput.value.trim(),
            affiliation: affiliationInput.value.trim(),
            likes: likesInput.value.trim(),
            dislikes: dislikesInput.value.trim(),
            createdAt: Date.now()
        };
        
        if (editIdInput.value) {
            // Update
            const index = people.findIndex(p => p.id === editIdInput.value);
            if (index !== -1) {
                people[index] = newPerson;
            }
        } else {
            // Create
            people.push(newPerson);
        }
        
        // Sort by created (newest first)
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

    // --- Quiz Logic ---
    function openQuiz() {
        quizModal.classList.remove('hidden');
        
        if (people.length < 2) {
            quizStateError.classList.remove('hidden');
            quizContainer.classList.add('hidden');
        } else {
            quizStateError.classList.add('hidden');
            quizContainer.classList.remove('hidden');
            generateQuiz();
        }
    }

    function generateQuiz() {
        // Reset UI
        quizResult.classList.add('hidden');
        quizChoices.innerHTML = '';
        
        // Select random target person
        const targetIndex = Math.floor(Math.random() * people.length);
        currentQuizPerson = people[targetIndex];
        
        // Fill hints
        document.getElementById('quizHintOrigin').textContent = currentQuizPerson.origin || '（不明）';
        document.getElementById('quizHintAffiliation').textContent = currentQuizPerson.affiliation || '（不明）';
        
        const formatTags = (csvStr, colorClass) => {
            const arr = csvStr.split(',').map(s => s.trim()).filter(s => s);
            if (arr.length === 0) return '（なし）';
            return arr.map(tag => `<span class="tag ${colorClass}">${tag}</span>`).join('');
        };
        
        document.getElementById('quizHintLikes').innerHTML = formatTags(currentQuizPerson.likes, 'tag-like');
        document.getElementById('quizHintDislikes').innerHTML = formatTags(currentQuizPerson.dislikes, '');
        
        // Generate choices (1 correct, up to 3 random wrong)
        let choices = [currentQuizPerson];
        let availableWrong = people.filter(p => p.id !== currentQuizPerson.id);
        
        // Shuffle available wrong choices
        availableWrong.sort(() => 0.5 - Math.random());
        
        // Pick up to 3 wrong choices
        const wrongCount = Math.min(3, availableWrong.length);
        for (let i = 0; i < wrongCount; i++) {
            choices.push(availableWrong[i]);
        }
        
        // Shuffle all choices
        choices.sort(() => 0.5 - Math.random());
        
        // Render choices
        choices.forEach(person => {
            const btn = document.createElement('button');
            btn.className = 'quiz-choice-btn';
            btn.textContent = person.name;
            btn.onclick = () => handleQuizChoice(btn, person.id);
            quizChoices.appendChild(btn);
        });
    }

    function handleQuizChoice(btn, selectedId) {
        // Disable all buttons
        const allBtns = quizChoices.querySelectorAll('.quiz-choice-btn');
        allBtns.forEach(b => b.disabled = true);
        
        const isCorrect = (selectedId === currentQuizPerson.id);
        
        if (isCorrect) {
            btn.classList.add('correct');
            quizResult.className = 'quiz-result success';
            quizResultMessage.textContent = '🎉 正解！';
            quizResultDetail.textContent = 'バッチリですね！';
        } else {
            btn.classList.add('wrong');
            // Find and highlight correct button
            allBtns.forEach(b => {
                if (b.textContent === currentQuizPerson.name) {
                    b.classList.add('correct');
                }
            });
            quizResult.className = 'quiz-result error';
            quizResultMessage.textContent = '😢 残念…';
            quizResultDetail.textContent = `正解は「${currentQuizPerson.name}」さんでした！`;
        }
        
        quizResult.classList.remove('hidden');
    }
});
