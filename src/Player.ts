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
    private jumpForce: number = -400;
    private speed: number = 200;
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
        }

        // Handle jump input
        if (input.isKeyDown(Keys.Space) && this.isOnGround) {
            this.velocity = new Vector2D(this.velocity.x, this.jumpForce);
            this.isJumping = true;
            this.isOnGround = false;
        }

        // Handle movement input (since we're driving backwards, left/right are reversed)
        if (input.isKeyPressed(Keys.Right)) {
            this.velocity = new Vector2D(-this.speed, this.velocity.y);
        } else if (input.isKeyPressed(Keys.Left)) {
            this.velocity = new Vector2D(this.speed, this.velocity.y);
        } else {
            this.velocity = new Vector2D(0, this.velocity.y);
        }

        // Handle laser shooting
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
            laser.velocity = new Vector2D(400, 0);
            
            addEntity(laser);
            this.laserCooldown = this.laserCooldownMax;
            this.rocksInTruck--;
        }

        super.update(deltaTime);
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Draw the dump truck
        ctx.save();
        
        // Truck body
        ctx.fillStyle = '#f39c12'; // Orange/yellow for dump truck
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Truck bed (filled with rocks)
        ctx.fillStyle = '#7f8c8d'; // Gray for rocks
        ctx.fillRect(this.position.x + this.width * 0.3, this.position.y, this.width * 0.7, this.height * 0.7);
        
        // Truck cab
        ctx.fillStyle = '#e74c3c'; // Red for cab
        ctx.fillRect(this.position.x, this.position.y, this.width * 0.3, this.height * 0.7);
        
        // Wheels
        ctx.fillStyle = '#2c3e50'; // Dark blue for wheels
        ctx.beginPath();
        ctx.arc(this.position.x + this.width * 0.2, this.position.y + this.height, this.height * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.position.x + this.width * 0.8, this.position.y + this.height, this.height * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Back headlights for laser - moved to the right side of truck
        ctx.fillStyle = '#f1c40f'; // Yellow for headlights
        ctx.fillRect(this.position.x + this.width - 5, this.position.y + this.height * 0.5 - 5, 5, 10);
        
        // Display rock count
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Rocks: ${this.rocksInTruck}`, this.position.x + 5, this.position.y - 5);
        
        ctx.restore();
    }

    setOnGround(value: boolean): void {
        this.isOnGround = value;
        if (value) {
            this.isJumping = false;
        }
    }

    addRocks(count: number): void {
        this.rocksInTruck += count;
    }

    getRockCount(): number {
        return this.rocksInTruck;
    }
}
