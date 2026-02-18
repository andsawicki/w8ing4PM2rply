/* ─────────────────────────────────────────────
   W8ing4PM — Main Game Engine
   Retro arcade shooter for TrendAI Cyber Squadron
   ───────────────────────────────────────────── */

'use strict';

/* ══════════════════════════════════════════════
   CONSTANTS & CONFIG
   ══════════════════════════════════════════════ */

const W = 480, H = 640;
const HUD_H = 36;
const PLAY_H = H - HUD_H;

const PLAYER_W = 32, PLAYER_H = 24;
const BULLET_W = 3,  BULLET_H = 12;
const ENEMY_W  = 34, ENEMY_H  = 28;
const BOMB_W   = 8,  BOMB_H   = 14;
const STAR_COUNT = 80;

const PLAYER_SPEED   = 4.5;
const BULLET_SPEED   = 9;
const BOMB_SPEED     = 2.8;
const ENEMY_BULLET_SPEED = 3.2;
const SHOOT_COOLDOWN = 180; // ms

const FLAVOR_TEXTS = [
  '"The requirements will be ready after this call" — PM, 2019–∞',
  '"Just a quick sync" — PM, 45 minutes ago',
  '"It is basically done, just a few tweaks" — PM, always',
  '"Can we add blockchain to this?" — PM, at 5 PM Friday',
  '"Make it pop more" — PM, providing zero context',
  '"I sent an email three months ago" — PM, defending a feature',
  '"The user story is self-explanatory" — PM, it was not',
  '"No UAT needed, we trust the devs" — PM (they lied)',
];

const PM_QUOTES = [
  '"We need this by EOD"',
  '"Quick question..."',
  '"Circling back on this"',
  '"Let me loop in stakeholders"',
  '"Can we pivot slightly?"',
  '"Add it to the backlog"',
  '"The client changed their mind"',
  '"Just a small scope change"',
  '"We should do a deep-dive"',
  '"This is low-hanging fruit"',
  '"Move the needle on this"',
  '"Action items from the meeting"',
  '"Synergy with the roadmap"',
  '"Per my last email..."',
];

const DEATH_REASONS = [
  'HIT BY MEETING INVITE',
  'KILLED BY SCOPE CREEP',
  'DESTROYED BY DEADLINE SHIFT',
  'VICTIM OF AGILE CEREMONY',
  'ELIMINATED BY STAKEHOLDER',
  'CRUSHED BY BACKLOG ITEM',
  'TERMINATED BY PIVOT',
];

const GAME_OVER_QUOTES = [
  '"We\'ll fix it in the next sprint." — PM',
  '"This is a learning opportunity." — PM',
  '"Did you check the Jira ticket?" — PM',
  '"It worked in my presentation." — PM',
  '"We need to be more agile." — PM',
  '"Ship it. We\'ll iterate." — PM',
];

const ENEMY_TYPES = [
  { id: 'pm',        label: 'PM',       color: '#ffb300', hp: 1, score: 100, speed: 0.8, sprite: 'pm'        },
  { id: 'scrum',     label: 'SCRUM',    color: '#00d4ff', hp: 2, score: 200, speed: 1.0, sprite: 'scrum'     },
  { id: 'stake',     label: 'STAKE',    color: '#bf5fff', hp: 2, score: 250, speed: 0.7, sprite: 'stakeholder'},
  { id: 'roadmap',   label: 'ROADMAP',  color: '#ff3131', hp: 3, score: 400, speed: 0.6, sprite: 'roadmap'   },
  { id: 'ciso',      label: 'CISO',     color: '#39ff14', hp: 4, score: 500, speed: 0.5, sprite: 'ciso'      },
];

const POWERUP_TYPES = [
  { id: 'rapidfire', label: 'RAPID FIRE',   color: '#ff3131', duration: 5000  },
  { id: 'shield',    label: 'FIREWALL',      color: '#00d4ff', duration: 6000  },
  { id: 'spread',    label: 'SPREAD SHOT',   color: '#bf5fff', duration: 5000  },
  { id: 'score2x',   label: '2X SCORE',      color: '#ffb300', duration: 8000  },
];

/* ══════════════════════════════════════════════
   UTILITY
   ══════════════════════════════════════════════ */

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rect(x, y, w, h) { return { x, y, w, h }; }
function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function padScore(n) { return String(n).padStart(5, '0'); }

