import { Game } from './Game';

// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game('game-canvas');
    game.start();
    
    // No longer showing instructions overlay since we have a built-in start screen
    // showInstructions();
});

// Empty function kept for compatibility
function showInstructions(): void {
    // Instructions removed - now using the built-in start screen
}
