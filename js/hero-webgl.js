// ========================================
// INNER HARMONY — Cinematic WebGL hero centerpiece
// A procedural flying adult butterfly that flutters to the corner diagonally
// opposite the currently-active question card, flies to a new corner each time
// the question moves, and sweeps its iridescent wing color as you scroll —
// over a slow warm liquid-silk background shader with soft light-mote particles.
//
// Desktop + WebGL-capable + no-reduced-motion only. On mobile, reduced-motion, or
// if WebGL is unavailable, this script does nothing and the existing 2D canvas /
// CSS orbs / mandala backdrop (js/main.js, css/style.css) remain exactly as before.
// ========================================

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmallScreen = window.innerWidth <= 768;

function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

function splitBrandNameIntoChars() {
    const el = document.querySelector('.hero-brand-name .brand-inner');
    if (!el) return;
    const text = el.textContent;
    let delayIndex = 0;
    // Group each word's letters in a nowrap wrapper so the line can only
    // break between words, never mid-word (plain inline-block chars have no
    // "keep word together" rule, so without this a long word like HARMONY
    // can split across lines).
    const html = text
        .split(' ')
        .map((word) => {
            const chars = [...word]
                .map((ch) => {
                    const span = `<span class="char" style="transition-delay:${(delayIndex * 0.035).toFixed(3)}s">${ch}</span>`;
                    delayIndex++;
                    return span;
                })
                .join('');
            return `<span class="word-group">${chars}</span>`;
        })
        .join(' ');
    el.innerHTML = html;
}

function createSparkTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255, 250, 240, 1)');
    gradient.addColorStop(0.25, 'rgba(255, 244, 224, 0.85)');
    gradient.addColorStop(0.6, 'rgba(255, 234, 210, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 234, 210, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
}

function createSparks(THREE, scene, count, sparkData) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 3.2;
        const y = (Math.random() - 0.5) * 2.6 - 0.3;
        const z = (Math.random() - 0.5) * 3.2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        if (Math.random() < 0.65) {
            // warm gold mote
            colors[i * 3] = 0.98;
            colors[i * 3 + 1] = 0.78 + Math.random() * 0.12;
            colors[i * 3 + 2] = 0.5 + Math.random() * 0.15;
        } else {
            // soft blush-rose mote
            colors[i * 3] = 0.95;
            colors[i * 3 + 1] = 0.75 + Math.random() * 0.1;
            colors[i * 3 + 2] = 0.72 + Math.random() * 0.1;
        }

        sparkData.push({
            speedX: (Math.random() - 0.5) * 0.18,
            speedY: 0.07 + Math.random() * 0.14,
            speedZ: (Math.random() - 0.5) * 0.18,
            swaySpeed: 0.4 + Math.random() * 1.2,
            swayRadius: 0.03 + Math.random() * 0.09,
            phase: Math.random() * Math.PI * 2,
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.016,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createSparkTexture(THREE),
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    return points;
}

function updateSparks(sparkParticles, sparkData, count, deltaTime, elapsedTime, scrollVelocity) {
    const positions = sparkParticles.geometry.attributes.position.array;
    const speedMultiplier = 1.0 + scrollVelocity * 12.0;
    const turbulence = scrollVelocity;

    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const data = sparkData[i];
        positions[idx] += data.speedX * deltaTime * speedMultiplier;
        positions[idx + 1] += data.speedY * deltaTime * speedMultiplier;
        positions[idx + 2] += data.speedZ * deltaTime * speedMultiplier;

        const currentSway = data.swayRadius * (1.0 + turbulence * 4.0);
        positions[idx] += Math.sin(elapsedTime * data.swaySpeed + data.phase) * currentSway * deltaTime;
        positions[idx + 2] += Math.cos(elapsedTime * data.swaySpeed + data.phase) * currentSway * deltaTime;

        if (positions[idx + 1] > 1.6 || Math.abs(positions[idx]) > 1.8 || Math.abs(positions[idx + 2]) > 1.8) {
            positions[idx + 1] = -1.3;
            positions[idx] = (Math.random() - 0.5) * 1.6;
            positions[idx + 2] = (Math.random() - 0.5) * 1.6;
        }
    }
    sparkParticles.geometry.attributes.position.needsUpdate = true;
}

