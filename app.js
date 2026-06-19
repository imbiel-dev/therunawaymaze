import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
const warningScreen = document.getElementById("warningScreen");
const gameScreen = document.getElementById("gameScreen");
const endingScreen = document.getElementById("endingScreen");

const newGameBtn = document.getElementById("newGameBtn");
const continueBtn = document.getElementById("continueBtn");
const resetSaveBtn = document.getElementById("resetSaveBtn");
const saveExitBtn = document.getElementById("saveExitBtn");
const backMenuBtn = document.getElementById("backMenuBtn");

const startAfterWarningBtn = document.getElementById("startAfterWarningBtn");
const backFromWarningBtn = document.getElementById("backFromWarningBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");

const levelNumber = document.getElementById("levelNumber");
const levelTitle = document.getElementById("levelTitle");
const stageWrap = document.getElementById("stageWrap");
const messageOverlay = document.getElementById("messageOverlay");
const jumpscareOverlay = document.getElementById("jumpscareOverlay");
const mobileButtons = document.querySelectorAll("#mobileControls button");

const screenBlinkOverlay = document.getElementById("screenBlinkOverlay");
const redFlashOverlay = document.getElementById("redFlashOverlay");
const fogOverlay = document.getElementById("fogOverlay");
const randomShadow = document.getElementById("randomShadow");

const GAME_NAME = "The Runaway Maze";

const SUPABASE_URL = "https://sfzayitnovlxyaxzfspu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3T0OCkhTr_ZQdV0wSoqlTg_PsJgiv7b";

const supabaseClient =
  SUPABASE_URL.includes("COLE_AQUI") || SUPABASE_ANON_KEY.includes("COLE_AQUI")
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_BACKUP_SAVE_KEY = "the_runaway_maze_local_backup";
const DEVICE_ID_KEY = "the_runaway_maze_device_id";

const SOUND_KEY = "the_runaway_maze_sound_enabled";

const JUMPSCARE_IMAGES = {
  default: "assets/1.png",
  wall: "assets/6.png",
  wrongExit: "assets/3.png",
  hunter: "assets/4.png",
  final: "assets/5.png",
  mid: "assets/2.png"
};

const EXTRA_SOUNDS = {
  ambiente1: "assets/ambiente_susto.mp3",
  ambiente2: "assets/ambiente_susto2.mp3",
  metal1: "assets/metal_susto.mp3",
  metal2: "assets/metais_susto.mp3",
  risada: "assets/risadas_criancas.mp3"
};

let currentLevel = 0;
let keys = {};
let gameRunning = false;
let animationFrameId = null;
let activeLevel = null;
let camera = { x: 0, y: 0 };
let triggered = new Set();
let screenNoise = 0;
let lastTime = 0;


let pendingStartLevel = 0;
let soundEnabled = localStorage.getItem(SOUND_KEY) !== "false";

let supabaseUser = null;


let isJumpscareActive = false;
let lastShadowTime = 0;
let lastAmbientScareTime = 0;
let lastRedFlashTime = 0;
let lastIdleBlinkTime = 0;
let lastPlayerX = null;
let lastPlayerY = null;
let lastPlayerMoveTime = performance.now();
let dangerPressure = 0;


const player = {
  x: 80,
  y: 80,
  size: 23,
  speed: 2.95,
  color: "#f4f4f4"
};

const levelConfigs = [
  {
    title: "Entrada maior",
    seed: 12,
    complexity: 0.10,
    darkness: 0.34,
    message: "O caminho ainda não aprendeu você.",
    event: "quiet"
  },
  {
    title: "Luzes ruins",
    seed: 44,
    complexity: 0.10,
    darkness: 0.48,
    message: "A luz falha quando você corre.",
    event: "flicker"
  },
  {
    title: "O aviso",
    seed: 81,
    complexity: 0.08,
    darkness: 0.42,
    message: "A esquerda observa. A direita esquece.",
    messageTime: 4200,
    event: "memoryClue"
  },
  {
    title: "O passageiro",
    seed: 117,
    complexity: 0.10,
    darkness: 0.38,
    message: "Ele passa quando você acha que vai ficar.",
    event: "fakePassenger"
  },
  {
    title: "Sala fácil",
    seed: 160,
    complexity: 0.15,
    darkness: 0.34,
    message: "A fase não mudou. Você mudou.",
    event: "fakeDifficulty"
  },
  {
    title: "Duas saídas",
    seed: 213,
    complexity: 0.09,
    darkness: 0.44,
    message: "Lembre do aviso.",
    event: "twoExits"
  },
  {
    title: "Relógio morto",
    seed: 244,
    complexity: 0.07,
    darkness: 0.47,
    message: "O vermelho espera.",
    event: "movingWalls"
  },
  {
    title: "Ela não queria",
    seed: 291,
    complexity: 0.10,
    darkness: 0.52,
    message: "Ela olha, mas ainda não quer você.",
    event: "stillCreature"
  },
  {
    title: "Ela aprendeu",
    seed: 334,
    complexity: 0.05,
    darkness: 0.58,
    message: "Agora ela conhece seu caminho.",
    event: "hunter"
  },
  {
    title: "Última saída",
    seed: 410,
    complexity: 0.04,
    darkness: 0.64,
    message: "Seu medo virou mapa.",
    event: "final"
  }
];

const LORE_MESSAGES = {
  wall: [
    "O caminho lembra seus erros.",
    "Não foi a parede. Foi você.",
    "A saída percebeu sua pressa.",
    "Você corre igual da última vez.",
    "Seu medo virou mapa."
  ],

  near: [
    "Ele não está atrás de você. Está esperando.",
    "O silêncio não protege.",
    "A fase não mudou. Você mudou.",
    "Tem algo no limite da câmera.",
    "O labirinto ouviu."
  ],

  idle: [
    "Parar também ensina.",
    "Ele espera quando você espera.",
    "Você voltou de novo.",
    "O labirinto não tem pressa."
  ],

  light: [
    "A luz não mente. Ela omite.",
    "Você viu só metade.",
    "Nem tudo que pisca quer avisar."
  ]
};

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}


