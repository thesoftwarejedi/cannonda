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
    private playerDead: boolean = false; // Track if player has died from elk collision
    private explosionActive: boolean = false; // Track if explosion animation is active
    private explosionTimer: number = 0; // Timer for explosion animation
    private explosionDuration: number = 2.5; // Increased duration for more dramatic explosion effect
    private explosionParticles: {x: number, y: number, vx: number, vy: number, size: number, color: string, lifetime: number}[] = [];
    private frameTime: number = 0;
    // Screen shake effect properties
    private screenShakeActive: boolean = false;
    private screenShakeIntensity: number = 0;
    private screenShakeDuration: number = 0;
    private screenShakeTimer: number = 0;
    private screenShakeOffsetX: number = 0;
    private screenShakeOffsetY: number = 0;
    
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
        
        // Create player - ensure wheels sit ON the ground, not IN it
        const playerHeight = 50; // Player height is 50 pixels
        const wheelRadius = playerHeight * 0.2; // Wheel radius is 20% of height
        this.player = new Player(this.canvas.width * 0.3, this.groundLevel - playerHeight - wheelRadius);
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
                // Position player with wheels on ground - account for wheel radius (20% of player height)
                const wheelRadius = this.player.height * 0.2;
                this.player.position.y = this.groundLevel - this.player.height - wheelRadius;
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
        this.frameTime = deltaTime; // Store for explosion animation
        this.lastTime = timestamp;
        
        // Update screen shake effect if active
        if (this.screenShakeActive) {
            this.updateScreenShake();
        }
        
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
        } else if (this.explosionActive) {
            // Apply screen shake effect if active
            if (this.screenShakeActive) {
                this.ctx.save();
                this.ctx.translate(this.screenShakeOffsetX, this.screenShakeOffsetY);
            }
            
            // Draw the background including scrolling mountains but hide player
            this.drawBackground();
            this.renderEntities(true); // Pass true to hide the player
            
            // Render explosion animation with dramatic fire and lava effects
            this.renderExplosion();
            
            // Restore context if screen shake was applied
            if (this.screenShakeActive) {
                this.ctx.restore();
            }
            
            // After explosion ends, show game over
            if (this.explosionTimer >= this.explosionDuration) {
                this.explosionActive = false;
                this.playerDead = true;
            }
        } else if (this.playerDead) {
            // Show game over screen when player hits an elk
            this.renderGameOverScreen();
            
            // Check for user input to restart
            if (this.inputManager.isKeyPressed(Keys.Space) || this.inputManager.isKeyPressed(Keys.Enter)) {
                this.playerDead = false;
                this.reset();
            }
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
        if (this.cannonTrucksDestroyed >= 5 && !this.reachedFernie) {
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
        
        // Check ground collision for player - account for wheel radius (20% of player height)
        const wheelRadius = this.player.height * 0.2;
        const groundCollisionY = this.groundLevel - this.player.height - wheelRadius;
        
        if (this.player.position.y > groundCollisionY) {
            this.player.position.y = groundCollisionY;
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
    
    private renderEntities(hidePlayer: boolean = false): void {
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
            if (entity.isActive && (entity !== this.player || !hidePlayer)) {
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
                // Hitting an elk creates an explosion and ends the game
                entity.isActive = false;
                this.markEntityForRemoval(entity);
                
                // Create explosion effect with dramatic particles
                this.createExplosion();
                
                // Make the player invisible during explosion
                this.player.isActive = false;
                
                // Set explosion active flag and reset timer
                this.explosionActive = true;
                this.explosionTimer = 0;
                
                // Make all other elk angry when you hit one of them
                this.makeAllElkAngry();
                
                // Play sound effect (if we had audio)
                // this.playExplosionSound();
                
                // Shake the screen for more dramatic effect
                this.shakeScreen();
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
        
        // Reset player - ensure wheels are properly positioned on the ground
        const wheelRadius = this.player.height * 0.2; // Wheel radius is 20% of player height
        this.player.reset(this.canvas.width * 0.3, this.groundLevel - this.player.height - wheelRadius);
        this.player.isActive = true; // Make player visible again
        
        // Reset score
        this.score = 0;
        this.scoreElement.textContent = `Score: ${this.score} | Rocks: ${this.player.getRockCount()}`;
        
        // Reset camera
        this.cameraOffset = 0;
        
        // Reset timers
        this.spawnTimer = 0;
        this.gameStarted = true;  // Keep game started when respawning
        this.cannonTrucksSpawned = 0;
        this.cannonTrucksDestroyed = 0;
        this.playerDead = false;  // Reset player dead state
        this.reachedFernie = false;  // Reset reached Fernie state
        
        // Reset explosion state
        this.explosionActive = false;
        this.explosionTimer = 0;
        this.explosionParticles = [];
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
        // Create a vibrant background gradient for sky
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        skyGradient.addColorStop(0, '#1A237E'); // Deep blue at top
        skyGradient.addColorStop(0.5, '#5C6BC0'); // Mid-tone purple-blue
        skyGradient.addColorStop(0.7, '#FFA726'); // Orange glow near horizon
        skyGradient.addColorStop(0.9, '#FFECB3'); // Light yellow at horizon
        
        // Fill background with gradient sky
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a bright sun
        this.drawSun();
        
        // Draw the epic mountain range with snow peaks
        this.drawEpicFerniePeaks();
        
        // Draw snow ground
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, this.groundLevel, this.canvas.width, this.canvas.height - this.groundLevel);
        
        // Draw sparkles on snow
        this.drawSnowSparkles();
        
        // Draw ski lodge
        this.drawFancySkiLodge();
        
        // Draw ski lifts
        this.drawDetailedSkiLifts();
        
        // Draw skiers on the slopes
        this.drawSkiers();
        
        // Add victory banner
        this.drawVictoryBanner();
        
        // Add falling snow effect
        this.drawFallingSnow();
        
        // Add celebratory fireworks
        this.drawVictoryFireworks();
    }
    
    private drawVictoryBanner(): void {
        // Draw a large decorative banner across the top
        const bannerY = 100;
        
        // Create gradient for banner
        const bannerGradient = this.ctx.createLinearGradient(0, bannerY - 60, 0, bannerY + 60);
        bannerGradient.addColorStop(0, '#D4AF37'); // Gold
        bannerGradient.addColorStop(0.5, '#FFF8DC'); // Light gold
        bannerGradient.addColorStop(1, '#D4AF37'); // Gold
        
        // Banner background
        this.ctx.fillStyle = bannerGradient;
        this.ctx.fillRect(this.canvas.width * 0.1, bannerY - 60, this.canvas.width * 0.8, 120);
        
        // Banner border
        this.ctx.strokeStyle = '#8B4513'; // Brown border
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(this.canvas.width * 0.1, bannerY - 60, this.canvas.width * 0.8, 120);
        
        // Victory text with shadow
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText('VICTORY!', this.canvas.width / 2 + 4, bannerY + 4);
        
        // Main text with gradient
        const textGradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 150, bannerY,
            this.canvas.width / 2 + 150, bannerY
        );
        textGradient.addColorStop(0, '#8B0000'); // Dark red
        textGradient.addColorStop(0.5, '#FF0000'); // Bright red
        textGradient.addColorStop(1, '#8B0000'); // Dark red
        
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, bannerY);
        
        // Display stats
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#333';
        
        // Player stats
        this.ctx.fillText(
            `Cannon Trucks Destroyed: ${this.cannonTrucksDestroyed} | Remaining Rocks: ${this.player.getRockCount()}`,
            this.canvas.width / 2,
            bannerY + 50
        );
        
        // Decorative stars
        for (let i = 0; i < 5; i++) {
            this.drawStar(
                this.canvas.width * 0.2 + (this.canvas.width * 0.6 * i / 4),
                bannerY - 40,
                15,
                '#FFD700'
            );
        }
    }
    
    private drawStar(x: number, y: number, size: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        
        // Draw a 5-point star
        for (let i = 0; i < 5; i++) {
            const outerX = x + size * Math.cos((i * 2 * Math.PI / 5) - Math.PI / 2);
            const outerY = y + size * Math.sin((i * 2 * Math.PI / 5) - Math.PI / 2);
            
            const innerX = x + (size / 2) * Math.cos(((i * 2 + 1) * Math.PI / 5) - Math.PI / 2);
            const innerY = y + (size / 2) * Math.sin(((i * 2 + 1) * Math.PI / 5) - Math.PI / 2);
            
            if (i === 0) {
                this.ctx.moveTo(outerX, outerY);
            } else {
                this.ctx.lineTo(outerX, outerY);
            }
            
            this.ctx.lineTo(innerX, innerY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add sparkle to center
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    private drawVictoryFireworks(): void {
        // Draw celebratory fireworks
        const fireworksCount = 5;
        const currentTime = Date.now() / 1000;
        
        for (let i = 0; i < fireworksCount; i++) {
            const x = (this.canvas.width / (fireworksCount + 1)) * (i + 1);
            const y = this.groundLevel - 300 - (Math.sin(currentTime + i) * 50);
            const size = 20 + (Math.sin(currentTime * 2 + i) * 10);
            const hue = (currentTime * 50 + i * 50) % 360;
            
            // Firework burst
            for (let j = 0; j < 16; j++) {
                const angle = (j / 16) * Math.PI * 2;
                const burstLength = size * (0.5 + Math.sin(currentTime * 3 + i + j) * 0.5);
                
                const startX = x;
                const startY = y;
                const endX = x + Math.cos(angle) * burstLength;
                const endY = y + Math.sin(angle) * burstLength;
                
                // Create gradient for each ray
                const rayGradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
                rayGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 1)`);
                rayGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
                
                this.ctx.strokeStyle = rayGradient;
                this.ctx.lineWidth = 2 + Math.sin(currentTime * 5 + i + j);
                
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
            
            // Firework center
            this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.8)`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    private drawSun(): void {
        // Draw a bright sun
        this.ctx.fillStyle = '#FFD700';
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
    }
    
    private drawEpicFerniePeaks(): void {
        // Create a much more impressive and bigger mountain range
        
        // Realistic mountain gradient with snow caps
        const mountainGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        mountainGradient.addColorStop(0, '#FFFFFF');  // Bright white snow caps
        mountainGradient.addColorStop(0.3, '#E8F5FD'); // Light snow 
        mountainGradient.addColorStop(0.5, '#A9BCD1'); // Light rocky area
        mountainGradient.addColorStop(0.7, '#4C6785'); // Dark blue-gray rocks
        mountainGradient.addColorStop(1, '#2E3F53');   // Dark base
        
        // First peak (left) - The Lizard Range - BIGGER
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundLevel);
        
        // Create a more jagged and realistic mountain shape
        this.ctx.lineTo(30, this.groundLevel - 150);
        this.ctx.lineTo(100, this.groundLevel - 300);
        this.ctx.lineTo(180, this.groundLevel - 350); // Minor peak
        this.ctx.lineTo(240, this.groundLevel - 310);
        this.ctx.lineTo(300, this.groundLevel - 420); // Second peak - much taller
        this.ctx.lineTo(350, this.groundLevel - 350);
        this.ctx.lineTo(400, this.groundLevel - 250);
        this.ctx.lineTo(450, this.groundLevel);
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow highlights with subtle gradient
        const snowGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel - 150);
        snowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        snowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(100, this.groundLevel - 300);
        this.ctx.lineTo(180, this.groundLevel - 350);
        this.ctx.lineTo(240, this.groundLevel - 310);
        this.ctx.lineTo(300, this.groundLevel - 420);
        this.ctx.lineTo(280, this.groundLevel - 390);
        this.ctx.lineTo(220, this.groundLevel - 290);
        this.ctx.lineTo(180, this.groundLevel - 330);
        this.ctx.lineTo(120, this.groundLevel - 280);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Second peak (middle) - Polar Peak (tallest)
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(400, this.groundLevel);
        this.ctx.lineTo(450, this.groundLevel - 220);
        this.ctx.lineTo(500, this.groundLevel - 450); // Highest peak - much taller
        this.ctx.lineTo(550, this.groundLevel - 380);
        this.ctx.lineTo(600, this.groundLevel - 300);
        this.ctx.lineTo(650, this.groundLevel);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow cap to middle peak
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(470, this.groundLevel - 380);
        this.ctx.lineTo(500, this.groundLevel - 450);
        this.ctx.lineTo(530, this.groundLevel - 400);
        this.ctx.lineTo(510, this.groundLevel - 360);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Third peak (right) - Siberia Ridge
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(600, this.groundLevel);
        this.ctx.lineTo(650, this.groundLevel - 220);
        this.ctx.lineTo(700, this.groundLevel - 350);
        this.ctx.lineTo(750, this.groundLevel - 400); // Peak - much taller
        this.ctx.lineTo(800, this.groundLevel - 330);
        this.ctx.lineTo(850, this.groundLevel - 220);
        this.ctx.lineTo(900, this.groundLevel);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow cap to right peak
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(720, this.groundLevel - 370);
        this.ctx.lineTo(750, this.groundLevel - 400);
        this.ctx.lineTo(780, this.groundLevel - 350);
        this.ctx.lineTo(760, this.groundLevel - 330);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Fourth peak (far right) - Currie Bowl
        this.ctx.fillStyle = mountainGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(850, this.groundLevel);
        this.ctx.lineTo(900, this.groundLevel - 180);
        this.ctx.lineTo(950, this.groundLevel - 320);
        this.ctx.lineTo(980, this.groundLevel - 380); // Peak
        this.ctx.lineTo(1020, this.groundLevel - 280);
        this.ctx.lineTo(1050, this.groundLevel - 200);
        this.ctx.lineTo(this.canvas.width, this.groundLevel - 230);
        this.ctx.lineTo(this.canvas.width, this.groundLevel);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add snow cap to far right peak
        this.ctx.fillStyle = snowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(950, this.groundLevel - 320);
        this.ctx.lineTo(980, this.groundLevel - 380);
        this.ctx.lineTo(1020, this.groundLevel - 280);
        this.ctx.lineTo(990, this.groundLevel - 290);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add mountain contour lines for more realism
        this.ctx.strokeStyle = 'rgba(70, 90, 120, 0.3)';
        this.ctx.lineWidth = 1;
        
        // Left peak contours
        for (let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(100, this.groundLevel - i * 30);
            this.ctx.quadraticCurveTo(200, this.groundLevel - i * 30 - 70, 300, this.groundLevel - i * 30 + 30);
            this.ctx.stroke();
        }
        
        // Middle peak contours
        for (let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(450, this.groundLevel - i * 30);
            this.ctx.lineTo(500, this.groundLevel - i * 30 - 50);
            this.ctx.lineTo(550, this.groundLevel - i * 30 + 20);
            this.ctx.stroke();
        }
        
        // Right peak contours
        for (let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(700, this.groundLevel - i * 30);
            this.ctx.lineTo(750, this.groundLevel - i * 30 - 40);
            this.ctx.lineTo(800, this.groundLevel - i * 30 + 20);
            this.ctx.stroke();
        }
        
        // Far right peak contours
        for (let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(950, this.groundLevel - i * 30);
            this.ctx.lineTo(980, this.groundLevel - i * 30 - 30);
            this.ctx.lineTo(1020, this.groundLevel - i * 30 + 20);
            this.ctx.stroke();
        }
    }
    
    private drawFancySkiLodge(): void {
        // Draw a realistic alpine ski lodge
        
        // Lodge positioning
        const x = this.canvas.width * 0.15;
        const y = this.groundLevel - 120;
        const width = this.canvas.width * 0.25; // Make lodge wider
        const height = 130; // Make lodge taller
        
        // Create a more realistic stone and wood texture for the main building
        const lodgeGradient = this.ctx.createLinearGradient(x, y, x, y + height);
        lodgeGradient.addColorStop(0, '#8B5A2B'); // Light warm wood at top
        lodgeGradient.addColorStop(0.6, '#6B4226'); // Medium wood
        lodgeGradient.addColorStop(1, '#5D4037');   // Dark base
        
        // Main lodge structure - wider, more realistic alpine shape
        this.ctx.fillStyle = lodgeGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height); // Bottom left
        this.ctx.lineTo(x, y); // Top left
        this.ctx.lineTo(x + width, y - 30); // Top right with proper alpine slant
        this.ctx.lineTo(x + width, y + height - 30); // Bottom right
        this.ctx.closePath();
        this.ctx.fill();
        
        // Stone foundation
        const stoneHeight = 40;
        this.ctx.fillStyle = '#6D6D6D'; // Base gray
        this.ctx.fillRect(x, y + height - stoneHeight, width, stoneHeight);
        
        // Stone texture
        for (let i = 0; i < width; i += 15) {
            for (let j = 0; j < stoneHeight; j += 10) {
                this.ctx.fillStyle = Math.random() > 0.5 ? '#5A5A5A' : '#7A7A7A';
                this.ctx.fillRect(
                    x + i + Math.random() * 5,
                    y + height - stoneHeight + j + Math.random() * 5,
                    10 + Math.random() * 5,
                    5 + Math.random() * 10
                );
            }
        }
        
        // Alpine-style steep roof with overhangs
        this.ctx.fillStyle = '#3E2723'; // Dark brown roof
        this.ctx.beginPath();
        this.ctx.moveTo(x - 30, y); // Left overhang
        this.ctx.lineTo(x + width * 0.5, y - 90); // Peak
        this.ctx.lineTo(x + width + 30, y - 30); // Right overhang
        this.ctx.lineTo(x + width, y - 30); // Top right corner
        this.ctx.lineTo(x, y); // Top left corner
        this.ctx.closePath();
        this.ctx.fill();
        
        // Heavy snow on the roof with icicles
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 30, y); // Left edge
        this.ctx.lineTo(x + width * 0.5, y - 90); // Peak
        this.ctx.lineTo(x + width + 30, y - 30); // Right edge
        
        // Wavy snow edge
        for (let i = 0; i < 20; i++) {
            const waveX = x - 30 + ((width + 60) * i / 20);
            const baseY = i < 10 ? y - (i * 9) : y - (90 - (i - 10) * 6);
            const waveY = baseY - Math.sin(i * 0.5) * 8;
            this.ctx.lineTo(waveX, waveY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw icicles
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 15; i++) {
            const icicleX = x - 20 + ((width + 40) * i / 14);
            const icicleHeight = 10 + Math.random() * 15;
            this.ctx.beginPath();
            this.ctx.moveTo(icicleX - 5, y + 2);
            this.ctx.lineTo(icicleX, y + icicleHeight);
            this.ctx.lineTo(icicleX + 5, y + 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Windows - more alpine style with wooden frames
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 2; j++) {
                // Window background
                this.ctx.fillStyle = '#E3F2FD'; // Light blue windows
                this.ctx.fillRect(
                    x + 20 + (i * (width - 40) / 5),
                    y + 20 + (j * 45),
                    (width - 60) / 6,
                    30
                );
                
                // Window frames
                this.ctx.strokeStyle = '#5D4037';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(
                    x + 20 + (i * (width - 40) / 5),
                    y + 20 + (j * 45),
                    (width - 60) / 6,
                    30
                );
                
                // Window cross - alpine style
                const windowX = x + 20 + (i * (width - 40) / 5);
                const windowY = y + 20 + (j * 45);
                const windowWidth = (width - 60) / 6;
                
                this.ctx.beginPath();
                this.ctx.moveTo(windowX + windowWidth/2, windowY);
                this.ctx.lineTo(windowX + windowWidth/2, windowY + 30);
                this.ctx.moveTo(windowX, windowY + 15);
                this.ctx.lineTo(windowX + windowWidth, windowY + 15);
                this.ctx.stroke();
            }
        }
        
        // Main entrance with proper alpine styling
        const doorWidth = width * 0.2;
        const doorHeight = 70;
        const doorX = x + width * 0.4;
        const doorY = y + height - doorHeight;
        
        // Door frame shadow
        this.ctx.fillStyle = '#3E2723'; // Dark wood
        this.ctx.fillRect(
            doorX - 5,
            doorY - 5,
            doorWidth + 10,
            doorHeight + 5
        );
        
        // Door
        this.ctx.fillStyle = '#5D4037'; // Brown door
        this.ctx.fillRect(
            doorX,
            doorY,
            doorWidth,
            doorHeight
        );
        
        // Door detailing - authentic alpine style
        this.ctx.strokeStyle = '#3E2723';
        this.ctx.lineWidth = 2;
        
        // Door panels
        for (let i = 0; i < 2; i++) {
            this.ctx.strokeRect(
                doorX + 5 + (i * (doorWidth - 10) / 2),
                doorY + 10,
                (doorWidth - 15) / 2,
                doorHeight - 20
            );
        }
        
        // Door handles
        this.ctx.fillStyle = '#BF9D7A'; // Brass
        this.ctx.beginPath();
        this.ctx.arc(
            doorX + doorWidth * 0.3,
            doorY + doorHeight * 0.5,
            4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(
            doorX + doorWidth * 0.7,
            doorY + doorHeight * 0.5,
            4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Chimney with stone texture
        const chimneyWidth = width * 0.12;
        const chimneyX = x + width * 0.2;
        const chimneyY = y - 120;
        const chimneyHeight = 150;
        
        this.ctx.fillStyle = '#6D6D6D'; // Base gray
        this.ctx.fillRect(
            chimneyX,
            chimneyY,
            chimneyWidth,
            chimneyHeight
        );
        
        // Stone texture on chimney
        for (let i = 0; i < chimneyHeight; i += 15) {
            for (let j = 0; j < chimneyWidth; j += 10) {
                this.ctx.fillStyle = Math.random() > 0.5 ? '#5A5A5A' : '#7A7A7A';
                this.ctx.fillRect(
                    chimneyX + j + Math.random() * 5,
                    chimneyY + i + Math.random() * 5,
                    7 + Math.random() * 3,
                    5 + Math.random() * 10
                );
            }
        }
        
        // Chimney cap
        this.ctx.fillStyle = '#4E342E';
        this.ctx.fillRect(
            chimneyX - 5,
            chimneyY,
            chimneyWidth + 10,
            10
        );
        
        // Smoke from chimney - more detailed with better animation
        const currentTime = Date.now() / 1000; // For animation
        
        for (let i = 0; i < 5; i++) {
            const smokeSize = 10 + (i * 2) + Math.sin(currentTime + i) * 3;
            const xOffset = Math.sin(currentTime * 0.5 + i * 0.5) * 10;
            
            this.ctx.fillStyle = `rgba(220, 220, 220, ${0.8 - i * 0.15})`;
            this.ctx.beginPath();
            this.ctx.arc(
                chimneyX + chimneyWidth/2 + xOffset,
                chimneyY - i * 15 - 10,
                smokeSize,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Lodge sign
        this.ctx.fillStyle = '#5D4037'; // Wood sign
        this.ctx.fillRect(
            x + width * 0.3,
            y - 10,
            width * 0.4,
            20
        );
        
        // Sign border
        this.ctx.strokeStyle = '#3E2723';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            x + width * 0.3,
            y - 10,
            width * 0.4,
            20
        );
        
        // Sign text
        this.ctx.fillStyle = '#FFC107'; // Gold letters
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('FERNIE ALPINE LODGE', x + width * 0.5, y);
        
        // Optional: add some warm light from windows
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 2; j++) {
                const windowX = x + 20 + (i * (width - 40) / 5) + ((width - 60) / 12);
                const windowY = y + 35 + (j * 45);
                
                const lightGradient = this.ctx.createRadialGradient(
                    windowX, windowY, 5,
                    windowX, windowY, 40
                );
                lightGradient.addColorStop(0, 'rgba(255, 244, 179, 0.4)');
                lightGradient.addColorStop(1, 'rgba(255, 244, 179, 0)');
                
                this.ctx.fillStyle = lightGradient;
                this.ctx.beginPath();
                this.ctx.arc(windowX, windowY, 40, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Add some decorative lanterns by the door
        this.drawLantern(doorX - 15, doorY - 5);
        this.drawLantern(doorX + doorWidth + 15, doorY - 5);
    }
    
    private drawLantern(x: number, y: number): void {
        // Lantern post
        this.ctx.fillStyle = '#3E2723';
        this.ctx.fillRect(x - 2, y - 30, 4, 30);
        
        // Lantern frame
        this.ctx.fillStyle = '#4E342E';
        this.ctx.fillRect(x - 6, y - 45, 12, 15);
        
        // Lantern light
        this.ctx.fillStyle = '#FFF59D';
        this.ctx.fillRect(x - 4, y - 43, 8, 11);
        
        // Lantern top
        this.ctx.fillStyle = '#3E2723';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, y - 45);
        this.ctx.lineTo(x, y - 50);
        this.ctx.lineTo(x + 8, y - 45);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Lantern glow
        const glowRadius = 10;
        const gradient = this.ctx.createRadialGradient(
            x, y - 38, 2,
            x, y - 38, glowRadius
        );
        gradient.addColorStop(0, 'rgba(255, 244, 179, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 244, 179, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 38, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    private drawDetailedSkiLifts(): void {
        // Draw a simple chairlift going up the rightmost mountain
        const liftStartX = this.canvas.width * 0.6;  // Align with the base of the right mountain
        const liftEndX = this.canvas.width * 0.75;   // Align with the peak of the right mountain
        const liftStartY = this.groundLevel - 10;
        const liftEndY = this.groundLevel - 250;     // Match the mountain height
        
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        
        // Draw lift cable
        this.ctx.beginPath();
        this.ctx.moveTo(liftStartX, liftStartY);
        this.ctx.lineTo(liftEndX, liftEndY);
        this.ctx.stroke();
        
        // Draw lift towers at proper intervals
        const numTowers = 4;
        for (let i = 0; i < numTowers; i++) {
            const progress = i / (numTowers - 1);
            const x = liftStartX + (liftEndX - liftStartX) * progress;
            const y = liftStartY + (liftEndY - liftStartY) * progress;
            const height = 40 + (60 * progress); // Taller towers higher up the mountain
            
            this.drawLiftTower(x, y, height);
        }
        
        // Draw chairs evenly spaced along the lift
        const numChairs = 6;
        for (let i = 0; i < numChairs; i++) {
            const progress = i / numChairs;
            const x = liftStartX + (liftEndX - liftStartX) * progress;
            const y = liftStartY + (liftEndY - liftStartY) * progress;
            
            this.drawChair(x, y);
        }
        
        // Draw a second ski lift on the middle mountain
        const lift2StartX = this.canvas.width * 0.45;
        const lift2EndX = this.canvas.width * 0.5;
        const lift2StartY = this.groundLevel - 10;
        const lift2EndY = this.groundLevel - 290;
        
        this.ctx.beginPath();
        this.ctx.moveTo(lift2StartX, lift2StartY);
        this.ctx.lineTo(lift2EndX, lift2EndY);
        this.ctx.stroke();
        
        // Draw towers for second lift
        const numTowers2 = 3;
        for (let i = 0; i < numTowers2; i++) {
            const progress = i / (numTowers2 - 1);
            const x = lift2StartX + (lift2EndX - lift2StartX) * progress;
            const y = lift2StartY + (lift2EndY - lift2StartY) * progress;
            const height = 50 + (60 * progress);
            
            this.drawLiftTower(x, y, height);
        }
        
        // Draw chairs for second lift
        const numChairs2 = 5;
        for (let i = 0; i < numChairs2; i++) {
            const progress = i / numChairs2;
            const x = lift2StartX + (lift2EndX - lift2StartX) * progress;
            const y = lift2StartY + (lift2EndY - lift2StartY) * progress;
            
            this.drawChair(x, y);
        }
        
        // Draw a third ski lift on the far right mountain
        const lift3StartX = this.canvas.width * 0.9;
        const lift3EndX = this.canvas.width * 0.98;
        const lift3StartY = this.groundLevel - 10;
        const lift3EndY = this.groundLevel - 370;
        
        this.ctx.beginPath();
        this.ctx.moveTo(lift3StartX, lift3StartY);
        this.ctx.lineTo(lift3EndX, lift3EndY);
        this.ctx.stroke();
        
        // Draw towers for third lift
        const numTowers3 = 4;
        for (let i = 0; i < numTowers3; i++) {
            const progress = i / (numTowers3 - 1);
            const x = lift3StartX + (lift3EndX - lift3StartX) * progress;
            const y = lift3StartY + (lift3EndY - lift3StartY) * progress;
            const height = 45 + (70 * progress);
            
            this.drawLiftTower(x, y, height);
        }
        
        // Draw chairs for third lift
        const numChairs3 = 7;
        for (let i = 0; i < numChairs3; i++) {
            const progress = i / numChairs3;
            const x = lift3StartX + (lift3EndX - lift3StartX) * progress;
            const y = lift3StartY + (lift3EndY - lift3StartY) * progress;
            
            this.drawChair(x, y);
        }
    }
    
    private drawSkiers(): void {
        // Draw skiers on all mountain sides
        this.drawSkiersOnSlope(700, 750, this.groundLevel - 260, this.groundLevel - 50, 8); // Right mountain
        this.drawSkiersOnSlope(500, 550, this.groundLevel - 300, this.groundLevel - 70, 6); // Middle mountain
        this.drawSkiersOnSlope(300, 350, this.groundLevel - 280, this.groundLevel - 60, 7); // Left mountain
        this.drawSkiersOnSlope(980, 1030, this.groundLevel - 380, this.groundLevel - 100, 9); // Far right mountain
    }
    
    private drawSkiersOnSlope(startX: number, endX: number, startY: number, endY: number, count: number): void {
        for (let i = 0; i < count; i++) {
            // Distribute skiers along the slope
            const progress = i / count;
            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            
            // Draw colorful skier body
            this.ctx.fillStyle = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'][Math.floor(Math.random() * 5)];
            this.ctx.fillRect(x - 6, y - 8, 12, 8);
            
            // Draw skier's head
            this.ctx.fillStyle = '#F5DEB3';
            this.ctx.beginPath();
            this.ctx.arc(x, y - 12, 4, 0, Math.PI * 2);
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
            
            // Draw skier's trail (shorter and aligned with mountain slope)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            // Slope-aligned trail
            const trailLength = Math.random() * 40 + 30;
            const slopeAngle = Math.atan2(endY - startY, endX - startX);
            
            this.ctx.moveTo(x, y + 10);
            
            // Create trail that follows the slope angle
            const endTrailX = x + Math.cos(slopeAngle) * trailLength;
            const endTrailY = y + Math.sin(slopeAngle) * trailLength;
            
            // Add some waviness to the trail
            for (let j = 0; j < 5; j++) {
                const t = j / 4;
                const midX = x + (endTrailX - x) * t;
                const midY = y + 10 + (endTrailY - (y + 10)) * t;
                const waveX = midX + Math.sin(j * 1.5) * 5;
                this.ctx.lineTo(waveX, midY);
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
        
        // Platform at top
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(x - 15, y - 5, 30, 5);
    }
    
    private drawChair(x: number, y: number): void {
        // Hanging wire
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 15);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Chair lift seat
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x - 10, y, 20, 5);
        
        // Chair back
        this.ctx.fillRect(x - 8, y - 10, 16, 10);
        
        // Occasionally add a person in a chair
        if (Math.random() > 0.5) {
            // Person sitting
            this.ctx.fillStyle = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'][Math.floor(Math.random() * 5)];
            this.ctx.fillRect(x - 6, y - 8, 12, 8);
            
            // Head
            this.ctx.fillStyle = '#F5DEB3';
            this.ctx.beginPath();
            this.ctx.arc(x, y - 12, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    private drawSnowSparkles(): void {
        // Add snow sparkles on the ground for a glistening effect
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.groundLevel + Math.random() * (this.canvas.height - this.groundLevel);
            const size = Math.random() * 3 + 1;
            
            // Vary sparkle opacity for a twinkling effect
            const opacity = 0.3 + Math.random() * 0.7;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    private renderGameOverScreen(): void {
        // Create a dramatic background with red tint
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundLevel);
        skyGradient.addColorStop(0, '#590000'); // Dark red at top
        skyGradient.addColorStop(0.6, '#A30000'); // Mid-tone red
        skyGradient.addColorStop(1, '#FF5252'); // Lighter red at bottom
        
        // Fill background with gradient sky
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw elk silhouette
        this.drawElkSilhouette();
        
        // Draw game over text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 3);
        
        // Draw death message
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText('Your truck was destroyed by an elk!', this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw score
        this.ctx.font = '28px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        // Draw respawn instruction
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#FFEB3B'; // Bright yellow color
        this.ctx.fillText('Press SPACE or ENTER to respawn', this.canvas.width / 2, this.canvas.height * 0.7);
    }
    
    private drawElkSilhouette(): void {
        this.ctx.fillStyle = 'black';
        
        // Position the elk at the center bottom of the screen
        const x = this.canvas.width / 2 - 100;
        const y = this.groundLevel - 160;
        const width = 200;
        const height = 160;
        
        // Draw elk body
        this.ctx.fillRect(x, y + height * 0.4, width, height * 0.6);
        
        // Draw elk head
        this.ctx.fillRect(x + width * 0.7, y, width * 0.3, height * 0.5);
        
        // Draw antlers
        this.ctx.beginPath();
        // Left antler
        this.ctx.moveTo(x + width * 0.8, y);
        this.ctx.lineTo(x + width * 0.6, y - height * 0.4);
        this.ctx.lineTo(x + width * 0.5, y - height * 0.3);
        this.ctx.lineTo(x + width * 0.7, y - height * 0.5);
        this.ctx.lineTo(x + width * 0.65, y - height * 0.2);
        this.ctx.lineTo(x + width * 0.8, y);
        
        // Right antler
        this.ctx.moveTo(x + width * 0.9, y);
        this.ctx.lineTo(x + width * 1.1, y - height * 0.4);
        this.ctx.lineTo(x + width * 1.2, y - height * 0.3);
        this.ctx.lineTo(x + width * 1.0, y - height * 0.5);
        this.ctx.lineTo(x + width * 1.15, y - height * 0.2);
        this.ctx.lineTo(x + width * 0.9, y);
        
        this.ctx.fill();
        
        // Draw glowing red eyes
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(x + width * 0.85, y + height * 0.2, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add glow effect to eyes
        const glowRadius = 10;
        const gradient = this.ctx.createRadialGradient(
            x + width * 0.85, y + height * 0.2, 5,
            x + width * 0.85, y + height * 0.2, glowRadius
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x + width * 0.85, y + height * 0.2, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    private renderExplosion(): void {
        if (!this.ctx) return;
        
        // Update explosion timer
        this.explosionTimer += this.frameTime;
        
        // Draw background for explosion flash
        const flashOpacity = Math.max(0, 1 - this.explosionTimer / (this.explosionDuration * 0.2));
        if (flashOpacity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = flashOpacity;
            // Use orange-red gradient for flash effect
            const flashGradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
            );
            flashGradient.addColorStop(0, '#ffffff');
            flashGradient.addColorStop(0.2, '#ffdd00');
            flashGradient.addColorStop(0.7, '#ff5500');
            flashGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            this.ctx.fillStyle = flashGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
        
        // Draw explosive fireball at center
        const fireballSize = 100 * (1 - Math.min(1, this.explosionTimer / (this.explosionDuration * 0.5)));
        if (fireballSize > 0) {
            const playerPosX = this.player.position.x + this.player.width / 2;
            const playerPosY = this.player.position.y + this.player.height / 2;
            const centerX = playerPosX - this.cameraOffset;
            const centerY = playerPosY;
            
            // Create a radial gradient for fireball
            const fireballGradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, fireballSize
            );
            fireballGradient.addColorStop(0, '#ffffff');
            fireballGradient.addColorStop(0.1, '#ffff00');
            fireballGradient.addColorStop(0.4, '#ff9900');
            fireballGradient.addColorStop(0.8, '#ff3300');
            fireballGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            this.ctx.save();
            this.ctx.globalAlpha = Math.min(1, 1.5 - this.explosionTimer / this.explosionDuration);
            this.ctx.fillStyle = fireballGradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, fireballSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Draw explosion shockwave
        const shockwaveSize = this.explosionTimer * 1000; // Expand over time
        const shockwaveOpacity = Math.max(0, 1 - this.explosionTimer / (this.explosionDuration * 0.5));
        if (shockwaveOpacity > 0) {
            const playerPosX = this.player.position.x;
            const groundY = this.groundLevel;
            
            this.ctx.save();
            this.ctx.globalAlpha = shockwaveOpacity * 0.7;
            
            // Create gradient for shockwave
            const shockwaveGradient = this.ctx.createRadialGradient(
                playerPosX - this.cameraOffset, groundY,
                shockwaveSize - 10,
                playerPosX - this.cameraOffset, groundY,
                shockwaveSize
            );
            shockwaveGradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
            shockwaveGradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.5)');
            shockwaveGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
            
            this.ctx.strokeStyle = shockwaveGradient;
            this.ctx.lineWidth = 20;
            this.ctx.beginPath();
            this.ctx.arc(playerPosX - this.cameraOffset, groundY, shockwaveSize, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        // Draw explosion particles
        for (let i = 0; i < this.explosionParticles.length; i++) {
            const particle = this.explosionParticles[i];
            
            // Update particle position
            particle.x += particle.vx * this.frameTime;
            particle.y += particle.vy * this.frameTime;
            
            // Add gravity effect to lava particles
            if (particle.color.startsWith('#b') || particle.color.startsWith('#c') || 
                particle.color.startsWith('#d') || particle.color.startsWith('#e') ||
                particle.color.startsWith('#f')) {
                particle.vy += 200 * this.frameTime; // Gravity
            }
            
            // Update lifetime
            particle.lifetime -= this.frameTime;
            
            // Draw particle
            if (particle.lifetime > 0) {
                const alpha = Math.min(1, particle.lifetime * 2);
                const size = particle.size * (0.7 + alpha * 0.3); // Particles shrink as they fade
                
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                
                // Add glow effect to fire and lava particles
                if (particle.color.startsWith('#f') || particle.color.startsWith('#e')) {
                    this.ctx.shadowColor = particle.color;
                    this.ctx.shadowBlur = 10;
                }
                
                this.ctx.fillStyle = particle.color;
                this.ctx.translate(-this.cameraOffset, 0);
                
                // Use circles for fire/lava particles, rectangles for debris
                if (particle.color === '#e74c3c') {
                    // Truck debris
                    this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                } else {
                    // Fire and lava particles as circles with glow
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, size/2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }
        }
        
        // Remove dead particles
        this.explosionParticles = this.explosionParticles.filter(p => p.lifetime > 0);
        
        // Draw lava pool at the bottom if explosion has progressed enough
        if (this.explosionTimer > 0.2 && this.explosionTimer < this.explosionDuration * 0.8) {
            const lavaPoolOpacity = Math.min(1, (this.explosionTimer - 0.2) * 2);
            const playerPosX = this.player.position.x;
            const groundY = this.groundLevel;
            
            this.ctx.save();
            this.ctx.globalAlpha = lavaPoolOpacity;
            
            // Create gradient for lava pool
            const lavaGradient = this.ctx.createRadialGradient(
                playerPosX - this.cameraOffset, groundY,
                0,
                playerPosX - this.cameraOffset, groundY,
                80 + this.explosionTimer * 50
            );
            lavaGradient.addColorStop(0, '#ffcc00');
            lavaGradient.addColorStop(0.3, '#ff6600');
            lavaGradient.addColorStop(0.7, '#cc3300');
            lavaGradient.addColorStop(1, '#aa0000');
            
            this.ctx.fillStyle = lavaGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                playerPosX - this.cameraOffset,
                groundY,
                80 + this.explosionTimer * 50,
                30 + this.explosionTimer * 20,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Add bubbly effect to lava pool
            for (let i = 0; i < 5; i++) {
                const bubbleX = playerPosX - this.cameraOffset + (Math.random() * 160 - 80);
                const bubbleY = groundY - (Math.random() * 10);
                const bubbleSize = 5 + Math.random() * 10;
                
                this.ctx.fillStyle = '#ffdd00';
                this.ctx.beginPath();
                this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
    }
    
    private createExplosion(): void {
        if (!this.player) return;
        
        // Create explosion particles centered on the player
        const centerX = this.player.position.x + this.player.width / 2;
        const centerY = this.player.position.y + this.player.height / 2;
        
        // Create more truck debris pieces for a bigger explosion
        const numDebris = 60; 
        for (let i = 0; i < numDebris; i++) {
            const angle = Math.random() * Math.PI * 2; 
            const speed = 150 + Math.random() * 350; 
            const size = 5 + Math.random() * 10; 
            
            this.explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: '#e74c3c', 
                lifetime: 0.8 + Math.random() * 1.8 
            });
        }
        
        // Create more fire/spark particles
        const numParticles = 120; 
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 250; 
            const size = 4 + Math.random() * 8; 
            
            // Choose random color from fire palette with more intense colors
            const colors = ['#ff0000', '#ff3300', '#ff5500', '#ff7700', '#ff9900', '#ffaa00', '#ffcc00']; 
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color,
                lifetime: 0.7 + Math.random() * 0.8 
            });
        }
        
        // Add lava particles that spread outward and fall
        const numLava = 80; 
        for (let i = 0; i < numLava; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 200;
            const size = 6 + Math.random() * 12; 
            
            // Lava colors (red-orange gradient)
            const lavaColors = ['#bb0000', '#cc3300', '#dd4400', '#ee5500', '#ff6600'];
            const color = lavaColors[Math.floor(Math.random() * lavaColors.length)];
            
            this.explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + 200, 
                size,
                color,
                lifetime: 1.2 + Math.random() * 1.0 
            });
        }
        
        // Add some smoke particles that rise upward
        const numSmoke = 40; 
        for (let i = 0; i < numSmoke; i++) {
            const angle = -Math.PI/2 + (Math.random() * 0.8 - 0.4); 
            const speed = 40 + Math.random() * 80; 
            const size = 10 + Math.random() * 20; 
            
            // Dark smoke with varying opacity
            const grayValue = 60 + Math.floor(Math.random() * 80); 
            const color = `rgb(${grayValue},${grayValue},${grayValue})`;
            
            this.explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color,
                lifetime: 1.5 + Math.random() * 1.5 
            });
        }
        
        // Add explosion ring
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            const speed = 300;
            const size = 8;
            
            this.explosionParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: '#ffdd00', 
                lifetime: 0.5
            });
        }
    }
    
    private shakeScreen(): void {
        this.screenShakeActive = true;
        this.screenShakeIntensity = 20; // Maximum shake amount in pixels
        this.screenShakeDuration = 1.5; // Seconds to shake for
        this.screenShakeTimer = 0;
    }
    
    private updateScreenShake(): void {
        this.screenShakeTimer += this.frameTime;
        
        if (this.screenShakeTimer >= this.screenShakeDuration) {
            // Stop shaking after duration
            this.screenShakeActive = false;
            this.screenShakeOffsetX = 0;
            this.screenShakeOffsetY = 0;
            return;
        }
        
        // Calculate shake intensity based on remaining time (gradually reduces)
        const remainingShakeFactor = 1 - (this.screenShakeTimer / this.screenShakeDuration);
        const currentIntensity = this.screenShakeIntensity * remainingShakeFactor;
        
        // Apply random shake offset
        this.screenShakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
        this.screenShakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
     }
}
