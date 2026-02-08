// ============ CLASSES & UTILS ============

// ============ NOTIFICATIONS ============
async function sendNotification(responseType) {
    console.log(`Sending notification: ${responseType}`);
    const data = {
        id: proposalId,
        name: CONFIG.name,
        response: responseType,
        timestamp: new Date().toISOString(),
        message: responseType === 'yes' ? `💖 ${CONFIG.name} SAID YES!!!` : `👀 ${CONFIG.name} is looking at the proposal...`
    };

    // 1. Try Webhook (Cross-device support)
    if (notifyUrlParam) {
        try {
            // Discord/Slack compatible payload
            const webhookData = {
                content: data.message,
                embeds: [{
                    title: "Heartstellation Update! ✨",
                    description: `Name: **${data.name}**\nAction: **${responseType.toUpperCase()}**`,
                    color: responseType === 'yes' ? 0xff69b4 : 0xffd700
                }]
            };

            await fetch(notifyUrlParam, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });
            console.log('Notification sent via Webhook');
        } catch (e) {
            console.error('Webhook notification failed:', e);
        }
    }

    // 2. Try fetch to dashboard API (Server)
    try {
        const response = await fetch('/api/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) console.log('Notification sent to Server API');
    } catch (e) {
        console.warn('Server API notification failed (Server might be offline):', e);
    }

    // 3. Local fallback (same browser only)
    localStorage.setItem(`hearstellation_yes_${proposalId}`, JSON.stringify(data));
}

// Convert DataURL to Blob for reliable playback
function dataURLtoBlob(dataurl) {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error('Blob conversion failed:', e);
        return null;
    }
}

// Particle System
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.active = false; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
        this.size = 4; this.color = '#ffffff'; this.life = 1; this.decay = 0.02; this.gravity = 0.05;
    }
    init(x, y, vx, vy, color, size = 4, decay = 0.015, gravity = 0.05) {
        this.active = true; this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.size = size; this.life = 1; this.decay = decay; this.gravity = gravity;
    }
    update() {
        if (!this.active) return;
        this.x += this.vx; this.y += this.vy; this.vy += this.gravity;
        this.vx *= 0.99; this.life -= this.decay;
        if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
        if (!this.active || this.life <= 0) return;
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2); ctx.fill();
    }
}

// Audio Manager
class AudioManager {
    constructor() {
        this.context = null; this.masterGain = null; this.musicGain = null;
        this.musicNodes = []; this.isPlaying = false;
    }
    init() {
        if (this.context) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.masterGain.gain.value = 0.6;
        this.musicGain = this.context.createGain();
        this.musicGain.connect(this.masterGain);
        this.musicGain.gain.value = 0.2;
    }
    startAmbientMusic() {
        if (state.customBGMLoaded && customBGM.src) {
            customBGM.volume = 0.5;
            customBGM.play().catch(() => { });
            this.isPlaying = true;
            return;
        }
        if (!this.context) this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        const createPad = (freq) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();
            osc.type = 'sine'; osc.frequency.value = freq;
            filter.type = 'lowpass'; filter.frequency.value = 600;
            osc.connect(filter); filter.connect(gain);
            gain.connect(this.musicGain); gain.gain.value = 0.08;
            osc.start(); this.musicNodes.push({ osc, gain });
        };
        [130.81, 164.81, 196, 246.94].forEach(f => createPad(f));
    }
    stopAmbientMusic() {
        if (customBGM) customBGM.pause();
        this.musicNodes.forEach(({ osc, gain }) => {
            try {
                gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 1);
                setTimeout(() => osc.stop(), 1000);
            } catch (e) { }
        });
        this.musicNodes = []; this.isPlaying = false;
    }
    setVolume(vol) {
        if (this.musicGain) this.musicGain.gain.value = vol;
        if (customBGM) customBGM.volume = Math.min(1, vol * 1.5);
    }
}

// Instantiate Global Systems
const particlePool = [];
for (let i = 0; i < 100; i++) particlePool.push(new Particle());
function getParticle() {
    for (const p of particlePool) if (!p.active) return p;
    return null;
}
const audio = new AudioManager();

// ============ URL PARAMETERS & CONFIG ============
const urlParams = new URLSearchParams(window.location.search);
const proposalId = urlParams.get('id');
const customName = urlParams.get('name') || 'LOVE'; // Default name if none provided
const musicUrlParam = urlParams.get('music'); // Music URL passed via link
const notifyUrlParam = urlParams.get('notify'); // Webhook URL for cross-device alerts