const audio = {
  ctx: null,
  master: null,
  ambientOsc: null,
  ambientGain: null,
  heartbeatTimer: null,
  whisperTimer: null,
  ambientOsc2: null,
  ambientGain2: null,
  muted: !soundEnabled,
  extra: {},
  dangerPressure: 0,
  ambientScareTimer: null,

  init() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    this.master.connect(this.ctx.destination);

    this.loadExtraSounds();

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientGain = this.ctx.createGain();

    this.ambientOsc.type = "sine";
    this.ambientOsc.frequency.value = 48;
    this.ambientGain.gain.value = 0.035;

    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(this.master);
    this.ambientOsc.start();

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientGain2 = this.ctx.createGain();

    this.ambientOsc2.type = "triangle";
    this.ambientOsc2.frequency.value = 31;
    this.ambientGain2.gain.value = 0.018;

    this.ambientOsc2.connect(this.ambientGain2);
    this.ambientGain2.connect(this.master);
    this.ambientOsc2.start();

    this.startHeartbeat();
    this.startRandomWhispers();
    this.startAmbientScares();
  },

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  setAmbient(levelIndex) {
    if (!this.ctx) return;

    const freq = 42 + levelIndex * 3.2;
    this.ambientOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.4);
    if (this.ambientOsc2 && this.ambientGain2) {
      this.ambientOsc2.frequency.setTargetAtTime(25 + levelIndex * 1.8, this.ctx.currentTime, 0.5);
      this.ambientGain2.gain.setTargetAtTime(0.012 + levelIndex * 0.002, this.ctx.currentTime, 0.5);
    }
  },

  beep(freq = 180, duration = 0.08, volume = 0.08, type = "square") {
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  wall() {
    this.beep(95, 0.07, 0.09, "sawtooth");
  },

  step() {
    this.beep(70 + Math.random() * 25, 0.035, 0.012, "sine");
  },

  exit() {
    this.beep(420, 0.08, 0.06, "triangle");
    setTimeout(() => this.beep(620, 0.11, 0.05, "triangle"), 70);
  },

  whisper() {
    this.beep(260 + Math.random() * 80, 0.16, 0.035, "sine");
    setTimeout(() => this.beep(150 + Math.random() * 60, 0.21, 0.025, "sine"), 120);
  },

  jumpscare() {
    if (!this.ctx || this.muted) return;

    const bufferSize = this.ctx.sampleRate * 0.48;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    noise.buffer = buffer;
    noiseGain.gain.value = 1.05;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(68, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.42);
    oscGain.gain.value = 0.62;

    noise.connect(noiseGain);
    osc.connect(oscGain);
    noiseGain.connect(this.master);
    oscGain.connect(this.master);

    noise.start();
    osc.start();
    noise.stop(this.ctx.currentTime + 0.48);
    osc.stop(this.ctx.currentTime + 0.48);
  },

  loadExtraSounds() {
  Object.entries(EXTRA_SOUNDS).forEach(([key, src]) => {
    const sound = new Audio(src);
    sound.preload = "auto";
    sound.volume = 0.75;
    this.extra[key] = sound;
  });
},

playExtra(key, volume = 0.85) {
  if (this.muted) return;

  const original = this.extra[key];
  if (!original) return;

  const sound = original.cloneNode();
  sound.volume = volume;
  sound.currentTime = 0;

  sound.play().catch(() => {
    // navegador bloqueou autoplay; vai tocar depois de interação do usuário
  });
},

randomScareSound(context = "default") {
  const options =
      context === "wall"
        ? ["metal1", "metal2"]
        : ["metal1", "metal2", "risada"];

    const selected = options[Math.floor(Math.random() * options.length)];
    this.playExtra(selected, context === "wall" ? 1 : 0.95);
  },

  randomAmbientHit() {
    const options = ["ambiente1", "ambiente2"];
    const selected = options[Math.floor(Math.random() * options.length)];
    this.playExtra(selected, 0.55);
  },

  setDangerPressure(value) {
    this.dangerPressure = Math.max(0, Math.min(1, value));
  },

  playRandomAmbientScare() {
    if (this.muted || isJumpscareActive) return;

    const options = ["ambiente1", "ambiente2", "risada"];
    const selected = options[Math.floor(Math.random() * options.length)];
    const volume = selected === "risada"
      ? 0.34 + Math.random() * 0.22
      : 0.42 + Math.random() * 0.28;

    this.playExtra(selected, volume);
  },

  playWallHitScare() {
    if (this.muted) return;

    this.playExtra("metal1", 0.95);

    setTimeout(() => {
      this.playExtra("metal2", 0.85);
    }, 90);
  },

  startAmbientScares() {
    if (this.ambientScareTimer) clearInterval(this.ambientScareTimer);

    this.ambientScareTimer = setInterval(() => {
      if (!gameRunning || !activeLevel || this.muted || isJumpscareActive) return;

      const chance = 0.12 + currentLevel * 0.018;

      if (Math.random() < chance) {
        this.playRandomAmbientScare();
      }
    }, 6800);
  },


  setMuted(muted) {
  this.muted = muted;
  soundEnabled = !muted;
  localStorage.setItem(SOUND_KEY, soundEnabled ? "true" : "false");

    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.62, this.ctx.currentTime, 0.12);
    }
  },

  toggleMuted() {
    this.setMuted(!this.muted);
  },

  tension() {
    this.beep(38, 0.22, 0.05, "sawtooth");
    setTimeout(() => this.beep(51, 0.18, 0.035, "triangle"), 140);
  },

  startRandomWhispers() {
    if (this.whisperTimer) clearInterval(this.whisperTimer);

    this.whisperTimer = setInterval(() => {
      if (!gameRunning || !activeLevel || this.muted) return;

      const chance = 0.12 + currentLevel * 0.012;

      if (Math.random() < chance) {
        this.whisper();
      }
    }, 5200);
  },

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      if (!gameRunning || !activeLevel || this.muted) return;

      const pressure = this.dangerPressure || 0;
      const intensity = activeLevel.config.darkness + currentLevel * 0.035 + pressure * 0.38;

      if (Math.random() < intensity) {
        const firstBeat = 0.055 + pressure * 0.085;
        const secondBeat = 0.045 + pressure * 0.065;

        this.beep(52, 0.08, firstBeat, "sine");
        setTimeout(() => this.beep(47, 0.10, secondBeat, "sine"), 115);
      }
    }, 1120);
  }
};

