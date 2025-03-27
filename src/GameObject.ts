import { Vector2D } from './Vector2D';

export enum ObjectType {
    Player,
    Elk,
    CannonTruck,
    Laser,
    Ground,
    Rock
}

export class GameObject {
    position: Vector2D;
    velocity: Vector2D;
    acceleration: Vector2D;
    width: number;
    height: number;
    isActive: boolean;
    type: ObjectType;
    
    constructor(
        x: number, 
        y: number, 
        width: number, 
        height: number,
        type: ObjectType
    ) {
        this.position = new Vector2D(x, y);
        this.velocity = Vector2D.zero();
        this.acceleration = Vector2D.zero();
        this.width = width;
        this.height = height;
        this.isActive = true;
        this.type = type;
    }

    update(deltaTime: number, ...args: any[]): void {
        // Apply physics
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Base rendering method - override in subclasses
    }

    intersects(other: GameObject): boolean {
        return (
            this.position.x < other.position.x + other.width &&
            this.position.x + this.width > other.position.x &&
            this.position.y < other.position.y + other.height &&
            this.position.y + this.height > other.position.y
        );
    }
    
    /**
     * Set the dimensions of the game object
     * Used for responsive resizing
     */
    setDimensions(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}
