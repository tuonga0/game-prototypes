// Phaser 3 Bubble Clicker Game

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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let bubbles;
let score = 0;
let scoreText;
let highScore = 0;
let highScoreText;
let comboText;
let combo = 0;
let comboTimer;

// Color palette for bubbles
const colors = [
    0xff6b6b, // Red
    0x4ecdc4, // Cyan
    0xffe66d, // Yellow
    0x95e1d3, // Mint
    0xf38181, // Pink
    0xa8e6cf, // Light green
    0xff8b94, // Coral
    0xc7ceea  // Lavender
];

function create() {
    // Bubbles group
    bubbles = this.physics.add.group();

    // Score display
    scoreText = this.add.text(20, 20, 'Score: 0', {
        fontSize: '28px',
        fill: '#22d3ee',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });

    highScoreText = this.add.text(20, 55, 'High Score: 0', {
        fontSize: '20px',
        fill: '#cbd5e1',
        fontFamily: 'Arial'
    });

    // Combo text (hidden initially)
    comboText = this.add.text(400, 100, '', {
        fontSize: '36px',
        fill: '#ffd700',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    comboText.setOrigin(0.5);
    comboText.setAlpha(0);

    // Instructions
    const instructions = this.add.text(400, 300, 'Click anywhere to create bubbles!', {
        fontSize: '24px',
        fill: '#64748b',
        fontFamily: 'Arial'
    });
    instructions.setOrigin(0.5);

    // Fade out instructions after 3 seconds
    this.tweens.add({
        targets: instructions,
        alpha: 0,
        duration: 1000,
        delay: 3000,
        onComplete: () => instructions.destroy()
    });

    // Click/tap to create bubbles
    this.input.on('pointerdown', (pointer) => {
        createBubble(this, pointer.x, pointer.y);
        
        // Increase combo
        combo++;
        updateCombo(this);
        
        // Reset combo timer
        if (comboTimer) {
            comboTimer.remove();
        }
        comboTimer = this.time.delayedCall(1000, () => {
            combo = 0;
            this.tweens.add({
                targets: comboText,
                alpha: 0,
                duration: 300
            });
        });
    });
}

function update() {
    // Bubble interactions
    bubbles.children.entries.forEach(bubble => {
        // Add floating animation
        if (!bubble.getData('isPopping')) {
            bubble.y += Math.sin(bubble.getData('floatPhase')) * 0.5;
            bubble.setData('floatPhase', bubble.getData('floatPhase') + 0.05);
        }
    });
}

function createBubble(scene, x, y) {
    // Random color
    const color = Phaser.Utils.Array.GetRandom(colors);
    
    // Random size
    const size = Phaser.Math.Between(30, 60);
    
    // Create bubble graphics
    const graphics = scene.add.graphics();
    
    // Gradient effect
    graphics.fillStyle(color, 0.8);
    graphics.fillCircle(size/2, size/2, size/2);
    
    // Shine effect
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(size/2 - size/6, size/2 - size/6, size/4);
    
    // Generate texture with unique key
    const textureKey = `bubble_${Date.now()}_${Math.random()}`;
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();
    
    // Create bubble sprite
    const bubble = bubbles.create(x, y, textureKey);
    bubble.setScale(0);
    bubble.setData('floatPhase', Math.random() * Math.PI * 2);
    bubble.setData('isPopping', false);
    
    // Pop animation
    scene.tweens.add({
        targets: bubble,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut'
    });
    
    // Random velocity for some movement
    const angle = Phaser.Math.Between(0, 360);
    const speed = Phaser.Math.Between(20, 50);
    scene.physics.velocityFromAngle(angle, speed, bubble.body.velocity);
    
    // Fade and destroy after a few seconds
    const lifetime = Phaser.Math.Between(2000, 4000);
    scene.time.delayedCall(lifetime, () => {
        popBubble(scene, bubble);
    });
    
    // Increase score
    score += combo > 0 ? combo : 1;
    scoreText.setText('Score: ' + score);
    
    if (score > highScore) {
        highScore = score;
        highScoreText.setText('High Score: ' + highScore);
    }
}

function popBubble(scene, bubble) {
    if (!bubble.active || bubble.getData('isPopping')) return;
    
    bubble.setData('isPopping', true);
    
    // Pop animation
    scene.tweens.add({
        targets: bubble,
        scale: 1.3,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
            bubble.destroy();
        }
    });
    
    // Create pop particles
    createPopParticles(scene, bubble.x, bubble.y, bubble.tint || 0x22d3ee);
}

function createPopParticles(scene, x, y, color) {
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 30;
        
        const graphics = scene.add.graphics();
        graphics.fillStyle(color, 1);
        graphics.fillCircle(5, 5, 5);
        graphics.generateTexture(`particle_${Date.now()}_${i}`, 10, 10);
        graphics.destroy();
        
        const particle = scene.add.image(x, y, `particle_${Date.now()}_${i}`);
        
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            alpha: 0,
            scale: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => particle.destroy()
        });
    }
}

function updateCombo(scene) {
    if (combo > 1) {
        comboText.setText(`Combo x${combo}!`);
        comboText.setAlpha(1);
        
        // Scale pulse effect
        scene.tweens.add({
            targets: comboText,
            scale: 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
    }
}