function makeRng(seed) {
  let value = seed;

  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function createMaze(config) {
  const cols = 33;
  const rows = 23;
  const tile = 40;
  const rng = makeRng(config.seed);

  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));

  function carve(cx, cy) {
    grid[cy][cx] = 0;

    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2]
    ].sort(() => rng() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
      if (grid[ny][nx] === 0) continue;

      grid[cy + dy / 2][cx + dx / 2] = 0;
      carve(nx, ny);
    }
  }

  carve(1, 1);

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === 1 && rng() < config.complexity) {
        grid[y][x] = 0;
      }
    }
  }

  const startCell = { x: 1, y: rows - 2 };
  const exitCell = { x: cols - 2, y: 1 };

  openCell(grid, startCell.x, startCell.y);
  openCell(grid, exitCell.x, exitCell.y);

  carveLine(grid, 1, rows - 2, 1, rows - 4);
  carveLine(grid, cols - 2, 1, cols - 4, 1);

  const level = {
    config,
    cols,
    rows,
    tile,
    width: cols * tile,
    height: rows * tile,
    grid,
    start: cellCenter(startCell.x, startCell.y, tile),
    exit: cellRect(exitCell.x, exitCell.y, tile),
    wrongExit: null,
    obstacles: [],
    triggers: [],
    passenger: null,
    creature: null,
    hunter: null,
    lightPhase: 0
  };

  applyLevelSpecials(level);

  return level;
}

function openCell(grid, x, y) {
  if (grid[y]) grid[y][x] = 0;
}

function carveLine(grid, x1, y1, x2, y2) {
  let x = x1;
  let y = y1;

  while (x !== x2 || y !== y2) {
    openCell(grid, x, y);

    if (x < x2) x++;
    else if (x > x2) x--;

    if (y < y2) y++;
    else if (y > y2) y--;
  }

  openCell(grid, x2, y2);
}

function cellCenter(x, y, tile) {
  return {
    x: x * tile + tile / 2,
    y: y * tile + tile / 2
  };
}

function cellRect(x, y, tile) {
  return {
    x: x * tile + 5,
    y: y * tile + 5,
    w: tile - 10,
    h: tile - 10
  };
}

function applyLevelSpecials(level) {
  const event = level.config.event;
  const tile = level.tile;

  if (event === "twoExits") {
    const leftExitCell = { x: 1, y: 1 };
    const rightExitCell = { x: level.cols - 2, y: 1 };

    openCell(level.grid, leftExitCell.x, leftExitCell.y);
    openCell(level.grid, rightExitCell.x, rightExitCell.y);

    level.wrongExit = cellRect(leftExitCell.x, leftExitCell.y, tile);
    level.exit = cellRect(rightExitCell.x, rightExitCell.y, tile);

    carveLine(level.grid, 1, 1, 3, 1);
    carveLine(level.grid, level.cols - 2, 1, level.cols - 4, 1);
  }

  if (event === "movingWalls") {
    level.obstacles.push(
      movingObstacle(7, 7, "vertical", 0.85, 0.22, level),
      movingObstacle(15, 11, "horizontal", 0.95, 0.24, level),
      movingObstacle(23, 6, "vertical", 0.85, 0.20, level)
    );

    level.triggers.push({
      id: "clock_warning",
      rect: cellRect(17, 9, tile),
      type: "softJump",
      message: "O vermelho espera."
    });
  }

  if (event === "fakePassenger") {
    level.obstacles.push(
      movingObstacle(8, 15, "horizontal", 0.70, 0.16, level),
      movingObstacle(24, 14, "vertical", 0.75, 0.15, level)
    );

    level.passenger = {
      active: true,
      x: level.width + 60,
      y: level.height * 0.35,
      speed: 2.05,
      passed: false
    };
  }

  if (event === "fakeDifficulty") {
    level.triggers.push({
      id: "fake_room_flash",
      rect: cellRect(13, 11, tile),
      type: "lightLie",
      message: "A luz não mentiu. Ela escondeu."
    });
  }

  if (event === "stillCreature") {
    const pos = cellCenter(15, 10, tile);

    openCell(level.grid, 15, 10);
    openCell(level.grid, 15, 9);
    openCell(level.grid, 15, 11);

    level.creature = {
      x: pos.x - 22,
      y: pos.y - 22,
      w: 44,
      h: 44,
      watching: true
    };
  }

  if (event === "hunter") {
    const pos = cellCenter(15, 10, tile);

    openCell(level.grid, 15, 10);
    openCell(level.grid, 15, 9);
    openCell(level.grid, 15, 11);

    level.hunter = {
      x: pos.x,
      y: pos.y,
      size: 34,
      speed: 1.05,
      active: false
    };

    level.triggers.push({
      id: "hunter_wakeup",
      rect: cellRect(12, 12, tile),
      type: "wakeHunter",
      message: "Agora queria."
    });

    level.obstacles.push(
      movingObstacle(8, 15, "horizontal", 0.70, 0.16, level),
      movingObstacle(24, 14, "vertical", 0.75, 0.15, level)
    );
  }

  if (event === "final") {
    level.obstacles.push(
      movingObstacle(8, 15, "horizontal", 0.70, 0.16, level),
      movingObstacle(24, 14, "vertical", 0.75, 0.15, level)
    );
    level.triggers.push(
      {
        id: "final_mid",
        rect: cellRect(13, 11, tile),
        type: "hardJump",
        image: "mid",
        message: "Obrigado por me ensinar."
      },
      {
        id: "final_near_exit",
        rect: cellRect(25, 3, tile),
        type: "flicker",
        message: "A saída percebeu sua pressa."
      }
    );
  }
}

function movingObstacle(cx, cy, axis, rangeCells, speed, level) {
  const tile = level.tile;
  const pos = cellCenter(cx, cy, tile);

  openCell(level.grid, cx, cy);
  openCell(level.grid, cx + 1, cy);
  openCell(level.grid, cx - 1, cy);
  openCell(level.grid, cx, cy + 1);
  openCell(level.grid, cx, cy - 1);

  return {
    x: pos.x - 12,
    y: pos.y - 12,
    baseX: pos.x - 12,
    baseY: pos.y - 12,
    w: 24,
    h: 24,
    axis,
    range: rangeCells * tile,
    speed,
    t: Math.random() * 100
  };
}

function showScreen(screen) {
  menuScreen.classList.remove("active");
  warningScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  endingScreen.classList.remove("active");
  screen.classList.add("active");
}

async function ensureSupabaseUser() {
  if (!supabaseClient) return null;

  const { data: sessionData } = await supabaseClient.auth.getSession();

  if (sessionData?.session?.user) {
    supabaseUser = sessionData.session.user;
    return supabaseUser;
  }

  const { data, error } = await supabaseClient.auth.signInAnonymously();

  if (error) {
    console.warn("Erro ao autenticar anonimamente:", error.message);
    return null;
  }

  supabaseUser = data.user;
  return supabaseUser;
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

function getLocalBackupSave() {
  try {
    const save = JSON.parse(localStorage.getItem(LOCAL_BACKUP_SAVE_KEY));

    if (!save) return null;

    return {
      level: Number(save.level) || 0,
      completed: Boolean(save.completed),
      completed_at: save.completed_at || null
    };
  } catch {
    return null;
  }
}

async function hasSave() {
  const localSave = getLocalBackupSave();

  if (localSave && !localSave.completed) return true;

  if (!supabaseClient) return false;

  const user = await ensureSupabaseUser();
  if (!user) return false;

  const { data, error } = await supabaseClient
    .from("runaway_saves")
    .select("level, completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Erro ao verificar save no Supabase:", error.message);
    return false;
  }

  return !!data && !data.completed;
}