/* ══════════════════════════════════════════════
   SPRITE RENDERERS  (pixel-art via Canvas)
   ══════════════════════════════════════════════ */

const Sprites = {
  /* Player ship — cyber fighter */
  player(ctx, x, y, w, h, shieldActive) {
    const cx = x + w / 2;
    // Body
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(cx - 3, y + 4, 6, h - 8);
    // Wings
    ctx.fillStyle = '#00aa00';
    ctx.beginPath();
    ctx.moveTo(cx, y + 6);
    ctx.lineTo(x, y + h - 4);
    ctx.lineTo(x + 8, y + h - 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, y + 6);
    ctx.lineTo(x + w, y + h - 4);
    ctx.lineTo(x + w - 8, y + h - 4);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 2, y + 2, 4, 5);
    // Thruster glow
    ctx.fillStyle = rnd(0,1) > 0.5 ? '#ff8800' : '#ffff00';
    ctx.fillRect(cx - 3, y + h - 6, 6, 4);
    // Cannons
    ctx.fillStyle = '#88ff88';
    ctx.fillRect(x + 2, y + h - 10, 2, 8);
    ctx.fillRect(x + w - 4, y + h - 10, 2, 8);
    // Shield
    if (shieldActive) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 100) * 0.15;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, y + h / 2, w / 2 + 6, h / 2 + 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },

  /* PM enemy */
  pm(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    // Body — little suited figure with briefcase
    ctx.fillStyle = color;
    // Head
    ctx.fillRect(cx - 4, y + 2, 8, 7);
    // Torso / suit
    ctx.fillStyle = '#555566';
    ctx.fillRect(cx - 6, y + 10, 12, 10);
    // Tie
    ctx.fillStyle = color;
    ctx.fillRect(cx - 1, y + 11, 2, 8);
    // Arms
    ctx.fillStyle = '#333344';
    ctx.fillRect(cx - 10, y + 11, 4, 7);
    ctx.fillRect(cx + 6,  y + 11, 4, 7);
    // Briefcase
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(cx + 6, y + 16, 6, 5);
    ctx.fillRect(cx + 8, y + 14, 2, 3);
    // Legs
    ctx.fillStyle = '#333344';
    ctx.fillRect(cx - 5, y + 20, 4, 6);
    ctx.fillRect(cx + 1,  y + 20, 4, 6);
    // Eyes — evil dots
    ctx.fillStyle = '#ff3131';
    ctx.fillRect(cx - 3, y + 4, 2, 2);
    ctx.fillRect(cx + 1, y + 4, 2, 2);
  },

  scrum(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    // Scrum Master — sticky notes flying around
    ctx.fillStyle = color;
    ctx.fillRect(cx - 5, y + 2, 10, 8);
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(cx - 7, y + 11, 14, 11);
    // Sticky notes
    const noteColors = ['#ffff44', '#ff88ff', '#88ffff'];
    noteColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + i * 9, y + 22, 7, 5);
    });
    // Sprint burndown chart in hand
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 9, y + 14);
    ctx.lineTo(cx - 3, y + 18);
    ctx.lineTo(cx + 3, y + 15);
    ctx.lineTo(cx + 9, y + 20);
    ctx.stroke();
    ctx.fillStyle = '#ff3131';
    ctx.fillRect(cx - 3, y + 4, 2, 2);
    ctx.fillRect(cx + 1, y + 4, 2, 2);
  },

  stakeholder(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    // Stakeholder — fancy suit, dollar sign
    ctx.fillStyle = '#eecc88';
    ctx.fillRect(cx - 4, y + 2, 8, 7);
    ctx.fillStyle = color;
    ctx.fillRect(cx - 7, y + 10, 14, 11);
    // Dollar signs
    ctx.fillStyle = '#ffff00';
    ctx.font = '8px monospace';
    ctx.fillText('$', x + 2, y + 16);
    ctx.fillText('$', x + w - 8, y + 16);
    ctx.fillStyle = '#ff3131';
    ctx.fillRect(cx - 3, y + 4, 2, 2);
    ctx.fillRect(cx + 1, y + 4, 2, 2);
    ctx.fillStyle = '#333344';
    ctx.fillRect(cx - 5, y + 21, 4, 7);
    ctx.fillRect(cx + 1, y + 21, 4, 7);
    // Top hat
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - 5, y, 10, 2);
    ctx.fillRect(cx - 3, y - 5, 6, 6);
  },

  roadmap(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    // Roadmap — a scroll/document with timeline
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y, w - 4, h - 2);
    ctx.fillStyle = '#000';
    // Timeline arrows
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 5, y + 5 + i * 6, w - 10, 2);
    }
    // Q1 Q2 Q3 Q4 labels
    ctx.fillStyle = '#000';
    ctx.font = '5px monospace';
    ['Q1','Q2','Q3','Q4'].forEach((q, i) => {
      ctx.fillStyle = '#ffff00';
      ctx.fillText(q, x + 4, y + 10 + i * 6);
    });
    // Scroll handles
    ctx.fillStyle = '#886644';
    ctx.fillRect(x + 1, y, 3, h);
    ctx.fillRect(x + w - 4, y, 3, h);
  },

  ciso(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    // CISO — boss enemy, big imposing figure with shield logo
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(cx - 5, y + 2, 10, 9);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx - 8, y + 12, 16, 12);
    // TrendAI / shield logo on chest
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, y + 14);
    ctx.lineTo(cx - 5, y + 16);
    ctx.lineTo(cx - 5, y + 20);
    ctx.lineTo(cx, y + 23);
    ctx.lineTo(cx + 5, y + 20);
    ctx.lineTo(cx + 5, y + 16);
    ctx.closePath();
    ctx.fill();
    // Legs
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx - 6, y + 24, 5, 4);
    ctx.fillRect(cx + 1, y + 24, 5, 4);
    // Eyes
    ctx.fillStyle = color;
    ctx.fillRect(cx - 4, y + 5, 3, 3);
    ctx.fillRect(cx + 1, y + 5, 3, 3);
    // Pulsing aura
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 200) * 0.1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    ctx.restore();
  },

  /* Player bullet */
  bullet(ctx, x, y, w, h) {
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 1, y, w - 2, 3);
  },

  /* Enemy projectile — a calendar emoji shape */
  bomb(ctx, x, y, w, h) {
    ctx.fillStyle = '#ff3131';
    ctx.fillRect(x, y + 3, w, h - 3);
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(x + 1, y + 4, w - 2, 3);
    // Calendar icon top tabs
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(x + 1, y, 2, 4);
    ctx.fillRect(x + w - 3, y, 2, 4);
    // Grid lines
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(x + 1, y + 8, w - 2, 1);
  },

  /* Powerup gem */
  powerup(ctx, x, y, size, color) {
    const cx = x + size / 2, cy = y + size / 2;
    const pulse = Math.sin(Date.now() / 200) * 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size / 2 - pulse);
    ctx.lineTo(cx + size / 2, cy);
    ctx.lineTo(cx, cy + size / 2 + pulse);
    ctx.lineTo(cx - size / 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size / 4);
    ctx.lineTo(cx + size / 4, cy);
    ctx.lineTo(cx, cy + size / 4);
    ctx.lineTo(cx - size / 4, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  /* Explosion particle */
  particle(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  },

  /* Scrolling background elements */
  building(ctx, b) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Windows
    ctx.fillStyle = 'rgba(255,255,100,0.3)';
    for (let row = 0; row < Math.floor(b.h / 8); row++) {
      for (let col = 0; col < Math.floor(b.w / 6); col++) {
        if (Math.random() > 0.4) {
          ctx.fillRect(b.x + 2 + col * 6, b.y + 2 + row * 8, 3, 4);
        }
      }
    }
  },
};

