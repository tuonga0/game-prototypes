// Game State
let gameState = {
    currentLevel: null,
    mode: 'select', // 'select' or 'mark'
    hearts: 3,
    selectedWords: new Set(),
    markedWrongWords: new Set(),
    hintsUsed: 0,
    usedHints: new Set(),
    allWords: [],
    wordsPage: 1,
    hintsPage: 1,
    wordsPerPage: 10,
    hintsPerPage: 4
};

// Initialize game on load
document.addEventListener('DOMContentLoaded', () => {
    // Check for preview mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
        loadPreviewLevel();
    } else {
        showScreen('menu-screen');
        loadLevelButtons();
        
        // Show tutorial on first visit
        const hasSeenTutorial = localStorage.getItem('wordguess_seen_tutorial');
        if (!hasSeenTutorial) {
            setTimeout(() => showTutorial(), 500);
        }
    }
});

// Load preview level from editor
function loadPreviewLevel() {
    const previewData = localStorage.getItem('wordguess_preview_level');
    if (!previewData) {
        alert('No preview level found. Returning to menu.');
        showScreen('menu-screen');
        loadLevelButtons();
        return;
    }
    
    try {
        const level = JSON.parse(previewData);
        startLevel(level.id, level);
    } catch (error) {
        alert('Error loading preview level: ' + error.message);
        showScreen('menu-screen');
        loadLevelButtons();
    }
}

// Screen Management
function showScreen(screenId) {
    console.log('showScreen called with:', screenId);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        console.log('Removed active from:', screen.id);
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('Added active to:', screenId, 'Display:', window.getComputedStyle(targetScreen).display);
    } else {
        console.error('Screen not found:', screenId);
    }
}

// Load level buttons in menu
function loadLevelButtons() {
    const container = document.getElementById('level-buttons');
    container.innerHTML = '';
    
    getAllLevels().forEach(level => {
        const progress = getLevelProgress(level.id);
        const button = document.createElement('button');
        button.className = 'level-btn';
        button.onclick = () => startLevel(level.id);
        
        const stars = progress.completed ? '★'.repeat(progress.stars) + '☆'.repeat(3 - progress.stars) : '☆☆☆';
        
        button.innerHTML = `
            <span>${level.name}</span>
            <span class="level-stars">${stars}</span>
        `;
        
        container.appendChild(button);
    });
}

// Start a level
function startLevel(levelId, previewLevel = null) {
    const level = previewLevel || getLevel(levelId);
    if (!level) {
        console.error('Level not found:', levelId);
        return;
    }
    
    // Reset game state
    gameState = {
        currentLevel: level,
        mode: 'select',
        hearts: 3,
        selectedWords: new Set(),
        markedWrongWords: new Set(),
        hintsUsed: 0,
        usedHints: new Set(),
        allWords: [...level.correctWords, ...level.wrongWords],
        wordsPage: 1,
        hintsPage: 1,
        wordsPerPage: 10,
        hintsPerPage: 4
    };
    
    // Shuffle words
    gameState.allWords = shuffleArray(gameState.allWords);
    
    // Update UI
    document.getElementById('level-name').textContent = level.name;
    updateHearts();
    updateStarTracker();
    updateWordsRemaining();
    loadHints();
    loadWords();
    setMode('select');
    
    showScreen('game-screen');
}

