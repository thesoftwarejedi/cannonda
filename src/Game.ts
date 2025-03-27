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
    private cannonTrucksSpawned: number = 0; // Track number of cannon trucks spawned
    private cannonTrucksDestroyed: number = 0; // Track number of cannon trucks destroyed
    private reachedFernie: boolean = false; // Track if player has reached Fernie Alpine Ski Resort
    
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
            console.log("Game started and running");
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
        } else if (this.reachedFernie) {
            // Show victory screen if we've reached Fernie
            this.renderFernieVictoryScreen();
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
        // Check if we've reached Fernie Alpine Ski Resort
        if (this.cannonTrucksDestroyed >= 25 && !this.reachedFernie) {
            this.reachedFernie = true;
            
            // Don't stop the game, just change state to show victory screen
            // this.running = false; // REMOVED THIS LINE
            
            // Show Fernie Alpine Ski Resort
            console.log("VICTORY! Reached Fernie Alpine Resort!");
        }
        
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
        
        // Spawn new entities at random intervals
        if (this.spawnTimer >= 2) { // Every 2 seconds
            this.spawnTimer = 0;
            
            // Random chance to spawn different entity types
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
                
                // After 15 cannon trucks, make them twice as big
                if (this.cannonTrucksSpawned >= 15) {
                    truck.setSize(180, 120); // Double the original size (90x60)
                    console.log("Super cannon truck spawned!");
                }
                
                this.entities.push(truck);
                this.cannonTrucksSpawned++;
            }
        }
    }
    
    private spawnProjectile(x: number, y: number, vx: number): void {
        const rock = new Rock(x, y, vx);
        this.entities.push(rock);
    }
    
    private renderEntities(): void {
        // Draw background (sky)
        this.ctx.fillStyle = this.reachedFernie ? '#CAEAFA' : '#87CEEB'; // Lighter blue for Fernie
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mountains in background
        if (this.reachedFernie) {
            this.drawFernieMountains();
        } else {
            this.drawBackground();
        }
        
        // Draw ground
        this.ctx.fillStyle = this.reachedFernie ? '#FFFFFF' : '#8BC34A'; // Snow at Fernie
        this.ctx.fillRect(0, this.groundLevel, this.canvas.width, this.canvas.height - this.groundLevel);
        
        // Update score display to show progress to Fernie
        if (this.scoreElement && !this.reachedFernie) {
            this.scoreElement.textContent = `Score: ${this.score} | Rocks: ${this.player.getRockCount()} | Fernie: ${this.cannonTrucksDestroyed}/25`;
        } else if (this.scoreElement && this.reachedFernie) {
            this.scoreElement.textContent = `Score: ${this.score} | Rocks: ${this.player.getRockCount()} | Fernie Alpine Resort!`;
        }
        
        // Render all game entities
        for (const entity of this.entities) {
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
                                // Since cannon trucks now die in one hit, we can simplify this logic
                                target.isActive = false;
                                this.markEntityForRemoval(target);
                                this.player.addRocks(5);
                                this.cannonTrucksDestroyed++;
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
        this.cannonTrucksSpawned = 0;
        this.cannonTrucksDestroyed = 0;
    }
    
    private checkLightningHits(): void {
        // Loop through all elk to check their lightning
        for (const entity of this.entities) {
            if (entity.type === ObjectType.Elk && entity.isActive) {
                const elk = entity as Elk;
                
                // Check if lightning has hit the player
                if (elk.hasActiveLightning() && this.isLightningHittingPlayer(elk)) {
                    // Lightning hit! Take away 2 rocks
                    const rocksLost = Math.min(2, this.player.getRockCount());
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
        
        // Debug lightning detection
        console.log(`Lightning check: Elk at ${elk.position.x}, Player at ${playerCenter.x}, Lightning active: ${elk.isLightningActive()}`);
        
        // Make the hit detection more generous - lightning has a wide area effect
        return elk.isLightningActive() && 
               Math.abs(playerCenter.x - elk.position.x) < 400; // Increased range and simplified check
    }
    
    private renderFernieBackground(): void {
        // Draw a special background for Fernie Alpine Ski Resort
        this.ctx.fillStyle = '#8B9467';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mountains in background
        this.drawFernieMountains();
    }
    
    private drawFernieMountains(): void {
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
    }
    
    private renderFernieVictoryScreen(): void {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create a more vibrant gradient background
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        skyGradient.addColorStop(0, '#1a5bc4');  // Richer blue at top
        skyGradient.addColorStop(0.5, '#3d8bd9'); // Mid blue
        skyGradient.addColorStop(0.8, '#7ab8ff');  // Light blue near horizon
        skyGradient.addColorStop(1, '#c4e3ff');  // Almost white at horizon
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add sun
        this.ctx.fillStyle = '#ffdd1f';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width * 0.8, 120, 60, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add sun glow
        const sunGlow = this.ctx.createRadialGradient(
            this.canvas.width * 0.8, 120, 30,
            this.canvas.width * 0.8, 120, 120
        );
        sunGlow.addColorStop(0, 'rgba(255, 221, 31, 0.8)');
        sunGlow.addColorStop(0.5, 'rgba(255, 221, 31, 0.2)');
        sunGlow.addColorStop(1, 'rgba(255, 221, 31, 0)');
        this.ctx.fillStyle = sunGlow;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width * 0.8, 120, 120, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw more realistic snow ground with sparkles
        const groundGradient = this.ctx.createLinearGradient(0, this.groundLevel, 0, this.canvas.height);
        groundGradient.addColorStop(0, '#ffffff');  // Pure white at top
        groundGradient.addColorStop(1, '#e3f2fd');  // Slight blue tint at bottom
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.groundLevel, this.canvas.width, this.canvas.height - this.groundLevel);
        
        // Add snow sparkles
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.groundLevel + Math.random() * (this.canvas.height - this.groundLevel);
            const size = Math.random() * 3 + 1;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw epic mountains with better shading
        this.drawEpicFerniePeaks();
        
        // Draw improved ski lodge
        this.drawFancySkiLodge();
        
        // Draw better ski lifts
        this.drawDetailedSkiLifts();
        
        // Draw skiers on the slopes
        this.drawSkiers();
        
        // Draw more realistic trees
        this.drawFancyTrees();
        
        // Add falling snow
        this.drawFallingSnow();
        
        // Create a banner for text
        this.ctx.fillStyle = 'rgba(59, 89, 152, 0.85)';  // Facebook blue with transparency
        this.ctx.fillRect(0, 80, this.canvas.width, 170);
        
        // Add a gold border to the banner
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(10, 90, this.canvas.width - 20, 150);
        
        // Draw victory text with better styling
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Create text gradient
        const textGradient = this.ctx.createLinearGradient(
            this.canvas.width/2 - 100, 140, 
            this.canvas.width/2 + 100, 140
        );
        textGradient.addColorStop(0, '#f9d423');  // Gold
        textGradient.addColorStop(1, '#f83600');  // Orange-red
        
        // Add glow effect
        this.ctx.shadowColor = '#f9d423';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, 140);
        
        // Draw subtitle with style
        this.ctx.shadowBlur = 10;
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('You reached Fernie Alpine Ski Resort!', this.canvas.width / 2, 190);
        
        // Reset shadow for rest of text
        this.ctx.shadowBlur = 0;
        
        // Add score info with better styling
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Final Score: ${this.score} | Rocks Remaining: ${this.player.getRockCount()}`, this.canvas.width / 2, 270);
        
        // Draw restart instructions with better contrast
        this.ctx.font = 'bold 22px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 8;
        this.ctx.fillText('Refresh the page to play again', this.canvas.width / 2, this.canvas.height - 30);
        this.ctx.shadowBlur = 0;
    }
    
    private drawEpicFerniePeaks(): void {
        // Create a much more impressive mountain range
        
        // Realistic mountain gradient with snow caps
        const mountainGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        mountainGradient.addColorStop(0, '#FFFFFF');  // Bright white snow caps
        mountainGradient.addColorStop(0.3, '#E8F5FD'); // Light snow 
        mountainGradient.addColorStop(0.5, '#A9BCD1'); // Light rocky area
        mountainGradient.addColorStop(0.7, '#4C6785'); // Dark blue-gray rocks
        mountainGradient.addColorStop(1, '#2E3F53');   // Dark base
        
        // First peak (left) - The Lizard Range
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundLevel);
        
        // Create a more jagged and realistic mountain shape
        this.ctx.lineTo(50, this.groundLevel - 100);
        this.ctx.lineTo(120, this.groundLevel - 180);
        this.ctx.lineTo(180, this.groundLevel - 240); // Minor peak
        this.ctx.lineTo(240, this.groundLevel - 210);
        this.ctx.lineTo(300, this.groundLevel - 280); // Second peak
        this.ctx.lineTo(350, this.groundLevel - 220);
        this.ctx.lineTo(400, this.groundLevel - 150);
        this.ctx.lineTo(450, this.groundLevel);
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow highlights with subtle gradient
        const snowGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel - 150);
        snowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        snowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(120, this.groundLevel - 180);
        this.ctx.lineTo(180, this.groundLevel - 240);
        this.ctx.lineTo(240, this.groundLevel - 210);
        this.ctx.lineTo(300, this.groundLevel - 280);
        this.ctx.lineTo(280, this.groundLevel - 250);
        this.ctx.lineTo(220, this.groundLevel - 190);
        this.ctx.lineTo(180, this.groundLevel - 220);
        this.ctx.lineTo(140, this.groundLevel - 170);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Second peak (middle) - Polar Peak (tallest)
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(400, this.groundLevel);
        this.ctx.lineTo(450, this.groundLevel - 120);
        this.ctx.lineTo(500, this.groundLevel - 300); // Highest peak
        this.ctx.lineTo(550, this.groundLevel - 260);
        this.ctx.lineTo(600, this.groundLevel - 200);
        this.ctx.lineTo(650, this.groundLevel);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow cap to middle peak
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(470, this.groundLevel - 250);
        this.ctx.lineTo(500, this.groundLevel - 300);
        this.ctx.lineTo(530, this.groundLevel - 270);
        this.ctx.lineTo(510, this.groundLevel - 240);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Third peak (right) - Siberia Ridge
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(600, this.groundLevel);
        this.ctx.lineTo(650, this.groundLevel - 150);
        this.ctx.lineTo(700, this.groundLevel - 220);
        this.ctx.lineTo(750, this.groundLevel - 260); // Peak
        this.ctx.lineTo(800, this.groundLevel - 220);
        this.ctx.lineTo(850, this.groundLevel - 160);
        this.ctx.lineTo(900, this.groundLevel);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow cap to right peak
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(720, this.groundLevel - 240);
        this.ctx.lineTo(750, this.groundLevel - 260);
        this.ctx.lineTo(780, this.groundLevel - 230);
        this.ctx.lineTo(760, this.groundLevel - 210);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add mountain contour lines for more realism
        this.ctx.strokeStyle = 'rgba(70, 90, 120, 0.3)';
        this.ctx.lineWidth = 1;
        
        // Left peak contours
        for (let y = 50; y < 200; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(100, this.groundLevel - y);
            this.ctx.quadraticCurveTo(200, this.groundLevel - y - 50, 300, this.groundLevel - y + 20);
            this.ctx.stroke();
        }
        
        // Middle peak contours
        for (let y = 100; y < 250; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(450, this.groundLevel - y);
            this.ctx.quadraticCurveTo(500, this.groundLevel - y - 30, 550, this.groundLevel - y + 10);
            this.ctx.stroke();
        }
        
        // Right peak contours
        for (let y = 80; y < 220; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(700, this.groundLevel - y);
            this.ctx.quadraticCurveTo(750, this.groundLevel - y - 20, 800, this.groundLevel - y + 10);
            this.ctx.stroke();
        }
    }
    
    private drawFancySkiLodge(): void {
        // Draw a much fancier ski lodge
        const x = this.canvas.width * 0.15;
        const y = this.groundLevel - 120;
        const width = this.canvas.width * 0.18;
        const height = 120;
        
        // Main lodge structure with perspective
        this.ctx.fillStyle = '#6B4226'; // Rich wood color
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height); // Bottom left
        this.ctx.lineTo(x, y); // Top left
        this.ctx.lineTo(x + width, y - 20); // Top right (higher for perspective)
        this.ctx.lineTo(x + width, y + height - 20); // Bottom right (higher for perspective)
        this.ctx.closePath();
        this.ctx.fill();
        
        // Decorative wooden beams
        this.ctx.fillStyle = '#8B5A2B'; // Lighter wood color
        for (let i = 0; i < 5; i++) {
            this.ctx.fillRect(
                x + (width * 0.2) * i,
                y,
                10,
                height
            );
        }
        
        // Roof with snow
        this.ctx.fillStyle = '#5D4037'; // Dark brown roof
        this.ctx.beginPath();
        this.ctx.moveTo(x - 20, y); // Left overhang
        this.ctx.lineTo(x + width * 0.5, y - 70); // Peak
        this.ctx.lineTo(x + width + 20, y - 20); // Right overhang
        this.ctx.lineTo(x + width, y - 20); // Top right corner
        this.ctx.lineTo(x, y); // Top left corner
        this.ctx.closePath();
        this.ctx.fill();
        
        // Snow on the roof
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 20, y); // Left edge
        this.ctx.lineTo(x + width * 0.5, y - 70); // Peak
        this.ctx.lineTo(x + width + 20, y - 20); // Right edge
        
        // Wavy snow edge
        for (let i = 0; i <= 10; i++) {
            const waveX = x - 20 + ((width + 40) * i / 10);
            const baseY = i < 5 ? y - (i * 14) : y - (70 - (i - 5) * 10);
            const waveY = baseY - Math.sin(i * 0.5) * 10;
            this.ctx.lineTo(waveX, waveY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Windows
        this.ctx.fillStyle = '#4FC3F7'; // Light blue windows
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.fillRect(
                    x + 25 + (i * 50),
                    y + 20 + (j * 40),
                    30,
                    25
                );
                
                // Window frames
                this.ctx.strokeStyle = '#5D4037';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    x + 25 + (i * 50),
                    y + 20 + (j * 40),
                    30,
                    25
                );
                
                // Window cross
                this.ctx.beginPath();
                this.ctx.moveTo(x + 25 + (i * 50) + 15, y + 20 + (j * 40));
                this.ctx.lineTo(x + 25 + (i * 50) + 15, y + 20 + (j * 40) + 25);
                this.ctx.moveTo(x + 25 + (i * 50), y + 20 + (j * 40) + 12.5);
                this.ctx.lineTo(x + 25 + (i * 50) + 30, y + 20 + (j * 40) + 12.5);
                this.ctx.stroke();
            }
        }
        
        // Door
        this.ctx.fillStyle = '#5D4037'; // Dark brown door
        this.ctx.fillRect(
            x + width * 0.4,
            y + height - 50,
            width * 0.2,
            50
        );
        
        // Door handle
        this.ctx.fillStyle = '#FFC107'; // Gold
        this.ctx.beginPath();
        this.ctx.arc(
            x + width * 0.55,
            y + height - 30,
            5,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Chimney with stone texture
        this.ctx.fillStyle = '#7D7D7D'; // Gray chimney
        this.ctx.fillRect(
            x + width * 0.2,
            y - 100,
            width * 0.1,
            100
        );
        
        // Stone texture on chimney
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if ((i + j) % 2 === 0) {
                    this.ctx.fillStyle = '#555555';
                } else {
                    this.ctx.fillStyle = '#777777';
                }
                
                this.ctx.fillRect(
                    x + width * 0.2 + (j * width * 0.01),
                    y - 100 + (i * 10),
                    width * 0.01,
                    10
                );
            }
        }
        
        // Smoke from chimney
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(x + width * 0.25, y - 110, 8, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.25 - 5, y - 125, 10, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.25 - 10, y - 145, 12, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.25 - 15, y - 170, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Lodge sign
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(
            x + width * 0.3,
            y - 20,
            width * 0.4,
            15
        );
        
        this.ctx.fillStyle = '#FFC107'; // Gold letters
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('FERNIE ALPINE LODGE', x + width * 0.5, y - 12);
    }
    
    private drawDetailedSkiLifts(): void {
        // Draw a simple chairlift going up the rightmost mountain
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        // Draw lift cable
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width * 0.6, this.groundLevel - 10);
        this.ctx.lineTo(this.canvas.width * 0.75, this.groundLevel * 0.4);
        this.ctx.stroke();
        
        // Draw lift towers
        this.drawLiftTower(this.canvas.width * 0.65, this.groundLevel - 50, 60);
        this.drawLiftTower(this.canvas.width * 0.7, this.groundLevel - 100, 80);
        
        // Draw a few chairs on the lift
        this.drawChair(this.canvas.width * 0.63, this.groundLevel - 40);
        this.drawChair(this.canvas.width * 0.68, this.groundLevel - 80);
        this.drawChair(this.canvas.width * 0.73, this.groundLevel - 120);
    }
    
    private drawLiftTower(x: number, y: number, height: number): void {
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 6;
        
        // Main support
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Cross support
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y + 20);
        this.ctx.lineTo(x + 10, y);
        this.ctx.stroke();
    }
    
    private drawChair(x: number, y: number): void {
        // Chair lift seat
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x - 10, y, 20, 5);
        
        // Support bar
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 15);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }
    
    private drawSkiers(): void {
        // Draw several skiers on the slopes
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.groundLevel - Math.random() * 200 - 50;
            
            // Draw colorful skier body
            this.ctx.fillStyle = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'][Math.floor(Math.random() * 5)];
            this.ctx.beginPath();
            this.ctx.arc(x, y, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw skier's head
            this.ctx.fillStyle = '#F5DEB3'; // Wheat color for face
            this.ctx.beginPath();
            this.ctx.arc(x, y - 10, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw skis
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 15, y + 10);
            this.ctx.lineTo(x + 15, y + 10);
            this.ctx.stroke();
            
            // Draw ski poles
            this.ctx.strokeStyle = '#555555';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 5, y - 5);
            this.ctx.lineTo(x - 10, y + 15);
            this.ctx.moveTo(x + 5, y - 5);
            this.ctx.lineTo(x + 10, y + 15);
            this.ctx.stroke();
            
            // Draw skier's trail
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            // Wavy trail pattern
            const trailLength = Math.random() * 100 + 50;
            const startX = x;
            const startY = y + 10;
            
            this.ctx.moveTo(startX, startY);
            for (let j = 0; j < trailLength; j += 10) {
                const waveX = startX + Math.sin(j * 0.1) * 10;
                const waveY = startY + j;
                this.ctx.lineTo(waveX, waveY);
            }
            
            this.ctx.stroke();
        }
    }
    
    private drawFancyTrees(): void {
        // Draw several pine trees at the base of mountains
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.groundLevel - Math.random() * 10 - 10;
            const height = Math.random() * 30 + 40;
            const width = height * 0.6;
            
            this.drawPineTree(x, y, width, height);
        }
    }
    
    private drawFallingSnow(): void {
        // Draw falling snowflakes
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 2 + 1;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    private drawPineTree(x: number, y: number, width: number, height: number): void {
        // Tree trunk
        this.ctx.fillStyle = '#8B4513'; // Brown
        this.ctx.fillRect(x - width/10, y - height/5, width/5, height/5);
        
        // Tree foliage (triangles stacked)
        this.ctx.fillStyle = '#0A5F38'; // Dark green
        
        // Bottom triangle (largest)
        this.ctx.beginPath();
        this.ctx.moveTo(x - width/2, y - height/5);
        this.ctx.lineTo(x, y - height/2);
        this.ctx.lineTo(x + width/2, y - height/5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Middle triangle
        this.ctx.beginPath();
        this.ctx.moveTo(x - width*0.4, y - height/2);
        this.ctx.lineTo(x, y - height*0.75);
        this.ctx.lineTo(x + width*0.4, y - height/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Top triangle (smallest)
        this.ctx.beginPath();
        this.ctx.moveTo(x - width*0.3, y - height*0.75);
        this.ctx.lineTo(x, y - height);
        this.ctx.lineTo(x + width*0.3, y - height*0.75);
        this.ctx.closePath();
        this.ctx.fill();
    }
}