async function updateContinueButton() {
  const saved = await hasSave();

  if (saved) {
    continueBtn.classList.remove("disabled");
    document.getElementById("menuHint").textContent = "você voltou.";
  } else {
    continueBtn.classList.add("disabled");
    document.getElementById("menuHint").textContent = "chegue até a saída.";
  }
}

async function saveGame(extra = {}) {
  const previousSave = getLocalBackupSave();

  const localPayload = {
    level: currentLevel,
    completed: extra.completed ?? previousSave?.completed ?? false,
    completed_at: extra.completed_at ?? previousSave?.completed_at ?? null
  };

  localStorage.setItem(LOCAL_BACKUP_SAVE_KEY, JSON.stringify(localPayload));

  if (!supabaseClient) return;

  const user = await ensureSupabaseUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    device_id: getDeviceId(),
    level: currentLevel,
    completed: localPayload.completed,
    completed_at: localPayload.completed_at,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("runaway_saves")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.warn("Erro ao salvar no Supabase:", error.message);
  }
}

async function markGameCompleted() {
  const completedAt = new Date().toISOString();

  localStorage.setItem(LOCAL_BACKUP_SAVE_KEY, JSON.stringify({
    level: currentLevel,
    completed: true,
    completed_at: completedAt
  }));

  if (!supabaseClient) return;

  const user = await ensureSupabaseUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    device_id: getDeviceId(),
    level: currentLevel,
    completed: true,
    completed_at: completedAt,
    updated_at: completedAt
  };

  const { error } = await supabaseClient
    .from("runaway_saves")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.warn("Erro ao salvar conclusão no Supabase:", error.message);
  }
}

async function clearSave() {
  localStorage.removeItem(LOCAL_BACKUP_SAVE_KEY);

  if (supabaseClient) {
    const user = await ensureSupabaseUser();

    if (user) {
      const { error } = await supabaseClient
        .from("runaway_saves")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.warn("Erro ao apagar save no Supabase:", error.message);
      }
    }
  }

  await updateContinueButton();
}

async function loadSave() {
  if (supabaseClient) {
    const user = await ensureSupabaseUser();

    if (user) {
      const { data, error } = await supabaseClient
        .from("runaway_saves")
        .select("level, completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data && !data.completed) {
        return Number(data.level) || 0;
      }

      if (error) {
        console.warn("Erro ao carregar save do Supabase:", error.message);
      }
    }
  }

  const localSave = getLocalBackupSave();
  return localSave && !localSave.completed ? localSave.level : 0;
}

function startGame(levelIndex = 0) {
  audio.init();
  audio.resume();

  currentLevel = levelIndex;
  showScreen(gameScreen);
  loadLevel(currentLevel);

  gameRunning = true;


  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  lastTime = performance.now();
  gameLoop(lastTime);
}

function loadLevel(index) {
  resetStageEffects();

  const config = levelConfigs[index];
  activeLevel = createMaze(config);
  triggered = new Set();

  levelNumber.textContent = index + 1;
  levelTitle.textContent = config.title;

  player.x = activeLevel.start.x - player.size / 2;
  player.y = activeLevel.start.y - player.size / 2;

  audio.setAmbient(index);

  if (index >= 2) {
    stageWrap.classList.add("darkRoom");
  }

  if (fogOverlay) {
    const fogAmount = Math.min(0.26, 0.10 + index * 0.018);
    fogOverlay.style.opacity = String(fogAmount);
  }

  triggerScreenBlink(
    Math.min(0.34, 0.16 + index * 0.015),
    280,
    index >= 6 ? "red" : "white"
  );

  if (config.message) {
    showMessage(config.message, config.messageTime || 2100);
  }

  saveGame();

  requestAnimationFrame(() => {
    resizeCanvas();
    updateCamera();
    drawLevel();
  });
}

function resetStageEffects() {
  stageWrap.classList.remove(
    "flicker",
    "dangerPulse",
    "darkRoom",
    "redRoom",
    "softGlitch"
  );

  messageOverlay.classList.remove("show");
  jumpscareOverlay.classList.remove("show");
  document.body.classList.remove("shake");
  screenNoise = 0;

  hideRandomShadow();

  if (screenBlinkOverlay) {
    screenBlinkOverlay.classList.remove("active");
  }

  if (redFlashOverlay) {
    redFlashOverlay.classList.remove("active");
  }

  if (fogOverlay) {
    fogOverlay.style.opacity = "0.12";
  }

  dangerPressure = 0;
  isJumpscareActive = false;

  if (audio?.setDangerPressure) {
    audio.setDangerPressure(0);
  }

}

function resizeCanvas() {
  const rect = stageWrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const cssWidth = Math.max(280, Math.floor(rect.width));
  const cssHeight = Math.max(280, Math.floor(rect.height));

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  canvas.logicalWidth = cssWidth;
  canvas.logicalHeight = cssHeight;
}

function showMessage(text, time = 1600) {
  messageOverlay.textContent = text;
  messageOverlay.classList.add("show");

  setTimeout(() => {
    messageOverlay.classList.remove("show");
  }, time);
}

function triggerShake() {
  document.body.classList.add("shake");
  setTimeout(() => {
    document.body.classList.remove("shake");
  }, 620);
}

function triggerScreenBlink(intensity = 0.35, duration = 260, color = "white") {
  if (!screenBlinkOverlay || isJumpscareActive) return;

  const colors = {
    white: "rgba(255,255,255,0.72)",
    black: "rgba(0,0,0,0.78)",
    red: "rgba(150,0,0,0.62)"
  };

  screenBlinkOverlay.style.setProperty("--blink-color", colors[color] || colors.white);
  screenBlinkOverlay.style.setProperty("--blink-opacity", String(intensity));
  screenBlinkOverlay.style.setProperty("--blink-duration", `${duration}ms`);

  screenBlinkOverlay.classList.remove("active");
  void screenBlinkOverlay.offsetWidth;
  screenBlinkOverlay.classList.add("active");

  setTimeout(() => {
    screenBlinkOverlay.classList.remove("active");
  }, duration + 40);
}

