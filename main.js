import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// Load minimap module
const minimapScript = document.createElement('script')
minimapScript.src = './minimap.js'
document.head.appendChild(minimapScript)

// Test creeper for minimap debugging
let testCreeper = null

// Objective system
const objective = {
    position: { x: 350, z: 350 }, // Far from spawn point (0, 10) - increased from 150 to 350
    radius: 5, // How close you need to get to complete
    completed: false,
    marker: null
}

// Create objective marker in the world
function createObjectiveMarker() {
    const markerGeometry = new THREE.CylinderGeometry(2, 2, 8, 8)
    const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    })
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.set(objective.position.x, 4, objective.position.z)
    marker.castShadow = true
    
    // Add pulsing glow effect
    marker.userData = {
        originalEmissiveIntensity: 0.5,
        pulseSpeed: 0.003
    }
    
    objective.marker = marker
    scene.add(marker)
    
    console.log(`🎯 Objective marker placed at (${objective.position.x}, ${objective.position.z})`)
    console.log(`📏 Distance from spawn: ${Math.sqrt(Math.pow(objective.position.x, 2) + Math.pow(objective.position.z - 10, 2)).toFixed(1)} units`)
}

// Check if player has reached the objective
function checkObjectiveCompletion() {
    if (objective.completed) return
    
    const distance = Math.sqrt(
        Math.pow(cameraGroup.position.x - objective.position.x, 2) + 
        Math.pow(cameraGroup.position.z - objective.position.z, 2)
    )
    
    if (distance <= objective.radius) {
        objective.completed = true
        console.log('🎉 OBJECTIVE COMPLETED! You survived the forest!')
        
        // Show completion message
        const completionDiv = document.createElement('div')
        completionDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.9);
            color: black;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 2000;
            text-align: center;
        `
        completionDiv.innerHTML = `
            🎉 MISSION COMPLETE! 🎉<br>
            You survived the forest!<br>
            <small>Press R to restart</small>
        `
        document.body.appendChild(completionDiv)
        
        // Add restart functionality
        const restartHandler = (e) => {
            if (e.key.toLowerCase() === 'r') {
                location.reload()
            }
        }
        document.addEventListener('keydown', restartHandler)
    }
}

// Make objective available globally for minimap
window.objective = objective

// Scene setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// Create danger indicator overlay
const dangerOverlay = document.createElement('div')
dangerOverlay.id = 'danger-overlay'
dangerOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(255, 0, 0, 0.3) 100%);
    mix-blend-mode: multiply;
`
document.body.appendChild(dangerOverlay)

// Stamina bar UI
const staminaBar = document.createElement('div')
staminaBar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 8px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    z-index: 101;
`
const staminaFill = document.createElement('div')
staminaFill.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, #00ff00, #ffff00);
    border-radius: 2px;
    transition: width 0.1s ease;
`
staminaBar.appendChild(staminaFill)
document.body.appendChild(staminaBar)

// Initialize objective marker
createObjectiveMarker()

// Hide loader and show info when ready
setTimeout(() => {
    document.getElementById('loader').style.display = 'none'
    document.getElementById('info').style.display = 'block'
    
    // Show control hints initially
    const infoElement = document.getElementById('info')
    if (infoElement) {
        infoElement.innerHTML = `
            SURVIVE THE FOREST<br>Reach the yellow marker<br><br>
            <span style="font-size: 14px; opacity: 0.8;">
            WASD - Move | SHIFT - Sprint | C - Crouch<br>
            Hide in tall grass while crouching to avoid detection
            </span>
        `
        
        // Remove hints after 10 seconds
        setTimeout(() => {
            if (!objective.completed) {
                infoElement.innerHTML = 'SURVIVE THE FOREST<br>Reach the yellow marker'
            }
        }, 10000)
    }
}, 1000)

// Fog for night-time thunderstorm atmosphere
scene.fog = new THREE.Fog(0x0e101a, 5, 80)
scene.background = new THREE.Color(0x0e101a)

// Lighting
const ambientLight = new THREE.AmbientLight(0x1a1e2f, 0.08)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight(0xcad7ff, 0.4)
sunLight.position.set(800, 200, 600)
sunLight.target.position.set(0, 0, 0)
sunLight.castShadow = true
sunLight.shadow.mapSize.width = 4096
sunLight.shadow.mapSize.height = 4096
sunLight.shadow.camera.near = 0.1
sunLight.shadow.camera.far = 3000
sunLight.shadow.camera.left = -200
sunLight.shadow.camera.right = 200
sunLight.shadow.camera.top = 200
sunLight.shadow.camera.bottom = -200
sunLight.shadow.bias = -0.0001
scene.add(sunLight)
scene.add(sunLight.target)

// Lightning flash light (starts off)
const lightningLight = new THREE.DirectionalLight(0xffffff, 0)
lightningLight.position.set(0, 500, 0)
scene.add(lightningLight)

// Volumetric light rays helper
const rayLight = new THREE.DirectionalLight(0xFFB85F, 0.3)
rayLight.position.copy(sunLight.position)
scene.add(rayLight)

// Create feathered sun texture
function createSunTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = canvas.width / 2
    
    // Create warm, soft radial gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(255, 180, 120, 0.9)')
    gradient.addColorStop(0.2, 'rgba(255, 150, 80, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 120, 60, 0.6)')
    gradient.addColorStop(0.7, 'rgba(255, 100, 40, 0.4)')
    gradient.addColorStop(0.9, 'rgba(255, 80, 20, 0.2)')
    gradient.addColorStop(1.0, 'rgba(255, 60, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    return new THREE.CanvasTexture(canvas)
}

// Create soft, feathered sun using sprite
const sunTexture = createSunTexture()
const sunMaterial = new THREE.SpriteMaterial({
    map: sunTexture,
    color: 0xFF6B35,
    fog: false,
    toneMapped: false,
    transparent: true,
    blending: THREE.AdditiveBlending
})

const sun = new THREE.Sprite(sunMaterial)
sun.scale.set(80, 80, 1)
sun.position.copy(sunLight.position)
sun.layers.enable(1)
scene.add(sun)
// Hide sun sprite for night scene
sun.visible = false

// Add additional fog layer for depth
const fogColor = new THREE.Color(0xFFE4B5)
renderer.setClearColor(fogColor, 0.8)

// Generate ground texture
function generateGroundTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    
    // Base color
    ctx.fillStyle = '#3B5323'
    ctx.fillRect(0, 0, 512, 512)
    
    // Add variation
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const radius = Math.random() * 20 + 5
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, `rgba(59, 83, 35, ${Math.random() * 0.3})`)
        gradient.addColorStop(1, 'rgba(59, 83, 35, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(10, 10)
    return texture
}