// Load hints with pagination
function loadHints() {
    const hints = gameState.currentLevel.hints;
    const totalPages = Math.ceil(hints.length / gameState.hintsPerPage);
    
    // Clear carousel
    const carousel = document.getElementById('hints-carousel');
    carousel.innerHTML = '';
    
    // Create pages
    for (let page = 1; page <= totalPages; page++) {
        const pageDiv = document.createElement('div');
        pageDiv.className = `carousel-page ${page === 1 ? 'active' : ''}`;
        pageDiv.id = `hints-page-${page}`;
        
        const gridDiv = document.createElement('div');
        gridDiv.className = 'hints-grid';
        gridDiv.dataset.page = page;
        
        const startIdx = (page - 1) * gameState.hintsPerPage;
        const endIdx = Math.min(startIdx + gameState.hintsPerPage, hints.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const hint = hints[i];
            const button = document.createElement('button');
            button.className = 'hint-btn';
            button.innerHTML = `
                <span class="hint-text">${hint.text}</span>
                <span class="hint-stats">
                    <span class="correct">✓${hint.correctCount}</span> 
                    <span class="wrong">✗${hint.wrongCount}</span>
                </span>
            `;
            button.onclick = () => useHint(i);
            button.dataset.index = i;
            gridDiv.appendChild(button);
        }
        
        pageDiv.appendChild(gridDiv);
        carousel.appendChild(pageDiv);
    }
    
    updateHintsPageIndicator();
    updateHintsNavButtons();
}

// Load words grid with pagination
function loadWords() {
    const words = gameState.allWords;
    const totalPages = Math.ceil(words.length / gameState.wordsPerPage);
    
    // Clear carousel
    const carousel = document.getElementById('words-carousel');
    carousel.innerHTML = '';
    
    // Create pages
    for (let page = 1; page <= totalPages; page++) {
        const pageDiv = document.createElement('div');
        pageDiv.className = `carousel-page ${page === 1 ? 'active' : ''}`;
        pageDiv.id = `words-page-${page}`;
        
        const gridDiv = document.createElement('div');
        gridDiv.className = 'words-grid';
        gridDiv.dataset.page = page;
        
        const startIdx = (page - 1) * gameState.wordsPerPage;
        const endIdx = Math.min(startIdx + gameState.wordsPerPage, words.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const word = words[i];
            const button = document.createElement('button');
            button.className = 'word-btn';
            button.textContent = word;
            button.onclick = () => handleWordClick(word);
            button.dataset.word = word;
            gridDiv.appendChild(button);
        }
        
        pageDiv.appendChild(gridDiv);
        carousel.appendChild(pageDiv);
    }
    
    updateWordsPageIndicator();
    updateWordsNavButtons();
}

// Handle word click
function handleWordClick(word) {
    if (gameState.mode === 'select') {
        selectWord(word);
    } else {
        markWord(word);
    }
}

// Select word (in select mode)
function selectWord(word) {
    // Can't select if marked as wrong
    if (gameState.markedWrongWords.has(word)) {
        return;
    }
    
    // Can't select if already selected
    if (gameState.selectedWords.has(word)) {
        return;
    }
    
    // Check if word is correct
    const isCorrect = gameState.currentLevel.correctWords.includes(word);
    
    if (isCorrect) {
        // Correct selection
        gameState.selectedWords.add(word);
        updateWordButton(word, 'selected');
        updateWordsRemaining();
        
        // Check win condition
        const hasWon = checkWin();
        console.log('Check win:', hasWon, 'Selected:', gameState.selectedWords.size, 'Required:', gameState.currentLevel.correctWords.length);
        if (hasWon) {
            console.log('WINNER! Showing results...');
            showResults(true);
        }
    } else {
        // Wrong selection - lose a heart
        gameState.hearts--;
        
        // Shake animation
        const heartsElement = document.getElementById('hearts');
        heartsElement.classList.add('shake');
        setTimeout(() => heartsElement.classList.remove('shake'), 500);
        
        updateHearts();
        
        // Flash the button red
        const buttons = document.querySelectorAll(`[data-word="${word}"]`);
        buttons.forEach(button => {
            button.style.background = '#F44336';
            button.style.color = 'white';
            setTimeout(() => {
                button.style.background = '';
                button.style.color = '';
            }, 500);
        });
        
        // Check lose condition
        const hasLost = checkLose();
        console.log('Check lose:', hasLost, 'Hearts:', gameState.hearts);
        if (hasLost) {
            console.log('GAME OVER! Showing results...');
            setTimeout(() => showResults(false), 600);
        }
    }
}