// Decode Secret Message (Stateless)
let decodedMessage = '';
const msgParam = urlParams.get('msg');
if (msgParam) {
    try {
        decodedMessage = decodeURIComponent(escape(atob(msgParam)));
    } catch (e) {
        console.error('Failed to decode message:', e);
    }
}

const CONFIG = {
    name: customName.toUpperCase(),

    // Performance settings
    backgroundStarCount: 150,
    maxParticles: 60,
    targetFPS: 60,

    // Star settings
    minStarDistance: 100,
    starClickRadius: 45, // INCREASED for easier clicking

    // Colors
    colors: {
        bgNavy: '#0a0e27',
        midnightBlue: '#1a1f4a',
        deepPurple: '#2d1b4e',
        beeGold: '#FFD700',
        honeyGold: '#FFA500',
        rosePink: '#ff69b4',
        lavender: '#e6ccff',
        roseGold: '#B76E79',
        starWhite: '#ffffff',
        heartRed: '#ff1744',
    },

    // Timing (ms)
    timing: {
        introBlackDuration: 1000,
        openingTextDuration: 2500,
        starExplosionDuration: 1500,
        instructionDelay: 500,
        lineDrawDuration: 400,
        transformDuration: 2500,
        proposalWordDelay: 600,
    },
};

// ============ STATE ============
const state = {
    phase: 0,
    phaseStartTime: 0,

    clickedStars: [],
    clickableStars: [],
    backgroundStars: [],
    particles: [],
    constellationLines: [],

    transformProgress: 0,
    heartPulseCount: 0,
    heartScale: 1,

    musicEnabled: true,
    customBGMLoaded: false,
    audioContext: null,

    lastFrameTime: 0,
    frameCount: 0,
};

// ============ DOM ELEMENTS ============
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const openingText = document.getElementById('openingText');
const instructionText = document.getElementById('instructionText');
const clickHint = document.getElementById('clickHint');
const nameDisplay = document.getElementById('nameDisplay');
const heartIcon = document.getElementById('heartIcon');
const progressIndicator = document.getElementById('progressIndicator');
const proposalSection = document.getElementById('proposalSection');
const bigHeart = document.getElementById('bigHeart');
const willYouText = document.getElementById('willYouText');
const proposalLine1 = document.getElementById('proposalLine1');
const proposalLine2 = document.getElementById('proposalLine2');
const proposalLine3 = document.getElementById('proposalLine3');
const celebrationText = document.getElementById('celebrationText');
const actionButtons = document.getElementById('actionButtons');
const yesButton = document.getElementById('yesButton');
const noButton = document.getElementById('noButton');
const watchAgainWrapper = document.getElementById('watchAgainWrapper');
const restartButton = document.getElementById('restartButton');
const screenFlash = document.getElementById('screenFlash');
const customBGM = document.getElementById('customBGM');
const loadingOverlay = document.getElementById('loadingOverlay');
const letterOverlay = document.getElementById('letterOverlay');

// Notebook Elements
const notebookContainer = document.getElementById('notebookContainer');
const messageBody = document.getElementById('messageBody');
const notebookContinue = document.getElementById('notebookContinue');

// Auto-start BGM on first user interaction
let bgmStarted = false;
function tryStartBGM() {
    if (bgmStarted) return;
    bgmStarted = true;

    // Safety check for audio object
    if (audio.context && audio.context.state === 'suspended') {
        audio.context.resume();
    }

    if (state.customBGMLoaded && customBGM.src) {
        customBGM.volume = 0.6;
        console.log('Attempting to play custom BGM...');
        customBGM.play()
            .then(() => console.log('BGM Playback started successfully'))
            .catch((err) => {
                console.warn('BGM Auto-play blocked or failed:', err);
                bgmStarted = false; // Allow retry on next click
            });
    } else {
        // Fallback to ambient if no custom BGM
        audio.startAmbientMusic();
    }
}

// Global click listener for BGM (backup)
window.addEventListener('mousedown', tryStartBGM);
window.addEventListener('keydown', tryStartBGM);
window.addEventListener('touchstart', tryStartBGM);