/* ══════════════════════════════════════════════
   PARTICLE SYSTEM
   ══════════════════════════════════════════════ */

function spawnExplosion(particles, x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rnd(-0.3, 0.3);
    const speed = rnd(1, 5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: rnd(2, 6),
      color,
      life: 30,
      maxLife: 30,
    });
  }
}

function updateParticles(particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ══════════════════════════════════════════════
   SCROLLING BACKGROUND
   ══════════════════════════════════════════════ */

class Background {
  constructor() {
    this.stars = [];
    this.buildings = [];
    this.scrollY = 0;
    this.buildingTimer = 0;
    this._initStars();
    this._spawnBuildings(10);
  }

  _initStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: rnd(0, W),
        y: rnd(HUD_H, H),
        size: rnd(0.5, 2),
        speed: rnd(0.3, 1.2),
        bright: rnd(0.3, 1.0),
      });
    }
  }

  _spawnBuildings(count = 1) {
    for (let i = 0; i < count; i++) {
      const w = rndInt(20, 60);
      this.buildings.push({
        x: rnd(0, W - w),
        y: HUD_H - rndInt(30, 90),
        w,
        h: rndInt(30, 90),
        speed: rnd(0.4, 0.9),
        color: pick(['#0a1a0a', '#0d1a2a', '#1a0d1a', '#1a1a0d']),
      });
    }
  }

  update(speed = 1) {
    // Stars
    this.stars.forEach(s => {
      s.y += s.speed * speed;
      if (s.y > H) { s.y = HUD_H; s.x = rnd(0, W); }
    });
    // Buildings
    this.buildings.forEach(b => {
      b.y += b.speed * speed;
    });
    this.buildings = this.buildings.filter(b => b.y < H + 100);
    this.buildingTimer++;
    if (this.buildingTimer > 80) {
      this._spawnBuildings(1);
      this.buildingTimer = 0;
    }
  }

  draw(ctx) {
    // Stars
    this.stars.forEach(s => {
      ctx.globalAlpha = s.bright * (0.7 + Math.sin(Date.now() / 800 + s.x) * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
    // Buildings (dark city silhouette)
    this.buildings.forEach(b => Sprites.building(ctx, b));
  }
}

/* ══════════════════════════════════════════════
   WAVE / ENEMY FORMATION SYSTEM
   ══════════════════════════════════════════════ */

function buildWave(waveNum) {
  const formations = [];
  const difficulty = Math.min(waveNum, 10);

  // Every wave: swarm of basic PMs
  const rows = 2 + Math.floor(difficulty / 3);
  const cols = 4 + Math.floor(difficulty / 4);
  const spacing = 52;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const typeIndex = Math.min(
        Math.floor(row / 2 + difficulty / 4),
        ENEMY_TYPES.length - 1
      );
      const eType = ENEMY_TYPES[typeIndex];
      formations.push({
        type: eType,
        x: 30 + col * spacing,
        y: -(row * 60 + 80),
        hp: eType.hp + Math.floor(difficulty / 4),
        maxHp: eType.hp + Math.floor(difficulty / 4),
        vx: (Math.random() > 0.5 ? 1 : -1) * eType.speed,
        vy: eType.speed * 0.5,
        bombTimer: rndInt(180, 500) + row * 60,
        bombCooldown: Math.max(120, 300 - difficulty * 15),
        quoteTimer: rndInt(200, 600),
        quote: pick(PM_QUOTES),
        quoteAlpha: 0,
        alive: true,
        hitFlash: 0,
        pattern: pick(['straight', 'zigzag', 'dive']),
        patternT: 0,
      });
    }
  }

  // Boss wave every 5 waves
  if (waveNum % 5 === 0) {
    formations.push({
      type: ENEMY_TYPES[4], // CISO boss
      x: W / 2 - ENEMY_W / 2,
      y: -80,
      hp: 20 + waveNum * 2,
      maxHp: 20 + waveNum * 2,
      vx: 1.2,
      vy: 0.3,
      bombTimer: 60,
      bombCooldown: 60,
      quoteTimer: 150,
      quote: '"Compliance requires full incident report."',
      quoteAlpha: 0,
      alive: true,
      hitFlash: 0,
      pattern: 'boss',
      patternT: 0,
      isBoss: true,
    });
  }

  return formations;
}

