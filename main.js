import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

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

// Hide loader and show info when ready
setTimeout(() => {
    document.getElementById('loader').style.display = 'none'
    document.getElementById('info').style.display = 'block'
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
    shift: false
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

// Audio system
let audioInitialized = false
let forestAudio = null
let ambientAudio = null

function fadeOutAmbient() {
    if (!ambientAudio || ambientAudio.paused) return
    
    const fadeStep = 0.005
    const fadeInterval = 100
    
    const fade = setInterval(() => {
        if (ambientAudio.volume > fadeStep) {
            ambientAudio.volume -= fadeStep
        } else {
            ambientAudio.volume = 0
            ambientAudio.pause()
            clearInterval(fade)
            console.log('🎵 Ambient music faded out completely')
        }
    }, fadeInterval)
}

function initAudio() {
    if (!audioInitialized) {
        try {
            if (!forestAudio) {
                forestAudio = new Audio('forest.wav')
                forestAudio.loop = true
                forestAudio.volume = 0.6
                
                forestAudio.addEventListener('loadstart', () => console.log('Forest audio loading started'))
                forestAudio.addEventListener('canplay', () => console.log('Forest audio can play'))
                forestAudio.addEventListener('playing', () => console.log('Forest audio is now playing'))
                forestAudio.addEventListener('error', (e) => console.log('Forest audio error:', e))
            }
            
            if (!ambientAudio) {
                ambientAudio = new Audio('ambient.wav')
                ambientAudio.loop = false
                ambientAudio.volume = 0.375
                
                ambientAudio.addEventListener('loadstart', () => console.log('Ambient audio loading started'))
                ambientAudio.addEventListener('canplay', () => console.log('Ambient audio can play'))
                ambientAudio.addEventListener('playing', () => console.log('Ambient audio is now playing'))
                ambientAudio.addEventListener('error', (e) => console.log('Ambient audio error:', e))
                
                setTimeout(() => {
                    if (ambientAudio && !ambientAudio.paused) {
                        fadeOutAmbient()
                    }
                }, 30000)
            }
            
            Promise.all([
                forestAudio.play(),
                ambientAudio.play()
            ]).then(() => {
                console.log('✅ Both forest and ambient audio successfully started!')
                audioInitialized = true
                removeAudioListeners()
            }).catch(e => {
                console.log('❌ Audio play failed:', e.message)
                forestAudio.play().catch(e => console.log('Forest audio failed:', e.message))
                ambientAudio.play().catch(e => console.log('Ambient audio failed:', e.message))
            })
            
        } catch (error) {
            console.log('❌ Could not load audio files:', error)
        }
    }
}

initAudio()

function tryStartAudio() {
    if (audioInitialized || (forestAudio && !forestAudio.paused && ambientAudio && !ambientAudio.paused)) {
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
        console.log('🎵 Audio listeners removed - ambience is playing')
    }
}

setInterval(() => {
    if (forestAudio && !forestAudio.paused && ambientAudio && !ambientAudio.paused && !audioInitialized) {
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
        this.detectionRange = 20 // Reduced from 40 - much closer detection
        this.canSeePlayer = false
        this.isMoving = false
        
        // Add spawn delay so player can observe behavior
        this.spawnDelay = 10 // 10 seconds before he can detect player
        this.gameStartTime = performance.now()
        this.detectionActive = false // Track if detection has been activated
        
        this.loadModel()
    }
    
    loadModel() {
        const loader = new GLTFLoader()
        
        loader.load('./runner.glb', (gltf) => {
            this.figure = gltf.scene
            
            // Setup model properties - smaller scale and proper ground positioning
            this.figure.scale.setScalar(0.7) // Reduced from 1.0 to 0.7
            this.figure.castShadow = true
            this.figure.receiveShadow = true
            
            // Calculate bounding box after scaling to position on ground properly
            this.figure.updateMatrixWorld(true) // Force update after scaling
            const box = new THREE.Box3().setFromObject(this.figure)
            this.groundOffset = -box.min.y + 0.1 // Offset to put bottom of model on ground with small buffer
            
            // Make materials darker/creepier
            this.figure.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true
                    child.receiveShadow = true
                    
                    if (child.material) {
                        child.material.color.setHex(0x050508) // Almost black with tiny hint of blue
                        child.material.emissive.setHex(0x000005) // Very subtle dark blue emissive
                    }
                }
            })
            
            // Setup animations if available
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.figure)
                this.animations = {}
                this.currentAction = null
                this.previousAction = null
                
                console.log('🎬 Available animations:', gltf.animations.map(clip => clip.name))
                
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip)
                    this.animations[clip.name.toLowerCase()] = action
                    
                    // Set up animation properties
                    action.setEffectiveTimeScale(1)
                    action.setEffectiveWeight(1)
                })
                
                // Debug: log all available animations with their original names
                console.log('🎬 Animation mapping:')
                gltf.animations.forEach((clip) => {
                    console.log(`  "${clip.name}" -> "${clip.name.toLowerCase()}"`)
                })
                
                // Start with idle animation
                this.playIdleAnimation()
            } else {
                console.log('⚠️ No animations found in runner.glb')
            }
            
            // Start at random position
            this.spawnAtRandomLocation()
            this.scene.add(this.figure)
            
            console.log('🔥 Runner figure loaded and hunting begins!')
        }, 
        (progress) => {
            console.log('Loading runner.glb:', Math.round(progress.loaded / progress.total * 100) + '%')
        },
        (error) => {
            console.error('❌ Failed to load runner.glb:', error)
            console.log('📁 Make sure runner.glb is in the same folder as index.html')
            this.createFallbackFigure()
        })
    }
    
    // Helper to play idle animation
    playIdleAnimation() {
        const idleAnimation = this.findAnimation(['idle', 'standing', 'rest', 'default'])
        if (idleAnimation) {
            this.playAnimation(idleAnimation, true)
            return
        }
        
        // If no idle found, play first animation
        if (Object.keys(this.animations).length > 0) {
            const firstAnim = Object.keys(this.animations)[0]
            this.playAnimation(firstAnim, true)
        }
    }
    
    // Helper to find animation by priority list
    findAnimation(nameList) {
        for (const name of nameList) {
            // Check for exact match first
            if (this.animations[name.toLowerCase()]) {
                return name.toLowerCase()
            }
            
            // Check for animations that end with the name (to handle prefixes like "Human Armature|")
            for (const animKey of Object.keys(this.animations)) {
                const lowerKey = animKey.toLowerCase()
                const lowerName = name.toLowerCase()
                
                // Check if the animation name ends with our search term
                if (lowerKey.endsWith('|' + lowerName) || lowerKey.endsWith(lowerName)) {
                    return animKey
                }
            }
        }
        return null
    }
    
    // Enhanced animation system
    playAnimation(name, loop = true) {
        const newAction = this.animations[name.toLowerCase()]
        if (!newAction) {
            console.log(`⚠️ Animation '${name}' not found. Available:`, Object.keys(this.animations))
            return
        }
        
        if (this.currentAction === newAction) return
        
        this.previousAction = this.currentAction
        this.currentAction = newAction
        
        if (this.previousAction) {
            this.previousAction.fadeOut(0.3)
        }
        
        this.currentAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(0.3)
            .play()
            
        if (loop) {
            this.currentAction.setLoop(THREE.LoopRepeat)
        } else {
            this.currentAction.setLoop(THREE.LoopOnce)
            this.currentAction.clampWhenFinished = true
        }
    }
    
    // Get appropriate animation based on movement speed and state
    getAnimationForState(speed, stateType) {
        // Define animation priorities (try these names in order)
        const animationMap = {
            idle: ['idle', 'standing', 'rest', 'default'],
            walk: ['walk', 'walking', 'move', 'forward'],
            run: ['run', 'running', 'sprint', 'fast']
        }
        
        let animType = 'idle'
        
        if (stateType === 'run' || speed > 4) {
            animType = 'run'
        } else if (stateType === 'walk' || speed > 1) {
            animType = 'walk'
        } else {
            animType = 'idle'
        }
        
        // Find first available animation for this type
        const possibleNames = animationMap[animType] || ['idle']
        for (const name of possibleNames) {
            if (this.animations[name]) {
                return name
            }
        }
        
        // Fallback to first available animation
        return Object.keys(this.animations)[0] || null
    }
    
    createFallbackFigure() {
        console.log('🔧 Creating fallback creepy figure...')
        const group = new THREE.Group()
        
        // Body - taller and more menacing
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 2.2, 8)
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x0a0a0a,
            emissive: 0x110000
        })
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
        body.position.y = 1.1
        body.castShadow = true
        group.add(body)
        
        // Head - more angular and scary
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4)
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            emissive: 0x220000
        })
        const head = new THREE.Mesh(headGeometry, headMaterial)
        head.position.y = 2.6
        head.castShadow = true
        group.add(head)
        
        // Glowing red eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6)
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0
        })
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
        leftEye.position.set(-0.1, 2.7, 0.15)
        group.add(leftEye)
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
        rightEye.position.set(0.1, 2.7, 0.15)
        group.add(rightEye)
        
        // Arms for more menacing silhouette
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6)
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial)
        leftArm.position.set(-0.6, 1.5, 0)
        leftArm.rotation.z = 0.3
        leftArm.castShadow = true
        group.add(leftArm)
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial)
        rightArm.position.set(0.6, 1.5, 0)
        rightArm.rotation.z = -0.3
        rightArm.castShadow = true
        group.add(rightArm)
        
        this.figure = group
        this.spawnAtRandomLocation()
        this.scene.add(this.figure)
        
        console.log('✅ Fallback creepy figure created')
    }
    
    spawnAtRandomLocation() {
        const angle = Math.random() * Math.PI * 2
        const distance = 30 + Math.random() * 20
        this.position.set(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        )
        if (this.figure) {
            this.figure.position.copy(this.position)
        }
    }
    
    // Check if creep can see player (line of sight)
    checkLineOfSight(creepPos, playerPos) {
        const direction = playerPos.clone().sub(creepPos).normalize()
        const distance = creepPos.distanceTo(playerPos)
        
        // Set raycaster from creep position towards player
        this.raycaster.set(creepPos.clone().add(new THREE.Vector3(0, 1, 0)), direction)
        
        // Check for intersections with trees and obstacles
        const obstacles = []
        
        // Add trees as obstacles
        for (const [key, treeData] of treeGrid.entries()) {
            if (trees.has(key)) {
                const tree = trees.get(key).mesh
                tree.traverse((child) => {
                    if (child.isMesh) {
                        obstacles.push(child)
                    }
                })
            }
        }
        
        // Add rocks as obstacles
        for (const [key, rock] of rocks.entries()) {
            obstacles.push(rock)
        }
        
        const intersects = this.raycaster.intersectObjects(obstacles)
        
        // If there's an obstacle between creep and player, can't see
        if (intersects.length > 0 && intersects[0].distance < distance - 2) {
            return false
        }
        
        return distance <= this.detectionRange
    }
    
    update(deltaTime, playerPosition) {
        if (!this.figure) return
        
        this.playerPosition.copy(playerPosition)
        this.stateTimer += deltaTime
        
        const distanceToPlayer = this.position.distanceTo(this.playerPosition)
        
        // Check if spawn delay has passed
        const timeSinceStart = (performance.now() - this.gameStartTime) / 1000
        const canDetect = timeSinceStart > this.spawnDelay
        
        // Show message when detection becomes active
        if (canDetect && !this.detectionActive) {
            this.detectionActive = true
            console.log('👁️ Creep can now detect you! Stay hidden behind trees and rocks.')
        }
        
        // Check line of sight only if spawn delay has passed
        this.canSeePlayer = canDetect && this.checkLineOfSight(this.position, this.playerPosition)
        
        // Simple 3-mode behavior system
        if (this.canSeePlayer && distanceToPlayer < this.detectionRange) {
            // Mode 3: Player spotted - chase!
            if (this.state !== 'chasing') {
                this.state = 'chasing'
                this.stateTimer = 0
                console.log('🏃 Creep spotted you! Running towards you!')
            }
            
            // Target player's ground position, not camera position
            this.targetPosition.copy(this.playerPosition)
            this.targetPosition.y = 0 // Force target to ground level
            this.moveTowards(this.targetPosition, this.chaseSpeed, deltaTime)
            this.isMoving = true
            
            // Face the player (only rotate around Y-axis to stay upright)
            const direction = this.playerPosition.clone().sub(this.position)
            direction.y = 0 // Ignore vertical difference
            direction.normalize()
            if (direction.length() > 0) {
                const angle = Math.atan2(direction.x, direction.z)
                this.figure.rotation.y = angle
            }
            
        } else {
            // Player not visible - switch between idle and wandering
            if (this.state === 'chasing') {
                // Lost sight of player, go back to idle
                this.state = 'idle'
                this.stateTimer = 0
                this.idleTime = 2 + Math.random() * 3
                console.log('❓ Lost sight of player, going idle...')
            }
            
            if (this.state === 'idle') {
                // Mode 1: Standing still
                this.isMoving = false
                
                if (this.stateTimer > this.idleTime) {
                    // Switch to wandering
                    this.state = 'wandering'
                    this.stateTimer = 0
                    this.targetPosition = this.getRandomWanderPoint()
                    console.log('🚶 Starting to wander around...')
                }
                
            } else if (this.state === 'wandering') {
                // Mode 2: Walking around
                const distanceToTarget = this.position.distanceTo(this.targetPosition)
                
                if (distanceToTarget < 2 || this.stateTimer > 8) {
                    // Reached target or wandered long enough, go idle
                    this.state = 'idle'
                    this.stateTimer = 0
                    this.idleTime = 3 + Math.random() * 4
                    this.isMoving = false
                    console.log('🛑 Stopping to stand still...')
                } else {
                    // Keep wandering
                    this.moveTowards(this.targetPosition, this.wanderSpeed, deltaTime)
                    this.isMoving = true
                    
                    // Face movement direction (only rotate around Y-axis to stay upright)
                    const direction = this.targetPosition.clone().sub(this.position)
                    direction.y = 0 // Ignore vertical difference
                    direction.normalize()
                    if (direction.length() > 0) {
                        const angle = Math.atan2(direction.x, direction.z)
                        this.figure.rotation.y = angle
                    }
                }
            }
        }
        
        // Update animations based on movement
        if (this.mixer) {
            this.mixer.update(deltaTime)
            
            if (this.animations && Object.keys(this.animations).length > 0) {
                let targetAnimation = null
                
                if (this.state === 'idle') {
                    // Force idle animation when standing still
                    targetAnimation = this.findAnimation(['idle', 'standing', 'rest', 'default'])
                } else if (this.state === 'wandering') {
                    // Force walk animation when wandering
                    targetAnimation = this.findAnimation(['walk', 'walking', 'move', 'forward'])
                } else if (this.state === 'chasing') {
                    // Force run animation when chasing
                    targetAnimation = this.findAnimation(['run', 'running', 'sprint', 'fast'])
                }
                
                // Fallback to first available if nothing found
                if (!targetAnimation) {
                    targetAnimation = Object.keys(this.animations)[0]
                }
                
                // Only change animation if it's different
                if (targetAnimation && this.currentAction?.getClip().name.toLowerCase() !== targetAnimation) {
                    console.log(`🎬 Switching to animation: ${targetAnimation} (state: ${this.state})`)
                    this.playAnimation(targetAnimation, true)
                }
                
                // Adjust animation speed
                if (this.currentAction) {
                    let speedMultiplier = 1.0
                    if (this.state === 'chasing') {
                        speedMultiplier = 1.8 // Faster for running
                    } else if (this.state === 'wandering') {
                        speedMultiplier = 0.8 // Slower for walking
                    } else {
                        speedMultiplier = 0.6 // Very slow for idle
                    }
                    this.currentAction.setEffectiveTimeScale(speedMultiplier)
                }
            }
        }
        
        // Apply ground offset to keep model on ground
        if (this.figure) {
            this.figure.position.copy(this.position)
            this.figure.position.y += this.groundOffset
        }
    }
    
    moveTowards(target, speed, deltaTime) {
        const direction = target.clone().sub(this.position)
        const distance = direction.length()
        
        if (distance > 0.5) {
            direction.normalize()
            this.velocity.copy(direction).multiplyScalar(speed)
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
            this.figure.position.copy(this.position)
        }
    }
    
    getRandomWanderPoint() {
        const angle = Math.random() * Math.PI * 2
        const distance = 20 + Math.random() * 30
        return new THREE.Vector3(
            this.playerPosition.x + Math.cos(angle) * distance,
            0,
            this.playerPosition.z + Math.sin(angle) * distance
        )
    }
    
    // Debug method
    forceAppear() {
        if (this.figure) {
            this.state = 'chasing'
            this.stateTimer = 0
            this.position.copy(this.playerPosition).add(new THREE.Vector3(15, 0, 15))
            this.figure.position.copy(this.position)
            this.figure.position.y += this.groundOffset
            this.figure.visible = true
            console.log('🔧 Forced creep to appear and chase')
        }
    }
    
    // Debug method to test animations
    testAnimation(animationName) {
        if (this.animations && this.animations[animationName.toLowerCase()]) {
            this.playAnimation(animationName, true)
            console.log(`🎬 Playing animation: ${animationName}`)
        } else {
            console.log(`❌ Animation '${animationName}' not found. Available animations:`)
            console.log(Object.keys(this.animations || {}))
        }
    }
    
    // Debug method to list all animations
    listAnimations() {
        if (this.animations) {
            console.log('🎬 Available animations:')
            Object.keys(this.animations).forEach(name => {
                const isActive = this.currentAction?.getClip().name.toLowerCase() === name
                console.log(`  ${name}${isActive ? ' (ACTIVE)' : ''}`)
            })
            console.log(`Current state: ${this.state}`)
            return Object.keys(this.animations)
        } else {
            console.log('❌ No animations loaded')
            return []
        }
    }
}

