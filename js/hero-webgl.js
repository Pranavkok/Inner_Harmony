// ========================================
// INNER HARMONY — Cinematic WebGL hero centerpiece
// A procedural sacred-geometry ornament (gold core + rose/gold rings + petal halo),
// a slow warm liquid-silk background shader, and soft light-mote particles —
// driven by scroll while the hero section is pinned.
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

function buildCenterpiece(THREE, pivot) {
    const goldMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#e8b975'),
        roughness: 0.38,
        metalness: 0.85,
    });
    const roseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d99aa0'),
        roughness: 0.42,
        metalness: 0.8,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), goldMat);
    core.castShadow = true;
    core.receiveShadow = true;
    pivot.add(core);

    const ringSpecs = [
        { radius: 0.95, tube: 0.02, tiltX: Math.PI / 2.4, tiltZ: 0.2, spin: 0.12 },
        { radius: 1.15, tube: 0.015, tiltX: Math.PI / 3.2, tiltZ: -0.35, spin: -0.09 },
        { radius: 1.35, tube: 0.012, tiltX: Math.PI / 1.8, tiltZ: 0.5, spin: 0.06 },
    ];
    ringSpecs.forEach((spec, i) => {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(spec.radius, spec.tube, 12, 96),
            i % 2 === 0 ? roseMat : goldMat
        );
        ring.rotation.x = spec.tiltX;
        ring.rotation.z = spec.tiltZ;
        ring.castShadow = true;
        ring.userData.spin = spec.spin;
        pivot.add(ring);
    });

    // halo of small petal-like spheres
    const petalCount = 10;
    const petalGeo = new THREE.SphereGeometry(0.05, 12, 12);
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, i % 2 === 0 ? goldMat : roseMat);
        petal.position.set(Math.cos(angle) * 1.55, Math.sin(angle * 2) * 0.1, Math.sin(angle) * 1.55);
        petal.castShadow = true;
        pivot.add(petal);
    }

    pivot.position.y = -0.55;
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
        const ambientLight = new THREE.AmbientLight('#fff6ea', 0.65);
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

        const fillLight = new THREE.DirectionalLight('#fff3e6', 1.0);
        fillLight.position.set(-1.5, -2, 1.5);
        scene.add(fillLight);

        const centerpiecePivot = new THREE.Group();
        scene.add(centerpiecePivot);
        buildCenterpiece(THREE, centerpiecePivot);

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

        const clock = new THREE.Clock();
        const lookTarget = new THREE.Vector3(0, -0.05, 0);
        const targetPos = new THREE.Vector3();

        function animate() {
            requestAnimationFrame(animate);
            if (!isVisible) return;

            const deltaTime = clock.getDelta();
            const targetScroll = getHeroScrollProgress();
            currentScroll += (targetScroll - currentScroll) * 0.08;

            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            centerpiecePivot.rotation.y = mouseX * 0.25 + clock.elapsedTime * 0.04;
            centerpiecePivot.rotation.x = mouseY * 0.15;
            centerpiecePivot.children.forEach((child) => {
                if (child.userData.spin) child.rotation.z += child.userData.spin * deltaTime;
            });

            updateSparks(
                sparkParticles, sparkData, sparkCount, deltaTime, clock.elapsedTime,
                Math.abs(targetScroll - currentScroll)
            );

            // partial ±40° orbit — this hero is a short pinned section, not a
            // full-page 360° flythrough
            const orbitAngle = (currentScroll - 0.5) * Math.PI * (80 / 180);
            const radius = 3.9;
            targetPos.set(
                radius * Math.sin(orbitAngle),
                0.3 + Math.sin(currentScroll * Math.PI) * 0.2,
                radius * Math.cos(orbitAngle)
            );
            camera.position.lerp(targetPos, 0.04);
            camera.lookAt(lookTarget);

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
