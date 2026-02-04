# 🎮 Athena Game Prototypes

A collection of experimental game prototypes hosted on GitHub Pages. Simple, lightweight games built with Phaser 3 framework for quick prototyping and testing.

## 🌐 Live Demo

Once deployed, your site will be available at:
```
https://[your-username].github.io/PrototypeAthena/
```

## 📁 Project Structure

```
PrototypeAthena/
├── index.html              # Landing page with game list
├── style.css              # Global styles
├── games/                 # All game prototypes
│   ├── platformer/        # Simple platformer demo
│   │   ├── index.html
│   │   ├── game.js
│   │   └── assets/        # (optional) game assets
│   └── clicker/           # Bubble clicker demo
│       ├── index.html
│       ├── game.js
│       └── assets/        # (optional) game assets
└── README.md             # This file
```

## 🚀 Deployment to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top right and select **New repository**
3. Name your repository: `PrototypeAthena`
4. Make it **Public** (required for GitHub Pages)
5. Click **Create repository**

### Step 2: Push Code to GitHub

Open terminal/PowerShell in your project folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Add landing page and demo games"

# Add remote repository (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/PrototypeAthena.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down and click **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Select branch: **main** and folder: **/ (root)**
6. Click **Save**

Wait 1-2 minutes, then visit: `https://YOUR-USERNAME.github.io/PrototypeAthena/`

## 🎨 Current Games

### 1. Simple Platformer
- **Controls**: Arrow keys or A/D to move, Spacebar or W to jump
- **Objective**: Collect all 5 stars by navigating platforms
- **Features**: Physics-based movement, collectibles, victory condition

### 2. Bubble Clicker
- **Controls**: Click/Tap anywhere to create bubbles
- **Objective**: Create as many bubbles as possible
- **Features**: Combo system, colorful bubbles, particle effects

## ➕ How to Add a New Game

### Method 1: Copy Existing Game Template

1. **Copy a game folder**:
   ```bash
   cp -r games/clicker games/my-new-game
   ```

2. **Edit `games/my-new-game/game.js`**:
   - Modify the game logic
   - Change graphics, mechanics, etc.

3. **Update `games/my-new-game/index.html`**:
   - Change the title
   - Update control instructions
   - Adjust styling if needed

4. **Add to landing page** (`index.html`):
   ```html
   <div class="game-card">
       <div class="game-card-header">
           <h2>My New Game</h2>
           <span class="game-tag">Action</span>
       </div>
       <p class="game-description">
           Description of your game and how to play.
       </p>
       <div class="game-card-footer">
           <a href="games/my-new-game/" class="btn-play">Play Now</a>
       </div>
   </div>
   ```

5. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add new game: My New Game"
   git push
   ```

### Method 2: Create from Scratch

1. **Create new folder**:
   ```bash
   mkdir games/my-game
   cd games/my-game
   ```

2. **Create `index.html`** (copy structure from existing games)

3. **Create `game.js`** with basic Phaser config:
   ```javascript
   const config = {
       type: Phaser.AUTO,
       width: 800,
       height: 600,
       parent: 'game-canvas',
       backgroundColor: '#1a1f3a',
       physics: {
           default: 'arcade',
           arcade: {
               gravity: { y: 0 },
               debug: false
           }
       },
       scene: {
           create: create,
           update: update
       }
   };

   const game = new Phaser.Game(config);

   function create() {
       // Your game initialization
   }

   function update() {
       // Your game loop
   }
   ```

4. **Add to landing page** (step 4 from Method 1)

5. **Commit and push** (step 5 from Method 1)

## 🛠️ Tech Stack

- **Framework**: [Phaser 3](https://phaser.io/) - Fast, free, and fun HTML5 game framework
- **Hosting**: [GitHub Pages](https://pages.github.com/) - Free static site hosting
- **Languages**: HTML5, CSS3, JavaScript (ES6+)
- **CDN**: jsDelivr for Phaser 3 library

## 📝 Tips for Creating Prototypes

### Performance
- Keep games simple and focused on one mechanic
- Use Phaser's texture generation for simple shapes (no image files needed)
- Optimize physics by using only what you need

### Assets
- For prototypes, use Phaser's graphics API to draw shapes
- If you need images, keep them small and optimized
- Place assets in `games/[game-name]/assets/` folder

### Best Practices
- Each game should be self-contained in its own folder
- Use relative paths for all links and assets
- Test locally before pushing (open `index.html` in browser)
- Keep game canvas size at 800x600 for consistency

### Game Ideas to Prototype
- 🎯 Top-down shooter
- 🧩 Puzzle game
- 🏃 Endless runner
- 🎲 Match-3 game
- 🌌 Space shooter
- 🎪 Physics-based game
- 🎮 2D fighting game mechanics

## 🔧 Local Testing

Simply open `index.html` in your web browser. No build tools or server required!

For a local server (optional):
```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server
```

Then visit `http://localhost:8000`

## 📱 Mobile Support

All games are responsive and work on mobile devices. Phaser automatically handles touch input as clicks.

## 🤝 Contributing

This is a personal prototype collection, but feel free to fork and create your own version!

## 📄 License

Free to use for prototyping and learning. Phaser 3 is under MIT license.

## 🔗 Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [Phaser 3 Examples](https://phaser.io/examples)
- [GitHub Pages Guide](https://pages.github.com/)
- [Learn Phaser](https://phaser.io/learn)

---

Made with ❤️ using Phaser 3 | Hosted on GitHub Pages
