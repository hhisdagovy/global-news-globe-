// Global News Globe Application
// This application creates an interactive 3D globe with country-specific news

// Configuration
const CONFIG = {
    // NewsData.io configuration - Get your free API key from https://newsdata.io/
    NEWS_API_KEY: 'pub_a2f8079925f449faaf39afeabb61a3b9',
    NEWS_API_URL: 'https://newsdata.io/api/1/news',
    
    // WeatherAPI configuration - Get your free API key from https://www.weatherapi.com/
    WEATHER_API_KEY: 'a93f7eed3efa4c5bbc071127250710',
    WEATHER_API_URL: 'https://api.weatherapi.com/v1/current.json',
    
    // Globe settings
    GLOBE_RADIUS: 100,
    ATMOSPHERE_ALTITUDE: 0.25,
    AUTO_ROTATE_SPEED: 0.3,
    
    // Visual settings
    COLORS: {
        globe: '#070a14',
        atmosphere: '#4f6ef7',
        land: 'rgba(79, 110, 247, 0.22)',   // Restrained indigo overlay
        border: 'rgba(255, 255, 255, 0.85)', // Bright white borders for visibility
        hover: 'rgba(251, 191, 36, 0.82)'   // Warm amber highlight on hover
    }
};

// ─── NASA GIBS (Global Imagery Browse Services) helpers ──────────────────────
// GIBS serves near-real-time equirectangular satellite imagery, updated daily.
// Data has a ~2-day processing lag, so we request date = today minus 2 days.

function getGIBSDate() {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0]; // e.g. "2026-03-03"
}

function buildGIBSUrl(layer, date) {
    return (
        'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi' +
        '?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap' +
        '&LAYERS=' + encodeURIComponent(layer) +
        '&FORMAT=image%2Fjpeg' +
        '&CRS=CRS%3A84&BBOX=-180%2C-90%2C180%2C90' +
        '&WIDTH=2048&HEIGHT=1024' +
        '&TIME=' + date
    );
}

// ─────────────────────────────────────────────────────────────────────────────

// Country code mapping (ISO2 to NewsData.io country codes)
// NewsData.io supports 60+ countries with better global coverage
const COUNTRY_CODES = {
    // North America
    'US': 'us', 'CA': 'ca', 'MX': 'mx',
    // South America
    'AR': 'ar', 'BR': 'br', 'CL': 'cl', 'CO': 'co', 'CU': 'cu', 'PE': 'pe', 'VE': 've',
    // Europe
    'AT': 'at', 'BE': 'be', 'BG': 'bg', 'HR': 'hr', 'CZ': 'cz', 'DK': 'dk', 'EE': 'ee',
    'FI': 'fi', 'FR': 'fr', 'DE': 'de', 'GR': 'gr', 'HU': 'hu', 'IE': 'ie', 'IT': 'it',
    'LV': 'lv', 'LT': 'lt', 'NL': 'nl', 'NO': 'no', 'PL': 'pl', 'PT': 'pt', 'RO': 'ro',
    'RS': 'rs', 'SK': 'sk', 'SI': 'si', 'ES': 'es', 'SE': 'se', 'CH': 'ch', 'UA': 'ua',
    'GB': 'gb', 'RU': 'ru',
    // Middle East
    'AE': 'ae', 'IL': 'il', 'SA': 'sa', 'TR': 'tr', 'EG': 'eg',
    // Asia
    'CN': 'cn', 'HK': 'hk', 'IN': 'in', 'ID': 'id', 'JP': 'jp', 'MY': 'my', 'PH': 'ph',
    'SG': 'sg', 'KR': 'kr', 'TW': 'tw', 'TH': 'th', 'VN': 'vn', 'PK': 'pk', 'BD': 'bd',
    // Africa
    'ZA': 'za', 'NG': 'ng', 'MA': 'ma', 'KE': 'ke', 'ET': 'et',
    // Oceania
    'AU': 'au', 'NZ': 'nz'
};

// Supported countries names for user reference
const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CODES).length;

// State management
let globe;
let currentCountry = null;
let hoveredCountry = null;
let newsCache = {};
let weatherCache = {};
let allCountries = [];
let currentRegion = '';
let currentMode = 'news'; // 'news' or 'radio'
let radioStationsCache = {};
let audioPlayer = null;
let currentStation = null;
let errorTimeout = null;

// Settings
let settings = {
    tempUnit: 'C',
    autoRotate: true,
    showImages: true,
    showClouds: true,
    newsCount: 3,
    rotationSpeed: 0.3
};

// Store cloud mesh reference
let cloudMesh = null;

// Region mapping
const REGIONS = {
    'americas': ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'CU', 'PE', 'VE'],
    'europe': ['GB', 'FR', 'DE', 'IT', 'ES', 'RU', 'NL', 'PL', 'UA', 'SE', 'NO', 'DK', 'FI', 'AT', 'BE', 'BG', 'HR', 'CZ', 'EE', 'GR', 'HU', 'IE', 'LV', 'LT', 'PT', 'RO', 'RS', 'SK', 'SI', 'CH'],
    'asia': ['CN', 'IN', 'JP', 'KR', 'TH', 'VN', 'ID', 'PH', 'MY', 'SG', 'PK', 'BD', 'HK', 'TW'],
    'middle-east': ['SA', 'AE', 'IL', 'TR', 'EG'],
    'africa': ['ZA', 'NG', 'MA', 'KE', 'ET'],
    'oceania': ['AU', 'NZ']
};

// Country name to Radio Browser country code mapping
const RADIO_COUNTRY_CODES = {
    'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
    'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL',
    'Japan': 'JP', 'China': 'CN', 'India': 'IN', 'South Korea': 'KR', 'Thailand': 'TH',
    'Brazil': 'BR', 'Mexico': 'MX', 'Argentina': 'AR', 'Russia': 'RU', 'South Africa': 'ZA',
    'Nigeria': 'NG', 'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Turkey': 'TR',
    'Greece': 'GR', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
    'Poland': 'PL', 'Czech Republic': 'CZ', 'Hungary': 'HU', 'Romania': 'RO', 'Portugal': 'PT',
    'Ireland': 'IE', 'New Zealand': 'NZ', 'Israel': 'IL', 'Indonesia': 'ID', 'Philippines': 'PH',
    'Vietnam': 'VN', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Ukraine': 'UA', 'Colombia': 'CO',
    'Chile': 'CL', 'Peru': 'PE', 'Venezuela': 'VE', 'Cuba': 'CU', 'Slovakia': 'SK',
    'Bulgaria': 'BG', 'Croatia': 'HR', 'Slovenia': 'SI', 'Lithuania': 'LT', 'Latvia': 'LV',
    'Estonia': 'EE', 'Malaysia': 'MY', 'Singapore': 'SG', 'Egypt': 'EG', 'Morocco': 'MA',
    'Kenya': 'KE', 'Ethiopia': 'ET', 'Serbia': 'RS', 'Switzerland': 'CH', 'Austria': 'AT',
    'Belgium': 'BE', 'Hong Kong': 'HK', 'Taiwan': 'TW'
};

// Helper function to check if a point is inside a polygon
function pointInPolygon(lat, lng, polygon) {
    // Simple point-in-polygon ray casting algorithm
    let inside = false;
    
    if (polygon.type === 'Polygon') {
        const coords = polygon.coordinates[0];
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
            const xi = coords[i][0], yi = coords[i][1];
            const xj = coords[j][0], yj = coords[j][1];
            
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    } else if (polygon.type === 'MultiPolygon') {
        for (const poly of polygon.coordinates) {
            const coords = poly[0];
            let polyInside = false;
            for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
                const xi = coords[i][0], yi = coords[i][1];
                const xj = coords[j][0], yj = coords[j][1];
                
                const intersect = ((yi > lat) !== (yj > lat)) &&
                    (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
                if (intersect) polyInside = !polyInside;
            }
            if (polyInside) {
                inside = true;
                break;
            }
        }
    }
    
    return inside;
}

// Find which country contains the given lat/lng coordinates
function findCountryAtCoords(countries, lat, lng) {
    for (const country of countries) {
        if (country.geometry && pointInPolygon(lat, lng, country.geometry)) {
            return country;
        }
    }
    return null;
}