// Ground - much larger to extend infinitely
const groundGeometry = new THREE.PlaneGeometry(10000, 10000, 100, 100)
const groundMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x3B5323,
    map: generateGroundTexture()
})

// Add terrain variation
const vertices = groundGeometry.attributes.position.array
for (let i = 0; i < vertices.length; i += 3) {
    vertices[i + 2] = Math.random() * 0.5 - 0.25
}
groundGeometry.computeVertexNormals()

const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Generate bark texture
function generateBarkTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = '#4A3C28'
    ctx.fillRect(0, 0, 128, 256)
    
    // Add bark lines
    ctx.strokeStyle = '#3A2C18'
    ctx.lineWidth = 2
    for (let i = 0; i < 20; i++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * 128, 0)
        ctx.lineTo(Math.random() * 128, 256)
        ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
}

// Tree creation with LOD
function createTree(x, z, height) {
    const tree = new THREE.Group()
    
    // Trunk - positioned to sit on ground
    const trunkGeometry = new THREE.CylinderGeometry(height * 0.05, height * 0.08, height * 0.6, 8)
    const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4A3C28,
        map: generateBarkTexture()
    })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = height * 0.3 - 0.2
    trunk.castShadow = true
    trunk.receiveShadow = true
    tree.add(trunk)
    
    // Varied, darker foliage layers
    const baseFoliageColors = [
        [0x1A3008, 0x2D5016, 0x0F2004],
        [0x253A0A, 0x3A5F0B, 0x162508],
        [0x2F4A0C, 0x4C7C0F, 0x1E3009]
    ]
    
    // Add color variation based on tree position for natural diversity
    const colorVariation = Math.sin(x * 0.1) * Math.cos(z * 0.1)
    
    for (let i = 0; i < 3; i++) {
        const foliageGeometry = new THREE.SphereGeometry(
            height * (0.3 - i * 0.05), 
            8 - i * 2, 
            6 - i
        )
        
        // Select base color and add variation
        const baseColorArray = baseFoliageColors[i]
        let selectedColor
        
        if (colorVariation > 0.3) {
            selectedColor = baseColorArray[0]
        } else if (colorVariation > -0.3) {
            selectedColor = baseColorArray[1]
        } else {
            selectedColor = baseColorArray[2]
        }
        
        // Apply slight random variation
        const r = (selectedColor >> 16) & 0xFF
        const g = (selectedColor >> 8) & 0xFF
        const b = selectedColor & 0xFF
        
        const variation = 0.1
        const newR = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * r * variation))
        const newG = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * g * variation))
        const newB = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * b * variation))
        
        const finalColor = (Math.floor(newR) << 16) | (Math.floor(newG) << 8) | Math.floor(newB)
        
        const foliageMaterial = new THREE.MeshLambertMaterial({ 
            color: finalColor
        })
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
        foliage.position.y = height * (0.7 + i * 0.1) - 0.2
        foliage.scale.y = 0.8
        foliage.castShadow = true
        foliage.receiveShadow = true
        tree.add(foliage)
    }
    
    tree.position.set(x, 0, z)
    return tree
}

// Place trees procedurally
const trees = new Map()
const treeGrid = new Map()
const GRID_SIZE = 10
const VIEW_DISTANCE = 150
const TREE_DENSITY = 0.45

// Function to get grid key from position
function getGridKey(x, z) {
    const gridX = Math.floor(x / GRID_SIZE)
    const gridZ = Math.floor(z / GRID_SIZE)
    return `${gridX},${gridZ}`
}

// Function to generate trees in a grid cell
function generateTreesInCell(gridX, gridZ, isInitialLoad = false) {
    const key = `${gridX},${gridZ}`
    if (treeGrid.has(key)) return
    
    // Use deterministic random based on grid position
    const seed = gridX * 1000 + gridZ
    const random = () => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }
    
    // Randomly decide if this cell should have a tree
    if (random() < TREE_DENSITY) {
        const x = gridX * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const z = gridZ * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const height = random() * 18 + 12
        
        const tree = createTree(x, z, height)
        
        if (isInitialLoad) {
            scene.add(tree)
            trees.set(key, { mesh: tree, opacity: 1, targetOpacity: 1 })
        } else {
            tree.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true
                    child.material.opacity = 0
                }
            })
            scene.add(tree)
            trees.set(key, { mesh: tree, opacity: 0, targetOpacity: 1 })
        }
        
        treeGrid.set(key, { x, z, radius: 1 })
    }
}