// Load custom BGM from localStorage (saved by dashboard)
function loadCustomBGM() {
    // 1. Check music URL parameter (highest priority for sharing)
    if (musicUrlParam) {
        console.log('Found Music URL in parameters:', musicUrlParam);
        customBGM.src = decodeURIComponent(musicUrlParam);
        customBGM.load();
        state.customBGMLoaded = true;
        return true;
    }

    // 2. Check localStorage (creator preview/local use)
    if (!proposalId) return false;

    try {
        const bgmData = localStorage.getItem(`hearstellation_bgm_${proposalId}`);
        if (bgmData) {
            console.log(`Found BGM in storage (${Math.round(bgmData.length / 1024)} KB). Converting...`);

            const blob = dataURLtoBlob(bgmData);
            if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                customBGM.src = blobUrl;
                customBGM.load();
                state.customBGMLoaded = true;
                console.log('BGM converted to Blob URL successfully.');
                return true;
            }
        }
    } catch (e) {
        console.error('Error retrieving BGM from localStorage:', e);
    }
    return false;
}


function createExplosion(x, y, count = 20, colors = null, speed = 4, gravity = 0.08) {
    const defaultColors = [CONFIG.colors.rosePink, CONFIG.colors.beeGold, CONFIG.colors.starWhite, CONFIG.colors.lavender];
    colors = colors || defaultColors;

    for (let i = 0; i < count; i++) {
        const particle = getParticle();
        if (!particle) break;

        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
        const vel = speed * (0.5 + Math.random() * 0.5);
        particle.init(
            x, y,
            Math.cos(angle) * vel,
            Math.sin(angle) * vel,
            colors[Math.floor(Math.random() * colors.length)],
            2 + Math.random() * 4,
            0.012 + Math.random() * 0.01,
            gravity
        );
    }
}

function createHeartBurst(x, y, count = 15) {
    const colors = [CONFIG.colors.heartRed, CONFIG.colors.rosePink, CONFIG.colors.beeGold];
    for (let i = 0; i < count; i++) {
        const particle = getParticle();
        if (!particle) break;

        const angle = (Math.PI * 2 / count) * i;
        particle.init(
            x, y,
            Math.cos(angle) * 3,
            Math.sin(angle) * 3,
            colors[i % 3],
            3,
            0.015,
            0
        );
    }
}

function createFallingStars() {
    if (state.phase < 6) return;

    const particle = getParticle();
    if (!particle) return;

    const colors = [CONFIG.colors.starWhite, CONFIG.colors.rosePink, CONFIG.colors.beeGold];
    particle.init(
        Math.random() * window.innerWidth,
        -10,
        (Math.random() - 0.5) * 2,
        1 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)],
        2 + Math.random() * 3,
        0.004,
        0.02
    );
}

