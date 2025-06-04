import * as THREE from 'three'

export const objective = {
    position: { x: 350, z: 350 },
    radius: 5,
    completed: false,
    marker: null
}

export function createObjectiveMarker(scene) {
    const markerGeometry = new THREE.CylinderGeometry(2, 2, 8, 8)
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    })
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.set(objective.position.x, 4, objective.position.z)
    marker.castShadow = true
    marker.userData = {
        originalEmissiveIntensity: 0.5,
        pulseSpeed: 0.003
    }
    objective.marker = marker
    scene.add(marker)
    console.log(`🎯 Objective marker placed at (${objective.position.x}, ${objective.position.z})`)
}

export function checkObjectiveCompletion(cameraGroup) {
    if (objective.completed) return
    const distance = Math.sqrt(
        Math.pow(cameraGroup.position.x - objective.position.x, 2) +
        Math.pow(cameraGroup.position.z - objective.position.z, 2)
    )
    if (distance <= objective.radius) {
        objective.completed = true
        console.log('🎉 OBJECTIVE COMPLETED! You survived the forest!')
        const div = document.createElement('div')
        div.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,255,0,0.9);color:black;padding:20px;border-radius:10px;font-size:24px;font-weight:bold;z-index:2000;text-align:center;`
        div.innerHTML = `🎉 MISSION COMPLETE! 🎉<br>You survived the forest!<br><small>Press R to restart</small>`
        document.body.appendChild(div)
        const restartHandler = e => {
            if (e.key.toLowerCase() === 'r') location.reload()
        }
        document.addEventListener('keydown', restartHandler)
    }
}

window.objective = objective