// Mark word (in mark mode)
function markWord(word) {
    if (gameState.markedWrongWords.has(word)) {
        // Unmark
        gameState.markedWrongWords.delete(word);
        updateWordButton(word, 'normal');
    } else {
        // Mark as wrong
        gameState.markedWrongWords.add(word);
        updateWordButton(word, 'marked');
    }
}

// Update word button appearance
function updateWordButton(word, state) {
    // Find button in all pages
    const buttons = document.querySelectorAll(`[data-word="${word}"]`);
    buttons.forEach(button => {
        button.classList.remove('selected', 'marked', 'disabled');
        
        if (state === 'selected') {
            button.classList.add('selected');
        } else if (state === 'marked') {
            button.classList.add('marked');
        }
    });
}

// Set mode (select or mark)
function setMode(mode) {
    gameState.mode = mode;
    
    const selectBtn = document.getElementById('mode-select');
    const markBtn = document.getElementById('mode-mark');
    
    if (mode === 'select') {
        selectBtn.classList.add('active');
        markBtn.classList.remove('active');
    } else {
        markBtn.classList.add('active');
        selectBtn.classList.remove('active');
    }
}

// Use hint
function useHint(index) {
    const hint = gameState.currentLevel.hints[index];
    if (!hint) return;
    
    const hintBtn = document.querySelector(`.hint-btn[data-index="${index}"]`);
    if (!hintBtn) return;
    
    // Track hint usage
    if (!gameState.usedHints.has(index)) {
        gameState.usedHints.add(index);
        gameState.hintsUsed++;
        updateStarTracker();
        
        // Mark hint button as used
        hintBtn.classList.add('used');
    }
    
    // Reveal the stats on the button
    hintBtn.classList.add('revealed');
    
    // Show popup
    showHintPopup(hint);
}

// Show hint popup
function showHintPopup(hint) {
    document.getElementById('popup-hint-title').textContent = hint.text;
    document.getElementById('popup-correct').textContent = hint.correctCount;
    document.getElementById('popup-wrong').textContent = hint.wrongCount;
    document.getElementById('hint-popup').classList.add('active');
}

// Close hint popup
function closeHintPopup() {
    document.getElementById('hint-popup').classList.remove('active');
}

// Update hearts display
function updateHearts() {
    const heartsContainer = document.getElementById('hearts');
    const fullHearts = '♥'.repeat(gameState.hearts);
    const emptyHearts = '♡'.repeat(3 - gameState.hearts);
    heartsContainer.textContent = fullHearts + emptyHearts;
}

// Update words remaining counter
function updateWordsRemaining() {
    const total = gameState.currentLevel.correctWords.length;
    const found = gameState.selectedWords.size;
    const remaining = total - found;
    
    const element = document.getElementById('words-remaining');
    element.textContent = `${remaining} word${remaining !== 1 ? 's' : ''} left`;
}

// Update star tracker with countdown
function updateStarTracker() {
    const level = gameState.currentLevel;
    const hintsUsed = gameState.hintsUsed;
    
    // Calculate current stars and next milestone
    let currentStars = 0;
    let nextMilestone = 0;
    
    if (hintsUsed <= level.threeStarThreshold) {
        currentStars = 3;
        nextMilestone = level.threeStarThreshold;
    } else if (hintsUsed <= level.twoStarThreshold) {
        currentStars = 2;
        nextMilestone = level.twoStarThreshold;
    } else if (hintsUsed <= level.oneStarThreshold) {
        currentStars = 1;
        nextMilestone = level.oneStarThreshold;
    }
    
    // Update stars display
    const starsDisplay = document.getElementById('current-stars-display');
    starsDisplay.textContent = '★'.repeat(currentStars) + '☆'.repeat(3 - currentStars);
    
    // Update countdown
    const countdown = document.getElementById('hints-countdown');
    const remaining = nextMilestone - hintsUsed;
    
    if (remaining > 0) {
        countdown.textContent = `${remaining} left`;
    } else if (currentStars > 0) {
        countdown.textContent = 'Max';
    } else {
        countdown.textContent = 'None';
    }
}

// Check win condition
function checkWin() {
    const correctWords = gameState.currentLevel.correctWords;
    return correctWords.every(word => gameState.selectedWords.has(word));
}

