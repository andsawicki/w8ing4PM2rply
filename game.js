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
const PM_W     = 28, PM_H     = 32;
const STAR_COUNT = 80;

const PLAYER_SPEED   = 4.5;
const BULLET_SPEED   = 9;
const BOMB_SPEED     = 2.8;
const SHOOT_COOLDOWN = 180; // ms

/* ── Flavor texts on menu ── */
const FLAVOR_TEXTS = [
  'CLEAR THE THREATS — PM IS ON THE WAY',
  'BUGS INCOMING. PM RESPONSE: PENDING.',
  'CVE DETECTED. AWAITING REQUIREMENTS.',
  'DELAY.EXE HAS ENTERED THE NETWORK',
  'WARNING: SCOPE UNCHANGED. BUG COUNT: INF',
  'PM ETA: UNKNOWN. THREATS: VERY KNOWN.',
  'PATCH TUESDAY EVERY DAY IN THIS HOUSE',
  'ZERO-DAY? MORE LIKE ZERO-REPLY.',
];

/* ── Quotes that float over enemies ── */
const ENEMY_QUOTES = [
  '> segfault',
  'null ptr deref',
  'off-by-one!',
  'heap overflow',
  'race condition!',
  'CVE-2024-????',
  'CVSS: 9.8 CRIT',
  'RCE via POST',
  'SQL injection!',
  'auth bypass!',
  'ETA: TBD',
  'blocked on PM',
  'in review...',
  'dependency hell',
  'waiting for signoff',
];

/* ── Game over flavor ── */
const DEATH_REASONS = [
  'KILLED BY CRITICAL BUG',
  'PWNED BY ZERO-DAY',
  'CRUSHED BY DEADLINE',
  'VICTIM OF MEMORY LEAK',
  'TERMINATED BY DELAY',
  'DESTROYED BY DEPENDENCY',
  'EXPLOITED BY CVE',
];

const GAME_OVER_QUOTES = [
  '"Have you tried turning it off and on again?"',
  '"It works on my machine." — dev, somewhere',
  '"We\'ll fix it post-launch." — someone, always',
  '"Ship it. Security is a feature request."',
  '"The bug is actually a feature." — classic',
  '"PM has entered the chat. Help is coming."',
];

/* ── Enemy definitions ── */
const ENEMY_TYPES = [
  { id: 'bug',      label: 'BUG',      color: '#ff3131', hp: 1, score: 100, speed: 1.0, sprite: 'bug'      },
  { id: 'vuln',     label: 'VULN',     color: '#ffb300', hp: 2, score: 200, speed: 0.8, sprite: 'vuln'     },
  { id: 'delay',    label: 'DELAY',    color: '#00d4ff', hp: 2, score: 150, speed: 0.6, sprite: 'delay'    },
  { id: 'zeroday',  label: '0-DAY',    color: '#bf5fff', hp: 3, score: 400, speed: 1.2, sprite: 'zeroday'  },
  { id: 'deadlock', label: 'DEADLOCK', color: '#39ff14', hp: 4, score: 500, speed: 0.4, sprite: 'deadlock' },
];

/* ── Power-up definitions ── */
const POWERUP_TYPES = [
  { id: 'rapidfire', label: 'RAPID FIRE',  color: '#ff3131', duration: 5000 },
  { id: 'shield',    label: 'FIREWALL',    color: '#00d4ff', duration: 6000 },
  { id: 'spread',    label: 'SPREAD SHOT', color: '#bf5fff', duration: 5000 },
  { id: 'score2x',   label: '2X SCORE',   color: '#ffb300', duration: 8000 },
];

/* ══════════════════════════════════════════════
   UTILITY
   ══════════════════════════════════════════════ */

