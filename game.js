const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = 1000;
const HEIGHT = 800;
const bg = new Image();
bg.src = "assets/background_stars.png";

const playerImg = new Image();
playerImg.src = "assets/ship_2.png";

const enemyImg = new Image();
enemyImg.src = "assets/ship_1.png";

const kamikazeImg = new Image();
kamikazeImg.src = "assets/ship_3.png";

const PLAYER_VEL = 6;
const LASER_VEL = 10;
const ENEMY_LASER_VEL = 6;

ctx.font = "24px Arial";
const WHITE = "#ffffff";
const RED = "#ff0000";

function readHighScore() {
    const hs = localStorage.getItem("high_score");
    const name = localStorage.getItem("high_score_name");
    return {
      score: hs ? parseInt(hs) : 0
    };
  }
  
  function writeHighScore(score, name) {
    localStorage.setItem("high_score", score);
    localStorage.setItem("high_score_name", name);
  }
  
  function checkHighScore(score) {
    const { score: highScore } = readHighScore();
    if (score > highScore) {
      const name = prompt("Nouveau High Score ! Entrez votre nom :");
      writeHighScore(score, name);
      return { score, name };
    }
    return { score: highScore, name: readHighScore().name };
  }

function rectsCollide(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

class Enemy {
  constructor(x, y, target_y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    this.target_y = target_y;
    this.ready = false;
    this.lastMoveTime = Date.now();
    this.moveDelay = 2000;
    this.destination = null;
  }

  moveIntoPosition() {
    if (this.y < this.target_y) {
      this.y += 2;
    } else {
      this.ready = true;
    }
  }

  updateMovement() {
    if (!this.ready) {
      this.moveIntoPosition();
      return;
    }

    const now = Date.now();
    if (this.destination === null || now - this.lastMoveTime > this.moveDelay) {
      this.destination = [
        Math.floor(Math.random() * (WIDTH - this.width)),
        Math.floor(Math.random() * ((HEIGHT / 2) - 50)) + 50
      ];
      this.lastMoveTime = now;
    }

    const dx = this.destination[0] - this.x;
    const dy = this.destination[1] - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
      const speed = 2;
      this.x += speed * (dx / distance);
      this.y += speed * (dy / distance);
    }
  }

  draw(ctx, image) {
    ctx.drawImage(image, this.x, this.y, this.width, this.height);
  }

  shoot() {
    if (Math.random() < 0.3) {
      return { x: this.x + this.width / 2 - 2, y: this.y + this.height, width: 4, height: 20 };
    }
    return null;
  }
}

class BossEnemy extends Enemy {
  constructor(x, y, target_y) {
    super(x, y, target_y);
    this.health = 5;
    this.width = 80;
    this.height = 80;
    this.image = enemyImg;
  }

  draw(ctx) {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }

  shoot() {
    if (Math.random() < 0.5) {
      const lasers = [];
      lasers.push({
        direction: "center",
        rect: { x: this.x + this.width / 2 - 2, y: this.y + this.height, width: 4, height: 20 }
      });
      lasers.push({
        direction: "left",
        rect: { x: this.x + this.width / 2 - 10, y: this.y + this.height, width: 4, height: 20 }
      });
      lasers.push({
        direction: "right",
        rect: { x: this.x + this.width / 2 + 6, y: this.y + this.height, width: 4, height: 20 }
      });
      return lasers;
    }
    return [];
  }
}

class KamikazeEnemy extends Enemy {
  constructor(x, y, target_y) {
    super(x, y, target_y);
    this.image = kamikazeImg;
    this.speed = 7;
    this.collisionOffset = 10;
  }

  draw(ctx) {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }

  updateMovement(player) {
    if (!this.ready) {
      this.moveIntoPosition();
      return;
    }

    if (player) {
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        this.x += this.speed * (dx / distance);
        this.y += this.speed * (dy / distance);
      }
    }
  }

  getCollisionRect() {
    return {
      x: this.x - this.collisionOffset,
      y: this.y - this.collisionOffset,
      width: this.width + 2 * this.collisionOffset,
      height: this.height + 2 * this.collisionOffset
    };
  }
}

