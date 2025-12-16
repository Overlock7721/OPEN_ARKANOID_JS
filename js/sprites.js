const SPRITES = {
    VAUS: {
        NORMAL: { sx: 0, sy: 0, sw: 32, sh: 8, img: new Image() },
        LASER: { sx: 0, sy: 16, sw: 32, sh: 8, img: new Image() },
        ENLARGED: { sx: 0, sy: 8, sw: 48, sh: 8, img: new Image() },
        EXPLOSION: [
            { sx: 0, sy: 40, sw: 32, sh: 8, img: new Image() },
            { sx: 40, sy: 32, sw: 32, sh: 8, img: new Image() },
            { sx: 64, sy: 24, sw: 32, sh: 8, img: new Image() },
            { sx: 96, sy: 24, sw: 32, sh: 8, img: new Image() }
        ]
    },
    BALL: { sx: 40, sy: 0, sw: 5, sh: 4, img: new Image() },
    LASER_BEAM: { sx: 40, sy: 16, sw: 3, sh: 4, img: new Image() },
    BLOCKS: { img: new Image() },
    POWERUPS: {},
    BACKGROUND: { img: new Image() },
    HUD: { img: new Image() },
    LIFE: { img: new Image() },
    BACKGROUNDS: [
        { sx: 0, sy: 0, sw: 0, sh: 0, img: new Image() },
        { sx: 0, sy: 0, sw: 0, sh: 0, img: new Image() },
        { sx: 0, sy: 0, sw: 0, sh: 0, img: new Image() },
        { sx: 0, sy: 0, sw: 0, sh: 0, img: new Image() },
        { sx: 0, sy: 0, sw: 0, sh: 0, img: new Image() }
    ],
    ENDING: {
        img: new Image(),
        GAME_OVER: { sx: 0, sy: 0, sw: 256, sh: 224 },
        DOH: [
            { sx: 0, sy: 224, sw: 32, sh: 128 },
            { sx: 32, sy: 224, sw: 32, sh: 128 },
            { sx: 64, sy: 224, sw: 32, sh: 128 },
            { sx: 96, sy: 224, sw: 32, sh: 128 }
        ]
    }
};

const POWERUP_TYPES = ['BREAK', 'CATCH', 'DISRUPTION', 'ENLARGE', 'LASER', 'PLAYER', 'SLOW'];
const POWERUP_FRAMES = 6;

/** Загружает спрайты паверапов */
function loadPowerUps() {
    return new Promise((resolve) => {
        const powerUpImg = new Image();
        powerUpImg.src = 'assets/sprites/powerups.png';
        
        powerUpImg.onload = function() {
            const frameWidth = powerUpImg.width / POWERUP_FRAMES;
            const frameHeight = powerUpImg.height / POWERUP_TYPES.length;
            
            POWERUP_TYPES.forEach((type, typeIndex) => {
                SPRITES.POWERUPS[type] = {
                    frames: [],
                    type: type,
                    frameWidth: frameWidth,
                    frameHeight: frameHeight
                };
                
                for (let frame = 0; frame < POWERUP_FRAMES; frame++) {
                    SPRITES.POWERUPS[type].frames.push({
                        sx: frame * frameWidth,
                        sy: typeIndex * frameHeight,
                        sw: frameWidth,
                        sh: frameHeight,
                        img: powerUpImg
                    });
                }
            });
            resolve();
        };
        
        powerUpImg.onerror = function() {
            resolve();
        };
    });
}

/** Загружает спрайты врагов */
function loadEnemies() {
    return new Promise((resolve) => {
        const enemiesImg = new Image();
        enemiesImg.src = 'assets/sprites/enemies.png';
        
        enemiesImg.onload = function() {
            SPRITES.ENEMIES = {
                img: enemiesImg,
                TYPES: [
                    { name: 'ENEMY1', frames: 8, frameWidth: 16, frameHeight: 16, framesList: [], animationSpeed: 150 },
                    { name: 'ENEMY2', frames: 7, frameWidth: 16, frameHeight: 16, framesList: [], animationSpeed: 150 },
                    { name: 'ENEMY3', frames: 6, frameWidth: 16, frameHeight: 16, framesList: [], animationSpeed: 150 },
                    { name: 'ENEMY4', frames: 8, frameWidth: 16, frameHeight: 16, framesList: [], animationSpeed: 150 }
                ],
                EXPLOSION: { frames: 4, frameWidth: 16, frameHeight: 16, framesList: [], animationSpeed: 100 }
            };
            
            let currentY = 0;
            
            SPRITES.ENEMIES.TYPES.forEach((enemyType, index) => {
                enemyType.framesList = [];
                for (let frame = 0; frame < enemyType.frames; frame++) {
                    enemyType.framesList.push({
                        sx: frame * enemyType.frameWidth,
                        sy: currentY,
                        sw: enemyType.frameWidth,
                        sh: enemyType.frameHeight,
                        img: enemiesImg
                    });
                }
                currentY += enemyType.frameHeight;
            });
            
            const explosion = SPRITES.ENEMIES.EXPLOSION;
            for (let frame = 0; frame < explosion.frames; frame++) {
                explosion.framesList.push({
                    sx: frame * explosion.frameWidth,
                    sy: currentY,
                    sw: explosion.frameWidth,
                    sh: explosion.frameHeight,
                    img: enemiesImg
                });
            }
            
            resolve();
        };
        
        enemiesImg.onerror = function() {
            resolve();
        };
    });
}