// Initialize the creepy figure
const creepyFigure = new CreepyFigure(scene, camera)

// ---------- Lightning Manager ----------
class LightingManager {
    constructor(renderer, light) {
        this.renderer = renderer
        this.light = light
        this.baseExposure = renderer.toneMappingExposure
        this.timeToNextFlash = this._randGap()
        this.sequence = null
    }

    _randGap() { return Math.random() * 7 + 5 }

    _buildFlashSequence() {
        const strokes = 2 + Math.floor(Math.random() * 4)
        let t = 0
        const pulses = []
        for (let i = 0; i < strokes; i++) {
            const duration = 0.035 + Math.random() * 0.09
            const gap = (i === strokes - 1) ? 0 : 0.04 + Math.random() * 0.08
            const intensity = 2.5 + Math.random() * 2
            pulses.push({ start: t, duration, intensity })
            t += duration + gap
        }
        return { time: 0, pulses, total: t }
    }

    update(dt) {
        if (this.sequence) {
            this.sequence.time += dt
            const seq = this.sequence
            const current = seq.pulses.find(p => seq.time >= p.start && seq.time <= p.start + p.duration)
            if (current) {
                const localT = (seq.time - current.start) / current.duration
                const ramp = localT < 0.15 ? (localT / 0.15) : Math.pow(1 - localT, 2)
                const expoBoost = current.intensity * ramp
                this.light.intensity = current.intensity * ramp
                this.renderer.toneMappingExposure = this.baseExposure + expoBoost
            } else {
                this.light.intensity = 0
                this.renderer.toneMappingExposure = this.baseExposure
            }

            if (seq.time >= seq.total) {
                this.sequence = null
                this.light.intensity = 0
                this.renderer.toneMappingExposure = this.baseExposure
                this.timeToNextFlash = this._randGap()
            }
            return
        }

        this.timeToNextFlash -= dt
        if (this.timeToNextFlash <= 0) {
            this.sequence = this._buildFlashSequence()
        }
    }
}

