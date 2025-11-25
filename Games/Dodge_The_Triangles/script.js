// Game elements
const gameContainer = document.getElementById('game-container');
const ball = document.getElementById('ball');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const menuButton = document.getElementById('menu-button');
const difficultyInput = document.getElementById('difficulty');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const highScoreDisplay = document.getElementById('high-score-display');
const gameOverHighScoreDisplay = document.getElementById('game-over-high-score');

// Game states
let gameState = 'start';
let enemies = [];
let animationFrameId;
let score = 0;
let highScores = {}; // Object to store high scores for each difficulty
let currentDifficulty = 3;
let frameCount = 0;

// Player position
let ballX = window.innerWidth / 2;
let ballY = window.innerHeight / 2;
let targetX = ballX;
let targetY = ballY;
const easingFactor = 0.1;

// Performance optimization
const MAX_ENEMIES = 100;
const enemyPool = [];
// The COLLISION_DISTANCE_SQ constant is no longer needed with the new collision logic
// const COLLISION_DISTANCE_SQ = 625; // 25^2 (pre-calculated)

// Initialize
window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});
window.addEventListener('mousedown', () => ball.classList.add('clicked'));
window.addEventListener('mouseup', () => ball.classList.remove('clicked'));
window.addEventListener('resize', handleResize);

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
menuButton.addEventListener('click', backToMenu);

// Load high scores
function loadHighScores() {
    const savedScores = localStorage.getItem('triangleDodgerHighScores');
    highScores = savedScores ? JSON.parse(savedScores) : {};
    updateHighScoreDisplay();
}

// Save high scores
function saveHighScores() {
    localStorage.setItem('triangleDodgerHighScores', JSON.stringify(highScores));
}

// Get high score for current difficulty
function getCurrentHighScore() {
    return highScores[currentDifficulty] || 0;
}

// Update high score display
function updateHighScoreDisplay() {
    highScoreDisplay.textContent = `High Score (Difficulty ${currentDifficulty}): ${getCurrentHighScore()}`;
}

// Handle window resize
function handleResize() {
    if (gameState === 'playing') {
        resetEnemies();
    }
}

// Return to menu
function backToMenu() {
    gameState = 'start';
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    currentDifficulty = parseInt(difficultyInput.value) || 3;
    updateHighScoreDisplay();
}

