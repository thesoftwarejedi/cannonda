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
    private touchControls: { [key: string]: HTMLDivElement } = {};
    private isMobile: boolean = false;
    private touchControlsContainer: HTMLDivElement | null = null;

    constructor() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Check if we're likely on a mobile device
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.matchMedia("(max-width: 768px)").matches;
        
        // Set up touch controls if we're on mobile
        if (this.isMobile) {
            this.setupTouchControls();
        }
        
        // Listen for resize events to show/hide touch controls as needed
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    private handleResize(): void {
        const isMobileNow = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.matchMedia("(max-width: 768px)").matches;
            
        // Only make changes if mobile status changed
        if (isMobileNow !== this.isMobile) {
            this.isMobile = isMobileNow;
            
            if (this.isMobile && !this.touchControlsContainer) {
                this.setupTouchControls();
            } else if (!this.isMobile && this.touchControlsContainer) {
                this.removeTouchControls();
            }
        }
    }

    private setupTouchControls(): void {
        // Create container for touch controls
        this.touchControlsContainer = document.createElement('div');
        this.touchControlsContainer.id = 'touch-controls';
        this.touchControlsContainer.style.position = 'fixed';
        this.touchControlsContainer.style.bottom = '10px';
        this.touchControlsContainer.style.left = '0';
        this.touchControlsContainer.style.right = '0';
        this.touchControlsContainer.style.display = 'flex';
        this.touchControlsContainer.style.justifyContent = 'space-between';
        this.touchControlsContainer.style.zIndex = '1000';
        this.touchControlsContainer.style.pointerEvents = 'none'; // Container doesn't block clicks
        
        // Left side: movement controls
        const leftControls = document.createElement('div');
        leftControls.style.display = 'flex';
        leftControls.style.margin = '0 0 0 20px';
        
        // Right side: action controls
        const rightControls = document.createElement('div');
        rightControls.style.display = 'flex';
        rightControls.style.margin = '0 20px 0 0';
        
        // Create all buttons
        this.addTouchButton(leftControls, Keys.Left, '←', '60px');
        this.addTouchButton(leftControls, Keys.Right, '→', '60px');
        this.addTouchButton(rightControls, Keys.Up, 'JUMP', '90px');
        this.addTouchButton(rightControls, Keys.Down, 'FIRE', '90px');
        
        // Add controls to container
        this.touchControlsContainer.appendChild(leftControls);
        this.touchControlsContainer.appendChild(rightControls);
        
        // Add container to the document
        document.body.appendChild(this.touchControlsContainer);
    }
    
    private addTouchButton(container: HTMLDivElement, key: string, label: string, width: string): void {
        const button = document.createElement('div');
        button.innerText = label;
        button.style.width = width;
        button.style.height = '60px';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        button.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        button.style.borderRadius = '10px';
        button.style.margin = '0 10px';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.fontSize = '20px';
        button.style.fontWeight = 'bold';
        button.style.color = 'white';
        button.style.pointerEvents = 'auto'; // Make the button clickable
        button.style.userSelect = 'none'; // Prevent text selection
        button.style.cursor = 'pointer';
        
        // Add touch event listeners
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keysPressed.add(key);
            this.keysDown.add(key);
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keysPressed.delete(key);
            this.keysUp.add(key);
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        // Also handle mouse events for testing on desktop
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keysPressed.add(key);
            this.keysDown.add(key);
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        });
        
        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keysPressed.delete(key);
            this.keysUp.add(key);
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        container.appendChild(button);
        this.touchControls[key] = button;
    }
    
    private removeTouchControls(): void {
        if (this.touchControlsContainer) {
            document.body.removeChild(this.touchControlsContainer);
            this.touchControlsContainer = null;
            this.touchControls = {};
        }
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