function triggerRedFlash(level = 1) {
  if (!redFlashOverlay || isJumpscareActive) return;

  const now = performance.now();

  if (now - lastRedFlashTime < 900) return;
  lastRedFlashTime = now;

  const opacity = level === 3 ? 0.55 : level === 2 ? 0.38 : 0.24;
  const duration = level === 3 ? 340 : level === 2 ? 260 : 190;

  redFlashOverlay.style.setProperty("--red-flash-opacity", String(opacity));
  redFlashOverlay.style.setProperty("--red-flash-duration", `${duration}ms`);

  redFlashOverlay.classList.remove("active");
  void redFlashOverlay.offsetWidth;
  redFlashOverlay.classList.add("active");

  setTimeout(() => {
    redFlashOverlay.classList.remove("active");
  }, duration + 40);
}

function hideRandomShadow() {
  if (!randomShadow) return;
  randomShadow.classList.remove("show");
}

function spawnShadowInCameraRange() {
  if (!randomShadow || !activeLevel || isJumpscareActive) return;

  const now = performance.now();

  if (now - lastShadowTime < 4200) return;
  lastShadowTime = now;

  const viewWidth = canvas.logicalWidth || stageWrap.clientWidth || 800;
  const viewHeight = canvas.logicalHeight || stageWrap.clientHeight || 500;

  const playerScreenX = toScreenX(player.x + player.size / 2);
  const playerScreenY = toScreenY(player.y + player.size / 2);

  let x;
  let y;

  const side = Math.floor(Math.random() * 4);
  const margin = 34;

  if (side === 0) {
    x = margin + Math.random() * (viewWidth - margin * 2);
    y = margin;
  } else if (side === 1) {
    x = viewWidth - margin - 34;
    y = margin + Math.random() * (viewHeight - margin * 2);
  } else if (side === 2) {
    x = margin + Math.random() * (viewWidth - margin * 2);
    y = viewHeight - margin - 64;
  } else {
    x = margin;
    y = margin + Math.random() * (viewHeight - margin * 2);
  }

  const distanceFromPlayer = Math.hypot(x - playerScreenX, y - playerScreenY);

  if (distanceFromPlayer < 120) {
    x = viewWidth - x;
    y = viewHeight - y;
  }

  const duration = 420 + Math.random() * 520;
  const opacity = 0.30 + Math.random() * 0.28;

  randomShadow.style.setProperty("--shadow-x", `${x}px`);
  randomShadow.style.setProperty("--shadow-y", `${y}px`);
  randomShadow.style.setProperty("--shadow-duration", `${duration}ms`);
  randomShadow.style.setProperty("--shadow-opacity", String(opacity));

  randomShadow.classList.remove("show");
  void randomShadow.offsetWidth;
  randomShadow.classList.add("show");

  setTimeout(() => {
    randomShadow.classList.remove("show");
  }, duration + 60);
}

function distanceToRect(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

function getDistanceToNearestDanger() {
  if (!activeLevel) return Infinity;

  const px = player.x + player.size / 2;
  const py = player.y + player.size / 2;

  let nearest = Infinity;

  activeLevel.obstacles.forEach((ob) => {
    nearest = Math.min(nearest, distanceToRect(px, py, ob));
  });

  if (activeLevel.wrongExit) {
    nearest = Math.min(nearest, distanceToRect(px, py, activeLevel.wrongExit));
  }

  if (activeLevel.creature) {
    nearest = Math.min(nearest, distanceToRect(px, py, activeLevel.creature));
  }

  if (activeLevel.hunter) {
    const h = activeLevel.hunter;
    nearest = Math.min(
      nearest,
      Math.hypot(px - h.x, py - h.y)
    );
  }

  if (activeLevel.passenger?.active) {
    nearest = Math.min(
      nearest,
      Math.hypot(px - activeLevel.passenger.x, py - activeLevel.passenger.y)
    );
  }

  return nearest;
}

function updatePsychologicalEvents(now, dt) {
  if (!activeLevel || isJumpscareActive) return;

  if (lastPlayerX === null || lastPlayerY === null) {
    lastPlayerX = player.x;
    lastPlayerY = player.y;
  }

  const movedDistance = Math.hypot(player.x - lastPlayerX, player.y - lastPlayerY);

  if (movedDistance > 0.6) {
    lastPlayerMoveTime = now;
    lastPlayerX = player.x;
    lastPlayerY = player.y;
  }

  const distance = getDistanceToNearestDanger();
  const scareRange = 165 + currentLevel * 7;

  dangerPressure = distance < scareRange
    ? clamp((scareRange - distance) / scareRange, 0, 1)
    : 0;

  audio.setDangerPressure(dangerPressure);

  if (dangerPressure > 0.35 && now - lastAmbientScareTime > 2900) {
    lastAmbientScareTime = now;

    audio.playRandomAmbientScare();

    if (dangerPressure > 0.72) {
      triggerRedFlash(2);
      triggerScreenBlink(0.16, 140, "red");
      showMessage(randomFrom(LORE_MESSAGES.near), 950);
    } else {
      triggerRedFlash(1);
    }
  }

  const idleTime = now - lastPlayerMoveTime;

  if (idleTime > 4200 && now - lastIdleBlinkTime > 5000) {
    lastIdleBlinkTime = now;

    triggerScreenBlink(0.14, 180, "black");

    if (Math.random() < 0.65) {
      spawnShadowInCameraRange();
    }

    if (Math.random() < 0.40) {
      showMessage(randomFrom(LORE_MESSAGES.idle), 1000);
    }
  }

  const shadowChance = 0.003 + currentLevel * 0.0008;

  if (Math.random() < shadowChance) {
    spawnShadowInCameraRange();
  }
}


function resetPlayer(message = "Parede.") {
  const wallJumpscareLevels = ["quiet","fakeDifficulty","twoExits","stillCreature","final"];

  const passedHalf =
    activeLevel &&
    wallJumpscareLevels.includes(activeLevel.config.event) &&
    player.x > activeLevel.width * 0.42 &&
    player.y < activeLevel.height * 0.42;

  if (passedHalf) {
    triggerScreenBlink(0.42, 160, "white");
    audio.playWallHitScare();

    showJumpscare(650, () => {
      player.x = activeLevel.start.x - player.size / 2;
      player.y = activeLevel.start.y - player.size / 2;
      showMessage(randomFrom(LORE_MESSAGES.wall), 1300);
    }, "wall");

    return;
  }

  player.x = activeLevel.start.x - player.size / 2;
  player.y = activeLevel.start.y - player.size / 2;

  audio.wall();
  triggerShake();
  triggerScreenBlink(0.20, 130, "black");

  if (Math.random() < 0.30) {
    triggerRedFlash(1);
  }

  showMessage(
    Math.random() < 0.45 ? randomFrom(LORE_MESSAGES.wall) : message,
    1050
  );
}

function nextLevel() {
  audio.exit();

  if (currentLevel === levelConfigs.length - 1) {
    triggerFinal();
    return;
  }

  currentLevel++;
  loadLevel(currentLevel);
}

function triggerFinal() {
  gameRunning = false;

  showJumpscare(1050, async () => {
    await markGameCompleted();
    await updateContinueButton();
    showScreen(endingScreen);
  }, "final");
}

function showJumpscare(duration = 650, callback, imageKey = "default") {
  const jumpscareImage = document.getElementById("jumpscareImage");
  const selectedImage = JUMPSCARE_IMAGES[imageKey] || imageKey || JUMPSCARE_IMAGES.default;

  isJumpscareActive = true;

  if (screenBlinkOverlay) {
    screenBlinkOverlay.classList.remove("active");
  }

  if (redFlashOverlay) {
    redFlashOverlay.classList.remove("active");
  }

  jumpscareImage.src = selectedImage;

  audio.jumpscare();

  audio.randomScareSound(imageKey);

  jumpscareOverlay.classList.remove("show");
  void jumpscareOverlay.offsetWidth;

  jumpscareImage.style.animation = "none";
  void jumpscareImage.offsetWidth;
  jumpscareImage.style.animation = "";

  jumpscareOverlay.classList.add("show");

  triggerShake();
  screenNoise = 1;

  setTimeout(() => {
    jumpscareOverlay.classList.remove("show");
    screenNoise = 0;
    isJumpscareActive = false;

    if (callback) {
      callback();
    }
  }, duration);
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  if (dx !== 0 || dy !== 0) {
    if (Math.random() < 0.035) audio.step();
  }

  player.x += dx * player.speed;
  if (collidesWithWall(player.x, player.y)) {
    player.x -= dx * player.speed;
    resetPlayer("Parede.");
    return;
  }

  player.y += dy * player.speed;
  if (collidesWithWall(player.x, player.y)) {
    player.y -= dy * player.speed;
    resetPlayer("Parede.");
  }
}

function collidesWithWall(x, y) {
  const rect = {
    x,
    y,
    w: player.size,
    h: player.size
  };

  const minCol = Math.floor(rect.x / activeLevel.tile) - 1;
  const maxCol = Math.floor((rect.x + rect.w) / activeLevel.tile) + 1;
  const minRow = Math.floor(rect.y / activeLevel.tile) - 1;
  const maxRow = Math.floor((rect.y + rect.h) / activeLevel.tile) + 1;

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (row < 0 || col < 0 || row >= activeLevel.rows || col >= activeLevel.cols) {
        return true;
      }

      if (activeLevel.grid[row][col] === 1) {
        const wallRect = {
          x: col * activeLevel.tile,
          y: row * activeLevel.tile,
          w: activeLevel.tile,
          h: activeLevel.tile
        };

        if (intersects(rect, wallRect)) {
          return true;
        }
      }
    }
  }

  return false;
}