/** Загружает спрайты люков */
function loadHatches() {
    return new Promise((resolve) => {
        const hatchesImg = new Image();
        hatchesImg.src = 'assets/sprites/blocks.png';
        
        hatchesImg.onload = function() {
            SPRITES.HATCHES = {
                img: hatchesImg,
                FRAMES: [
                    { sx: 64, sy: 48, sw: 25, sh: 8 },
                    { sx: 64, sy: 56, sw: 25, sh: 8 },
                    { sx: 64, sy: 56, sw: 25, sh: 8 },
                    { sx: 64, sy: 64, sw: 25, sh: 8 },
                    { sx: 96, sy: 64, sw: 25, sh: 8 },
                    { sx: 96, sy: 64, sw: 25, sh: 8 }
                ]
            };
            resolve();
        };
        
        hatchesImg.onerror = function() {
            SPRITES.HATCHES = {
                img: new Image(),
                FRAMES: [
                    { sx: 64, sy: 48, sw: 25, sh: 8 },
                    { sx: 64, sy: 56, sw: 25, sh: 8 },
                    { sx: 64, sy: 56, sw: 25, sh: 8 },
                    { sx: 64, sy: 64, sw: 25, sh: 8 },
                    { sx: 96, sy: 64, sw: 25, sh: 8 },
                    { sx: 96, sy: 64, sw: 25, sh: 8 }
                ]
            };
            resolve();
        };
    });
}

/** Загружает все спрайты игры */
function loadSprites() {
    return new Promise((resolve, reject) => {
        let loaded = 0;
        const total = 10;
        
        function onLoad() {
            loaded++;
            if (loaded === total) {
                if (SPRITES.BACKGROUND.img.complete) {
                    const bgWidth = SPRITES.BACKGROUND.img.naturalWidth / 5;
                    const bgHeight = SPRITES.BACKGROUND.img.naturalHeight;
                    
                    for (let i = 0; i < 5; i++) {
                        SPRITES.BACKGROUNDS[i].sx = i * bgWidth;
                        SPRITES.BACKGROUNDS[i].sy = 0;
                        SPRITES.BACKGROUNDS[i].sw = bgWidth;
                        SPRITES.BACKGROUNDS[i].sh = bgHeight;
                        SPRITES.BACKGROUNDS[i].img = SPRITES.BACKGROUND.img;
                    }
                }
                resolve();
            }
        }
        
        SPRITES.VAUS.NORMAL.img.src = 'assets/sprites/vaus.png';
        SPRITES.VAUS.NORMAL.img.onload = onLoad;
        SPRITES.VAUS.NORMAL.img.onerror = reject;
        
        SPRITES.VAUS.LASER.img = SPRITES.VAUS.NORMAL.img;
        SPRITES.VAUS.ENLARGED.img = SPRITES.VAUS.NORMAL.img;
        SPRITES.VAUS.EXPLOSION.forEach(frame => {
            frame.img = SPRITES.VAUS.NORMAL.img;
        });
        
        SPRITES.BALL.img = SPRITES.VAUS.NORMAL.img;
        SPRITES.LASER_BEAM.img = SPRITES.VAUS.NORMAL.img;
        
        SPRITES.BLOCKS.img.src = 'assets/sprites/blocks.png';
        SPRITES.BLOCKS.img.onload = onLoad;
        SPRITES.BLOCKS.img.onerror = reject;
        
        SPRITES.BACKGROUND.img.src = 'assets/sprites/background.png';
        SPRITES.BACKGROUND.img.onload = onLoad;
        SPRITES.BACKGROUND.img.onerror = reject;
        
        SPRITES.ENDING.img.src = 'assets/sprites/ending.png';
        SPRITES.ENDING.img.onload = onLoad;
        SPRITES.ENDING.img.onerror = reject;

        SPRITES.HUD.img.src = 'assets/sprites/hud.png';
        SPRITES.HUD.img.onload = onLoad;
        SPRITES.HUD.img.onerror = reject;
        
        SPRITES.LIFE.img.src = 'assets/sprites/life.png';
        SPRITES.LIFE.img.onload = onLoad;
        SPRITES.LIFE.img.onerror = reject;

        SPRITES.TITLE = new Image();
        SPRITES.TITLE.src = 'assets/sprites/title.png';
        SPRITES.TITLE.onload = onLoad;
        SPRITES.TITLE.onerror = () => {
            onLoad();
        };
        
        loadHatches().then(onLoad).catch(reject);
        loadPowerUps().then(onLoad).catch(reject);
        loadEnemies().then(onLoad).catch(reject);
    });
}

loadSprites().catch(console.error);