// Check lose condition
function checkLose() {
    return gameState.hearts <= 0;
}

// Show results screen
function showResults(isWin) {
    console.log('showResults called with isWin:', isWin);
    
    const title = document.getElementById('results-title');
    const starsDisplay = document.getElementById('stars-display');
    const hintsUsedText = document.getElementById('hints-used-text');
    const starMessage = document.getElementById('star-message');
    const nextLevelBtn = document.getElementById('next-level-btn');
    
    if (isWin) {
        const stars = calculateStars();
        
        title.textContent = 'Victory!';
        title.classList.remove('lose');
        starsDisplay.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        hintsUsedText.innerHTML = `Hints Used: <strong>${gameState.hintsUsed}</strong>`;
        
        // Star message
        if (stars === 3) {
            starMessage.textContent = 'Perfect! Amazing work!';
        } else if (stars === 2) {
            starMessage.textContent = 'Great job! Well done!';
        } else if (stars === 1) {
            starMessage.textContent = 'Good effort! Keep trying!';
        } else {
            starMessage.textContent = 'You won, but try using fewer hints!';
        }
        
        // Save progress (only if not in preview mode)
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === 'true';
        
        if (!isPreview) {
            saveLevelProgress(gameState.currentLevel.id, stars, gameState.hintsUsed);
        }
        
        // Show/hide next level button (hide in preview mode)
        if (isPreview) {
            nextLevelBtn.style.display = 'none';
        } else {
            const nextLevel = getLevel(gameState.currentLevel.id + 1);
            if (nextLevel) {
                nextLevelBtn.style.display = 'block';
            } else {
                nextLevelBtn.style.display = 'none';
            }
        }
    } else {
        title.textContent = 'Game Over';
        title.classList.add('lose');
        starsDisplay.textContent = '💔';
        hintsUsedText.innerHTML = `Hearts Lost: <strong>3</strong>`;
        starMessage.textContent = 'Better luck next time!';
        nextLevelBtn.style.display = 'none';
    }
    
    // Switch to results screen
    showScreen('results-screen');
}

// Calculate stars based on hints used
function calculateStars() {
    const level = gameState.currentLevel;
    const hintsUsed = gameState.hintsUsed;
    
    if (hintsUsed <= level.threeStarThreshold) {
        return 3;
    } else if (hintsUsed <= level.twoStarThreshold) {
        return 2;
    } else if (hintsUsed <= level.oneStarThreshold) {
        return 1;
    } else {
        return 0;
    }
}

// Next level
function nextLevel() {
    const nextLevelId = gameState.currentLevel.id + 1;
    const level = getLevel(nextLevelId);
    if (level) {
        startLevel(nextLevelId);
    } else {
        backToMenu();
    }
}

// Retry level
function retryLevel() {
    if (gameState.currentLevel) {
        startLevel(gameState.currentLevel.id);
    }
}

// Back to menu
function backToMenu() {
    // If we were in preview mode, go back to editor
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
        window.location.href = 'editor.html';
        return;
    }
    
    loadLevelButtons(); // Refresh level buttons with updated progress
    showScreen('menu-screen');
}

// Show editor
function showEditor() {
    window.location.href = 'editor.html';
}

// Carousel Navigation - Words
function nextWordsPage() {
    const totalPages = Math.ceil(gameState.allWords.length / gameState.wordsPerPage);
    if (gameState.wordsPage < totalPages) {
        document.getElementById(`words-page-${gameState.wordsPage}`).classList.remove('active');
        gameState.wordsPage++;
        document.getElementById(`words-page-${gameState.wordsPage}`).classList.add('active');
        updateWordsPageIndicator();
        updateWordsNavButtons();
    }
}

function prevWordsPage() {
    if (gameState.wordsPage > 1) {
        document.getElementById(`words-page-${gameState.wordsPage}`).classList.remove('active');
        gameState.wordsPage--;
        document.getElementById(`words-page-${gameState.wordsPage}`).classList.add('active');
        updateWordsPageIndicator();
        updateWordsNavButtons();
    }
}

