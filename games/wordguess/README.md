# Word Guess Game

A mobile-friendly word guessing game where players use hints to identify correct words while avoiding wrong ones.

## How to Play

### Objective
Find all the correct words using hints, while avoiding wrong words. You have 3 hearts - lose all hearts and it's game over!

### Game Modes

**Select Correct Mode (Green)**: 
- Tap words you think are correct
- Correct selections turn green
- Wrong selections cost 1 heart ❤️

**Mark Wrong Mode (Red)**:
- Mark words you think are wrong (they turn red)
- Marked words can't be selected in Select mode
- Tap again to unmark
- Doesn't cost hearts

### Hints System
- Tap hint buttons to reveal correct/wrong word counts directly on the button
- Example: "Animal" button shows "✓2 ✗1" when tapped
- Numbers stay visible after tapping for easy reference
- Each unique hint used counts toward your star rating
- Real-time star tracker shows current rating and hints remaining for each tier
- Use hints strategically for better stars!

### Star Ratings
- ⭐⭐⭐ (3 Stars): Use minimal hints
- ⭐⭐ (2 Stars): Use moderate hints
- ⭐ (1 Star): Use many hints
- Thresholds vary by level difficulty

## Level Editor

Create your own custom levels!

### Creating a Level

1. **Add Words**
   - Enter correct words (the ones players need to find)
   - Enter wrong words (the ones players should avoid)

2. **Create Hints**
   - Write a hint text (e.g., "Animal", "Red", "Food")
   - Select which words match this hint
   - The system calculates correct/wrong counts automatically

3. **Set Star Thresholds**
   - Define maximum hints for 3★, 2★, and 1★ ratings
   - Lower numbers = harder to get stars

4. **Export & Share**
   - Export as JSON file
   - Preview your level before exporting
   - Share the JSON file with others

### Loading Custom Levels

Custom levels can be added by:
1. Editing `data/levels.json` to include your level
2. Assigning it a unique ID
3. Refreshing the game

## Game Features

- ✅ Mobile-optimized interface
- ✅ Dual mode system (Select/Mark)
- ✅ Progressive difficulty (3 built-in levels)
- ✅ Star rating system with real-time tracker
- ✅ Inline hint display (no popups)
- ✅ Level progress tracking (localStorage)
- ✅ Level editor with preview
- ✅ Touch-friendly controls (44px+ targets)

## Technical Details

### File Structure
```
wordguess/
├── index.html          # Main game interface
├── editor.html         # Level editor
├── game.js            # Core game logic
├── editor.js          # Editor logic
├── levels.js          # Level data management
├── styles.css         # All styling
└── data/
    └── levels.json    # Level definitions
```

### Technologies Used
- Pure HTML5/CSS3/JavaScript (Vanilla JS)
- localStorage for progress tracking
- CSS Grid and Flexbox for responsive layout
- Mobile-first design approach

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Requires localStorage support

## Deployment on GitHub Pages

1. Push the `demo/wordguess/` folder to your repository
2. Enable GitHub Pages in repository settings
3. Access at: `https://[username].github.io/[repo]/demo/wordguess/`
4. Levels persist in browser localStorage

## Credits

Part of Athena Prototypes collection - demonstrating mobile game concepts and mechanics.

## License

Free to use and modify for educational and prototyping purposes.