// ============ STAR CLASSES ============
class BackgroundStar {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.baseOpacity = 0.15 + Math.random() * 0.4;
        this.opacity = this.baseOpacity;
        this.twinkleSpeed = 0.015 + Math.random() * 0.025;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.syncPulse = false;
    }

    update(time) {
        if (this.syncPulse) {
            this.opacity = 0.5 + Math.sin(time * 0.01) * 0.5;
        } else {
            this.opacity = this.baseOpacity + Math.sin(time * this.twinkleSpeed + this.twinklePhase) * 0.25;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
        ctx.fillStyle = CONFIG.colors.starWhite;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ClickableStar {
    constructor(x, y, letter, index) {
        this.x = x;
        this.y = y;
        this.letter = letter;
        this.index = index;
        this.baseRadius = 14; // BIGGER for easier clicking
        this.radius = this.baseRadius;
        this.hovered = false;
        this.clicked = false;
        this.opacity = 0;
        this.glowRadius = 35; // BIGGER glow
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseIntensity = 0;
    }

    update(time) {
        if (this.opacity < 1) {
            this.opacity = Math.min(1, this.opacity + 0.03);
        }

        // More visible pulsing
        const pulse = Math.sin(time * 0.004 + this.pulsePhase) * 0.2;
        this.pulseIntensity = 0.5 + Math.sin(time * 0.006) * 0.5;

        if (this.clicked) {
            this.radius = this.baseRadius * 1.4;
            this.glowRadius = 70 + Math.sin(time * 0.005) * 15;
        } else if (this.hovered) {
            this.radius = this.baseRadius * 1.6;
            this.glowRadius = 55;
        } else {
            this.radius = this.baseRadius * (1 + pulse);
            this.glowRadius = 35 + pulse * 15;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.glowRadius
        );

        if (this.clicked) {
            gradient.addColorStop(0, 'rgba(255, 105, 180, 0.95)');
            gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
        } else if (this.hovered) {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.7)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        } else {
            // MORE visible unclicked stars
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 + this.pulseIntensity * 0.1})`);
            gradient.addColorStop(0.4, `rgba(255, 215, 0, ${0.4 + this.pulseIntensity * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Star core - BIGGER
        ctx.fillStyle = this.clicked ? CONFIG.colors.rosePink : CONFIG.colors.starWhite;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.sqrt(dx * dx + dy * dy) < CONFIG.starClickRadius;
    }
}

// ============ CONSTELLATION LINE ============
class ConstellationLine {
    constructor(fromStar, toStar) {
        this.fromStar = fromStar;
        this.toStar = toStar;
        this.progress = 0;
        this.glowIntensity = 0.7;
    }

    update() {
        if (this.progress < 1) {
            this.progress = Math.min(1, this.progress + 0.04);
        }
    }

    draw(ctx) {
        if (this.progress <= 0) return;

        const fromX = this.fromStar.x;
        const fromY = this.fromStar.y;
        const toX = fromX + (this.toStar.x - fromX) * this.progress;
        const toY = fromY + (this.toStar.y - fromY) * this.progress;

        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2 - 30;

        ctx.save();

        ctx.strokeStyle = CONFIG.colors.rosePink;
        ctx.shadowColor = CONFIG.colors.rosePink;
        ctx.shadowBlur = 25;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.glowIntensity * 0.6;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.quadraticCurveTo(midX, midY, toX, toY);
        ctx.stroke();

        ctx.strokeStyle = CONFIG.colors.beeGold;
        ctx.shadowColor = CONFIG.colors.beeGold;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.glowIntensity;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.quadraticCurveTo(midX, midY, toX, toY);
        ctx.stroke();

        ctx.restore();
    }
}

// ============ HEART DRAWING ============
function drawHeart(ctx, centerX, centerY, size, alpha = 1, pulse = 0) {
    const scale = 1 + pulse * 0.12;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    ctx.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        if (t === 0) {
            ctx.moveTo(x * size, y * size);
        } else {
            ctx.lineTo(x * size, y * size);
        }
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 20);
    gradient.addColorStop(0, CONFIG.colors.rosePink);
    gradient.addColorStop(0.5, CONFIG.colors.roseGold);
    gradient.addColorStop(1, CONFIG.colors.heartRed);

    ctx.fillStyle = gradient;
    ctx.shadowColor = CONFIG.colors.rosePink;
    ctx.shadowBlur = 50 + pulse * 30;
    ctx.fill();

    ctx.strokeStyle = CONFIG.colors.beeGold;
    ctx.lineWidth = 3;
    ctx.shadowColor = CONFIG.colors.beeGold;
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.restore();
}

// ============ CANVAS SETUP ============
function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}

function drawBackground() {
    const gradient = ctx.createRadialGradient(
        window.innerWidth / 2, window.innerHeight / 2, 0,
        window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight) * 0.8
    );
    gradient.addColorStop(0, CONFIG.colors.midnightBlue);
    gradient.addColorStop(0.5, CONFIG.colors.deepPurple);
    gradient.addColorStop(1, CONFIG.colors.bgNavy);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (state.phase >= 3) {
        drawNebula();
    }
}

function drawNebula() {
    const time = Date.now() * 0.00008;
    ctx.save();

    ctx.globalAlpha = 0.12;
    const grad1 = ctx.createRadialGradient(
        window.innerWidth * 0.25 + Math.sin(time) * 40,
        window.innerHeight * 0.35,
        0,
        window.innerWidth * 0.25,
        window.innerHeight * 0.35,
        250
    );
    grad1.addColorStop(0, '#6b4c99');
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const grad2 = ctx.createRadialGradient(
        window.innerWidth * 0.75 + Math.cos(time * 0.8) * 35,
        window.innerHeight * 0.65,
        0,
        window.innerWidth * 0.75,
        window.innerHeight * 0.65,
        200
    );
    grad2.addColorStop(0, 'rgba(255, 105, 180, 0.25)');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const grad3 = ctx.createRadialGradient(
        window.innerWidth * 0.5 + Math.sin(time * 1.2) * 30,
        window.innerHeight * 0.3,
        0,
        window.innerWidth * 0.5,
        window.innerHeight * 0.3,
        180
    );
    grad3.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    grad3.addColorStop(1, 'transparent');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.restore();
}

