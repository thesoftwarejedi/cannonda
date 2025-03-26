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
    
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.inputManager = new InputManager();
        this.entities = [];
        this.scoreElement = document.getElementById('score-display') as HTMLElement;
        this.groundLevel = this.canvas.height - 50;
        
        // Create ground
        this.ground = new Ground(0, this.groundLevel, this.canvas.width, 50);
        this.entities.push(this.ground);
        
        // Create player
        this.player = new Player(100, this.groundLevel - 50);
        this.entities.push(this.player);
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
        
        // Update and spawn entities
        this.updateEntities(deltaTime);
        this.spawnEntities(deltaTime);
        
        // Render everything
        this.renderEntities();
        
        // Handle input post-update
        this.inputManager.clearEvents();
        
        // Update score display
        this.scoreElement.textContent = `Score: ${this.score}`;
        
        // Continue game loop if running
        if (this.running) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    private updateEntities(deltaTime: number): void {
        // Update player
        this.player.update(deltaTime, this.inputManager, this.addEntity.bind(this));
        
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
            
            // Remove entities that go off-screen
            if (
                entity.position.x < -100 || 
                entity.position.x > this.canvas.width + 100 ||
                entity.position.y > this.canvas.height + 100
            ) {
                this.entities.splice(i, 1);
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
            entity.render(this.ctx);
        }
    }
    
    private drawBackground(): void {
        // Draw mountains
        this.ctx.fillStyle = '#95a5a6';
        for (let i = 0; i < 3; i++) {
            const mountainWidth = 200 + i * 50;
            const mountainHeight = 120 + i * 30;
            const x = (i * 300) % this.canvas.width;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundLevel);
            this.ctx.lineTo(x + mountainWidth / 2, this.groundLevel - mountainHeight);
            this.ctx.lineTo(x + mountainWidth, this.groundLevel);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 5; i++) {
            const x = (i * 200) % this.canvas.width;
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
                this.entities = this.entities.filter(e => e !== entity);
            } else if (entity.type === ObjectType.CannonTruck || entity.type === ObjectType.Rock) {
                // Collided with an obstacle, lose some rocks
                const rocksLost = Math.min(5, this.player.getRockCount());
                this.player.addRocks(-rocksLost);
                entity.isActive = false;
                this.entities = this.entities.filter(e => e !== entity);
                
                // Game over if no rocks left
                if (this.player.getRockCount() <= 0) {
                    alert(`Game Over! Your final score is ${this.score}`);
                    this.reset();
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
                    target.isActive
                ) {
                    // Laser hit something
                    target.isActive = false;
                    entity.isActive = false;
                    this.entities = this.entities.filter(e => e !== target && e !== entity);
                    this.score += 50;
                    break;
                }
            }
        }
    }
    
    private addEntity(entity: GameObject): void {
        this.entities.push(entity);
    }
    
    private reset(): void {
        // Reset the game state
        this.entities = [];
        this.score = 0;
        
        // Recreate ground
        this.ground = new Ground(0, this.groundLevel, this.canvas.width, 50);
        this.entities.push(this.ground);
        
        // Recreate player
        this.player = new Player(100, this.groundLevel - 50);
        this.entities.push(this.player);
        
        // Reset timers
        this.spawnTimer = 0;
    }
}