/* ══════════════════════════════════════════════
   FLOATING TEXT
   ══════════════════════════════════════════════ */

class FloatText {
  constructor(text, x, y, color = '#ffb300') {
    this.text = text; this.x = x; this.y = y;
    this.color = color; this.life = 60; this.maxLife = 60;
    this.vy = -1.2;
  }
  update() { this.y += this.vy; this.life--; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
  get dead() { return this.life <= 0; }
}

/* ══════════════════════════════════════════════
   GAME STATE MACHINE
   ══════════════════════════════════════════════ */

const STATE = { MENU: 'menu', PLAY: 'play', PAUSED: 'paused',
                LEVEL_CLEAR: 'levelclear', GAME_OVER: 'gameover' };

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width  = W;
    canvas.height = H;

    this.state  = STATE.MENU;
    this.keys   = {};
    this.hiScore = parseInt(localStorage.getItem('w8ing4pm_hi') || '0', 10);

    this._bindEvents();
    this._initMenuUX();
    this._showScreen('menu');
    this._loop();
  }

  /* ── Init helpers ── */

  _initGameVars() {
    this.score    = 0;
    this.lives    = 3;
    this.wave     = 1;
    this.scoreMulti = 1;

    // Player
    this.player = {
      x: W / 2 - PLAYER_W / 2,
      y: H - PLAYER_H - 30,
      w: PLAYER_W, h: PLAYER_H,
      vx: 0, vy: 0,
      invincible: 0,
      shootCooldown: 0,
    };

    // Active effects
    this.powerups_active = {};
    this.powerup_timers = {};

    // Collections
    this.bullets   = [];
    this.enemies   = [];
    this.bombs     = [];
    this.powerups  = [];
    this.particles = [];
    this.floats    = [];
    this.bg        = new Background();

    this._spawnWave();
    this._updateHUD();
  }

  _spawnWave() {
    this.enemies = buildWave(this.wave);
    this.enemiesLeft = this.enemies.filter(e => e.alive).length;
  }

  _initMenuUX() {
    document.getElementById('hiScoreDisplay').textContent = padScore(this.hiScore);
    // Rotate flavor text every 4 seconds
    let fi = 0;
    const ft = document.getElementById('flavorText');
    ft.textContent = FLAVOR_TEXTS[fi];
    setInterval(() => {
      fi = (fi + 1) % FLAVOR_TEXTS.length;
      ft.textContent = FLAVOR_TEXTS[fi];
    }, 4000);
  }

  /* ── Event binding ── */

  _bindEvents() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      this._handleKeyPress(e.code);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // Touch controls (mobile friendly)
    let touchStartX = 0;
    this.canvas.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      if (this.state === STATE.MENU || this.state === STATE.GAME_OVER) this._startGame();
    }, { passive: true });
    this.canvas.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - touchStartX;
      if (this.state === STATE.PLAY && this.player) {
        this.player.x = clamp(this.player.x + dx * 0.5, 0, W - PLAYER_W);
      }
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    // Tap to shoot
    this.canvas.addEventListener('touchend', () => {
      if (this.state === STATE.PLAY) this._tryShoot();
    }, { passive: true });
  }

  _handleKeyPress(code) {
    Audio8bit.resume();
    Audio8bit.init();

    if (code === 'KeyM') {
      const m = Audio8bit.toggleMute();
      document.getElementById('muteIndicator').classList.toggle('hidden', !m);
      return;
    }

    if (code === 'KeyP' && this.state === STATE.PLAY) {
      this._pause();
      return;
    }
    if (code === 'KeyP' && this.state === STATE.PAUSED) {
      this._resume();
      return;
    }

    if (code === 'Space') {
      if (this.state === STATE.MENU || this.state === STATE.GAME_OVER) {
        this._startGame();
      }
    }
  }

  /* ── Screen management ── */

  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  _updateHUD() {
    document.getElementById('scoreDisplay').textContent = padScore(this.score);
    document.getElementById('waveDisplay').textContent  = String(this.wave).padStart(2, '0');
    document.getElementById('livesDisplay').textContent = '♥'.repeat(Math.max(0, this.lives));
  }

  /* ── Game flow ── */

  _startGame() {
    Audio8bit.init();
    Audio8bit.resume();
    if (!Audio8bit.muted) Audio8bit.startBG();
    this._initGameVars();
    this.state = STATE.PLAY;
    this._showScreen('hud');
    Audio8bit.SFX.menuBlip();
  }

  _pause() {
    this.state = STATE.PAUSED;
    document.getElementById('pauseOverlay').classList.remove('hidden');
    Audio8bit.stopBG();
  }

  _resume() {
    this.state = STATE.PLAY;
    document.getElementById('pauseOverlay').classList.add('hidden');
    if (!Audio8bit.muted) Audio8bit.startBG();
  }

  _gameOver(reason) {
    this.state = STATE.GAME_OVER;
    Audio8bit.stopBG();
    Audio8bit.SFX.gameOver();

    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('w8ing4pm_hi', this.hiScore);
    }

    document.getElementById('goScore').textContent   = padScore(this.score);
    document.getElementById('goHiScore').textContent = padScore(this.hiScore);
    document.getElementById('goReason').textContent  = reason || pick(DEATH_REASONS);
    document.getElementById('goQuote').textContent   = pick(GAME_OVER_QUOTES);
    this._showScreen('gameover');
  }

  _levelClear() {
    this.state = STATE.LEVEL_CLEAR;
    Audio8bit.SFX.levelUp();
    Audio8bit.stopBG();

    const bonus = this.wave * 500;
    this._addScore(bonus);
    document.getElementById('lcBonus').innerHTML =
      `WAVE ${this.wave} COMPLETE\n+${bonus} BONUS POINTS`;
    this._showScreen('levelclear');

    setTimeout(() => {
      this.wave++;
      this._initGameVars();
      this.state = STATE.PLAY;
      this._showScreen('hud');
      if (!Audio8bit.muted) Audio8bit.startBG();
    }, 2800);
  }

  /* ── Score / lives ── */

  _addScore(n) {
    this.score += n * this.scoreMulti;
    this._updateHUD();
    document.getElementById('hiScoreDisplay') &&
      (document.getElementById('hiScoreDisplay').textContent = padScore(Math.max(this.score, this.hiScore)));
  }

  _loseLife() {
    if (this.player.invincible > 0) return;
    this.lives--;
    this._updateHUD();
    if (this.lives <= 0) {
      this._gameOver();
      return;
    }
    this.player.invincible = 120;
    Audio8bit.SFX.playerHit();
    spawnExplosion(this.particles, this.player.x + PLAYER_W / 2, this.player.y + PLAYER_H / 2, '#39ff14', 18);
  }

  /* ── Powerups ── */

  _activatePowerup(type) {
    this.powerups_active[type.id] = true;
    clearTimeout(this.powerup_timers[type.id]);
    this.powerup_timers[type.id] = setTimeout(() => {
      this.powerups_active[type.id] = false;
      if (type.id === 'score2x') this.scoreMulti = 1;
    }, type.duration);

    if (type.id === 'score2x') this.scoreMulti = 2;
    this.floats.push(new FloatText(type.label + '!',
      this.player.x, this.player.y - 10, type.color));
    Audio8bit.SFX.powerup();
  }

  /* ── Shooting ── */

  _tryShoot() {
    if (this.player.shootCooldown > 0) return;
    const cooldown = this.powerups_active.rapidfire ? SHOOT_COOLDOWN / 3 : SHOOT_COOLDOWN;
    this.player.shootCooldown = cooldown;

    const cx = this.player.x + PLAYER_W / 2 - BULLET_W / 2;
    const by = this.player.y;

    if (this.powerups_active.spread) {
      // 5-way spread
      [-2, -1, 0, 1, 2].forEach(dir => {
        this.bullets.push({ x: cx, y: by, vx: dir * 1.5, vy: -BULLET_SPEED,
                            w: BULLET_W, h: BULLET_H });
      });
    } else {
      // Double cannon
      this.bullets.push({ x: cx - 8, y: by, vx: 0, vy: -BULLET_SPEED, w: BULLET_W, h: BULLET_H });
      this.bullets.push({ x: cx + 8, y: by, vx: 0, vy: -BULLET_SPEED, w: BULLET_W, h: BULLET_H });
    }
    Audio8bit.SFX.shoot();
  }

  /* ── Main loop ── */

  _loop() {
    requestAnimationFrame(() => this._loop());

    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, W, H);

    if (this.state === STATE.PLAY || this.state === STATE.PAUSED) {
      this._drawGameWorld(ctx);
      if (this.state === STATE.PLAY) this._updatePlay();
    } else if (this.state === STATE.MENU || this.state === STATE.GAME_OVER ||
               this.state === STATE.LEVEL_CLEAR) {
      this._drawMenuBG(ctx);
    }
  }

  /* ── Menu background animation ── */
  _menuBG = new Background();

  _drawMenuBG(ctx) {
    this._menuBG.update(0.5);
    this._menuBG.draw(ctx);
    // Decorative demo enemies
    const t = Date.now() / 1000;
    ENEMY_TYPES.forEach((et, i) => {
      const x = 30 + (i % 5) * 85 + Math.sin(t + i) * 10;
      const y = 90 + Math.floor(i / 5) * 60 + Math.cos(t * 0.7 + i) * 8;
      Sprites[et.sprite](ctx, x, y, ENEMY_W, ENEMY_H, et.color);
    });
  }

  /* ── Game world update ── */

  _updatePlay() {
    this._updatePlayer();
    this._updateBullets();
    this._updateEnemies();
    this._updateBombs();
    this._updatePowerups();
    this._updateParticlesAndFloats();

    // Check wave clear
    if (this.enemies.every(e => !e.alive)) {
      this._levelClear();
    }
  }

  _updatePlayer() {
    const p = this.player;

    // Movement
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) p.x -= PLAYER_SPEED;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) p.x += PLAYER_SPEED;
    if (this.keys['ArrowUp']    || this.keys['KeyW']) p.y -= PLAYER_SPEED * 0.7;
    if (this.keys['ArrowDown']  || this.keys['KeyS']) p.y += PLAYER_SPEED * 0.7;

    p.x = clamp(p.x, 0, W - PLAYER_W);
    p.y = clamp(p.y, HUD_H + 10, H - PLAYER_H - 10);

    // Shooting
    if ((this.keys['Space'] || this.keys['KeyZ'] || this.keys['ControlLeft'])) {
      this._tryShoot();
    }
    if (p.shootCooldown > 0) p.shootCooldown -= 16;

    // Invincibility blink
    if (p.invincible > 0) p.invincible--;
  }

  _updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < HUD_H || b.x < 0 || b.x > W) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Bullet vs enemy
      let hit = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (collide(b, { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H })) {
          hit = true;
          e.hp--;
          e.hitFlash = 8;
          if (e.hp <= 0) {
            e.alive = false;
            this.enemiesLeft--;
            spawnExplosion(this.particles, e.x + ENEMY_W / 2, e.y + ENEMY_H / 2,
                           e.type.color, e.isBoss ? 30 : 14);
            this._addScore(e.type.score * (e.isBoss ? 5 : 1));
            this.floats.push(new FloatText(`+${e.type.score * (e.isBoss ? 5 : 1) * this.scoreMulti}`,
              e.x, e.y, e.type.color));
            Audio8bit.SFX.explosion();
            // Random powerup drop (15% chance, boss always drops one)
            if (e.isBoss || Math.random() < 0.15) {
              const pt = pick(POWERUP_TYPES);
              this.powerups.push({ x: e.x + ENEMY_W / 2 - 8, y: e.y, type: pt, size: 16, vy: 1.5 });
            }
          } else {
            Audio8bit.SFX.pmDrop();
          }
          break;
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }
  }

  _updateEnemies() {
    const t = Date.now() / 1000;
    for (const e of this.enemies) {
      if (!e.alive) continue;

      e.patternT += 0.02;

      // Movement pattern
      switch (e.pattern) {
        case 'zigzag':
          e.x += Math.sin(e.patternT * 3) * 2;
          e.y += e.vy;
          break;
        case 'dive':
          if (e.y < H * 0.3) { e.y += e.vy; }
          else {
            // Dive toward player
            const dx = (this.player.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2);
            e.x += Math.sign(dx) * e.type.speed * 1.5;
            e.y += e.vy * 1.5;
          }
          break;
        case 'boss':
          e.x += Math.sin(e.patternT * 0.8) * 3;
          e.y += Math.sin(e.patternT * 0.3) * 0.8 + 0.2;
          break;
        default: // straight
          e.x += e.vx;
          e.y += e.vy;
          // Bounce off walls
          if (e.x < 0 || e.x + ENEMY_W > W) e.vx *= -1;
          break;
      }

      // Bounce horizontally
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); }
      if (e.x + ENEMY_W > W) { e.x = W - ENEMY_W; e.vx = -Math.abs(e.vx); }

      // Enemy reaches bottom — lose a life
      if (e.y + ENEMY_H > H) {
        e.y = -ENEMY_H;
        this._loseLife();
      }

      // Hit flash
      if (e.hitFlash > 0) e.hitFlash--;

      // Quote display
      e.quoteTimer--;
      if (e.quoteTimer <= 0) {
        e.quoteAlpha = 1.0;
        e.quote = pick(PM_QUOTES);
        e.quoteTimer = rndInt(250, 500);
      }
      if (e.quoteAlpha > 0) e.quoteAlpha -= 0.008;

      // Enemy bombs
      e.bombTimer--;
      if (e.bombTimer <= 0) {
        e.bombTimer = e.bombCooldown + rndInt(-30, 30);
        this.bombs.push({
          x: e.x + ENEMY_W / 2 - BOMB_W / 2,
          y: e.y + ENEMY_H,
          vx: (this.player.x - e.x) * 0.01,
          vy: BOMB_SPEED + this.wave * 0.1,
          w: BOMB_W, h: BOMB_H,
        });
        Audio8bit.SFX.pmDrop();
      }

      // Collision with player
      if (!this.player.invincible &&
          collide({ x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H },
                  { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        if (!this.powerups_active.shield) this._loseLife();
        e.alive = false;
        this.enemiesLeft--;
        spawnExplosion(this.particles, e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, e.type.color, 16);
      }
    }
  }

  _updateBombs() {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H) { this.bombs.splice(i, 1); continue; }

      if (!this.player.invincible &&
          collide(b, { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        this.bombs.splice(i, 1);
        if (!this.powerups_active.shield) {
          spawnExplosion(this.particles,
            this.player.x + PLAYER_W / 2,
            this.player.y + PLAYER_H / 2, '#ff3131', 12);
          this._loseLife();
        } else {
          // Shield blocked it
          spawnExplosion(this.particles, b.x, b.y, '#00d4ff', 8);
        }
      }
    }
  }

  _updatePowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy;
      if (p.y > H) { this.powerups.splice(i, 1); continue; }

      if (collide({ x: p.x, y: p.y, w: p.size, h: p.size },
                  { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        this._activatePowerup(p.type);
        this.powerups.splice(i, 1);
      }
    }
  }

  _updateParticlesAndFloats() {
    updateParticles(this.particles);
    this.floats.forEach(f => f.update());
    this.floats = this.floats.filter(f => !f.dead);
  }

  /* ── Draw ── */

  _drawGameWorld(ctx) {
    // Background
    this.bg.update(1 + this.wave * 0.05);
    this.bg.draw(ctx);

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.hitFlash % 2 === 1) {
        // Flash white on hit
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x, e.y, ENEMY_W, ENEMY_H);
        ctx.restore();
      } else {
        Sprites[e.type.sprite](ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.type.color);
        // HP bar for bosses / multi-HP enemies
        if (e.maxHp > 1) {
          const bw = ENEMY_W;
          ctx.fillStyle = '#330000';
          ctx.fillRect(e.x, e.y - 6, bw, 3);
          ctx.fillStyle = e.type.color;
          ctx.fillRect(e.x, e.y - 6, bw * (e.hp / e.maxHp), 3);
        }
      }

      // Floating PM quote
      if (e.quoteAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(e.quoteAlpha, 0.85);
        ctx.fillStyle = e.type.color;
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(e.quote, clamp(e.x - 10, 2, W - 120), e.y - 10);
        ctx.restore();
      }
    }

    // Player bullets
    this.bullets.forEach(b => Sprites.bullet(ctx, b.x, b.y, b.w, b.h));

    // Enemy bombs
    this.bombs.forEach(b => Sprites.bomb(ctx, b.x, b.y, b.w, b.h));

    // Powerup items
    this.powerups.forEach(p => Sprites.powerup(ctx, p.x, p.y, p.size, p.type.color));

    // Player (with invincibility blink)
    if (this.player.invincible === 0 || Math.floor(this.player.invincible / 6) % 2 === 0) {
      Sprites.player(ctx, this.player.x, this.player.y, PLAYER_W, PLAYER_H,
                     this.powerups_active.shield);
    }

    // Particles
    this.particles.forEach(p => Sprites.particle(ctx, p));

    // Float texts
    this.floats.forEach(f => f.draw(ctx));

    // Active powerup indicators (bottom bar)
    this._drawPowerupBar(ctx);

    // Scroll-speed "river" effect on sides
    this._drawSideRails(ctx);
  }

  _drawPowerupBar(ctx) {
    let xi = 4;
    for (const [id, active] of Object.entries(this.powerups_active)) {
      if (!active) continue;
      const pt = POWERUP_TYPES.find(p => p.id === id);
      if (!pt) continue;
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(xi, H - 14, 60, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillText(pt.label, xi + 2, H - 6);
      xi += 66;
    }
  }

  _drawSideRails(ctx) {
    const t = Date.now() / 1000;
    ctx.fillStyle = 'rgba(57,255,20,0.06)';
    ctx.fillRect(0, HUD_H, 3, PLAY_H);
    ctx.fillRect(W - 3, HUD_H, 3, PLAY_H);
  }
}

/* ══════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  window._game = new Game(canvas);
});