// ============ INITIALIZATION ============
function initBackgroundStars() {
    state.backgroundStars = [];
    for (let i = 0; i < CONFIG.backgroundStarCount; i++) {
        state.backgroundStars.push(new BackgroundStar(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight,
            0.5 + Math.random() * 1.5
        ));
    }
}

function initClickableStars() {
    state.clickableStars = [];
    state.clickedStars = [];
    state.constellationLines = [];

    const letters = CONFIG.name.split('');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Adjust spread for mobile responsiveness
    const isMobile = window.innerWidth < 768;
    const spread = Math.min(window.innerWidth, window.innerHeight) * (isMobile ? 0.35 : 0.25);

    // Dynamic positioning based on name length
    const positions = [];
    const nameLength = letters.length;

    if (nameLength <= 3) {
        // Triangle formation
        positions.push({ x: centerX, y: centerY - spread * 0.5 });
        positions.push({ x: centerX - spread * 0.4, y: centerY + spread * 0.3 });
        positions.push({ x: centerX + spread * 0.4, y: centerY + spread * 0.3 });
    } else if (nameLength <= 5) {
        // Pentagon-ish formation
        const angleOffset = -Math.PI / 2;
        for (let i = 0; i < nameLength; i++) {
            const angle = angleOffset + (Math.PI * 2 / nameLength) * i;
            positions.push({
                x: centerX + Math.cos(angle) * spread * 0.5,
                y: centerY + Math.sin(angle) * spread * 0.5
            });
        }
    } else {
        // Circle formation for longer names
        for (let i = 0; i < nameLength; i++) {
            const angle = -Math.PI / 2 + (Math.PI * 2 / nameLength) * i;
            positions.push({
                x: centerX + Math.cos(angle) * spread * 0.6,
                y: centerY + Math.sin(angle) * spread * 0.6
            });
        }
    }

    // Add some randomness
    positions.forEach(pos => {
        pos.x += (Math.random() - 0.5) * 40;
        pos.y += (Math.random() - 0.5) * 40;
    });

    for (let i = 0; i < letters.length; i++) {
        if (positions[i]) {
            state.clickableStars.push(new ClickableStar(
                positions[i].x,
                positions[i].y,
                letters[i],
                i
            ));
        }
    }

    updateProgressIndicator();
}

function updateProgressIndicator() {
    progressIndicator.innerHTML = '';
    for (let i = 0; i < state.clickableStars.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        if (state.clickedStars.length > i) {
            dot.classList.add('filled');
        }
        progressIndicator.appendChild(dot);
    }
}

// ============ PHASE MANAGEMENT ============
function setPhase(phase) {
    state.phase = phase;
    state.phaseStartTime = Date.now();

    switch (phase) {
        case 0:
            break;

        case 1:
            openingText.classList.remove('hidden');
            setTimeout(() => openingText.classList.add('visible'), 100);
            break;

        case 2:
            openingText.classList.remove('visible');
            setTimeout(() => openingText.classList.add('hidden'), 500);

            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    createExplosion(cx, cy, 30, null, 6 + i * 2, 0.02);
                }, i * 100);
            }

            screenFlash.classList.add('flash');
            setTimeout(() => screenFlash.classList.remove('flash'), 300);
            break;

        case 3:
            instructionText.classList.remove('hidden');
            setTimeout(() => instructionText.classList.add('visible'), 300);

            // Show click hint
            clickHint.classList.remove('hidden');
            setTimeout(() => clickHint.classList.add('visible'), 800);

            if (state.musicEnabled) {
                audio.startAmbientMusic();
            }
            break;

        case 4:
            // Hide hint once clicking starts
            clickHint.classList.remove('visible');
            setTimeout(() => clickHint.classList.add('hidden'), 500);
            break;

        case 5:
            instructionText.classList.remove('visible');
            setTimeout(() => instructionText.classList.add('hidden'), 500);
            startTransformation();
            break;

        case 6:
            showProposal();
            break;

        case 7:
            startCelebration();
            break;
    }
}

