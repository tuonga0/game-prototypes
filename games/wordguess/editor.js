// Level Editor State
let editorState = {
    correctWords: [],
    wrongWords: [],
    hints: []
};

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    // Add enter key handlers for word inputs
    document.getElementById('correct-word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCorrectWord();
        }
    });
    
    document.getElementById('wrong-word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addWrongWord();
        }
    });
    
    document.getElementById('hint-text-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addHint();
        }
    });

    // Update hint word selection when words change
    updateHintWordSelection();
});

// Add correct word
function addCorrectWord() {
    const input = document.getElementById('correct-word-input');
    const word = input.value.trim();
    
    if (!word) {
        alert('Please enter a word');
        return;
    }
    
    if (editorState.correctWords.includes(word) || editorState.wrongWords.includes(word)) {
        alert('This word already exists');
        return;
    }
    
    editorState.correctWords.push(word);
    input.value = '';
    
    renderWordList('correct-words-list', editorState.correctWords, 'correct');
    updateHintWordSelection();
}

// Add wrong word
function addWrongWord() {
    const input = document.getElementById('wrong-word-input');
    const word = input.value.trim();
    
    if (!word) {
        alert('Please enter a word');
        return;
    }
    
    if (editorState.correctWords.includes(word) || editorState.wrongWords.includes(word)) {
        alert('This word already exists');
        return;
    }
    
    editorState.wrongWords.push(word);
    input.value = '';
    
    renderWordList('wrong-words-list', editorState.wrongWords, 'wrong');
    updateHintWordSelection();
}

// Remove word
function removeWord(word, type) {
    if (type === 'correct') {
        editorState.correctWords = editorState.correctWords.filter(w => w !== word);
        renderWordList('correct-words-list', editorState.correctWords, 'correct');
    } else {
        editorState.wrongWords = editorState.wrongWords.filter(w => w !== word);
        renderWordList('wrong-words-list', editorState.wrongWords, 'wrong');
    }
    
    // Update hints that reference this word
    editorState.hints = editorState.hints.filter(hint => {
        hint.matchingWords = hint.matchingWords.filter(w => w !== word);
        return hint.matchingWords.length > 0;
    });
    
    renderHintsList();
    updateHintWordSelection();
}

// Render word list
function renderWordList(containerId, words, type) {
    const container = document.getElementById(containerId);
    
    if (words.length === 0) {
        container.innerHTML = '<div class="empty-state">No ' + type + ' words yet</div>';
        return;
    }
    
    container.innerHTML = words.map(word => `
        <div class="word-tag ${type}">
            ${word}
            <button onclick="removeWord('${word}', '${type}')">×</button>
        </div>
    `).join('');
}

// Update hint word selection checkboxes
function updateHintWordSelection() {
    const allWords = [...editorState.correctWords, ...editorState.wrongWords];
    const container = document.getElementById('hint-checkboxes');
    const selectionDiv = document.getElementById('hint-word-selection');
    
    if (allWords.length === 0) {
        selectionDiv.style.display = 'none';
        return;
    }
    
    selectionDiv.style.display = 'block';
    
    container.innerHTML = allWords.map(word => {
        const isCorrect = editorState.correctWords.includes(word);
        const className = isCorrect ? 'correct' : 'wrong';
        return `
            <label class="checkbox-label">
                <input type="checkbox" value="${word}" data-type="${className}">
                <span>${word}</span>
            </label>
        `;
    }).join('');
}

