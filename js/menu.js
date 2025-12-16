class MenuManager {
    constructor(game) {
        this.game = game;
        this.currentMenuIndex = 0;
        this.menuItems = [];
        this.isInTutorial = false;
        this.isMenuActive = true;
        this.init();
    }
    
    /** Инициализирует меню */
    init() {
        this.menuItems = Array.from(document.querySelectorAll('.menu-item'));
        this.updateMenuSelection();
        this.setupKeyboardListeners();
        this.initTutorial();
        this.updateHighScoreDisplay();
    }
    
    /** Настраивает обработчики клавиатуры */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.game && this.game.inputCooldown > 0 && Date.now() < this.game.inputCooldown) {
                e.preventDefault();
                return;
            }
            
            if (!this.isMenuActive) return;
            
            if (this.isInTutorial) {
                this.handleTutorialKeydown(e);
                return;
            }
            
            const key = e.key.toLowerCase();
            
            switch(key) {
                case 'arrowup':
                case 'w':
                case 'ц':
                    e.preventDefault();
                    this.moveSelection(-1);
                    break;
                case 'arrowdown':
                case 's':
                case 'ы':
                    e.preventDefault();
                    this.moveSelection(1);
                    break;
                case 'enter':
                case ' ':
                    e.preventDefault();
                    this.selectMenuItem();
                    break;
            }
        });
    }
    
    /** Обрабатывает нажатия клавиш в туториале */
    handleTutorialKeydown(e) {
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'arrowup':
            case 'w':
            case 'ц':
                e.preventDefault();
                this.scrollTutorial(-50);
                break;
            case 'arrowdown':
            case 's':
            case 'ы':
                e.preventDefault();
                this.scrollTutorial(50);
                break;
            case ' ':
                e.preventDefault();
                this.hideTutorial();
                break;
            case 'escape':
                e.preventDefault();
                this.hideTutorial();
                break;
        }
    }
    
    /** Прокручивает туториал */
    scrollTutorial(amount) {
        const tutorialContent = document.querySelector('.tutorial-content');
        if (tutorialContent) {
            tutorialContent.scrollTop += amount;
            this.showScrollHint();
        }
    }
    
    /** Показывает подсказку о прокрутке */
    showScrollHint() {
        const existingHint = document.querySelector('.scroll-hint');
        if (existingHint) existingHint.remove();
        
        const hint = document.createElement('div');
        hint.className = 'scroll-hint';
        hint.textContent = 'Используйте ↑↓ для прокрутки';
        hint.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #c70000;
            padding: 5px 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 1000;
            animation: fadeOut 2s forwards;
        `;
        
        document.getElementById('tutorialScreen').appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) hint.remove();
        }, 2000);
    }

    /** Перемещает выбор в меню */
    moveSelection(direction) {
        if (!this.isMenuActive) return;
        
        this.currentMenuIndex += direction;
        
        if (this.currentMenuIndex < 0) {
            this.currentMenuIndex = this.menuItems.length - 1;
        } else if (this.currentMenuIndex >= this.menuItems.length) {
            this.currentMenuIndex = 0;
        }
        
        this.updateMenuSelection();
    }
    
    /** Обновляет отображение выбранного пункта меню */
    updateMenuSelection() {
        this.menuItems.forEach((item, index) => {
            if (index === this.currentMenuIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    /** Выбирает текущий пункт меню */
    selectMenuItem() {
        if (!this.isMenuActive) return;
        
        const selectedItem = this.menuItems[this.currentMenuIndex];
        const action = selectedItem.dataset.action;
        
        switch(action) {
            case 'start':
                this.startGame();
                break;
            case 'tutorial':
                this.showTutorial();
                break;
        }
    }
    
    /** Запускает игру */
    startGame() {
        this.isMenuActive = false;
        this.hideHighScore();
        document.getElementById('mainMenu').classList.add('hidden');
        this.game.startGame();
    }
    
    /** Показывает туториал */
    showTutorial() {
        if (!this.isMenuActive) return;
        
        this.isInTutorial = true;
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('tutorialScreen').classList.remove('hidden');
        
        const tutorialContent = document.querySelector('.tutorial-content');
        if (tutorialContent) tutorialContent.scrollTop = 0;
        
        this.updateTutorialAnimations();
    }
    
    /** Скрывает туториал */
    hideTutorial() {
        this.isMenuActive = true;
        this.isInTutorial = false;
        document.getElementById('tutorialScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        this.stopTutorialAnimations();
        this.updateHighScoreDisplay();
    }
    
    /** Инициализирует туториал */
    initTutorial() {
        this.createPowerupDisplay();
        this.createEnemyDisplay();
        this.createBlockDisplay();
        this.addTutorialStyles();
    }

    /** Добавляет стили для туториала */
    addTutorialStyles() {
        if (!document.querySelector('#tutorial-styles')) {
            const style = document.createElement('style');
            style.id = 'tutorial-styles';
            style.textContent = `
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .tutorial-content::-webkit-scrollbar {
                    width: 8px;
                }
                .tutorial-content::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                }
                .tutorial-content::-webkit-scrollbar-thumb {
                    background: #c70000;
                    border-radius: 4px;
                }
                .tutorial-content {
                    scrollbar-width: thin;
                    scrollbar-color: #c70000 rgba(0, 0, 0, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /** Обновляет отображение рекорда */
    updateHighScoreDisplay() {
        const highScoreValue = document.getElementById('highScoreValue');
        if (highScoreValue) {
            const savedScore = localStorage.getItem('arkanoid_highscore') || '0';
            const formattedScore = savedScore.toString().padStart(6, '0');
            highScoreValue.textContent = formattedScore;
        }
    }
    
    /** Скрывает рекорд */
    hideHighScore() {
        const highScoreDisplay = document.getElementById('highScoreDisplay');
        if (highScoreDisplay) highScoreDisplay.classList.add('hidden');
    }
    
    /** Показывает рекорд */
    showHighScore() {
        const highScoreDisplay = document.getElementById('highScoreDisplay');
        if (highScoreDisplay) {
            highScoreDisplay.classList.remove('hidden');
            this.updateHighScoreDisplay();
        }
    }
    
    /** Создает отображение паверапов */
    createPowerupDisplay() {
        const powerupGrid = document.querySelector('.powerup-grid');
        const powerupTypes = ['LASER', 'ENLARGE', 'DISRUPTION', 'CATCH', 'SLOW', 'BREAK', 'PLAYER'];
        const powerupDescriptions = {
            'LASER': 'Даёт возможность стрелять лазерами для уничтожения блоков',
            'ENLARGE': 'Увеличивает размер платформы',
            'DISRUPTION': 'Разделяет мяч на три',
            'CATCH': 'Позволяет ловить мяч платформой',
            'SLOW': 'Замедляет скорость мяча',
            'BREAK': 'Мгновенно завершает текущий уровень',
            'PLAYER': 'Добавляет одну дополнительную жизнь'
        };
        
        powerupGrid.innerHTML = '';
        
        powerupTypes.forEach(type => {
            const powerupItem = document.createElement('div');
            powerupItem.className = 'powerup-item';
            
            const visual = document.createElement('div');
            visual.className = 'powerup-visual';
            
            const animation = document.createElement('div');
            animation.className = 'powerup-animation';
            animation.id = `powerup-${type}`;
            
            visual.appendChild(animation);
            
            const info = document.createElement('div');
            info.className = 'powerup-info';
            
            const name = document.createElement('div');
            name.className = 'powerup-name';
            name.textContent = this.getPowerupName(type);
            
            const description = document.createElement('div');
            description.className = 'powerup-description';
            description.textContent = powerupDescriptions[type];
            
            info.appendChild(name);
            info.appendChild(description);
            
            powerupItem.appendChild(visual);
            powerupItem.appendChild(info);
            
            powerupGrid.appendChild(powerupItem);
        });
    }
        
    /** Создает отображение врагов */
    createEnemyDisplay() {
        const enemiesRow = document.querySelector('.enemies-row');
        if (!enemiesRow) return;
        
        enemiesRow.innerHTML = '';
        
        if (SPRITES.ENEMIES && SPRITES.ENEMIES.TYPES) {
            SPRITES.ENEMIES.TYPES.forEach((enemyType, index) => {
                const enemyItem = document.createElement('div');
                enemyItem.className = 'enemy-item';
                
                const visual = document.createElement('div');
                visual.className = 'enemy-visual';
                visual.id = `enemy-visual-${index}`;
                
                const name = document.createElement('div');
                
                enemyItem.appendChild(visual);
                enemyItem.appendChild(name);
                enemiesRow.appendChild(enemyItem);
            });
        }
    }
    
    /** Создает отображение блоков */
    createBlockDisplay() {
        const blocksDisplay = document.querySelector('.blocks-display');
        const blockTypes = [
            { name: 'Обычный блок', type: 'normal', description: 'Разрушается за одно попадание. Имеет 8 различных цветов.' },
            { name: 'Серебряный блок', type: 'silver', description: 'Разрушается за два попадания. Более прочный.' },
            { name: 'Золотой блок', type: 'gold', description: 'Неразрушимый блок. Отражает мяч, но не уничтожается.' }
        ];
        
        blocksDisplay.innerHTML = '';
        
        blockTypes.forEach((block, index) => {
            const blockItem = document.createElement('div');
            blockItem.className = 'block-item';
            
            const visual = document.createElement('div');
            visual.className = 'block-visual';
            
            const animation = document.createElement('div');
            animation.className = 'block-animation';
            animation.id = `block-${block.type}`;
            
            visual.appendChild(animation);
            
            const info = document.createElement('div');
            info.className = 'block-info';
            
            const name = document.createElement('div');
            name.className = 'block-name';
            name.textContent = block.name;
            
            const description = document.createElement('div');
            description.className = 'block-description';
            description.textContent = block.description;
            
            info.appendChild(name);
            info.appendChild(description);
            
            blockItem.appendChild(visual);
            blockItem.appendChild(info);
            
            blocksDisplay.appendChild(blockItem);
        });
    }
    
    /** Анимирует паверапы */
    animatePowerups() {
        const powerupTypes = ['LASER', 'ENLARGE', 'DISRUPTION', 'CATCH', 'SLOW', 'BREAK', 'PLAYER'];
        
        powerupTypes.forEach(type => {
            const container = document.getElementById(`powerup-${type}`);
            if (!container || !SPRITES.POWERUPS[type]) return;
            
            let currentFrame = 0;
            const frames = SPRITES.POWERUPS[type].frames;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 64;
            canvas.height = 32;
            
            container.innerHTML = '';
            container.appendChild(canvas);
            
            const animate = () => {
                if (!this.isInTutorial) return;
                
                const frame = frames[currentFrame % frames.length];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (frame && frame.img) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        frame.img,
                        frame.sx, frame.sy,
                        frame.sw, frame.sh,
                        16, 8,
                        32, 16
                    );
                }
                
                currentFrame++;
            };
            
            setInterval(animate, 150);
        });
    }
    
    /** Анимирует врагов */
    animateEnemies() {
        if (!SPRITES.ENEMIES || !SPRITES.ENEMIES.TYPES) return;
        
        SPRITES.ENEMIES.TYPES.forEach((enemyType, index) => {
            const container = document.getElementById(`enemy-visual-${index}`);
            if (!container) return;
            
            let currentFrame = 0;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 80;
            canvas.height = 80;
            canvas.className = 'enemy-canvas';
            
            container.innerHTML = '';
            container.appendChild(canvas);
            
            const animate = () => {
                if (!this.isInTutorial) return;
                
                const frame = enemyType.framesList[currentFrame % enemyType.frames];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (frame && frame.img) {
                    ctx.imageSmoothingEnabled = false;
                    const scale = 3;
                    const x = (canvas.width - enemyType.frameWidth * scale) / 2;
                    const y = (canvas.height - enemyType.frameHeight * scale) / 2;
                    
                    ctx.drawImage(
                        frame.img,
                        frame.sx, frame.sy,
                        frame.sw, frame.sh,
                        x, y,
                        enemyType.frameWidth * scale,
                        enemyType.frameHeight * scale
                    );
                }
                
                currentFrame++;
            };
            
            setInterval(animate, enemyType.animationSpeed);
        });
    }

    /** Обновляет анимации туториала */
    updateTutorialAnimations() {
        this.animatePowerups();
        this.animateEnemies();
        this.animateBlocks();
    }

    /** Останавливает анимации туториала */
    stopTutorialAnimations() {
        if (this.powerupAnimationInterval) clearInterval(this.powerupAnimationInterval);
        if (this.enemyAnimationInterval) clearInterval(this.enemyAnimationInterval);
        if (this.enemyFrameInterval) clearInterval(this.enemyFrameInterval);
        if (this.normalBlockInterval) clearInterval(this.normalBlockInterval);
        
        if (this.enemyIntervals) {
            this.enemyIntervals.forEach(interval => clearInterval(interval));
            this.enemyIntervals = [];
        }
    }

    /** Анимирует блоки */
    animateBlocks() {
        const normalBlock = document.getElementById('block-normal');
        if (normalBlock && SPRITES.BLOCKS.img.complete) {
            normalBlock.innerHTML = '';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 48;
            canvas.height = 24;
            normalBlock.appendChild(canvas);
            
            let currentColor = 0;
            const colors = 8;
            
            const animateNormal = () => {
                if (!this.isInTutorial) return;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const row = Math.floor(currentColor / 4);
                const col = currentColor % 4;
                const sx = col * 16;
                const sy = 64 + row * 8;
                
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    SPRITES.BLOCKS.img,
                    sx, sy, 16, 8,
                    0, 0, 48, 24
                );
                
                currentColor = (currentColor + 1) % colors;
            };
            
            this.normalBlockInterval = setInterval(animateNormal, 300);
            animateNormal();
        }
        
        const silverBlock = document.getElementById('block-silver');
        if (silverBlock && SPRITES.BLOCKS.img.complete) {
            silverBlock.innerHTML = '';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 48;
            canvas.height = 24;
            silverBlock.appendChild(canvas);
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                SPRITES.BLOCKS.img,
                0, 80, 16, 8,
                0, 0, 48, 24
            );
        }
        
        const goldBlock = document.getElementById('block-gold');
        if (goldBlock && SPRITES.BLOCKS.img.complete) {
            goldBlock.innerHTML = '';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 48;
            canvas.height = 24;
            goldBlock.appendChild(canvas);
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                SPRITES.BLOCKS.img,
                0, 88, 16, 8,
                0, 0, 48, 24
            );
        }
    }
    
    /** Возвращает название паверапа */
    getPowerupName(type) {
        const names = {
            'LASER': 'Лазер',
            'ENLARGE': 'Увеличение',
            'DISRUPTION': 'Разделение',
            'CATCH': 'Захват',
            'SLOW': 'Замедление',
            'BREAK': 'Прорыв',
            'PLAYER': 'Доп. жизнь'
        };
        
        return names[type] || type;
    }
    
    /** Показывает главное меню */
    showMainMenu() {
        this.isMenuActive = true;
        this.isInTutorial = false;
        this.showHighScore();
        document.getElementById('tutorialScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        this.stopTutorialAnimations();
    }
}

window.addEventListener('load', () => {
    const game = new ArkanoidGame();
    const menuManager = new MenuManager(game);
    
    game.showStartScreen = () => menuManager.showMainMenu();
    game.showGameOverScreen = () => menuManager.showGameOver();
    game.hideStartScreen = () => document.getElementById('mainMenu').classList.add('hidden');
    game.hideGameOverScreen = () => document.getElementById('gameOverScreen').classList.add('hidden');
    game.menuManager = menuManager;
});