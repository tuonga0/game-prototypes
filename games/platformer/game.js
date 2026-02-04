// Phaser 3 Simple Platformer Game

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-canvas',
    backgroundColor: '#1a1f3a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
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

let player;
let platforms;
let cursors;
let keysWASD;
let score = 0;
let scoreText;
let stars;

function create() {
    // Create platforms group
    platforms = this.physics.add.staticGroup();

    // Ground
    createPlatform(this, 400, 580, 800, 40, 0x334155);

    // Platforms
    createPlatform(this, 600, 450, 200, 30, 0x475569);
    createPlatform(this, 200, 380, 200, 30, 0x475569);
    createPlatform(this, 500, 280, 200, 30, 0x475569);
    createPlatform(this, 100, 200, 200, 30, 0x475569);
    createPlatform(this, 650, 150, 200, 30, 0x475569);

    // Create player (simple square with gradient)
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x6366f1, 0x6366f1, 0x4f46e5, 0x4f46e5, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player', 32, 32);
    graphics.destroy();

    player = this.physics.add.sprite(100, 450, 'player');
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);

    // Create stars (collectibles)
    stars = this.physics.add.group();
    
    const starPositions = [
        { x: 200, y: 330 },
        { x: 500, y: 230 },
        { x: 650, y: 100 },
        { x: 600, y: 400 },
        { x: 100, y: 150 }
    ];

    starPositions.forEach(pos => {
        createStar(this, pos.x, pos.y);
    });

    // Score text
    scoreText = this.add.text(16, 16, 'Stars: 0/5', {
        fontSize: '24px',
        fill: '#22d3ee',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });

    // Victory text (hidden initially)
    this.victoryText = this.add.text(400, 300, 'Victory! 🎉', {
        fontSize: '48px',
        fill: '#22d3ee',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    this.victoryText.setOrigin(0.5);
    this.victoryText.setVisible(false);

    // Physics collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Input controls
    cursors = this.input.keyboard.createCursorKeys();
    keysWASD = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
}

function update() {
    // Player movement
    if (cursors.left.isDown || keysWASD.left.isDown) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown || keysWASD.right.isDown) {
        player.setVelocityX(200);
    } else {
        player.setVelocityX(0);
    }

    // Jump
    if ((cursors.up.isDown || cursors.space.isDown || keysWASD.up.isDown) && player.body.touching.down) {
        player.setVelocityY(-400);
    }
}

function createPlatform(scene, x, y, width, height, color) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, 5);
    graphics.generateTexture(`platform_${x}_${y}`, width, height);
    graphics.destroy();

    const platform = platforms.create(x, y, `platform_${x}_${y}`);
    platform.setScale(1).refreshBody();
}

function createStar(scene, x, y) {
    // Create a star shape
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xffd700, 1);
    
    // Simple star shape
    const points = [];
    const radius = 12;
    const innerRadius = 6;
    
    for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? radius : innerRadius;
        points.push({
            x: Math.cos(angle) * r + radius,
            y: Math.sin(angle) * r + radius
        });
    }
    
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    
    graphics.generateTexture('star', radius * 2, radius * 2);
    graphics.destroy();

    const star = stars.create(x, y, 'star');
    star.setBounceY(0.3);
}

function collectStar(player, star) {
    star.disableBody(true, true);
    
    score += 1;
    scoreText.setText('Stars: ' + score + '/5');

    // Victory condition
    if (score === 5) {
        this.victoryText.setVisible(true);
        this.physics.pause();
        
        // Restart after 3 seconds
        this.time.delayedCall(3000, () => {
            this.scene.restart();
            score = 0;
        });
    }
}
