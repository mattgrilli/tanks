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
let currentScreen = 'mainMenu';

// Team data
const teams = [
    { name: 'USA', primaryColor: '#0A3161', secondaryColor: '#B31942', flag: '🇺🇸' },
    { name: 'UK', primaryColor: '#012169', secondaryColor: '#C8102E', flag: '🇬🇧' },
    { name: 'France', primaryColor: '#0055A4', secondaryColor: '#EF4135', flag: '🇫🇷' },
    { name: 'Germany', primaryColor: '#000000', secondaryColor: '#DD0000', flag: '🇩🇪' },
    { name: 'Japan', primaryColor: '#FFFFFF', secondaryColor: '#BC002D', flag: '🇯🇵' },
];

// Player data
let player1 = { team: teams[0], money: 0, upgrades: { damage: 0, armor: 0, fuel: 0 } };
let player2 = { team: teams[1], money: 0, upgrades: { damage: 0, armor: 0, fuel: 0 } };

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

// Sun and Moon
let sun = { x: 0, y: 0, radius: 20 };
let moon = { x: 0, y: 0, radius: 15 };

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

    // Draw sun or moon
    let celestialBody = dayCycleTime < 0.5 ? sun : moon;
    celestialBody.x = canvas.width * dayCycleTime;
    celestialBody.y = canvas.height * 0.2 * Math.sin(Math.PI * dayCycleTime) + canvas.height * 0.1;
    
    let bodyGradient = ctx.createRadialGradient(celestialBody.x, celestialBody.y, 0, celestialBody.x, celestialBody.y, celestialBody.radius);
    if (dayCycleTime < 0.5) {
        bodyGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        bodyGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    } else {
        bodyGradient.addColorStop(0, 'rgba(200, 200, 255, 1)');
        bodyGradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
    }
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(celestialBody.x, celestialBody.y, celestialBody.radius, 0, Math.PI * 2);
    ctx.fill();

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
    constructor(x, team, player) {
        this.x = x;
        this.team = team;
        this.player = player;
        this.angle = 45;
        this.power = 500;
        this.health = 100;
        this.maxHealth = 100;
        this.fuel = 100;
        this.maxFuel = 100;
        this.rollAngle = 0;
        this.rollVelocity = 0;
        this.isRolling = false;
    }

    draw() {
        let y = canvas.height - this.getTerrainHeight(this.x) - 20;
        
        ctx.save();
        ctx.translate(this.x, y);
        ctx.rotate(this.rollAngle * Math.PI / 180);
        
        // Tank body
        ctx.fillStyle = this.team.primaryColor;
        ctx.beginPath();
        ctx.moveTo(-25, 15);
        ctx.lineTo(-20, 0);
        ctx.lineTo(20, 0);
        ctx.lineTo(25, 15);
        ctx.closePath();
        ctx.fill();
        
        // Add shading to tank body
        let gradient = ctx.createLinearGradient(-25, 0, 25, 15);
        gradient.addColorStop(0, this.team.primaryColor);
        gradient.addColorStop(1, darkenColor(this.team.primaryColor, 30));
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Tank tracks
        ctx.fillStyle = '#333';
        ctx.fillRect(-30, 15, 60, 10);
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(-30 + i * 10, 15, 5, 10);
        }
        
        // Tank turret
        ctx.fillStyle = this.team.secondaryColor;
        ctx.beginPath();
        ctx.arc(0, -5, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Tank cannon
        ctx.beginPath();
        ctx.moveTo(0, -5);
        let cannonAngle = this.x < canvas.width / 2 ? this.angle : 180 - this.angle;
        ctx.lineTo(
            Math.cos(cannonAngle * Math.PI / 180) * 35,
            -5 - Math.sin(cannonAngle * Math.PI / 180) * 35
        );
        ctx.strokeStyle = darkenColor(this.team.secondaryColor, 20);
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Tank details
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, -5, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 25, y - 35, 50, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 25, y - 35, (this.health / this.maxHealth) * 50, 5);

        // Fuel bar
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x - 25, y - 42, 50, 5);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x - 25, y - 42, (this.fuel / this.maxFuel) * 50, 5);

        // Draw flag
        ctx.font = '20px Arial';
        ctx.fillText(this.team.flag, this.x - 10, y - 50);

        // Draw health and fuel text
        ctx.font = '12px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(`HP: ${Math.round(this.health)}/${this.maxHealth}`, this.x, y - 55);
        ctx.fillText(`Fuel: ${Math.round(this.fuel)}/${this.maxFuel}`, this.x, y - 68);

        // Draw power meter
        this.drawPowerMeter();
    }

    drawPowerMeter() {
        let meterWidth = 10;
        let meterHeight = 60;
        let x = this.x + (this === tank1 ? -50 : 40); // Position to the left of tank1 or right of tank2
        let y = canvas.height - this.getTerrainHeight(this.x) - 70;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, meterWidth + 4, meterHeight + 4);
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, meterWidth, meterHeight);
        
        let powerHeight = (this.power / 1000) * meterHeight;
        ctx.fillStyle = 'red';
        ctx.fillRect(x, y + meterHeight - powerHeight, meterWidth, powerHeight);

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + meterWidth / 2, y - 10);
        ctx.fillText('Power', 0, 0);
        ctx.restore();
    }

    getTerrainHeight(x) {
        let point = terrain.find(p => p.x >= x) || terrain[terrain.length - 1];
        return point.height;
    }

    fire() {
        if (this.fuel >= 10) {
            fireSound.currentTime = 0;
            fireSound.play().catch(e => console.log("Audio play failed:", e));
            let cannonAngle = this.x < canvas.width / 2 ? this.angle : 180 - this.angle;
            this.fuel -= 10; // Firing costs 10 fuel
            return new Projectile(this.x, canvas.height - this.getTerrainHeight(this.x) - 20, cannonAngle, this.power, this.player);
        } else {
            log(`${this.team.name} tank doesn't have enough fuel to fire!`);
            return null;
        }
    }

    takeDamage(amount) {
        let actualDamage = amount * (1 - this.player.upgrades.armor * 0.1); // Armor reduces damage
        this.health = Math.max(0, this.health - actualDamage);
        if (this.health <= 0) {
            gameOver = true;
            winner = this === tank1 ? tank2 : tank1;
        }
        return actualDamage;
    }

    move(direction) {
        if (this.fuel > 0) {
            let newX = this.x + direction * 5;
            if (newX > 30 && newX < canvas.width - 30) {
                let currentHeight = this.getTerrainHeight(this.x);
                let newHeight = this.getTerrainHeight(newX);
                this.x = newX;
                this.fuel = Math.max(0, this.fuel - 1); // Moving costs 1 fuel
                
                // Calculate roll angle based on terrain slope
                let slope = (newHeight - currentHeight) / 5; // 5 is the movement distance
                this.rollAngle = Math.atan(slope) * 180 / Math.PI;
                this.rollAngle = Math.max(-30, Math.min(30, this.rollAngle)); // Limit roll angle
                
                this.isRolling = true;
                this.rollVelocity = direction * 2; // Set roll velocity based on direction
            }
        } else {
            log(`${this.team.name} tank is out of fuel!`);
        }
    }

    updateRoll() {
        if (this.isRolling) {
            this.rollAngle += this.rollVelocity;
            this.rollAngle = Math.max(-30, Math.min(30, this.rollAngle)); // Limit roll angle
            
            // Slow down the roll
            this.rollVelocity *= 0.9;
            
            // Stop rolling when velocity is very low
            if (Math.abs(this.rollVelocity) < 0.1) {
                this.isRolling = false;
                this.rollVelocity = 0;
            }
        }
    }
}