// ============ TRANSFORMATION ============
function startTransformation() {
    // Start transformation effects

    state.constellationLines.forEach(line => {
        line.glowIntensity = 1;
    });

    state.clickedStars.forEach(star => {
        createExplosion(star.x, star.y, 25);
    });

    screenFlash.classList.add('flash');
    setTimeout(() => screenFlash.classList.remove('flash'), 300);

    state.transformProgress = 0;

    setTimeout(() => {
        state.heartPulseCount = 0;
    }, CONFIG.timing.transformDuration * 0.7);

    setTimeout(() => {
        setPhase(6);
    }, CONFIG.timing.transformDuration + 1500);
}

// ============ PROPOSAL ============
function showProposal() {
    nameDisplay.style.transition = 'opacity 0.8s ease';
    nameDisplay.style.opacity = '0';
    heartIcon.classList.remove('visible');
    progressIndicator.style.opacity = '0';

    setTimeout(() => {
        nameDisplay.classList.add('hidden');
        progressIndicator.classList.add('hidden');

        proposalSection.classList.remove('hidden');
        proposalSection.classList.add('visible');

        // Big heart animation (replaces ring)
        setTimeout(() => {
            bigHeart.classList.add('animate');
            createHeartBurst(window.innerWidth / 2, window.innerHeight / 2 - 100);
        }, 200);

        setTimeout(() => {
            willYouText.classList.add('animate');
        }, 800);

        setTimeout(() => {
            proposalLine1.classList.add('animate');
            screenFlash.classList.add('flash');
            setTimeout(() => screenFlash.classList.remove('flash'), 150);
        }, 1400);

        setTimeout(() => {
            proposalLine2.classList.add('animate');
        }, 2000);

        setTimeout(() => {
            proposalLine3.classList.add('animate');

            screenFlash.classList.add('flash');
            setTimeout(() => screenFlash.classList.remove('flash'), 200);
        }, 2600);

        setTimeout(() => {
            actionButtons.classList.remove('hidden');
            actionButtons.classList.add('visible');
        }, 3800);

    }, 800);

    state.fallingStarsInterval = setInterval(createFallingStars, 120);

    state.heartSparkleInterval = setInterval(() => {
        if (state.phase >= 6 && state.phase < 7) {
            createHeartBurst(window.innerWidth / 2, window.innerHeight / 2 - 100, 10);
        }
    }, 2500);
}

// ============ CELEBRATION + YES NOTIFICATION ============
function startCelebration() {
    if (state.musicEnabled) {
        audio.setVolume(0.4);
    }

    // Send YES response to dashboard
    if (proposalId) {
        localStorage.setItem(`hearstellation_yes_${proposalId}`, 'true');
    }

    proposalSection.classList.remove('visible');
    actionButtons.classList.remove('visible');

    setTimeout(() => {
        proposalSection.classList.add('hidden');
        actionButtons.classList.add('hidden');

        celebrationText.classList.remove('hidden');
        celebrationText.classList.add('visible');

        // Show only Watch Again button after celebration
        setTimeout(() => {
            watchAgainWrapper.classList.remove('hidden');
            watchAgainWrapper.classList.add('visible');
        }, 2000);
    }, 500);

    screenFlash.classList.add('flash');
    setTimeout(() => screenFlash.classList.remove('flash'), 200);

    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight * 0.6;
            createExplosion(x, y, 35, null, 5, 0.1);
        }, i * 150);
    }

    state.backgroundStars.forEach(star => {
        star.syncPulse = true;
    });

    state.celebrationInterval = setInterval(() => {
        if (state.phase === 7) {
            createExplosion(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight * 0.5,
                15
            );
        }
    }, 400);
}

// ============ UI UPDATES ============
function addLetterToDisplay(letter) {
    const letterEl = document.createElement('span');
    letterEl.className = 'letter';
    letterEl.textContent = letter;
    nameDisplay.appendChild(letterEl);
}

// ============ EVENT HANDLERS ============
function handleClick(e) {
    if (state.phase < 3 || state.phase > 4) return;

    if (state.phase === 3) {
        state.phase = 4;
        clickHint.classList.remove('visible');
        setTimeout(() => clickHint.classList.add('hidden'), 500);
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the CLOSEST unclicked star (not just first matching)
    let closestStar = null;
    let closestDistance = Infinity;

    for (const star of state.clickableStars) {
        if (!star.clicked) {
            const dx = x - star.x;
            const dy = y - star.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.starClickRadius && dist < closestDistance) {
                closestStar = star;
                closestDistance = dist;
            }
        }
    }

    if (closestStar) {
        clickStar(closestStar);
    }
}

