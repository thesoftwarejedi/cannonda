import { GameObject, ObjectType } from './GameObject';
import { Vector2D } from './Vector2D';

export class Elk extends GameObject {
    private gravity: number = 1000;
    private isOnGround: boolean = true;
    
    constructor(x: number, y: number) {
        super(x, y, 60, 70, ObjectType.Elk);
        // Set initial velocity, moving from right to left
        this.velocity = new Vector2D(-150, 0);
    }
    
    update(deltaTime: number, groundY: number): void {
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
        
        // No jumping behavior - elk just run along the ground
        
        super.update(deltaTime);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw elk body
        ctx.fillStyle = '#795548'; // Brown for elk
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
        
        // Draw legs
        ctx.fillStyle = '#5D4037'; // Dark brown
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

export class CannonTruck extends GameObject {
    private fireTimer: number = 0;
    private fireInterval: number = 3; // seconds
    private projectileSpeed: number = -300; // Changed to negative to shoot left
    
    constructor(x: number, y: number) {
        super(x, y, 90, 60, ObjectType.CannonTruck);
        // Set initial velocity, moving from right to left
        this.velocity = new Vector2D(-100, 0);
    }
    
    update(deltaTime: number, addProjectile: (x: number, y: number, vx: number) => void): void {
        // Firing logic
        this.fireTimer += deltaTime;
        if (this.fireTimer >= this.fireInterval) {
            // Fire a cannonball
            addProjectile(
                this.position.x, // Changed to shoot from left side of truck 
                this.position.y + this.height * 0.3,
                this.projectileSpeed
            );
            this.fireTimer = 0;
        }
        
        super.update(deltaTime);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw truck base (looks like a logging truck)
        ctx.fillStyle = '#34495e'; // Dark blue
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.7);
        
        // Draw truck cabin
        ctx.fillStyle = '#2c3e50'; // Darker blue
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
        
        // Draw cannon barrel
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(
            this.position.x - this.width * 0.2,
            this.position.y + this.height * 0.25,
            this.width * 0.3,
            this.height * 0.15
        );
        
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