class Projectile {
    constructor(x, y, angle, power, player) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.velocity = Math.sqrt(power) * 2;
        this.gravity = 9.8;
        this.time = 0;
        this.trail = [];
        this.player = player;
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

const tank1 = new Tank(50, player1.team, player1);
const tank2 = new Tank(730, player2.team, player2);
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
    
    for (let i = 0; i < 100; i++) {
        let angle = Math.random() * Math.PI * 2;
        let distance = Math.random() * 50;
        let particleX = x + Math.cos(angle) * distance;
        let particleY = y + Math.sin(angle) * distance;
        let size = Math.random() * 5 + 2;
        let hue = Math.random() * 60 + 15;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSky();
    drawTerrain();
    drawWind();
    
    tank1.updateRoll();
    tank2.updateRoll();
    
    tank1.draw();
    tank2.draw();
    
    if (projectile) {
        projectile.update();
        projectile.draw();
        
        let terrainHeight = getTerrainHeight(projectile.x);
        if (projectile.y > canvas.height - terrainHeight || projectile.x < 0 || projectile.x > canvas.width) {
            drawExplosion(projectile.x, projectile.y);
            destroyTerrain(projectile.x, projectile.y, 40);
            
            [tank1, tank2].forEach(tank => {
                let distance = Math.sqrt(Math.pow(tank.x - projectile.x, 2) + Math.pow((canvas.height - tank.getTerrainHeight(tank.x)) - projectile.y, 2));
                if (distance < 70) {
                    let baseDamage = Math.max(0, 70 - distance);
                    let actualDamage = tank.takeDamage(baseDamage * (1 + projectile.player.upgrades.damage * 0.1));
                    log(`${tank.team.name} tank took ${actualDamage.toFixed(1)} damage!`);
                    
                    // Award money for hit
                    projectile.player.money += Math.floor(actualDamage);
                    updateMoneyDisplay();
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
        ctx.fillText(`${winner.team.name} Wins!`, canvas.width / 2, canvas.height / 2);
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
    turnIndicator.textContent = `Current Turn: ${currentTank.team.name}`;
    turnIndicator.style.color = currentTank.team.primaryColor;
}

function updateMoneyDisplay() {
    document.getElementById('player1Money').textContent = `${player1.team.name}: $${player1.money}`;
    document.getElementById('player2Money').textContent = `${player2.team.name}: $${player2.money}`;
}

function resetGame() {
    gameOver = false;
    winner = null;
    tank1.health = tank1.maxHealth;
    tank2.health = tank2.maxHealth;
    tank1.fuel = tank1.maxFuel;
    tank2.fuel = tank2.maxFuel;
    currentTank = tank1;
    projectile = null;
    // Money and upgrades are not reset to persist between rounds
    initializeTerrain();
    updateWind();
    updateControls();
    updateTurnIndicator();
    updateMoneyDisplay();
    gameLoop();
}

function AITurn() {
    if (!gameOver && currentTank === tank2) {
        let distanceToPlayer = Math.abs(tank2.x - tank1.x);
        let heightDifference = tank2.getTerrainHeight(tank2.x) - tank1.getTerrainHeight(tank1.x);
        
        tank2.angle = Math.min(89, Math.max(1, 45 + (heightDifference / distanceToPlayer) * 45));
        tank2.power = Math.min(1000, Math.max(200, distanceToPlayer * 1.5));
        
        // Add randomness within limits
        tank2.angle = Math.min(89, Math.max(1, tank2.angle + (Math.random() - 0.5) * 10));
        tank2.power = Math.min(1000, Math.max(200, tank2.power + (Math.random() - 0.5) * 100));
        
        updateControls();
        projectile = tank2.fire();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    currentScreen = screenId;
}

function initializeTeamSelection() {
    const player1Select = document.getElementById('player1Team');
    const player2Select = document.getElementById('player2Team');
    player1Select.innerHTML = '';
    player2Select.innerHTML = '';
    teams.forEach((team, index) => {
        player1Select.innerHTML += `<option value="${index}">${team.flag} ${team.name}</option>`;
        player2Select.innerHTML += `<option value="${index}">${team.flag} ${team.name}</option>`;
    });

    player1Select.addEventListener('change', () => updateTeamPreview('player1'));
    player2Select.addEventListener('change', () => updateTeamPreview('player2'));

    // Initialize previews
    updateTeamPreview('player1');
    updateTeamPreview('player2');
}

function updateTeamPreview(playerID) {
    const select = document.getElementById(`${playerID}Team`);
    const flagContainer = document.querySelector(`#${playerID}Selection .flag-container`);
    const tankPreview = document.querySelector(`#${playerID}Selection .tank-preview`);
    const selectedTeam = teams[select.value];

    flagContainer.textContent = selectedTeam.flag;
    drawTankPreview(tankPreview, selectedTeam);
}

function drawTankPreview(canvas, team) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw tank body
    ctx.fillStyle = team.primaryColor;
    ctx.beginPath();
    ctx.moveTo(20, 45);
    ctx.lineTo(25, 30);
    ctx.lineTo(75, 30);
    ctx.lineTo(80, 45);
    ctx.closePath();
    ctx.fill();
    
    // Draw tank turret
    ctx.fillStyle = team.secondaryColor;
    ctx.beginPath();
    ctx.arc(50, 25, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tank cannon
    ctx.beginPath();
    ctx.moveTo(50, 25);
    ctx.lineTo(85, 20);
    ctx.strokeStyle = darkenColor(team.secondaryColor, 20);
    ctx.lineWidth = 8;
    ctx.stroke();
}

function startGame() {
    player1.team = teams[document.getElementById('player1Team').value];
    player2.team = teams[document.getElementById('player2Team').value];
    tank1.team = player1.team;
    tank2.team = player2.team;
    showScreen('gameScreen');
    resetGame();
}

function saveGame() {
    const gameState = {
        player1: player1,
        player2: player2,
        tank1: {
            x: tank1.x,
            angle: tank1.angle,
            power: tank1.power,
            health: tank1.health,
            fuel: tank1.fuel
        },
        tank2: {
            x: tank2.x,
            angle: tank2.angle,
            power: tank2.power,
            health: tank2.health,
            fuel: tank2.fuel
        },
        currentTank: currentTank === tank1 ? 'tank1' : 'tank2',
        terrain: terrain,
        windSpeed: windSpeed,
        isAIMode: isAIMode
    };
    localStorage.setItem('tankGameSave', JSON.stringify(gameState));
    alert('Game saved successfully!');
}

function loadGame() {
    const savedGame = localStorage.getItem('tankGameSave');
    if (savedGame) {
        const gameState = JSON.parse(savedGame);
        player1 = gameState.player1;
        player2 = gameState.player2;
        tank1 = new Tank(gameState.tank1.x, player1.team, player1);
        tank2 = new Tank(gameState.tank2.x, player2.team, player2);
        tank1.angle = gameState.tank1.angle;
        tank1.power = gameState.tank1.power;
        tank1.health = gameState.tank1.health;
        tank1.fuel = gameState.tank1.fuel;
        tank2.angle = gameState.tank2.angle;
        tank2.power = gameState.tank2.power;
        tank2.health = gameState.tank2.health;
        tank2.fuel = gameState.tank2.fuel;
        currentTank = gameState.currentTank === 'tank1' ? tank1 : tank2;
        terrain = gameState.terrain;
        windSpeed = gameState.windSpeed;
        isAIMode = gameState.isAIMode;
        updateControls();
        updateTurnIndicator();
        updateMoneyDisplay();
        showScreen('gameScreen');
        gameLoop();
    } else {
        alert('No saved game found!');
    }
}

function showUpgradeStore() {
    const storeDiv = document.getElementById('upgradeStore');
    storeDiv.innerHTML = `
        <h3>Upgrades for ${currentTank.team.name}</h3>
        <button onclick="buyUpgrade('damage')">Upgrade Damage ($100)</button>
        <button onclick="buyUpgrade('armor')">Upgrade Armor ($150)</button>
        <button onclick="buyUpgrade('fuel')">Upgrade Fuel Capacity ($200)</button>
        <button onclick="closeUpgradeStore()">Close Store</button>
    `;
    storeDiv.classList.remove('hidden');
}

function closeUpgradeStore() {
    document.getElementById('upgradeStore').classList.add('hidden');
}

function buyUpgrade(type) {
    const costs = { damage: 100, armor: 150, fuel: 200 };
    if (currentTank.player.money >= costs[type]) {
        currentTank.player.money -= costs[type];
        currentTank.player.upgrades[type]++;
        updateMoneyDisplay();
        log(`${currentTank.team.name} upgraded ${type}!`);
        
        if (type === 'fuel') {
            currentTank.maxFuel += 20;
            currentTank.fuel = currentTank.maxFuel;
        }
    } else {
        log(`Not enough money to upgrade ${type}!`);
    }
}

// Event Listeners
document.getElementById('newGameBtn').addEventListener('click', () => {
    showScreen('teamSelection');
    initializeTeamSelection();
});

document.getElementById('loadGameBtn').addEventListener('click', loadGame);

document.getElementById('startGameBtn').addEventListener('click', startGame);

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
        if (projectile) {
            log(`${currentTank.team.name} tank fired!`);
        }
    }
});

document.getElementById('moveLeftBtn').addEventListener('click', () => {
    currentTank.move(-1);
    updateControls();
});

document.getElementById('moveRightBtn').addEventListener('click', () => {
    currentTank.move(1);
    updateControls();
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

document.getElementById('saveGameBtn').addEventListener('click', saveGame);

document.getElementById('mainMenuBtn').addEventListener('click', () => {
    showScreen('mainMenu');
});

document.getElementById('openStoreBtn').addEventListener('click', showUpgradeStore);

// Hot keys
document.addEventListener('keydown', (e) => {
    if (currentScreen === 'gameScreen' && !gameOver) {
        switch(e.key) {
            case ' ':
                if (!projectile) document.getElementById('fireButton').click();
                break;
            case 'ArrowLeft':
                document.getElementById('moveLeftBtn').click();
                break;
            case 'ArrowRight':
                document.getElementById('moveRightBtn').click();
                break;
            case 'ArrowUp':
                currentTank.angle = Math.min(89, currentTank.angle + 1);
                updateControls();
                break;
            case 'ArrowDown':
                currentTank.angle = Math.max(1, currentTank.angle - 1);
                updateControls();
                break;
            case 'PageUp':
                currentTank.power = Math.min(1000, currentTank.power + 10);
                updateControls();
                break;
            case 'PageDown':
                currentTank.power = Math.max(200, currentTank.power - 10);
                updateControls();
                break;
            case 's':
                showUpgradeStore();
                break;
        }
    }
});

// Initialize the game
showScreen('mainMenu');
initializeTerrain();
updateWind();
updateControls();
updateTurnIndicator();
updateMoneyDisplay();
log('Game initialized. Welcome to Advanced Tank Game!');

// Explanation of upgrades:
// 1. Damage: Increases the damage dealt by projectiles
// 2. Armor: Reduces the damage taken from enemy projectiles
// 3. Fuel: Increases the maximum fuel capacity, allowing for more movement and shots

log('Upgrade explanations:');
log('- Damage: Increases projectile damage');
log('- Armor: Reduces damage taken from enemy projectiles');
log('- Fuel: Increases maximum fuel capacity for more movement and shots');