function handleMouseMove(e) {
    if (state.phase < 3 || state.phase > 4) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hovering = false;

    for (const star of state.clickableStars) {
        if (!star.clicked && star.containsPoint(x, y)) {
            star.hovered = true;
            hovering = true;
        } else {
            star.hovered = false;
        }
    }

    canvas.style.cursor = hovering ? 'pointer' : 'default';
}

function clickStar(star) {
    star.clicked = true;
    state.clickedStars.push(star);

    createExplosion(star.x, star.y, 25);

    // Draw line to previous star
    if (state.clickedStars.length > 1) {
        const prevStar = state.clickedStars[state.clickedStars.length - 2];
        state.constellationLines.push(new ConstellationLine(prevStar, star));
    }

    // Close the shape when complete
    if (state.clickedStars.length === state.clickableStars.length && state.clickedStars.length > 2) {
        const firstStar = state.clickedStars[0];
        state.constellationLines.push(new ConstellationLine(star, firstStar));
    }

    addLetterToDisplay(star.letter);
    updateProgressIndicator();

    if (state.clickedStars.length === state.clickableStars.length) {
        setTimeout(() => {
            heartIcon.classList.remove('hidden');
            heartIcon.classList.add('visible');
        }, 400);

        state.backgroundStars.forEach(star => {
            star.syncPulse = true;
        });

        setTimeout(() => {
            state.backgroundStars.forEach(star => {
                star.syncPulse = false;
            });
        }, 1000);

        setTimeout(() => setPhase(5), 1500);
    }
}

function restart() {
    clearInterval(state.fallingStarsInterval);
    clearInterval(state.heartSparkleInterval);
    clearInterval(state.celebrationInterval);

    state.phase = 0;
    state.transformProgress = 0;
    state.heartPulseCount = 0;
    state.heartScale = 1;

    particlePool.forEach(p => p.reset());

    nameDisplay.innerHTML = '';
    nameDisplay.classList.remove('hidden');
    nameDisplay.style.opacity = '1';

    heartIcon.classList.add('hidden');
    heartIcon.classList.remove('visible');

    openingText.classList.add('hidden');
    openingText.classList.remove('visible');
    instructionText.classList.add('hidden');
    instructionText.classList.remove('visible');
    clickHint.classList.add('hidden');
    clickHint.classList.remove('visible');

    proposalSection.classList.add('hidden');
    proposalSection.classList.remove('visible');
    bigHeart.classList.remove('animate');
    willYouText.classList.remove('animate');
    proposalLine1.classList.remove('animate');
    proposalLine2.classList.remove('animate');
    proposalLine3.classList.remove('animate');

    celebrationText.classList.add('hidden');
    celebrationText.classList.remove('visible');

    actionButtons.classList.add('hidden');
    actionButtons.classList.remove('visible');

    watchAgainWrapper.classList.add('hidden');
    watchAgainWrapper.classList.remove('visible');

    progressIndicator.classList.remove('hidden');
    progressIndicator.style.opacity = '1';

    state.backgroundStars.forEach(star => {
        star.syncPulse = false;
    });

    initClickableStars();

    setTimeout(() => setPhase(0), 100);
    setTimeout(() => setPhase(1), 500);
    setTimeout(() => setPhase(2), 3000);
    setTimeout(() => setPhase(3), 4500);
}

