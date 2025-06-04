import * as THREE from 'three'

export function setupPlayer(scene, camera, renderer, treeGrid, rockGrid, GRID_SIZE) {
    const cameraGroup = new THREE.Group()
    cameraGroup.add(camera)
    cameraGroup.position.set(0, 2.2, 10)
    scene.add(cameraGroup)

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

    const movementSpeeds = { crouch:2, walk:4, run:8, sprint:12 }
    const staminaSystem = { current:100, max:100, sprintCost:25, regenRate:15, minSprintStamina:10 }

    const playerState = { stance:'standing', isInGrass:false, noiseLevel:0, visibilityMultiplier:1 }

    const playerVelocity = new THREE.Vector3()
    const playerDirection = new THREE.Vector3()

    let lat = 0
    let lon = 0

    document.addEventListener('mousemove', e => {
        if (document.pointerLockElement === renderer.domElement) {
            lon += e.movementX * 0.2
            lat -= e.movementY * 0.2
            lat = Math.max(-85, Math.min(85, lat))
        }
    })

    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock()
    })

    function checkCollision(position) {
        const playerGridX = Math.floor(position.x / GRID_SIZE)
        const playerGridZ = Math.floor(position.z / GRID_SIZE)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${playerGridX + dx},${playerGridZ + dz}`
                if (treeGrid.has(key)) {
                    const treePos = treeGrid.get(key)
                    const dist = Math.sqrt(Math.pow(position.x - treePos.x, 2) + Math.pow(position.z - treePos.z, 2))
                    if (dist < treePos.radius + 1) return true
                }
                if (rockGrid.has(key)) {
                    const rock = rockGrid.get(key)
                    if (position.distanceTo(rock.position) < rock.radius + 1) return true
                }
            }
        }
        return false
    }

    return { cameraGroup, movement, movementSpeeds, staminaSystem, playerState, playerVelocity, playerDirection, latRef: ()=>lat, setLat: v=>{lat=v}, lonRef: ()=>lon, setLon: v=>{lon=v}, checkCollision }
}