function updateObstacles(dt) {
  activeLevel.obstacles.forEach((ob) => {
    ob.t += ob.speed * dt * 0.032;

    const move = Math.sin(ob.t) * ob.range;

    if (ob.axis === "horizontal") {
      ob.x = ob.baseX + move;
    } else {
      ob.y = ob.baseY + move;
    }

    const playerCenterX = player.x + player.size / 2;
    const playerCenterY = player.y + player.size / 2;
    const distance = distanceToRect(playerCenterX, playerCenterY, ob);

    if (distance < 88) {
      triggerRedFlash(distance < 42 ? 2 : 1);

      if (Math.random() < 0.035) {
        audio.playRandomAmbientScare();
      }
    }

    if (intersects(playerRect(), ob)) {
      audio.playWallHitScare();
      triggerShake();

      showJumpscare(560, () => {
        resetPlayer("O vermelho tocou.");
      }, "wall");
    }
  });
}

function updateHunter(dt) {
  if (!activeLevel.hunter) return;

  const h = activeLevel.hunter;

  if (!h.active) return;

  const px = player.x + player.size / 2;
  const py = player.y + player.size / 2;

  const angle = Math.atan2(py - h.y, px - h.x);

  h.x += Math.cos(angle) * h.speed * dt * 0.06;
  h.y += Math.sin(angle) * h.speed * dt * 0.06;

  const hRect = {
    x: h.x - h.size / 2,
    y: h.y - h.size / 2,
    w: h.size,
    h: h.size
  };

  if (intersects(playerRect(), hRect)) {
    showJumpscare(520, () => {
      resetPlayer("Ela aprendeu o caminho.");
      h.active = false;
    }, "hunter");
  }
}

function updatePassenger(dt) {
  if (!activeLevel.passenger || !activeLevel.passenger.active) return;

  const p = activeLevel.passenger;
  p.x -= p.speed * dt * 0.07;
  p.y += Math.sin(performance.now() * 0.003) * 0.45;

  const distance = Math.hypot(
    player.x + player.size / 2 - p.x,
    player.y + player.size / 2 - p.y
  );

  if (distance < 130 && !p.passed) {
    p.passed = true;
    audio.whisper();
    showMessage("Ele não encostou.", 1300);
  }

  if (p.x < -120) {
    p.active = false;
    showMessage("Ele passou.", 1400);
  }
}

function checkTriggers() {
  for (const trigger of activeLevel.triggers) {
    if (triggered.has(trigger.id)) continue;

    if (intersects(playerRect(), trigger.rect)) {
      triggered.add(trigger.id);

      if (trigger.type === "softJump") {
        stageWrap.classList.add("softGlitch");
        audio.whisper();
        triggerScreenBlink(0.18, 180, "black");
        triggerRedFlash(1);
        showMessage(trigger.message, 1000);

        setTimeout(() => {
          stageWrap.classList.remove("softGlitch");
        }, 900);
      }

      if (trigger.type === "lightLie") {
        stageWrap.classList.add("softGlitch");
        audio.whisper();
        triggerScreenBlink(0.24, 220, "white");
        showMessage(randomFrom(LORE_MESSAGES.light), 1100);
        showMessage(trigger.message, 1000);

        setTimeout(() => {
          stageWrap.classList.remove("softGlitch");
        }, 850);
      }

      if (trigger.type === "wakeHunter") {
        showMessage(trigger.message, 1200);
        audio.whisper();
        audio.tension();
        audio.playExtra("risada", 0.55);
        triggerRedFlash(3);
        triggerScreenBlink(0.28, 220, "red");
        spawnShadowInCameraRange();
        stageWrap.classList.add("redRoom");

        if (activeLevel.hunter) {
          activeLevel.hunter.active = true;
        }
      }

      if (trigger.type === "hardJump") {
        audio.tension();

        showJumpscare(620, () => {
          showMessage(trigger.message, 1200);
        }, trigger.image || "mid");
      }

      if (trigger.type === "flicker") {
        stageWrap.classList.add("softGlitch");
        audio.whisper();
        audio.tension();
        audio.randomAmbientHit();
        triggerRedFlash(2);
        spawnShadowInCameraRange();
        showMessage(trigger.message, 1200);

        setTimeout(() => {
          stageWrap.classList.remove("softGlitch");
        }, 1300);
      }
    }
  }
}

