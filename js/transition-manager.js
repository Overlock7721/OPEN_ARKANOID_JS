class TransitionManager {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.type = '';
        this.text = '';
        this.duration = 4000;
        this.startTime = 0;
        this.callback = null;
        this.waitingForInput = false;
    }

    /** Показывает переход между уровнями */
    showLevelTransition(levelNumber, callback) {
        this.isActive = true;
        this.type = 'level';
        this.text = `ROUND ${levelNumber}`;
        this.startTime = performance.now();
        this.callback = callback;
        this.waitingForInput = false;
    }

    /** Показывает победный экран */
    showWinTransition(score, callback) {
        this.isActive = true;
        this.type = 'win';
        this.text = `CONGRATULATIONS!\nFINAL SCORE: ${score}`;
        this.startTime = performance.now();
        this.callback = callback;
        this.waitingForInput = true;
    }

    /** Обновляет состояние перехода */
    update(currentTime) {
        if (!this.isActive) return false;
        const elapsed = currentTime - this.startTime;
        
        if (this.type === 'level' && elapsed >= this.duration) {
            this.isActive = false;
            if (this.callback) this.callback();
            return true;
        }
        
        return false;
    }

    /** Обрабатывает ввод пользователя */
    handleInput() {
        if (this.isActive && this.type === 'win' && this.waitingForInput) {
            this.isActive = false;
            this.waitingForInput = false;
            if (this.callback) this.callback();
            return true;
        }
        return false;
    }

    /** Отрисовывает экран перехода */
    render(ctx, width, height) {
        if (!this.isActive) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '40px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.type === 'level') {
            ctx.fillText(this.text, width / 2, height / 2);
        } else if (this.type === 'win') {
            const lines = this.text.split('\n');
            const lineHeight = 60;
            const startY = height / 2 - (lines.length - 1) * lineHeight / 2;

            lines.forEach((line, index) => {
                ctx.fillText(line, width / 2, startY + index * lineHeight);
            });

            ctx.font = '24px "Courier New", monospace';
            ctx.fillStyle = '#cccccc';
            ctx.fillText('Press SPACE to return to main menu', width / 2, height / 2 + 100);
        }
    }
}