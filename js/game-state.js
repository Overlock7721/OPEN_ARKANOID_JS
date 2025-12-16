class GameState {
    constructor() {
        this.width = 720;
        this.height = 560;
        
        this.playfield = {
            x: 40,
            y: 40,
            width: 352,
            height: 494
        };
        
        this.platformArea = {
            x: 40,
            y: 425,
            width: 352,
            height: 20
        };
        
        this.hudArea = {
            x: 412,
            y: 0,
            width: 148,
            height: 560
        };

        this.debugMode = false;
        this.debugInfo = {
            visible: false,
            text: "DEBUG MODE: 1-9 паверапы, F1, F2 отладка"
        };

        this.highScore = this.loadHighScore();
        
        this.gridConfig = {
            cols: 11,
            rows: 20,
            blockWidth: 32,
            blockHeight: 16,
            padding: 0,
            offsetX: 40,
            offsetY: 39
        };
        
        this.paddleConfig = {
            normalWidth: 64,
            enlargedWidth: 96,
            height: 16
        };
        
        this.ballSpeedSettings = {
            baseSpeed: 2,
            levelMultiplier: 0.1,
            breakMultiplier: 0.02,
            maxSpeed: 4
        };
        
        this.laserSettings = {
            cooldown: 150,
            range: 400,
            width: 4,
            height: 16,
            speed: 6,
            color: '#ff0000'
        };
        
        this.enemyConfig = {
            width: 32,
            height: 32,
            baseSpeed: 0.2,
            spawnDelay: 5000,
            maxActive: 3,
            hatchLeft: { x: this.playfield.x + this.playfield.width * 0.25 - 24, y: this.playfield.y - 17, width: 49, height: 16 },
            hatchRight: { x: this.playfield.x + this.playfield.width * 0.75 - 24, y: this.playfield.y - 17, width: 49, height: 16 },
            behaviorLineY: 340,
            minX: 40,
            maxX: 376,
            minY: 40,
            maxY: 393
        };

        // НАСТРОЙКА ВИДИМОСТИ МЯЧА
        this.ballVisibility = {
            // Нижняя граница видимости мяча (в пикселях от верха canvas)
            // Меняйте это значение, чтобы регулировать, когда мяч исчезает
            bottomLine: this.playfield.y + this.playfield.height - 50, // 50 пикселей ниже игрового поля
            enabled: true // Включить/выключить ограничение видимости
        };

        this.highScore = this.loadHighScore();

        this.gamePaused = false;
        this.catchActivated = false;
        
        this.game = null;
        this.audioManager = null;
        this.animationManager = null;
        
        this.reset();
    }
    
    reset() {
        this.score = 0;
        //this.highScore = parseInt(localStorage.getItem('arkanoid_highscore') || '0');
        this.lives = 3;
        this.level = 1;
        this.isRunning = false;
        this.gameStarted = false;
        this.debugMode = false;
        this.debugInfo.visible = false;
        
        this.paddle = null;
        this.balls = [];
        this.blocks = [];
        this.powerUps = [];
        this.lasers = [];
        this.enemies = [];
        this.enemyExplosions = [];
        
        this.gamePaused = false;

        this.powerUpStates = {
            activePowerUps: new Map(),
            caughtBalls: [],
            lastLaserShot: 0
        };
        
        this.levelStats = {
            totalBreakableBlocks: 0,
            brokenBlocks: 0
        };
        
        this.debug = {
            showBounds: false,
            showTypes: false,
            showSprites: true
        };
        
        this.nextLifeAt = 10000;
        this.lastLifeScore = 0;
        this.maxLives = 3;
        this.currentBackground = 0;
        this.enemySpawnTimer = 0;
        
        this.hatches = {
            left: { isOpen: false, isOpening: false, isClosing: false },
            right: { isOpen: false, isOpening: false, isClosing: false }
        };
    }
    
    init() {
        this.createPaddle();
        this.createBall();
        this.loadLevel(this.level);
    }
    
    createPaddle() {
        const hasLaser = this.powerUpStates.activePowerUps.has('LASER');
        const isEnlarged = this.powerUpStates.activePowerUps.has('ENLARGE');
        
        let width = isEnlarged ? this.paddleConfig.enlargedWidth : this.paddleConfig.normalWidth;
        
        // Сохраняем текущую позицию центра платформы
        const currentCenterX = this.paddle ? this.paddle.x + this.paddle.width / 2 : this.playfield.x + this.playfield.width / 2;
        
        let sprite;
        if (hasLaser && isEnlarged) {
            sprite = SPRITES.VAUS.ENLARGED;
        } else if (hasLaser) {
            sprite = SPRITES.VAUS.LASER;
        } else if (isEnlarged) {
            sprite = SPRITES.VAUS.ENLARGED;
        } else {
            sprite = SPRITES.VAUS.NORMAL;
        }
        
        this.paddle = {
            x: currentCenterX - width / 2, // Используем сохраненную позицию центра
            y: this.platformArea.y,
            width: width,
            height: this.paddleConfig.height,
            speed: 2,
            sprite: sprite,
            visible: true
        };
        
        // Ограничиваем, чтобы платформа не вышла за границы
        this.paddle.x = Math.max(
            this.playfield.x,
            Math.min(this.paddle.x, this.playfield.x + this.playfield.width - this.paddle.width)
        );
    }
    
    createBall(x = null, y = null) {
        const baseSpeed = this.ballSpeedSettings.baseSpeed * 
            (1 + (this.level - 1) * this.ballSpeedSettings.levelMultiplier);
        
        const ball = {
            x: x || this.paddle.x + this.paddle.width / 2,
            y: y || this.paddle.y - 10,
            radius: 6,
            speedX: 0,
            speedY: -baseSpeed,
            baseSpeed: baseSpeed,
            maxSpeed: this.ballSpeedSettings.maxSpeed,
            stuck: !this.gameStarted,
            caught: false
        };
        
        this.balls.push(ball);
        return ball;
    }
    
    loadLevel(levelNumber) {
        this.blocks = [];
        this.powerUps = [];
        this.enemies = [];
        this.enemyExplosions = [];
        this.levelStats.brokenBlocks = 0;
        this.enemySpawnTimer = 0;

        const levelData = LEVELS[levelNumber - 1];
        if (!levelData) return;

        this.currentBackground = levelData.background || 0;
        
        if (levelData.enemyFrequency > 0) {
            this.enemySpawnDelay = 5000 / levelData.enemyFrequency;
        }
        
        const grid = this.gridConfig;
        
        levelData.pattern.forEach((row, rowIndex) => {
            row.forEach((blockData, colIndex) => {
                if (blockData !== 0) {
                    let blockType, blockColor, powerupType;
                    
                    if (typeof blockData === 'object') {
                        blockType = blockData.type;
                        blockColor = blockData.color;
                        powerupType = blockData.powerup || null;
                    } else {
                        blockType = blockData;
                        blockColor = 1;
                        powerupType = null;
                    }
                    
                    this.blocks.push({
                        x: grid.offsetX + colIndex * grid.blockWidth,
                        y: grid.offsetY + rowIndex * grid.blockHeight,
                        width: grid.blockWidth,
                        height: grid.blockHeight,
                        type: blockType,
                        color: blockColor,
                        powerupType: powerupType,
                        health: blockType === 9 ? 2 : 1,
                        sprite: this.getBlockSprite(blockType, blockColor),
                        animationFrame: 0,
                        lastHitTime: 0,
                        isAnimating: false
                    });
                }
            });
        });
        
        this.levelStats.totalBreakableBlocks = 
            this.blocks.filter(block => block.type !== 10).length;
    }
    
    getBlockSprite(type, color = 1) {
        if (type === 1) {
            const row = color <= 4 ? 0 : 1;
            const col = (color - 1) % 4;
            return {
                sx: col * 16,
                sy: 64 + row * 8,
                sw: 16,
                sh: 8,
                img: SPRITES.BLOCKS.img
            };
        } else if (type === 9) {
            return { sx: 0, sy: 80, sw: 16, sh: 8, img: SPRITES.BLOCKS.img };
        } else if (type === 10) {
            return { sx: 0, sy: 88, sw: 16, sh: 8, img: SPRITES.BLOCKS.img };
        }
        return { sx: 0, sy: 64, sw: 16, sh: 8, img: SPRITES.BLOCKS.img };
    }
    
    update(currentTime) {
        if (this.gamePaused) {
            return;
        }

        if (this.gameStarted) {
            this.updateBalls();
        }
        
        this.balls.forEach(ball => {
            if (ball.stuck) {
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - 10;
            }
        });
        
        this.checkCollisions();
        this.updatePowerUps(currentTime);
        this.updateEnemies(currentTime);
        this.updateLasers();
        this.updateHighScore();
    }

    updateBalls() {
        if (this.gamePaused) return;
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            if (ball.stuck) continue;
            
            ball.x += ball.speedX;
            ball.y += ball.speedY;
            
            if (ball.x <= this.playfield.x + ball.radius || 
                ball.x >= this.playfield.x + this.playfield.width - ball.radius) {
                ball.speedX = -ball.speedX;
            }
            
            if (ball.y <= this.playfield.y + ball.radius) {
                ball.speedY = -ball.speedY;
            }
            
            // УДАЛЯЕМ МЯЧ, ЕСЛИ ОН НИЖЕ ГРАНИЦЫ ВИДИМОСТИ (если включено)
            const shouldRemoveBall = this.ballVisibility.enabled 
                ? ball.y >= this.ballVisibility.bottomLine 
                : ball.y >= this.playfield.y + this.playfield.height;
            
            if (shouldRemoveBall) {
                this.balls.splice(i, 1);
            }
        }
        
        if (this.balls.length === 0) {
            this.loseLife();
        }
    }
    
    checkCollisions() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            if (ball.stuck) continue;
            
            if (this.checkBallPaddleCollision(ball)) {
                this.handleBallPaddleCollision(ball);
                if (this.audioManager) this.audioManager.play('BOUNCE');
            }
            
            for (let j = this.blocks.length - 1; j >= 0; j--) {
                const block = this.blocks[j];
                if (this.checkBallBlockCollision(ball, block)) {
                    this.handleBlockHit(ball, block, j);
                    break;
                }
            }
        }
    }
    
    checkBallPaddleCollision(ball) {
        // Проверяем видимость мяча - не проверяем столкновение, если мяч ниже видимой границы
        if (this.ballVisibility.enabled && ball.y > this.ballVisibility.bottomLine) {
            return false;
        }
        
        return ball.y + ball.radius >= this.paddle.y &&
            ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
            ball.x >= this.paddle.x &&
            ball.x <= this.paddle.x + this.paddle.width &&
            ball.speedY > 0;
    }
    
    handleBallPaddleCollision(ball) {
        // Проверяем активность CATCH паверапа
        if (this.powerUpStates.activePowerUps.has('CATCH') && !ball.caught) {
            ball.stuck = true;
            ball.speedX = 0;
            ball.speedY = 0;
            ball.caught = true;
            this.powerUpStates.caughtBalls.push(ball);
            return;
        }
        
        const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 2;
        const speed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
        
        ball.speedX = Math.sin(angle) * speed;
        ball.speedY = -Math.cos(angle) * speed;
    }
    
    checkBallBlockCollision(ball, block) {
        const ballNextX = ball.x + ball.speedX;
        const ballNextY = ball.y + ball.speedY;
        
        return ballNextX + ball.radius > block.x &&
               ballNextX - ball.radius < block.x + block.width &&
               ballNextY + ball.radius > block.y &&
               ballNextY - ball.radius < block.y + block.height;
    }
    
    handleBlockHit(ball, block, blockIndex) {
        const ballCenterX = ball.x;
        const ballCenterY = ball.y;
        const blockCenterX = block.x + block.width / 2;
        const blockCenterY = block.y + block.height / 2;
        
        const dx = ballCenterX - blockCenterX;
        const dy = ballCenterY - blockCenterY;
        
        const overlapX = (block.width / 2 + ball.radius) - Math.abs(dx);
        const overlapY = (block.height / 2 + ball.radius) - Math.abs(dy);
        
        if (overlapX < overlapY) {
            ball.speedX = -ball.speedX;
            ball.x += ball.speedX > 0 ? overlapX : -overlapX;
        } else {
            ball.speedY = -ball.speedY;
            ball.y += ball.speedY > 0 ? overlapY : -overlapY;
        }
        
        if (block.type === 9 || block.type === 10) {
            block.isAnimating = true;
            block.lastHitTime = performance.now();
            if (this.audioManager) this.audioManager.play('SILVER_BRICK');
        }
        
        if (block.type !== 10) {
            block.health--;
            
            if (block.health <= 0) {
                this.blocks.splice(blockIndex, 1);
                this.score += block.type === 1 ? 100 : 200;
                this.levelStats.brokenBlocks++;
                this.checkAndAddLife();
                
                this.updateBallSpeed(ball);
                
                if (block.type === 1 && this.audioManager) {
                    this.audioManager.play('BRICK_BREAK');
                }
                
                if (block.powerupType) {
                    this.createPowerUp(block.x + block.width / 2, block.y + block.height / 2, block.powerupType);
                }
            }
        }
        
        if (this.blocks.length === 0 || this.blocks.every(block => block.type === 10)) {
            this.nextLevel();
        }
    }
    
    updateBallSpeed(ball) {
        const currentSpeed = this.calculateCurrentBallSpeed();
        const currentSpeedMagnitude = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
        
        if (currentSpeedMagnitude > 0) {
            const ratio = currentSpeed / currentSpeedMagnitude;
            ball.speedX *= ratio;
            ball.speedY *= ratio;
            ball.baseSpeed = currentSpeed;
        }
    }
    
    calculateCurrentBallSpeed() {
        const settings = this.ballSpeedSettings;
        let speed = settings.baseSpeed * (1 + (this.level - 1) * settings.levelMultiplier);
        
        if (this.levelStats.totalBreakableBlocks > 0) {
            const breakProgress = this.levelStats.brokenBlocks / this.levelStats.totalBreakableBlocks;
            speed *= (1 + breakProgress * settings.breakMultiplier);
        }
        
        return Math.min(speed, settings.maxSpeed);
    }
    
    loseLife() {
        console.log('=== loseLife ВЫЗВАН ===');
        console.log('Жизней до:', this.lives);
        
        this.lives = Math.max(0, this.lives - 1);
        
        console.log('Жизней после:', this.lives);
        
        if (this.lives <= 0) {
            console.log('Жизней не осталось, вызываем gameOver');
            if (this.audioManager) this.audioManager.play('GAME_OVER');
            this.gameOver();
        } else {
            console.log('Еще есть жизни, продолжаем');
            this.gameStarted = false;
            this.resetPowerUps();
            this.balls = [];
            const newBall = this.createBall();
            newBall.stuck = true;
            this.paddle.visible = true;
            this.createPaddle();
            if (this.audioManager) this.audioManager.play('BOUNCE');
        }
    }

    gameOver() {
        console.log('=== gameOver ВЫЗВАН ===');
        console.log('Жизней:', this.lives);
        
        // Останавливаем игру, но не анимации
        this.isRunning = false;
        this.gameStarted = false;
        
        if (this.audioManager) {
            console.log('Проигрываем звук Game Over');
            this.audioManager.play('GAME_OVER');
        }
        
        this.saveHighScore();
        
        // Запускаем анимацию взрыва
        if (this.animationManager) {
            console.log('Запускаем анимацию взрыва');
            this.animationManager.startVausExplosion();
        } else {
            console.error('AnimationManager не доступен!');
        }
    }
    
    nextLevel() {
        // Проверяем, есть ли следующий уровень
        const nextLevelNumber = this.level + 1;
        
        if (nextLevelNumber > LEVELS.length) {
            // Все уровни пройдены - показываем победный экран
            console.log('Все уровни пройдены! Показать победный экран');
            
            // Используем менеджер переходов для показа победного экрана
            if (this.game && this.game.transitionManager) {
                console.log('Показываем победный экран через TransitionManager');
                this.game.transitionManager.showWinTransition(
                    this.score,
                    () => {
                        // Коллбэк, который вызывается после показа победного экрана
                        console.log('Победный экран завершен, возвращаем в меню');
                        if (this.game) {
                            this.game.returnToMenu();
                        }
                    }
                );
            } else {
                console.error('TransitionManager не найден!');
            }
            return;
        }
        
        // Есть следующий уровень - увеличиваем номер
        this.level = nextLevelNumber;
        
        // Используем менеджер переходов для показа экрана перехода
        if (this.game && this.game.transitionManager) {
            console.log(`Показываем переход на уровень ${this.level} через TransitionManager`);
            this.game.transitionManager.showLevelTransition(
                this.level,
                () => {
                    // Коллбэк, который вызывается после завершения перехода
                    console.log(`Переход завершен, загружаем уровень ${this.level}`);
                    this.loadNextLevel();
                }
            );
        } else {
            console.error('TransitionManager не найден, загружаем уровень сразу');
            this.loadNextLevel();
        }
    }
    
    createPowerUp(x, y, powerupType = null) {
        // В режиме дебага пропускаем все проверки
        if (!this.debugMode) {
            if (this.powerUpStates.activePowerUps.has('DISRUPTION_ACTIVE') && 
                powerupType !== 'PLAYER') return;
                
            if (this.balls.length > 1 && powerupType !== 'PLAYER') return;
        }
        
        let type = powerupType;
        if (!type) {
            const powerUpTypes = ['BREAK', 'CATCH', 'DISRUPTION', 'ENLARGE', 'LASER', 'PLAYER', 'SLOW'];
            type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        }
        
        const powerUpData = SPRITES.POWERUPS[type];
        if (!powerUpData || !powerUpData.frames) {
            console.error('Powerup data not found for type:', type);
            return;
        }
        
        console.log(`Creating powerup ${type} at (${x}, ${y})`);
        
        this.powerUps.push({
            x: x - 16,
            y: y + 16,
            width: 32,
            height: 16,
            type: type,
            spriteFrames: powerUpData.frames,
            currentFrame: 0,
            sprite: powerUpData.frames[0],
            animationSpeed: 150,
            lastAnimationTime: performance.now(),
            speed: 1
        });
    }
    
    updatePowerUps(currentTime) {
        if (this.gamePaused) return;
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.y += powerUp.speed;
            
            if (powerUp.y + powerUp.height >= this.paddle.y &&
                powerUp.x >= this.paddle.x &&
                powerUp.x <= this.paddle.x + this.paddle.width) {
                
                this.applyPowerUp(powerUp.type);
                this.powerUps.splice(i, 1);
                if (this.audioManager) this.audioManager.play('POWERUP');
            }
            
            if (powerUp.y > this.height) {
                this.powerUps.splice(i, 1);
            }
            
            if (currentTime - powerUp.lastAnimationTime >= powerUp.animationSpeed) {
                powerUp.currentFrame = (powerUp.currentFrame + 1) % 6;
                powerUp.lastAnimationTime = currentTime;
                powerUp.sprite = powerUp.spriteFrames[powerUp.currentFrame];
            }
        }
    }
    
    applyPowerUp(type) {
        const persistentTypes = ['PLAYER', 'BREAK'];
        
        if (!persistentTypes.includes(type)) {
            this.resetPowerUps(persistentTypes);
        }
        
        if (this.powerUpStates.caughtBalls.length > 0 && type !== 'CATCH') {
            this.releaseCaughtBalls();
        }
        
        this.powerUpStates.activePowerUps.set(type, {
            activatedAt: Date.now(),
            data: {}
        });
        
        switch (type) {
            case 'LASER':
            case 'ENLARGE':
                this.createPaddle();
                break;
            case 'DISRUPTION':
                this.activateDisruption();
                break;
            case 'CATCH':
                this.catchActivated = false;
                break;
            case 'SLOW':
                this.balls.forEach(ball => {
                    if (!ball.stuck) {
                        ball.speedX *= 0.7;
                        ball.speedY *= 0.7;
                    }
                });
                break;
            case 'BREAK':
                this.score += 10000;
                this.nextLevel();
                this.powerUpStates.activePowerUps.delete('BREAK');
                break;
            case 'PLAYER':
                this.lives = Math.min(this.maxLives, this.lives + 1);
                this.powerUpStates.activePowerUps.delete('PLAYER');
                break;
        }
    }
    
    resetPowerUps(exceptTypes = []) {
        const powerUpsToRemove = [];
        
        for (const [type, data] of this.powerUpStates.activePowerUps) {
            if (!exceptTypes.includes(type)) {
                powerUpsToRemove.push(type);
            }
        }
        
        powerUpsToRemove.forEach(type => {
            this.deactivatePowerUp(type);
        });
        
        if (!exceptTypes.includes('CATCH')) {
            this.releaseCaughtBalls();
            this.catchActivated = false;
        }
    }
    
    deactivatePowerUp(type) {
        switch (type) {
            case 'LASER':
            case 'ENLARGE':
                this.powerUpStates.activePowerUps.delete(type);
                this.createPaddle();
                break;
            case 'CATCH':
                this.powerUpStates.activePowerUps.delete('CATCH');
                this.releaseCaughtBalls();
                this.catchActivated = false;
                break;
            case 'SLOW':
                this.powerUpStates.activePowerUps.delete('SLOW');
                this.resetBallSpeed();
                break;
            case 'DISRUPTION':
                this.powerUpStates.activePowerUps.delete('DISRUPTION');
                break;
        }
    }
    
    releaseCaughtBalls() {
        // Удаляем паверап CATCH после первого запуска
        if (this.powerUpStates.caughtBalls.length > 0) {
            this.powerUpStates.activePowerUps.delete('CATCH');
            this.catchActivated = false;
        }
        
        this.powerUpStates.caughtBalls.forEach(ball => {
            if (ball && ball.stuck) {
                ball.stuck = false;
                ball.caught = false;
                const angle = (Math.random() * Math.PI/3) - Math.PI/6;
                ball.speedX = Math.sin(angle) * ball.baseSpeed;
                ball.speedY = -Math.cos(angle) * ball.baseSpeed;
            }
        });
        
        this.powerUpStates.caughtBalls = [];
        this.catchActivated = false;
    }

    resetPowerUpsOnLevelComplete() {
        const persistentTypes = ['PLAYER', 'BREAK'];
        const powerUpsToRemove = [];
        
        for (const [type, data] of this.powerUpStates.activePowerUps) {
            if (!persistentTypes.includes(type)) {
                powerUpsToRemove.push(type);
            }
        }
        
        powerUpsToRemove.forEach(type => {
            this.deactivatePowerUp(type);
        });
        
        this.releaseCaughtBalls();
    }
    
    resetBallSpeed() {
        const currentSpeed = this.calculateCurrentBallSpeed();
        this.balls.forEach(ball => {
            const currentSpeedMagnitude = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
            if (currentSpeedMagnitude > 0) {
                const ratio = currentSpeed / currentSpeedMagnitude;
                ball.speedX *= ratio;
                ball.speedY *= ratio;
                ball.baseSpeed = currentSpeed;
            }
        });
    }
    
    activateDisruption() {
        if (this.balls.length === 1) {
            const originalBall = this.balls[0];
            
            for (let i = 0; i < 2; i++) {
                const newBall = {
                    ...originalBall,
                    x: originalBall.x + (i * 20 - 10),
                    speedX: (i === 0 ? -1 : 1) * Math.abs(originalBall.speedX),
                    speedY: -Math.abs(originalBall.speedY)
                };
                this.balls.push(newBall);
            }
            
            this.powerUpStates.activePowerUps.set('DISRUPTION_ACTIVE', {
                activatedAt: Date.now()
            });
        }
    }
    
    updateLasers() {
        if (this.gamePaused) return;
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.y -= laser.speed;
            laser.distanceTraveled += laser.speed;
            
            if (laser.y + laser.height < 0 || laser.distanceTraveled >= laser.maxDistance) {
                this.lasers.splice(i, 1);
                continue;
            }
            
            for (let j = this.blocks.length - 1; j >= 0; j--) {
                const block = this.blocks[j];
                if (this.checkLaserBlockCollision(laser, block)) {
                    this.handleLaserHit(laser, block, j);
                    this.lasers.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    checkLaserBlockCollision(laser, block) {
        return laser.x < block.x + block.width &&
            laser.x + laser.width > block.x &&
            laser.y < block.y + block.height &&
            laser.y + laser.height > block.y;
    }
    
    handleLaserHit(laser, block, blockIndex) {
        if (block.type !== 10) {
            block.health--;
            
            if (block.health <= 0) {
                this.blocks.splice(blockIndex, 1);
                this.score += block.type === 1 ? 100 : 200;
                this.levelStats.brokenBlocks++;
                this.checkAndAddLife();
                
                this.balls.forEach(ball => {
                    this.updateBallSpeed(ball);
                });
                
                if (block.type === 1 && this.audioManager) {
                    this.audioManager.play('BRICK_BREAK');
                }
                
                if (block.powerupType) {
                    this.createPowerUp(block.x + block.width / 2, block.y + block.height / 2, block.powerupType);
                }
            } else {
                block.isAnimating = true;
                block.lastHitTime = performance.now();
                if (this.audioManager) this.audioManager.play('SILVER_BRICK');
            }
        }
        
        if (this.blocks.length === 0 || this.blocks.every(block => block.type === 10)) {
            this.nextLevel();
        }
    }
    
    updateEnemies(currentTime) {
        if (this.gamePaused || !this.isRunning) {
            return;
        }
        const levelData = LEVELS[this.level - 1];
        
        if (levelData && levelData.enemyFrequency > 0) {
            this.enemySpawnTimer += 16;
            
            if (this.enemySpawnTimer >= this.enemySpawnDelay) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
        }
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (currentTime - enemy.lastAnimationTime > enemy.animationSpeed) {
                enemy.currentFrame = (enemy.currentFrame + 1) % enemy.totalFrames;
                enemy.lastAnimationTime = currentTime;
                enemy.sprite = enemy.frames[enemy.currentFrame];
            }
            
            this.updateEnemyMovement(enemy, i);
            
            for (let j = this.balls.length - 1; j >= 0; j--) {
                const ball = this.balls[j];
                if (this.checkBallEnemyCollision(ball, enemy)) {
                    this.handleEnemyHit(enemy, i, ball);
                    break;
                }
            }
            
            for (let j = this.lasers.length - 1; j >= 0; j--) {
                const laser = this.lasers[j];
                if (this.checkLaserEnemyCollision(laser, enemy)) {
                    this.handleEnemyHit(enemy, i);
                    this.lasers.splice(j, 1);
                    break;
                }
            }
            
            if (enemy.y > this.height + 100) {
                this.enemies.splice(i, 1);
            }
        }
        
        for (let i = this.enemyExplosions.length - 1; i >= 0; i--) {
            const explosion = this.enemyExplosions[i];
            
            if (currentTime - explosion.lastAnimationTime > explosion.animationSpeed) {
                explosion.currentFrame++;
                explosion.lastAnimationTime = currentTime;
                
                if (explosion.currentFrame >= explosion.totalFrames) {
                    this.enemyExplosions.splice(i, 1);
                    continue;
                } else {
                    explosion.sprite = explosion.frames[explosion.currentFrame];
                }
            }
        }
    }
    
    spawnEnemy() {
        const levelData = LEVELS[this.level - 1];
        if (!levelData || levelData.enemyFrequency <= 0) return;
        if (this.enemies.length >= this.enemyConfig.maxActive) return;
        if (Math.random() > levelData.enemyFrequency) return;
        
        const spawnLeftHatch = Math.random() > 0.5;
        
        // Открываем люк и спавним врага
        if (this.animationManager) {
            this.animationManager.openHatch(spawnLeftHatch);
            
            // Через время после открытия спавним врага
            setTimeout(() => {
                this.createEnemyAfterHatch(spawnLeftHatch, levelData);
                
                // Закрываем люк через время
                setTimeout(() => {
                    this.animationManager.closeHatch(spawnLeftHatch);
                }, 800); // Можно настроить
            }, 600); // Задержка перед спавном врага
        } else {
            this.createEnemyAfterHatch(spawnLeftHatch, levelData);
        }
    }

    createEnemyAfterHatch(spawnLeftHatch, levelData) {
        const enemyTypeIndex = levelData.enemyTypes[
            Math.floor(Math.random() * levelData.enemyTypes.length)
        ];
        const enemyType = SPRITES.ENEMIES.TYPES[enemyTypeIndex];
        const hatch = spawnLeftHatch ? this.enemyConfig.hatchLeft : this.enemyConfig.hatchRight;
        
        const enemy = {
            x: hatch.x + (hatch.width - this.enemyConfig.width) / 2,
            y: hatch.y + hatch.height,
            width: this.enemyConfig.width,
            height: this.enemyConfig.height,
            type: enemyTypeIndex,
            typeData: enemyType,
            frames: enemyType.framesList,
            currentFrame: 0,
            totalFrames: enemyType.frames,
            sprite: enemyType.framesList[0],
            animationSpeed: enemyType.animationSpeed,
            lastAnimationTime: performance.now(),
            speed: this.enemyConfig.baseSpeed * levelData.enemySpeed,
            directionX: 0,
            directionY: 1,
            state: 'ENTERING',
            changeDirectionCooldown: 0,
            changeDirectionInterval: 2000 + Math.random() * 2000,
            health: 1,
            lastHitTime: 0,
            spawnHatch: spawnLeftHatch ? 'left' : 'right'
        };
        
        this.enemies.push(enemy);
        
        // Закрываем люк через 500ms после появления врага
        if (this.animationManager) {
            setTimeout(() => {
                this.animationManager.playHatchCloseAnimation(spawnLeftHatch);
            }, 500);
        }
    }
    
    updateEnemyMovement(enemy, index) {
        if (enemy.changeDirectionCooldown > 0) {
            enemy.changeDirectionCooldown -= 16;
        }
        
        switch (enemy.state) {
            case 'ENTERING':
                enemy.y += enemy.speed;
                if (enemy.y >= this.playfield.y) {
                    enemy.state = 'DESCENDING';
                }
                break;
            case 'DESCENDING':
                enemy.y += enemy.speed;
                const collisionBlock = this.checkEnemyBlockCollision(enemy);
                if (collisionBlock) {
                    enemy.state = 'AVOIDING_BLOCK';
                    enemy.y -= enemy.speed;
                    enemy.directionX = Math.random() > 0.5 ? 1 : -1;
                    enemy.directionY = 0;
                } else if (enemy.y >= this.enemyConfig.behaviorLineY) {
                    enemy.state = 'RANDOM_MOVEMENT';
                    this.setRandomDirection(enemy);
                }
                break;
            case 'AVOIDING_BLOCK':
                enemy.x += enemy.speed * enemy.directionX;
                const testEnemy = {
                    x: enemy.x,
                    y: enemy.y + enemy.speed,
                    width: enemy.width,
                    height: enemy.height
                };
                if (!this.checkEnemyBlockCollision(testEnemy)) {
                    enemy.state = 'DESCENDING';
                    enemy.directionX = 0;
                    enemy.directionY = 1;
                } else if (!this.canMoveHorizontal(enemy, enemy.directionX)) {
                    enemy.directionX *= -1;
                }
                break;
            case 'RANDOM_MOVEMENT':
                enemy.x += enemy.speed * enemy.directionX;
                enemy.y += enemy.speed * enemy.directionY;
                this.handleEnemyCollisions(enemy);
                if (enemy.changeDirectionCooldown <= 0) {
                    this.setRandomDirection(enemy);
                    enemy.changeDirectionCooldown = enemy.changeDirectionInterval;
                }
                break;
        }
        
        this.clampEnemyToBounds(enemy);
    }
    
    checkEnemyBlockCollision(enemy) {
        for (const block of this.blocks) {
            if (enemy.x < block.x + block.width &&
                enemy.x + enemy.width > block.x &&
                enemy.y < block.y + block.height &&
                enemy.y + enemy.height > block.y) {
                return block;
            }
        }
        return null;
    }
    
    setRandomDirection(enemy) {
        const directions = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 }
        ];
        
        const possibleDirections = directions.filter(dir => {
            if (dir.x !== 0) return this.canMoveHorizontal(enemy, dir.x);
            if (dir.y !== 0) return this.canMoveVertical(enemy, dir.y);
            return false;
        });
        
        if (possibleDirections.length > 0) {
            const randomDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
            enemy.directionX = randomDir.x;
            enemy.directionY = randomDir.y;
        }
    }
    
    canMoveHorizontal(enemy, directionX) {
        if (directionX === 0) return true;
        const testX = enemy.x + enemy.speed * directionX;
        
        if (testX < this.enemyConfig.minX || 
            testX + enemy.width > this.enemyConfig.maxX) {
            return false;
        }
        
        const tempEnemy = {
            x: testX,
            y: enemy.y,
            width: enemy.width,
            height: enemy.height
        };
        
        return !this.checkEnemyBlockCollision(tempEnemy);
    }
    
    canMoveVertical(enemy, directionY) {
        if (directionY === 0) return true;
        const testY = enemy.y + enemy.speed * directionY;
        
        if (testY < this.enemyConfig.minY || 
            testY + enemy.height > this.enemyConfig.maxY) {
            return false;
        }
        
        const tempEnemy = {
            x: enemy.x,
            y: testY,
            width: enemy.width,
            height: enemy.height
        };
        
        return !this.checkEnemyBlockCollision(tempEnemy);
    }
    
    handleEnemyCollisions(enemy) {
        if (this.checkEnemyBlockCollision(enemy)) {
            enemy.x -= enemy.speed * enemy.directionX;
            enemy.y -= enemy.speed * enemy.directionY;
            this.setRandomDirection(enemy);
            return;
        }
        
        if (!this.isEnemyInBounds(enemy)) {
            enemy.x -= enemy.speed * enemy.directionX;
            enemy.y -= enemy.speed * enemy.directionY;
            this.setRandomDirection(enemy);
        }
    }
    
    isEnemyInBounds(enemy) {
        return enemy.x >= this.enemyConfig.minX &&
            enemy.x + enemy.width <= this.enemyConfig.maxX &&
            enemy.y >= this.enemyConfig.minY &&
            enemy.y + enemy.height <= this.enemyConfig.maxY;
    }
    
    clampEnemyToBounds(enemy) {
        enemy.x = Math.max(this.enemyConfig.minX, 
                        Math.min(enemy.x, this.enemyConfig.maxX - enemy.width));
        enemy.y = Math.max(this.enemyConfig.minY, 
                        Math.min(enemy.y, this.enemyConfig.maxY - enemy.height));
    }
    
    checkBallEnemyCollision(ball, enemy) {
        const ballNextX = ball.x + ball.speedX;
        const ballNextY = ball.y + ball.speedY;
        
        return ballNextX + ball.radius > enemy.x &&
            ballNextX - ball.radius < enemy.x + enemy.width &&
            ballNextY + ball.radius > enemy.y &&
            ballNextY - ball.radius < enemy.y + enemy.height;
    }
    
    checkLaserEnemyCollision(laser, enemy) {
        return laser.x < enemy.x + enemy.width &&
            laser.x + laser.width > enemy.x &&
            laser.y < enemy.y + enemy.height &&
            laser.y + laser.height > enemy.y;
    }
    
    handleEnemyHit(enemy, enemyIndex, ball = null) {
        enemy.health--;
        
        if (ball) {
            const hitFromLeft = ball.x < enemy.x + enemy.width / 2;
            const hitFromTop = ball.y < enemy.y + enemy.height / 2;
            
            if (Math.abs(ball.speedX) > Math.abs(ball.speedY)) {
                ball.speedX = -ball.speedX * 1.1;
            } else {
                ball.speedY = -ball.speedY * 1.1;
            }
        }
        
        if (enemy.health <= 0) {
            this.createEnemyExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            this.score += 500;
            this.checkAndAddLife();
            
            if (Math.random() < 0.3) {
                const powerupTypes = ['BREAK', 'CATCH', 'DISRUPTION', 'ENLARGE', 'LASER', 'PLAYER', 'SLOW'];
                const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                this.createPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, randomType);
            }
            
            this.enemies.splice(enemyIndex, 1);
            if (this.audioManager) this.audioManager.play('ENEMY_KILL');
        } else {
            enemy.lastHitTime = performance.now();
            if (this.audioManager) this.audioManager.play('SILVER_BRICK');
        }
    }
    
    createEnemyExplosion(x, y) {
        if (!SPRITES.ENEMIES || !SPRITES.ENEMIES.EXPLOSION) return;
        
        const explosion = SPRITES.ENEMIES.EXPLOSION;
        
        const newExplosion = {
            x: x - explosion.frameWidth / 2,
            y: y - explosion.frameHeight / 2,
            width: explosion.frameWidth,
            height: explosion.frameHeight,
            frames: explosion.framesList,
            currentFrame: 0,
            totalFrames: explosion.frames,
            sprite: explosion.framesList[0],
            animationSpeed: explosion.animationSpeed,
            lastAnimationTime: performance.now(),
            isActive: true
        };
        
        this.enemyExplosions.push(newExplosion);
    }
    
    loadHighScore() {
        try {
            const savedScore = localStorage.getItem('arkanoid_highscore');
            if (savedScore) {
                const score = parseInt(savedScore, 10);
                if (!isNaN(score) && score >= 0) {
                    console.log('High score загружен:', score);
                    return score;
                }
            }
        } catch (e) {
            console.warn('Ошибка загрузки high score:', e);
        }
        
        console.log('High score не найден, используем 0');
        return 0;
    }
    
    saveHighScore() {
        if (typeof this.highScore !== 'number' || isNaN(this.highScore) || this.highScore < 0) {
            console.warn('Некорректный high score:', this.highScore);
            return;
        }
        
        try {
            localStorage.setItem('arkanoid_highscore', this.highScore.toString());
            console.log('High score сохранен:', this.highScore);
            
            // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ HIGH SCORE В МЕНЮ
            this.updateMenuHighScore();
        } catch (e) {
            console.warn('Ошибка сохранения high score:', e);
        }
    }
    
    // ДОБАВЛЕН МЕТОД ДЛЯ ОБНОВЛЕНИЯ HIGH SCORE В МЕНЮ
    updateMenuHighScore() {
        const highScoreValue = document.getElementById('highScoreValue');
        if (highScoreValue) {
            const formattedScore = this.highScore.toString().padStart(6, '0');
            highScoreValue.textContent = formattedScore;
        }
    }
    
    updateHighScore() {
        // Обновляем только если текущий счет больше high score
        if (this.score > this.highScore) {
            console.log(`Новый рекорд! Старый: ${this.highScore}, Новый: ${this.score}`);
            this.highScore = this.score;
            this.saveHighScore();
            
            // Можно добавить визуальную индикацию
            this.highScoreFlash = 30; // Кадры для мигания
        }
    }
    
    checkAndAddLife() {
        if (this.score >= this.nextLifeAt) {
            if (this.lives < this.maxLives) {
                this.lives++;
            }
            this.nextLifeAt += 10000;
            this.lastLifeScore = this.score;
        }
    }

    nextLevel() {
        // Сбрасываем паверапы перед переходом на следующий уровень
        this.resetPowerUpsOnLevelComplete();
        
        // Проверяем, есть ли следующий уровень
        const nextLevelNumber = this.level + 1;
        
        if (nextLevelNumber > LEVELS.length) {
            // Все уровни пройдены - показываем победный экран
            console.log('Все уровни пройдены! Показать победный экран');
            
            // Используем менеджер переходов для показа победного экрана
            if (this.game && this.game.transitionManager) {
                console.log('Показываем победный экран через TransitionManager');
                this.game.transitionManager.showWinTransition(
                    this.score,
                    () => {
                        // Коллбэк, который вызывается после показа победного экрана
                        console.log('Победный экран завершен, возвращаем в меню');
                        if (this.game) {
                            this.game.returnToMenu();
                        }
                    }
                );
            } else {
                console.error('TransitionManager не найден!');
            }
            return;
        }
        
        // Есть следующий уровень - увеличиваем номер
        this.level = nextLevelNumber;
        
        // Используем менеджер переходов для показа экрана перехода
        if (this.game && this.game.transitionManager) {
            console.log(`Показываем переход на уровень ${this.level} через TransitionManager`);
            this.game.transitionManager.showLevelTransition(
                this.level,
                () => {
                    // Коллбэк, который вызывается после завершения перехода
                    console.log(`Переход завершен, загружаем уровень ${this.level}`);
                    this.loadNextLevel();
                }
            );
        } else {
            console.error('TransitionManager не найден, загружаем уровень сразу');
            this.loadNextLevel();
        }
    }

    loadNextLevel() {
        console.log(`Загрузка уровня ${this.level}`);
        
        // Сбрасываем состояние для нового уровня
        this.gameStarted = false;
        
        // Оставляем только один мяч
        this.balls = this.balls.slice(0, 1);
        if (this.balls[0]) {
            this.balls[0].stuck = true;
            this.balls[0].x = this.paddle.x + this.paddle.width / 2;
            this.balls[0].y = this.paddle.y - 10;
        }
        
        // Сбрасываем некоторые паверапы (кроме определенных)
        this.resetPowerUps(['PLAYER', 'BREAK']);
        
        // Загружаем новый уровень
        this.loadLevel(this.level);
        
        if (this.audioManager) this.audioManager.play('BOUNCE');
    }
}