function checkExits() {
  if (activeLevel.wrongExit && intersects(playerRect(), activeLevel.wrongExit)) {
    if (!triggered.has("wrong_exit")) {
      triggered.add("wrong_exit");

      showJumpscare(540, () => {
        resetPlayer("A esquerda observou.");
        setTimeout(() => triggered.delete("wrong_exit"), 900);
      }, "wrongExit");
    }

    return;
  }

  if (intersects(playerRect(), activeLevel.exit)) {
    nextLevel();
  }
}

function playerRect() {
  return {
    x: player.x,
    y: player.y,
    w: player.size,
    h: player.size
  };
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function updateCamera() {
  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  const targetX = player.x + player.size / 2 - viewWidth / 2;
  const targetY = player.y + player.size / 2 - viewHeight / 2;

  camera.x += (targetX - camera.x) * 0.12;
  camera.y += (targetY - camera.y) * 0.12;

  camera.x = clamp(camera.x, 0, Math.max(0, activeLevel.width - viewWidth));
  camera.y = clamp(camera.y, 0, Math.max(0, activeLevel.height - viewHeight));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawLevel() {
  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  ctx.clearRect(0, 0, viewWidth, viewHeight);

  drawBackground();
  drawMaze();
  drawAmbientMarks();
  drawExit(activeLevel.exit, false);

  if (activeLevel.wrongExit) {
    drawExit(activeLevel.wrongExit, true);
  }

  drawObstacles();
  drawCreature();
  drawHunter();
  drawPassenger();
  drawPlayer();
  drawLights();
  drawNoise();
}

function toScreenX(x) {
  return x - camera.x;
}

function toScreenY(y) {
  return y - camera.y;
}

function drawBackground() {
  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  const gradient = ctx.createRadialGradient(
    viewWidth / 2,
    viewHeight / 2,
    80,
    viewWidth / 2,
    viewHeight / 2,
    viewWidth * 0.72
  );

  gradient.addColorStop(0, "#151515");
  gradient.addColorStop(0.65, "#080808");
  gradient.addColorStop(1, "#020202");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawMaze() {
  const tile = activeLevel.tile;

  const startCol = Math.floor(camera.x / tile) - 1;
  const startRow = Math.floor(camera.y / tile) - 1;
  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  const endCol = Math.ceil((camera.x + viewWidth) / tile) + 1;
  const endRow = Math.ceil((camera.y + viewHeight) / tile) + 1;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (row < 0 || col < 0 || row >= activeLevel.rows || col >= activeLevel.cols) continue;

      const x = toScreenX(col * tile);
      const y = toScreenY(row * tile);

      if (activeLevel.grid[row][col] === 1) {
        const shade = 190 + Math.sin((row + col) * 0.8) * 12;

        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x, y, tile, tile);

        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(x, y + tile - 5, tile, 5);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.018)";
        ctx.fillRect(x, y, tile, tile);

        if ((row + col) % 7 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.028)";
          ctx.fillRect(x + tile / 2, y + tile / 2, 2, 2);
        }
      }
    }
  }
}

function drawAmbientMarks() {
  const seed = activeLevel.config.seed || 1;
  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  ctx.save();

  for (let i = 0; i < 18; i++) {
    const worldX = (seed * 91 + i * 173) % activeLevel.width;
    const worldY = (seed * 47 + i * 119) % activeLevel.height;

    const x = toScreenX(worldX);
    const y = toScreenY(worldY);

    if (x < -80 || y < -80 || x > viewWidth + 80 || y > viewHeight + 80) {
      continue;
    }

    const pulse = 0.08 + Math.sin(performance.now() * 0.002 + i) * 0.035;

    ctx.globalAlpha = pulse;
    ctx.fillStyle = i % 3 === 0 ? "rgba(120,0,0,0.55)" : "rgba(255,255,255,0.28)";

    if (i % 4 === 0) {
      ctx.fillRect(x, y, 18, 2);
      ctx.fillRect(x + 8, y - 8, 2, 18);
    } else if (i % 5 === 0) {
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, 2, 22);
      ctx.fillRect(x + 8, y + 5, 2, 12);
    }
  }

  ctx.restore();
}

function drawExit(exit, wrong) {
  const x = toScreenX(exit.x);
  const y = toScreenY(exit.y);

  ctx.fillStyle = wrong ? "rgba(115,0,0,0.92)" : "rgba(230,230,230,0.96)";
  ctx.fillRect(x, y, exit.w, exit.h);

  ctx.fillStyle = wrong ? "#fff" : "#000";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SAÍDA", x + exit.w / 2, y + exit.h / 2 + 4);
}

function drawObstacles() {
  activeLevel.obstacles.forEach((ob) => {
    const x = toScreenX(ob.x);
    const y = toScreenY(ob.y);

    ctx.fillStyle = "#920000";
    ctx.fillRect(x, y, ob.w, ob.h);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x, y, ob.w, 4);
  });
}

function drawCreature() {
  if (!activeLevel.creature) return;

  const c = activeLevel.creature;
  const x = toScreenX(c.x);
  const y = toScreenY(c.y);

  ctx.fillStyle = "#030303";
  ctx.fillRect(x, y, c.w, c.h);

  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(x + 9, y + 13, 7, 5);
  ctx.fillRect(x + 28, y + 13, 7, 5);

  ctx.fillStyle = "#1b0000";
  ctx.fillRect(x + 15, y + 29, 14, 4);
}

