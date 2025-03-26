export enum Keys {
    Up = 'ArrowUp',
    Down = 'ArrowDown',
    Left = 'ArrowLeft',
    Right = 'ArrowRight',
    Space = ' ',
    Enter = 'Enter'
}

export class InputManager {
    private keysPressed: Set<string> = new Set();
    private keysDown: Set<string> = new Set();
    private keysUp: Set<string> = new Set();

    constructor() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.keysPressed.has(event.key)) {
            this.keysDown.add(event.key);
        }
        this.keysPressed.add(event.key);
    }

    private handleKeyUp(event: KeyboardEvent): void {
        this.keysPressed.delete(event.key);
        this.keysUp.add(event.key);
    }

    public isKeyPressed(key: string): boolean {
        return this.keysPressed.has(key);
    }

    public isKeyDown(key: string): boolean {
        return this.keysDown.has(key);
    }

    public isKeyUp(key: string): boolean {
        return this.keysUp.has(key);
    }

    public clearEvents(): void {
        this.keysDown.clear();
        this.keysUp.clear();
    }
}
