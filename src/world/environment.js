import * as THREE from 'three'

export const treeGrid = new Map()
export const rockGrid = new Map()
export const logGrid = new Map()
export const tallGrassPatchGrid = new Map()
export const GRID_SIZE = 10

export function setupEnvironment(scene) {
    
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
}