function rnd(min, max)    { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr)        { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function padScore(n) { return String(n).padStart(5, '0'); }

/* ══════════════════════════════════════════════
   SPRITE RENDERERS  (pixel-art via Canvas)
   ══════════════════════════════════════════════ */

const Sprites = {

  /* ── Player ship ── */
  player(ctx, x, y, w, h, shieldActive) {
    const cx = x + w / 2;
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(cx - 3, y + 4, 6, h - 8);
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
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 2, y + 2, 4, 5);
    ctx.fillStyle = rnd(0, 1) > 0.5 ? '#ff8800' : '#ffff00';
    ctx.fillRect(cx - 3, y + h - 6, 6, 4);
    ctx.fillStyle = '#88ff88';
    ctx.fillRect(x + 2,     y + h - 10, 2, 8);
    ctx.fillRect(x + w - 4, y + h - 10, 2, 8);
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

  /* ── BUG — glitchy pixel creature ── */
  bug(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    ctx.fillStyle = color;
    ctx.fillRect(cx - 6, y + 6, 12, 14);
    ctx.fillRect(cx - 5, y + 1, 2, 6);
    ctx.fillRect(cx + 3,  y + 1, 2, 6);
    ctx.fillRect(cx - 7, y, 3, 2);
    ctx.fillRect(cx + 4, y, 3, 2);
    ctx.fillStyle = '#aa0000';
    ctx.fillRect(cx - 10, y + 8,  4, 2);
    ctx.fillRect(cx - 10, y + 12, 4, 2);
    ctx.fillRect(cx + 6,  y + 8,  4, 2);
    ctx.fillRect(cx + 6,  y + 12, 4, 2);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(cx - 5, y + 8, 3, 3);
    ctx.fillRect(cx + 2,  y + 8, 3, 3);
    ctx.fillStyle = '#ff8888';
    ctx.fillRect(cx - 8, y + 16, 2, 2);
    ctx.fillRect(cx + 6,  y + 6,  2, 2);
  },

  /* ── VULN — cracked security shield ── */
  vuln(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + 13, y + 5);
    ctx.lineTo(cx + 13, y + 16);
    ctx.lineTo(cx, y + h - 2);
    ctx.lineTo(cx - 13, y + 16);
    ctx.lineTo(cx - 13, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#220000';
    ctx.beginPath();
    ctx.moveTo(cx, y + 3);
    ctx.lineTo(cx + 10, y + 7);
    ctx.lineTo(cx + 10, y + 15);
    ctx.lineTo(cx, y + h - 5);
    ctx.lineTo(cx - 10, y + 15);
    ctx.lineTo(cx - 10, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, y + 4);
    ctx.lineTo(cx + 2, y + 12);
    ctx.lineTo(cx - 3, y + 18);
    ctx.stroke();
    ctx.fillStyle = '#ffff00';
    ctx.font = '5px monospace';
    ctx.fillText('CVE', cx - 7, y + h / 2 + 2);
  },

  /* ── DELAY — hourglass ── */
  delay(ctx, x, y, w, h, color) {
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + 2);
    ctx.lineTo(cx + 10, y + 2);
    ctx.lineTo(cx + 2,  cy);
    ctx.lineTo(cx - 2,  cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2,  cy);
    ctx.lineTo(cx + 2,  cy);
    ctx.lineTo(cx + 10, y + h - 2);
    ctx.lineTo(cx - 10, y + h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 11, y + 1, 22, h - 2);
    ctx.fillStyle = '#aaffff';
    const sandH = Math.floor((Date.now() / 300) % 8);
    ctx.fillRect(cx - 1, cy, 2, sandH);
    ctx.fillStyle = '#ffff00';
    ctx.font = '5px monospace';
    ctx.fillText('ETA:?', cx - 10, y + h + 2);
  },

  /* ── ZERO-DAY — skull with circuit traces ── */
  zeroday(ctx, x, y, w, h, color) {
    const cx = x + w / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, y + 12, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 12, y + 12, 24, 8);
    ctx.fillStyle = '#220044';
    ctx.fillRect(cx - 9, y + 18, 18, 7);
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 8 + i * 5, y + 18, 3, 4);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(cx - 7, y + 7, 4, 4);
    ctx.fillRect(cx + 3,  y + 7, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 6, y + 8, 2, 2);
    ctx.fillRect(cx + 4,  y + 8, 2, 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, y + 12); ctx.lineTo(cx - 15, y + 12); ctx.lineTo(cx - 15, y + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 12, y + 12); ctx.lineTo(cx + 15, y + 12); ctx.lineTo(cx + 15, y + 20);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 150) * 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y + 14, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  /* ── DEADLOCK — boss: two spinning interlocked gears ── */
  deadlock(ctx, x, y, w, h, color) {
    const cx = x + w / 2, cy = y + h / 2;
    const t = Date.now() / 400;
    ctx.save();
    ctx.translate(cx - 6, cy - 2);
    ctx.rotate(t);
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 8);
      ctx.fillRect(-2, -13, 4, 6);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 6, cy + 2);
    ctx.rotate(-t + Math.PI / 8);
    ctx.fillStyle = '#aa44ff';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 8);
      ctx.fillRect(-2, -10, 4, 5);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 180) * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    ctx.restore();
  },

  /* ── PM BONUS — friendly figure descending with halo ── */
  pm_bonus(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const pulse = 0.7 + Math.sin(Date.now() / 200) * 0.3;
    // Halo
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y + 4, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Head
    ctx.fillStyle = '#ffe0a0';
    ctx.fillRect(cx - 4, y + 7, 8, 7);
    // Smile
    ctx.fillStyle = '#994400';
    ctx.fillRect(cx - 2, y + 11, 4, 1);
    // Suit
    ctx.fillStyle = '#3366cc';
    ctx.fillRect(cx - 6, y + 15, 12, 9);
    // Tie
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(cx - 1, y + 16, 2, 7);
    // Arms
    ctx.fillStyle = '#2255aa';
    ctx.fillRect(cx - 9, y + 15, 3, 7);
    ctx.fillRect(cx + 6,  y + 15, 3, 7);
    // Legs
    ctx.fillStyle = '#224488';
    ctx.fillRect(cx - 4, y + 24, 3, 5);
    ctx.fillRect(cx + 1,  y + 24, 3, 5);
    // Eyes
    ctx.fillStyle = '#000066';
    ctx.fillRect(cx - 3, y + 9, 2, 2);
    ctx.fillRect(cx + 1,  y + 9, 2, 2);
    // "PM!" label below
    ctx.fillStyle = '#ffff00';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText('PM!', cx - 9, y + h + 6);
  },

  /* ── Player bullet ── */
  bullet(ctx, x, y, w, h) {
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 1, y, w - 2, 3);
  },

  /* ── Enemy projectile (calendar/meeting-invite shape) ── */
  bomb(ctx, x, y, w, h) {
    ctx.fillStyle = '#ff3131';
    ctx.fillRect(x, y + 3, w, h - 3);
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(x + 1, y + 4, w - 2, 3);
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(x + 1,     y, 2, 4);
    ctx.fillRect(x + w - 3, y, 2, 4);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(x + 1, y + 8, w - 2, 1);
  },

  /* ── Powerup gem ── */
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

  /* ── Explosion particle ── */
  particle(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  },

  /* ── City building silhouette (background) ── */
  building(ctx, b) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,100,0.3)';
    for (let row = 0; row < Math.floor(b.h / 8); row++) {
      for (let col = 0; col < Math.floor(b.w / 6); col++) {
        if (Math.random() > 0.4) ctx.fillRect(b.x + 2 + col * 6, b.y + 2 + row * 8, 3, 4);
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
    p.x  += p.vx;
    p.y  += p.vy;
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
    this.stars     = [];
    this.buildings = [];
    this.buildingTimer = 0;
    this._initStars();
    this._spawnBuildings(10);
  }

  _initStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: rnd(0, W),
        y: rnd(HUD_H, H),
        size:   rnd(0.5, 2),
        speed:  rnd(0.3, 1.2),
        bright: rnd(0.3, 1.0),
      });
    }
  }

  _spawnBuildings(count = 1) {
    for (let i = 0; i < count; i++) {
      const bw = rndInt(20, 60);
      this.buildings.push({
        x: rnd(0, W - bw),
        y: HUD_H - rndInt(30, 90),
        w: bw,
        h: rndInt(30, 90),
        speed: rnd(0.4, 0.9),
        color: pick(['#0a1a0a', '#0d1a2a', '#1a0d1a', '#1a1a0d']),
      });
    }
  }

  update(speed = 1) {
    this.stars.forEach(s => {
      s.y += s.speed * speed;
      if (s.y > H) { s.y = HUD_H; s.x = rnd(0, W); }
    });
    this.buildings.forEach(b => { b.y += b.speed * speed; });
    this.buildings = this.buildings.filter(b => b.y < H + 100);
    this.buildingTimer++;
    if (this.buildingTimer > 80) { this._spawnBuildings(1); this.buildingTimer = 0; }
  }

  draw(ctx) {
    this.stars.forEach(s => {
      ctx.globalAlpha = s.bright * (0.7 + Math.sin(Date.now() / 800 + s.x) * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
    this.buildings.forEach(b => Sprites.building(ctx, b));
  }
}

/* ══════════════════════════════════════════════
   WAVE / ENEMY FORMATION SYSTEM
   ══════════════════════════════════════════════ */

function buildWave(waveNum) {
  const formations = [];
  const difficulty = Math.min(waveNum, 10);
  const rows = 2 + Math.floor(difficulty / 3);
  const cols = 4 + Math.floor(difficulty / 4);
  const spacing = 52;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const typeIndex = clamp(Math.floor(row / 2 + difficulty / 4), 0, ENEMY_TYPES.length - 1);
      const eType = ENEMY_TYPES[typeIndex];
      const hp = eType.hp + Math.floor(difficulty / 4);
      formations.push({
        type:        eType,
        x:           30 + col * spacing,
        y:           -(row * 60 + 80),
        hp,
        maxHp:       hp,
        vx:          (Math.random() > 0.5 ? 1 : -1) * eType.speed,
        vy:          eType.speed * 0.5,
        bombTimer:   rndInt(180, 500) + row * 60,
        bombCooldown: Math.max(120, 300 - difficulty * 15),
        quoteTimer:  rndInt(200, 600),
        quote:       pick(ENEMY_QUOTES),
        quoteAlpha:  0,
        alive:       true,
        hitFlash:    0,
        pattern:     pick(['straight', 'zigzag', 'dive']),
        patternT:    0,
        isBoss:      false,
      });
    }
  }

  // Boss every 5 waves
  if (waveNum % 5 === 0) {
    const bossHp = 20 + waveNum * 2;
    formations.push({
      type:        ENEMY_TYPES[4],
      x:           W / 2 - ENEMY_W / 2,
      y:           -80,
      hp:          bossHp,
      maxHp:       bossHp,
      vx:          1.2,
      vy:          0.3,
      bombTimer:   60,
      bombCooldown: 60,
      quoteTimer:  150,
      quote:       '"System compromised."',
      quoteAlpha:  0,
      alive:       true,
      hitFlash:    0,
      pattern:     'boss',
      patternT:    0,
      isBoss:      true,
    });
  }

  return formations;
}

