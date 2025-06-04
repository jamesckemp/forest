import { getGlobalScreamBuffer, onModelLoadComplete } from "./utils.js"
import { queueModelLoad } from "./utils.js"
export default class CreepyFigure {
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
            this.pannerNode.coneInnerAngle = 360
            this.pannerNode.coneOuterAngle = 0
            this.pannerNode.coneOuterGain = 0
            
            // Create dry/wet mix for reverb
            this.dryGain = this.audioContext.createGain()
            this.wetGain = this.audioContext.createGain()
            this.dryGain.gain.value = 0.7 // 70% dry signal
            this.wetGain.gain.value = 0.3 // 30% wet (reverb) signal
            
            // Connect audio graph: source -> panner -> dry/wet split -> reverb -> gain -> destination
            this.pannerNode.connect(this.dryGain)
            this.pannerNode.connect(this.reverbNode)
            this.reverbNode.connect(this.wetGain)
            this.dryGain.connect(this.gainNode)
            this.wetGain.connect(this.gainNode)
            this.gainNode.connect(this.audioContext.destination)
            
            // Use global buffer (loads once, shared by all)
            getGlobalScreamBuffer(this.audioContext)
                .then(buffer => {
                    this.screamBuffer = buffer
                    console.log(`✅ Creeper #${this.id || 'main'} using global scream buffer`)
                })
                .catch(error => {
                    console.log(`❌ Creeper #${this.id || 'main'} failed to get global buffer: ${error.message}`)
                    // Fallback to individual loading if global fails
                    this.loadIndividualBuffer()
                })
            
        } catch (error) {
            console.log(`❌ Creeper #${this.id || 'main'} Web Audio failed:`, error)
            // Fallback to simple audio if Web Audio API fails
            this.initFallbackAudio()
        }
    }
    
    loadIndividualBuffer() {
        // Fallback method - load individually if global buffer fails
        fetch('assets/audio/759456__akridiy__a-single-scream-of-a-young-male.wav')
            .then(response => response.arrayBuffer())
            .then(data => this.audioContext.decodeAudioData(data))
            .then(buffer => {
                this.screamBuffer = buffer
                console.log(`✅ Creeper #${this.id || 'main'} loaded individual buffer as fallback`)
            })
            .catch(error => {
                console.log(`❌ Creeper #${this.id || 'main'} individual buffer failed: ${error.message}`)
                this.initFallbackAudio()
            })
    }
    
    createReverbImpulse() {
        // Create a reverb impulse response for a medium-sized creepy space
        const sampleRate = this.audioContext.sampleRate
        const length = sampleRate * 2.5 // 2.5 seconds of reverb
        const impulse = this.audioContext.createBuffer(2, length, sampleRate)
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel)
            for (let i = 0; i < length; i++) {
                // Create exponential decay with some randomness for natural reverb
                const decay = Math.pow(1 - i / length, 2.5)
                const noise = (Math.random() * 2 - 1) * 0.1
                channelData[i] = (noise * decay) * (Math.random() < 0.3 ? 1 : 0.3)
            }
        }
        
        this.reverbNode.buffer = impulse
    }
    
    initFallbackAudio() {
        try {
            this.screamAudio = new Audio('assets/audio/759456__akridiy__a-single-scream-of-a-young-male.wav')
            this.screamAudio.preload = 'auto'
            this.screamAudio.volume = 0
            
            this.screamAudio.addEventListener('ended', () => {
                this.isScreaming = false
                this.nextScreamTime = performance.now() + 
                    (this.minScreamInterval + Math.random() * (this.maxScreamInterval - this.minScreamInterval)) * 1000
            })
            
            this.screamAudio.addEventListener('error', (e) => {
                console.log(`❌ Failed to load fallback scream audio: ${e.message}`)
            })
            
        } catch (error) {
            console.log('❌ Could not initialize fallback audio:', error)
        }
    }
    
    playScream() {
        if (this.isScreaming || performance.now() < this.nextScreamTime) {
            return
        }
        
        // Calculate volume based on distance to player
        const distanceToPlayer = this.position.distanceTo(this.playerPosition)
        let volume = 0
        
        if (distanceToPlayer <= this.minScreamDistance) {
            volume = this.baseScreamVolume
        } else if (distanceToPlayer <= this.maxScreamDistance) {
            const falloff = 1 - (distanceToPlayer - this.minScreamDistance) / 
                (this.maxScreamDistance - this.minScreamDistance)
            volume = this.baseScreamVolume * falloff
        }
        
        // Add slight volume variation
        const volumeVariation = 0.95 + Math.random() * 0.1 // Changed from 0.8-1.2 to 0.95-1.05 range
        volume *= volumeVariation
        
        // Only play if volume is audible
        if (volume < 0.05) return
        
        if (this.audioContext && this.screamBuffer) {
            this.playWebAudioScream(volume)
        } else if (this.screamAudio) {
            this.playFallbackScream(volume)
        }
    }
    
    playWebAudioScream(volume) {
        try {
            // Stop any existing scream
            if (this.screamSource) {
                this.screamSource.stop()
                this.screamSource.disconnect()
            }
            
            // Create new source
            this.screamSource = this.audioContext.createBufferSource()
            this.screamSource.buffer = this.screamBuffer
            
            // Independent speed and pitch control
            const speedVariation = 0.6 + Math.random() * 1.0 // 0.6x to 1.6x speed
            const pitchVariation = 0.5 + Math.random() * 1.5 // 0.5x to 2.0x pitch
            
            this.screamSource.playbackRate.value = speedVariation
            
            // Create pitch shift effect using detune (in cents, 100 cents = 1 semitone)
            const pitchCents = Math.log2(pitchVariation) * 1200
            this.screamSource.detune.value = pitchCents
            
            // Set 3D position of the scream source
            if (this.pannerNode) {
                this.pannerNode.setPosition(this.position.x, this.position.y + 1, this.position.z)
                
                // Set listener position (player position)
                if (this.audioContext.listener.setPosition) {
                    this.audioContext.listener.setPosition(
                        this.playerPosition.x, 
                        this.playerPosition.y, 
                        this.playerPosition.z
                    )
                } else {
                    // Fallback for older browsers
                    this.audioContext.listener.positionX.value = this.playerPosition.x
                    this.audioContext.listener.positionY.value = this.playerPosition.y
                    this.audioContext.listener.positionZ.value = this.playerPosition.z
                }
                
                // Set listener orientation (facing direction)
                const camera = this.scene.getObjectByName ? this.scene.getObjectByName('camera') : null
                if (camera || this.camera) {
                    const cam = camera || this.camera
                    const forward = new THREE.Vector3(0, 0, -1)
                    forward.applyQuaternion(cam.quaternion)
                    const up = new THREE.Vector3(0, 1, 0)
                    up.applyQuaternion(cam.quaternion)
                    
                    if (this.audioContext.listener.setOrientation) {
                        this.audioContext.listener.setOrientation(
                            forward.x, forward.y, forward.z,
                            up.x, up.y, up.z
                        )
                    } else {
                        // Fallback for older browsers
                        this.audioContext.listener.forwardX.value = forward.x
                        this.audioContext.listener.forwardY.value = forward.y
                        this.audioContext.listener.forwardZ.value = forward.z
                        this.audioContext.listener.upX.value = up.x
                        this.audioContext.listener.upY.value = up.y
                        this.audioContext.listener.upZ.value = up.z
                    }
                }
            }
            
            // Set volume
            this.gainNode.gain.value = Math.max(0, volume) // Removed Math.min(1, volume) clamp
            
            // Connect to the new audio graph (source -> panner -> reverb/dry mix -> gain -> destination)
            this.screamSource.connect(this.pannerNode)
            
            // Handle scream end
            this.screamSource.onended = () => {
                this.isScreaming = false
                this.nextScreamTime = performance.now() + 
                    (this.minScreamInterval + Math.random() * (this.maxScreamInterval - this.minScreamInterval)) * 1000
                if (this.screamSource) {
                    this.screamSource.disconnect()
                    this.screamSource = null
                }
            }
            
            // Start playing
            this.screamSource.start()
            this.isScreaming = true
            
            const speedDesc = speedVariation < 0.8 ? 'SLOW' : speedVariation > 1.3 ? 'FAST' : 'normal'
            const pitchDesc = pitchVariation < 0.7 ? 'DEMONIC' : 
                            pitchVariation > 1.4 ? 'SHRILL' : 
                            pitchVariation < 1.0 ? 'low' : 'high'
            
            // Calculate direction for logging
            const direction = this.position.clone().sub(this.playerPosition).normalize()
            const angle = Math.atan2(direction.x, direction.z) * 180 / Math.PI
            const directionDesc = angle > -45 && angle <= 45 ? 'FRONT' :
                                angle > 45 && angle <= 135 ? 'RIGHT' :
                                angle > 135 || angle <= -135 ? 'BEHIND' : 'LEFT'
            
            console.log(`👹 Creeper #${this.id || 'main'} screaming: Speed ${speedVariation.toFixed(2)}x (${speedDesc}), Pitch ${pitchVariation.toFixed(2)}x (${pitchDesc}), Volume ${volume.toFixed(2)}, Direction: ${directionDesc}`)
            
        } catch (error) {
            console.log('❌ Error playing Web Audio scream:', error)
            // Fallback to simple audio
            this.playFallbackScream(volume)
        }
    }
    
    playFallbackScream(volume) {
        try {
            this.screamAudio.currentTime = 0
            
            // Simple playback rate variation (affects both speed and pitch together)
            const playbackVariation = 0.5 + Math.random() * 1.5
            this.screamAudio.playbackRate = playbackVariation
            this.screamAudio.volume = Math.max(0, Math.min(1, volume))
            
            this.screamAudio.play().then(() => {
                this.isScreaming = true
                console.log(`👹 Creeper #${this.id || 'main'} screaming (fallback): Rate ${playbackVariation.toFixed(2)}x, Volume ${volume.toFixed(2)}`)
            }).catch(e => {
                console.log(`❌ Failed to play fallback scream: ${e.message}`)
            })
            
        } catch (error) {
            console.log('❌ Error playing fallback scream:', error)
        }
    }
    
    stopScream() {
        if (this.screamSource && this.isScreaming) {
            try {
                this.screamSource.stop()
                this.screamSource.disconnect()
                this.screamSource = null
            } catch (e) {
                // Source might already be stopped
            }
            this.isScreaming = false
            console.log(`🔇 Creeper #${this.id || 'main'} stopped screaming`)
        } else if (this.screamAudio && this.isScreaming) {
            this.screamAudio.pause()
            this.screamAudio.currentTime = 0
            this.isScreaming = false
            console.log(`🔇 Creeper #${this.id || 'main'} stopped screaming (fallback)`)
        }
    }
    
    updateScreamAudio() {
        if (!this.isScreaming) return
        
        // Update 3D position of the scream source
        if (this.pannerNode && this.audioContext) {
            this.pannerNode.setPosition(this.position.x, this.position.y + 1, this.position.z)
            
            // Update listener position (player position)
            if (this.audioContext.listener.setPosition) {
                this.audioContext.listener.setPosition(
                    this.playerPosition.x, 
                    this.playerPosition.y, 
                    this.playerPosition.z
                )
            } else {
                // Fallback for older browsers
                this.audioContext.listener.positionX.value = this.playerPosition.x
                this.audioContext.listener.positionY.value = this.playerPosition.y
                this.audioContext.listener.positionZ.value = this.playerPosition.z
            }
        }
        
        // Update volume based on current distance
        const distanceToPlayer = this.position.distanceTo(this.playerPosition)
        let volume = 0
        
        if (distanceToPlayer <= this.minScreamDistance) {
            volume = this.baseScreamVolume
        } else if (distanceToPlayer <= this.maxScreamDistance) {
            const falloff = 1 - (distanceToPlayer - this.minScreamDistance) / 
                (this.maxScreamDistance - this.minScreamDistance)
            volume = this.baseScreamVolume * falloff
        }
        
        // Apply volume
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, volume) // Removed Math.min(1, volume) clamp
        } else if (this.screamAudio) {
            this.screamAudio.volume = Math.max(0, Math.min(1, volume)) // Keep clamp for fallback audio
        }
        
        // Stop scream if player gets too close (creeper caught them)
        if (distanceToPlayer < 2) {
            this.stopScream()
        }
    }
    
    loadModel() {
        const loader = new GLTFLoader()
        
        loader.load('assets/models/runner.glb', (gltf) => {
            this.figure = gltf.scene
            
            // Setup model properties - smaller scale and proper ground positioning
            this.figure.scale.setScalar(0.7) // Reduced from 1.0 to 0.7
            this.figure.castShadow = true
            this.figure.receiveShadow = true
            
            // Calculate bounding box after scaling to position on ground properly
            this.figure.updateMatrixWorld(true) // Force update after scaling
            const box = new THREE.Box3().setFromObject(this.figure)
            this.groundOffset = -box.min.y + 0.1 // Offset to put bottom of model on ground with small buffer
            
            // Apply initial position if it was set before model loaded
            if (this.position.length() > 0) {
                this.figure.position.copy(this.position)
                this.figure.position.y += this.groundOffset
            }
            
            // Make materials darker/creepier
            this.figure.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true
                    child.receiveShadow = true
                    
                    if (child.material) {
                        child.material.color.setHex(0x050508) // Almost black with tiny hint of blue
                        child.material.emissive.setHex(0x000005) // Very subtle dark blue emissive
                        
                        // Apply fade-in properties if they were set before model loaded
                        if (this.opacity !== undefined) {
                            child.material.transparent = true
                            child.material.opacity = this.opacity
                        }
                    }
                }
            })
            
            // Apply visibility if it was set before model loaded
            if (this.initiallyVisible !== undefined) {
                this.figure.visible = this.initiallyVisible
            }
            
            // Setup animations if available
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.figure)
                this.animations = {}
                this.currentAction = null
                this.previousAction = null
                
                // Removed animation logging to prevent performance spikes during model loading
                
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip)
                    this.animations[clip.name.toLowerCase()] = action
                    
                    // Set up animation properties
                    action.setEffectiveTimeScale(1)
                    action.setEffectiveWeight(1)
                })
                
                // Removed debug animation mapping logging to prevent performance spikes
                
                // Defer animation initialization to prevent blocking
                setTimeout(() => {
                    this.playIdleAnimation()
                }, 10) // Small delay to prevent performance spike
            } else {
                console.log('⚠️ No animations found in runner.glb')
            }
            
            // Add to scene if not already added
            if (!this.figure.parent) {
                this.scene.add(this.figure)
            }
            
            console.log('🔥 Runner figure loaded and ready!')
            
            // Notify queue system that loading is complete
            onModelLoadComplete()
        }, 
        (progress) => {
            // console.log('Loading runner.glb:', Math.round(progress.loaded / progress.total * 100) + '%')
        },
        (error) => {
            console.error('❌ Failed to load runner.glb:', error)
            console.log('📁 Make sure runner.glb is in the same folder as index.html')
            this.createFallbackFigure()
            
            // Notify queue system that loading is complete (even on error)
            onModelLoadComplete()
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
        
        // Apply visibility modifiers based on player state
        let effectiveDetectionRange = this.detectionRange
        
        // Crouch reduces detection range by 50%
        if (playerState.stance === 'crouching') {
            effectiveDetectionRange *= 0.5
        }
        
        // Being in tall grass while crouching makes you nearly invisible
        if (playerState.isInGrass && playerState.stance === 'crouching') {
            effectiveDetectionRange *= 0.1 // 90% reduction
        }
        
        // Noise increases detection range
        effectiveDetectionRange *= (1 + playerState.noiseLevel * 0.5)
        
        // Distance check with modified range
        if (distance > effectiveDetectionRange) {
            return false
        }
        
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
        
        return true
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
                
                // Start screaming when chase begins
                this.playScream()
            }

            // Target player's ground position, not camera position
            this.targetPosition.copy(this.playerPosition)
            this.targetPosition.y = 0 // Force target to ground level
            this.moveTowards(this.targetPosition, this.chaseSpeed, deltaTime)
            this.isMoving = true
            
            // Continue screaming while chasing (respecting cooldowns)
            if (!this.isScreaming && performance.now() >= this.nextScreamTime) {
                this.playScream()
            }

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
                // Lost sight of player, go back to idle and stop screaming
                this.state = 'idle'
                this.stateTimer = 0
                this.idleTime = 2 + Math.random() * 3
                this.stopScream()
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
        
        // Update scream audio (volume based on distance, stop if too close)
        this.updateScreamAudio()

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
    
    queueModelLoad() {
        // Add this creeper to the loading queue instead of loading immediately
        queueModelLoad(this)
    }
    
    loadModelNow() {
        // This method is called by the queue system when it's this creeper's turn to load
        this.loadModel()
    }
}