// Load THREE.js if not available
function loadTHREE() {
    return new Promise((resolve, reject) => {
        if (window.THREE) {
            console.log('✅ THREE.js already loaded');
            resolve(window.THREE);
            return;
        }
        
        console.log('📦 Loading THREE.js from CDN...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/three@0.158.0/build/three.min.js';
        script.onload = () => {
            console.log('✅ THREE.js loaded successfully');
            resolve(window.THREE);
        };
        script.onerror = () => {
            console.error('❌ Failed to load THREE.js');
            reject(new Error('Failed to load THREE.js'));
        };
        document.head.appendChild(script);
    });
}

// Load raw pixel data from a single GIBS layer into an ImageData object.
function fetchGIBSImageData(layer, date) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width  = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            resolve(c.getContext('2d').getImageData(0, 0, c.width, c.height));
        };
        img.onerror = () => reject(new Error('GIBS fetch failed: ' + layer));
        img.src = buildGIBSUrl(layer, date);
    });
}

// Fetch three satellite sources in parallel and blend into a cloud-only alpha mask.
//
// MODIS Terra + Aqua cover ~2 300 km swaths each; on any given day their gap patterns
// are complementary but some regions (especially the central Pacific) can still be missed
// by both.  Adding VIIRS SNPP (~3 000 km swath, different orbital phase) fills what
// MODIS leaves.  At each pixel we keep whichever source is brightest — data gaps are
// near-black so valid imagery always wins.
async function loadGIBSCloudMask(THREE) {
    const date = getGIBSDate();
    console.log('🛰️  Fetching NASA GIBS cloud data (Terra + Aqua + VIIRS) for', date, '…');

    const [terra, aqua, viirs] = await Promise.all([
        fetchGIBSImageData('MODIS_Terra_CorrectedReflectance_TrueColor',  date),
        fetchGIBSImageData('MODIS_Aqua_CorrectedReflectance_TrueColor',   date).catch(() => null),
        fetchGIBSImageData('VIIRS_SNPP_CorrectedReflectance_TrueColor',   date).catch(() => null)
    ]);

    const W  = terra.width, H = terra.height;
    const td = terra.data;
    const ad = aqua  ? aqua.data  : null;
    const vd = viirs ? viirs.data : null;
    const out = new Uint8ClampedArray(td.length);

    for (let i = 0; i < td.length; i += 4) {
        let r = td[i], g = td[i + 1], b = td[i + 2];
        let lum = r * 0.299 + g * 0.587 + b * 0.114; // raw (0–255)

        // Replace with a brighter source wherever this pixel is a gap (near-black)
        if (ad) {
            const la = ad[i] * 0.299 + ad[i + 1] * 0.587 + ad[i + 2] * 0.114;
            if (la > lum) { r = ad[i]; g = ad[i + 1]; b = ad[i + 2]; lum = la; }
        }
        if (vd) {
            const lv = vd[i] * 0.299 + vd[i + 1] * 0.587 + vd[i + 2] * 0.114;
            if (lv > lum) { r = vd[i]; g = vd[i + 1]; b = vd[i + 2]; lum = lv; }
        }

        const lumN = lum / 255; // normalise to 0–1
        const sat  = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

        // Cloud: bright AND low-saturation (white/grey).  Snow/ice match too — intentional.
        const cloud = (lumN > 0.60 && sat < 0.22)
            ? Math.pow((lumN - 0.60) / 0.40, 0.65)
            : 0;

        out[i]     = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = Math.min(255, Math.round(cloud * 235));
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width  = W;
    outCanvas.height = H;
    outCanvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
    return new THREE.CanvasTexture(outCanvas);
}

// Add realistic water, clouds, and atmosphere effects
async function addRealisticEffects() {
    try {
        console.log('🔍 Starting addRealisticEffects...');
        console.log('Globe object exists:', !!globe);
        
        // Load THREE.js if not available
        const THREE = await loadTHREE();
        
        const scene = globe.scene();
        console.log('Scene:', scene);
        console.log('Scene children count:', scene.children.length);
        console.log('Scene children types:', scene.children.map(c => c.type));
        
        const globeObj = scene.children.find(obj => obj.type === 'Group');
        
        if (!globeObj) {
            console.error('❌ Globe Group object not found in scene');
            console.log('Available objects:', scene.children);
            return;
        }
        
        console.log('✅ Globe Group found');
        console.log('Globe Group children count:', globeObj.children.length);
        console.log('Globe Group children types:', globeObj.children.map(c => ({ type: c.type, name: c.name })));
        
        console.log('🌊 Adding realistic water and atmosphere effects...');
        
        // 1. ENHANCE WATER WITH SUBTLE SPECULAR HIGHLIGHTS
        // Find the globe mesh and enhance its material
        const globeMesh = globeObj.children.find(obj => obj.type === 'Mesh' && obj.material);
        if (globeMesh && globeMesh.material) {
            const material = globeMesh.material;
            
            // Add water-like specular reflection (subtle)
            material.shininess = 20;  // Moderate shininess for realistic water
            material.specular = new THREE.Color(0x6699cc);  // Softer blue specular highlight
            
            // Increase bump scale for more pronounced terrain
            material.bumpScale = 12;
            
            // Disable emissive to reduce overall brightness
            material.emissive = new THREE.Color(0x000000);
            material.emissiveIntensity = 0;
            
            console.log('✅ Water specularity enhanced: shininess=20, specular=0x6699cc');
        } else {
            console.warn('⚠️ Globe mesh not found for water enhancement');
        }
        
        // 2. CREATE ANIMATED CLOUD LAYER
        // Starts immediately with a procedural texture so the globe is never bare.
        // In the background, loadGIBSCloudMask() fetches today's MODIS satellite image,
        // extracts real cloud positions via luminance/saturation analysis, and swaps
        // the texture in once it's ready — no page reload required.
        const cloudGeometry = new THREE.SphereGeometry(100.3, 128, 128);

        // MeshBasicMaterial + AdditiveBlending: the only blending mode that is
        // mathematically guaranteed to never darken the underlying globe.
        // Additive blend equation: final = src_color * src_alpha + dst_color * 1
        // → where cloud alpha = 0, contribution is exactly 0 — no darkening from data gaps.
        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: createCloudTexture(),  // procedural placeholder while GIBS loads
            transparent: true,
            opacity: 0.50,
            depthWrite: false,
            depthTest: true,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending
        });

        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudMesh.name = 'clouds';
        cloudMesh.visible = settings.showClouds;
        cloudMesh.renderOrder = 100;
        globeObj.add(cloudMesh);

        // Animate clouds rotation — slow and gentle
        let cloudRotationSpeed = 0.00008;
        function animateClouds() {
            if (cloudMesh && cloudMesh.visible) {
                cloudMesh.rotation.y += cloudRotationSpeed;
                cloudMesh.rotation.z += cloudRotationSpeed * 0.05;
            }
            requestAnimationFrame(animateClouds);
        }
        animateClouds();

        console.log('☁️ Cloud layer active — upgrading to NASA GIBS satellite data…');

        // Async upgrade: swap procedural texture for real satellite cloud mask
        loadGIBSCloudMask(THREE)
            .then(satelliteTexture => {
                if (cloudMesh) {
                    cloudMesh.material.map = satelliteTexture;
                    // Satellite mask carries its own per-pixel alpha; keep opacity moderate
                    // with AdditiveBlending so clouds brighten (never darken) the globe
                    cloudMesh.material.opacity = 0.72;
                    cloudMesh.material.needsUpdate = true;
                    console.log('✅ NASA GIBS cloud texture active — Terra + Aqua + VIIRS composite');
                }
            })
            .catch(err => {
                console.log('ℹ️ NASA GIBS unavailable (' + err.message + ') — using procedural clouds');
            });
        
        // 3. ADD ATMOSPHERIC GLOW LAYERS (REDUCED INTENSITY)
        // Inner glow - subtle
        const glowGeometry1 = new THREE.SphereGeometry(102, 64, 64);
        const glowMaterial1 = new THREE.ShaderMaterial({
            uniforms: {
                c: { value: 0.1 },  // Reduced from 0.2
                p: { value: 8.0 }   // Increased for more falloff
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float c;
                uniform float p;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
                    gl_FragColor = vec4(0.3, 0.7, 1.0, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const innerGlow = new THREE.Mesh(glowGeometry1, glowMaterial1);
        innerGlow.name = 'innerGlow';
        globeObj.add(innerGlow);
        
        // Outer glow - very subtle
        const glowGeometry2 = new THREE.SphereGeometry(105, 64, 64);
        const glowMaterial2 = new THREE.ShaderMaterial({
            uniforms: {
                c: { value: 0.08 },  // Reduced from 0.15
                p: { value: 5.0 }    // Increased for more falloff
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float c;
                uniform float p;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
                    gl_FragColor = vec4(0.2, 0.5, 1.0, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const outerGlow = new THREE.Mesh(glowGeometry2, glowMaterial2);
        outerGlow.name = 'outerGlow';
        globeObj.add(outerGlow);
        
        console.log('✅ Atmospheric glow layers added');
        
        // 4. ADD BALANCED LIGHTING FOR WATER REFLECTION
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);  // Reduced from 0.6
        scene.add(ambientLight);
        
        // Main directional light (like the sun) - reduced intensity
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);  // Reduced from 1.2
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);
        
        // Add a subtle second light from the opposite side
        const directionalLight2 = new THREE.DirectionalLight(0x4f6ef7, 0.15);
        directionalLight2.position.set(-5, -2, -5);
        scene.add(directionalLight2);
        
        console.log('✅ Balanced lighting added (reduced intensity)');
        console.log('🌍 Realistic effects complete! Water shimmer, clouds, and atmosphere active.');
        
    } catch (error) {
        console.error('❌ Error adding realistic effects:', error);
    }
}

// Create procedural cloud texture
function createCloudTexture() {
    console.log('🎨 Generating cloud texture...');
    const canvas = document.createElement('canvas');
    canvas.width = 2048;  // Higher resolution
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Create a transparent base
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw MUCH more clouds with higher density
    const cloudLayers = [
        { count: 400, radiusMin: 40, radiusMax: 100, alpha: 1.0 },  // Dense base layer
        { count: 300, radiusMin: 25, radiusMax: 70, alpha: 0.9 },   // Medium layer
        { count: 200, radiusMin: 15, radiusMax: 40, alpha: 0.8 }    // Detail layer
    ];
    
    cloudLayers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * (layer.radiusMax - layer.radiusMin) + layer.radiusMin;
            const opacity = (Math.random() * 0.2 + 0.8) * layer.alpha;  // Higher base opacity
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            gradient.addColorStop(0.4, `rgba(255, 255, 255, ${opacity * 0.7})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Add some extra bright spots for variety
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 60 + 40;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const THREE = window.THREE;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    console.log('✅ Cloud texture generated (2048x1024) with high density');
    return texture;
}

// Initialize the application
function init() {
    console.log('Initializing Global News Globe...');
    console.log('Globe function available:', typeof Globe !== 'undefined');
    console.log(`📰 NewsData.io supports ${SUPPORTED_COUNTRIES} countries - Better global coverage! 🌍`);
    createGlobe();
    loadCountryData();
    setupEventListeners();
    setupRadioMode();
    setupSettings();
    checkAPIKey();
    console.log('Initialization complete');
    console.log('🎵 Radio mode ready! Toggle between News and Radio modes.');
}

// Check if API key is configured
function checkAPIKey() {
    if (CONFIG.NEWS_API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Please configure your NewsData.io key in app.js. Get a free key at https://newsdata.io/');
    }
}

// Create the 3D globe
function createGlobe() {
    console.log('Creating globe...');
    const container = document.getElementById('globe-container');
    
    if (!container) {
        console.error('Globe container not found!');
        return;
    }
    
    globe = Globe()
        (container)
        .globeImageUrl('https://unpkg.com/three-globe@2.27.1/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe@2.27.1/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe@2.27.1/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('#4f6ef7')
        .atmosphereAltitude(0.14)
        .width(window.innerWidth)
        .height(window.innerHeight)
        .enablePointerInteraction(true); // Explicitly enable pointer interaction
    
    console.log('Globe created successfully');
    
    // Auto-rotate
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = CONFIG.AUTO_ROTATE_SPEED;
    globe.controls().enablePan = false;
    globe.controls().minDistance = 150;
    globe.controls().maxDistance = 500;
    
    // Add realistic water, clouds, and atmosphere after a delay to ensure Three.js is loaded
    setTimeout(() => {
        console.log('⏰ Timeout reached, attempting to add realistic effects...');
        addRealisticEffects();
    }, 2000);
    
    // Set initial camera position
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

    // Debug scene info
    setTimeout(() => {
        const scene = globe.scene();
        const camera = globe.camera();
        const renderer = globe.renderer();
        console.log('🎬 Scene objects:', scene.children.length);
        console.log('📷 Camera:', camera.type);
        console.log('🎨 Renderer:', renderer ? 'OK' : 'Missing');
        console.log('✅ Globe controls configured - clicking should work!');
    }, 1000);
}

// Load country polygons data
async function loadCountryData() {
    try {
        console.log('Fetching country data...');
        const response = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson');
        const countries = await response.json();
        
        console.log(`Loaded ${countries.features.length} countries`);
        
        console.log('🔧 Configuring polygon interactions...');
        console.log('📊 Countries to configure:', countries.features.length);
        
        // Test click handler
        const testClickHandler = (polygon, event, coords) => {
            console.log('🎯 CLICK EVENT FIRED!');
            console.log('  - Polygon:', polygon ? polygon.properties.ADMIN : 'null');
            console.log('  - Event:', event ? event.type : 'null');
            console.log('  - Coords:', coords);
            handlePolygonClick(polygon, event);
        };
        
        // Test hover handler  
        const testHoverHandler = (polygon, prevPolygon) => {
            if (polygon) {
                console.log('👆 Hover detected:', polygon.properties.ADMIN);
            }
            handlePolygonHover(polygon);
        };
        
                // Helper to check if country has news
                const hasNews = (feat) => COUNTRY_CODES[feat.properties.ISO_A2] !== undefined;
        
        globe
            .polygonsData(countries.features)
                    .polygonCapColor(feat => {
                        if (feat === hoveredCountry) return CONFIG.COLORS.hover;
                        return hasNews(feat) ? 'rgba(79, 110, 247, 0.55)' : CONFIG.COLORS.land;
                    })
                    .polygonSideColor((feat) => {
                        return hasNews(feat) ? 'rgba(79, 110, 247, 0.75)' : 'rgba(255, 255, 255, 0.3)';
                    })
                    .polygonStrokeColor((feat) => {
                        return hasNews(feat) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
                    })
                    .polygonAltitude(feat => {
                        // More pronounced elevation for hover with pulse effect
                        if (feat === hoveredCountry) return 0.05;
                        // Slight elevation for supported countries
                        return hasNews(feat) ? 0.015 : 0.01;
                    })
                    .polygonsTransitionDuration(300)
            .polygonLabel((feat) => {
                const hasNewsData = hasNews(feat);
                const countryCode = feat.properties.ISO_A2;
                const hasGuaranteedRadio = FALLBACK_STATIONS[countryCode] !== undefined;
                
                // Determine message based on current mode
                let message = '';
                let borderColor = '#4facfe';
                let textColor = '#4facfe';
                
                if (currentMode === 'radio') {
                    message = hasGuaranteedRadio ? 'Click for radio' : 'Click for radio';
                    borderColor = 'rgba(79,110,247,0.5)';
                    textColor = '#7b94fa';
                } else {
                    if (hasNewsData) {
                        message = 'Click for news';
                        borderColor = 'rgba(79,110,247,0.5)';
                        textColor = '#7b94fa';
                    } else {
                        message = 'No news data';
                        borderColor = 'rgba(245,158,11,0.4)';
                        textColor = '#f59e0b';
                    }
                }

                return `
                    <div style="background: rgba(11,17,32,0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid ${borderColor}; font-family: Inter, sans-serif;">
                        <div style="color: #f0f2f8; font-weight: 600; font-size: 13px; letter-spacing: -0.01em;">${feat.properties.ADMIN}</div>
                        <div style="color: ${textColor}; font-size: 11px; margin-top: 3px;">${message}</div>
                    </div>
                `;
            })
            .onPolygonHover(testHoverHandler)
            .onPolygonClick(testClickHandler);
        
        console.log('✅ Polygon click handler attached with debugging!');
        
        // Store all countries for search
        allCountries = countries.features;
        
        // Setup enhanced search with autocomplete
        setupEnhancedSearch();
        
        console.log('✅ Enhanced search enabled with regions, autocomplete, and voice!');
        
        // Add permanent country labels
        const labelData = countries.features.map(feat => ({
            lat: feat.properties.LABEL_Y || 0,
            lng: feat.properties.LABEL_X || 0,
            name: feat.properties.NAME || feat.properties.ADMIN,
            code: feat.properties.ISO_A2
        }));
        
        globe
            .labelsData(labelData)
            .labelLat(d => d.lat)
            .labelLng(d => d.lng)
            .labelText(d => d.name)
            .labelSize(0.5)
            .labelDotRadius(0)
            .labelColor(() => 'rgba(255, 255, 255, 0.9)')
            .labelResolution(2);
            
        console.log('Country polygons configured successfully');
        console.log('✅ Countries are clickable! Click any country to see news.');
        console.log('💡 Tip: Hover to see country names, Click to see news headlines');
        
        // Test if polygons are actually there
        setTimeout(() => {
            console.log('Current polygon count:', globe.polygonsData().length);
            console.log('🔍 Try clicking on the colored country areas!');
        }, 2000);
        
        // Implement custom click detection as workaround
        const globeContainer = document.getElementById('globe-container');
        let clickEnabled = true;
        let mouseDownPos = { x: 0, y: 0 };
        
        globeContainer.addEventListener('mousedown', (e) => {
            clickEnabled = true;
            mouseDownPos = { x: e.clientX, y: e.clientY };
        });
        
        globeContainer.addEventListener('mousemove', (e) => {
            // Only disable if dragged more than 5 pixels
            if (clickEnabled) {
                const dx = e.clientX - mouseDownPos.x;
                const dy = e.clientY - mouseDownPos.y;
                if (Math.sqrt(dx*dx + dy*dy) > 5) {
                    clickEnabled = false;
                }
            }
        });
        
        globeContainer.addEventListener('mouseup', (event) => {
            if (!clickEnabled) return;
            
            console.log('🖱️ Click detected! Getting country at cursor...');
            
            // Use Globe.gl's built-in method to get lat/lng from screen coords
            const coords = globe.toGlobeCoords(event.clientX, event.clientY);
            
            if (coords && coords.lat !== undefined && coords.lng !== undefined) {
                console.log('📍 Clicked coordinates:', coords);
                
                // Find which country contains these coordinates
                const polygons = globe.polygonsData();
                const clickedCountry = findCountryAtCoords(polygons, coords.lat, coords.lng);
                
                        if (clickedCountry) {
                            console.log('✅ Found country:', clickedCountry.properties.ADMIN);
                            const countryName = clickedCountry.properties.ADMIN;
                            const countryCode = clickedCountry.properties.ISO_A2;

                            currentCountry = {
                                name: countryName,
                                code: countryCode
                            };

                            showNewsPopup(countryName);
                            
                            // Check mode and fetch accordingly
                            if (currentMode === 'radio') {
                                fetchRadioStations(countryName);
                            } else {
                                fetchNews(countryCode, countryName);
                            }
                        } else {
                            console.log('❌ No country found at these coordinates (might be ocean)');
                        }
                    }
                });
            
    } catch (error) {
        console.error('Error loading country data:', error);
        showError('Failed to load country data. Please check your internet connection.');
    }
}

// Handle polygon hover
function handlePolygonHover(polygon) {
    hoveredCountry = polygon;
    
    const countryLabel = document.getElementById('country-label');
    
    if (polygon) {
        const countryName = polygon.properties.ADMIN;
        console.log('Country hovered:', countryName);
        
        // Show country name label
        countryLabel.textContent = countryName;
        countryLabel.classList.remove('hidden');
    } else {
        // Hide country name label when not hovering
        countryLabel.classList.add('hidden');
    }
    
    // Update polygon appearance - must update all properties to keep borders
    const hasNews = (feat) => COUNTRY_CODES[feat.properties.ISO_A2] !== undefined;
    
    globe
        .polygonCapColor(feat => {
            if (feat === hoveredCountry) return CONFIG.COLORS.hover;
            return hasNews(feat) ? 'rgba(79, 110, 247, 0.55)' : CONFIG.COLORS.land;
        })
        .polygonSideColor((feat) => {
            return hasNews(feat) ? 'rgba(79, 110, 247, 0.75)' : 'rgba(255, 255, 255, 0.3)';
        })
        .polygonStrokeColor((feat) => {
            return hasNews(feat) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
        })
        .polygonAltitude(feat => {
            if (feat === hoveredCountry) return 0.05;
            return hasNews(feat) ? 0.015 : 0.01;
        });
    
    // Change cursor
    document.body.style.cursor = polygon ? 'pointer' : 'default';
}

// Handle polygon click
function handlePolygonClick(polygon, event) {
    console.log('🖱️ Click detected!', polygon ? 'Country: ' + polygon.properties.ADMIN : 'No country');

    if (!polygon) {
        console.log('❌ No polygon clicked');
        return;
    }
    
    const countryName = polygon.properties.ADMIN;
    const countryCode = polygon.properties.ISO_A2;

    console.log('✅ Country clicked:', countryName, 'Code:', countryCode);
    
    currentCountry = {
        name: countryName,
        code: countryCode
    };
    
    // Check current mode and fetch accordingly
    if (currentMode === 'radio') {
        console.log('📻 Loading radio stations for:', countryName);
        showNewsPopup(countryName);
        fetchRadioStations(countryName);
    } else {
        console.log('📰 Loading news and weather for:', countryName);
        showNewsPopup(countryName);
        // Fetch both news and weather simultaneously
        Promise.all([
            fetchNews(countryCode, countryName),
            fetchWeather(countryName)
        ]);
    }
}

// Show news popup with skeleton screen
function showNewsPopup(countryName) {
    console.log('📰 Showing popup for:', countryName);
    const popup = document.getElementById('news-popup');
    const countryNameElement = document.getElementById('country-name');
    const newsContent = document.getElementById('news-content');

    if (!countryNameElement) {
        console.error('Country name element not found!');
        return;
    }
    
    countryNameElement.textContent = countryName;
    
    // Show skeleton screens while loading
    newsContent.innerHTML = `
        <div class="skeleton-container">
            ${[1, 2, 3].map(() => `
                <div class="skeleton-item">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text">
                        <div class="skeleton-line title"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    popup.classList.remove('hidden');
    
    console.log('✅ Popup displayed with skeleton screens');
}

// Hide news popup
function hideNewsPopup() {
    console.log('🔒 Closing popup');
    const popup = document.getElementById('news-popup');
    popup.classList.add('hidden');
    currentCountry = null;
    
    // Clear any error timeout and hide error messages
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.classList.add('hidden');
        errorElement.textContent = '';
    }
    
    console.log('✅ Popup closed, ready for next country');
}

// Fetch weather for a country
async function fetchWeather(countryName) {
    console.log(`🌤️ Fetching weather for ${countryName}`);
    
    // Check cache first
    if (weatherCache[countryName]) {
        console.log('✅ Using cached weather');
        return weatherCache[countryName];
    }
    
    try {
        const url = `${CONFIG.WEATHER_API_URL}?key=${CONFIG.WEATHER_API_KEY}&q=${encodeURIComponent(countryName)}&aqi=no`;
        console.log(`🌐 Calling WeatherAPI for: ${countryName}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.current) {
            console.log(`✅ Got weather for ${countryName}`);
            weatherCache[countryName] = data;
            return data;
        } else {
            console.log(`⚠️ No weather data found`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching weather:', error);
        return null;
    }
}

// Fetch news for a country
async function fetchNews(countryCode, countryName) {
    console.log(`📰 Fetching news for ${countryName} (${countryCode})`);
    
    // Check cache first
    if (newsCache[countryCode]) {
        console.log('✅ Using cached news');
        displayNews(newsCache[countryCode]);
        return;
    }
    
    const newsApiCode = COUNTRY_CODES[countryCode];
    
    if (!newsApiCode) {
        console.log(`❌ ${countryName} not supported by NewsData.io (code: ${countryCode})`);
        displayNoNews(countryName, 'NewsData.io does not support this country yet', true);
        return;
    }
    
    if (CONFIG.NEWS_API_KEY === 'YOUR_API_KEY_HERE') {
        displayNoNews(countryName, 'Please configure your NewsData.io API key to see news headlines', false);
        return;
    }
    
    try {
        // NewsData.io API format: ?apikey=xxx&country=us&size=3&language=en
        const url = `${CONFIG.NEWS_API_URL}?apikey=${CONFIG.NEWS_API_KEY}&country=${newsApiCode}&size=${settings.newsCount}&language=en`;
        console.log(`🌐 Calling NewsData.io for country code: ${newsApiCode} (requesting ${settings.newsCount} articles)`);
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📦 API Response:', data);

        // NewsData.io uses 'results' instead of 'articles' and 'success' status
        if (data.status === 'success' && data.results && data.results.length > 0) {
            console.log(`✅ Got ${data.results.length} articles for ${countryName}`);
            newsCache[countryCode] = data.results;
            displayNews(data.results);
        } else {
            console.log(`⚠️ No articles found: ${data.message || 'Unknown reason'}`);
            displayNoNews(countryName, data.message || 'No recent news available', false);
        }
    } catch (error) {
        console.error('❌ Error fetching news:', error);
        displayNoNews(countryName, 'Failed to fetch news. Please try again.', false);
    }
}

// Display news articles
async function displayNews(articles) {
    const newsContent = document.getElementById('news-content');

    // Hide the radio station search bar when showing news content
    const searchBar = document.getElementById('radio-station-search');
    if (searchBar) searchBar.classList.add('hidden');

    if (!articles || articles.length === 0) {
        displayNoNews('', 'No news articles found');
        return;
    }
    
    // Get weather data for current country
    let weatherHTML = '';
    if (currentCountry && currentCountry.name) {
        const weatherData = await fetchWeather(currentCountry.name);
        if (weatherData && weatherData.current) {
            const w = weatherData.current;
            const loc = weatherData.location;
            const temp = getTemperature(w.temp_c);
            const feelsLike = getTemperature(w.feelslike_c);
            const windSpeed = settings.tempUnit === 'F' ? Math.round(w.wind_mph) + ' mph' : Math.round(w.wind_kph) + ' km/h';
            const visibility = settings.tempUnit === 'F' ? Math.round(w.vis_miles) + ' mi' : Math.round(w.vis_km) + ' km';
            
            weatherHTML = `
                <div class="weather-widget">
                    <div class="weather-header">
                        <span class="weather-location">${loc.name}, ${loc.country}</span>
                    </div>
                    <div class="weather-main">
                        <img src="https:${w.condition.icon}" alt="${w.condition.text}" class="weather-icon">
                        <div class="weather-temp">
                            <span class="temp-value">${temp.value}${temp.unit}</span>
                            <span class="temp-feels">Feels like ${feelsLike.value}${feelsLike.unit}</span>
                        </div>
                        <div class="weather-condition">${w.condition.text}</div>
                    </div>
                    <div class="weather-details">
                        <div class="weather-detail">Wind ${windSpeed}</div>
                        <div class="weather-detail">Humidity ${w.humidity}%</div>
                        <div class="weather-detail">Visibility ${visibility}</div>
                    </div>
                </div>
                <div class="news-divider"></div>
            `;
        }
    }
    
    // NewsData.io response format uses: link, pubDate, source_id, image_url
    const newsHTML = articles.map(article => `
        <div class="news-item">
            ${settings.showImages && article.image_url ? `
                <div class="news-image">
                    <img src="${article.image_url}" alt="${escapeHtml(article.title)}"
                         onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            <div class="news-text">
                <h3>${escapeHtml(article.title)}</h3>
                ${article.description ? `<p>${escapeHtml(article.description)}</p>` : ''}
                <div class="news-source">${article.source_id || 'Unknown Source'} &middot; ${formatDate(article.pubDate || article.publishedAt)}</div>
                <a href="${article.link || article.url}" target="_blank" rel="noopener noreferrer">Read article &rarr;</a>
            </div>
        </div>
    `).join('');
    
    newsContent.innerHTML = weatherHTML + newsHTML;
}

// Display no news message
function displayNoNews(countryName, message, isUnsupported = false) {
    const newsContent = document.getElementById('news-content');
    
    if (isUnsupported) {
        newsContent.innerHTML = `
            <div class="no-news">
                <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${countryName}</p>
                <p style="color: var(--warning, #f59e0b); margin-bottom: 12px;">${message}</p>
                <p style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted, #4b5567);">
                    Coverage spans <strong>${SUPPORTED_COUNTRIES} countries</strong> including much of Africa and Asia.<br>
                    Try: US, UK, Canada, Australia, France, Germany, Japan, India, Brazil, Kenya, or Vietnam.
                </p>
            </div>
        `;
    } else {
        newsContent.innerHTML = `
            <div class="no-news">
                <p>${message}</p>
                ${countryName ? `<p style="color: var(--text-muted, #4b5567);">No recent news found for ${countryName}.</p>` : ''}
            </div>
        `;
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Clear any existing timeout
    if (errorTimeout) {
        clearTimeout(errorTimeout);
    }
    
    // Set new timeout to auto-hide
    errorTimeout = setTimeout(() => {
        errorElement.classList.add('hidden');
        errorTimeout = null;
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Setup event listeners
function setupEventListeners() {
    // Close popup button
    document.getElementById('close-popup').addEventListener('click', hideNewsPopup);
    
    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('news-popup').classList.contains('hidden')) {
            hideNewsPopup();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (globe) {
            globe.width(window.innerWidth);
            globe.height(window.innerHeight);
        }
    });
    
    // Close popup when clicking outside
    document.getElementById('news-popup').addEventListener('click', (e) => {
        if (e.target.id === 'news-popup') {
            hideNewsPopup();
        }
    });
}

// Setup enhanced search with autocomplete, regions, and voice
function setupEnhancedSearch() {
    const searchInput = document.getElementById('search-input');
    const regionFilter = document.getElementById('region-filter');
    const voiceBtn = document.getElementById('voice-search-btn');
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    // Get region name for a country code
    function getCountryRegion(countryCode) {
        for (const [region, codes] of Object.entries(REGIONS)) {
            if (codes.includes(countryCode)) {
                return region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ');
            }
        }
        return 'Other';
    }
    
    // Filter countries by region and search term
    function getFilteredCountries(searchTerm = '') {
        let filtered = allCountries;
        
        // Filter by region if selected
        if (currentRegion) {
            const regionCodes = REGIONS[currentRegion];
            filtered = filtered.filter(f => regionCodes.includes(f.properties.ISO_A2));
        }
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(f => 
                f.properties.ADMIN.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }
    
    // Show autocomplete suggestions
    function showSuggestions(searchTerm) {
        const filtered = getFilteredCountries(searchTerm);

        // Require 2 chars to search globally, but show immediately when a region is chosen
        const tooShort = searchTerm.length < 2 && !currentRegion;
        if (filtered.length === 0 || tooShort) {
            suggestionsContainer.classList.add('hidden');
            return;
        }
        
        // Limit to top 8 suggestions
        const suggestions = filtered.slice(0, 8);
        
        suggestionsContainer.innerHTML = suggestions.map(country => {
            const hasNews = COUNTRY_CODES[country.properties.ISO_A2] !== undefined;
            const region = getCountryRegion(country.properties.ISO_A2);
            
            return `
                <div class="suggestion-item" data-country="${country.properties.ADMIN}" data-code="${country.properties.ISO_A2}">
                    <span class="suggestion-country">${country.properties.ADMIN}</span>
                    <span class="suggestion-region">${region}${hasNews ? '' : ' · no data'}</span>
                </div>
            `;
        }).join('');
        
        suggestionsContainer.classList.remove('hidden');
        
        // Add click handlers to suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                selectCountry(item.dataset.country, item.dataset.code);
            });
        });
    }
    
    // Select a country from search
    function selectCountry(countryName, countryCode) {
        console.log('🔍 Country selected via search:', countryName);
        
        currentCountry = {
            name: countryName,
            code: countryCode
        };
        
        showNewsPopup(countryName);
        
        // Check mode and fetch accordingly
        if (currentMode === 'radio') {
            fetchRadioStations(countryName);
        } else {
            fetchNews(countryCode, countryName);
        }
        
        // Clear search and hide suggestions
        searchInput.value = '';
        suggestionsContainer.classList.add('hidden');
    }
    
    // Handle search input
    searchInput.addEventListener('input', (e) => {
        showSuggestions(e.target.value);
    });
    
    // Handle Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value) {
            const country = allCountries.find(f => 
                f.properties.ADMIN.toLowerCase() === searchInput.value.toLowerCase()
            );
            if (country) {
                selectCountry(country.properties.ADMIN, country.properties.ISO_A2);
            }
        }
    });
    
    // Handle region filter — show matching countries immediately, no typing required
    regionFilter.addEventListener('change', (e) => {
        currentRegion = e.target.value;
        console.log('🗺️ Region filter:', currentRegion || 'All');
        showSuggestions(searchInput.value);
        if (currentRegion) searchInput.focus();
    });
    
    // Voice search functionality
    voiceBtn.addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice search is not supported in your browser. Please try Chrome or Edge.');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            voiceBtn.classList.add('listening');
            console.log('🎤 Listening...');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('🎤 Heard:', transcript);
            
            searchInput.value = transcript;
            showSuggestions(transcript);
        };
        
        recognition.onerror = (event) => {
            console.error('🎤 Voice recognition error:', event.error);
            voiceBtn.classList.remove('listening');
        };
        
        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
            console.log('🎤 Stopped listening');
        };
        
        recognition.start();
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.add('hidden');
        }
    });
}

// Setup radio mode functionality
// Search the global Radio Browser catalogue by station name
async function searchRadioStationsByName(query) {
    const newsContent = document.getElementById('news-content');
    newsContent.innerHTML = '<div class="loading">Searching stations…</div>';

    try {
        const apiUrl =
            'https://all.api.radio-browser.info/json/stations/search' +
            '?name=' + encodeURIComponent(query) +
            '&limit=20&hidebroken=true&order=votes&reverse=true';
        const corsProxy = 'https://corsproxy.io/?';
        const response = await fetch(corsProxy + encodeURIComponent(apiUrl));

        if (!response.ok) throw new Error('HTTP ' + response.status);

        const stations = await response.json();
        const valid = stations.filter(s => s.url_resolved && s.name);

        if (valid.length === 0) {
            newsContent.innerHTML = `
                <div class="no-data-state">
                    <p class="no-data-title">No stations found</p>
                    <p class="no-data-sub">Try a different search term</p>
                </div>`;
            return;
        }

        // displayRadioStations will use station.country from each result
        displayRadioStations(valid, '');
    } catch (err) {
        newsContent.innerHTML = `
            <div class="no-data-state">
                <p class="no-data-title">Search failed</p>
                <p class="no-data-sub">${escapeHtml(err.message)}</p>
            </div>`;
    }
}

// Attach search bar behaviour (called once from setupRadioMode)
function setupRadioStationSearch() {
    const input    = document.getElementById('station-search-input');
    const clearBtn = document.getElementById('station-search-clear');
    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearBtn.classList.toggle('hidden', q.length === 0);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (q.length >= 2) {
                searchRadioStationsByName(q);
            } else if (q.length === 0) {
                // Restore the current country's station list
                const name = currentCountry ? currentCountry.name : null;
                if (name && radioStationsCache[name]) {
                    displayRadioStations(radioStationsCache[name], name);
                } else if (name) {
                    fetchRadioStations(name);
                }
            }
        }, 300);
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.add('hidden');
        const name = currentCountry ? currentCountry.name : null;
        if (name && radioStationsCache[name]) {
            displayRadioStations(radioStationsCache[name], name);
        } else if (name) {
            fetchRadioStations(name);
        }
        input.focus();
    });
}

function setupRadioMode() {
    const newsModeBtn = document.getElementById('news-mode-btn');
    const radioModeBtn = document.getElementById('radio-mode-btn');
    
    // Initialize audio player
    audioPlayer = new Audio();
    audioPlayer.volume = 0.7;

    // Wire up the in-panel station search bar
    setupRadioStationSearch();
    
    // Mode toggle handlers
    newsModeBtn.addEventListener('click', () => {
        currentMode = 'news';
        newsModeBtn.classList.add('active');
        radioModeBtn.classList.remove('active');
        // Don't stop the audio — radio keeps playing as a background player
        // Only hide the news popup so the globe is unobstructed
        hideNewsPopup();
        
        // Refresh polygon labels to show news-related messages
        if (globe && globe.polygonsData()) {
            globe.polygonsData(globe.polygonsData());
        }
        
        console.log('🔄 Switched to NEWS mode (radio continues in background)');
    });
    
    radioModeBtn.addEventListener('click', () => {
        currentMode = 'radio';
        radioModeBtn.classList.add('active');
        newsModeBtn.classList.remove('active');
        // subtitle element is hidden; no display update needed
        hideNewsPopup(); // This now also clears error messages
        
        // Refresh polygon labels to show radio-related messages
        if (globe && globe.polygonsData()) {
            globe.polygonsData(globe.polygonsData());
        }
        
        console.log('🔄 Switched to RADIO mode 🎵');
    });
    
    // Player controls
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-radio-btn');
    const volumeSlider = document.getElementById('volume-slider');
    
    const SVG_PLAY  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    const SVG_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.innerHTML = SVG_PAUSE;
        } else {
            audioPlayer.pause();
            playPauseBtn.innerHTML = SVG_PLAY;
        }
    });

    stopBtn.addEventListener('click', () => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        playPauseBtn.innerHTML = SVG_PLAY;
        hideRadioPlayer();
    });
    
    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
        updateVolumeIcon(e.target.value);
    });
    
    // Audio player event listeners
    audioPlayer.addEventListener('play', () => {
        playPauseBtn.innerHTML = SVG_PAUSE;
    });

    audioPlayer.addEventListener('pause', () => {
        playPauseBtn.innerHTML = SVG_PLAY;
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('❌ Radio stream error:', e);
        showError('Unable to play this station. Trying next available stream...');
    });
    
    console.log('🎵 Radio mode initialized!');
}

// Update volume icon based on level (icon is now a static SVG in HTML)
function updateVolumeIcon(volume) {
    const volumeLabel = document.getElementById('volume-label');
    if (!volumeLabel) return;
    // Adjust opacity to indicate level
    volumeLabel.style.opacity = volume == 0 ? '0.3' : volume < 30 ? '0.6' : '1';
}

// Fetch radio stations for a country
async function fetchRadioStations(countryName) {
    console.log(`📻 Fetching radio stations for ${countryName}`);
    console.log(`🔍 currentCountry at fetch:`, currentCountry);
    
    // Check cache first
    if (radioStationsCache[countryName]) {
        console.log('✅ Using cached radio stations');
        displayRadioStations(radioStationsCache[countryName], countryName);
        return;
    }
    
    // Try to get country code from mapping
    let countryCode = RADIO_COUNTRY_CODES[countryName];
    console.log(`🔍 countryCode from RADIO_COUNTRY_CODES:`, countryCode);
    
    // If not found, try to get from current country object
    if (!countryCode && currentCountry && currentCountry.code) {
        countryCode = currentCountry.code;
        console.log(`🔍 Using ISO code from current country: ${countryCode}`);
    }
    
    if (!countryCode) {
        console.log(`❌ No country code found for: ${countryName}`);
        console.log(`❌ currentCountry was:`, currentCountry);
        displayNoRadio(countryName);
        return;
    }
    
    console.log(`✅ Will fetch radio for country code: ${countryCode}`);
    
    try {
        // Using Radio Browser API - free and open source
        // Using CORS proxy to bypass browser CORS restrictions
        const apiUrl = `https://all.api.radio-browser.info/json/stations/bycountrycodeexact/${countryCode}?limit=50&order=votes&reverse=true&hidebroken=true`;
        const corsProxy = 'https://corsproxy.io/?';
        const url = corsProxy + encodeURIComponent(apiUrl);
        
        console.log(`🌐 Calling Radio Browser API for: ${countryCode}`);
        console.log(`📡 Using CORS proxy`);
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stations = await response.json();
        
        console.log(`📊 API returned ${stations ? stations.length : 0} stations`);
        
        if (stations && stations.length > 0) {
            console.log(`✅ Found ${stations.length} radio stations for ${countryName}`);
            
            // Filter and validate stations
            const validStations = stations.filter(s => {
                const hasUrl = s.url_resolved && s.url_resolved.length > 0;
                const hasName = s.name && s.name.length > 0;
                return hasUrl && hasName;
            });
            
            console.log(`✅ Valid stations with URLs: ${validStations.length}`);
            
            if (validStations.length > 0) {
                radioStationsCache[countryName] = validStations.slice(0, 15); // Keep top 15
                displayRadioStations(radioStationsCache[countryName], countryName);
            } else {
                console.log(`⚠️ No valid streaming URLs found`);
                displayNoRadio(countryName, 'Stations found but no valid streams');
            }
        } else {
            console.log(`⚠️ No radio stations found for ${countryName}`);
            displayNoRadio(countryName, `No stations available for ${countryCode}`);
        }
    } catch (error) {
        console.error('❌ Error details:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        
        // If CORS proxy failed, try fallback stations before showing error
        if (currentCountry && FALLBACK_STATIONS[currentCountry.code]) {
            console.log(`⚠️ API failed, but we have fallback stations for ${currentCountry.code}`);
            displayRadioStations(FALLBACK_STATIONS[currentCountry.code], countryName);
            return;
        }
        
        // Provide more specific error message
        let errorMsg = 'Failed to fetch radio stations from API';
        if (error.message.includes('Failed to fetch')) {
            errorMsg = 'Could not reach radio API - showing available stations';
        } else if (error.message.includes('CORS')) {
            errorMsg = 'API access restricted';
        }
        
        displayNoRadio(countryName, errorMsg);
    }
}

// Display radio stations in popup
function displayRadioStations(stations, countryName) {
    const newsContent = document.getElementById('news-content');

    // Show the station search bar whenever we're in radio mode
    const searchBar = document.getElementById('radio-station-search');
    if (searchBar) searchBar.classList.remove('hidden');

    if (!stations || stations.length === 0) {
        displayNoRadio(countryName);
        return;
    }

    const stationsHTML = stations.map(station => `
        <div class="radio-station-item" data-station='${JSON.stringify({
            name: station.name,
            url: station.url_resolved,
            country: station.country || countryName
        })}'>
            <div class="station-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
            </div>
            <div class="radio-station-info">
                <div class="radio-station-name">${escapeHtml(station.name)}</div>
                <div class="radio-station-tags">${station.tags ? escapeHtml(station.tags).slice(0, 50) : 'Live Radio'}</div>
            </div>
            <div class="station-play-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
        </div>
    `).join('');
    
    newsContent.innerHTML = stationsHTML;
    
    // Add click handlers to stations
    document.querySelectorAll('.radio-station-item').forEach(item => {
        item.addEventListener('click', () => {
            const stationData = JSON.parse(item.dataset.station);
            playRadioStation(stationData);
        });
    });
}

// Play a radio station
function playRadioStation(station) {
    console.log(`🎵 Playing: ${station.name} from ${station.country}`);
    
    currentStation = station;
    audioPlayer.src = station.url;
    audioPlayer.play();
    
    // Show radio player
    const radioPlayer = document.getElementById('radio-player');
    const stationNameEl = document.getElementById('radio-station-name');
    const countryNameEl = document.getElementById('radio-country-name');
    
    stationNameEl.textContent = station.name;
    countryNameEl.textContent = station.country;
    radioPlayer.classList.remove('hidden');
    
    console.log('✅ Radio player visible');
}

// Hide radio player
function hideRadioPlayer() {
    const radioPlayer = document.getElementById('radio-player');
    radioPlayer.classList.add('hidden');
    
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
    }
    
    // Clear any error timeout and hide error messages
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.classList.add('hidden');
        errorElement.textContent = '';
    }
    
    currentStation = null;
}

// Fallback: Popular stations for major countries (works without API!)
const FALLBACK_STATIONS = {
    'US': [
        { name: 'NPR News', url_resolved: 'https://npr-ice.streamguys1.com/live.mp3', tags: 'news, talk' },
        { name: 'KCRW Los Angeles', url_resolved: 'https://kcrw.streamguys1.com/kcrw_192k_mp3_on_air', tags: 'music, indie' },
        { name: 'WNYC New York', url_resolved: 'https://fm939.wnyc.org/wnycfm', tags: 'news, culture' },
        { name: 'KEXP Seattle', url_resolved: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', tags: 'indie, rock' }
    ],
    'GB': [
        { name: 'BBC Radio 1', url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one', tags: 'pop, music' },
        { name: 'BBC Radio 2', url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_two', tags: 'variety' },
        { name: 'BBC Radio 4', url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm', tags: 'news, talk' },
        { name: 'BBC World Service', url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service', tags: 'news, world' }
    ],
    'FR': [
        { name: 'RTL', url_resolved: 'http://streaming.radio.rtl.fr/rtl-1-44-128', tags: 'news, talk' },
        { name: 'France Inter', url_resolved: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3', tags: 'news, culture' },
        { name: 'France Info', url_resolved: 'https://icecast.radiofrance.fr/franceinfo-midfi.mp3', tags: 'news' },
        { name: 'NRJ', url_resolved: 'http://cdn.nrjaudio.fm/audio1/fr/30001/mp3_128.mp3', tags: 'pop, hits' }
    ],
    'DE': [
        { name: 'Deutschlandfunk', url_resolved: 'https://st01.sslstream.dlf.de/dlf/01/high/aac/stream.aac', tags: 'news, talk' },
        { name: 'WDR 2', url_resolved: 'https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3', tags: 'pop, hits' },
        { name: 'Bayern 3', url_resolved: 'https://br-br3-live.cast.addradio.de/br/br3/live/mp3/128/stream.mp3', tags: 'pop, rock' }
    ],
    'CA': [
        { name: 'CBC Radio One', url_resolved: 'https://cbcliveradio-lh.akamaihd.net/i/CBCR1_TOR@118124/master.m3u8', tags: 'news, talk' },
        { name: 'TSN Radio', url_resolved: 'https://live.leanstream.co/CJCLFM-MP3', tags: 'sports' }
    ],
    'AU': [
        { name: 'ABC Radio National', url_resolved: 'https://live-radio01.mediahubaustralia.com/2RNW/mp3/', tags: 'news, talk' },
        { name: 'Triple J', url_resolved: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/', tags: 'indie, alternative' }
    ],
    'BR': [
        { name: 'CBN São Paulo', url_resolved: 'https://medias.sgr.globo.com/hls/vCBNSP/vCBNSP.m3u8', tags: 'news, talk' },
        { name: 'Jovem Pan', url_resolved: 'https://r2.ciclano.io:15021/stream', tags: 'news, music' }
    ],
    'ES': [
        { name: 'Cadena SER', url_resolved: 'http://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3', tags: 'news, talk' },
        { name: 'Los 40 Principales', url_resolved: 'http://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3', tags: 'pop, hits' }
    ],
    'IT': [
        { name: 'RAI Radio 1', url_resolved: 'https://icestreaming.rai.it/1.mp3', tags: 'news, talk' },
        { name: 'RTL 102.5', url_resolved: 'https://streamingv2.shoutcast.com/rtl-1025', tags: 'pop, hits' }
    ],
    'JP': [
        { name: 'NHK Radio Japan', url_resolved: 'https://radio-stream.nhk.jp/hls/live/2023229/nhkradiruakr1/master.m3u8', tags: 'news, culture' }
    ],
    'MX': [
        { name: 'Radio Formula', url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/XERFM.mp3', tags: 'news, talk' }
    ],
    'NL': [
        { name: 'NPO Radio 1', url_resolved: 'https://icecast.omroep.nl/radio1-bb-mp3', tags: 'news, talk' },
        { name: 'Radio 538', url_resolved: 'https://21223.live.streamtheworld.com/RADIO538.mp3', tags: 'pop, dance' }
    ],
    'SE': [
        { name: 'Sveriges Radio P1', url_resolved: 'https://sverigesradio.se/topsy/direkt/132-hi-mp3.m3u8', tags: 'news, culture' }
    ],
    'NO': [
        { name: 'NRK P1', url_resolved: 'https://lyd.nrk.no/nrk_radio_p1_ostlandssendingen_mp3_h', tags: 'news, talk' }
    ]
};

// Display no radio message
function displayNoRadio(countryName, message = 'No radio stations available') {
    const newsContent = document.getElementById('news-content');

    // Show the station search bar so the user can still search globally
    const searchBar = document.getElementById('radio-station-search');
    if (searchBar) searchBar.classList.remove('hidden');

    const countryCode = currentCountry ? currentCountry.code : 'unknown';
    
    console.log(`🔍 displayNoRadio called for: ${countryName}`);
    console.log(`🔍 currentCountry:`, currentCountry);
    console.log(`🔍 countryCode:`, countryCode);
    console.log(`🔍 FALLBACK_STATIONS keys:`, Object.keys(FALLBACK_STATIONS));
    console.log(`🔍 Has fallback for ${countryCode}:`, FALLBACK_STATIONS[countryCode] ? 'YES' : 'NO');
    
    // Check if we have fallback stations for this country
    if (FALLBACK_STATIONS[countryCode]) {
        console.log(`📻 Using fallback stations for ${countryCode}`);
        displayRadioStations(FALLBACK_STATIONS[countryCode], countryName);
        return;
    }
    
    console.log(`⚠️ No fallback stations for ${countryCode}, showing message`);

    
    newsContent.innerHTML = `
        <div class="no-news">
            <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${countryName}</p>
            <p style="color: var(--warning, #f59e0b); margin-bottom: 14px;">No radio stations found for this country.</p>
            <p style="font-size: 0.85rem; margin-bottom: 12px; color: var(--text-muted, #4b5567);">Countries with guaranteed stations:</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.8rem; color: var(--text-secondary, #8b95a8);">
                <div>United States</div>
                <div>United Kingdom</div>
                <div>France</div>
                <div>Germany</div>
                <div>Canada</div>
                <div>Australia</div>
                <div>Brazil</div>
                <div>Spain</div>
                <div>Italy</div>
                <div>Japan</div>
                <div>Mexico</div>
                <div>Netherlands</div>
                <div>Sweden</div>
                <div>Norway</div>
            </div>
        </div>
    `;
}

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('globeNewsSettings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        console.log('✅ Settings loaded:', settings);
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('globeNewsSettings', JSON.stringify(settings));
    console.log('💾 Settings saved:', settings);
}

// Apply settings to the app
function applySettings() {
    // Apply auto-rotate
    if (globe && globe.controls()) {
        globe.controls().autoRotate = settings.autoRotate;
        globe.controls().autoRotateSpeed = settings.rotationSpeed;
    }
    console.log('⚙️ Settings applied');
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Get temperature in user's preferred unit
function getTemperature(tempC) {
    if (settings.tempUnit === 'F') {
        return {
            value: Math.round(celsiusToFahrenheit(tempC)),
            unit: '°F'
        };
    }
    return {
        value: Math.round(tempC),
        unit: '°C'
    };
}

// Setup settings modal
function setupSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const resetSettings = document.getElementById('reset-settings');
    
    const tempUnitSelect = document.getElementById('temp-unit-select');
    const autoRotateToggle = document.getElementById('auto-rotate-toggle');
    const showImagesToggle = document.getElementById('show-images-toggle');
    const showCloudsToggle = document.getElementById('show-clouds-toggle');
    const newsCountSelect = document.getElementById('news-count-select');
    const rotationSpeedSlider = document.getElementById('rotation-speed');
    const speedValue = document.getElementById('speed-value');
    
    if (!settingsBtn || !settingsModal) {
        console.error('❌ Settings UI elements not found');
        return;
    }
    
    // Load saved settings
    loadSettings();
    
    // Set UI values from settings
    tempUnitSelect.value = settings.tempUnit;
    autoRotateToggle.checked = settings.autoRotate;
    showImagesToggle.checked = settings.showImages;
    showCloudsToggle.checked = settings.showClouds;
    newsCountSelect.value = settings.newsCount;
    rotationSpeedSlider.value = settings.rotationSpeed;
    speedValue.textContent = settings.rotationSpeed + 'x';
    
    // Apply settings
    applySettings();
    
    // Open settings
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        console.log('⚙️ Settings opened');
    });
    
    // Close settings
    const closeModal = () => {
        settingsModal.classList.add('hidden');
        console.log('⚙️ Settings closed');
    };
    
    closeSettings.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });
    
    // Temperature unit change
    tempUnitSelect.addEventListener('change', (e) => {
        settings.tempUnit = e.target.value;
        saveSettings();
        console.log(`🌡️ Temperature unit changed to: ${settings.tempUnit}`);
        // Clear weather cache to force refresh with new unit
        weatherCache = {};
    });
    
    // Auto-rotate toggle
    autoRotateToggle.addEventListener('change', (e) => {
        settings.autoRotate = e.target.checked;
        if (globe && globe.controls()) {
            globe.controls().autoRotate = settings.autoRotate;
        }
        saveSettings();
        console.log(`🔄 Auto-rotate: ${settings.autoRotate}`);
    });
    
    // Show images toggle
    showImagesToggle.addEventListener('change', (e) => {
        settings.showImages = e.target.checked;
        saveSettings();
        console.log(`🖼️ Show images: ${settings.showImages}`);
    });
    
    // Show clouds toggle
    showCloudsToggle.addEventListener('change', (e) => {
        settings.showClouds = e.target.checked;
        if (cloudMesh) {
            cloudMesh.visible = settings.showClouds;
        }
        saveSettings();
        console.log(`☁️ Show clouds: ${settings.showClouds}`);
    });
    
    // News count change
    newsCountSelect.addEventListener('change', (e) => {
        settings.newsCount = parseInt(e.target.value);
        saveSettings();
        console.log(`📰 News count: ${settings.newsCount}`);
        // Clear news cache to fetch new count
        newsCache = {};
    });
    
    // Rotation speed change
    rotationSpeedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        settings.rotationSpeed = speed;
        speedValue.textContent = speed + 'x';
        if (globe && globe.controls()) {
            globe.controls().autoRotateSpeed = speed;
        }
        saveSettings();
    });
    
    // Reset settings
    resetSettings.addEventListener('click', () => {
        if (confirm('Reset all settings to default?')) {
            settings = {
                tempUnit: 'C',
                autoRotate: true,
                showImages: true,
                showClouds: true,
                newsCount: 3,
                rotationSpeed: 0.3
            };
            saveSettings();
            
            // Update UI
            tempUnitSelect.value = settings.tempUnit;
            autoRotateToggle.checked = settings.autoRotate;
            showImagesToggle.checked = settings.showImages;
            showCloudsToggle.checked = settings.showClouds;
            newsCountSelect.value = settings.newsCount;
            rotationSpeedSlider.value = settings.rotationSpeed;
            speedValue.textContent = settings.rotationSpeed + 'x';
            
            // Apply cloud visibility
            if (cloudMesh) {
                cloudMesh.visible = settings.showClouds;
            }
            
            applySettings();
            
            // Clear caches
            newsCache = {};
            weatherCache = {};
            
            console.log('🔄 Settings reset to default');
            alert('Settings reset to default!');
        }
    });
    
    console.log('✅ Settings system initialized');
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

