const { loadProfile, addGold, completeLevel } = require("../../utils/profile");

const LEVELS = [
  { id: 1, code: "1-1", name: "星港外围", desc: "60 秒割草热身，随后迎战巡航 Boss。", spawn: 0.3, bossHp: 7600, reward: 180 },
  { id: 2, code: "1-2", name: "碎星航道", desc: "敌群更密，Boss 弹幕更紧。", spawn: 0.24, bossHp: 10200, reward: 260 },
  { id: 3, code: "1-3", name: "核心闸门", desc: "第一章压轴战，Boss 血量厚、弹幕多。", spawn: 0.18, bossHp: 13800, reward: 380 }
];

Page({
  data: {
    mode: "select",
    hud: { level: "1-1", time: 60, lives: 3, gold: 0 },
    levels: [],
    selectedLevel: 1,
    selectedLevelCode: "1-1",
    result: { kicker: "RESULT", title: "战斗结束", body: "" }
  },

  onLoad() {
    this.profile = loadProfile();
    this.selectedLevel = Math.max(1, Math.min(this.profile.battle.unlockedLevel, 3));
    this.syncLevels();
  },

  onReady() {
    this.initCanvas();
  },

  onUnload() {
    this.stopLoop();
    if (this.returnTimer) clearTimeout(this.returnTimer);
  },

  initCanvas() {
    wx.createSelectorQuery()
      .select("#battleCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0];
        if (!info || !info.node) return;
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = windowInfo.pixelRatio || 1;
        this.canvas = info.node;
        this.ctx = this.canvas.getContext("2d");
        this.width = info.width;
        this.height = info.height;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.assets = {};
        this.loadCanvasImage("player", "/assets/images/player-ship-lite.png");
        this.loadCanvasImage("enemy", "/assets/images/enemy-small-01-lite.png");
        this.loadCanvasImage("boss", "/assets/images/boss-lite.png");
        this.createMenuScene();
        this.drawScene();
      });
  },

  loadCanvasImage(key, src) {
    const image = this.canvas.createImage();
    image.onload = () => {
      this.assets[key] = image;
      this.drawScene();
    };
    image.src = src;
  },

  syncLevels() {
    const profile = loadProfile();
    this.profile = profile;
    const levels = LEVELS.map((level) => {
      const locked = level.id > profile.battle.unlockedLevel;
      return {
        ...level,
        active: level.id === this.selectedLevel,
        locked,
        state: profile.battle.completed.includes(level.id) ? "已通关，可重复挑战" : locked ? "未解锁" : "已解锁"
      };
    });
    this.setData({
      levels,
      selectedLevel: this.selectedLevel,
      selectedLevelCode: LEVELS[this.selectedLevel - 1].code,
      hud: { ...this.data.hud, level: LEVELS[this.selectedLevel - 1].code, gold: profile.resources.gold }
    });
  },

  createMenuScene() {
    this.state = {
      mode: "select",
      stars: this.createStars(),
      player: this.createPlayer(),
      bullets: [],
      enemies: [],
      enemyBullets: [],
      particles: [],
      boss: null,
      elapsed: 0,
      duration: 60,
      enemyTimer: 0,
      shootTimer: 0,
      levelGold: 0,
      pointer: { active: false, x: (this.width || 390) / 2, y: (this.height || 844) - 120 },
      revived: false,
      damageMult: 1,
      invincible: 0,
      bossStarted: false
    };
  },

  createPlayer() {
    const armor = this.profile && this.profile.battle && this.profile.battle.upgrades ? this.profile.battle.upgrades.armor || 0 : 0;
    return {
      x: (this.width || 390) / 2,
      y: (this.height || 844) - 120,
      radius: 22,
      lives: 3 + armor
    };
  },

  createStars() {
    const width = this.width || 390;
    const height = this.height || 844;
    return Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.4,
      speed: Math.random() * 80 + 45
    }));
  },

  selectLevel(event) {
    this.selectedLevel = Number(event.currentTarget.dataset.id) || 1;
    this.syncLevels();
  },

  startSelectedLevel() {
    this.startLevel(this.selectedLevel);
  },

  restartLevel() {
    this.startLevel(this.selectedLevel);
  },

  backToSelect() {
    this.stopLoop();
    this.createMenuScene();
    this.setData({ mode: "select" });
    this.syncLevels();
    this.drawScene();
  },

  startLevel(levelId) {
    const level = LEVELS[levelId - 1];
    this.stopLoop();
    this.selectedLevel = levelId;
    this.state = {
      mode: "fight",
      level,
      stars: this.createStars(),
      player: this.createPlayer(),
      bullets: [],
      enemies: [],
      enemyBullets: [],
      particles: [],
      boss: null,
      elapsed: 0,
      duration: 60,
      enemyTimer: 0,
      shootTimer: 0,
      levelGold: 0,
      pointer: { active: false, x: (this.width || 390) / 2, y: (this.height || 844) - 120 },
      revived: false,
      damageMult: 1,
      invincible: 0,
      bossStarted: false
    };
    this.setData({ mode: "fight", hud: { level: level.code, time: 60, lives: this.state.player.lives, gold: this.profile.resources.gold } });
    this.lastTime = Date.now();
    this.loop();
  },

  loop() {
    if (!this.canvas || !this.state || this.state.mode !== "fight") return;
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;
    this.update(dt);
    this.drawScene();
    this.frameId = this.canvas.requestAnimationFrame ? this.canvas.requestAnimationFrame(() => this.loop()) : setTimeout(() => this.loop(), 16);
  },

  stopLoop() {
    if (!this.frameId) return;
    if (this.canvas && this.canvas.cancelAnimationFrame) this.canvas.cancelAnimationFrame(this.frameId);
    else clearTimeout(this.frameId);
    this.frameId = null;
  },

  update(dt) {
    const state = this.state;
    state.elapsed += dt;
    state.invincible = Math.max(0, state.invincible - dt);
    this.updateStars(dt);
    this.updatePlayer(dt);
    this.autoShoot(dt);
    this.updateBullets(dt);
    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.spawnBoss();
    this.updateBoss(dt);
    this.updateEnemyBullets(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    const time = state.boss ? "BOSS" : Math.max(0, Math.ceil(state.duration - state.elapsed));
    this.setData({
      hud: {
        level: state.level.code,
        time,
        lives: state.player.lives,
        gold: this.profile.resources.gold + state.levelGold
      }
    });
  },

  updateStars(dt) {
    for (const star of this.state.stars) {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  },

  updatePlayer(dt) {
    const player = this.state.player;
    const pointer = this.state.pointer;
    if (pointer.active) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 12);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 12);
    }
    player.x = Math.max(28, Math.min(this.width - 28, player.x));
    player.y = Math.max(this.height * 0.36, Math.min(this.height - 44, player.y));
  },

  autoShoot(dt) {
    const state = this.state;
    state.shootTimer -= dt;
    if (state.shootTimer > 0) return;
    state.shootTimer = state.damageMult > 1 ? 0.055 : 0.085;
    const p = state.player;
    const damage = 8 * state.damageMult;
    const lanes = [-24, -12, 0, 12, 24];
    for (const offset of lanes) {
      state.bullets.push({ x: p.x + offset, y: p.y - 24, vx: offset * 1.8, vy: -620, radius: offset === 0 ? 5 : 4, damage });
    }
    if (state.damageMult > 1) {
      state.bullets.push({ x: p.x - 36, y: p.y - 10, vx: -80, vy: -560, radius: 6, damage: damage * 1.4 });
      state.bullets.push({ x: p.x + 36, y: p.y - 10, vx: 80, vy: -560, radius: 6, damage: damage * 1.4 });
    }
  },

  updateBullets(dt) {
    for (const bullet of this.state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    this.state.bullets = this.state.bullets.filter((bullet) => bullet.y > -40 && bullet.x > -40 && bullet.x < this.width + 40 && !bullet.dead);
  },

  spawnEnemies(dt) {
    const state = this.state;
    if (state.boss || state.elapsed >= state.duration) return;
    state.enemyTimer -= dt;
    if (state.enemyTimer > 0) return;
    state.enemyTimer = Math.max(0.11, state.level.spawn - state.elapsed * 0.002);
    const count = Math.min(7, 3 + Math.floor(state.elapsed / 12) + state.level.id);
    for (let i = 0; i < count; i += 1) {
      const elite = Math.random() < 0.12 + state.level.id * 0.04;
      state.enemies.push({
        x: 32 + Math.random() * (this.width - 64),
        y: -30 - Math.random() * 90,
        baseX: 0,
        radius: elite ? 25 : 18,
        hp: elite ? 56 + state.level.id * 16 : 18 + state.level.id * 6,
        maxHp: elite ? 56 + state.level.id * 16 : 18 + state.level.id * 6,
        speed: elite ? 105 + state.level.id * 12 : 145 + Math.random() * 50,
        value: elite ? 16 + state.level.id * 4 : 5 + state.level.id * 2,
        wave: Math.random() * 6,
        elite
      });
    }
  },

  updateEnemies(dt) {
    const state = this.state;
    for (const enemy of state.enemies) {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(state.elapsed * 3 + enemy.wave) * (enemy.elite ? 45 : 28) * dt;
      if (enemy.y > this.height + 40) {
        enemy.dead = true;
        if (state.invincible <= 0) this.damagePlayer();
      }
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  },

  spawnBoss() {
    const state = this.state;
    if (state.boss || state.elapsed < state.duration) return;
    state.bossStarted = true;
    state.enemies = [];
    state.boss = {
      x: this.width / 2,
      y: -90,
      radius: 62,
      hp: state.level.bossHp,
      maxHp: state.level.bossHp,
      shotTimer: 1.0,
      phaseTimer: 0
    };
    this.burst(this.width / 2, 110, "#ffd86b", 40);
  },

  updateBoss(dt) {
    const boss = this.state.boss;
    if (!boss) return;
    boss.y += (112 - boss.y) * Math.min(1, dt * 1.6);
    boss.x = this.width / 2 + Math.sin(this.state.elapsed * 1.4) * (this.width * 0.24);
    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      boss.shotTimer = Math.max(0.28, 0.52 - this.state.level.id * 0.06);
      this.fireBossPattern();
    }
  },

  fireBossPattern() {
    const boss = this.state.boss;
    const spread = 9 + this.state.level.id * 2;
    const speed = 175 + this.state.level.id * 28;
    for (let i = 0; i < spread; i += 1) {
      const t = spread === 1 ? 0 : i / (spread - 1);
      const angle = Math.PI * (0.22 + t * 0.56) + Math.sin(this.state.elapsed * 2) * 0.16;
      this.state.enemyBullets.push({
        x: boss.x,
        y: boss.y + 42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6
      });
    }
    const aim = Math.atan2(this.state.player.y - boss.y, this.state.player.x - boss.x);
    for (const offset of [-0.16, 0.16]) {
      this.state.enemyBullets.push({
        x: boss.x,
        y: boss.y + 50,
        vx: Math.cos(aim + offset) * (speed + 60),
        vy: Math.sin(aim + offset) * (speed + 60),
        radius: 7
      });
    }
  },

  updateEnemyBullets(dt) {
    for (const shot of this.state.enemyBullets) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
    }
    this.state.enemyBullets = this.state.enemyBullets.filter((shot) => shot.y < this.height + 40 && shot.x > -60 && shot.x < this.width + 60 && !shot.dead);
  },

  updateParticles(dt) {
    for (const particle of this.state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.state.particles = this.state.particles.filter((particle) => particle.life > 0);
  },

  checkCollisions() {
    const state = this.state;
    for (const enemy of state.enemies) {
      for (const bullet of state.bullets) {
        if (bullet.dead || this.distance(enemy, bullet) > enemy.radius + bullet.radius) continue;
        bullet.dead = true;
        enemy.hp -= bullet.damage;
        this.burst(bullet.x, bullet.y, "#58dcff", 3);
        if (enemy.hp <= 0) {
          enemy.dead = true;
          state.levelGold += enemy.value;
          this.burst(enemy.x, enemy.y, enemy.elite ? "#ffd86b" : "#52e8ff", enemy.elite ? 18 : 9);
        }
      }
      if (!enemy.dead && state.invincible <= 0 && this.distance(enemy, state.player) < enemy.radius + state.player.radius) {
        enemy.dead = true;
        this.damagePlayer();
      }
    }

    const boss = state.boss;
    if (boss) {
      for (const bullet of state.bullets) {
        if (bullet.dead || this.distance(boss, bullet) > boss.radius + bullet.radius) continue;
        bullet.dead = true;
        boss.hp -= bullet.damage;
        this.burst(bullet.x, bullet.y, "#58dcff", 3);
        if (boss.hp <= 0) {
          this.completeFight();
          return;
        }
      }
      if (state.invincible <= 0 && this.distance(boss, state.player) < boss.radius + state.player.radius) this.damagePlayer();
    }

    if (state.invincible <= 0) {
      for (const shot of state.enemyBullets) {
        if (shot.dead || this.distance(shot, state.player) > shot.radius + state.player.radius) continue;
        shot.dead = true;
        this.damagePlayer();
      }
    }

    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    state.bullets = state.bullets.filter((bullet) => !bullet.dead);
    state.enemyBullets = state.enemyBullets.filter((shot) => !shot.dead);
  },

  damagePlayer() {
    const state = this.state;
    if (state.invincible > 0) return;
    state.player.lives -= 1;
    state.invincible = 1.2;
    this.burst(state.player.x, state.player.y, "#ff6678", 24);
    if (state.player.lives <= 0) this.askReviveOrFail();
  },

  askReviveOrFail() {
    if (!this.state.revived) {
      this.state.mode = "revive";
      this.stopLoop();
      this.setData({ mode: "revive" });
      return;
    }
    this.failFight();
  },

  revivePlayer() {
    const state = this.state;
    state.mode = "fight";
    state.revived = true;
    state.damageMult = 10;
    state.invincible = 20;
    state.player.lives = 3;
    state.player.x = this.width / 2;
    state.player.y = this.height - 120;
    state.enemyBullets = [];
    this.burst(state.player.x, state.player.y, "#ffd86b", 70);
    this.setData({ mode: "fight" });
    this.lastTime = Date.now();
    this.loop();
  },

  giveUpFight() {
    this.failFight(true);
  },

  completeFight() {
    if (this.state.mode !== "fight") return;
    this.state.mode = "result";
    this.stopLoop();
    const totalReward = this.state.level.reward + this.state.levelGold;
    addGold(totalReward);
    completeLevel(this.state.level.id);
    this.profile = loadProfile();
    this.setData({
      mode: "result",
      result: {
        kicker: "MISSION COMPLETE",
        title: "任务完成",
        body: `Boss 已击破，获得金币 +${totalReward}。即将返回主UI。`
      }
    });
    this.syncLevels();
    this.returnToLobbySoon();
  },

  failFight() {
    this.state.mode = "result";
    this.stopLoop();
    const reward = this.state.levelGold;
    if (reward > 0) {
      addGold(reward);
      this.profile = loadProfile();
    }
    this.setData({
      mode: "result",
      result: {
        kicker: "MISSION FAILED",
        title: "任务失败",
        body: `本关获得金币 +${reward}。即将返回主UI。`
      }
    });
    this.syncLevels();
    this.returnToLobbySoon();
  },

  returnToLobbySoon() {
    if (this.returnTimer) clearTimeout(this.returnTimer);
    this.returnTimer = setTimeout(() => wx.navigateBack(), 1800);
  },

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 45;
      this.state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, radius: Math.random() * 4 + 1.5, life: Math.random() * 0.4 + 0.22 });
    }
  },

  drawScene() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width || 390;
    const h = this.height || 844;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#061120");
    gradient.addColorStop(0.5, "#0b2744");
    gradient.addColorStop(1, "#03080f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    if (!this.state) return;
    this.drawStars(ctx);
    this.drawGrid(ctx);
    if (this.state.mode === "select") {
      this.drawDockPreview(ctx);
      return;
    }
    this.drawBullets(ctx);
    this.drawEnemies(ctx);
    this.drawBoss(ctx);
    this.drawEnemyBullets(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    this.drawReviveBuff(ctx);
  },

  drawStars(ctx) {
    ctx.save();
    for (const star of this.state.stars) {
      ctx.globalAlpha = 0.4 + star.size / 5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(69, 206, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = 0; y < this.height; y += 46) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawDockPreview(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#49c6ff";
    ctx.beginPath();
    ctx.moveTo(this.width * 0.5, this.height * 0.35);
    ctx.lineTo(this.width * 0.9, this.height * 0.52);
    ctx.lineTo(this.width * 0.5, this.height * 0.62);
    ctx.lineTo(this.width * 0.1, this.height * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawPlayer(ctx) {
    const p = this.state.player;
    ctx.save();
    ctx.globalAlpha = this.state.invincible > 0 && Math.floor(this.state.elapsed * 14) % 2 === 0 ? 0.48 : 1;
    if (this.assets.player) {
      ctx.translate(p.x, p.y);
      ctx.drawImage(this.assets.player, -34, -34, 68, 68);
    } else {
      ctx.fillStyle = "#42d6b5";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 34);
      ctx.lineTo(p.x - 22, p.y + 22);
      ctx.lineTo(p.x, p.y + 10);
      ctx.lineTo(p.x + 22, p.y + 22);
      ctx.closePath();
      ctx.fill();
    }
    if (this.state.invincible > 0) {
      ctx.strokeStyle = "rgba(255, 216, 107, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 42 + Math.sin(this.state.elapsed * 12) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawBullets(ctx) {
    ctx.save();
    ctx.fillStyle = this.state.damageMult > 1 ? "#ffd86b" : "#67e8ff";
    for (const b of this.state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawEnemies(ctx) {
    for (const e of this.state.enemies) {
      ctx.save();
      if (this.assets.enemy) {
        ctx.translate(e.x, e.y);
        ctx.drawImage(this.assets.enemy, -e.radius - 8, -e.radius - 8, (e.radius + 8) * 2, (e.radius + 8) * 2);
      } else {
        ctx.fillStyle = e.elite ? "#ff9f43" : "#ef476f";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  drawBoss(ctx) {
    const b = this.state.boss;
    if (!b) return;
    ctx.save();
    if (this.assets.boss) {
      ctx.translate(b.x, b.y);
      ctx.drawImage(this.assets.boss, -76, -76, 152, 152);
    } else {
      ctx.fillStyle = "#8b2cff";
      ctx.fillRect(b.x - 70, b.y - 50, 140, 100);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(this.width * 0.12, 92, this.width * 0.76, 12);
    ctx.fillStyle = "#ff5d73";
    ctx.fillRect(this.width * 0.12, 92, this.width * 0.76 * Math.max(0, b.hp / b.maxHp), 12);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(this.width * 0.12, 92, this.width * 0.76, 12);
  },

  drawEnemyBullets(ctx) {
    ctx.save();
    ctx.fillStyle = "#ff8c66";
    for (const s of this.state.enemyBullets) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawParticles(ctx) {
    ctx.save();
    for (const p of this.state.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawReviveBuff(ctx) {
    if (this.state.damageMult <= 1) return;
    ctx.save();
    ctx.fillStyle = "rgba(255, 216, 107, 0.92)";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`复活火力 x10  无敌 ${Math.ceil(this.state.invincible)}s`, 16, 126);
    ctx.restore();
  },

  distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },

  onTouchStart(event) {
    this.updatePointer(event);
  },

  onTouchMove(event) {
    this.updatePointer(event);
  },

  onTouchEnd() {
    if (this.state && this.state.pointer) this.state.pointer.active = false;
  },

  updatePointer(event) {
    if (!this.state || this.state.mode !== "fight") return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.state.pointer.active = true;
    this.state.pointer.x = touch.x;
    this.state.pointer.y = touch.y;
  },

  goBack() {
    this.stopLoop();
    wx.navigateBack();
  }
});