const lightingManager = new LightingManager(renderer, lightningLight)

// Three.js clock for variable delta
const clock = new THREE.Clock()

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': movement.forward = true; break
        case 's': movement.backward = true; break
        case 'a': movement.left = true; break
        case 'd': movement.right = true; break
        case 'shift': movement.shift = true; break
        case 'f': // Debug: force figure to appear
            creepyFigure.forceAppear()
            console.log('Forced creepy figure to appear')
            break
        case 'l': // Debug: list animations
            creepyFigure.listAnimations()
            break
        case '1': // Test idle animation
            creepyFigure.testAnimation('idle')
            break
        case '2': // Test walk animation
            creepyFigure.testAnimation('walk')
            break
        case '3': // Test run animation
            creepyFigure.testAnimation('run')
            break
        case '4': // Test first available animation
            const anims = creepyFigure.listAnimations()
            if (anims.length > 0) creepyFigure.testAnimation(anims[0])
            break
        case '5': // Test second available animation
            const anims2 = creepyFigure.listAnimations()
            if (anims2.length > 1) creepyFigure.testAnimation(anims2[1])
            break
        case '6': // Test third available animation
            const anims3 = creepyFigure.listAnimations()
            if (anims3.length > 2) creepyFigure.testAnimation(anims3[2])
            break
    }
})

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': movement.forward = false; break
        case 's': movement.backward = false; break
        case 'a': movement.left = false; break
        case 'd': movement.right = false; break
        case 'shift': movement.shift = false; break
    }
})

