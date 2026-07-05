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

// ShapeGeometry gives each vertex a UV equal to its raw (x, y) position, so for
// a wing spanning e.g. x:[0..1.3] the UVs run 0..1.3 and the texture doesn't map
// cleanly. Renormalize UVs to 0..1 across the wing's bounding box.
function remapUV01(geometry) {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const minX = bb.min.x;
    const minY = bb.min.y;
    const dx = (bb.max.x - minX) || 1;
    const dy = (bb.max.y - minY) || 1;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - minX) / dx, (pos.getY(i) - minY) / dy);
    }
    uv.needsUpdate = true;
}

// Beautiful adult-butterfly wing markings, painted in warm greys/whites so the
// wing material's `color`/`emissive` can tint the whole wing (iridescent scroll
// sweep) while veins stay dark and marginal spots stay pale.
function createWingTexture(THREE) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base wash: brighter near the wing root (left) fading toward the tip.
    const base = ctx.createLinearGradient(0, 0, size, 0);
    base.addColorStop(0.0, '#fdf6ee');
    base.addColorStop(0.5, '#efe3d9');
    base.addColorStop(1.0, '#e4d3cb');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Soft top-to-bottom shading for depth.
    const shade = ctx.createLinearGradient(0, 0, 0, size);
    shade.addColorStop(0, 'rgba(255,255,255,0.16)');
    shade.addColorStop(1, 'rgba(120,90,95,0.14)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);

    // Veins radiating from the wing root (inner side).
    const rootX = 6;
    const rootY = 150;
    const veinEnds = [[252, 18], [255, 66], [255, 116], [250, 168], [232, 214], [186, 244], [116, 250]];
    ctx.strokeStyle = 'rgba(58,38,40,0.5)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    veinEnds.forEach(([ex, ey]) => {
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo((rootX + ex) / 2, (rootY + ey) / 2 - 22, ex, ey);
        ctx.stroke();
    });

    // Darker outer margin band.
    ctx.strokeStyle = 'rgba(45,30,32,0.4)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(size - 8, 6);
    ctx.lineTo(size - 8, size - 6);
    ctx.stroke();

    // Row of pale marginal spots (lunules) just inside the outer edge.
    ctx.fillStyle = 'rgba(255,252,246,0.92)';
    for (let i = 0; i < 7; i++) {
        const yy = 24 + i * 32;
        ctx.beginPath();
        ctx.arc(size - 18, yy, 5.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // A single soft eyespot for that unmistakable butterfly read.
    ctx.fillStyle = 'rgba(40,25,30,0.55)';
    ctx.beginPath();
    ctx.arc(182, 74, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,240,0.88)';
    ctx.beginPath();
    ctx.arc(178, 70, 8, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
}

// Right-side forewing silhouette (x to the right, y up), root near the origin.
function makeForeWing(THREE) {
    const s = new THREE.Shape();
    s.moveTo(0.04, 0.02);
    s.bezierCurveTo(0.35, 0.30, 0.80, 0.55, 1.02, 0.98); // leading edge out to the tip
    s.bezierCurveTo(1.12, 1.14, 1.22, 1.06, 1.25, 0.86); // rounded pointed tip
    s.bezierCurveTo(1.31, 0.55, 1.16, 0.32, 0.86, 0.16); // outer margin curving down
    s.bezierCurveTo(0.55, 0.02, 0.30, -0.02, 0.04, 0.02); // trailing edge back to root
    return s;
}

// Right-side hindwing silhouette — a rounder, gently scalloped lower lobe.
function makeHindWing(THREE) {
    const s = new THREE.Shape();
    s.moveTo(0.03, 0.02);
    s.bezierCurveTo(0.45, 0.06, 0.86, -0.05, 0.92, -0.35); // out to the right
    s.bezierCurveTo(0.99, -0.62, 0.80, -0.86, 0.55, -0.96); // outer round down
    s.bezierCurveTo(0.42, -1.02, 0.35, -0.90, 0.33, -0.78); // little tail bump
    s.bezierCurveTo(0.29, -0.90, 0.20, -0.94, 0.13, -0.78); // scallop notch
    s.bezierCurveTo(0.05, -0.54, 0.0, -0.28, 0.03, 0.02); // inner edge back to root
    return s;
}

function buildButterfly(THREE) {
    const group = new THREE.Group();

    const wingTex = createWingTexture(THREE);
    // Shared by all four wings so the color/shine update happens in one place.
    // Base colour sits in the site's warm rose palette; animate() nudges it only
    // slightly toward gold for a sheen, never a full rainbow sweep.
    const wingMat = new THREE.MeshStandardMaterial({
        map: wingTex,
        color: new THREE.Color('#d99aa0'),
        emissive: new THREE.Color('#c9926a'),
        emissiveIntensity: 0.2,
        roughness: 0.4,
        metalness: 0.45,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.98,
    });

    // Right-side geometry (built once, UV-normalized, then mirrored for the left).
    const foreGeoR = new THREE.ShapeGeometry(makeForeWing(THREE), 40);
    remapUV01(foreGeoR);
    const hindGeoR = new THREE.ShapeGeometry(makeHindWing(THREE), 40);
    remapUV01(hindGeoR);

    const wingR = new THREE.Group();
    const foreR = new THREE.Mesh(foreGeoR, wingMat);
    const hindR = new THREE.Mesh(hindGeoR, wingMat);
    hindR.position.z = -0.01; // forewing overlaps hindwing slightly
    wingR.add(foreR, hindR);

    const wingL = new THREE.Group();
    const foreGeoL = foreGeoR.clone();
    foreGeoL.scale(-1, 1, 1);
    const hindGeoL = hindGeoR.clone();
    hindGeoL.scale(-1, 1, 1);
    const foreL = new THREE.Mesh(foreGeoL, wingMat);
    const hindL = new THREE.Mesh(hindGeoL, wingMat);
    hindL.position.z = -0.01;
    wingL.add(foreL, hindL);

    group.add(wingR, wingL);

    // Body — dark, softly-lit thorax + tapered abdomen + head.
    const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#241c18'),
        roughness: 0.8,
        metalness: 0.15,
    });

    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), bodyMat);
    thorax.scale.set(1, 1.4, 1);
    thorax.position.y = 0.03;

    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.085, 0.6, 16), bodyMat);
    abdomen.position.y = -0.28;

    const abdomenTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), bodyMat);
    abdomenTip.position.y = -0.57;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), bodyMat);
    head.position.y = 0.18;

    group.add(thorax, abdomen, abdomenTip, head);

    // Antennae — thin curved tubes with tiny club tips.
    [-1, 1].forEach((sgn) => {
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(sgn * 0.02, 0.23, 0.02),
            new THREE.Vector3(sgn * 0.1, 0.42, 0.05),
            new THREE.Vector3(sgn * 0.17, 0.52, 0.02)
        );
        const antenna = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.006, 6, false), bodyMat);
        const club = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), bodyMat);
        club.position.set(sgn * 0.17, 0.53, 0.02);
        group.add(antenna, club);
    });

    group.scale.setScalar(0.44);
    return { group, wingR, wingL, wingMat };
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

    const canvas = document.getElementById('hero-webgl');
    const heroWrap = document.getElementById('heroWrap');
    const questionPhase = document.getElementById('questionPhase');
    if (!canvas || !heroWrap) {
        document.body.classList.remove('webgl-hero');
        return;
    }

    try {
        let width = window.innerWidth;
        let height = window.innerHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#fdf4eb');
        scene.fog = new THREE.FogExp2('#fdf4eb', 0.05);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        camera.position.set(0, 0.3, 3.9);
        scene.add(camera);

        const shaderUniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uScroll: { value: 0 },
        };
        createBackgroundShader(THREE, camera, shaderUniforms);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        // Warm chiaroscuro lighting (soft, not moody — matches the pastel brand)
        const ambientLight = new THREE.AmbientLight('#fff6ea', 0.75);
        scene.add(ambientLight);

        const keyLight = new THREE.SpotLight('#fff1d6', 5.5);
        keyLight.position.set(3, 4, 3);
        keyLight.angle = Math.PI / 4;
        keyLight.penumbra = 0.9;
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 1.0;
        keyLight.shadow.camera.far = 12;
        keyLight.shadow.bias = -0.001;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight('#e8b9c2', 2.4);
        rimLight.position.set(-3, 2, -3);
        scene.add(rimLight);

        const fillLight = new THREE.DirectionalLight('#fff3e6', 1.1);
        fillLight.position.set(-1.5, -2, 1.5);
        scene.add(fillLight);

        // The butterfly lives in camera space (like the background plane) so the
        // camera's own drift never pulls it off the corner it's aiming for.
        const butterfly = buildButterfly(THREE);
        camera.add(butterfly.group);

        // Warm brand wing palette (dusty rose <-> gold) — the wing colour only
        // drifts slightly between these, reading as sheen rather than a rainbow.
        const WING_A = new THREE.Color('#d99aa0'); // dusty rose
        const WING_B = new THREE.Color('#e8b975'); // warm gold

        // Glitter shares the camera's space so it lines up with the butterfly.
        const glitter = createGlitter(THREE, camera, 80);

        const sparkCount = 240;
        const sparkData = [];
        const sparkParticles = createSparks(THREE, scene, sparkCount, sparkData);

        let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
        let currentScroll = 0;

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

        function onResize() {
            width = window.innerWidth;
            height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            shaderUniforms.uResolution.value.set(width, height);
        }
        window.addEventListener('resize', onResize);

        // Pause the render loop once the hero has fully scrolled out of view.
        let isVisible = true;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => { isVisible = entry.isIntersecting; });
            }, { threshold: 0 }).observe(heroWrap);
        }

        // ---- Corner targeting: the butterfly hovers diagonally opposite the
        // active question card and flies to a new corner as the question moves.
        const BUTTERFLY_DEPTH = 2.6; // distance in front of the camera
        // Question corner -> where the butterfly should be (the opposite side).
        const OPPOSITE = { bl: 'tr', tr: 'bl', tl: 'br', br: 'tl', center: 'top' };

        function viewExtents() {
            const halfH = BUTTERFLY_DEPTH * Math.tan((camera.fov * Math.PI / 180) / 2);
            const halfW = halfH * camera.aspect;
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
            // Once the questions finish, hover gently up top out of the brand's way.
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

        function animate() {
            requestAnimationFrame(animate);
            if (!isVisible) return;

            const deltaTime = clock.getDelta();
            const t = clock.elapsedTime;
            const targetScroll = getHeroScrollProgress();
            currentScroll += (targetScroll - currentScroll) * 0.08;

            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            // --- Target: hover opposite the active question, OR once the centre
            //     phase arrives, wander slowly and freely around the stage.
            const { halfW, halfH } = viewExtents();
            const corner = activeButterflyCorner();
            const roaming = corner === 'top'; // centre question / brand reveal
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
            bfPos.lerp(bfTarget, 0.012); // slow, graceful glide

            // --- Wing flap (symmetric, unhurried) + coupled body bob.
            const flapPhase = t * 6.0;
            const flap = 0.9 * Math.sin(flapPhase);
            butterfly.wingR.rotation.y = -flap;
            butterfly.wingL.rotation.y = flap;

            butterfly.group.position.set(bfPos.x, bfPos.y + Math.sin(flapPhase) * 0.02, bfPos.z);

            // --- Banking: roll gently into the direction of horizontal travel.
            const vx = bfPos.x - prevBfX;
            prevBfX = bfPos.x;
            const targetRoll = THREE.MathUtils.clamp(-vx * 6.0, -0.45, 0.45);
            bankRoll += (targetRoll - bankRoll) * 0.04;

            butterfly.group.rotation.z = bankRoll + Math.sin(t * 0.5) * 0.035;
            // Pitch for a 3/4 top-down view + gentle life + a touch of mouse parallax.
            butterfly.group.rotation.x = -0.35 + Math.sin(t * 0.5) * 0.045 + mouseY * 0.12;
            butterfly.group.rotation.y = mouseX * 0.22 + Math.sin(t * 0.33) * 0.05;

            // --- Wing colour stays in the site's warm rose->gold palette; only a
            //     slight shine/scroll shift so it reads as sheen, not a rainbow.
            const shimmer = 0.5 + 0.5 * Math.sin(t * 0.35);
            const mix = THREE.MathUtils.clamp(0.32 + currentScroll * 0.3 + shimmer * 0.12, 0, 1);
            butterfly.wingMat.color.copy(WING_A).lerp(WING_B, mix);
            butterfly.wingMat.emissive.copy(WING_A).lerp(WING_B, mix).multiplyScalar(0.55);

            // --- A very light dusting of glitter falls from the wings while roaming.
            if (roaming && Math.random() < 0.14) {
                spawnGlitter(
                    glitter,
                    butterfly.group.position.x,
                    butterfly.group.position.y - 0.04,
                    butterfly.group.position.z
                );
            }
            updateGlitter(glitter, deltaTime, t);

            updateSparks(
                sparkParticles, sparkData, sparkCount, deltaTime, clock.elapsedTime,
                Math.abs(targetScroll - currentScroll)
            );

            // Calm, near-static camera: gentle mouse parallax + a tiny scroll dolly.
            camera.position.x += ((mouseX * 0.22) - camera.position.x) * 0.04;
            camera.position.y += ((0.3 + mouseY * 0.12) - camera.position.y) * 0.04;
            camera.position.z += ((3.9 - currentScroll * 0.5) - camera.position.z) * 0.04;
            camera.lookAt(0, 0, 0);

            shaderUniforms.uTime.value = clock.elapsedTime;
            shaderUniforms.uMouse.value.set(mouseX, -mouseY);
            shaderUniforms.uScroll.value = currentScroll;

            renderer.render(scene, camera);
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