// Start new game
function startGame() {
    gameState = 'playing';
    score = 0;
    currentDifficulty = Math.min(10, Math.max(1, parseInt(difficultyInput.value) || 3));
    difficultyInput.value = currentDifficulty;

    scoreDisplay.textContent = `Score: 0`;
    scoreDisplay.classList.remove('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    resetEnemies();
    initializePlayer();
    initializeEnemyPool(); // Create the enemy pool at the start

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Reset enemies
function resetEnemies() {
    // Instead of removing, we just hide all active enemies and return them to the pool
    enemies.forEach(enemy => {
        enemy.element.style.display = 'none';
        enemyPool.push(enemy.element);
    });
    enemies = [];
}

// Initialize player position
function initializePlayer() {
    ballX = window.innerWidth / 2;
    ballY = window.innerHeight / 2;
    targetX = ballX;
    targetY = ballY;
}

// Create a pool of enemy elements at the start of the game
function initializeEnemyPool() {
    if (enemyPool.length > 0) return; // Pool already created
    for (let i = 0; i < MAX_ENEMIES; i++) {
        const enemyElement = document.createElement('div');
        enemyElement.style.display = 'none'; // Start hidden
        gameContainer.appendChild(enemyElement);
        enemyPool.push(enemyElement);
    }
}

// End game
function endGame() {
    gameState = 'gameOver';
    const finalScore = Math.floor(score);
    finalScoreDisplay.textContent = `Your Score: ${finalScore}`;
    gameOverHighScoreDisplay.classList.remove('new');

    // Check and update high score for current difficulty
    const currentHighScore = getCurrentHighScore();
    if (finalScore > currentHighScore) {
        highScores[currentDifficulty] = finalScore;
        saveHighScores();
        gameOverHighScoreDisplay.textContent = `New High Score: ${finalScore}!`;
        gameOverHighScoreDisplay.classList.add('new');
    } else {
        gameOverHighScoreDisplay.textContent = `High Score: ${currentHighScore}`;
    }

    updateHighScoreDisplay();
    scoreDisplay.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// Get enemy from pool or create new
function getEnemyElement() {
    // If the pool is empty, we don't spawn an enemy to prevent errors
    if (enemyPool.length === 0) return null;
    const element = enemyPool.pop();
    element.style.display = 'block'; // Make it visible
    return element;
}

// Return enemy to pool
function releaseEnemyElement(element) {
    // Instead of complex cleanup, just hide it and add it back to the pool
    element.style.display = 'none';
    enemyPool.push(element);
}

// Spawn new enemy
function spawnEnemy() {
    // We only spawn if there are available enemies in the pool.
    if (enemyPool.length === 0) return;

    const element = getEnemyElement();
    if (!element) return; // Extra safety check

    const type = Math.random() < 0.3 ? 'big' : 'small';
    const speedModifier = 1 + ((currentDifficulty + 2) - 1) * 0.1;
    
    const enemy = {
        element: element,
        type,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        targetRotation: 0,
        turnSpeed: 0,
        size: 0,
        speed: 0,
        followRadius: 0
    };

    enemy.element.className = ''; // Reset classes
    enemy.element.classList.add('enemy', type);

    if (type === 'big') {
        enemy.size = 60;
        enemy.speed = (Math.random() * 1.5 + 0.5) * speedModifier;
        enemy.followRadius = 180;
        enemy.turnSpeed = 1.5;
    } else {
        enemy.size = 20;
        enemy.speed = (Math.random() * 1.5 + 1) * speedModifier;
        enemy.followRadius = 280;
        enemy.turnSpeed = 3.5;
    }
    
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
        enemy.x = Math.random() * window.innerWidth;
        enemy.y = -enemy.size;
    } else if (side === 1) {
        enemy.x = window.innerWidth + enemy.size;
        enemy.y = Math.random() * window.innerHeight;
    } else if (side === 2) {
        enemy.x = Math.random() * window.innerWidth;
        enemy.y = window.innerHeight + enemy.size;
    } else {
        enemy.x = -enemy.size;
        enemy.y = Math.random() * window.innerHeight;
    }
    
    const initialAngleRad = Math.atan2(
        window.innerHeight / 2 - enemy.y, 
        window.innerWidth / 2 - enemy.x
    );
    enemy.rotation = initialAngleRad * (180 / Math.PI) + 90;
    
    enemies.push(enemy);
    // We don't need to appendChild here anymore as it's already in the DOM
}

// Update player position
function updatePlayer() {
    const dx = targetX - ballX;
    const dy = targetY - ballY;
    ballX += dx * easingFactor;
    ballY += dy * easingFactor;
    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;
}

// Update all enemies
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Calculate distance to player
        const dx = ballX - enemy.x;
        const dy = ballY - enemy.y;
        const distSq = dx * dx + dy * dy;
        
        // Follow player if within range
        if (distSq < enemy.followRadius * enemy.followRadius) {
            const angleRad = Math.atan2(dy, dx);
            enemy.targetRotation = angleRad * (180 / Math.PI) + 90;
            
            let angleDiff = enemy.targetRotation - enemy.rotation;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            
            if (Math.abs(angleDiff) < enemy.turnSpeed) {
                enemy.rotation = enemy.targetRotation;
            } else {
                enemy.rotation += Math.sign(angleDiff) * enemy.turnSpeed;
            }
        }
        
        // Move enemy
        const currentAngleRad = (enemy.rotation - 90) * (Math.PI / 180);
        enemy.vx = Math.cos(currentAngleRad) * enemy.speed;
        enemy.vy = Math.sin(currentAngleRad) * enemy.speed;
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Update position and rotation
        enemy.element.style.transform = `translate(${enemy.x}px, ${enemy.y}px) rotate(${enemy.rotation}deg)`;

        // Remove if off-screen
        if (enemy.x < -enemy.size * 2 || 
            enemy.x > window.innerWidth + enemy.size * 2 ||
            enemy.y < -enemy.size * 2 || 
            enemy.y > window.innerHeight + enemy.size * 2) {
            
            releaseEnemyElement(enemy.element); // Return to the pool instead of removing
            enemies.splice(i, 1);
        }
    }
}

// Check for collisions
function checkCollisions() {
    for (const enemy of enemies) {
        const dx = ballX - enemy.x;
        const dy = ballY - enemy.y;
        const distanceSq = dx * dx + dy * dy;
        
        const enemyRadius = enemy.size * 0.5;
        const collisionDistanceSq = (15 + enemyRadius) * (15 + enemyRadius); // Simplified and more accurate collision
        
        if (distanceSq < collisionDistanceSq) {
            endGame();
            return;
        }
    }
}

// Main game loop
function gameLoop() {    
    if (gameState !== 'playing') {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    score += 1/6;
    scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
    frameCount++;
    
    const spawnInterval = Math.max(15, 70 - (currentDifficulty + 2) * 5);
    if (frameCount % spawnInterval === 0) {
        spawnEnemy();
    }

    updatePlayer();
    updateEnemies();
    checkCollisions();
    
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
}

// Update high score display when difficulty changes
difficultyInput.addEventListener('change', () => {
    currentDifficulty = Math.min(10, Math.max(1, parseInt(difficultyInput.value) || 3));
    updateHighScoreDisplay();
});

// Initial load
loadHighScores();