// Function to update visible trees based on player position
function updateTrees(playerX, playerZ) {
    const playerGridX = Math.floor(playerX / GRID_SIZE)
    const playerGridZ = Math.floor(playerZ / GRID_SIZE)
    const gridRange = Math.ceil(VIEW_DISTANCE / GRID_SIZE)
    
    // Generate trees in view range
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dz = -gridRange; dz <= gridRange; dz++) {
            const gridX = playerGridX + dx
            const gridZ = playerGridZ + dz
            const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
            
            if (distance <= VIEW_DISTANCE) {
                generateTreesInCell(gridX, gridZ)
            }
        }
    }
    
    // Remove trees that are too far away
    for (const [key, treeData] of trees.entries()) {
        const [gridX, gridZ] = key.split(',').map(Number)
        const dx = gridX - playerGridX
        const dz = gridZ - playerGridZ
        const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
        
        if (distance > VIEW_DISTANCE * 1.5) {
            scene.remove(treeData.mesh)
            trees.delete(key)
            treeGrid.delete(key)
        }
    }
}

// Initialize trees around starting position
function initializeTrees(playerX, playerZ) {
    const playerGridX = Math.floor(playerX / GRID_SIZE)
    const playerGridZ = Math.floor(playerZ / GRID_SIZE)
    const gridRange = Math.ceil(VIEW_DISTANCE / GRID_SIZE)
    
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dz = -gridRange; dz <= gridRange; dz++) {
            const gridX = playerGridX + dx
            const gridZ = playerGridZ + dz
            const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
            
            if (distance <= VIEW_DISTANCE) {
                generateTreesInCell(gridX, gridZ, true)
            }
        }
    }
}

initializeTrees(0, 10)

// Selective bloom effect setup
let materials = {}
const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' })

// Set up effect composers
const renderPass = new RenderPass(scene, camera)
const antialiasPass = new ShaderPass(FXAAShader)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
)

// Bloom composer
const bloomComposer = new EffectComposer(renderer)
bloomComposer.addPass(renderPass)
bloomComposer.addPass(bloomPass)
bloomComposer.addPass(antialiasPass)
bloomComposer.renderToScreen = false