// Animation loop
function animate() {
    requestAnimationFrame(animate)
    
    const delta = clock.getDelta()
    time += delta
    
    // Update lightning & survival timer
    lightingManager.update(delta)

    if (timerElement) {
        const elapsed = Math.floor((performance.now() - startTime) / 1000)
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`
    }
    
    // Update creepy figure
    creepyFigure.update(delta, cameraGroup.position)
    
    // Update camera rotation from mouse
    camera.rotation.order = 'YXZ'
    camera.rotation.y = THREE.MathUtils.degToRad(-lon)
    camera.rotation.x = THREE.MathUtils.degToRad(lat)
    
    // Update player movement
    const speed = movement.shift ? 4 : 8
    
    playerDirection.set(0, 0, 0)
    
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()
    
    const right = new THREE.Vector3(1, 0, 0)
    right.applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()
    
    if (movement.forward) playerDirection.add(forward)
    if (movement.backward) playerDirection.sub(forward)
    if (movement.left) playerDirection.sub(right)
    if (movement.right) playerDirection.add(right)
    
    playerDirection.normalize()
    
    // Apply movement with collision detection
    if (playerDirection.length() > 0) {
        const newPosition = cameraGroup.position.clone()
        newPosition.x += playerDirection.x * speed * delta
        newPosition.z += playerDirection.z * speed * delta
        
        if (!checkCollision(newPosition)) {
            cameraGroup.position.x = newPosition.x
            cameraGroup.position.z = newPosition.z
            
            // Update forest generation based on new position
            updateTrees(newPosition.x, newPosition.z)
            updateRocks(newPosition.x, newPosition.z)
            updateLogs(newPosition.x, newPosition.z)
            
            // Head bobbing
            bobAmount += delta * 5
            cameraGroup.position.y = 2.2 + Math.sin(bobAmount) * 0.05 // Updated from 1.7 to 2.2
            
            // Initialize audio on first movement
            initAudio()
        }
    }
    
    // Animate dust particles
    const playerX = cameraGroup.position.x
    const playerZ = cameraGroup.position.z
    
    dustParticles.forEach((particle, i) => {
        // Apply velocity
        particle.position.add(particle.userData.velocity)
        
        // Add gentle bobbing motion
        particle.position.y = particle.userData.originalY + Math.sin(time * 0.8 + particle.userData.bobOffset) * 0.3
        
        // Wrap around player
        const wrapDistance = 40
        if (particle.position.x > playerX + wrapDistance) {
            particle.position.x = playerX - wrapDistance
        }
        if (particle.position.x < playerX - wrapDistance) {
            particle.position.x = playerX + wrapDistance
        }
        if (particle.position.z > playerZ + wrapDistance) {
            particle.position.z = playerZ - wrapDistance
        }
        if (particle.position.z < playerZ - wrapDistance) {
            particle.position.z = playerZ + wrapDistance
        }
        
        // Keep particles in lower height range
        if (particle.position.y > 10) {
            particle.position.y = 1
            particle.userData.originalY = 1
        }
        if (particle.position.y < 0.5) {
            particle.position.y = 8
            particle.userData.originalY = 8
        }
        
        // Vary opacity slightly for more natural look
        particle.material.opacity = 0.6 + Math.sin(time * 2 + i * 0.5) * 0.2
    })
    
    // Animate mist with player-relative wrapping
    const mistPositions = mistSystem.geometry.attributes.position.array
    for (let i = 0; i < mistCount; i++) {
        // Gentle floating motion
        mistPositions[i * 3 + 1] += Math.sin(time * 0.3 + i * 0.05) * 0.003
        
        // Wrap around player
        const mistWrapDistance = 100
        if (mistPositions[i * 3] > playerX + mistWrapDistance) mistPositions[i * 3] = playerX - mistWrapDistance
        if (mistPositions[i * 3] < playerX - mistWrapDistance) mistPositions[i * 3] = playerX + mistWrapDistance
        if (mistPositions[i * 3 + 1] > 8) mistPositions[i * 3 + 1] = 0
        if (mistPositions[i * 3 + 1] < 0) mistPositions[i * 3 + 1] = 8
        if (mistPositions[i * 3 + 2] > playerZ + mistWrapDistance) mistPositions[i * 3 + 2] = playerZ - mistWrapDistance
        if (mistPositions[i * 3 + 2] < playerZ - mistWrapDistance) mistPositions[i * 3 + 2] = playerZ + mistWrapDistance
    }
    mistSystem.geometry.attributes.position.needsUpdate = true
    
    // Animate extra particles
    const extraPositions = extraParticleSystem.geometry.attributes.position.array
    for (let i = 0; i < extraParticleCount; i++) {
        extraPositions[i * 3] += extraVelocities[i].x
        extraPositions[i * 3 + 1] += extraVelocities[i].y + Math.sin(time * 0.3 + i) * 0.002
        extraPositions[i * 3 + 2] += extraVelocities[i].z
        
        // Wrap particles around
        if (extraPositions[i * 3] > 60) extraPositions[i * 3] = -60
        if (extraPositions[i * 3] < -60) extraPositions[i * 3] = 60
        if (extraPositions[i * 3 + 1] > 35) extraPositions[i * 3 + 1] = 5
        if (extraPositions[i * 3 + 1] < 5) extraPositions[i * 3 + 1] = 35
        if (extraPositions[i * 3 + 2] > 60) extraPositions[i * 3 + 2] = -60
        if (extraPositions[i * 3 + 2] < -60) extraPositions[i * 3 + 2] = 60
    }
    extraParticleSystem.geometry.attributes.position.needsUpdate = true
    
    // Animate foliage (wind effect) and fade-in
    for (const [key, treeData] of trees.entries()) {
        const tree = treeData.mesh
        const index = parseInt(key.split(',')[0]) + parseInt(key.split(',')[1])
        
        // Fade in effect
        if (treeData.opacity < treeData.targetOpacity) {
            treeData.opacity += 0.02
            tree.traverse((child) => {
                if (child.material) {
                    child.material.opacity = treeData.opacity
                }
            })
        }
        
        // Wind animation
        tree.children.forEach((child, childIndex) => {
            if (childIndex > 0) { // Skip trunk
                child.rotation.x = Math.sin(time * 0.5 + index) * 0.02
                child.rotation.z = Math.cos(time * 0.3 + index) * 0.02
            }
        })
    }
    
    // Animate swaying grass
    grassBlades.forEach((grass, i) => {
        const swayTime = time * 0.8 + grass.userData.swayOffset
        
        if (grass.isGroup) {
            // Handle grass clumps
            grass.rotation.x = Math.sin(swayTime) * grass.userData.swayAmount * 0.3
            grass.rotation.z = Math.cos(swayTime * 0.7) * grass.userData.swayAmount * 0.5
        } else {
            // Handle individual grass blades
            grass.rotation.z = grass.userData.originalRotation.z + 
                Math.sin(swayTime) * grass.userData.swayAmount
            
            grass.rotation.x = grass.userData.originalRotation.x + 
                Math.sin(swayTime * 0.7) * grass.userData.swayAmount * 0.5
        }
        
        // Update grass position relative to player
        const grassPlayerDistance = Math.sqrt(
            Math.pow(grass.position.x - playerX, 2) + 
            Math.pow(grass.position.z - playerZ, 2)
        )
        
        if (grassPlayerDistance > 60) {
            // Move grass closer to player
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * 40 + 10
            grass.position.x = playerX + Math.cos(angle) * distance
            grass.position.z = playerZ + Math.sin(angle) * distance
            grass.userData.originalPosition.copy(grass.position)
        }
    })
    
    // Selective bloom rendering
    scene.traverse(darkenNonBloom)
    bloomComposer.render()
    
    scene.traverse(restoreMaterial)
    composer.render()
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    
    // Update composers
    bloomComposer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
    
    // Update bloom pass
    bloomPass.setSize(window.innerWidth, window.innerHeight)
    
    // Update FXAA
    antialiasPass.material.uniforms['resolution'].value.x = 1 / window.innerWidth
    antialiasPass.material.uniforms['resolution'].value.y = 1 / window.innerHeight
})

animate() 