/* ══════════════════════════════════════════════
   FLOATING TEXT
   ══════════════════════════════════════════════ */

class FloatText {
  constructor(text, x, y, color = '#ffb300', big = false) {
    this.text    = text;
    this.x       = x;
    this.y       = y;
    this.color   = color;
    this.big     = big;
    this.life    = big ? 90 : 70;
    this.maxLife = this.life;
    this.vy      = big ? -1.8 : -1.4;
  }

  update() { this.y += this.vy; this.life--; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    const size = this.big ? 14 : 9;
    ctx.font = `bold ${size}px "Press Start 2P", monospace`;
    // Shadow / outline for readability
    ctx.fillStyle = '#000000';
    for (const [dx, dy] of [[-1,1],[1,1],[-1,-1],[1,-1],[0,2],[0,-2],[-2,0],[2,0]]) {
      ctx.fillText(this.text, this.x + dx, this.y + dy);
    }
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

/* ══════════════════════════════════════════════
   GAME STATE MACHINE
   ══════════════════════════════════════════════ */

const STATE = {
  MENU:        'menu',
  PLAY:        'play',
  PAUSED:      'paused',
  LEVEL_CLEAR: 'levelclear',
  GAME_OVER:   'gameover',
};

class Game {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    canvas.width  = W;
    canvas.height = H;

    this.state   = STATE.MENU;
    this.keys    = {};
    this.hiScore = parseInt(localStorage.getItem('w8ing4pm_hi') || '0', 10);
    this._menuBG = new Background();

    this._bindEvents();
    this._initMenuUX();
    this._showScreen('menu');
    this._loop();
  }

  /* ══ Init ══ */

  _initGameVars() {
    this.score      = 0;
    this.lives      = 3;
    this.wave       = this.wave || 1;
    this.scoreMulti = 1;

    this.player = {
      x: W / 2 - PLAYER_W / 2,
      y: H - PLAYER_H - 30,
      w: PLAYER_W, h: PLAYER_H,
      invincible:    0,
      shootCooldown: 0,
    };

    this.powerups_active = {};
    this.powerup_timers  = {};

    this.bullets   = [];
    this.enemies   = [];
    this.bombs     = [];
    this.drops     = [];   // powerup gems on field
    this.pmTargets = [];   // bonus PM figures
    this.particles = [];
    this.floats    = [];
    this.bg        = new Background();

    this.pmSpawnTimer    = rndInt(300, 600);
    this.pmSpawnCooldown = rndInt(300, 600);

    this._spawnWave();
    this._updateHUD();
  }

  _spawnWave() {
    this.enemies = buildWave(this.wave);
  }

  _initMenuUX() {
    document.getElementById('hiScoreDisplay').textContent = padScore(this.hiScore);
    let fi = 0;
    const ft = document.getElementById('flavorText');
    ft.textContent = FLAVOR_TEXTS[fi];
    setInterval(() => {
      fi = (fi + 1) % FLAVOR_TEXTS.length;
      ft.textContent = FLAVOR_TEXTS[fi];
    }, 4000);
  }

  /* ══ Events ══ */

  _bindEvents() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      this._handleKeyPress(e.code);
      // Prevent page scroll on arrow/space
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // Touch
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
    if (code === 'KeyP') {
      if (this.state === STATE.PLAY)   this._pause();
      else if (this.state === STATE.PAUSED) this._resume();
      return;
    }
    if (code === 'Space') {
      if (this.state === STATE.MENU || this.state === STATE.GAME_OVER) this._startGame();
    }
  }

