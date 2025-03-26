import { Game } from './Game';

// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game('game-canvas');
    game.start();
    
    // Show game instructions
    showInstructions();
});

function showInstructions(): void {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    instructions.style.color = 'white';
    instructions.style.padding = '20px';
    instructions.style.borderRadius = '10px';
    instructions.style.zIndex = '1000';
    instructions.style.textAlign = 'center';
    
    instructions.innerHTML = `
        <h2>Cannonda</h2>
        <p>Drive your dump truck filled with rocks backwards!</p>
        <ul style="text-align: left;">
            <li>Left/Right Arrow: Move your truck (reversed controls)</li>
            <li>Up Arrow: Jump over elk (double-jump capable)</li>
            <li>Down Arrow: Shoot lasers from your back headlights</li>
        </ul>
        <p>Avoid cannon trucks and their projectiles!</p>
        <p>Click to start</p>
    `;
    
    gameContainer.appendChild(instructions);
    
    // Remove instructions on click
    instructions.addEventListener('click', () => {
        instructions.remove();
    });
}