// ========================================
// GLITTER — a very light dusting of warm sparkles that drifts down from the
// butterfly's wings while it roams the centre of the stage.
// ========================================

function createGlitter(THREE, parent, maxCount) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    for (let i = 0; i < maxCount; i++) {
        positions[i * 3] = 9999; // park unused particles far offscreen
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.028,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createSparkTexture(THREE),
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // parked particles sit at 9999; keep it drawing
    parent.add(points);

    const data = [];
    for (let i = 0; i < maxCount; i++) {
        data.push({ life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, tw: Math.random() * 6.283 });
    }
    return { points, data, maxCount, cursor: 0 };
}

function spawnGlitter(g, x, y, z) {
    const i = g.cursor % g.maxCount;
    g.cursor++;
    const d = g.data[i];
    d.life = 1.0;
    d.maxLife = 1.6 + Math.random() * 1.3;
    d.vx = (Math.random() - 0.5) * 0.06;
    d.vy = -0.15 - Math.random() * 0.12; // gentle fall
    d.vz = (Math.random() - 0.5) * 0.03;
    const pos = g.points.geometry.attributes.position;
    pos.setXYZ(
        i,
        x + (Math.random() - 0.5) * 0.5, // scatter across the wing span
        y + (Math.random() - 0.5) * 0.2,
        z + (Math.random() - 0.5) * 0.05
    );
}

function updateGlitter(g, deltaTime, time) {
    const pos = g.points.geometry.attributes.position;
    const col = g.points.geometry.attributes.color;
    for (let i = 0; i < g.maxCount; i++) {
        const d = g.data[i];
        if (d.life <= 0) {
            col.setXYZ(i, 0, 0, 0);
            continue;
        }
        d.life -= deltaTime / d.maxLife;
        d.vy -= 0.08 * deltaTime; // slight gravity
        pos.setXYZ(
            i,
            pos.getX(i) + d.vx * deltaTime,
            pos.getY(i) + d.vy * deltaTime,
            pos.getZ(i) + d.vz * deltaTime
        );
        const life = Math.max(0, d.life);
        const twinkle = 0.55 + 0.45 * Math.sin(time * 14 + d.tw);
        const b = life * twinkle;
        col.setXYZ(i, 1.0 * b, 0.9 * b, 0.66 * b); // warm cream-gold sparkle
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
}

// ========================================
// BUTTERFLY
// ========================================

// Tuning knobs for the loaded GLB butterfly — easy to nudge without touching the
// flight logic below.
const MODEL_URL = 'butterfly.glb';
const MODEL_TARGET_SIZE = 0.85;  // largest dimension in world units after scaling
const MODEL_FACE_YAW = 0;        // spin the model about Y so its front faces the camera
const MODEL_BASE_PITCH = -0.12;  // resting forward tilt for a gentle 3/4 top view
const FLAP_CLIP_NAME = 'metarig|3'; // full-skeleton wing-flap / fly cycle (traveling)
const CALM_CLIP_NAME = 'metarig|2'; // gentler, minimal motion (settled beside a section)
const EXIT_SECTION_ID = 'services-detail'; // "Our Programmes" — butterfly flies off here,
                                           // then re-enters for the next section.

// Load the rigged Sketchfab butterfly (butterfly.glb) and drive it with its own
// baked skeletal flap animation. Returns the outer `group` (the flight logic in
// animate() positions/rotates this), plus a mixer to advance each frame.
async function loadButterfly(THREE) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const model = gltf.scene;

    model.traverse((obj) => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = false;
            obj.frustumCulled = false; // skinned bounds can be wrong mid-flap
        }
    });

    // Normalize: recenter on the model's bounding box and scale its largest
    // dimension to MODEL_TARGET_SIZE so the raw Sketchfab units don't matter.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.position.sub(center);

    // Inner group carries the fixed normalization (scale + facing offset); the
    // outer group is left free for the flight path / banking / pitch in animate().
    const inner = new THREE.Group();
    inner.add(model);
    inner.scale.setScalar(MODEL_TARGET_SIZE / maxDim);
    inner.rotation.y = MODEL_FACE_YAW;

    const group = new THREE.Group();
    group.add(inner);

    // Speed-adaptive animation: two clips play at once and we crossfade between
    // them by weight each frame — the full flap while traveling, the calm clip
    // when settled beside a section. animate() drives the weights via setTravel().
    const clips = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const flapClip = clips.find((c) => c.name === FLAP_CLIP_NAME) || clips[0];
    const calmClip = clips.find((c) => c.name === CALM_CLIP_NAME) || flapClip;

    const flapAction = mixer.clipAction(flapClip);
    const calmAction = mixer.clipAction(calmClip);
    [flapAction, calmAction].forEach((a) => {
        a.setLoop(THREE.LoopRepeat, Infinity);
        a.play();
    });
    flapAction.setEffectiveWeight(1);
    calmAction.setEffectiveWeight(0);

    // travel in [0..1]: 0 = settled (calm clip), 1 = flying hard (fast flap).
    function setTravel(travel) {
        const w = Math.min(1, Math.max(0, travel));
        flapAction.setEffectiveWeight(0.2 + w * 0.8);
        calmAction.setEffectiveWeight(1 - w);
        flapAction.setEffectiveTimeScale(0.85 + w * 1.5);
    }

    return { group, mixer, setTravel };
}