// Add hint
function addHint() {
    const hintText = document.getElementById('hint-text-input').value.trim();
    
    if (!hintText) {
        alert('Please enter hint text');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#hint-checkboxes input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one word that matches this hint');
        return;
    }
    
    const matchingWords = Array.from(checkboxes).map(cb => cb.value);
    
    // Calculate correct and wrong counts
    const correctCount = matchingWords.filter(w => editorState.correctWords.includes(w)).length;
    const wrongCount = matchingWords.filter(w => editorState.wrongWords.includes(w)).length;
    
    editorState.hints.push({
        text: hintText,
        matchingWords: matchingWords,
        correctCount: correctCount,
        wrongCount: wrongCount
    });
    
    // Clear inputs
    document.getElementById('hint-text-input').value = '';
    document.querySelectorAll('#hint-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    renderHintsList();
}

// Remove hint
function removeHint(index) {
    editorState.hints.splice(index, 1);
    renderHintsList();
}

// Render hints list
function renderHintsList() {
    const container = document.getElementById('hints-list');
    
    if (editorState.hints.length === 0) {
        container.innerHTML = '<div class="empty-state">No hints yet. Add words first, then create hints.</div>';
        return;
    }
    
    container.innerHTML = editorState.hints.map((hint, index) => `
        <div class="hint-item">
            <div class="hint-header">
                <span class="hint-title">${hint.text}</span>
                <button class="btn btn-small" onclick="removeHint(${index})" style="background: #F44336; min-height: 32px; padding: 0.25rem 0.75rem;">Remove</button>
            </div>
            <div class="hint-stats">
                <span class="correct">✓ ${hint.correctCount} correct</span> | 
                <span class="wrong">✗ ${hint.wrongCount} wrong</span>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                Matches: ${hint.matchingWords.join(', ')}
            </div>
        </div>
    `).join('');
}

// Export level to JSON
function exportLevel() {
    const levelName = document.getElementById('level-name').value.trim();
    
    if (!levelName) {
        alert('Please enter a level name');
        return;
    }
    
    if (editorState.correctWords.length === 0) {
        alert('Please add at least one correct word');
        return;
    }
    
    if (editorState.wrongWords.length === 0) {
        alert('Please add at least one wrong word');
        return;
    }
    
    if (editorState.hints.length === 0) {
        alert('Please add at least one hint');
        return;
    }
    
    const level = {
        id: Date.now(), // Temporary ID
        name: levelName,
        correctWords: editorState.correctWords,
        wrongWords: editorState.wrongWords,
        hints: editorState.hints.map(hint => ({
            text: hint.text,
            correctCount: hint.correctCount,
            wrongCount: hint.wrongCount
        })),
        threeStarThreshold: parseInt(document.getElementById('three-star').value),
        twoStarThreshold: parseInt(document.getElementById('two-star').value),
        oneStarThreshold: parseInt(document.getElementById('one-star').value)
    };
    
    // Create download
    const dataStr = JSON.stringify(level, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `level_${levelName.replace(/\s+/g, '_').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Level exported successfully! You can use this JSON file to add the level to the game.');
}

// Preview level
function previewLevel() {
    const levelName = document.getElementById('level-name').value.trim();
    
    if (!levelName) {
        alert('Please enter a level name');
        return;
    }
    
    if (editorState.correctWords.length === 0 || editorState.wrongWords.length === 0) {
        alert('Please add both correct and wrong words');
        return;
    }
    
    if (editorState.hints.length === 0) {
        alert('Please add at least one hint');
        return;
    }
    
    const level = {
        id: 999, // Preview ID
        name: levelName,
        correctWords: editorState.correctWords,
        wrongWords: editorState.wrongWords,
        hints: editorState.hints.map(hint => ({
            text: hint.text,
            correctCount: hint.correctCount,
            wrongCount: hint.wrongCount
        })),
        threeStarThreshold: parseInt(document.getElementById('three-star').value),
        twoStarThreshold: parseInt(document.getElementById('two-star').value),
        oneStarThreshold: parseInt(document.getElementById('one-star').value)
    };
    
    // Store preview level in localStorage
    localStorage.setItem('wordguess_preview_level', JSON.stringify(level));
    
    // Open game with preview level
    window.location.href = 'index.html?preview=true';
}

// Clear editor
function clearEditor() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        return;
    }
    
    editorState = {
        correctWords: [],
        wrongWords: [],
        hints: []
    };
    
    document.getElementById('level-name').value = '';
    document.getElementById('three-star').value = '5';
    document.getElementById('two-star').value = '8';
    document.getElementById('one-star').value = '12';
    
    renderWordList('correct-words-list', [], 'correct');
    renderWordList('wrong-words-list', [], 'wrong');
    renderHintsList();
    updateHintWordSelection();
}