function drawHunter() {
  if (!activeLevel.hunter) return;

  const h = activeLevel.hunter;
  const x = toScreenX(h.x - h.size / 2);
  const y = toScreenY(h.y - h.size / 2);

  ctx.fillStyle = h.active ? "#080000" : "#030303";
  ctx.fillRect(x, y, h.size, h.size);

  ctx.fillStyle = h.active ? "#ffeded" : "#dcdcdc";
  ctx.fillRect(x + 8, y + 10, 6, 5);
  ctx.fillRect(x + 22, y + 10, 6, 5);

  if (h.active) {
    ctx.fillStyle = "rgba(140,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(x + h.size / 2, y + h.size / 2, 70, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPassenger() {
  if (!activeLevel.passenger || !activeLevel.passenger.active) return;

  const p = activeLevel.passenger;
  const x = toScreenX(p.x);
  const y = toScreenY(p.y);

  ctx.save();

  const pulse = 0.75 + Math.sin(performance.now() * 0.012) * 0.25;

  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#120000";
  ctx.fillRect(x, y, 24, 24);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(x, y, 24, 24);

  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(x + 6, y + 8, 5, 4);
  ctx.fillRect(x + 15, y + 8, 5, 4);

  ctx.fillStyle = "rgba(120,0,0,0.8)";
  ctx.fillRect(x + 8, y + 17, 9, 2);

  ctx.restore();
}

function drawPlayer() {
  const x = toScreenX(player.x);
  const y = toScreenY(player.y);

  ctx.fillStyle = player.color;
  ctx.fillRect(x, y, player.size, player.size);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, player.size, player.size);
}

function drawLights() {
  const darkness = activeLevel.config.darkness;
  const flicker = activeLevel.config.event === "flicker"
    ? Math.sin(performance.now() * 0.018) * 0.12
    : 0;

  ctx.save();

  const isMobile = window.innerWidth <= 768;
  const dangerBoost = dangerPressure * (isMobile ? 0.06 : 0.10);
  const softDarkness = Math.max(
    0.13,
    darkness * (isMobile ? 0.34 : 0.44)
  ) + dangerBoost;

  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  const totalDarkness = clamp(softDarkness + flicker * 0.35, 0, isMobile ? 0.34 : 0.48);
  ctx.fillStyle = `rgba(0,0,0,${totalDarkness})`;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  ctx.restore();

  if (activeLevel.config.event === "fakeDifficulty") {
    drawCornerEyes();
  }
}

function drawCornerEyes() {
  ctx.save();

  const t = performance.now();
  const pulse = 0.28 + Math.sin(t * 0.005) * 0.12;

  const viewWidth = canvas.logicalWidth || canvas.width;
  const x = viewWidth - 130;
  const y = 46;

  ctx.globalAlpha = 0.55 + pulse;
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.beginPath();
  ctx.ellipse(x + 58, y + 62, 54, 70, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(x + 38, y + 48, 9, 5);
  ctx.fillRect(x + 72, y + 46, 9, 5);

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "rgba(120,0,0,0.7)";
  ctx.fillRect(x + 48, y + 82, 26, 3);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(x + 20, y + 18, 2, 90);
  ctx.fillRect(x + 95, y + 24, 2, 80);

  ctx.restore();
}

function drawNoise() {
  const amount = screenNoise > 0 ? 80 : 18;

  const viewWidth = canvas.logicalWidth || canvas.width;
  const viewHeight = canvas.logicalHeight || canvas.height;

  ctx.save();
  ctx.globalAlpha = screenNoise > 0 ? 0.16 : 0.035;
  ctx.fillStyle = "#fff";

  for (let i = 0; i < amount; i++) {
    const x = Math.random() * viewWidth;
    const y = Math.random() * viewHeight;
    const w = Math.random() * 2 + 1;
    const h = Math.random() * 2 + 1;

    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();

  screenNoise *= 0.94;
}

function updateSoundToggleButton() {
  if (!soundToggleBtn) return;

  soundToggleBtn.textContent = soundEnabled ? "SOM: ON" : "SOM: OFF";
  soundToggleBtn.classList.toggle("off", !soundEnabled);
}

function showWarningBeforeStart(levelIndex) {
  pendingStartLevel = levelIndex;
  showScreen(warningScreen);
}

function gameLoop(now) {
  if (!gameRunning) return;

  const dt = Math.min(32, now - lastTime);
  lastTime = now;

  updatePlayer();
  updateObstacles(dt);
  updateHunter(dt);
  updatePassenger(dt);
  updatePsychologicalEvents(now, dt);
  checkTriggers();
  checkExits();
  updateCamera();
  drawLevel();

  animationFrameId = requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

mobileButtons.forEach((button) => {
  const dir = button.dataset.dir;

  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setMobileDirection(dir, true);
  });

  button.addEventListener("touchend", (e) => {
    e.preventDefault();
    setMobileDirection(dir, false);
  });

  button.addEventListener("mousedown", () => {
    setMobileDirection(dir, true);
  });

  button.addEventListener("mouseup", () => {
    setMobileDirection(dir, false);
  });

  button.addEventListener("mouseleave", () => {
    setMobileDirection(dir, false);
  });
});

function setMobileDirection(dir, active) {
  if (dir === "up") keys.ArrowUp = active;
  if (dir === "down") keys.ArrowDown = active;
  if (dir === "left") keys.ArrowLeft = active;
  if (dir === "right") keys.ArrowRight = active;
}

newGameBtn.addEventListener("click", async () => {
  await clearSave();
  showWarningBeforeStart(0);
});

continueBtn.addEventListener("click", async () => {
  const saved = await hasSave();
  if (!saved) return;

  const savedLevel = await loadSave();
  showWarningBeforeStart(savedLevel);
});

resetSaveBtn.addEventListener("click", async () => {
  await clearSave();
  document.getElementById("menuHint").textContent = "save apagado.";
});

saveExitBtn.addEventListener("click", async () => {
  await saveGame();
  gameRunning = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  await updateContinueButton();
  showScreen(menuScreen);
});

backMenuBtn.addEventListener("click", async () => {
  await updateContinueButton();
  showScreen(menuScreen);
});

soundToggleBtn.addEventListener("click", () => {
  audio.init();
  audio.resume();
  audio.toggleMuted();
  updateSoundToggleButton();
});

startAfterWarningBtn.addEventListener("click", () => {
  startGame(pendingStartLevel);
});

backFromWarningBtn.addEventListener("click", async () => {
  await updateContinueButton();
  showScreen(menuScreen);
});

function handleResize() {
  if (!activeLevel) return;

  requestAnimationFrame(() => {
    resizeCanvas();
    updateCamera();
    drawLevel();
  });
}

window.addEventListener("resize", handleResize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleResize);
}

updateContinueButton();
updateSoundToggleButton();
document.title = GAME_NAME;