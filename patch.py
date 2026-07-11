import re

with open('js/hero-webgl.js', 'r') as f:
    content = f.read()

# Replace Lighting
lighting_replacement = """        const heroScene = new THREE.Scene();
        heroScene.background = new THREE.Color('#e0f2fe'); // Bright sky blue
        heroScene.fog = new THREE.Fog('#e0f2fe', 14, 30);

        const heroCamera = new THREE.PerspectiveCamera(GARDEN_CAM.fov[0], width / height, 0.1, 200);
        heroCamera.position.set(...GARDEN_CAM.keys[0].pos);
        heroCamera.lookAt(...GARDEN_CAM.keys[0].look);
        heroScene.add(heroCamera);

        const heroRenderer = new THREE.WebGLRenderer({
            canvas: heroCanvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        heroRenderer.setSize(width, height);
        heroRenderer.setPixelRatio(pixelRatio());
        heroRenderer.outputColorSpace = THREE.SRGBColorSpace;
        heroRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        heroRenderer.toneMappingExposure = 1.35; // Brighter for cartoon vibe

        // Daylight rig for the garden: bright cartoonish lighting.
        heroScene.add(new THREE.HemisphereLight('#ffffff', '#4ade80', 1.5));
        const sun = new THREE.DirectionalLight('#fff9e6', 3.0);
        sun.position.set(6, 9, 4);
        heroScene.add(sun);
        const skyFill = new THREE.DirectionalLight('#e0f2fe', 1.0);
        skyFill.position.set(-5, 3, -4);
        heroScene.add(skyFill);
"""

# Find the block to replace
old_lighting = re.search(r'const heroScene = new THREE\.Scene\(\);.*?heroScene\.add\(skyFill\);', content, re.DOTALL)
if old_lighting:
    content = content.replace(old_lighting.group(0), lighting_replacement)

# Also let's tweak the butterfly lighting if it's there
butterfly_lighting = """        // Warm, bright cartoon lighting for the butterfly
        guideScene.add(new THREE.AmbientLight('#ffffff', 1.2));
        const keyLight = new THREE.DirectionalLight('#ffffff', 3.5);
        keyLight.position.set(3, 4, 3);
        guideScene.add(keyLight);
        const rimLight = new THREE.DirectionalLight('#f9a8d4', 2.5); // pink rim
        rimLight.position.set(-3, 2, -3);
        guideScene.add(rimLight);
        const fillLight = new THREE.DirectionalLight('#fde047', 1.5); // yellow fill
        fillLight.position.set(-1.5, -2, 1.5);
        guideScene.add(fillLight);"""

old_bf_light = re.search(r'// Warm, soft lighting for the butterfly.*?guideScene\.add\(fillLight\);', content, re.DOTALL)
if old_bf_light:
    content = content.replace(old_bf_light.group(0), butterfly_lighting)

with open('js/hero-webgl.js', 'w') as f:
    f.write(content)
print("Patched hero-webgl.js successfully!")
