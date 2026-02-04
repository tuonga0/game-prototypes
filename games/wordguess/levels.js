// Level data for Word Guess Game
const LEVELS = [
    {
        id: 1,
        name: "Animals & Birds",
        correctWords: ["Salmon", "Dog", "Eagle", "Cat"],
        wrongWords: ["Parrot", "Rose", "Car"],
        hints: [
            {
                text: "Animal",
                correctCount: 4,
                wrongCount: 1
            },
            {
                text: "Bird",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Mammal",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Pet",
                correctCount: 2,
                wrongCount: 1
            },
            {
                text: "Fish",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Predator",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Aquatic",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Flies",
                correctCount: 1,
                wrongCount: 1
            }
        ],
        threeStarThreshold: 5,
        twoStarThreshold: 8,
        oneStarThreshold: 12
    },
    {
        id: 2,
        name: "Food & Fruits",
        correctWords: ["Apple", "Carrot", "Banana", "Broccoli", "Orange"],
        wrongWords: ["Table", "Phone", "Book", "Shirt"],
        hints: [
            {
                text: "Food",
                correctCount: 5,
                wrongCount: 0
            },
            {
                text: "Fruit",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Vegetable",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Sweet",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Orange Color",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Green",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Object",
                correctCount: 0,
                wrongCount: 4
            },
            {
                text: "Grows on Tree",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Round",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Furniture",
                correctCount: 0,
                wrongCount: 1
            }
        ],
        threeStarThreshold: 6,
        twoStarThreshold: 10,
        oneStarThreshold: 15
    },
    {
        id: 3,
        name: "Colors & Objects",
        correctWords: ["Ruby", "Strawberry", "Rose", "Cherry", "Blood", "Tomato"],
        wrongWords: ["Sky", "Grass", "Lemon", "Ocean", "Banana"],
        hints: [
            {
                text: "Red",
                correctCount: 6,
                wrongCount: 0
            },
            {
                text: "Color",
                correctCount: 6,
                wrongCount: 5
            },
            {
                text: "Food",
                correctCount: 3,
                wrongCount: 2
            },
            {
                text: "Fruit",
                correctCount: 3,
                wrongCount: 2
            },
            {
                text: "Blue",
                correctCount: 0,
                wrongCount: 2
            },
            {
                text: "Yellow",
                correctCount: 0,
                wrongCount: 2
            },
            {
                text: "Green",
                correctCount: 0,
                wrongCount: 1
            },
            {
                text: "Gemstone",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Flower",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Round",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Nature",
                correctCount: 4,
                wrongCount: 4
            },
            {
                text: "Sweet",
                correctCount: 3,
                wrongCount: 2
            }
        ],
        threeStarThreshold: 7,
        twoStarThreshold: 12,
        oneStarThreshold: 18
    }
];

// Get level by ID
function getLevel(id) {
    return LEVELS.find(level => level.id === id);
}

// Get all levels
function getAllLevels() {
    return LEVELS;
}

// Load level progress from localStorage
function getLevelProgress(levelId) {
    const progress = localStorage.getItem(`wordguess_level_${levelId}`);
    return progress ? JSON.parse(progress) : { completed: false, stars: 0, bestHints: null };
}

// Save level progress
function saveLevelProgress(levelId, stars, hintsUsed) {
    const current = getLevelProgress(levelId);
    const newProgress = {
        completed: true,
        stars: Math.max(current.stars || 0, stars),
        bestHints: current.bestHints === null ? hintsUsed : Math.min(current.bestHints, hintsUsed)
    };
    localStorage.setItem(`wordguess_level_${levelId}`, JSON.stringify(newProgress));
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LEVELS, getLevel, getAllLevels, getLevelProgress, saveLevelProgress };
}
