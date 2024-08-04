const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debug = document.getElementById('debug');

// Sound effects
const fireSound = document.getElementById('fireSound');
const explosionSound = document.getElementById('explosionSound');
const windSound = document.getElementById('windSound');

// Game state
let gameOver = false;
let winner = null;
let isAIMode = false;

function log(msg) {
    console.log(msg);
    debug.innerHTML += msg + '<br>';
    debug.scrollTop = debug.scrollHeight;
}

// Static background
const mountains = [];
for (let i = 0; i < 3; i++) {
    mountains.push({
        x: i * (canvas.width / 3) + Math.random() * 100,
        height: 50 + Math.random() * 100,
        width: 200 + Math.random() * 300
    });
}

// Stars
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height / 2,
        size: Math.random() * 2,
        twinkleSpeed: 0.001 + Math.random() * 0.002
    });
}

// Day/Night cycle
let dayCycleTime = 0;
function drawSky() {
    dayCycleTime += 0.0001;
    if (dayCycleTime > 1) dayCycleTime -= 1;

    let skyColor;
    if (dayCycleTime < 0.25) { // Night to sunrise
        skyColor = interpolateColor("#000033", "#FF6347", dayCycleTime * 4);
    } else if (dayCycleTime < 0.5) { // Sunrise to midday
        skyColor = interpolateColor("#FF6347", "#87CEEB", (dayCycleTime - 0.25) * 4);
    } else if (dayCycleTime < 0.75) { // Midday to sunset
        skyColor = interpolateColor("#87CEEB", "#FF6347", (dayCycleTime - 0.5) * 4);
    } else { // Sunset to night
        skyColor = interpolateColor("#FF6347", "#000033", (dayCycleTime - 0.75) * 4);
    }

    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyColor);
    gradient.addColorStop(1, lightenColor(skyColor, 30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars if it's nighttime
    if (dayCycleTime > 0.75 || dayCycleTime < 0.25) {
        stars.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(Date.now() * star.twinkleSpeed) * 0.5})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw static mountains
    mountains.forEach(mountain => {
        ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
        ctx.beginPath();
        ctx.moveTo(mountain.x, canvas.height);
        ctx.lineTo(mountain.x + mountain.width / 2, canvas.height - mountain.height);
        ctx.lineTo(mountain.x + mountain.width, canvas.height);
        ctx.fill();
    });
}

function interpolateColor(color1, color2, factor) {
    let result = "#";
    for (let i = 1; i <= 3; i++) {
        let c1 = parseInt(color1.substr(i*2-1, 2), 16);
        let c2 = parseInt(color2.substr(i*2-1, 2), 16);
        let c = Math.round(c1 + factor * (c2 - c1));
        result += c.toString(16).padStart(2, '0');
    }
    return result;
}

