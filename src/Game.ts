import { InputManager, Keys } from './Input';
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
    private scrollSpeed: number = 100; // Base speed in pixels per second
    private minScrollSpeed: number = 50;
    private maxScrollSpeed: number = 600; // Increased from 300 to 600
    private scrollAcceleration: number = 150; // Increased from 50 to 150
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
        if (!this.running) return;
        
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTime) / 1000; // convert to seconds
        this.lastTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Check for game start
        if (!this.gameStarted) {
            if (this.inputManager.isKeyPressed(Keys.Space) || this.inputManager.isKeyPressed(Keys.Enter)) {
                this.gameStarted = true;
                console.log("GAME STARTED!");
            }
            // Draw start screen
            this.renderStartScreen();
        } else {
            // Update game elements
            this.updateCamera(deltaTime);
            this.updateEntities(deltaTime);
            this.spawnEntities(deltaTime);
            this.removeMarkedEntities();
            
            // Update score display
            this.scoreElement.textContent = `Score: ${this.score} | Rocks: ${this.player.getRockCount()}`;
            
            // Check for lightning hits
            this.checkLightningHits();
            
            // Render everything
            this.renderEntities();
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
        // Handle scrolling speed controls
        if (this.gameStarted) {
            if (this.inputManager.isKeyPressed(Keys.Right)) {
                // Speed up scrolling
                this.scrollSpeed += this.scrollAcceleration * deltaTime;
                if (this.scrollSpeed > this.maxScrollSpeed) {
                    this.scrollSpeed = this.maxScrollSpeed;
                }
            } else if (this.inputManager.isKeyPressed(Keys.Left)) {
                // Slow down scrolling
                this.scrollSpeed -= this.scrollAcceleration * deltaTime;
                if (this.scrollSpeed < this.minScrollSpeed) {
                    this.scrollSpeed = this.minScrollSpeed;
                }
            }
        }
        
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
                // Pass player position to elk for lightning attacks
                (entity as Elk).update(deltaTime, this.groundLevel, this.player.position);
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
        // Draw a subtle sky gradient
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        skyGradient.addColorStop(0, '#4286f4'); // Blue at top
        skyGradient.addColorStop(1, '#c2e9fb'); // Lighter blue near horizon
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw distant mountains (blue-ish)
        this.ctx.fillStyle = '#758EA8';
        for (let i = 0; i < Math.ceil(this.canvas.width / 350) + 2; i++) {
            // Far mountains scroll at 20% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.2;
            const x = ((i * 350) - (parallaxOffset % 350)) % (this.canvas.width + 350) - 200;
            
            // Draw a more realistic mountain shape with multiple peaks
            this.drawRealisticMountain(
                x, 
                this.groundLevel, 
                350, 
                150, 
                '#758EA8', 
                '#A1BDDB'
            );
        }
        
        // Draw middle mountains (darker purplish)
        this.ctx.fillStyle = '#596C87';
        for (let i = 0; i < Math.ceil(this.canvas.width / 400) + 2; i++) {
            // Middle mountains scroll at 35% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.35;
            const x = ((i * 400) - (parallaxOffset % 400)) % (this.canvas.width + 400) - 200;
            
            this.drawRealisticMountain(
                x, 
                this.groundLevel, 
                400, 
                180, 
                '#596C87', 
                '#7A91B0'
            );
        }
        
        // Draw closer mountains (dark gray-green)
        this.ctx.fillStyle = '#3E4B5E';
        for (let i = 0; i < Math.ceil(this.canvas.width / 450) + 2; i++) {
            // Close mountains scroll at 50% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.5;
            const x = ((i * 450) - (parallaxOffset % 450)) % (this.canvas.width + 450) - 200;
            
            this.drawRealisticMountain(
                x, 
                this.groundLevel, 
                450, 
                200, 
                '#3E4B5E', 
                '#5E708B'
            );
        }
        
        // Draw realistic clouds with parallax
        for (let i = 0; i < Math.ceil(this.canvas.width / 250) + 4; i++) {
            // Clouds scroll at 15% of foreground speed
            const parallaxOffset = this.cameraOffset * 0.15;
            const x = ((i * 250) - (parallaxOffset % 250)) % (this.canvas.width + 250) - 100;
            
            // Vary cloud height and size for more realism
            const y = 50 + (i % 3) * 40;
            const scale = 0.7 + (i % 5) * 0.2;
            
            this.drawRealisticCloud(x, y, scale);
        }
    }
    
    private drawRealisticMountain(x: number, groundY: number, width: number, height: number, baseColor: string, peakColor: string): void {
        this.ctx.save();
        
        // Create a gradient for the mountain
        const gradient = this.ctx.createLinearGradient(x, groundY, x, groundY - height);
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, peakColor);
        this.ctx.fillStyle = gradient;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, groundY);
        
        // Create a realistic mountain silhouette with multiple peaks
        const segments = 20;
        const segmentWidth = width / segments;
        
        // First point
        this.ctx.lineTo(x, groundY);
        
        // Create varying peaks
        for (let i = 0; i <= segments; i++) {
            const segX = x + i * segmentWidth;
            
            // Use a sine function for natural-looking mountains
            const normalizedPos = i / segments;
            const baseHeight = Math.sin(normalizedPos * Math.PI) * height;
            
            // Add some additional variation
            let variance = 0;
            if (i > 0 && i < segments) {
                // More peaks in the middle, sloping down at edges
                variance = Math.sin(normalizedPos * Math.PI * 3) * (height * 0.2);
            }
            
            const peakHeight = Math.max(0, baseHeight + variance);
            this.ctx.lineTo(segX, groundY - peakHeight);
        }
        
        // Complete the shape
        this.ctx.lineTo(x + width, groundY);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add subtle snow caps if it's high enough
        if (height > 150) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.moveTo(x, groundY - height * 0.9);
            
            for (let i = 0; i <= segments; i++) {
                const segX = x + i * segmentWidth;
                const normalizedPos = i / segments;
                const baseHeight = Math.sin(normalizedPos * Math.PI) * height;
                let variance = 0;
                
                if (i > 0 && i < segments) {
                    variance = Math.sin(normalizedPos * Math.PI * 3) * (height * 0.2);
                }
                
                const peakHeight = Math.max(0, baseHeight + variance);
                if (peakHeight > height * 0.7) {
                    const snowCapHeight = peakHeight * 0.2;
                    this.ctx.lineTo(segX, groundY - peakHeight + snowCapHeight);
                }
            }
            
            this.ctx.lineTo(x + width, groundY - height * 0.9);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    private drawRealisticCloud(x: number, y: number, scale: number): void {
        this.ctx.save();
        
        const baseRadius = 30 * scale;
        
        // Create a subtle gradient for more realistic clouds
        const gradient = this.ctx.createRadialGradient(
            x + baseRadius, y, 0,
            x + baseRadius, y, baseRadius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        this.ctx.fillStyle = gradient;
        
        // Draw a more natural, fluffy cloud shape
        this.ctx.beginPath();
        
        // Start with a few large circles for the main body
        this.ctx.arc(x + baseRadius, y, baseRadius, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 1.6, y - baseRadius * 0.2, baseRadius * 0.8, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 2.3, y + baseRadius * 0.1, baseRadius * 1.2, 0, Math.PI * 2);
        
        // Add smaller puffs around the edges for fluffiness
        this.ctx.arc(x, y + baseRadius * 0.3, baseRadius * 0.6, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 0.7, y - baseRadius * 0.6, baseRadius * 0.7, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 1.2, y + baseRadius * 0.4, baseRadius * 0.7, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 3, y - baseRadius * 0.2, baseRadius * 0.6, 0, Math.PI * 2);
        this.ctx.arc(x + baseRadius * 3, y + baseRadius * 0.5, baseRadius * 0.5, 0, Math.PI * 2);
        
        this.ctx.fill();
        
        this.ctx.restore();
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
                
                // Make all other elk angry when you hit one of them
                this.makeAllElkAngry();
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
        
        // Handle laser hitting entities
        if (entity.type === ObjectType.Laser) {
            for (const target of this.entities) {
                if (target !== this.player && target !== this.ground && target !== entity && target.isActive) {
                    if (entity.intersects(target)) {
                        if (target.type === ObjectType.Elk) {
                            // Laser hit an elk - gain points and make all elk angry!
                            this.score += 50;
                            entity.isActive = false;
                            this.markEntityForRemoval(entity);
                            
                            // Make all elk angry and shoot lightning
                            this.makeAllElkAngry();
                        } else if (target.type === ObjectType.CannonTruck || target.type === ObjectType.Rock) {
                            // Laser hit a cannon truck or rock
                            this.score += 50;
                            entity.isActive = false;
                            this.markEntityForRemoval(entity);
                            
                            if (target.type === ObjectType.CannonTruck) {
                                // For cannon trucks, check if it's destroyed (2 hits)
                                const truck = target as CannonTruck;
                                const isDestroyed = truck.takeDamage();
                                
                                if (isDestroyed) {
                                    // Only remove and give rocks if fully destroyed
                                    target.isActive = false;
                                    this.markEntityForRemoval(target);
                                    this.player.addRocks(5);
                                }
                            } else {
                                // Rocks are destroyed in one hit
                                target.isActive = false;
                                this.markEntityForRemoval(target);
                            }
                        }
                    }
                }
            }
        }
        
        // Update score display
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${this.score} | Rocks: ${this.player.getRockCount()}`;
        }
    }
    
    private makeAllElkAngry(): void {
        // Make all elk angry and start shooting lightning
        for (const entity of this.entities) {
            if (entity.type === ObjectType.Elk && entity.isActive) {
                (entity as Elk).setAngry(true);
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
    
    private checkLightningHits(): void {
        // Loop through all elk to check their lightning
        for (const entity of this.entities) {
            if (entity.type === ObjectType.Elk && entity.isActive) {
                const elk = entity as Elk;
                
                // Check if lightning has hit the player
                if (elk.hasActiveLightning() && this.isLightningHittingPlayer(elk)) {
                    // Lightning hit! Take away 15 rocks
                    const rocksLost = Math.min(15, this.player.getRockCount());
                    this.player.addRocks(-rocksLost);
                    
                    // Mark the lightning as handled so we don't count it multiple times
                    elk.markLightningHit();
                    
                    // Game over if no rocks left
                    if (this.player.getRockCount() <= 0) {
                        setTimeout(() => {
                            alert(`Game Over! Your final score is ${this.score}`);
                            this.reset();
                        }, 100);
                    }
                }
            }
        }
    }
    
    private isLightningHittingPlayer(elk: Elk): boolean {
        // Calculate a hit box from the elk to the player
        // This assumes the lightning travels in a relatively straight line
        const elkPosition = new Vector2D(
            elk.position.x + elk.width * 0.85,
            elk.position.y - elk.height * 0.05
        );
        
        const playerCenter = new Vector2D(
            this.player.position.x + this.player.width * 0.5,
            this.player.position.y + this.player.height * 0.5
        );
        
        // Check if the lightning is active and the player is in the path
        return elk.isLightningActive() && 
               playerCenter.x > elk.position.x && 
               playerCenter.x < elkPosition.x + 300; // Lightning range
    }
}
