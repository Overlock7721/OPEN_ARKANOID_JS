class AnimationManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.game = null;
        this.animationsPaused = false;

        this.animations = {
            vausExplosion: {
                isPlaying: false,
                currentFrame: 0,
                totalFrames: 4,
                frames: [],
                frameDelay: 300,
                lastFrameTime: 0,
                position: { x: 0, y: 0 },
                loop: false
            },
            endingScreen: {
                isActive: false,
                dohAnimation: {
                    currentFrame: 0,
                    totalFrames: 4,
                    frames: [],
                    frameDelay: 200,
                    lastFrameTime: 0,
                    loop: true
                }
            }
        };
        
        this.hatchStates = {
            left: {
                isAnimating: false,
                isOpen: false,
                currentFrame: 0,
                totalFrames: 6,
                frames: [],
                animationSpeed: 150,
                lastFrameTime: 0,
                holdTimer: 0,
                holdDuration: 500 
            },
            right: {
                isAnimating: false,
                isOpen: false,
                currentFrame: 0,
                totalFrames: 6,
                frames: [],
                animationSpeed: 150,
                lastFrameTime: 0,
                holdTimer: 0,
                holdDuration: 500
            }
        };
        
        this.hatchAnimations = {
            left: {
                isPlaying: false,
                frames: [],
                currentFrame: 0,
                totalFrames: 6,
                frameDelays: [100, 100, 100, 100, 100, 100],
                frameTimers: [0, 0, 0, 0, 0, 0],
                isReverse: false,
                onComplete: null
            },
            right: {
                isPlaying: false,
                frames: [],
                currentFrame: 0,
                totalFrames: 6,
                frameDelays: [100, 100, 100, 100, 100, 100],
                frameTimers: [0, 0, 0, 0, 0, 0],
                isReverse: false,
                onComplete: null
            }
        };
        
        this.onExplosionComplete = null;
        this.onEndingScreenComplete = null;
    }
    
    /** Загружает анимации */
    loadAnimations() {
        if (SPRITES.VAUS.EXPLOSION && SPRITES.VAUS.EXPLOSION.length > 0) {
            this.animations.vausExplosion.frames = SPRITES.VAUS.EXPLOSION;
        }
        
        if (SPRITES.ENDING && SPRITES.ENDING.DOH && SPRITES.ENDING.DOH.length > 0) {
            this.animations.endingScreen.dohAnimation.frames = SPRITES.ENDING.DOH;
        }
        
        if (SPRITES.HATCHES && SPRITES.HATCHES.FRAMES) {
            this.hatchStates.left.frames = SPRITES.HATCHES.FRAMES;
            this.hatchStates.right.frames = SPRITES.HATCHES.FRAMES;
            this.hatchAnimations.left.frames = SPRITES.HATCHES.FRAMES;
            this.hatchAnimations.right.frames = SPRITES.HATCHES.FRAMES;
        }
    }
    
    /** Обновляет все анимации */
    update(currentTime) {
        if (this.animationsPaused) return;

        this.updateVausExplosion(currentTime);
        this.updateEndingScreen(currentTime);
        this.updateBlockAnimations(currentTime);
        this.updatePowerUpAnimations(currentTime);
        this.updateHatches(currentTime);
    }

    /** Приостанавливает все анимации */
    pauseAll() {
        this.animationsPaused = true;
    }
    
    /** Возобновляет все анимации */
    resumeAll() {
        this.animationsPaused = false;
    }
    
    /** Обновляет анимации во время паузы */
    updatePaused(currentTime) {
        this.updatePauseAnimation(currentTime);
    }
    
    /** Обновляет анимацию паузы */
    updatePauseAnimation(currentTime) {}
    
    /** Обновляет анимацию взрыва вауса */
    updateVausExplosion(currentTime) {
        const explosion = this.animations.vausExplosion;
        if (!explosion.isPlaying) return;
        
        if (explosion.currentFrame < explosion.totalFrames - 1) {
            if (currentTime - explosion.lastFrameTime >= explosion.frameDelay) {
                explosion.currentFrame++;
                explosion.lastFrameTime = currentTime;
            }
        } else {
            if (currentTime - explosion.lastFrameTime >= explosion.frameDelay * 2) {
                explosion.isPlaying = false;
                explosion.currentFrame = 0;
                if (this.onExplosionComplete) this.onExplosionComplete();
            }
        }
    }
        
    /** Обновляет экран окончания */
    updateEndingScreen(currentTime) {
        if (!this.animations.endingScreen.isActive) return;
        
        const doh = this.animations.endingScreen.dohAnimation;
        if (currentTime - doh.lastFrameTime >= doh.frameDelay) {
            if (doh.loop) {
                doh.currentFrame = (doh.currentFrame + 1) % doh.totalFrames;
            } else {
                doh.currentFrame = Math.min(doh.currentFrame + 1, doh.totalFrames - 1);
            }
            doh.lastFrameTime = currentTime;
        }
    }
    
    /** Обновляет анимации люков */
    updateHatches(currentTime) {
        [this.hatchStates.left, this.hatchStates.right].forEach((hatch, index) => {
            if (hatch.isAnimating) {
                if (currentTime - hatch.lastFrameTime >= hatch.animationSpeed) {
                    if (!hatch.isOpen) {
                        hatch.currentFrame++;
                        if (hatch.currentFrame >= hatch.totalFrames - 1) {
                            hatch.currentFrame = hatch.totalFrames - 1;
                            hatch.isOpen = true;
                            hatch.holdTimer = currentTime;
                        }
                    } else if (hatch.isOpen) {
                        if (currentTime - hatch.holdTimer >= hatch.holdDuration) {
                            hatch.currentFrame--;
                            if (hatch.currentFrame <= 0) {
                                hatch.currentFrame = 0;
                                hatch.isAnimating = false;
                                hatch.isOpen = false;
                            }
                        }
                    }
                    
                    hatch.lastFrameTime = currentTime;
                }
            }
        });
    }
    
    /** Открывает люк */
    openHatch(isLeft) {
        const hatch = isLeft ? this.hatchStates.left : this.hatchStates.right;
        if (hatch.isAnimating && hatch.isOpen) return;
        
        hatch.isAnimating = true;
        hatch.isOpen = false;
        hatch.currentFrame = 0;
        hatch.lastFrameTime = performance.now();
        hatch.holdTimer = 0;
    }
    
    /** Закрывает люк */
    closeHatch(isLeft) {
        const hatch = isLeft ? this.hatchStates.left : this.hatchStates.right;
        if (!hatch.isOpen || !hatch.isAnimating) return;
        hatch.holdDuration = 100;
    }
    
    /** Проигрывает анимацию открытия люка */
    playHatchAnimation(isLeft, onComplete = null) {
        this.openHatch(isLeft);
        if (onComplete) {
            setTimeout(() => onComplete(), this.hatchStates.left.totalFrames * this.hatchStates.left.animationSpeed);
        }
    }
    
    /** Проигрывает анимацию закрытия люка */
    playHatchCloseAnimation(isLeft, onComplete = null) {
        this.closeHatch(isLeft);
        if (onComplete) {
            setTimeout(() => onComplete(), this.hatchStates.left.totalFrames * this.hatchStates.left.animationSpeed);
        }
    }
    
    /** Обновляет анимации блоков */
    updateBlockAnimations(currentTime) {
        this.gameState.blocks.forEach(block => {
            if ((block.type === 9 || block.type === 10) && block.isAnimating) {
                if (currentTime - block.lastHitTime >= 100) {
                    block.animationFrame = (block.animationFrame + 1) % 6;
                    block.lastHitTime = currentTime;
                    
                    if (block.animationFrame === 0) {
                        block.isAnimating = false;
                        block.sprite.sx = 0;
                    } else {
                        block.sprite.sx = block.animationFrame * 16;
                    }
                }
            }
        });
    }
    
    /** Обновляет анимации паверапов */
    updatePowerUpAnimations(currentTime) {
        this.gameState.powerUps.forEach(powerUp => {
            if (currentTime - powerUp.lastAnimationTime >= powerUp.animationSpeed) {
                powerUp.currentFrame = (powerUp.currentFrame + 1) % 6;
                powerUp.lastAnimationTime = currentTime;
                powerUp.sprite = powerUp.spriteFrames[powerUp.currentFrame];
            }
        });
    }
    
    /** Запускает взрыв вауса */
    startVausExplosion() {
        if (this.animations.vausExplosion.isPlaying) return;
        
        this.animations.vausExplosion.isPlaying = true;
        this.animations.vausExplosion.currentFrame = 0;
        this.animations.vausExplosion.lastFrameTime = performance.now();
        this.animations.vausExplosion.position = { 
            x: this.gameState.paddle.x, 
            y: this.gameState.paddle.y 
        };
        
        this.gameState.paddle.visible = false;
    }
    
    /** Проверяет, активна ли блокирующая анимация */
    isBlockingAnimationActive() {
        return this.animations.vausExplosion.isPlaying || this.animations.endingScreen.isActive;
    }
    
    /** Показывает экран окончания */
    showEndingScreen() {
        this.animations.endingScreen.isActive = true;
        this.animations.endingScreen.dohAnimation.lastFrameTime = performance.now();
    }

    /** Скрывает экран окончания */
    hideEndingScreen() {
        this.animations.endingScreen.isActive = false;
        this.animations.endingScreen.dohAnimation.currentFrame = 0;
    }

    /** Проверяет наличие активных анимаций */
    hasActiveAnimations() {
        return this.animations.vausExplosion.isPlaying || 
               this.animations.endingScreen.isActive;
    }
}