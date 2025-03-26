import { InputManager } from './Input';
import { Player, Laser } from './Player';
import { Elk, CannonTruck, Rock, Ground } from './Entities';
import { GameObject, ObjectType } from './GameObject';
import { Vector2D } from './Vector2D';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private inputManager: InputManager;
    private player: Player;
    private entities: GameObject[];
    private lastTime: number = 0;
    private running: boolean = false;
    private score: number = 0;
    private scoreElement: HTMLElement;
    private spawnTimer: number = 0;
    private groundLevel: number;
    private ground: Ground;
    private entitiesToRemove: GameObject[] = [];
    private cameraOffset: number = 0;
    private scrollSpeed: number = 100; // pixels per second
    private gameStarted: boolean = false; // Track if game has started
    
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.inputManager = new InputManager();
        this.entities = [];
        this.entitiesToRemove = [];
        this.scoreElement = document.getElementById('score-display') as HTMLElement;
        
        // Set canvas to window size
        this.resizeCanvas();
        
        // Setup resize listener
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        this.groundLevel = this.canvas.height - 50;
        
        // Create ground
        this.ground = new Ground(0, this.groundLevel, this.canvas.width * 2, 50);
        this.entities.push(this.ground);
        
        // Create player
        this.player = new Player(this.canvas.width * 0.3, this.groundLevel - 50);
        this.entities.push(this.player);
    }
    
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update ground level when resizing
        if (this.ground) {
            this.groundLevel = this.canvas.height - 50;
            this.ground.position.y = this.groundLevel;
            this.ground.width = this.canvas.width * 2;
            
            // Update player position if it exists
            if (this.player) {
                this.player.position.y = this.groundLevel - this.player.height;
            }
        } else {
            this.groundLevel = this.canvas.height - 50;
        }
    }
    
    public start(): void {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    public stop(): void {
        this.running = false;
    }
    
    private gameLoop(timestamp: number): void {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTime) / 1000; // in seconds
        this.lastTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.gameStarted) {
            // Display start screen
            this.renderStartScreen();
            
            // Check for any key press to start the game
            if (this.inputManager.isKeyDown('Enter') || this.inputManager.isKeyDown(' ')) {
                this.gameStarted = true;
            }
        } else {
            // Update camera position
            this.updateCamera(deltaTime);
            
            // Update and spawn entities
            this.updateEntities(deltaTime);
            this.spawnEntities(deltaTime);
            
            // Remove entities that were marked for removal
            this.removeMarkedEntities();
            
            // Render everything
            this.renderEntities();
            
            // Update score display
            this.scoreElement.textContent = `Score: ${this.score}`;
        }
        
        // Handle input post-update
        this.inputManager.clearEvents();
        
        // Continue game loop if running
        if (this.running) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    private renderStartScreen(): void {
        // Draw background (sky)
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('CANNONDA', this.canvas.width / 2, this.canvas.height / 3);
        
        // Draw instructions
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press SPACE or ENTER to start', this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw game controls
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.fillText('Controls:', this.canvas.width / 2, this.canvas.height * 0.6);
        this.ctx.fillText('Left/Right: Move | Up: Jump/Double-Jump | Down: Shoot', 
                          this.canvas.width / 2, this.canvas.height * 0.65);
    }
    
    private updateCamera(deltaTime: number): void {
        // Advance the camera forward (right to left scrolling)
        this.cameraOffset += this.scrollSpeed * deltaTime;
    }
    
    private updateEntities(deltaTime: number): void {
        // Update player
        this.player.update(deltaTime, this.inputManager, this.addEntity.bind(this));
        
        // Keep player centered horizontally at about 30% of screen width
        const targetX = this.canvas.width * 0.3;
        this.player.position.x = targetX;
        
        // Check ground collision for player
        if (this.player.position.y + this.player.height >= this.groundLevel) {
            this.player.position = new Vector2D(
                this.player.position.x, 
                this.groundLevel - this.player.height
            );
            this.player.setOnGround(true);
        } else {
            this.player.setOnGround(false);
        }
        
        // Update all other entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            // Skip player and ground as they are updated separately
            if (entity === this.player || entity === this.ground) continue;
            
            // Update entity based on type
            if (entity.type === ObjectType.Elk) {
                (entity as Elk).update(deltaTime, this.groundLevel);
            } else if (entity.type === ObjectType.CannonTruck) {
                (entity as CannonTruck).update(deltaTime, this.spawnProjectile.bind(this));
            } else {
                entity.update(deltaTime);
            }
            
            // Apply world scrolling to all entities except player
            if (entity !== this.player) {
                entity.position.x -= this.scrollSpeed * deltaTime;
            }
            
            // Remove entities that go off-screen
            if (
                entity.position.x < -entity.width * 2 || 
                entity.position.x > this.canvas.width + entity.width * 2 ||
                entity.position.y > this.canvas.height + entity.height * 2
            ) {
                this.markEntityForRemoval(entity);
                continue;
            }
            
            // Handle collisions
            this.handleCollision(entity);
        }
    }
    
    private spawnEntities(deltaTime: number): void {
        this.spawnTimer += deltaTime;
        
        // Spawn new entities every few seconds
        if (this.spawnTimer > 2) {
            this.spawnTimer = 0;
            
            // Randomly decide what to spawn
            const spawnChoice = Math.random();
            
            if (spawnChoice < 0.4) {
                // Spawn an elk
                const elk = new Elk(
                    this.canvas.width + 50, 
                    this.groundLevel - 70
                );
                this.entities.push(elk);
            } else if (spawnChoice < 0.7) {
                // Spawn a cannon truck
                const truck = new CannonTruck(
                    this.canvas.width + 50,
                    this.groundLevel - 60
                );
                this.entities.push(truck);
            }
        }
    }
    
    private spawnProjectile(x: number, y: number, vx: number): void {
        const rock = new Rock(x, y, vx);
        this.entities.push(rock);
    }
    
    private renderEntities(): void {
        // Draw background (sky)
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mountains in background
        this.drawBackground();
        
        // Sort entities by type for proper rendering order
        const sortedEntities = [...this.entities].sort((a, b) => {
            // Render ground first, then everything else
            if (a.type === ObjectType.Ground) return -1;
            if (b.type === ObjectType.Ground) return 1;
            return 0;
        });
        
        // Render all entities
        for (const entity of sortedEntities) {
            if (entity.isActive) {
                entity.render(this.ctx);
            }
        }
    }
    
    private drawBackground(): void {
        // Draw mountains with parallax effect (slower scrolling)
        this.ctx.fillStyle = '#95a5a6';
        for (let i = 0; i < Math.ceil(this.canvas.width / 300) + 2; i++) {
            const mountainWidth = 200 + i * 50;
            const mountainHeight = 120 + i * 30;
            
            // Create parallax effect - mountains scroll at 40% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.4;
            const x = ((i * 300) - (parallaxOffset % 300)) % (this.canvas.width + 300) - 150;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundLevel);
            this.ctx.lineTo(x + mountainWidth / 2, this.groundLevel - mountainHeight);
            this.ctx.lineTo(x + mountainWidth, this.groundLevel);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw clouds with parallax effect (even slower)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < Math.ceil(this.canvas.width / 200) + 2; i++) {
            // Clouds scroll at 20% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.2;
            const x = ((i * 200) - (parallaxOffset % 200)) % (this.canvas.width + 200) - 100;
            const y = 50 + i * 20;
            this.drawCloud(x, y);
        }
    }
    
    private drawCloud(x: number, y: number): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
        this.ctx.arc(x + 30, y, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 15, y + 10, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    private handleCollision(entity: GameObject): void {
        // Skip if it's the player, ground, or not active
        if (entity === this.player || entity === this.ground || !entity.isActive) return;
        
        // Handle collisions between the player and the entity
        if (this.player.intersects(entity)) {
            if (entity.type === ObjectType.Elk) {
                // Jumped over an elk, gain score
                this.score += 100;
                entity.isActive = false;
                this.markEntityForRemoval(entity);
            } else if (entity.type === ObjectType.CannonTruck || entity.type === ObjectType.Rock) {
                // Collided with a cannon truck or rock, lose 10 rocks
                const rocksLost = Math.min(10, this.player.getRockCount());
                this.player.addRocks(-rocksLost);
                entity.isActive = false;
                this.markEntityForRemoval(entity);
                
                // Game over if no rocks left
                if (this.player.getRockCount() <= 0) {
                    // Add a small delay before showing the game over alert
                    setTimeout(() => {
                        alert(`Game Over! Your final score is ${this.score}`);
                        this.reset();
                    }, 100);
                }
            }
        }
        
        // Handle collisions between lasers and other entities
        if (entity.type === ObjectType.Laser) {
            for (const target of this.entities) {
                if (
                    (target.type === ObjectType.Elk || 
                     target.type === ObjectType.CannonTruck || 
                     target.type === ObjectType.Rock) && 
                    entity.intersects(target) && 
                    target.isActive && 
                    target !== entity
                ) {
                    // Laser hit something
                    target.isActive = false;
                    entity.isActive = false;
                    this.markEntityForRemoval(target);
                    this.markEntityForRemoval(entity);
                    
                    // If laser hit a truck, gain 5 rocks
                    if (target.type === ObjectType.CannonTruck) {
                        this.player.addRocks(5);
                        this.score += 50;
                    } else {
                        // Hit elk or rock projectile
                        this.score += 50;
                    }
                    break;
                }
            }
        }
    }
    
    private markEntityForRemoval(entity: GameObject): void {
        if (!this.entitiesToRemove.includes(entity)) {
            this.entitiesToRemove.push(entity);
        }
    }
    
    private removeMarkedEntities(): void {
        if (this.entitiesToRemove.length > 0) {
            this.entities = this.entities.filter(entity => !this.entitiesToRemove.includes(entity));
            this.entitiesToRemove = [];
        }
    }
    
    private addEntity(entity: GameObject): void {
        this.entities.push(entity);
    }
    
    private reset(): void {
        // Clear all entities except player and ground
        this.entities = [this.player, this.ground];
        this.entitiesToRemove = [];
        
        // Reset player
        this.player.reset(this.canvas.width * 0.3, this.groundLevel - 50);
        
        // Reset score
        this.score = 0;
        this.scoreElement.textContent = `Score: ${this.score}`;
        
        // Reset camera
        this.cameraOffset = 0;
        
        // Reset timers
        this.spawnTimer = 0;
        this.gameStarted = false;
    }
}
