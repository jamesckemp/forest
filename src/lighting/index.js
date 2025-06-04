import * as THREE from 'three'

export class LightingManager {
    constructor(renderer, light, minimap = null) {
        this.renderer = renderer
        this.light = light
        this.minimap = minimap
        this.baseExposure = renderer.toneMappingExposure
        this.timeToNextFlash = this._randGap()
        this.sequence = null
        this.wasLightningActive = false
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

    update(dt, creepyFigure, creepers) {
        const isLightningActive = this.sequence !== null

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

                if (!this.wasLightningActive && this.minimap) {
                    const positions = this.minimap.getCreeperPositions(creepyFigure, creepers)
                    this.minimap.onLightningFlash(positions)
                }
            } else {
                this.light.intensity = 0
                this.renderer.toneMappingExposure = this.baseExposure
            }

            if (seq.time >= seq.total) {
                this.sequence = null
                this.light.intensity = 0
                this.renderer.toneMappingExposure = this.baseExposure
                this.timeToNextFlash = this._randGap()

                if (this.minimap) {
                    this.minimap.onLightningEnd()
                }
            }
        } else {
            this.timeToNextFlash -= dt
            if (this.timeToNextFlash <= 0) {
                this.sequence = this._buildFlashSequence()
            }
        }

        this.wasLightningActive = isLightningActive
    }

    setMinimap(minimap) {
        this.minimap = minimap
    }
}

export function setupLighting(scene, renderer) {
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

    const lightningLight = new THREE.DirectionalLight(0xffffff, 0)
    lightningLight.position.set(0, 500, 0)
    scene.add(lightningLight)

    const rayLight = new THREE.DirectionalLight(0xFFB85F, 0.3)
    rayLight.position.copy(sunLight.position)
    scene.add(rayLight)

    function createSunTexture() {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = canvas.width / 2

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
    sun.visible = false

    const fogColor = new THREE.Color(0xFFE4B5)
    renderer.setClearColor(fogColor, 0.8)

    return { ambientLight, sunLight, lightningLight, rayLight, sun }
}