function draw(player, enemies, spawnEnemies, lasers, enemyLasers, score, multiplier, phase, spawnPhase) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  ctx.fillStyle = RED;
  lasers.forEach(laser => ctx.fillRect(laser.x, laser.y, laser.width, laser.height));

  ctx.fillStyle = "#00ffff";
  enemyLasers.forEach(laserObj => {
    ctx.fillRect(laserObj.rect.x, laserObj.rect.y, laserObj.rect.width, laserObj.rect.height);
  });

  enemies.concat(spawnEnemies).forEach(enemy => {
    if (enemy instanceof BossEnemy || enemy instanceof KamikazeEnemy) {
      enemy.draw(ctx);
    } else {
      enemy.draw(ctx, enemyImg);
    }
  });

  ctx.font = "24px Arial";
  ctx.fillStyle = WHITE;
  ctx.fillText("Score: " + Math.floor(score), 10, 30);
  ctx.fillText("Phase: " + phase, 10, 90);

  const { score: highScore, name: highScoreName } = readHighScore();
const highScoreText = "Meilleur score: " + highScore + " (" + highScoreName + ")";
const hsWidth = ctx.measureText(highScoreText).width;
ctx.fillText(highScoreText, WIDTH - hsWidth - 10, 30);


  if (spawnPhase) {
    const waveText = "Nouvelle Vague !";
    const textW = ctx.measureText(waveText).width;
    ctx.fillText(waveText, (WIDTH - textW) / 2, HEIGHT / 2);
  }
}

function gameOver(score) {
    const { score: highScore, name: highScoreName } = checkHighScore(score);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.font = "36px Arial";
    ctx.fillStyle = WHITE;
    const gameOverText = "Bouhhh t'es nul ! Ton score : " + Math.floor(score);
    const highScoreText = "Meilleur score: " + Math.floor(highScore) + " fait par " + highScoreName;
    const goWidth = ctx.measureText(gameOverText).width;
    const hsWidth = ctx.measureText(highScoreText).width;
    ctx.fillText(gameOverText, (WIDTH - goWidth) / 2, HEIGHT / 2 - 50);
    ctx.fillText(highScoreText, (WIDTH - hsWidth) / 2, HEIGHT / 2);
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
  

function createEnemyWave(num, phase) {
  const newEnemies = [];
  const spacing = 80;
  if (phase % 3 === 0) {
    const boss_x = Math.floor(WIDTH / 2 - 40);
    const boss_y = -150;
    const target_y = 100;
    const boss = new BossEnemy(boss_x, boss_y, target_y);
    newEnemies.push(boss);
    const sideEnemies = num - 1;
    for (let i = 0; i < sideEnemies; i++) {
      const x_offset = Math.floor((Math.floor(i / 2) + 1) * spacing);
      let x;
      if (i % 2 === 0) {
        x = boss_x - x_offset;
      } else {
        x = boss_x + x_offset + boss.width - 50;
      }
      const y = -Math.floor(Math.random() * 150 + 50);
      const target_y_rand = Math.floor(Math.random() * 120 + 80);
      newEnemies.push(new Enemy(x, y, target_y_rand));
    }
  } else {
    for (let i = 0; i < num; i++) {
      const x = Math.floor(Math.random() * (WIDTH - 150)) + 50;
      const y = -Math.floor(Math.random() * 150 + 50);
      const target_y = Math.floor(Math.random() * 120 + 80);
      if (phase >= 1 && Math.random() < 0.3) {
        newEnemies.push(new KamikazeEnemy(x, y, target_y));
      } else {
        newEnemies.push(new Enemy(x, y, target_y));
      }
    }
  }
  return newEnemies;
}

let player = { x: WIDTH / 2 - 25, y: HEIGHT - 60, width: 50, height: 50 };
let lasers = [];
let enemyLasers = [];
let enemies = [];
let enemySpawnList = [];
let laserCooldown = 0;
let enemyShootTimer = 0;
let phase = 1;
let multiplier = 2.0;
let score = 0;
let spawnPhase = false;

enemySpawnList = createEnemyWave(5 + phase, phase);

const keys = {};
window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });


