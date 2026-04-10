// ---------- DOM Elements ----------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
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

// ---------- Game State ----------
let gameState = 'start';
let enemies = [];
let animationFrameId = null;
let score = 0;
let highScores = {};
let currentDifficulty = 3;
let frameCount = 0;

// Player
let ballX = window.innerWidth / 2;
let ballY = window.innerHeight / 2;
let targetX = ballX;
let targetY = ballY;
const BALL_RADIUS = 15;
const EASING = 0.1;

// Click effect
let isMouseDown = false;

// Canvas dimensions
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// ---------- Canvas Resize ----------
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    if (gameState === 'playing') {
        ballX = Math.min(canvasWidth - BALL_RADIUS, Math.max(BALL_RADIUS, ballX));
        ballY = Math.min(canvasHeight - BALL_RADIUS, Math.max(BALL_RADIUS, ballY));
        targetX = ballX;
        targetY = ballY;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- Mouse Tracking ----------
window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});
window.addEventListener('mousedown', () => isMouseDown = true);
window.addEventListener('mouseup', () => isMouseDown = false);

// ---------- High Scores (unchanged) ----------
function loadHighScores() {
    const saved = localStorage.getItem('triangleDodgerHighScores');
    highScores = saved ? JSON.parse(saved) : {};
    updateHighScoreDisplay();
}
function saveHighScores() {
    localStorage.setItem('triangleDodgerHighScores', JSON.stringify(highScores));
}
function getCurrentHighScore() {
    return highScores[currentDifficulty] || 0;
}
function updateHighScoreDisplay() {
    highScoreDisplay.textContent = `High Score (Difficulty ${currentDifficulty}): ${getCurrentHighScore()}`;
}