function createBackgroundShader(THREE, camera, uniforms) {
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    // Liquid-silk background: identical wave/noise math to the reference "liquid
    // bronze" shader, repalette'd from black/bronze/sapphire to Inner Harmony's
    // cream/gold (top) -> dusty rose/mauve (bottom) palette.
    const fragmentShader = `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;

        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(in vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + 113.0*p.z;
            return mix(mix(mix(hash(n+  0.0), hash(n+  1.0), f.x),
                           mix(hash(n+ 57.0), hash(n+ 58.0), f.x), f.y),
                       mix(mix(hash(n+113.0), hash(n+114.0), f.x),
                           mix(hash(n+170.0), hash(n+171.0), f.x), f.y), f.z);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
            float aspect = uResolution.x / uResolution.y;

            float time = uTime * 0.08;
            float scroll = uScroll;

            float angle1 = 0.6;
            float angle2 = -0.7;
            float angle3 = 1.2;

            float freq1 = 2.4;
            float freq2 = 3.2;
            float freq3 = 4.0;

            vec2 warpedUv = uv;
            float scrollDeform = scroll * 5.0;

            warpedUv.x += sin(uv.y * 2.5 + time * 0.2 + scrollDeform) * 0.35;
            warpedUv.y += cos(uv.x * 2.5 - time * 0.15 - scrollDeform * 0.8) * 0.35;

            warpedUv.x += sin(uv.y * 1.2 - time * 0.1 - scrollDeform * 1.5) * 0.25;
            warpedUv.y += cos(uv.x * 1.2 + time * 0.18 + scrollDeform * 1.2) * 0.25;

            vec2 scrollDrift = vec2(scroll * 0.04, -scroll * 0.02);
            vec2 mouseShift = vec2(uMouse.x * aspect * 0.05, uMouse.y * 0.05);
            warpedUv += scrollDrift + mouseShift;

            vec2 dir1 = vec2(cos(angle1), sin(angle1));
            vec2 dir2 = vec2(cos(angle2), sin(angle2));
            vec2 dir3 = vec2(cos(angle3), sin(angle3));

            float w1 = sin(dot(warpedUv, dir1) * freq1 + time * 1.0);
            float w2 = cos(dot(warpedUv, dir2) * freq2 - time * 1.4 + w1 * 0.4);
            float w3 = sin(dot(warpedUv, dir3) * freq3 + time * 1.8 + w2 * 0.5);

            float waveField = w1 * 0.50 + w2 * 0.35 + w3 * 0.15;

            float wideSheen = pow(max(0.0, 1.0 - abs(waveField - 0.1)), 2.5);
            float crispSpecular = pow(max(0.0, 1.0 - abs(waveField - 0.15)), 8.0);
            float crest = wideSheen * 0.5 + crispSpecular * 0.9;

            // Top palette (scroll = 0): warm cream / gold silk
            vec3 c0_shadow = vec3(0.86, 0.75, 0.72);
            vec3 c0_wave1  = vec3(0.90, 0.77, 0.65);
            vec3 c0_wave2  = vec3(0.80, 0.65, 0.60);
            vec3 c0_crest  = vec3(1.00, 0.93, 0.78);

            // Bottom palette (scroll = 1): dusty rose / mauve silk
            vec3 c1_shadow = vec3(0.78, 0.60, 0.62);
            vec3 c1_wave1  = vec3(0.80, 0.58, 0.58);
            vec3 c1_wave2  = vec3(0.65, 0.45, 0.48);
            vec3 c1_crest  = vec3(0.96, 0.80, 0.74);

            float t = smoothstep(0.0, 1.0, scroll);
            vec3 colShadow = mix(c0_shadow, c1_shadow, t);
            vec3 colWave1  = mix(c0_wave1, c1_wave1, t);
            vec3 colWave2  = mix(c0_wave2, c1_wave2, t);
            vec3 colCrest  = mix(c0_crest, c1_crest, t);

            vec3 color = colShadow;
            color = mix(color, colWave2, smoothstep(-0.6, 0.2, waveField));
            color = mix(color, colWave1, smoothstep(0.0, 0.8, waveField));

            color += colCrest * crest * 0.9;

            float vignette = 1.0 - dot(uv, uv) * 0.10;
            color *= vignette;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthWrite: false,
        depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(30, 30);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -8);
    mesh.renderOrder = -10;
    camera.add(mesh);
    return mesh;
}

async function init() {
    document.body.classList.add('webgl-hero');
    splitBrandNameIntoChars();

    let THREE;
    try {
        THREE = await import('three');
    } catch (err) {
        console.error('Hero WebGL: failed to load three.js, reverting to 2D hero.', err);
        document.body.classList.remove('webgl-hero');
        return;
    }

    const heroCanvas = document.getElementById('hero-webgl');
    const guideCanvas = document.getElementById('guide-webgl');
    const heroWrap = document.getElementById('heroWrap');
    const questionPhase = document.getElementById('questionPhase');
    if (!heroCanvas || !guideCanvas || !heroWrap) {
        document.body.classList.remove('webgl-hero');
        return;
    }

    try {
        let width = window.innerWidth;
        let height = window.innerHeight;
        const pixelRatio = () => Math.min(window.devicePixelRatio, 2);

        // ============================================================
        // HERO SCENE — the liquid-silk background + light motes. Lives inside the
        // hero's own canvas (confined to the hero region) and pauses when scrolled
        // past. The butterfly is NOT here anymore; it rides the guide overlay.
        // ============================================================
        const heroScene = new THREE.Scene();
        heroScene.background = new THREE.Color('#fdf4eb');
        heroScene.fog = new THREE.FogExp2('#fdf4eb', 0.05);

        const heroCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        heroCamera.position.set(0, 0.3, 3.9);
        heroScene.add(heroCamera);

        const shaderUniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uScroll: { value: 0 },
        };
        createBackgroundShader(THREE, heroCamera, shaderUniforms);

        const heroRenderer = new THREE.WebGLRenderer({
            canvas: heroCanvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        heroRenderer.setSize(width, height);
        heroRenderer.setPixelRatio(pixelRatio());

        const sparkCount = 240;
        const sparkData = [];
        const sparkParticles = createSparks(THREE, heroScene, sparkCount, sparkData);

        // ============================================================
        // GUIDE SCENE — the butterfly companion on a transparent, full-viewport
        // fixed overlay that floats above every section. Always renders so the
        // butterfly stays with you the whole way down the page.
        // ============================================================
        const guideScene = new THREE.Scene();
        const guideCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        guideCamera.position.set(0, 0, 3.9);
        guideCamera.lookAt(0, 0, 0);
        guideScene.add(guideCamera);

        const guideRenderer = new THREE.WebGLRenderer({
            canvas: guideCanvas,
            antialias: true,
            alpha: true, // transparent so the page shows through
            powerPreference: 'high-performance',
        });
        guideRenderer.setSize(width, height);
        guideRenderer.setPixelRatio(pixelRatio());
        guideRenderer.setClearColor(0x000000, 0);
        guideRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        guideRenderer.toneMappingExposure = 1.15;

        // Warm, soft lighting for the butterfly (no shadows — nothing to catch them
        // on a transparent overlay, and it keeps the always-on scene cheap).
        guideScene.add(new THREE.AmbientLight('#fff6ea', 0.9));
        const keyLight = new THREE.DirectionalLight('#fff1d6', 3.0);
        keyLight.position.set(3, 4, 3);
        guideScene.add(keyLight);
        const rimLight = new THREE.DirectionalLight('#e8b9c2', 2.0);
        rimLight.position.set(-3, 2, -3);
        guideScene.add(rimLight);
        const fillLight = new THREE.DirectionalLight('#fff3e6', 1.0);
        fillLight.position.set(-1.5, -2, 1.5);
        guideScene.add(fillLight);

        // Butterfly + glitter live in the guide camera's space so they map to the
        // viewport regardless of anything else.
        const butterfly = await loadButterfly(THREE);
        guideCamera.add(butterfly.group);
        const glitter = createGlitter(THREE, guideCamera, 80);

        // ---- Shared input / scroll state ----
        let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
        let currentScroll = 0;
        let lastScrollY = window.scrollY;
        let scrollVel = 0; // smoothed page scroll speed (px/frame)

        window.addEventListener('mousemove', (event) => {
            targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
            targetMouseY = (event.clientY / window.innerHeight) * 2 - 1;
        });

        function getHeroScrollProgress() {
            const rect = heroWrap.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            if (total <= 0) return 0;
            return Math.min(1, Math.max(0, -rect.top / total));
        }

        // The hero is "active" (drives corner choreography) while its sticky stage
        // still fills most of the viewport; past that we switch to guide mode.
        function heroIsActive() {
            const rect = heroWrap.getBoundingClientRect();
            return rect.bottom > window.innerHeight * 0.6;
        }

        // The sections the guide leads you through, in document order. Which one is
        // centred in the viewport decides the butterfly's side + a spin flourish.
        const guideSections = Array.from(document.querySelectorAll('section[id]'))
            .filter((s) => s.id !== 'hero');
        function activeSectionIndex() {
            const mid = window.innerHeight * 0.5;
            for (let i = 0; i < guideSections.length; i++) {
                const r = guideSections[i].getBoundingClientRect();
                if (r.top <= mid && r.bottom >= mid) return i;
            }
            return -1;
        }

        function onResize() {
            width = window.innerWidth;
            height = window.innerHeight;
            heroCamera.aspect = width / height;
            heroCamera.updateProjectionMatrix();
            heroRenderer.setSize(width, height);
            heroRenderer.setPixelRatio(pixelRatio());
            guideCamera.aspect = width / height;
            guideCamera.updateProjectionMatrix();
            guideRenderer.setSize(width, height);
            guideRenderer.setPixelRatio(pixelRatio());
            shaderUniforms.uResolution.value.set(width, height);
        }
        window.addEventListener('resize', onResize);

        // Pause the hero background render once it has scrolled out of view (the
        // guide overlay keeps rendering so the butterfly follows you down).
        let heroVisible = true;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => { heroVisible = entry.isIntersecting; });
            }, { threshold: 0 }).observe(heroWrap);
        }

        // ---- Corner targeting (hero phase): the butterfly hovers diagonally
        // opposite the active question card and flies to a new corner as it moves.
        const BUTTERFLY_DEPTH = 2.6; // distance in front of the camera
        const OPPOSITE = { bl: 'tr', tr: 'bl', tl: 'br', br: 'tl', center: 'top' };

        function viewExtents() {
            const halfH = BUTTERFLY_DEPTH * Math.tan((guideCamera.fov * Math.PI / 180) / 2);
            const halfW = halfH * guideCamera.aspect;
            return { halfW, halfH };
        }

        const _corner = new THREE.Vector3();
        function cornerPos(corner) {
            const { halfW, halfH } = viewExtents();
            const mx = 0.56;      // horizontal inset from the edge
            const topY = 0.50;    // top corners sit a bit lower so wings clear the navbar
            const botY = 0.58;    // bottom corners
            let x = 0, y = 0;
            switch (corner) {
                case 'tl': x = -halfW * mx; y = halfH * topY; break;
                case 'tr': x = halfW * mx; y = halfH * topY; break;
                case 'bl': x = -halfW * mx; y = -halfH * botY; break;
                case 'br': x = halfW * mx; y = -halfH * botY; break;
                case 'top': x = 0; y = halfH * 0.52; break;
                default: x = halfW * mx; y = halfH * topY; break; // default: top-right
            }
            return _corner.set(x, y, -BUTTERFLY_DEPTH);
        }

        function activeButterflyCorner() {
            if (questionPhase && questionPhase.classList.contains('done')) return 'top';
            const active = questionPhase &&
                questionPhase.querySelector('.question-scene.active');
            const q = active && active.dataset.corner;
            return (q && OPPOSITE[q]) || 'tr';
        }

        const clock = new THREE.Clock();
        const bfPos = new THREE.Vector3().copy(cornerPos('tr')); // start top-right
        const bfTarget = new THREE.Vector3();
        let prevBfX = bfPos.x;
        let bankRoll = 0;

        // ---- Guide-mode state: which section we're beside, which side the butterfly
        // rides, and an occasional full-spin flourish it plays.
        let lastSectionIdx = -1;
        let guideSide = 1;                 // +1 = right margin, -1 = left margin
        let guideHasSpun = false;          // the butterfly spins only once, ever
        const SPIN_DUR = 1.2;              // seconds for one full roll
        let spinAmount = 0, spinFrom = 0, spinTo = 0, spinStartT = -1;
        function triggerSpin(sign) {
            if (spinStartT >= 0) return;   // don't stack spins
            spinFrom = spinAmount;
            spinTo = spinAmount + sign * Math.PI * 2;
            spinStartT = clock.elapsedTime;
        }

        function animate() {
            requestAnimationFrame(animate);
            if (document.hidden) return;

            const deltaTime = clock.getDelta();
            const t = clock.elapsedTime;

            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            // Smoothed page scroll speed / direction drives the "leading" behaviour.
            const sy = window.scrollY;
            const rawDy = sy - lastScrollY;
            lastScrollY = sy;
            scrollVel += (rawDy - scrollVel) * 0.2;
            const dir = THREE.MathUtils.clamp(scrollVel / 45, -1, 1);
            const scrollTravel = THREE.MathUtils.clamp(Math.abs(scrollVel) / 18, 0, 1);

            const { halfW, halfH } = viewExtents();
            const heroActive = heroIsActive();

            // --- Where should the butterfly be? ---
            let roaming = false;
            let exiting = false;
            if (heroActive) {
                // HERO: hover opposite the active question, or roam the upper stage
                // once the questions give way to the brand reveal.
                lastSectionIdx = -1; // so the first section entry always spins
                const corner = activeButterflyCorner();
                roaming = corner === 'top';
                if (roaming) {
                    bfTarget.set(
                        (Math.sin(t * 0.11) * 0.42 + Math.sin(t * 0.05 + 1.3) * 0.16) * halfW,
                        (Math.cos(t * 0.09) * 0.34 + Math.sin(t * 0.07 + 0.7) * 0.14) * halfH,
                        -BUTTERFLY_DEPTH
                    );
                } else {
                    bfTarget.copy(cornerPos(corner));
                    bfTarget.x += Math.sin(t * 0.5) * 0.10 + Math.sin(t * 1.2 + 1.0) * 0.04;
                    bfTarget.y += Math.cos(t * 0.6) * 0.08 + Math.sin(t * 0.9 + 0.5) * 0.03;
                }
            } else {
                // GUIDE: accompany you down the page. Each new section flips the side
                // it rides and fires a spin as it crosses over; it also throws in an
                // occasional barrel roll while cruising. It leads ahead in the scroll
                // direction and settles beside the heading area when you pause.
                const idx = activeSectionIndex();
                const activeId = idx >= 0 ? guideSections[idx].id : null;
                if (idx >= 0 && idx !== lastSectionIdx) {
                    lastSectionIdx = idx;
                    guideSide = idx % 2 === 0 ? 1 : -1; // alternate right / left
                    if (!guideHasSpun) {               // one spin, the first time only
                        guideHasSpun = true;
                        triggerSpin(guideSide);
                    }
                }
                // On the Programmes page the butterfly flies away, then re-enters for
                // the next section (The Empowered Parent Blueprint™).
                exiting = activeId === EXIT_SECTION_ID;
                if (exiting) {
                    // Sweep up and off the top edge, well out of view.
                    bfTarget.set(guideSide * halfW * 1.7, halfH * 1.6, -BUTTERFLY_DEPTH);
                } else {
                    const side = halfW * 0.52 * guideSide;
                    bfTarget.set(
                        side + Math.sin(t * 0.5) * 0.06 + Math.sin(t * 1.3 + 0.5) * 0.03,
                        halfH * (0.28 - dir * 0.5) + Math.cos(t * 0.6) * 0.06,
                        -BUTTERFLY_DEPTH
                    );
                }
            }
            // Exit faster so it clears the screen; otherwise glide at the normal pace.
            const lerpAmt = exiting ? 0.05 : 0.012 + scrollTravel * 0.06;
            bfPos.lerp(bfTarget, lerpAmt);

            // --- Speed-adaptive flap: full flap while travelling, calm when settled.
            const travel = heroActive ? Math.max(0.35, scrollTravel) : scrollTravel;
            butterfly.setTravel(travel);
            butterfly.mixer.update(deltaTime);

            const flapPhase = t * 6.0;
            butterfly.group.position.set(bfPos.x, bfPos.y + Math.sin(flapPhase) * 0.02, bfPos.z);

            // --- Banking: roll gently into the direction of horizontal travel.
            const vx = bfPos.x - prevBfX;
            prevBfX = bfPos.x;
            const targetRoll = THREE.MathUtils.clamp(-vx * 6.0, -0.45, 0.45);
            bankRoll += (targetRoll - bankRoll) * 0.04;

            // --- Advance an occasional full-spin flourish (eased in/out).
            if (spinStartT >= 0) {
                const p = Math.min(1, (t - spinStartT) / SPIN_DUR);
                const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                spinAmount = spinFrom + (spinTo - spinFrom) * e;
                if (p >= 1) spinStartT = -1;
            }

            butterfly.group.rotation.z = bankRoll + Math.sin(t * 0.5) * 0.035 + spinAmount;
            butterfly.group.rotation.x = MODEL_BASE_PITCH + Math.sin(t * 0.5) * 0.045 + mouseY * 0.12;
            butterfly.group.rotation.y = mouseX * 0.22 + Math.sin(t * 0.33) * 0.05;

            // --- A very light dusting of glitter falls from the wings while moving.
            if (!exiting && (roaming || travel > 0.25) && Math.random() < 0.14) {
                spawnGlitter(
                    glitter,
                    butterfly.group.position.x,
                    butterfly.group.position.y - 0.04,
                    butterfly.group.position.z
                );
            }
            updateGlitter(glitter, deltaTime, t);

            // Render the always-on butterfly overlay every frame.
            guideRenderer.render(guideScene, guideCamera);

            // --- Hero background: only update/render while it's on screen. ---
            if (heroVisible) {
                const targetScroll = getHeroScrollProgress();
                currentScroll += (targetScroll - currentScroll) * 0.08;

                updateSparks(
                    sparkParticles, sparkData, sparkCount, deltaTime, clock.elapsedTime,
                    Math.abs(targetScroll - currentScroll)
                );

                heroCamera.position.x += ((mouseX * 0.22) - heroCamera.position.x) * 0.04;
                heroCamera.position.y += ((0.3 + mouseY * 0.12) - heroCamera.position.y) * 0.04;
                heroCamera.position.z += ((3.9 - currentScroll * 0.5) - heroCamera.position.z) * 0.04;
                heroCamera.lookAt(0, 0, 0);

                shaderUniforms.uTime.value = clock.elapsedTime;
                shaderUniforms.uMouse.value.set(mouseX, -mouseY);
                shaderUniforms.uScroll.value = currentScroll;

                heroRenderer.render(heroScene, heroCamera);
            }
        }
        animate();
    } catch (err) {
        console.error('Hero WebGL: scene setup failed, reverting to 2D hero.', err);
        document.body.classList.remove('webgl-hero');
    }
}

if (!prefersReduced && !isSmallScreen && supportsWebGL()) {
    init();
}