function update() {
  if (keys["ArrowLeft"] && player.x > 0) {
    player.x -= PLAYER_VEL;
  }
  if (keys["ArrowRight"] && player.x + player.width < WIDTH) {
    player.x += PLAYER_VEL;
  }

  if (keys[" "] && laserCooldown <= 0) {
    lasers.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 20
    });
    laserCooldown = 15;
  }
  if (laserCooldown > 0) {
    laserCooldown--;
  }

  for (let i = lasers.length - 1; i >= 0; i--) {
    let laser = lasers[i];
    laser.y -= LASER_VEL;
    if (laser.y < 0) {
      lasers.splice(i, 1);
    } else {
      for (let j = enemies.length - 1; j >= 0; j--) {
        let enemy = enemies[j];
        if (rectsCollide(laser, enemy)) {
          if (enemy instanceof BossEnemy) {
            enemy.health -= 1;
            lasers.splice(i, 1);
            if (enemy.health <= 0) {
              enemies.splice(j, 1);
              score += 10 * multiplier;
            }
          } else {
            enemies.splice(j, 1);
            lasers.splice(i, 1);
            score += 1 * multiplier;
          }
          break;
        }
      }
    }
  }

  enemyShootTimer++;
  if (enemyShootTimer > 60) {
    for (let enemy of enemies) {
      let newLasers = enemy.shoot();
      if (Array.isArray(newLasers)) {
        for (let laserInfo of newLasers) {
          enemyLasers.push(laserInfo);
        }
      } else if (newLasers) {
        enemyLasers.push({ direction: "center", rect: newLasers });
      }
    }
    enemyShootTimer = 0;
  }

  for (let i = enemyLasers.length - 1; i >= 0; i--) {
    let laserObj = enemyLasers[i];
    if (laserObj.direction === "left") {
      laserObj.rect.x -= 3;
    } else if (laserObj.direction === "right") {
      laserObj.rect.x += 3;
    }
    laserObj.rect.y += ENEMY_LASER_VEL;
    if (laserObj.rect.y > HEIGHT) {
      enemyLasers.splice(i, 1);
    } else if (rectsCollide(laserObj.rect, player)) {
      draw(player, enemies, enemySpawnList, lasers, enemyLasers, score, multiplier, phase, spawnPhase);
      ctx.font = "24px Arial";
      ctx.fillStyle = WHITE;
      const lostText = "You Lost!";
      const textWidth = ctx.measureText(lostText).width;
      ctx.fillText(lostText, (WIDTH - textWidth) / 2, HEIGHT / 2);
      gameOver(score);
      return; 
    }
  }

  if (enemies.length === 0 && enemySpawnList.length === 0) {
    phase++;
    multiplier += 0.2;
    enemySpawnList = createEnemyWave(5 + phase, phase);
    spawnPhase = true;
  }

  if (enemySpawnList.length > 0) {
    let allReady = true;
    enemySpawnList.forEach(enemy => {
      enemy.moveIntoPosition();
      if (!enemy.ready) {
        allReady = false;
      }
    });
    if (allReady) {
      enemies.push(...enemySpawnList);
      enemySpawnList = [];
      spawnPhase = false;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    if (enemy instanceof KamikazeEnemy) {
      enemy.updateMovement(player);
      const colRect = enemy.getCollisionRect();
      if (rectsCollide(colRect, player)) {
        draw(player, enemies, enemySpawnList, lasers, enemyLasers, score, multiplier, phase, spawnPhase);
        ctx.font = "24px Arial";
        ctx.fillStyle = WHITE;
        const lostText = "You Lost!";
        const textWidth = ctx.measureText(lostText).width;
        ctx.fillText(lostText, (WIDTH - textWidth) / 2, HEIGHT / 2);
        gameOver(score);
        return;
      }
    } else {
      enemy.updateMovement();
    }
  }

  draw(player, enemies, enemySpawnList, lasers, enemyLasers, score, multiplier, phase, spawnPhase);
  requestAnimationFrame(update);
}


update();
