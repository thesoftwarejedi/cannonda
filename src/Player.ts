import { GameObject, ObjectType } from './GameObject';
import { Vector2D } from './Vector2D';
import { InputManager, Keys } from './Input';

export class Laser extends GameObject {
    constructor(x: number, y: number) {
        super(x, y, 20, 5, ObjectType.Laser);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        // Create laser gradient
        const gradient = ctx.createLinearGradient(
            this.position.x, this.position.y,
            this.position.x + this.width, this.position.y
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.restore();
    }
}

export class Player extends GameObject {
    private jumpForce: number = -500;
    private jumpCount: number = 0;
    private maxJumps: number = 2; // Allow double jump
    private baseSpeed: number = 200;
    private maxSpeed: number = 400; // Maximum speed limit
    private accelerationRate: number = 300; // Acceleration per second
    private gravity: number = 1000;
    private isJumping: boolean = false;
    private isOnGround: boolean = false;
    private laserCooldown: number = 0;
    private laserCooldownMax: number = 0.3; // seconds
    private rocksInTruck: number = 30; // rocks in the truck
    private color: string = '#3498db';
    
    constructor(x: number, y: number) {
        // The dump truck is larger than other objects
        super(x, y, 80, 50, ObjectType.Player);
    }

    update(deltaTime: number, input: InputManager, addEntity: (entity: GameObject) => void): void {
        // Apply gravity if not on ground
        if (!this.isOnGround) {
            this.acceleration = new Vector2D(0, this.gravity);
        } else {
            this.acceleration = Vector2D.zero();
            if (this.velocity.y > 0) {
                this.velocity = new Vector2D(this.velocity.x, 0);
            }
            // Reset jump count when on ground
            this.jumpCount = 0;
        }

        // Handle jump input
        if (input.isKeyDown(Keys.Up) && (this.isOnGround || this.jumpCount < this.maxJumps)) {
            this.velocity = new Vector2D(this.velocity.x, this.jumpForce);
            this.isJumping = true;
            this.isOnGround = false;
            this.jumpCount++;
        }

        // Remove horizontal player movement - arrow keys now control scroll speed
        // Apply friction horizontally to gradually stop
        this.velocity = new Vector2D(this.velocity.x * 0.95, this.velocity.y);

        // Update laser cooldown
        if (this.laserCooldown > 0) {
            this.laserCooldown -= deltaTime;
        }

        if (input.isKeyPressed(Keys.Down) && this.laserCooldown <= 0 && this.rocksInTruck > 0) {
            // Create a new laser - position it at the back of the truck (right side)
            const laser = new Laser(
                this.position.x + this.width, 
                this.position.y + this.height / 2 - 5
            );
            // Lasers should shoot to the right from the back headlights
            laser.velocity = new Vector2D(1200, 0); // Increased laser speed from 800 to 1200
            
            addEntity(laser);
            this.laserCooldown = this.laserCooldownMax;
            this.rocksInTruck--;
        }

        super.update(deltaTime);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw truck body
        ctx.fillStyle = '#e74c3c'; // Red
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw truck cabin
        ctx.fillStyle = '#c0392b'; // Darker red
        ctx.fillRect(
            this.position.x + this.width * 0.6, 
            this.position.y, 
            this.width * 0.4, 
            this.height * 0.7
        );
        
        // Draw truck bed with rocks
        ctx.fillStyle = '#7f8c8d'; // Gray
        const rockHeight = Math.min(this.height * 0.4, (this.rocksInTruck / 30) * this.height * 0.4);
        ctx.fillRect(
            this.position.x, 
            this.position.y + this.height * 0.2, 
            this.width * 0.55, 
            rockHeight
        );
        
        // Draw wheels
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.2, 
            this.position.y + this.height, 
            this.height * 0.2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width * 0.8, 
            this.position.y + this.height, 
            this.height * 0.2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw headlights at back of truck (since it drives backwards)
        ctx.fillStyle = '#f1c40f'; // Yellow
        ctx.fillRect(
            this.position.x + this.width - 5, 
            this.position.y + this.height * 0.3, 
            5, 
            this.height * 0.1
        );
        ctx.fillRect(
            this.position.x + this.width - 5, 
            this.position.y + this.height * 0.6, 
            5, 
            this.height * 0.1
        );
        
        // Display rock count
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Rocks: ${this.rocksInTruck}`, this.position.x + 5, this.position.y - 5);
        
        ctx.restore();
    }
    
    setOnGround(isOnGround: boolean): void {
        this.isOnGround = isOnGround;
        if (isOnGround) {
            this.jumpCount = 0; // Reset jump count when landing
        }
    }
    
    getRockCount(): number {
        return this.rocksInTruck;
    }
    
    addRocks(count: number): void {
        this.rocksInTruck += count;
        if (this.rocksInTruck < 0) {
            this.rocksInTruck = 0;
        }
    }

    public reset(x: number, y: number): void {
        // Reset position
        this.position.x = x;
        this.position.y = y;
        
        // Reset velocity
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // Reset jump state
        this.isJumping = false;
        this.isOnGround = false;
        this.jumpCount = 0;
        
        // Reset rocks
        this.rocksInTruck = 30;
        
        // Reset laser cooldown
        this.laserCooldown = 0;
        
        // Make sure the player is active
        this.isActive = true;
    }
}