// ---------- Game Flow ----------
function startGame() {
    gameState = 'playing';
    score = 0;
    currentDifficulty = Math.min(10, Math.max(1, parseInt(difficultyInput.value) || 3));
    difficultyInput.value = currentDifficulty;
    
    scoreDisplay.textContent = 'Score: 0';
    scoreDisplay.classList.remove('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    resetEnemies();
    initializePlayer();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function backToMenu() {
    gameState = 'start';
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    currentDifficulty = parseInt(difficultyInput.value) || 3;
    updateHighScoreDisplay();
}

function endGame() {
    gameState = 'gameOver';
    const finalScore = Math.floor(score);
    finalScoreDisplay.textContent = `Your Score: ${finalScore}`;
    gameOverHighScoreDisplay.classList.remove('new');
    
    const currentHigh = getCurrentHighScore();
    if (finalScore > currentHigh) {
        highScores[currentDifficulty] = finalScore;
        saveHighScores();
        gameOverHighScoreDisplay.textContent = `New High Score: ${finalScore}!`;
        gameOverHighScoreDisplay.classList.add('new');
    } else {
        gameOverHighScoreDisplay.textContent = `High Score: ${currentHigh}`;
    }
    
    updateHighScoreDisplay();
    scoreDisplay.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function initializePlayer() {
    ballX = canvasWidth / 2;
    ballY = canvasHeight / 2;
    targetX = ballX;
    targetY = ballY;
}

function resetEnemies() {
    enemies = [];
}

// ---------- Enemy Spawning ----------
function spawnEnemy() {
    const type = Math.random() < 0.3 ? 'big' : 'small';
    const speedModifier = 1 + (currentDifficulty + 2 - 1) * 0.1;
    
    let size, speed, followRadius, turnSpeed;
    if (type === 'big') {
        size = 60;
        speed = (Math.random() * 1.5 + 0.5) * speedModifier;
        followRadius = 180;
        turnSpeed = 1.5;
    } else {
        size = 20;
        speed = (Math.random() * 1.5 + 1) * speedModifier;
        followRadius = 280;
        turnSpeed = 3.5;
    }
    
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const padding = size;
    if (side === 0) {
        x = Math.random() * canvasWidth;
        y = -padding;
    } else if (side === 1) {
        x = canvasWidth + padding;
        y = Math.random() * canvasHeight;
    } else if (side === 2) {
        x = Math.random() * canvasWidth;
        y = canvasHeight + padding;
    } else {
        x = -padding;
        y = Math.random() * canvasHeight;
    }
    
    const initialAngleRad = Math.atan2(canvasHeight/2 - y, canvasWidth/2 - x);
    const rotation = initialAngleRad * (180 / Math.PI) + 90;
    
    enemies.push({
        type,
        x, y,
        vx: 0, vy: 0,
        rotation,
        targetRotation: rotation,
        turnSpeed,
        size,
        speed,
        followRadius,
        collisionRadius: size * 0.6
    });
}

// ---------- Update Logic ----------
function updatePlayer() {
    const dx = targetX - ballX;
    const dy = targetY - ballY;
    ballX += dx * EASING;
    ballY += dy * EASING;
    
    ballX = Math.min(canvasWidth - BALL_RADIUS, Math.max(BALL_RADIUS, ballX));
    ballY = Math.min(canvasHeight - BALL_RADIUS, Math.max(BALL_RADIUS, ballY));
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        
        const dx = ballX - e.x;
        const dy = ballY - e.y;
        const distSq = dx*dx + dy*dy;
        
        if (distSq < e.followRadius * e.followRadius) {
            const angleRad = Math.atan2(dy, dx);
            e.targetRotation = angleRad * (180 / Math.PI) + 90;
            
            let angleDiff = e.targetRotation - e.rotation;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            
            if (Math.abs(angleDiff) < e.turnSpeed) {
                e.rotation = e.targetRotation;
            } else {
                e.rotation += Math.sign(angleDiff) * e.turnSpeed;
            }
        }
        
        const angleRad = (e.rotation - 90) * (Math.PI / 180);
        e.vx = Math.cos(angleRad) * e.speed;
        e.vy = Math.sin(angleRad) * e.speed;
        e.x += e.vx;
        e.y += e.vy;
        
<<<<<<< Updated upstream
        // Update position and rotation
        enemy.element.style.transform = `translate(${enemy.x}px, ${enemy.y}px) translate(-50%, -50%) rotate(${enemy.rotation}deg)`;
        
        // Remove if off-screen
        if (enemy.x < -enemy.size * 2 || 
            enemy.x > window.innerWidth + enemy.size * 2 ||
            enemy.y < -enemy.size * 2 || 
            enemy.y > window.innerHeight + enemy.size * 2) {
            
            releaseEnemyElement(enemy.element); // Return to the pool instead of removing
=======
        const margin = e.size * 2;
        if (e.x < -margin || e.x > canvasWidth + margin || 
            e.y < -margin || e.y > canvasHeight + margin) {
>>>>>>> Stashed changes
            enemies.splice(i, 1);
        }
    }
}

function checkCollisions() {
    for (const e of enemies) {
        const dx = ballX - e.x;
        const dy = ballY - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < BALL_RADIUS + e.collisionRadius) {
            endGame();
            return true;
        }
    }
    return false;
}

// ---------- Rendering (Exact CSS Replication) ----------
function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // ----- Draw Enemies (Triangles with drop-shadow and exact colors) -----
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation * Math.PI / 180);
        
        const half = e.size / 2;
        
        // Triangle path (pointing up)
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(-half * 0.8, half * 0.6);
        ctx.lineTo(half * 0.8, half * 0.6);
        ctx.closePath();
        
        // Drop shadow filter simulation (CSS: filter: drop-shadow(0 0 8px rgba(255,65,77,0.7)))
        ctx.shadowColor = 'rgba(255, 65, 77, 0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Fill color: big = #ff414d, small = #ffaa00 (as per CSS)
        ctx.fillStyle = e.type === 'big' ? '#ff414d' : '#ffaa00';
        ctx.fill();
        
        // Remove shadow for stroke to match CSS (CSS doesn't have stroke, but we add a subtle one for clarity)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Eye (white with black pupil)
        ctx.beginPath();
        ctx.arc(0, -half * 0.2, e.size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, -half * 0.2, e.size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // ----- Draw Player Ball (Exact CSS radial gradient + box-shadow) -----
    ctx.save();
    ctx.translate(ballX, ballY);
    
    // Apply click scaling
    const scale = isMouseDown ? 0.8 : 1.0;
    ctx.scale(scale, scale);
    
    // Outer glow (CSS: box-shadow: 0 0 20px #00bfff, 0 0 30px #0077ff)
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Create radial gradient matching CSS: radial-gradient(circle, #00bfff 0%, #0077ff 100%)
    const gradient = ctx.createRadialGradient(-5, -5, 2, 0, 0, BALL_RADIUS);
    gradient.addColorStop(0, '#00bfff');
    gradient.addColorStop(1, '#0077ff');
    
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Second shadow layer (CSS has two shadows, we simulate with a second fill with different blur)
    ctx.shadowColor = '#0077ff';
    ctx.shadowBlur = 30;
    ctx.fill();
    
    // Remove shadow for crisp edge
    ctx.shadowBlur = 0;
    
    // Inner highlight (simulate the 3D sphere look from the original)
    ctx.beginPath();
    ctx.arc(-3, -3, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#88ddff';
    ctx.fill();
    
    ctx.restore();
}

// ---------- Game Loop ----------
function gameLoop() {
    if (gameState !== 'playing') return;
    
    score += 1/6;
    scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
    frameCount++;
    
    const spawnInterval = Math.max(15, 70 - (currentDifficulty + 2) * 5);
    if (frameCount % spawnInterval === 0) {
        spawnEnemy();
    }
    
    updatePlayer();
    updateEnemies();
    const collision = checkCollisions();
    
    draw();
    
    if (!collision) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// ---------- Event Listeners ----------
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
menuButton.addEventListener('click', backToMenu);
difficultyInput.addEventListener('change', () => {
    currentDifficulty = Math.min(10, Math.max(1, parseInt(difficultyInput.value) || 3));
    updateHighScoreDisplay();
});

// Initial load
loadHighScores();