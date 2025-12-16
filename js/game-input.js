class InputHandler {
    constructor(game) {
        this.game = game;
        this.gameState = game.gameState;
        this.keys = {};
    }
    
    /** Настраивает обработчики ввода */
    setup() {
        this.setupKeyboardListeners();
        this.setupButtonListeners();
    }
    
    /** Настраивает обработчики клавиатуры */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    /** Обрабатывает нажатие клавиши */
    handleKeyDown(e) {
        if (this.game.inputCooldown > 0 && Date.now() < this.game.inputCooldown) {
            e.preventDefault();
            return;
        }

        const key = e.key.toLowerCase();
        const code = e.code;

        if (key === 't' || key === 'е') {
            e.preventDefault();
            this.gameState.debugMode = !this.gameState.debugMode;
            this.gameState.debugInfo.visible = this.gameState.debugMode;
            return;
        }

        if (key === ' ' && this.game.transitionManager && 
            this.game.transitionManager.isActive && 
            this.game.transitionManager.type === 'win') {
            e.preventDefault();
            this.game.transitionManager.handleInput();
            return;
        }

        if (this.game.animationManager.animations.endingScreen.isActive) {
            e.preventDefault();
            this.game.handleEndingScreenKey();
            return;
        }
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
            if (key === ' ') {
                e.preventDefault();
                this.game.returnToMenu();
            }
            if (key === 'enter') {
                e.preventDefault();
                const menuButton = document.getElementById('menuButton');
                if (menuButton) menuButton.click();
            }
            return;
        }

        if (this.gameState.gamePaused) {
            if (key === 'p' || key === 'з') this.togglePause();
            return;
        }
        
        if (!this.gameState.isRunning) return;
        
        if (this.gameState.debugMode) {
            if (key >= '1' && key <= '9') {
                e.preventDefault();
                this.handleDebugPowerup(key);
            }
            
            if (e.key === 'F1') {
                e.preventDefault();
                this.gameState.debug.showBounds = !this.gameState.debug.showBounds;
            }
            
            if (e.key === 'F2') {
                e.preventDefault();
                this.gameState.debug.showSprites = !this.gameState.debug.showSprites;
            }
        }
        
        if (key === 'arrowleft' || key === 'ф' || code === 'KeyA' || key === 'a') {
            this.keys['ArrowLeft'] = true;
        }
        
        if (key === 'arrowright' || key === 'в' || code === 'KeyD' || key === 'd') {
            this.keys['ArrowRight'] = true;
        }
        
        if (key === ' ') {
            e.preventDefault();
            this.handleSpaceKey();
        }
        
        if (key === 'p' || key === 'з') this.togglePause();
        if (key === 'm' || key === 'ь') this.game.audioManager.toggleSound();
    }

    /** Обрабатывает паверапы в режиме отладки */
    handleDebugPowerup(key) {
        const powerupMap = {
            '1': 'LASER',
            '2': 'ENLARGE',
            '3': 'DISRUPTION',
            '4': 'CATCH',
            '5': 'SLOW',
            '6': 'BREAK',
            '7': 'PLAYER',
            '8': 'LASER',
            '9': 'ENLARGE'
        };
        
        const powerupType = powerupMap[key];
        if (powerupType && this.gameState.debugMode) {
            const centerX = this.gameState.playfield.x + this.gameState.playfield.width / 2;
            const y = this.gameState.playfield.y - 20;
            this.gameState.createPowerUp(centerX, y, powerupType);
        }
}
    
    /** Обрабатывает отпускание клавиши */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        const code = e.code;
        
        if (key === 'arrowleft' || key === 'ф' || code === 'KeyA' || key === 'a') {
            this.keys['ArrowLeft'] = false;
        }
        
        if (key === 'arrowright' || key === 'в' || code === 'KeyD' || key === 'd') {
            this.keys['ArrowRight'] = false;
        }
    }
    
    /** Обрабатывает нажатие пробела */
    handleSpaceKey() {
        if (this.game.inputCooldown > 0 && Date.now() < this.game.inputCooldown) return;
        
        if (this.game.transitionManager && this.game.transitionManager.isActive) return;
        
        if (this.gameState.gamePaused) return;
        
        if (!this.gameState.isRunning) return;

        const hasCaughtBall = this.gameState.powerUpStates.caughtBalls.length > 0;
        const hasLaser = this.gameState.powerUpStates.activePowerUps.has('LASER');
        
        if (hasCaughtBall) {
            this.gameState.releaseCaughtBalls();
            return;
        }
        
        if (this.gameState.isRunning && !this.gameState.gameStarted) {
            this.gameState.gameStarted = true;
            this.gameState.balls.forEach(ball => {
                if (ball.stuck) {
                    const angle = (Math.random() * Math.PI/3) - Math.PI/6;
                    ball.speedX = Math.sin(angle) * ball.baseSpeed;
                    ball.speedY = -Math.cos(angle) * ball.baseSpeed;
                    ball.stuck = false;
                }
            });
            return;
        }
        
        if (this.gameState.gameStarted && hasLaser) {
            this.shootLasers();
            return;
        }
    }

    /** Переключает паузу */
    togglePause() {
        if (this.gameState.isRunning) {
            this.gameState.gamePaused = !this.gameState.gamePaused;
            
            if (this.gameState.gamePaused) {
                if (this.game.animationManager) this.game.animationManager.pauseAll();
            } else {
                if (this.game.animationManager) this.game.animationManager.resumeAll();
            }
        }
    }
        
    /** Стреляет лазерами */
    shootLasers() {
        const currentTime = Date.now();
        if (currentTime - this.gameState.powerUpStates.lastLaserShot < this.gameState.laserSettings.cooldown) return;
        if (!this.gameState.powerUpStates.activePowerUps.has('LASER')) return;
        
        const leftLaserX = this.gameState.paddle.x + 16;
        const rightLaserX = this.gameState.paddle.x + this.gameState.paddle.width - 16;
        
        this.gameState.lasers.push({
            x: leftLaserX,
            y: this.gameState.paddle.y,
            width: this.gameState.laserSettings.width,
            height: this.gameState.laserSettings.height,
            speed: this.gameState.laserSettings.speed,
            color: this.gameState.laserSettings.color,
            maxDistance: this.gameState.laserSettings.range,
            distanceTraveled: 0
        });
        
        this.gameState.lasers.push({
            x: rightLaserX,
            y: this.gameState.paddle.y,
            width: this.gameState.laserSettings.width,
            height: this.gameState.laserSettings.height,
            speed: this.gameState.laserSettings.speed,
            color: this.gameState.laserSettings.color,
            maxDistance: this.gameState.laserSettings.range,
            distanceTraveled: 0
        });
        
        this.gameState.powerUpStates.lastLaserShot = currentTime;
        if (this.game.gameState.audioManager) this.game.gameState.audioManager.play('LASER');
    }
    
    /** Обновляет состояние ввода */
    update() {
        if (this.keys['ArrowLeft']) {
            this.gameState.paddle.x = Math.max(
                this.gameState.playfield.x,
                this.gameState.paddle.x - this.gameState.paddle.speed
            );
        }
        if (this.keys['ArrowRight']) {
            this.gameState.paddle.x = Math.min(
                this.gameState.playfield.x + this.gameState.playfield.width - this.gameState.paddle.width,
                this.gameState.paddle.x + this.gameState.paddle.speed
            );
        }
    }
    
    /** Настраивает обработчики кнопок */
    setupButtonListeners() {
        setTimeout(() => {
            const startButton = document.getElementById('startButton');
            const restartButton = document.getElementById('restartButton');
            const menuButton = document.getElementById('menuButton');
            
            if (startButton) startButton.addEventListener('click', () => this.game.startGame());
            if (restartButton) restartButton.addEventListener('click', () => this.game.restartGame());
            if (menuButton) menuButton.addEventListener('click', () => this.game.returnToMenu());
            
            const testButtons = document.querySelectorAll('.test-button');
            testButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const powerupType = e.target.dataset.powerup;
                    this.createTestPowerUp(powerupType);
                });
            });
        }, 100);
    }
    
    /** Создает тестовый паверап */
    createTestPowerUp(type) {
        if (!this.gameState.isRunning) return;
        
        const powerUpData = SPRITES.POWERUPS[type];
        if (!powerUpData || !powerUpData.frames) return;
        
        const x = this.gameState.playfield.x + this.gameState.playfield.width / 2 - 16;
        const y = 50;
        
        this.gameState.powerUps.push({
            x: x,
            y: y,
            width: 32,
            height: 16,
            type: type,
            spriteFrames: powerUpData.frames,
            currentFrame: 0,
            sprite: powerUpData.frames[0],
            animationSpeed: 150,
            lastAnimationTime: performance.now(),
            speed: 2
        });
    }
}