// ============ MAIN RENDER LOOP ============
function animate(timestamp) {
    const time = timestamp || Date.now();

    ctx.globalAlpha = 1;
    drawBackground();

    state.backgroundStars.forEach(star => {
        star.update(time);
        star.draw(ctx);
    });

    state.constellationLines.forEach(line => {
        line.update();
        line.draw(ctx);
    });

    if (state.phase >= 3 && state.phase <= 4) {
        state.clickableStars.forEach(star => {
            star.update(time);
            star.draw(ctx);
        });
    }

    if (state.phase === 5) {
        state.clickedStars.forEach(star => {
            star.update(time);
            star.draw(ctx);
        });

        if (state.transformProgress < 1) {
            state.transformProgress += 0.015;
        }

        const heartCenterX = window.innerWidth / 2;
        const heartCenterY = window.innerHeight / 2;

        const elapsed = Date.now() - state.phaseStartTime;
        if (elapsed > CONFIG.timing.transformDuration * 0.7) {
            state.heartScale = 1 + Math.sin(elapsed * 0.008) * 0.15;
        }

        if (state.transformProgress > 0.3) {
            drawHeart(ctx, heartCenterX, heartCenterY, 8, state.transformProgress, state.heartScale - 1);
        }
    }

    if (state.phase === 6 || state.phase === 7) {
        const heartY = window.innerHeight * 0.25;
        const pulse = Math.sin(time * 0.003) * 0.08;
        drawHeart(ctx, window.innerWidth / 2, heartY, 5, 0.4, pulse);
    }

    ctx.globalAlpha = 1;
    particlePool.forEach(p => {
        if (p.active) {
            p.update();
            p.draw(ctx);
        }
    });

    requestAnimationFrame(animate);
}

// ============ SETUP ============
function init() {
    try {
        console.log('Heartstellation Initializing...');

        if (!canvas || !ctx) {
            throw new Error('Canvas context not available');
        }

        resizeCanvas();
        initBackgroundStars();

        // Load custom BGM from localStorage
        loadCustomBGM();

        initClickableStars();

        window.addEventListener('resize', () => {
            resizeCanvas();
            initBackgroundStars();
        });

        // Start BGM on first canvas click
        canvas.addEventListener('click', (e) => {
            tryStartBGM();
            handleClick(e);
        });

        canvas.addEventListener('mousemove', handleMouseMove);

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            tryStartBGM();
            const touch = e.touches[0];
            handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: true });

        // YES button - triggers celebration
        if (yesButton) {
            yesButton.addEventListener('click', () => {
                if (state.phase === 6) {
                    setPhase(7);
                    sendNotification('yes'); // Send notification on YES
                }
            });
        }

        // NO button - just shakes and moves away
        if (noButton) {
            noButton.addEventListener('click', (e) => {
                sendNotification('no_attempt'); // Log the attempt!
                // Move the button to a random position
                const btn = e.currentTarget;
                const maxX = window.innerWidth - btn.offsetWidth - 50;
                const maxY = window.innerHeight - btn.offsetHeight - 50;
                btn.style.position = 'fixed';
                btn.style.left = (Math.random() * maxX) + 'px';
                btn.style.top = (Math.random() * maxY) + 'px';
                btn.style.transform = 'scale(0.8)';
            });
        }

        if (restartButton) {
            restartButton.addEventListener('click', restart);
        }

        // Start sequence logic handled by overlay click
        if (letterOverlay) {
            letterOverlay.addEventListener('click', () => {
                letterOverlay.classList.add('hidden');
                tryStartBGM();

                // Show Notebook if message exists, otherwise skip to stars
                if (decodedMessage) {
                    if (messageBody) messageBody.innerText = decodedMessage;
                    setTimeout(() => {
                        notebookContainer.style.display = 'flex';
                        setTimeout(() => notebookContainer.classList.add('visible'), 50);
                    }, 500);
                } else {
                    // Skip to phase 1 (stars)
                    setTimeout(() => setPhase(1), 500);
                    setTimeout(() => setPhase(2), 3500);
                    setTimeout(() => setPhase(3), 5000);
                }

                // Track interaction via webhook even if they don't say YES yet
                sendNotification('look');
            });
        }

        // Notebook Continue Logic
        if (notebookContinue) {
            notebookContinue.addEventListener('click', () => {
                notebookContainer.classList.remove('visible');
                setTimeout(() => {
                    notebookContainer.style.display = 'none';
                    // Start star sequence
                    setTimeout(() => setPhase(1), 500);
                    setTimeout(() => setPhase(2), 3500);
                    setTimeout(() => setPhase(3), 5000);
                }, 500);
            });
        }

        if (!letterOverlay && !decodedMessage) {
            // Fallback if overlay missing
            setTimeout(() => setPhase(0), 100);
            setTimeout(() => setPhase(1), 600);
            setTimeout(() => setPhase(2), 3500);
            setTimeout(() => setPhase(3), 5000);
        }

        // Hide loading screen
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }

        animate(0);
        console.log('Heartstellation Initialized successfully');
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('Magical error occurred: ' + error.message + '\n\nPlease check the console for details.');
    }
}

// Final check: if DOM is already loaded, run init immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