  /* ══ Screens ══ */

  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  _updateHUD() {
    document.getElementById('scoreDisplay').textContent = padScore(this.score);
    document.getElementById('waveDisplay').textContent  = String(this.wave).padStart(2, '0');
    document.getElementById('livesDisplay').textContent = '♥'.repeat(Math.max(0, this.lives));
  }

  /* ══ Game flow ══ */

  _startGame() {
    Audio8bit.init();
    Audio8bit.resume();
    this.wave = 1;
    this._initGameVars();
    this.state = STATE.PLAY;
    this._showScreen('hud');
    if (!Audio8bit.muted) Audio8bit.startBG();
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

  /* ══ Score / lives ══ */

  _addScore(n) {
    this.score += n * this.scoreMulti;
    this._updateHUD();
    const hiEl = document.getElementById('hiScoreDisplay');
    if (hiEl) hiEl.textContent = padScore(Math.max(this.score, this.hiScore));
  }

  _loseLife() {
    if (this.player.invincible > 0) return;
    this.lives--;
    this._updateHUD();
    if (this.lives <= 0) { this._gameOver(); return; }
    this.player.invincible = 120;
    Audio8bit.SFX.playerHit();
    spawnExplosion(this.particles,
      this.player.x + PLAYER_W / 2,
      this.player.y + PLAYER_H / 2, '#39ff14', 18);
  }

  /* ══ Power-ups ══ */

  _activatePowerup(type) {
    this.powerups_active[type.id] = true;
    clearTimeout(this.powerup_timers[type.id]);
    this.powerup_timers[type.id] = setTimeout(() => {
      this.powerups_active[type.id] = false;
      if (type.id === 'score2x') this.scoreMulti = 1;
    }, type.duration);
    if (type.id === 'score2x') this.scoreMulti = 2;
    this.floats.push(new FloatText(type.label + '!',
      this.player.x, this.player.y - 10, type.color, true));
    Audio8bit.SFX.powerup();
  }

  /* ══ Shooting ══ */

  _tryShoot() {
    if (this.player.shootCooldown > 0) return;
    const cooldown = this.powerups_active.rapidfire ? SHOOT_COOLDOWN / 3 : SHOOT_COOLDOWN;
    this.player.shootCooldown = cooldown;
    const cx = this.player.x + PLAYER_W / 2 - BULLET_W / 2;
    const by = this.player.y;
    if (this.powerups_active.spread) {
      [-2, -1, 0, 1, 2].forEach(dir => {
        this.bullets.push({ x: cx, y: by, vx: dir * 1.5, vy: -BULLET_SPEED, w: BULLET_W, h: BULLET_H });
      });
    } else {
      this.bullets.push({ x: cx - 8, y: by, vx: 0, vy: -BULLET_SPEED, w: BULLET_W, h: BULLET_H });
      this.bullets.push({ x: cx + 8, y: by, vx: 0, vy: -BULLET_SPEED, w: BULLET_W, h: BULLET_H });
    }
    Audio8bit.SFX.shoot();
  }

  /* ══════════════════════════════════════════════
     MAIN LOOP
     ══════════════════════════════════════════════ */

  _loop() {
    requestAnimationFrame(() => this._loop());
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, W, H);

    if (this.state === STATE.PLAY || this.state === STATE.PAUSED) {
      this._drawGameWorld(ctx);
      if (this.state === STATE.PLAY) this._updatePlay();
    } else {
      this._drawMenuBG(ctx);
    }
  }

