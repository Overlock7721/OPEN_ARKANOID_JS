class AudioManager {
    constructor() {
        this.sounds = {
            BOUNCE: new Audio('assets/sounds/bounce.wav'),
            BRICK_BREAK: new Audio('assets/sounds/brick-break.wav'),
            SILVER_BRICK: new Audio('assets/sounds/silver-brick.wav'),
            GAME_OVER: new Audio('assets/sounds/game-over.wav'),
            POWERUP: new Audio('assets/sounds/powerup.wav'),
            LASER: new Audio('assets/sounds/laser.wav'),
            ENEMY_KILL: new Audio('assets/sounds/enemy-kill.wav')
        };
        
        this.soundEnabled = true;
        this.currentSounds = new Set();
        
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.volume = 0.3;
                sound.preload = 'auto';
            }
        });
    }
    
    /** Проигрывает звук */
    play(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        this.stopAllOfType(sound.src);
        
        try {
            sound.currentTime = 0;
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.currentSounds.add(sound);
                        sound.onended = () => this.currentSounds.delete(sound);
                    })
                    .catch(e => {
                        if (e.name !== 'AbortError') console.log('Ошибка воспроизведения:', e);
                    });
            }
        } catch (error) {
            console.warn('Ошибка при воспроизведении звука:', error);
        }
    }
    
    /** Останавливает все звуки определенного типа */
    stopAllOfType(soundSrc) {
        this.currentSounds.forEach(sound => {
            if (sound.src === soundSrc) {
                sound.pause();
                sound.currentTime = 0;
                this.currentSounds.delete(sound);
            }
        });
    }
    
    /** Останавливает все звуки */
    stopAll() {
        this.currentSounds.forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.currentSounds.clear();
    }
    
    /** Переключает звук */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (!this.soundEnabled) this.stopAll();
    }
}