// Merge shader
const mergeShader = {
    uniforms: {
        u_baseTexture: { value: null },
        u_bloomTexture: { value: bloomComposer.readBuffer.texture },
        u_alpha: { value: 0.3 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D u_baseTexture;
        uniform sampler2D u_bloomTexture;
        uniform float u_alpha;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(u_baseTexture, vUv) + u_alpha * texture2D(u_bloomTexture, vUv);
        }
    `
}

const mergePass = new ShaderPass(
    new THREE.ShaderMaterial(mergeShader), 
    'u_baseTexture'
)

// Main composer
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)
composer.addPass(antialiasPass)
composer.addPass(mergePass)

// Functions to handle bloom isolation
function darkenNonBloom(obj) {
    if (obj.isMesh && obj.layers && typeof obj.layers.isEnabled === 'function') {
        if (obj.layers.isEnabled(1) === false) {
            materials[obj.uuid] = obj.material
            obj.material = darkMaterial
        }
    }
}

function restoreMaterial(obj) {
    if (obj.isMesh && materials[obj.uuid]) {
        obj.material = materials[obj.uuid]
        delete materials[obj.uuid]
    }
}

// Rock formations
function createRock(x, z, scale) {
    const rockGeometry = new THREE.DodecahedronGeometry(scale, 0)
    const rockMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x666666
    })
    const rock = new THREE.Mesh(rockGeometry, rockMaterial)
    rock.position.set(x, scale * 0.3, z)
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    rock.castShadow = true
    rock.receiveShadow = true
    return rock
}

const rocks = new Map()
const rockGrid = new Map()
const ROCK_DENSITY = 0.05

// Fallen logs system
const logs = new Map()
const logGrid = new Map()
const LOG_DENSITY = 0.03

function generateRocksInCell(gridX, gridZ) {
    const key = `${gridX},${gridZ}`
    if (rockGrid.has(key)) return
    
    if (treeGrid.has(key)) return
    
    const seed = gridX * 2000 + gridZ * 3
    const random = () => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }
    
    if (random() < ROCK_DENSITY) {
        const x = gridX * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const z = gridZ * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const scale = random() * 2 + 1
        
        let tooCloseToTree = false
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const checkKey = `${gridX + dx},${gridZ + dz}`
                if (treeGrid.has(checkKey)) {
                    const treeData = treeGrid.get(checkKey)
                    const distance = Math.sqrt(
                        Math.pow(x - treeData.x, 2) + 
                        Math.pow(z - treeData.z, 2)
                    )
                    if (distance < 3) {
                        tooCloseToTree = true
                        break
                    }
                }
            }
            if (tooCloseToTree) break
        }
        
        if (!tooCloseToTree) {
            const rock = createRock(x, z, scale)
            scene.add(rock)
            rocks.set(key, rock)
            rockGrid.set(key, { position: new THREE.Vector3(x, 0, z), radius: scale })
        }
    }
}

function updateRocks(playerX, playerZ) {
    const playerGridX = Math.floor(playerX / GRID_SIZE)
    const playerGridZ = Math.floor(playerZ / GRID_SIZE)
    const gridRange = Math.ceil(VIEW_DISTANCE / GRID_SIZE)
    
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dz = -gridRange; dz <= gridRange; dz++) {
            const gridX = playerGridX + dx
            const gridZ = playerGridZ + dz
            const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
            
            if (distance <= VIEW_DISTANCE) {
                generateRocksInCell(gridX, gridZ)
            }
        }
    }
    
    for (const [key, rock] of rocks.entries()) {
        const [gridX, gridZ] = key.split(',').map(Number)
        const dx = gridX - playerGridX
        const dz = gridZ - playerGridZ
        const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
        
        if (distance > VIEW_DISTANCE * 1.5) {
            scene.remove(rock)
            rocks.delete(key)
            rockGrid.delete(key)
        }
    }
}

updateRocks(0, 10)

// Fallen logs
function createLog(x, z) {
    const logGeometry = new THREE.CylinderGeometry(0.5, 0.7, 8, 8)
    const logMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3A2C18,
        map: generateBarkTexture()
    })
    const log = new THREE.Mesh(logGeometry, logMaterial)
    log.position.set(x, 0.5, z)
    log.rotation.z = Math.PI / 2
    log.rotation.y = Math.random() * Math.PI
    log.castShadow = true
    log.receiveShadow = true
    return log
}

function generateLogsInCell(gridX, gridZ) {
    const key = `${gridX},${gridZ}`
    if (logGrid.has(key)) return
    
    if (treeGrid.has(key) || rockGrid.has(key)) return
    
    const seed = gridX * 3000 + gridZ * 7
    const random = () => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }
    
    if (random() < LOG_DENSITY) {
        const x = gridX * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const z = gridZ * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        
        let tooCloseToOther = false
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const checkKey = `${gridX + dx},${gridZ + dz}`
                if (treeGrid.has(checkKey)) {
                    const treeData = treeGrid.get(checkKey)
                    const distance = Math.sqrt(
                        Math.pow(x - treeData.x, 2) + 
                        Math.pow(z - treeData.z, 2)
                    )
                    if (distance < 4) {
                        tooCloseToOther = true
                        break
                    }
                }
                if (rockGrid.has(checkKey)) {
                    const rockData = rockGrid.get(checkKey)
                    const distance = Math.sqrt(
                        Math.pow(x - rockData.position.x, 2) + 
                        Math.pow(z - rockData.position.z, 2)
                    )
                    if (distance < 3) {
                        tooCloseToOther = true
                        break
                    }
                }
            }
            if (tooCloseToOther) break
        }
        
        if (!tooCloseToOther) {
            const log = createLog(x, z)
            scene.add(log)
            logs.set(key, log)
            logGrid.set(key, { position: new THREE.Vector3(x, 0, z), radius: 4 })
        }
    }
}

function updateLogs(playerX, playerZ) {
    const playerGridX = Math.floor(playerX / GRID_SIZE)
    const playerGridZ = Math.floor(playerZ / GRID_SIZE)
    const gridRange = Math.ceil(VIEW_DISTANCE / GRID_SIZE)
    
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dz = -gridRange; dz <= gridRange; dz++) {
            const gridX = playerGridX + dx
            const gridZ = playerGridZ + dz
            const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
            
            if (distance <= VIEW_DISTANCE) {
                generateLogsInCell(gridX, gridZ)
            }
        }
    }
    
    for (const [key, log] of logs.entries()) {
        const [gridX, gridZ] = key.split(',').map(Number)
        const dx = gridX - playerGridX
        const dz = gridZ - playerGridZ
        const distance = Math.sqrt(dx * dx + dz * dz) * GRID_SIZE
        
        if (distance > VIEW_DISTANCE * 1.5) {
            scene.remove(log)
            logs.delete(key)
            logGrid.delete(key)
        }
    }
}

updateLogs(0, 10)

// Swaying grass system
const grassBlades = []
const grassCount = 800

function createGrassBlade(x, z, isClump = false) {
    const height = Math.random() * 0.4 + 0.2
    const width = 0.02
    const segments = 4
    
    const grassGeometry = new THREE.BufferGeometry()
    const vertices = []
    const indices = []
    const uvs = []
    
    const curveAmount = (Math.random() - 0.5) * 0.3
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const y = t * height
        
        const curveOffset = curveAmount * t * t
        
        vertices.push(-width/2, y, curveOffset)
        uvs.push(0, t)
        
        vertices.push(width/2, y, curveOffset)
        uvs.push(1, t)
        
        if (i < segments) {
            const base = i * 2
            indices.push(base, base + 1, base + 2)
            indices.push(base + 1, base + 3, base + 2)
        }
    }
    
    grassGeometry.setIndex(indices)
    grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    grassGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    grassGeometry.computeVertexNormals()
    
    const grassMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.27 + Math.random() * 0.06, 0.6, 0.08 + Math.random() * 0.06),
        side: THREE.DoubleSide,
        transparent: false,
        emissive: new THREE.Color().setHSL(0.27, 0.3, 0.02)
    })
    
    const grassBlade = new THREE.Mesh(grassGeometry, grassMaterial)
    grassBlade.position.set(x, 0, z)
    grassBlade.rotation.y = Math.random() * Math.PI
    
    grassBlade.userData = {
        originalRotation: grassBlade.rotation.clone(),
        swayOffset: Math.random() * Math.PI * 2,
        swayAmount: 0.05 + Math.random() * 0.05,
        originalPosition: grassBlade.position.clone(),
        isClump: isClump
    }
    
    return grassBlade
}

function createGrassClump(x, z) {
    const clump = new THREE.Group()
    const clumpSize = 3 + Math.random() * 4
    
    for (let i = 0; i < clumpSize; i++) {
        const offsetX = (Math.random() - 0.5) * 0.3
        const offsetZ = (Math.random() - 0.5) * 0.3
        const blade = createGrassBlade(x + offsetX, z + offsetZ, true)
        
        blade.position.x = offsetX
        blade.position.z = offsetZ
        
        clump.add(blade)
    }
    
    clump.position.set(x, 0, z)
    clump.userData = {
        originalPosition: clump.position.clone(),
        swayOffset: Math.random() * Math.PI * 2,
        swayAmount: 0.03 + Math.random() * 0.03
    }
    
    return clump
}

// Generate grass around starting position
function generateGrass(centerX, centerZ, radius = 50) {
    for (let i = 0; i < grassCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius
        const x = centerX + Math.cos(angle) * distance
        const z = centerZ + Math.sin(angle) * distance
        
        let tooClose = false
        const checkRadius = 2
        
        for (const [key, treeData] of treeGrid.entries()) {
            const dist = Math.sqrt(Math.pow(x - treeData.x, 2) + Math.pow(z - treeData.z, 2))
            if (dist < checkRadius + 1) {
                tooClose = true
                break
            }
        }
        
        if (!tooClose) {
            if (Math.random() < 0.4) {
                const grassClump = createGrassClump(x, z)
                grassBlades.push(grassClump)
                scene.add(grassClump)
            } else {
                const grassBlade = createGrassBlade(x, z)
                grassBlades.push(grassBlade)
                scene.add(grassBlade)
            }
        }
    }
}

generateGrass(0, 10)

// Tall grass patches for hiding
const tallGrassPatches = []
const tallGrassPatchGrid = new Map()
const TALL_GRASS_DENSITY = 0.5 // 50% chance per grid cell - much denser

function createTallGrassPatch(x, z) {
    const patch = new THREE.Group()
    patch.userData = {
        position: new THREE.Vector3(x, 0, z),
        radius: 4 + Math.random() * 3,
        blades: []
    }
    
    // Create many tall grass blades in a circular patch
    const bladeCount = 30 + Math.floor(Math.random() * 20)
    for (let i = 0; i < bladeCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * patch.userData.radius
        const bladeX = Math.cos(angle) * distance
        const bladeZ = Math.sin(angle) * distance
        
        const height = 1.5 + Math.random() * 0.8 // Much taller grass
        const blade = createGrassBlade(bladeX, bladeZ, false)
        blade.scale.y = height / 0.4 // Scale up the blade
        
        // Make it darker green
        blade.material.color.setHSL(0.27, 0.7, 0.15)
        
        // Add animation properties like regular grass
        blade.userData.swayOffset = Math.random() * Math.PI * 2
        blade.userData.swayAmount = 0.08 + Math.random() * 0.04 // Slightly more sway for tall grass
        blade.userData.originalRotation = {
            x: blade.rotation.x,
            y: blade.rotation.y,
            z: blade.rotation.z
        }
        blade.userData.originalPosition = blade.position.clone()
        
        patch.add(blade)
        patch.userData.blades.push(blade)
    }
    
    patch.position.set(x, 0, z)
    return patch
}

function generateTallGrassInCell(gridX, gridZ) {
    const key = `${gridX},${gridZ}`
    if (tallGrassPatchGrid.has(key)) return
    
    const seed = gridX * 5000 + gridZ * 9000
    const random = () => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }
    
    if (random() < TALL_GRASS_DENSITY) {
        const x = gridX * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        const z = gridZ * GRID_SIZE + (random() - 0.5) * GRID_SIZE
        
        // Check not too close to trees or rocks
        let tooClose = false
        if (treeGrid.has(key) || rockGrid.has(key) || logGrid.has(key)) {
            tooClose = true
        }
        
        if (!tooClose) {
            const patch = createTallGrassPatch(x, z)
            tallGrassPatches.push(patch)
            tallGrassPatchGrid.set(key, patch.userData)
            scene.add(patch)
        }
    }
}

// Generate initial tall grass
function initializeTallGrass(playerX, playerZ) {
    const playerGridX = Math.floor(playerX / GRID_SIZE)
    const playerGridZ = Math.floor(playerZ / GRID_SIZE)
    const gridRange = Math.ceil(VIEW_DISTANCE / GRID_SIZE)
    
    for (let dx = -gridRange; dx <= gridRange; dx++) {
        for (let dz = -gridRange; dz <= gridRange; dz++) {
            const gridX = playerGridX + dx
            const gridZ = playerGridZ + dz
            generateTallGrassInCell(gridX, gridZ)
        }
    }
}

initializeTallGrass(0, 10)

// Function to check if player is in tall grass
function checkIfInTallGrass(position) {
    for (const patch of tallGrassPatches) {
        const distance = Math.sqrt(
            Math.pow(position.x - patch.userData.position.x, 2) +
            Math.pow(position.z - patch.userData.position.z, 2)
        )
        if (distance <= patch.userData.radius) {
            return true
        }
    }
    return false
}

// Create dust/bug particle texture
function createParticleTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 12
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    return new THREE.CanvasTexture(canvas)
}

// Visible dust particles floating in air
const dustParticles = []
const dustCount = 450

for (let i = 0; i < dustCount; i++) {
    const particleTexture = createParticleTexture()
    const particleMaterial = new THREE.SpriteMaterial({
        map: particleTexture,
        color: new THREE.Color().setHSL(0.1, 0.3, 0.9),
        transparent: true,
        opacity: 0.8,
        fog: false,
        blending: THREE.NormalBlending
    })
    
    const particle = new THREE.Sprite(particleMaterial)
    particle.scale.set(0.125, 0.125, 1)
    
    particle.position.x = (Math.random() - 0.5) * 100
    particle.position.y = Math.random() * 8 + 1
    particle.position.z = (Math.random() - 0.5) * 100
    
    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.02
        ),
        originalY: particle.position.y,
        bobOffset: Math.random() * Math.PI * 2
    }
    
    dustParticles.push(particle)
    scene.add(particle)
}

// Enhanced ground mist particles
const mistCount = 800
const mistGeometry = new THREE.BufferGeometry()
const mistPositions = new Float32Array(mistCount * 3)

for (let i = 0; i < mistCount; i++) {
    mistPositions[i * 3] = (Math.random() - 0.5) * 280
    mistPositions[i * 3 + 1] = Math.random() * 6
    mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 280
}

mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))

const mistMaterial = new THREE.PointsMaterial({
    color: 0xFFE4B5,
    size: 0.15,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false
})

const mistSystem = new THREE.Points(mistGeometry, mistMaterial)
scene.add(mistSystem)

// Add additional floating particles layer
const extraParticleCount = 400
const extraGeometry = new THREE.BufferGeometry()
const extraPositions = new Float32Array(extraParticleCount * 3)
const extraVelocities = []

for (let i = 0; i < extraParticleCount; i++) {
    extraPositions[i * 3] = (Math.random() - 0.5) * 120
    extraPositions[i * 3 + 1] = Math.random() * 30 + 5
    extraPositions[i * 3 + 2] = (Math.random() - 0.5) * 120
    extraVelocities.push({
        x: (Math.random() - 0.5) * 0.025,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.025
    })
}

extraGeometry.setAttribute('position', new THREE.BufferAttribute(extraPositions, 3))

const extraMaterial = new THREE.PointsMaterial({
    color: 0xFFD4A3,
    size: 0.03,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false
})

const extraParticleSystem = new THREE.Points(extraGeometry, extraMaterial)
scene.add(extraParticleSystem)

// Player controls
const cameraGroup = new THREE.Group()
cameraGroup.add(camera)
cameraGroup.position.set(0, 2.2, 10) // Raised from 1.7 to 2.2
scene.add(cameraGroup)

// Add hemisphere light for general ambient around player
const playerAmbient = new THREE.HemisphereLight(0xFFE4B5, 0x3B5323, 0.4)
cameraGroup.add(playerAmbient)

const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
    crouch: false,
    sprint: false
}

// Movement speeds and stamina system
const movementSpeeds = {
    crouch: 2,
    walk: 4,
    run: 8,
    sprint: 12
}

const staminaSystem = {
    current: 100,
    max: 100,
    sprintCost: 25, // stamina per second while sprinting
    regenRate: 15, // stamina per second while not sprinting
    minSprintStamina: 10 // minimum stamina needed to start sprinting
}

// Player state
const playerState = {
    stance: 'standing', // 'crouching' or 'standing'
    isInGrass: false,
    noiseLevel: 0, // 0-1, affects detection
    visibilityMultiplier: 1 // affects detection range
}

const playerVelocity = new THREE.Vector3()
const playerDirection = new THREE.Vector3()

// Mouse controls
let lat = 0
let lon = 0

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        lon += e.movementX * 0.2
        lat -= e.movementY * 0.2
        lat = Math.max(-85, Math.min(85, lat))
    }
})

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock()
})

// Collision detection
function checkCollision(position) {
    const playerGridX = Math.floor(position.x / GRID_SIZE)
    const playerGridZ = Math.floor(position.z / GRID_SIZE)
    
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const key = `${playerGridX + dx},${playerGridZ + dz}`
            
            if (treeGrid.has(key)) {
                const treePos = treeGrid.get(key)
                const distance = Math.sqrt(
                    Math.pow(position.x - treePos.x, 2) + 
                    Math.pow(position.z - treePos.z, 2)
                )
                if (distance < treePos.radius + 1) {
                    return true
                }
            }
            
            if (rockGrid.has(key)) {
                const rock = rockGrid.get(key)
                const distance = position.distanceTo(rock.position)
                if (distance < rock.radius + 1) {
                    return true
                }
            }
        }
    }
    
    return false
}

// Global shared audio buffer for screams (simpler approach)
let globalScreamBuffer = null
let isLoadingGlobalBuffer = false

// Function to get or load the global scream buffer
function getGlobalScreamBuffer(audioContext) {
    return new Promise((resolve, reject) => {
        // If we already have the buffer, return it immediately
        if (globalScreamBuffer) {
            resolve(globalScreamBuffer)
            return
        }
        
        // If already loading, wait for it
        if (isLoadingGlobalBuffer) {
            const checkBuffer = () => {
                if (globalScreamBuffer) {
                    resolve(globalScreamBuffer)
                } else if (!isLoadingGlobalBuffer) {
                    reject(new Error('Buffer loading failed'))
                } else {
                    setTimeout(checkBuffer, 100)
                }
            }
            checkBuffer()
            return
        }
        
        // Start loading
        isLoadingGlobalBuffer = true
        console.log('🔄 Loading global scream buffer...')
        
        fetch('759456__akridiy__a-single-scream-of-a-young-male.wav')
            .then(response => response.arrayBuffer())
            .then(data => audioContext.decodeAudioData(data))
            .then(buffer => {
                globalScreamBuffer = buffer
                isLoadingGlobalBuffer = false
                console.log('✅ Global scream buffer loaded - will be reused by all creepers')
                resolve(buffer)
            })
            .catch(error => {
                isLoadingGlobalBuffer = false
                console.log(`❌ Failed to load global scream buffer: ${error.message}`)
                reject(error)
            })
    })
}

// Global model loading queue to prevent simultaneous loads
let modelLoadingQueue = []
let isLoadingModel = false

function queueModelLoad(creeper) {
    modelLoadingQueue.push(creeper)
    processModelQueue()
}

function processModelQueue() {
    if (isLoadingModel || modelLoadingQueue.length === 0) return
    
    isLoadingModel = true
    const nextCreeper = modelLoadingQueue.shift()
    
    console.log(`🔄 Loading model for creeper #${nextCreeper.id || 'main'} (${modelLoadingQueue.length} remaining in queue)`)
    
    // Start loading this creeper's model
    nextCreeper.loadModelNow()
}

function onModelLoadComplete() {
    isLoadingModel = false
    // Process next in queue after a small delay to prevent performance spikes
    setTimeout(() => {
        processModelQueue()
    }, 100) // 100ms delay between model loads
}

// Audio system
let audioInitialized = false
let forestAudio = null
let baseHeartbeatRate = 1.0 // Normal heartbeat speed
let currentHeartbeatRate = 1.0
let targetHeartbeatRate = 1.0

function updateHeartbeatSpeed() {
    if (!forestAudio || forestAudio.paused || forestAudio.ended) return
    
    // Find the closest creeper to the player
    let closestDistance = Infinity
    const playerPos = cameraGroup.position
    
    // Check main creepy figure
    if (creepyFigure && creepyFigure.position) {
        const distance = Math.sqrt(
            Math.pow(creepyFigure.position.x - playerPos.x, 2) + 
            Math.pow(creepyFigure.position.z - playerPos.z, 2)
        )
        closestDistance = Math.min(closestDistance, distance)
    }
    
    // Check all other creepers
    for (const [key, creeper] of creepers.entries()) {
        if (creeper && creeper.position) {
            const distance = Math.sqrt(
                Math.pow(creeper.position.x - playerPos.x, 2) + 
                Math.pow(creeper.position.z - playerPos.z, 2)
            )
            closestDistance = Math.min(closestDistance, distance)
        }
    }
    
    // Calculate target heartbeat rate based on closest distance
    if (closestDistance === Infinity) {
        // No creepers nearby - normal heartbeat
        targetHeartbeatRate = baseHeartbeatRate
    } else {
        // Map distance to heartbeat rate
        const maxDistance = 50 // Distance at which heartbeat is normal
        const minDistance = 5  // Distance at which heartbeat is fastest
        const maxRate = 3.6    // Further reduced from 1.8 to 1.6 to prevent clipping
        
        if (closestDistance >= maxDistance) {
            targetHeartbeatRate = baseHeartbeatRate
        } else if (closestDistance <= minDistance) {
            targetHeartbeatRate = baseHeartbeatRate * maxRate
        } else {
            // Linear interpolation between min and max
            const normalizedDistance = (closestDistance - minDistance) / (maxDistance - minDistance)
            const rateMultiplier = maxRate - (normalizedDistance * (maxRate - 1))
            targetHeartbeatRate = baseHeartbeatRate * rateMultiplier
        }
    }
    
    // Use extremely gentle transitions to prevent any audio artifacts
    const rateDifference = Math.abs(currentHeartbeatRate - targetHeartbeatRate)
    
    // Much smaller increments to prevent clipping
    let transitionSpeed = 0.001 // Very small base increment
    
    if (Math.abs(currentHeartbeatRate - targetHeartbeatRate) > 0.001) {
        if (currentHeartbeatRate < targetHeartbeatRate) {
            currentHeartbeatRate = Math.min(targetHeartbeatRate, currentHeartbeatRate + transitionSpeed)
        } else {
            currentHeartbeatRate = Math.max(targetHeartbeatRate, currentHeartbeatRate - transitionSpeed)
        }
        
        // Apply the new playback rate very conservatively
        const clampedRate = Math.max(0.8, Math.min(1.8, currentHeartbeatRate))
        
        // Only change rate if the difference is meaningful and audio is stable
        if (Math.abs(forestAudio.playbackRate - clampedRate) > 0.005) {
            try {
                forestAudio.playbackRate = clampedRate
            } catch (error) {
                // Fallback if playbackRate change fails
                console.log('⚠️ Playback rate change failed, resetting to 1.0')
                forestAudio.playbackRate = 1.0
                currentHeartbeatRate = 1.0
                targetHeartbeatRate = 1.0
            }
        }
        
        // Debug logging (uncomment to see heartbeat changes)
        // console.log(`💓 Heartbeat: ${currentHeartbeatRate.toFixed(3)}x (target: ${targetHeartbeatRate.toFixed(3)}x, closest: ${closestDistance.toFixed(1)}m)`)
    }
}

function initAudio() {
    if (!audioInitialized) {
        try {
            if (!forestAudio) {
                forestAudio = new Audio('410390__univ_lyon3__pantigny_jeanloup_2017_2018_heartbeatbreath.wav')
                forestAudio.loop = true
                forestAudio.volume = 1
                
                forestAudio.addEventListener('loadstart', () => console.log('Heartbeat/breath audio loading started'))
                forestAudio.addEventListener('canplay', () => console.log('Heartbeat/breath audio can play'))
                forestAudio.addEventListener('playing', () => console.log('Heartbeat/breath audio is now playing'))
                forestAudio.addEventListener('error', (e) => console.log('Heartbeat/breath audio error:', e))
            }
            
            // Removed ambient audio initialization
            
            forestAudio.play().then(() => {
                console.log('✅ Heartbeat/breath audio successfully started!')
                audioInitialized = true
                removeAudioListeners()
            }).catch(e => {
                console.log('❌ Audio play failed:', e.message)
                forestAudio.play().catch(e => console.log('Heartbeat/breath audio failed:', e.message))
            })
            
        } catch (error) {
            console.log('❌ Could not load audio files:', error)
        }
    }
}

initAudio()

function tryStartAudio() {
    if (audioInitialized || (forestAudio && !forestAudio.paused)) {
        console.log('🎵 Audio already playing - ignoring interaction')
        removeAudioListeners()
        return
    }
    console.log('🔊 User interaction detected - attempting to start audio...')
    initAudio()
}

document.addEventListener('click', tryStartAudio)
document.addEventListener('keydown', tryStartAudio)
document.addEventListener('touchstart', tryStartAudio)

function removeAudioListeners() {
    if (audioInitialized && forestAudio && !forestAudio.paused) {
        document.removeEventListener('click', tryStartAudio)
        document.removeEventListener('keydown', tryStartAudio)
        document.removeEventListener('touchstart', tryStartAudio)
        console.log('🎵 Audio listeners removed - heartbeat/breath is playing')
    }
}

setInterval(() => {
    if (forestAudio && !forestAudio.paused && !audioInitialized) {
        audioInitialized = true
        removeAudioListeners()
    }
}, 2000)

// Animation variables
let time = 0
let bobAmount = 0

// Timer handle
const timerElement = document.getElementById('timer')
const startTime = performance.now()

// ---------- Creepy Figure System ----------
class CreepyFigure {
    constructor(scene, camera) {
        this.scene = scene
        this.camera = camera
        this.figure = null
        this.mixer = null
        this.playerPosition = new THREE.Vector3()
        this.raycaster = new THREE.Raycaster()
        this.groundOffset = 0 // Will be set when model loads
        
        // AI States: idle, wandering, chasing
        this.state = 'idle'
        this.stateTimer = 0
        this.position = new THREE.Vector3()
        this.targetPosition = new THREE.Vector3()
        this.velocity = new THREE.Vector3()
        this.lastKnownPlayerPosition = new THREE.Vector3()
        
        // Behavior parameters
        this.idleTime = 3 + Math.random() * 4 // Stand still for 3-7 seconds
        this.wanderSpeed = 2
        this.chaseSpeed = 8
        this.detectionRange = 45 // Increased from 20 to 45 - much longer vision
        this.canSeePlayer = false
        this.isMoving = false
        
        // Add spawn delay so player can observe behavior
        this.spawnDelay = 15 // Increased from 10 to 15 seconds before he can detect player
        this.gameStartTime = performance.now()
        this.detectionActive = false // Track if detection has been activated
        
        // Enhanced scream audio system with Web Audio API
        this.audioContext = null
        this.screamBuffer = null
        this.screamSource = null
        this.gainNode = null
        this.pitchShiftNode = null
        this.isScreaming = false
        this.screamCooldown = 0
        this.minScreamInterval = 2 // Minimum seconds between screams
        this.maxScreamInterval = 5 // Maximum seconds between screams
        this.nextScreamTime = 0
        this.baseScreamVolume = 6.0 // Increased from 4.0 to 6.0
        this.maxScreamDistance = 25 // Reduced from 30 to 25 units
        this.minScreamDistance = 3  // Reduced from 5 to 3 units
        
        this.initScreamAudio()
        this.queueModelLoad()
    }
    
    initScreamAudio() {
        try {
            // Each creeper gets its own audio context (prevents context conflicts)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
            
            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain()
            this.gainNode.gain.value = 0
            
            // Create reverb effect
            this.reverbNode = this.audioContext.createConvolver()
            this.createReverbImpulse()
            
            // Create 3D panner for positional audio
            this.pannerNode = this.audioContext.createPanner()
            this.pannerNode.panningModel = 'HRTF'
            this.pannerNode.distanceModel = 'inverse'
            this.pannerNode.refDistance = 1
            this.pannerNode.maxDistance = 25 // Reduced from 50 to match scream distance
            this.pannerNode.rolloffFactor = 1.5 // Reduced from 2 for less aggressive falloff
            this.pannerNode.cone