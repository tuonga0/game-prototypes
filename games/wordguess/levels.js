// Level data for Word Guess Game
const LEVELS = [
      {      id: 1,
        name: "Level Demo",
        correctWords: ["Father", "Yacht", "Brother", "Shark"],
        wrongWords: ["Mother", "Goldfish", "Car"],
        hints: [
            {
                text: "Family",
                correctCount: 2,
                wrongCount: 1
            },
            {
                text: "Animal",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Sibling",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Predator",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Parent",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Vehicle",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Male",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Female",
                correctCount: 0,
                wrongCount: 1
            },
            {
                text: "Fish",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Ocean",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Pet",
                correctCount: 0,
                wrongCount: 1
            }
        ],
        threeStarThreshold: 5,
        twoStarThreshold: 7,
        oneStarThreshold: 6
    },{
        id: 2,
        name: "Level 1",
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
        threeStarThreshold: 2,
        twoStarThreshold: 5,
        oneStarThreshold: 6
    },
    {
        id: 3,
        name: "Level 2",
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
                text: "Grows on Tree",
                correctCount: 3,
                wrongCount: 0
            },
            {
                text: "Furniture",
                correctCount: 0,
                wrongCount: 1
            }
        ],
        threeStarThreshold: 2,
        twoStarThreshold: 5,
        oneStarThreshold: 7
    },
    {
        id: 4,
        name: "Level 3",
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
        threeStarThreshold: 2,
        twoStarThreshold: 5,
        oneStarThreshold: 7
    },
    {
        id: 5,
        name: "Level Super Hard",
        correctWords: ["Plane", "Key", "Fingerprint", "Virus", "Cheese","Season","Jump","Fatigue"],
        wrongWords: ["Car", "Password", "Fortune", "Bird", "Account", "Tomato","Period","Tide","Comma","Dash","Bacteria","Beach"],
        hints: [
            {
                text: "Cycle",
                correctCount: 1,
                wrongCount: 2
            },
            {
                text: "Security",
                correctCount: 3,
                wrongCount: 2
            },
            {
                text: "Sickness",
                correctCount: 2,
                wrongCount: 1
            },
            {
                text: "Login",
                correctCount: 0,
                wrongCount: 2
            },
            {
                text: "Summer",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Spread",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Flying",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Computer",
                correctCount: 2,
                wrongCount: 2
            },
            {
                text: "Vehicle",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Food",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Punctuation",
                correctCount: 0,
                wrongCount: 3
            },
            {
                text: "Action",
                correctCount: 1,
                wrongCount: 1
            },
            {
                text: "Wheel",
                correctCount: 1,
                wrongCount: 2
            },
            {
                text: "Parachute",
                correctCount: 2,
                wrongCount: 0
            },
            {
                text: "Milk",
                correctCount: 1,
                wrongCount: 0
            },
            {
                text: "Animal",
                correctCount: 0,
                wrongCount: 1
            },
            {
                text: "Fate",
                correctCount: 0,
                wrongCount: 1
            },
            {
                text: "Ocean",
                correctCount: 0,
                wrongCount: 2
            }
        ],
        threeStarThreshold: 12,
        twoStarThreshold: 15,
        oneStarThreshold: 17
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
