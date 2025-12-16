class ArkanoidGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.width = 720;
        this.height = 560;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gameState = new GameState();
        this.renderer = new GameRenderer(this.ctx, this.gameState);
        this.inputHandler = new InputHandler(this);
        this.audioManager = new AudioManager();
        this.animationManager = new AnimationManager(this.gameState);
        this.transitionManager = new TransitionManager(this);
        
        this.animationId = null;
        this.inputCooldown = 0;
        
        this.init();
    }
    
    /** Инициализирует игру */
    init() {
        this.gameState.audioManager = this.audioManager;
        this.gameState.animationManager = this.animationManager;
        this.gameState.game = this;
        this.animationManager.game = this;
        
        this.gameState.init();
        this.inputHandler.setup();
        this.showStartScreen();
        
        this.animationManager.onExplosionComplete = () => {
            this.animationManager.showEndingScreen();
        };
        
        setTimeout(() => {
            this.animationManager.loadAnimations();
        }, 100);
    }

    /** Запускает игру */
    startGame() {
        if (this.gameState.isRunning) return;
        
        this.gameState.isRunning = true;
        this.gameState.gameStarted = false;
        this.hideStartScreen();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.gameLoop();
    }

    /** Обрабатывает нажатия клавиш на экране окончания */
    handleEndingScreenKey() {
        this.animationManager.hideEndingScreen();
        this.returnToMenu();
    }
    
    /** Основной игровой цикл */
    gameLoop(currentTime = 0) {
        if (this.inputCooldown > 0 && Date.now() > this.inputCooldown) {
            this.inputCooldown = 0;
        }
        
        const shouldContinue = this.gameState.isRunning || 
                            this.animationManager.hasActiveAnimations() ||
                            this.transitionManager.isActive;
        
        if (shouldContinue) {
            this.update(currentTime);
            this.render();
            this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        } else {
            this.animationId = null;
        }
    }

    /** Обновляет состояние игры */
    update(currentTime) {
        const transitionCompleted = this.transitionManager.update(currentTime);
        
        if (transitionCompleted) return;
        
        if (this.transitionManager.isActive) return;

        this.animationManager.update(currentTime);
        
        if (!this.gameState.isRunning) return;
        
        if (this.gameState.gamePaused) {
            this.animationManager.updatePaused(currentTime);
            return;
        }
        
        this.animationManager.update(currentTime);
        
        if (this.animationManager.isBlockingAnimationActive()) return;
        
        this.inputHandler.update();
        this.gameState.update(currentTime);
    }

    /** Отрисовывает игру */
    render() {
        if (this.transitionManager.isActive) {
            this.transitionManager.render(this.ctx, this.width, this.height);
            return;
        }
        
        if (this.animationManager.animations.endingScreen.isActive) {
            this.renderEndingScreen();
            return;
        }
        
        if (this.animationManager.animations.vausExplosion.isPlaying) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.renderer.renderExplosion(this.animationManager.animations.vausExplosion);
            return;
        }
        
        if (!this.gameState.isRunning) return;
        
        this.renderer.render(this.gameState);
        
        this.renderer.renderHatchAnimations(
            this.animationManager.hatchAnimations.left,
            this.animationManager.hatchAnimations.right,
            this.gameState.enemyConfig
        );
        
        if (this.gameState.gamePaused) {
            this.renderPauseOverlay();
        }
    }

    /** Отрисовывает экран паузы */
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '48px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ПАУЗА', this.width / 2, this.height / 2);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px "Courier New", monospace';
        this.ctx.fillText('Нажмите P для продолжения', this.width / 2, this.height / 2 + 60);
    }

    /** Отрисовывает экран окончания */
    renderEndingScreen() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (!SPRITES.ENDING || !SPRITES.ENDING.img.complete) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '48px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            return;
        }
        
        const gameOver = SPRITES.ENDING.GAME_OVER;
        const scale = Math.min(
            this.width / gameOver.sw,
            this.height / gameOver.sh
        );
        
        const scaledWidth = gameOver.sw * scale;
        const scaledHeight = gameOver.sh * scale;
        const x = (this.width - scaledWidth) / 2;
        const y = (this.height - scaledHeight) / 2;
        
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.drawImage(
            SPRITES.ENDING.img,
            gameOver.sx, gameOver.sy,
            gameOver.sw, gameOver.sh,
            Math.round(x), Math.round(y),
            Math.round(scaledWidth), Math.round(scaledHeight)
        );
        
        const dohAnim = this.animationManager.animations.endingScreen.dohAnimation;
        const dohFrame = dohAnim.frames[dohAnim.currentFrame];
        const dohScale = scale * 1.0;
        const dohWidth = dohFrame.sw * dohScale;
        const dohHeight = dohFrame.sh * dohScale;
        const dohX = x + (scaledWidth - dohWidth) / 2;
        const dohY = y + scaledHeight * 0.45;
        
        this.ctx.drawImage(
            SPRITES.ENDING.img,
            dohFrame.sx, dohFrame.sy,
            dohFrame.sw, dohFrame.sh,
            Math.round(dohX), Math.round(dohY),
            Math.round(dohWidth),
            Math.round(dohHeight)
        );
        
        this.ctx.restore();
    }

    /** Показывает стартовый экран */
    showStartScreen() {
        if (this.menuManager) this.menuManager.showMainMenu();
    }

    /** Скрывает стартовый экран */
    hideStartScreen() {
        document.getElementById('mainMenu').classList.add('hidden');
    }
    
    /** Показывает экран Game Over */
    showGameOverScreen() {
        document.getElementById('finalScore').textContent = this.gameState.score;
        document.getElementById('finalLevel').textContent = this.gameState.level;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
        
        if (this.audioManager) this.audioManager.stopAll();
    }
    
    /** Скрывает экран Game Over */
    hideGameOverScreen() {
        document.getElementById('gameOverScreen').classList.add('hidden');
    }

    /** Перезапускает игру */
    restartGame() {
        cancelAnimationFrame(this.animationId);
        this.gameState.reset();
        this.gameState.init();
        this.hideGameOverScreen();
        this.startGame();
    }
    
    /** Возвращает в главное меню */
    returnToMenu() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.gameState.isRunning = false;
        this.gameState.gameStarted = false;
        
        this.animationManager.animations.vausExplosion.isPlaying = false;
        this.animationManager.animations.endingScreen.isActive = false;
        this.gameState.paddle.visible = true;
        
        this.gameState.reset();
        this.gameState.init();
        
        this.hideGameOverScreen();
        this.inputCooldown = Date.now() + 500;
        
        setTimeout(() => {
            this.showStartScreen();
        }, 100);
    }
}

window.addEventListener('load', () => new ArkanoidGame());