function updateWordsPageIndicator() {
    const totalPages = Math.ceil(gameState.allWords.length / gameState.wordsPerPage);
    document.getElementById('words-page').textContent = `${gameState.wordsPage}/${totalPages}`;
}

function updateWordsNavButtons() {
    const totalPages = Math.ceil(gameState.allWords.length / gameState.wordsPerPage);
    document.getElementById('words-prev').disabled = gameState.wordsPage === 1;
    document.getElementById('words-next').disabled = gameState.wordsPage === totalPages;
}

// Carousel Navigation - Hints
function nextHintsPage() {
    const totalPages = Math.ceil(gameState.currentLevel.hints.length / gameState.hintsPerPage);
    if (gameState.hintsPage < totalPages) {
        document.getElementById(`hints-page-${gameState.hintsPage}`).classList.remove('active');
        gameState.hintsPage++;
        document.getElementById(`hints-page-${gameState.hintsPage}`).classList.add('active');
        updateHintsPageIndicator();
        updateHintsNavButtons();
    }
}

function prevHintsPage() {
    if (gameState.hintsPage > 1) {
        document.getElementById(`hints-page-${gameState.hintsPage}`).classList.remove('active');
        gameState.hintsPage--;
        document.getElementById(`hints-page-${gameState.hintsPage}`).classList.add('active');
        updateHintsPageIndicator();
        updateHintsNavButtons();
    }
}

function updateHintsPageIndicator() {
    const totalPages = Math.ceil(gameState.currentLevel.hints.length / gameState.hintsPerPage);
    document.getElementById('hints-page').textContent = `${gameState.hintsPage}/${totalPages}`;
}

function updateHintsNavButtons() {
    const totalPages = Math.ceil(gameState.currentLevel.hints.length / gameState.hintsPerPage);
    document.getElementById('hints-prev').disabled = gameState.hintsPage === 1;
    document.getElementById('hints-next').disabled = gameState.hintsPage === totalPages;
}

// Tutorial functions
function showTutorial() {
    document.getElementById('tutorial-popup').classList.add('active');
}

function closeTutorial() {
    document.getElementById('tutorial-popup').classList.remove('active');
    
    // Mark as seen if checkbox is checked
    const dontShow = document.getElementById('dont-show-tutorial');
    if (dontShow && dontShow.checked) {
        localStorage.setItem('wordguess_seen_tutorial', 'true');
    }
}

function toggleTutorial() {
    const dontShow = document.getElementById('dont-show-tutorial');
    if (dontShow && dontShow.checked) {
        localStorage.setItem('wordguess_seen_tutorial', 'true');
    } else {
        localStorage.removeItem('wordguess_seen_tutorial');
    }
}

// Import level functionality
function showImportLevel() {
    document.getElementById('import-modal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('import-modal').classList.remove('active');
    document.getElementById('import-json').value = '';
}

// Handle file input
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('import-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('import-json').value = event.target.result;
                };
                reader.readAsText(file);
            }
        });
    }
});

function importLevel() {
    const jsonText = document.getElementById('import-json').value.trim();
    
    if (!jsonText) {
        alert('Please paste JSON or choose a file');
        return;
    }
    
    try {
        const level = JSON.parse(jsonText);
        
        // Validate level structure
        if (!level.name || !level.correctWords || !level.wrongWords || !level.hints) {
            throw new Error('Invalid level structure');
        }
        
        // Add to temporary levels array
        level.id = 900 + Math.floor(Math.random() * 100); // Temporary ID
        LEVELS.push(level);
        
        closeImportModal();
        alert('Level imported successfully!');
        
        // Reload level buttons
        loadLevelButtons();
        
        // Optionally start the imported level
        setTimeout(() => {
            if (confirm('Start the imported level now?')) {
                startLevel(level.id);
            }
        }, 500);
        
    } catch (error) {
        alert('Error importing level: ' + error.message + '\n\nPlease check your JSON format.');
    }
}

// Utility: Shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