  /* ══ Menu background animation ══ */

  _drawMenuBG(ctx) {
    this._menuBG.update(0.5);
    this._menuBG.draw(ctx);
    const t = Date.now() / 1000;
    ENEMY_TYPES.forEach((et, i) => {
      const x = 30 + (i % 5) * 85 + Math.sin(t + i) * 10;
      const y = 90 + Math.floor(i / 5) * 60 + Math.cos(t * 0.7 + i) * 8;
      Sprites[et.sprite](ctx, x, y, ENEMY_W, ENEMY_H, et.color);
    });
    // Demo PM on menu
    const pmX = W / 2 - PM_W / 2 + Math.sin(t * 0.5) * 30;
    const pmY = 500 + Math.sin(t) * 10;
    Sprites.pm_bonus(ctx, pmX, pmY, PM_W, PM_H);
  }

  /* ══════════════════════════════════════════════
     UPDATE
     ══════════════════════════════════════════════ */

  _updatePlay() {
    this._updatePlayer();
    this._updateBullets();
    this._updateEnemies();
    this._updateBombs();
    this._updateDrops();
    this._updatePmTargets();
    updateParticles(this.particles);
    this.floats.forEach(f => f.update());
    this.floats = this.floats.filter(f => !f.dead);

    // Wave clear?
    if (this.enemies.every(e => !e.alive)) this._levelClear();
  }

