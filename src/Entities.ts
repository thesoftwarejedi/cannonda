import { GameObject, ObjectType } from './GameObject';
import { Vector2D } from './Vector2D';

export class Elk extends GameObject {
    private jumpTimer: number = 0;
    private jumpInterval: number = 2; // seconds
    private jumpForce: number = -400;
    private gravity: number = 1000;
    private isOnGround: boolean = true;
    
    constructor(x: number, y: number) {
        super(x, y, 60, 70, ObjectType.Elk);
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
        
        // Random jumping behavior
        if (this.isOnGround) {
            this.jumpTimer += deltaTime;
            if (this.jumpTimer >= this.jumpInterval) {
                this.velocity = new Vector2D(this.velocity.x, this.jumpForce * 0.7);
                this.jumpTimer = 0;
            }
        }
        
        super.update(deltaTime);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Draw elk body
        ctx.fillStyle = '#795548'; // Brown
        ctx.fillRect(this.position.x, this.position.y + this.height * 0.3, this.width, this.height * 0.7);
        
        // Draw elk head
        ctx.fillStyle = '#8D6E63'; // Lighter brown
        ctx.fillRect(
            this.position.x + this.width * 0.7, 
            this.position.y, 
            this.width * 0.3, 
            this.height * 0.4
        );
        
        // Draw antlers
        ctx.strokeStyle = '#5D4037'; // Dark brown
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Left antler
        ctx.moveTo(this.position.x + this.width * 0.8, this.position.y);
        ctx.lineTo(this.position.x + this.width * 0.7, this.position.y - this.height * 0.2);
        ctx.moveTo(this.position.x + this.width * 0.7, this.position.y - this.height * 0.1);
        ctx.lineTo(this.position.x + this.width * 0.6, this.position.y - this.height * 0.3);
        // Right antler
        ctx.moveTo(this.position.x + this.width * 0.9, this.position.y);
        ctx.lineTo(this.position.x + this.width * 0.9, this.position.y - this.height * 0.3);
        ctx.moveTo(this.position.x + this.width * 0.9, this.position.y - this.height * 0.15);
        ctx.lineTo(this.position.x + this.width * 1.0, this.position.y - this.height * 0.25);
        ctx.stroke();
        
        // Draw legs
        ctx.fillStyle = '#5D4037'; // Dark brown
        ctx.fillRect(
            this.position.x + this.width * 0.2, 
            this.position.y + this.height * 0.7, 
            this.width * 0.1, 
            this.height * 0.3
        );
        ctx.fillRect(
            this.position.x + this.width * 0.7, 
            this.position.y + this.height * 0.7, 
            this.width * 0.1, 
            this.height * 0.3
        );
        
        ctx.restore();
    }
}

export class CannonTruck extends GameObject {
    private fireTimer: number = 0;
    private fireInterval: number = 3; // seconds
    private projectileSpeed: number = 300;
    
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
                this.position.x + this.width * 0.3, 
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
        ctx.fillRect(this.position.x, this.position.y + this.height * 0.4, this.width, this.height * 0.6);
        
        // Draw truck cab
        ctx.fillStyle = '#2c3e50'; // Darker blue
        ctx.fillRect(
            this.position.x, 
            this.position.y + this.height * 0.2, 
            this.width * 0.3, 
            this.height * 0.4
        );
        
        // Draw cannon/log holder
        ctx.fillStyle = '#95a5a6'; // Gray
        ctx.fillRect(
            this.position.x + this.width * 0.35, 
            this.position.y, 
            this.width * 0.1, 
            this.height * 0.4
        );
        ctx.fillRect(
            this.position.x + this.width * 0.75, 
            this.position.y, 
            this.width * 0.1, 
            this.height * 0.4
        );
        
        // Draw cannon
        ctx.fillStyle = '#7f8c8d'; // Darker gray
        ctx.fillRect(
            this.position.x + this.width * 0.3, 
            this.position.y + this.height * 0.2, 
            this.width * 0.5, 
            this.height * 0.2
        );
        
        // Draw wheels
        ctx.fillStyle = '#2c3e50'; // Dark blue
        ctx.beginPath();
        ctx.arc(this.position.x + this.width * 0.2, this.position.y + this.height, this.height * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.position.x + this.width * 0.8, this.position.y + this.height, this.height * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export class Rock extends GameObject {
    private rotationAngle: number = 0;
    private rotationSpeed: number = Math.random() * 2 - 1; // Random rotation
    
    constructor(x: number, y: number, vx: number) {
        super(x, y, 15, 15, ObjectType.Rock);
        this.velocity = new Vector2D(vx, 0);
        // Add a bit of random vertical velocity for more natural movement
        this.velocity = new Vector2D(vx, (Math.random() - 0.5) * 50);
    }
    
    update(deltaTime: number): void {
        this.rotationAngle += this.rotationSpeed * deltaTime;
        super.update(deltaTime);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Create a more interesting rock shape
        ctx.translate(this.position.x + this.width/2, this.position.y + this.height/2);
        ctx.rotate(this.rotationAngle);
        
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.moveTo(-this.width/2, -this.height/3);
        ctx.lineTo(-this.width/3, -this.height/2);
        ctx.lineTo(this.width/3, -this.height/2);
        ctx.lineTo(this.width/2, 0);
        ctx.lineTo(this.width/4, this.height/2);
        ctx.lineTo(-this.width/3, this.height/3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

export class Ground extends GameObject {
    constructor(x: number, y: number, width: number, height: number) {
        super(x, y, width, height, ObjectType.Ground);
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        // Draw ground with some texture
        ctx.save();
        
        // Main ground
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Grass on top
        ctx.fillStyle = '#2ecc71'; // Green
        ctx.fillRect(this.position.x, this.position.y, this.width, 5);
        
        // Add some texture with dots/rocks
        ctx.fillStyle = '#5D4037'; // Darker brown
        for (let i = 0; i < this.width; i += 30) {
            const rockSize = 2 + Math.random() * 3;
            ctx.fillRect(
                this.position.x + i + Math.random() * 20, 
                this.position.y + 5 + Math.random() * (this.height - 10), 
                rockSize, 
                rockSize
            );
        }
        
        ctx.restore();
    }
}
