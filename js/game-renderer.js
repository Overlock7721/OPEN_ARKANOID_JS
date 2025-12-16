class GameRenderer {
    constructor(ctx, gameState) {
        this.ctx = ctx;
        this.gameState = gameState;
        
        this.backgroundSettings = {
            padding: 20,
            fitToPlayfield: true,
            preserveAspectRatio: false,
            cropBottom: 60,
            cropTop: 0,
            showCroppedArea: false
        };

        this.debugInfo = {
            fontSize: 14,
            fontFamily: '"Courier New", monospace',
            textColor: '#00ff00',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            padding: 10,
            lineHeight: 20
        };
        
        this.hudSettings = {
            position: { x: 412, y: 0, width: 112, height: 448 },
            values: {
                highScore: { x: 0, y: 64, align: 'left', fontSize: 24, format: (v) => v.toString().padStart(6, '0') },
                score: { x: 0, y: 112, align: 'left', fontSize: 24, format: (v) => v.toString().padStart(6, '0') },
                level: { x: 14, y: 400, align: 'right', fontSize: 24, format: (v) => v.toString().padStart(2, '0') }
            },
            lives: {
                startX: 0,
                startY: 230,
                direction: 'horizontal',
                spacingX: 2,
                iconWidth: 30,
                iconHeight: 10,
                scale: 1.0,
                maxVisible: 3,
                padding: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                inactiveStyle: { opacity: 0 }
            },
            font: { family: '"Courier New", monospace', size: 16, weight: 'bold' }
        };
    }
    
    render(gameState) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, gameState.width, gameState.height);
        
        this.renderBackground(gameState);
        this.renderBlocks(gameState);
        this.renderBalls(gameState);

        this.renderHatchAnimations(
        gameState.animationManager.hatchAnimations.left,
        gameState.animationManager.hatchAnimations.right,
        gameState.enemyConfig
        );
        
        if (gameState.paddle.visible) {
            this.renderPaddle(gameState);
        }
            
        this.renderLasers(gameState);
        this.renderEnemies(gameState);
        this.renderPowerUps(gameState);
        this.renderHUD(gameState);
        this.renderDebugInfo(gameState);

        if (gameState.debug.showBounds) {
            this.renderDebug(gameState);
        }
    }

    renderDebugInfo(gameState) {
        if (!gameState.debugMode || !gameState.debugInfo.visible) return;
        
        const ctx = this.ctx;
        const info = this.debugInfo;
        
        // Подготавливаем текст
        const lines = [
            `DEBUG MODE [T]`,
            `Паверапы: 1-Лазер 2-Увеличение 3-Разделение`,
            `4-Захват 5-Замедление 6-Прорыв 7-Доп.жизнь`,
            `Отладка: F1-границы F3-спрайты`
        ];
        
        // Вычисляем размеры блока
        const textHeight = lines.length * info.lineHeight + info.padding * 2;
        const startY = gameState.height - textHeight;
        
        // Рисуем фон
        ctx.fillStyle = info.bgColor;
        ctx.fillRect(0, startY, gameState.width, textHeight);
        
        // Настраиваем шрифт
        ctx.font = `${info.fontSize}px ${info.fontFamily}`;
        ctx.fillStyle = info.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Рисуем текст
        lines.forEach((line, index) => {
            const y = startY + info.padding + index * info.lineHeight;
            ctx.fillText(line, info.padding, y);
        });
    }
    
    renderExplosion(explosion) {
        console.log(`renderExplosion: кадр ${explosion.currentFrame}, кадров всего: ${explosion.frames.length}`);
        
        if (!explosion.frames || explosion.currentFrame < 0 || explosion.currentFrame >= explosion.frames.length) {
            console.error('Некорректный кадр взрыва:', explosion.currentFrame);
            return;
        }
        
        const frame = explosion.frames[explosion.currentFrame];
        
        if (!frame || !frame.img) {
            console.error('Кадр взрыва не найден');
            return;
        }
        
        console.log(`Рисуем кадр взрыва: ${frame.sx},${frame.sy} ${frame.sw}x${frame.sh}`);
        
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        
        try {
            this.ctx.drawImage(
                frame.img,
                frame.sx, frame.sy,
                frame.sw, frame.sh,
                Math.round(explosion.position.x),
                Math.round(explosion.position.y),
                this.gameState.paddle.width,
                this.gameState.paddle.height
            );
        } catch (error) {
            console.error('Ошибка при рисовании взрыва:', error);
        }
        
        this.ctx.restore();
    }
    
    renderBackground(gameState) {
        if (!SPRITES.BACKGROUND || !SPRITES.BACKGROUND.img.complete) return;
        
        const bgIndex = gameState.currentBackground;
        if (bgIndex < 0 || bgIndex >= 5) return;
        
        const bgSprite = SPRITES.BACKGROUNDS[bgIndex];
        const playfield = gameState.playfield;
        
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        
        const originalWidth = bgSprite.sw;
        const originalHeight = bgSprite.sh;
        const scaleX = Math.round(playfield.width / originalWidth);
        const scaleY = Math.round(playfield.height / originalHeight);
        const scale = Math.max(scaleX, scaleY, 1);
        
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        const bgX = playfield.x + (playfield.width - scaledWidth) / 2;
        const bgY = playfield.y + (playfield.height - scaledHeight) / 2;
        
        const cropBottom = this.backgroundSettings.cropBottom || 0;
        const cropTop = this.backgroundSettings.cropTop || 0;
        const visibleHeight = scaledHeight - cropBottom - cropTop;
        const sourceCropTop = cropTop / scale;
        const sourceCropBottom = cropBottom / scale;
        const sourceVisibleHeight = originalHeight - sourceCropTop - sourceCropBottom;
        
        this.ctx.drawImage(
            SPRITES.BACKGROUND.img,
            Math.round(bgSprite.sx), 
            Math.round(bgSprite.sy + sourceCropTop),
            Math.round(originalWidth), 
            Math.round(sourceVisibleHeight),
            Math.round(bgX), 
            Math.round(bgY + cropTop),
            Math.round(scaledWidth), 
            Math.round(visibleHeight)
        );
        
        this.ctx.restore();
    }
    
    renderBlocks(gameState) {
        gameState.blocks.forEach(block => {
            if (gameState.debug.showSprites && block.sprite && SPRITES.BLOCKS.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                this.drawSprite(
                    block.sprite,
                    Math.round(block.x), Math.round(block.y),
                    Math.round(block.width), Math.round(block.height)
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = this.getBlockColor(block.type, block.color);
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
    }
    
    renderPaddle(gameState) {
        const paddle = gameState.paddle;
        if (!paddle || !paddle.visible) return;
        
        if (gameState.debug.showSprites && paddle.sprite && paddle.sprite.img.complete) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = false;
            this.drawSprite(
                paddle.sprite,
                Math.round(paddle.x), Math.round(paddle.y),
                Math.round(paddle.width), Math.round(paddle.height)
            );
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        }
    }
    
    renderBalls(gameState) {
        gameState.balls.forEach(ball => {
            // Не рендерим мяч, если он ниже видимой границы (если включено)
            if (gameState.ballVisibility.enabled && ball.y > gameState.ballVisibility.bottomLine) {
                return;
            }
            
            if (SPRITES.BALL && SPRITES.BALL.img && SPRITES.BALL.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                const drawSize = ball.radius * 2;
                this.ctx.drawImage(
                    SPRITES.BALL.img,
                    SPRITES.BALL.sx, SPRITES.BALL.sy,
                    SPRITES.BALL.sw, SPRITES.BALL.sh,
                    Math.round(ball.x - ball.radius),
                    Math.round(ball.y - ball.radius),
                    drawSize,
                    drawSize
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderLasers(gameState) {
        gameState.lasers.forEach(laser => {
            if (SPRITES.LASER_BEAM && SPRITES.LASER_BEAM.img && SPRITES.LASER_BEAM.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.drawImage(
                    SPRITES.LASER_BEAM.img,
                    SPRITES.LASER_BEAM.sx, SPRITES.LASER_BEAM.sy,
                    SPRITES.LASER_BEAM.sw, SPRITES.LASER_BEAM.sh,
                    Math.round(laser.x - laser.width / 2),
                    Math.round(laser.y),
                    Math.round(laser.width),
                    Math.round(laser.height)
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = laser.color;
                this.ctx.fillRect(
                    Math.round(laser.x - laser.width / 2),
                    Math.round(laser.y),
                    Math.round(laser.width),
                    Math.round(laser.height)
                );
            }
        });
    }

    renderHatchAnimations() {
        const leftHatch = this.gameState.animationManager.hatchStates.left;
        const rightHatch = this.gameState.animationManager.hatchStates.right;
        const enemyConfig = this.gameState.enemyConfig;
        
        // Рендерим левый люк
        if (leftHatch.frames && leftHatch.frames[leftHatch.currentFrame] && 
            SPRITES.HATCHES && SPRITES.HATCHES.img.complete) {
            
            // Рендерим только если люк не закрыт полностью или анимируется
            if (leftHatch.currentFrame > 0 || leftHatch.isAnimating) {
                const frame = leftHatch.frames[leftHatch.currentFrame];
                const hatch = enemyConfig.hatchLeft;
                
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                
                this.ctx.drawImage(
                    SPRITES.HATCHES.img,
                    frame.sx, frame.sy,
                    frame.sw, frame.sh,
                    Math.round(hatch.x), Math.round(hatch.y),
                    hatch.width, hatch.height
                );
                
                this.ctx.restore();
            }
        }
        
        // Рендерим правый люк
        if (rightHatch.frames && rightHatch.frames[rightHatch.currentFrame] && 
            SPRITES.HATCHES && SPRITES.HATCHES.img.complete) {
            
            if (rightHatch.currentFrame > 0 || rightHatch.isAnimating) {
                const frame = rightHatch.frames[rightHatch.currentFrame];
                const hatch = enemyConfig.hatchRight;
                
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                
                this.ctx.drawImage(
                    SPRITES.HATCHES.img,
                    frame.sx, frame.sy,
                    frame.sw, frame.sh,
                    Math.round(hatch.x), Math.round(hatch.y),
                    hatch.width, hatch.height
                );
                
                this.ctx.restore();
            }
        }
    }
    
    renderEnemies(gameState) {
        gameState.enemies.forEach(enemy => {
            if (enemy.sprite && enemy.sprite.img && enemy.sprite.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                
                if (performance.now() - enemy.lastHitTime < 100) {
                    this.ctx.globalAlpha = 0.7;
                }
                
                this.ctx.drawImage(
                    enemy.sprite.img,
                    enemy.sprite.sx, enemy.sprite.sy,
                    enemy.sprite.sw, enemy.sprite.sh,
                    Math.round(enemy.x), Math.round(enemy.y),
                    enemy.width, enemy.height
                );
                this.ctx.restore();
            }
        });
        
        gameState.enemyExplosions.forEach(explosion => {
            if (explosion.sprite && explosion.sprite.img && explosion.sprite.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.drawImage(
                    explosion.sprite.img,
                    explosion.sprite.sx, explosion.sprite.sy,
                    explosion.sprite.sw, explosion.sprite.sh,
                    Math.round(explosion.x), Math.round(explosion.y),
                    explosion.width, explosion.height
                );
                this.ctx.restore();
            }
        });
    }
    
    renderPowerUps(gameState) {
        gameState.powerUps.forEach(powerUp => {
            if (gameState.debug.showSprites && powerUp.sprite && powerUp.sprite.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.drawImage(
                    powerUp.sprite.img,
                    powerUp.sprite.sx, powerUp.sprite.sy,
                    powerUp.sprite.sw, powerUp.sprite.sh,
                    Math.round(powerUp.x), Math.round(powerUp.y),
                    Math.round(powerUp.width), Math.round(powerUp.height)
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = this.getPowerUpColor(powerUp.type);
                this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            }
        });
    }
    
    renderHUD(gameState) {
        const hud = this.hudSettings;
        
        if (SPRITES.HUD && SPRITES.HUD.img.complete) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(
                SPRITES.HUD.img,
                hud.position.x,
                hud.position.y,
                hud.position.width,
                hud.position.height
            );
            this.ctx.restore();
        }
        
        this.renderHUDValues(gameState);
        this.renderLives(gameState);
    }
    
    renderHUDValues(gameState) {
        const hud = this.hudSettings;
        this.ctx.textBaseline = 'top';
        
        const drawValue = (config, value) => {
            // Используем безопасный доступ к свойствам
            const fontSize = config.fontSize || hud.font.size;
            const fontFamily = hud.font.family || '"Courier New", monospace';
            const fontWeight = hud.font.weight || 'bold';
            
            this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            this.ctx.textAlign = config.align || 'left';
            this.ctx.fillStyle = config.color || '#ffffff';
            
            let x = hud.position.x + (config.x || 0);
            if (config.align === 'center') {
                x = hud.position.x + (hud.position.width / 2);
            } else if (config.align === 'right') {
                x = hud.position.x + hud.position.width - (config.x || 0);
            }
            
            const y = hud.position.y + (config.y || 0);
            const text = config.format ? config.format(value) : value.toString();
            this.ctx.fillText(text, x, y);
        };
        
        if (hud.values && hud.values.highScore) {
            drawValue(hud.values.highScore, gameState.highScore);
        }
        if (hud.values && hud.values.score) {
            drawValue(hud.values.score, gameState.score);
        }
        if (hud.values && hud.values.level) {
            drawValue(hud.values.level, gameState.level);
        }
    }
    
    renderLives(gameState) {
        const livesConfig = this.hudSettings.lives;
        const hudPos = this.hudSettings.position;
        
        const padding = livesConfig.padding || { left: 0, right: 0, top: 0, bottom: 0 };
        
        const iconWidth = livesConfig.iconWidth * livesConfig.scale;
        const iconHeight = livesConfig.iconHeight * livesConfig.scale;
        
        let currentX = hudPos.x + livesConfig.startX + padding.left;
        let currentY = hudPos.y + livesConfig.startY + padding.top;
        
        for (let i = 0; i < Math.min(livesConfig.maxVisible, gameState.maxLives); i++) {
            const isActive = i < gameState.lives;
            
            if (SPRITES.LIFE && SPRITES.LIFE.img.complete) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                
                const inactiveOpacity = (livesConfig.inactiveStyle && livesConfig.inactiveStyle.opacity) || 0;
                if (!isActive && inactiveOpacity < 1) {
                    this.ctx.globalAlpha = inactiveOpacity;
                }
                
                this.ctx.drawImage(
                    SPRITES.LIFE.img,
                    0, 0,
                    SPRITES.LIFE.img.naturalWidth,
                    SPRITES.LIFE.img.naturalHeight,
                    currentX,
                    currentY,
                    iconWidth,
                    iconHeight
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = isActive ? '#00ff00' : '#333333';
                this.ctx.fillRect(currentX, currentY, iconWidth, iconHeight);
            }
            
            if (livesConfig.direction === 'horizontal') {
                currentX += iconWidth + livesConfig.spacingX;
            } else {
                currentY += iconHeight + livesConfig.spacingY;
            }
        }
    }
    
    renderDebug(gameState) {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            gameState.playfield.x, gameState.playfield.y,
            gameState.playfield.width, gameState.playfield.height
        );
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            gameState.hudArea.x, gameState.hudArea.y,
            gameState.hudArea.width, gameState.hudArea.height
        );
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '10px "Courier New", monospace';
        this.ctx.fillText(
            `Игровое поле: (${gameState.playfield.x}, ${gameState.playfield.y})`,
            gameState.playfield.x,
            gameState.playfield.y - 5
        );
        
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(gameState.playfield.x, gameState.enemyConfig.behaviorLineY);
        this.ctx.lineTo(gameState.playfield.x + gameState.playfield.width, gameState.enemyConfig.behaviorLineY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawSprite(spriteData, x, y, width, height) {
        if (!spriteData || !spriteData.img) return;
        try {
            this.ctx.drawImage(
                spriteData.img,
                spriteData.sx, spriteData.sy,
                spriteData.sw, spriteData.sh,
                x, y,
                width, height
            );
        } catch (e) {
            console.warn('Ошибка отрисовки спрайта:', e);
        }
    }
    
    getBlockColor(type, color = 1) {
        const colorMap = {
            1: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'],
            9: '#c0c0c0',
            10: '#ffd700'
        };
        
        if (type === 1 && color >= 1 && color <= 8) {
            return colorMap[1][color - 1];
        }
        return colorMap[type] || '#ffffff';
    }
    
    getPowerUpColor(type) {
        const colorMap = {
            'LASER': '#ff0000',
            'ENLARGE': '#00ff00',
            'DISRUPTION': '#0000ff',
            'CATCH': '#ffff00',
            'SLOW': '#ff00ff',
            'BREAK': '#00ffff',
            'PLAYER': '#ff8800'
        };
        return colorMap[type] || '#ffffff';
    }
}