  /* ── Player ── */
  _updatePlayer() {
    const p = this.player;
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) p.x -= PLAYER_SPEED;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) p.x += PLAYER_SPEED;
    if (this.keys['ArrowUp']    || this.keys['KeyW']) p.y -= PLAYER_SPEED * 0.7;
    if (this.keys['ArrowDown']  || this.keys['KeyS']) p.y += PLAYER_SPEED * 0.7;
    p.x = clamp(p.x, 0, W - PLAYER_W);
    p.y = clamp(p.y, HUD_H + 10, H - PLAYER_H - 10);
    if (this.keys['Space'] || this.keys['KeyZ'] || this.keys['ControlLeft']) this._tryShoot();
    if (p.shootCooldown > 0) p.shootCooldown -= 16;
    if (p.invincible  > 0) p.invincible--;
  }

  /* ── Bullets vs enemies ── */
  _updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < HUD_H || b.x < -10 || b.x > W + 10) { this.bullets.splice(i, 1); continue; }

      let hit = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (collide(b, { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H })) {
          hit = true;
          e.hp--;
          e.hitFlash = 8;
          if (e.hp <= 0) {
            e.alive = false;
            spawnExplosion(this.particles,
              e.x + ENEMY_W / 2, e.y + ENEMY_H / 2,
              e.type.color, e.isBoss ? 30 : 14);
            const pts = e.type.score * (e.isBoss ? 5 : 1);
            this._addScore(pts);
            this.floats.push(new FloatText(
              `+${pts * this.scoreMulti}`,
              clamp(e.x, 4, W - 80), e.y,
              e.type.color, true));
            Audio8bit.SFX.explosion();
            // Powerup drop
            if (e.isBoss || Math.random() < 0.15) {
              this.drops.push({
                x: e.x + ENEMY_W / 2 - 8, y: e.y,
                type: pick(POWERUP_TYPES),
                size: 16, vy: 1.5,
              });
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

  /* ── Enemies movement + attack ── */
  _updateEnemies() {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.patternT += 0.02;

      switch (e.pattern) {
        case 'zigzag':
          e.x += Math.sin(e.patternT * 3) * 2;
          e.y += e.vy;
          break;
        case 'dive':
          if (e.y < H * 0.3) {
            e.y += e.vy;
          } else {
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
          break;
      }

      // Bounce walls
      if (e.x < 0)           { e.x = 0;           e.vx =  Math.abs(e.vx); }
      if (e.x + ENEMY_W > W) { e.x = W - ENEMY_W; e.vx = -Math.abs(e.vx); }

      // Reached bottom → lose life, respawn enemy at top
      if (e.y + ENEMY_H > H) {
        e.y = -ENEMY_H;
        this._loseLife();
      }

      if (e.hitFlash > 0) e.hitFlash--;

      // Floating quote
      e.quoteTimer--;
      if (e.quoteTimer <= 0) {
        e.quoteAlpha  = 1.0;
        e.quote       = pick(ENEMY_QUOTES);
        e.quoteTimer  = rndInt(250, 500);
      }
      if (e.quoteAlpha > 0) e.quoteAlpha -= 0.008;

      // Shoot bomb
      e.bombTimer--;
      if (e.bombTimer <= 0) {
        e.bombTimer = e.bombCooldown + rndInt(-30, 30);
        this.bombs.push({
          x:  e.x + ENEMY_W / 2 - BOMB_W / 2,
          y:  e.y + ENEMY_H,
          vx: (this.player.x - e.x) * 0.01,
          vy: BOMB_SPEED + this.wave * 0.1,
          w:  BOMB_W, h: BOMB_H,
        });
        Audio8bit.SFX.pmDrop();
      }

      // Collide with player
      if (this.player.invincible === 0 &&
          collide({ x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H },
                  { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        if (!this.powerups_active.shield) this._loseLife();
        e.alive = false;
        spawnExplosion(this.particles,
          e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, e.type.color, 16);
      }
    }
  }

  /* ── Enemy bombs ── */
  _updateBombs() {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H) { this.bombs.splice(i, 1); continue; }
      if (this.player.invincible === 0 &&
          collide(b, { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        this.bombs.splice(i, 1);
        if (this.powerups_active.shield) {
          spawnExplosion(this.particles, b.x, b.y, '#00d4ff', 8);
        } else {
          spawnExplosion(this.particles,
            this.player.x + PLAYER_W / 2, this.player.y + PLAYER_H / 2, '#ff3131', 12);
          this._loseLife();
        }
      }
    }
  }

  /* ── Powerup drops ── */
  _updateDrops() {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.y += d.vy;
      if (d.y > H) { this.drops.splice(i, 1); continue; }
      if (collide({ x: d.x, y: d.y, w: d.size, h: d.size },
                  { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H })) {
        this._activatePowerup(d.type);
        this.drops.splice(i, 1);
      }
    }
  }

  /* ── PM bonus targets ── */
  _updatePmTargets() {
    // Spawn timer
    this.pmSpawnTimer--;
    if (this.pmSpawnTimer <= 0) {
      this.pmSpawnTimer = this.pmSpawnCooldown + rndInt(200, 400);
      this.pmTargets.push({
        x:  rnd(20, W - PM_W - 20),
        y:  HUD_H - PM_H,
        vy: rnd(0.8, 1.6),
        alive: true,
      });
    }

    for (let i = this.pmTargets.length - 1; i >= 0; i--) {
      const pm = this.pmTargets[i];
      pm.y += pm.vy;

      // Off screen — missed PM (no penalty, just disappears)
      if (pm.y > H + PM_H) { this.pmTargets.splice(i, 1); continue; }

      // Bullet hits PM — bonus points!
      let caught = false;
      for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
        const b = this.bullets[bi];
        if (collide(b, { x: pm.x, y: pm.y, w: PM_W, h: PM_H })) {
          caught = true;
          this.bullets.splice(bi, 1);
          break;
        }
      }
      // Player flies into PM — also catches!
      if (!caught && collide(
        { x: pm.x, y: pm.y, w: PM_W, h: PM_H },
        { x: this.player.x, y: this.player.y, w: PLAYER_W, h: PLAYER_H }
      )) { caught = true; }

      if (caught) {
        const bonus = 1000 * this.scoreMulti;
        this._addScore(bonus);
        this.floats.push(new FloatText(
          `PM FOUND! +${bonus}`,
          clamp(pm.x - 20, 4, W - 140), pm.y,
          '#ffff00', true));
        spawnExplosion(this.particles,
          pm.x + PM_W / 2, pm.y + PM_H / 2, '#ffff00', 20);
        Audio8bit.SFX.extraLife();
        this.pmTargets.splice(i, 1);
      }
    }
  }

  /* ══════════════════════════════════════════════
     DRAW
     ══════════════════════════════════════════════ */

  _drawGameWorld(ctx) {
    // Background
    this.bg.update(1 + this.wave * 0.05);
    this.bg.draw(ctx);

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash % 2 === 1) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x, e.y, ENEMY_W, ENEMY_H);
        ctx.restore();
      } else {
        Sprites[e.type.sprite](ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.type.color);
        // HP bar for multi-HP enemies
        if (e.maxHp > 1) {
          ctx.fillStyle = '#330000';
          ctx.fillRect(e.x, e.y - 6, ENEMY_W, 3);
          ctx.fillStyle = e.type.color;
          ctx.fillRect(e.x, e.y - 6, ENEMY_W * (e.hp / e.maxHp), 3);
        }
      }
      // Floating quote
      if (e.quoteAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(e.quoteAlpha, 0.9);
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillStyle = '#000';
        ctx.fillText(e.quote, clamp(e.x - 10, 2, W - 120) + 1, e.y - 9);
        ctx.fillStyle = e.type.color;
        ctx.fillText(e.quote, clamp(e.x - 10, 2, W - 120), e.y - 10);
        ctx.restore();
      }
    }

    // PM bonus targets
    for (const pm of this.pmTargets) {
      Sprites.pm_bonus(ctx, pm.x, pm.y, PM_W, PM_H);
    }

    // Bullets
    this.bullets.forEach(b => Sprites.bullet(ctx, b.x, b.y, b.w, b.h));

    // Bombs
    this.bombs.forEach(b => Sprites.bomb(ctx, b.x, b.y, b.w, b.h));

    // Powerup drops
    this.drops.forEach(d => Sprites.powerup(ctx, d.x, d.y, d.size, d.type.color));

    // Player (blink when invincible)
    const p = this.player;
    if (p.invincible === 0 || Math.floor(p.invincible / 6) % 2 === 0) {
      Sprites.player(ctx, p.x, p.y, PLAYER_W, PLAYER_H, this.powerups_active.shield);
    }

    // Particles
    this.particles.forEach(p => Sprites.particle(ctx, p));

    // Floating texts (scores, labels)
    this.floats.forEach(f => f.draw(ctx));

    // Active power-up bar
    this._drawPowerupBar(ctx);

    // Side rails
    ctx.fillStyle = 'rgba(57,255,20,0.06)';
    ctx.fillRect(0, HUD_H, 3, PLAY_H);
    ctx.fillRect(W - 3, HUD_H, 3, PLAY_H);
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
}

/* ══════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  window._game = new Game(canvas);
});
