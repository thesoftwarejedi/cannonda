import { GameObject, ObjectType } from './GameObject';
import { Vector2D } from './Vector2D';

export class Elk extends GameObject {
    private gravity: number = 1000;
    private isOnGround: boolean = true;
    private attackTimer: number = 0;
    private attackCooldown: number = 1.5; // seconds between lightning attacks
    private isAngry: boolean = false;
    private lightningParticles: LightningParticle[] = [];
    private hasLightningHit: boolean = false;
    private lightningActive: boolean = false;
    
    constructor(x: number, y: number) {
        super(x, y, 60, 70, ObjectType.Elk);
        // Set initial velocity, moving from right to left
        this.velocity = new Vector2D(-150, 0);
    }
    
    update(deltaTime: number, groundY: number, playerPosition?: Vector2D): void {
        // Apply gravity
        if (this.position.y < groundY - this.height) {
            this.acceleration = new Vector2D(0, this.gravity);
            this.isOnGround = false;
        } else {
            this.position = new Vector2D(this.position.x, groundY - this.height);
            this.velocity = new Vector2D(this.velocity.x, 0);
            this.acceleration = Vector2D.zero();
            this.isOnGround = true;
        }
        
        // Update lightning attack if angry
        if (this.isAngry && playerPosition) {
            this.attackTimer += deltaTime;
            
            if (this.attackTimer >= this.attackCooldown) {
                this.attackTimer = 0;
                this.shootLightning(playerPosition);
                console.log("Elk shooting lightning at player!");
            }
        }
        
        // Update lightning particles
        for (let i = this.lightningParticles.length - 1; i >= 0; i--) {
            const particle = this.lightningParticles[i];
            particle.lifetime -= deltaTime;
            
            if (particle.lifetime <= 0) {
                this.lightningParticles.splice(i, 1);
            }
        }
        
        // If all lightning particles are gone, lightning is no longer active
        if (this.lightningParticles.length === 0) {
            this.lightningActive = false;
            this.hasLightningHit = false; // Reset hit state when lightning disappears
        }
        
        super.update(deltaTime);
    }
    
    setAngry(angry: boolean): void {
        this.isAngry = angry;
        if (angry) {
            // Speed up angry elk
            this.velocity = new Vector2D(-250, 0);
            
            // Set timer to attack immediately on next update
            this.attackTimer = this.attackCooldown;
        }
    }
    
    shootLightning(targetPosition: Vector2D): void {
        // Create lightning bolt from eyes to player
        const eyePosition = new Vector2D(
            this.position.x + this.width * 0.85,
            this.position.y - this.height * 0.05
        );
        
        // Create lightning particles along the path
        const segments = 10;
        const dx = (targetPosition.x - eyePosition.x) / segments;
        const dy = (targetPosition.y - eyePosition.y) / segments;
        
        for (let i = 0; i < segments; i++) {
            // Add some randomness to the lightning path
            const jitterX = (Math.random() - 0.5) * 30;
            const jitterY = (Math.random() - 0.5) * 30;
            
            const x = eyePosition.x + dx * i + jitterX;
            const y = eyePosition.y + dy * i + jitterY;
            
            // Add particles with different lifetimes for a more dynamic effect
            this.lightningParticles.push({
                position: new Vector2D(x, y),
                size: Math.random() * 5 + 5,
                lifetime: Math.random() * 0.3 + 0.1,
                color: '#00FFFF' // Cyan color for lightning
            });
        }
        
        // Add extra particles around the target for impact effect
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 30;
            const x = targetPosition.x + Math.cos(angle) * distance;
            const y = targetPosition.y + Math.sin(angle) * distance;
            
            this.lightningParticles.push({
                position: new Vector2D(x, y),
                size: Math.random() * 8 + 2,
                lifetime: Math.random() * 0.5 + 0.2,
                color: i % 2 === 0 ? '#FFFFFF' : '#00FFFF' // Alternate white and cyan
            });
        }
        