function lightenColor(color, percent) {
    let num = parseInt(color.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = Math.min(255, (num >> 16) + amt);
    let G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    let B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(color, percent) {
    let num = parseInt(color.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = Math.max(0, (num >> 16) - amt);
    let G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    let B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Terrain
let terrain = [];
let rocks = [];
const terrainResolution = 5;

function initializeTerrain() {
    terrain = [];
    let height = 100 + Math.random() * 50;
    let plateauLength = 0;
    for (let x = 0; x < canvas.width; x += terrainResolution) {
        if (plateauLength > 0) {
            plateauLength--;
        } else {
            if (Math.random() < 0.1) {
                height = Math.max(50, Math.min(250, height + (Math.random() - 0.5) * 40));
                plateauLength = Math.floor(Math.random() * 10);
            } else {
                height += (Math.random() - 0.5) * 10;
            }
        }
        terrain.push({x: x, height: height});
    }
    
    // Initialize rocks
    rocks = [];
    for (let i = 0; i < 20; i++) {
        rocks.push({
            x: Math.random() * canvas.width,
            size: 2 + Math.random() * 4
        });
    }
    
    log('Terrain and rocks initialized');
}

function drawTerrain() {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    terrain.forEach(point => {
        ctx.lineTo(point.x, canvas.height - point.height);
    });
    ctx.lineTo(canvas.width, canvas.height);
    
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#4CAF50");
    gradient.addColorStop(1, "#1B5E20");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add terrain texture
    for (let x = 0; x < canvas.width; x += 5) {
        for (let y = canvas.height - getTerrainHeight(x); y < canvas.height; y += 5) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // Draw rocks
    rocks.forEach(rock => {
        let y = canvas.height - getTerrainHeight(rock.x);
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(rock.x, y, rock.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function destroyTerrain(x, y, radius) {
    terrain.forEach(point => {
        let dx = point.x - x;
        let dy = (canvas.height - point.height) - y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < radius) {
            point.height = Math.max(0, point.height - (radius - distance) / 2);
        }
    });
    
    // Remove rocks within the blast radius
    rocks = rocks.filter(rock => {
        let dx = rock.x - x;
        let dy = (canvas.height - getTerrainHeight(rock.x)) - y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        return distance > radius;
    });
}

// Wind
let windSpeed = 0;
const maxWindSpeed = 5;

function updateWind() {
    windSpeed = Math.random() * maxWindSpeed * 2 - maxWindSpeed;
    updateWindIndicator();
    if (windSound.paused) {
        windSound.play().catch(e => console.log("Audio play failed:", e));
    }
}

function updateWindIndicator() {
    const windIndicator = document.getElementById('windIndicator');
    const direction = windSpeed > 0 ? 'right' : 'left';
    const strength = Math.abs(windSpeed);
    windIndicator.textContent = `Wind: ${direction} (${strength.toFixed(1)})`;
    windIndicator.style.color = windSpeed > 0 ? '#3498db' : '#e74c3c';
}

function drawWind() {
    const arrowLength = Math.abs(windSpeed) * 20;
    const arrowX = canvas.width / 2;
    const arrowY = 30;
    
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX + (windSpeed > 0 ? arrowLength : -arrowLength), arrowY);
    ctx.strokeStyle = windSpeed > 0 ? '#3498db' : '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    if (windSpeed > 0) {
        ctx.moveTo(arrowX + arrowLength, arrowY);
        ctx.lineTo(arrowX + arrowLength - 10, arrowY - 5);
        ctx.lineTo(arrowX + arrowLength - 10, arrowY + 5);
    } else {
        ctx.moveTo(arrowX - arrowLength, arrowY);
        ctx.lineTo(arrowX - arrowLength + 10, arrowY - 5);
        ctx.lineTo(arrowX - arrowLength + 10, arrowY + 5);
    }
    ctx.fillStyle = windSpeed > 0 ? '#3498db' : '#e74c3c';
    ctx.fill();
}

class Tank {
    constructor(x, color) {
        this.x = x;
        this.color = color;
        this.angle = 45;
        this.power = 500;
        this.health = 100;
    }
    draw() {
        let y = canvas.height - this.getTerrainHeight(this.x) - 20;
        
        // Tank body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x - 25, y + 15);
        ctx.lineTo(this.x - 20, y);
        ctx.lineTo(this.x + 20, y);
        ctx.lineTo(this.x + 25, y + 15);
        ctx.closePath();
        ctx.fill();
        
        // Add shading to tank body
        let gradient = ctx.createLinearGradient(this.x - 25, y, this.x + 25, y + 15);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, darkenColor(this.color, 30));
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Tank tracks
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 30, y + 15, 60, 10);
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(this.x - 30 + i * 10, y + 15, 5, 10);
        }
        
        // Tank turret
        ctx.fillStyle = lightenColor(this.color, 10);
        ctx.beginPath();
        ctx.arc(this.x, y - 5, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Tank cannon
        ctx.beginPath();
        ctx.moveTo(this.x, y - 5);
        let cannonAngle = this.x < canvas.width / 2 ? this.angle : 180 - this.angle;
        ctx.lineTo(
            this.x + Math.cos(cannonAngle * Math.PI / 180) * 35,
            y - 5 - Math.sin(cannonAngle * Math.PI / 180) * 35
        );
        ctx.strokeStyle = darkenColor(this.color, 20);
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Tank details
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x, y - 5, 8, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 25, y - 35, 50, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 25, y - 35, this.health / 2, 5);
    }
    getTerrainHeight(x) {
        let point = terrain.find(p => p.x >= x) || terrain[terrain.length - 1];
        return point.height;
    }
    fire() {
        fireSound.currentTime = 0;
        fireSound.play().catch(e => console.log("Audio play failed:", e));
        let cannonAngle = this.x < canvas.width / 2 ? this.angle : 180 - this.angle;
        return new Projectile(this.x, canvas.height - this.getTerrainHeight(this.x) - 20, cannonAngle, this.power);
    }
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            gameOver = true;
            winner = this === tank1 ? tank2 : tank1;
        }
    }
}

class Projectile {
    constructor(x, y, angle, power) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.velocity = power / 20; // Adjusted for the new power range
        this.gravity = 9.8;
        this.time = 0;
        this.trail = [];
    }
    update() {
        this.time += 0.1;
        this.x += this.velocity * Math.cos(this.angle * Math.PI / 180) * 0.1;
        this.y -= (this.velocity * Math.sin(this.angle * Math.PI / 180) - 0.5 * this.gravity * this.time) * 0.1;
        this.x += windSpeed * 0.1;
        
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 20) this.trail.shift();
    }
    draw() {
        // Draw trail
        ctx.beginPath();
        this.trail.forEach((point, index) => {
            ctx.strokeStyle = `rgba(255, 100, 100, ${index / this.trail.length})`;
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();

        // Draw projectile
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const tank1 = new Tank(50, '#e74c3c');
const tank2 = new Tank(730, '#3498db');
let currentTank = tank1;
let projectile = null;

function getTerrainHeight(x) {
    let leftPoint = terrain.find(p => p.x <= x) || terrain[0];
    let rightPoint = terrain.find(p => p.x > x) || terrain[terrain.length - 1];
    let t = (x - leftPoint.x) / (rightPoint.x - leftPoint.x);
    return leftPoint.height * (1 - t) + rightPoint.height * t;
}

function drawExplosion(x, y) {
    explosionSound.currentTime = 0;
    explosionSound.play().catch(e => console.log("Audio play failed:", e));
    
    for (let i = 0; i < 100; i++) { // Increased number of particles
        let angle = Math.random() * Math.PI * 2;
        let distance = Math.random() * 50; // Increased explosion radius
        let particleX = x + Math.cos(angle) * distance;
        let particleY = y + Math.sin(angle) * distance;
        let size = Math.random() * 5 + 2; // Increased particle size
        let hue = Math.random() * 60 + 15; // Random orange-ish color
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPowerMeter() {
    let meterWidth = 100;
    let meterHeight = 10;
    let x = currentTank.x - meterWidth / 2;
    let y = canvas.height - getTerrainHeight(currentTank.x) - 70; // Moved up to avoid overlapping with health bar

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 2, y - 2, meterWidth + 4, meterHeight + 4);
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, meterWidth, meterHeight);
    ctx.fillStyle = 'red';
    ctx.fillRect(x, y, (currentTank.power / 1000) * meterWidth, meterHeight);

    // Add label
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Power', x + meterWidth / 2, y - 5);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSky();
    drawTerrain();
    drawWind();
    tank1.draw();
    tank2.draw();
    drawPowerMeter();
    
    if (projectile) {
        projectile.update();
        projectile.draw();
        
        let terrainHeight = getTerrainHeight(projectile.x);
        if (projectile.y > canvas.height - terrainHeight || projectile.x < 0 || projectile.x > canvas.width) {
            drawExplosion(projectile.x, projectile.y);
            destroyTerrain(projectile.x, projectile.y, 40); // Increased destruction radius
            
            // Check for damage to tanks
            [tank1, tank2].forEach(tank => {
                let distance = Math.sqrt(Math.pow(tank.x - projectile.x, 2) + Math.pow((canvas.height - tank.getTerrainHeight(tank.x)) - projectile.y, 2));
                if (distance < 70) {  // Increased blast radius for better hit detection
                    let damage = Math.max(0, 70 - distance);
                    tank.takeDamage(damage);
                    log(`${tank.color === '#e74c3c' ? 'Red' : 'Blue'} tank took ${damage.toFixed(1)} damage!`);
                }
            });
            
            log(`Projectile landed at (${projectile.x.toFixed(2)}, ${projectile.y.toFixed(2)})`);
            projectile = null;
            if (!gameOver) {
                currentTank = currentTank === tank1 ? tank2 : tank1;
                updateControls();
                updateTurnIndicator();
                updateWind();
                if (isAIMode && currentTank === tank2) {
                    setTimeout(AITurn, 1000);
                }
            }
        }
    }
    
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${winner.color === '#e74c3c' ? 'Red' : 'Blue'} Tank Wins!`, canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Click to play again', canvas.width / 2, canvas.height / 2 + 40);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function updateControls() {
    document.getElementById('angleInput').value = currentTank.angle;
    document.getElementById('powerInput').value = currentTank.power;
    document.getElementById('angleValue').textContent = currentTank.angle;
    document.getElementById('powerValue').textContent = currentTank.power;
}

function updateTurnIndicator() {
    const turnIndicator = document.getElementById('turnIndicator');
    turnIndicator.textContent = `Current Turn: ${currentTank.color === '#e74c3c' ? 'RED' : 'BLUE'} tank`;
    turnIndicator.style.color = currentTank.color;
}

function resetGame() {
    gameOver = false;
    winner = null;
    tank1.health = 100;
    tank2.health = 100;
    currentTank = tank1;
    projectile = null;
    initializeTerrain();
    updateWind();
    updateControls();
    updateTurnIndicator();
    gameLoop();
}

function AITurn() {
    if (!gameOver && currentTank === tank2) {
        // Improved AI logic
        let distanceToPlayer = Math.abs(tank2.x - tank1.x);
        let heightDifference = tank2.getTerrainHeight(tank2.x) - tank1.getTerrainHeight(tank1.x);
        
        // Adjust angle based on distance and height difference
        tank2.angle = Math.min(89, Math.max(1, 45 + (heightDifference / distanceToPlayer) * 45));
        
        // Adjust power based on distance
        tank2.power = Math.min(1000, Math.max(200, distanceToPlayer * 2));
        
        // Add some randomness
        tank2.angle += (Math.random() - 0.5) * 10;
        tank2.power += (Math.random() - 0.5) * 100;
        
        updateControls();
        projectile = tank2.fire();
    }
}

document.getElementById('angleInput').addEventListener('input', (e) => {
    currentTank.angle = parseInt(e.target.value);
    document.getElementById('angleValue').textContent = currentTank.angle;
});

document.getElementById('powerInput').addEventListener('input', (e) => {
    currentTank.power = parseInt(e.target.value);
    document.getElementById('powerValue').textContent = currentTank.power;
});

document.getElementById('fireButton').addEventListener('click', () => {
    if (!projectile && !gameOver && (currentTank === tank1 || !isAIMode)) {
        projectile = currentTank.fire();
        log(`${currentTank.color === '#e74c3c' ? 'Red' : 'Blue'} tank fired!`);
    }
});

canvas.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
    }
});

document.getElementById('aiToggle').addEventListener('change', (e) => {
    isAIMode = e.target.checked;
    if (isAIMode && currentTank === tank2) {
        setTimeout(AITurn, 1000);
    }
});

initializeTerrain();
updateWind();
updateControls();
updateTurnIndicator();
log('Starting game loop');
gameLoop();