        // Mark lightning as active and not yet hit
        this.lightningActive = true;
        this.hasLightningHit = false;
    }
    
    hasActiveLightning(): boolean {
        return this.lightningActive && !this.hasLightningHit && this.lightningParticles.length > 0;
    }
    
    markLightningHit(): void {
        this.hasLightningHit = true;
    }
    
    isLightningActive(): boolean {
        return this.lightningActive && this.lightningParticles.length > 0;
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw lightning particles first (behind elk)
        for (const particle of this.lightningParticles) {
            ctx.globalAlpha = particle.lifetime * 3; // Fade out effect
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Draw elk body - red tint if angry
        ctx.fillStyle = this.isAngry ? '#A83232' : '#795548'; // Angry red vs Brown
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.6);
        
        // Draw elk head
        ctx.fillRect(
            this.position.x + this.width * 0.7, 
            this.position.y - this.height * 0.2,
            this.width * 0.3,
            this.height * 0.3
        );
        
        // Draw antlers
        ctx.beginPath();
        ctx.moveTo(this.position.x + this.width * 0.8, this.position.y - this.height * 0.2);
        ctx.lineTo(this.position.x + this.width * 0.9, this.position.y - this.height * 0.5);
        ctx.lineTo(this.position.x + this.width, this.position.y - this.height * 0.3);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.position.x + this.width * 0.7, this.position.y - this.height * 0.2);
        ctx.lineTo(this.position.x + this.width * 0.6, this.position.y - this.height * 0.5);
        ctx.lineTo(this.position.x + this.width * 0.5, this.position.y - this.height * 0.3);
        ctx.stroke();
        
        // Draw eyes - glowing if angry
        if (this.isAngry) {
            // Glowing cyan eyes
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(
                this.position.x + this.width * 0.85, 
                this.position.y - this.height * 0.05,
                5, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Draw glow effect
            const gradient = ctx.createRadialGradient(
                this.position.x + this.width * 0.85,
                this.position.y - this.height * 0.05,
                2,
                this.position.x + this.width * 0.85,
                this.position.y - this.height * 0.05,
                10
            );
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                this.position.x + this.width * 0.85,
                this.position.y - this.height * 0.05,
                10, 0, Math.PI * 2
            );
            ctx.fill();
        } else {
            // Normal dark eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
                this.position.x + this.width * 0.85, 
                this.position.y - this.height * 0.05,
                3, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw legs
        ctx.fillStyle = this.isAngry ? '#8B2500' : '#5D4037'; // Dark angry red vs Dark brown
        ctx.fillRect(
            this.position.x + this.width * 0.2, 
            this.position.y + this.height * 0.6, 
            this.width * 0.1, 
            this.height * 0.4
        );
        ctx.fillRect(
            this.position.x + this.width * 0.7, 
            this.position.y + this.height * 0.6, 
            this.width * 0.1, 
            this.height * 0.4
        );
        
        ctx.restore();
    }
}

// Lightning particle interface
interface LightningParticle {
    position: Vector2D;
    size: number;
    lifetime: number;
    color: string;
}

export class CannonTruck extends GameObject {
    private fireTimer: number = 1.5; // Start halfway through cooldown so first shot comes sooner
    protected fireInterval: number = 1.5; // Reduced from 3 to 1.5 seconds
    private projectileSpeed: number = -300; // Changed to negative to shoot left
    protected health: number = 1; // Changed to 1 hit to destroy (was 2)
    protected isAboutToFire: boolean = false; // Whether the truck is about to fire (for visual effect)
    protected preFireTime: number = 0.3; // How long before firing the truck glows red
    
    constructor(x: number, y: number) {
        super(x, y, 90, 60, ObjectType.CannonTruck);
        // Set initial velocity, moving from right to left
        this.velocity = new Vector2D(-100, 0);
    }
    
    // Add method to change the size of the cannon truck
    setSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
    
    update(deltaTime: number, addProjectile: (x: number, y: number, vx: number) => void): void {
        // Update firing state
        this.fireTimer += deltaTime;
        
        // Check if we're about to fire (but not already in pre-fire state)
        if (!this.isAboutToFire && this.fireTimer >= this.fireInterval - this.preFireTime) {
            this.isAboutToFire = true;
        }
        
        // Firing logic
        if (this.fireTimer >= this.fireInterval) {
            // Fire a cannonball
            addProjectile(
                this.position.x, // Changed to shoot from left side of truck 
                this.position.y + this.height * 0.3,
                this.projectileSpeed
            );
            this.fireTimer = 0;
            this.isAboutToFire = false; // Reset firing state
        }
        
        super.update(deltaTime);
    }
    
    takeDamage(): boolean {
        this.health--;
        // Return true if destroyed (health <= 0)
        return this.health <= 0;
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw truck base (looks like a logging truck)
        ctx.fillStyle = this.isAboutToFire ? '#e74c3c' : '#34495e'; // Red when about to fire, normal blue otherwise
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.7);
        
        // Draw truck cabin
        ctx.fillStyle = this.isAboutToFire ? '#c0392b' : '#2c3e50'; // Darker red when about to fire
        ctx.fillRect(
            this.position.x, 
            this.position.y, 
            this.width * 0.3, 
            this.height * 0.5
        );
        
        // Draw logs (cannon)
        ctx.fillStyle = '#795548'; // Brown for logs
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(
                this.position.x + this.width * 0.35, 
                this.position.y + i * (this.height * 0.15), 
                this.width * 0.6, 
                this.height * 0.1
            );
        }
        
        // Draw cannon barrel - glowing when about to fire
        ctx.fillStyle = this.isAboutToFire ? '#ff4d4d' : '#7f8c8d';
        ctx.fillRect(
            this.position.x - this.width * 0.2,
            this.position.y + this.height * 0.25,
            this.width * 0.3,
            this.height * 0.15
        );
        
        // Add a glow effect when about to fire
        if (this.isAboutToFire) {
            ctx.globalAlpha = 0.4;
            // Draw a red halo around the cannon barrel
            const gradient = ctx.createRadialGradient(
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                1,
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                this.width * 0.4
            );
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                this.width * 0.4,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw wheels
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.2, 
            this.position.y + this.height * 0.85, 
            this.height * 0.15, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.8, 
            this.position.y + this.height * 0.85, 
            this.height * 0.15, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
    }
}

export class BossCannonTruck extends CannonTruck {
    constructor(x: number, y: number) {
        super(x, y);
        // Make the boss truck larger
        this.setSize(180, 120); // Double the original size (90x60)
        // Set 5 health points
        this.health = 5;
        // Make it slower
        this.velocity = new Vector2D(-80, 0);
        // Faster firing rate
        this.fireInterval = 1.0;
    }
    
    // Override the takeDamage method to show health status
    takeDamage(): boolean {
        this.health--;
        console.log(`Boss cannon truck hit! Health: ${this.health}`);
        // Return true if destroyed (health <= 0)
        return this.health <= 0;
    }
    
    // Override the render method to make the boss truck look more intimidating
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw truck base (looks like a bigger, meaner logging truck)
        ctx.fillStyle = this.isAboutToFire ? '#e74c3c' : '#800000'; // Red when about to fire, normal dark red otherwise
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.7);
        
        // Draw truck cabin
        ctx.fillStyle = this.isAboutToFire ? '#c0392b' : '#600000'; // Darker red when about to fire
        ctx.fillRect(
            this.position.x, 
            this.position.y, 
            this.width * 0.3, 
            this.height * 0.5
        );
        
        // Draw logs (cannon)
        ctx.fillStyle = '#5D4037'; // Darker brown for logs
        for (let i = 0; i < 4; i++) { // More logs
            ctx.fillRect(
                this.position.x + this.width * 0.35, 
                this.position.y + i * (this.height * 0.12), 
                this.width * 0.6, 
                this.height * 0.1
            );
        }
        
        // Draw double cannon barrels
        ctx.fillStyle = this.isAboutToFire ? '#ff4d4d' : '#444';
        // Upper cannon
        ctx.fillRect(
            this.position.x - this.width * 0.25,
            this.position.y + this.height * 0.15,
            this.width * 0.35,
            this.height * 0.12
        );
        // Lower cannon
        ctx.fillRect(
            this.position.x - this.width * 0.25,
            this.position.y + this.height * 0.35,
            this.width * 0.35,
            this.height * 0.12
        );
        
        // Add a glow effect when about to fire
        if (this.isAboutToFire) {
            ctx.globalAlpha = 0.4;
            // Draw a red halo around the cannon barrel
            const gradient = ctx.createRadialGradient(
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                1,
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                this.width * 0.4
            );
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                this.position.x - this.width * 0.1,
                this.position.y + this.height * 0.32,
                this.width * 0.4,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw wheels
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.2, 
            this.position.y + this.height * 0.85, 
            this.height * 0.15, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.8, 
            this.position.y + this.height * 0.85, 
            this.height * 0.15, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw health indicator
        const healthBarWidth = this.width * 0.8;
        const healthBarHeight = 10;
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.position.x + this.width * 0.1,
            this.position.y - 20,
            healthBarWidth,
            healthBarHeight
        );
        // Health remaining
        ctx.fillStyle = '#f00';
        ctx.fillRect(
            this.position.x + this.width * 0.1,
            this.position.y - 20,
            healthBarWidth * (this.health / 5),
            healthBarHeight
        );
        
        ctx.restore();
    }
}

export class Rock extends GameObject {
    constructor(x: number, y: number, velocityX: number) {
        super(x, y, 15, 15, ObjectType.Rock);
        this.velocity = new Vector2D(velocityX, 0);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw rock
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width / 2, 
            this.position.y + this.height / 2, 
            this.width / 2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
    }
}

export class Ground extends GameObject {
    constructor(x: number, y: number, width: number, height: number) {
        super(x, y, width, height, ObjectType.Ground);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw ground
        ctx.fillStyle = '#8B4513'; // Saddle brown for dirt
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw grass on top
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.position.x, this.position.y, this.width, 10);
        
        // Draw some variation in the ground
        ctx.fillStyle = '#6d4c41';
        for (let i = 0; i < this.width; i += 50) {
            const randomWidth = Math.random() * 30 + 10;
            const randomHeight = Math.random() * 5 + 15;
            ctx.fillRect(
                this.position.x + i, 
                this.position.y + randomHeight, 
                randomWidth, 
                5
            );
        }
        
        ctx.restore();
    }
}
