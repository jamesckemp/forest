import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Module-scoped variables and functions for model/audio loading
let modelLoadingQueue = [];
let isLoadingModel = false;
let globalScreamBuffer = null;
let isLoadingGlobalBuffer = false;

function getGlobalScreamBuffer(audioContext) {
    return new Promise((resolve, reject) => {
        if (globalScreamBuffer) {
            resolve(globalScreamBuffer);
            return;
        }
        if (isLoadingGlobalBuffer) {
            const checkBuffer = () => {
                if (globalScreamBuffer) {
                    resolve(globalScreamBuffer);
                } else if (!isLoadingGlobalBuffer) {
                    reject(new Error('Buffer loading failed'));
                } else {
                    setTimeout(checkBuffer, 100);
                }
            };
            checkBuffer();
            return;
        }
        isLoadingGlobalBuffer = true;
        fetch('759456__akridiy__a-single-scream-of-a-young-male.wav')
            .then(response => response.arrayBuffer())
            .then(data => audioContext.decodeAudioData(data))
            .then(buffer => {
                globalScreamBuffer = buffer;
                isLoadingGlobalBuffer = false;
                resolve(buffer);
            })
            .catch(error => {
                isLoadingGlobalBuffer = false;
                reject(error);
            });
    });
}

function queueModelLoad(creeper) {
    modelLoadingQueue.push(creeper);
    processModelQueue();
}

function processModelQueue() {
    if (isLoadingModel || modelLoadingQueue.length === 0) return;
    isLoadingModel = true;
    const nextCreeper = modelLoadingQueue.shift();
    nextCreeper.loadModelNow();
}

function onModelLoadComplete() {
    isLoadingModel = false;
    setTimeout(() => {
        processModelQueue();
    }, 100);
}

export default class CreepyFigure {
    constructor(scene, camera, playerState, treeGrid, rocks, initialPosition = new THREE.Vector3(0,0,0)) {
        this.scene = scene;
        this.camera = camera; // Main camera reference
        this.playerState = playerState; 
        this.treeGrid = treeGrid;       
        this.rocks = rocks;             

        this.figure = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.previousAction = null;
        this.playerPosition = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.groundOffset = 0;

        this.state = 'idle';
        this.stateTimer = 0;
        this.position = initialPosition.clone();
        this.targetPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.lastKnownPlayerPosition = new THREE.Vector3();

        this.idleTime = 3 + Math.random() * 4;
        this.wanderSpeed = 2;
        this.chaseSpeed = 8;
        this.detectionRange = 45; 
        this.canSeePlayer = false;
        this.isMoving = false;

        this.spawnDelay = 15; 
        this.gameStartTime = performance.now();
        this.detectionActive = false;

        this.audioContext = null;
        this.screamBuffer = null;
        this.screamSource = null;
        this.gainNode = null;
        this.reverbNode = null;
        this.pannerNode = null;
        this.dryGain = null;
        this.wetGain = null;
        this.isScreaming = false;
        this.screamCooldown = 0;
        this.minScreamInterval = 2;
        this.maxScreamInterval = 5;
        this.nextScreamTime = 0;
        this.baseScreamVolume = 6.0;
        this.maxScreamDistance = 25;
        this.minScreamDistance = 3;
        
        this.id = null; 
        this.opacity = 1; 
        this.targetOpacity = 1;
        this.initiallyVisible = true; 
        this.fadeStartTime = 0;
        this.fadeInDelay = 0;

        this.initScreamAudio();
        this.queueModelLoad(); // Uses module-scoped queueModelLoad
    }

    initScreamAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0;
            this.reverbNode = this.audioContext.createConvolver();
            this.createReverbImpulse();
            this.pannerNode = this.audioContext.createPanner();
            this.pannerNode.panningModel = 'HRTF';
            this.pannerNode.distanceModel = 'inverse';
            this.pannerNode.refDistance = 1;
            this.pannerNode.maxDistance = 25;
            this.pannerNode.rolloffFactor = 1.5;
            this.pannerNode.coneInnerAngle = 360;
            this.pannerNode.coneOuterAngle = 0;
            this.pannerNode.coneOuterGain = 0;
            this.dryGain = this.audioContext.createGain();
            this.wetGain = this.audioContext.createGain();
            this.dryGain.gain.value = 0.7;
            this.wetGain.gain.value = 0.3;
            this.pannerNode.connect(this.dryGain);
            this.pannerNode.connect(this.reverbNode);
            this.reverbNode.connect(this.wetGain);
            this.dryGain.connect(this.gainNode);
            this.wetGain.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            getGlobalScreamBuffer(this.audioContext) // Use module-scoped function
                .then(buffer => {
                    this.screamBuffer = buffer;
                    console.log(`✅ Creeper #${this.id || 'main'} using global scream buffer`);
                })
                .catch(error => {
                    console.log(`❌ Creeper #${this.id || 'main'} failed to get global buffer: ${error.message}`);
                    this.loadIndividualBuffer();
                });
        } catch (error) {
            console.log(`❌ Creeper #${this.id || 'main'} Web Audio failed:`, error);
            this.initFallbackAudio();
        }
    }

    loadIndividualBuffer() {
        fetch('759456__akridiy__a-single-scream-of-a-young-male.wav')
            .then(response => response.arrayBuffer())
            .then(data => this.audioContext.decodeAudioData(data))
            .then(buffer => {
                this.screamBuffer = buffer;
                console.log(`✅ Creeper #${this.id || 'main'} loaded individual buffer as fallback`);
            })
            .catch(error => {
                console.log(`❌ Creeper #${this.id || 'main'} individual buffer failed: ${error.message}`);
                this.initFallbackAudio();
            });
    }

    createReverbImpulse() {
        if (!this.audioContext) return; // Guard against context not being initialized
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2.5;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2.5);
                const noise = (Math.random() * 2 - 1) * 0.1;
                channelData[i] = (noise * decay) * (Math.random() < 0.3 ? 1 : 0.3);
            }
        }
        this.reverbNode.buffer = impulse;
    }

    initFallbackAudio() {
        try {
            this.screamAudio = new Audio('759456__akridiy__a-single-scream-of-a-young-male.wav');
            this.screamAudio.preload = 'auto';
            this.screamAudio.volume = 0;
            this.screamAudio.addEventListener('ended', () => {
                this.isScreaming = false;
                this.nextScreamTime = performance.now() +
                    (this.minScreamInterval + Math.random() * (this.maxScreamInterval - this.minScreamInterval)) * 1000;
            });
            this.screamAudio.addEventListener('error', (e) => {
                console.log(`❌ Failed to load fallback scream audio for creeper #${this.id || 'main'}: ${e.message}`);
            });
        } catch (error) {
            console.log(`❌ Could not initialize fallback audio for creeper #${this.id || 'main'}:`, error);
        }
    }

    playScream() {
        if (this.isScreaming || performance.now() < this.nextScreamTime) {
            return;
        }
        const distanceToPlayer = this.position.distanceTo(this.playerPosition);
        let volume = 0;
        if (distanceToPlayer <= this.minScreamDistance) {
            volume = this.baseScreamVolume;
        } else if (distanceToPlayer <= this.maxScreamDistance) {
            const falloff = 1 - (distanceToPlayer - this.minScreamDistance) /
                (this.maxScreamDistance - this.minScreamDistance);
            volume = this.baseScreamVolume * falloff;
        }
        const volumeVariation = 0.95 + Math.random() * 0.1;
        volume *= volumeVariation;
        if (volume < 0.05) return;
        if (this.audioContext && this.screamBuffer && this.pannerNode) { // Added pannerNode check
            this.playWebAudioScream(volume);
        } else if (this.screamAudio) {
            this.playFallbackScream(volume);
        }
    }

    playWebAudioScream(volume) {
        if (!this.audioContext || !this.screamBuffer || !this.pannerNode) return; // Guard
        try {
            if (this.screamSource) {
                this.screamSource.stop();
                this.screamSource.disconnect();
            }
            this.screamSource = this.audioContext.createBufferSource();
            this.screamSource.buffer = this.screamBuffer;
            const speedVariation = 0.6 + Math.random() * 1.0;
            const pitchVariation = 0.5 + Math.random() * 1.5;
            this.screamSource.playbackRate.value = speedVariation;
            const pitchCents = Math.log2(pitchVariation) * 1200;
            this.screamSource.detune.value = pitchCents;

            this.pannerNode.setPosition(this.position.x, this.position.y + 1, this.position.z);
            if (this.audioContext.listener.setPosition) {
                this.audioContext.listener.setPosition(
                    this.playerPosition.x,
                    this.playerPosition.y,
                    this.playerPosition.z
                );
            } else {
                this.audioContext.listener.positionX.value = this.playerPosition.x;
                this.audioContext.listener.positionY.value = this.playerPosition.y;
                this.audioContext.listener.positionZ.value = this.playerPosition.z;
            }
            
            const cam = this.camera; 
            if (cam) {
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(cam.quaternion);
                const up = new THREE.Vector3(0, 1, 0);
                up.applyQuaternion(cam.quaternion);
                if (this.audioContext.listener.setOrientation) {
                    this.audioContext.listener.setOrientation(
                        forward.x, forward.y, forward.z,
                        up.x, up.y, up.z
                    );
                } else {
                    this.audioContext.listener.forwardX.value = forward.x;
                    this.audioContext.listener.forwardY.value = forward.y;
                    this.audioContext.listener.forwardZ.value = forward.z;
                    this.audioContext.listener.upX.value = up.x;
                    this.audioContext.listener.upY.value = up.y;
                    this.audioContext.listener.upZ.value = up.z;
                }
            }
            
            this.gainNode.gain.value = Math.max(0, volume);
            this.screamSource.connect(this.pannerNode);
            this.screamSource.onended = () => {
                this.isScreaming = false;
                this.nextScreamTime = performance.now() +
                    (this.minScreamInterval + Math.random() * (this.maxScreamInterval - this.minScreamInterval)) * 1000;
                if (this.screamSource) {
                    this.screamSource.disconnect();
                    this.screamSource = null;
                }
            };
            this.screamSource.start();
            this.isScreaming = true;
            // console.log(...) // Keep console logs for debugging for now
        } catch (error) {
            console.log(`❌ Error playing Web Audio scream for creeper #${this.id || 'main'}:`, error);
            this.playFallbackScream(volume);
        }
    }

    playFallbackScream(volume) {
        if (!this.screamAudio) return; // Guard
        try {
            this.screamAudio.currentTime = 0;
            const playbackVariation = 0.5 + Math.random() * 1.5;
            this.screamAudio.playbackRate = playbackVariation;
            this.screamAudio.volume = Math.max(0, Math.min(1, volume));
            this.screamAudio.play().then(() => {
                this.isScreaming = true;
            }).catch(e => {
                console.log(`❌ Failed to play fallback scream for creeper #${this.id || 'main'}: ${e.message}`);
            });
        } catch (error) {
            console.log(`❌ Error playing fallback scream for creeper #${this.id || 'main'}:`, error);
        }
    }

    stopScream() {
        if (this.screamSource && this.isScreaming) {
            try {
                this.screamSource.stop();
                this.screamSource.disconnect();
                this.screamSource = null;
            } catch (e) { /* Source might already be stopped */ }
            this.isScreaming = false;
        } else if (this.screamAudio && this.isScreaming) {
            this.screamAudio.pause();
            this.screamAudio.currentTime = 0;
            this.isScreaming = false;
        }
    }

    updateScreamAudio() {
        if (!this.isScreaming || !this.audioContext) return;
        if (this.pannerNode) {
            this.pannerNode.setPosition(this.position.x, this.position.y + 1, this.position.z);
            if (this.audioContext.listener.setPosition) {
                this.audioContext.listener.setPosition(
                    this.playerPosition.x,
                    this.playerPosition.y,
                    this.playerPosition.z
                );
            } else {
                this.audioContext.listener.positionX.value = this.playerPosition.x;
                this.audioContext.listener.positionY.value = this.playerPosition.y;
                this.audioContext.listener.positionZ.value = this.playerPosition.z;
            }
        }
        const distanceToPlayer = this.position.distanceTo(this.playerPosition);
        let volume = 0;
        if (distanceToPlayer <= this.minScreamDistance) {
            volume = this.baseScreamVolume;
        } else if (distanceToPlayer <= this.maxScreamDistance) {
            const falloff = 1 - (distanceToPlayer - this.minScreamDistance) /
                (this.maxScreamDistance - this.minScreamDistance);
            volume = this.baseScreamVolume * falloff;
        }
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, volume);
        } else if (this.screamAudio) {
            this.screamAudio.volume = Math.max(0, Math.min(1, volume));
        }
        if (distanceToPlayer < 2) {
            this.stopScream();
        }
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('./runner.glb', (gltf) => {
            this.figure = gltf.scene;
            this.figure.scale.setScalar(0.7);
            this.figure.castShadow = true;
            this.figure.receiveShadow = true;
            this.figure.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(this.figure);
            this.groundOffset = -box.min.y + 0.1;

            if (this.position.lengthSq() > 0) { // Check if position is not zero vector
                this.figure.position.copy(this.position);
                this.figure.position.y += this.groundOffset;
            }
            
            this.figure.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.color.setHex(0x050508);
                        child.material.emissive.setHex(0x000005);
                        if (this.opacity !== undefined && this.opacity < 1) {
                            child.material.transparent = true;
                            child.material.opacity = this.opacity;
                        }
                    }
                }
            });

            if (this.initiallyVisible !== undefined) {
                this.figure.visible = this.initiallyVisible;
            }

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.figure);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip);
                    this.animations[clip.name.toLowerCase()] = action;
                    action.setEffectiveTimeScale(1);
                    action.setEffectiveWeight(1);
                });
                setTimeout(() => {
                    this.playIdleAnimation();
                }, 10);
            } else {
                console.log(`⚠️ No animations found in runner.glb for creeper #${this.id || 'main'}`);
            }
            if (!this.figure.parent) {
                this.scene.add(this.figure);
            }
            console.log(`🔥 Runner figure loaded for creeper #${this.id || 'main'}`);
            onModelLoadComplete();
        },
        (progress) => { /* console.log('Loading runner.glb progress'); */ },
        (error) => {
            console.error(`❌ Failed to load runner.glb for creeper #${this.id || 'main'}:`, error);
            this.createFallbackFigure();
            onModelLoadComplete();
        });
    }

    playIdleAnimation() {
        if (!this.animations || Object.keys(this.animations).length === 0) return;
        const idleAnimation = this.findAnimation(['idle', 'standing', 'rest', 'default']);
        if (idleAnimation) {
            this.playAnimation(idleAnimation, true);
            return;
        }
        const firstAnim = Object.keys(this.animations)[0];
        this.playAnimation(firstAnim, true);
    }

    findAnimation(nameList) {
        if (!this.animations) return null;
        for (const name of nameList) {
            const lowerName = name.toLowerCase();
            if (this.animations[lowerName]) {
                return lowerName;
            }
            for (const animKey of Object.keys(this.animations)) {
                const lowerKey = animKey.toLowerCase();
                if (lowerKey.endsWith('|' + lowerName) || lowerKey.endsWith(lowerName)) {
                    return animKey; // Return the actual key found
                }
            }
        }
        return null;
    }

    playAnimation(name, loop = true) {
        if (!this.animations || !name) return;
        const newActionName = name.toLowerCase(); 
        const newAction = this.animations[newActionName];
        if (!newAction) {
            // console.log(`⚠️ Animation '${newActionName}' not found for creeper #${this.id || 'main'}. Available:`, Object.keys(this.animations));
            return;
        }
        if (this.currentAction === newAction) return;
        this.previousAction = this.currentAction;
        this.currentAction = newAction;
        if (this.previousAction) {
            this.previousAction.fadeOut(0.3);
        }
        this.currentAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(0.3)
            .play();
        if (loop) {
            this.currentAction.setLoop(THREE.LoopRepeat);
        } else {
            this.currentAction.setLoop(THREE.LoopOnce);
            this.currentAction.clampWhenFinished = true;
        }
    }
    
    getAnimationForState(speed, stateType) {
        if (!this.animations) return null;
        const animationMap = {
            idle: ['idle', 'standing', 'rest', 'default'],
            walk: ['walk', 'walking', 'move', 'forward'],
            run: ['run', 'running', 'sprint', 'fast']
        };
        let animType = 'idle';
        if (stateType === 'run' || speed > 4) {
            animType = 'run';
        } else if (stateType === 'walk' || speed > 1) {
            animType = 'walk';
        }
        const possibleNames = animationMap[animType] || animationMap['idle'];
        const foundName = this.findAnimation(possibleNames);
        return foundName || (Object.keys(this.animations).length > 0 ? Object.keys(this.animations)[0] : null);
    }

    createFallbackFigure() {
        console.log(`🔧 Creating fallback creepy figure for #${this.id || 'main'}...`);
        const group = new THREE.Group();
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 2.2, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a, emissive: 0x110000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, emissive: 0x220000 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.6;
        head.castShadow = true;
        group.add(head);
        const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 2.7, 0.15);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 2.7, 0.15);
        group.add(rightEye);
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.6, 1.5, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.6, 1.5, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        group.add(rightArm);
        this.figure = group;
        
        this.figure.position.copy(this.position); 
        // this.groundOffset for fallback is 0, effectively.
        this.figure.position.y += 0; 
        
        if (!this.figure.parent) {
             this.scene.add(this.figure);
        }
        console.log(`✅ Fallback creepy figure created for #${this.id || 'main'}`);
    }

    spawnAtRandomLocation(referencePosition = new THREE.Vector3(0,0,0)) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 20; 
        this.position.set(
            referencePosition.x + Math.cos(angle) * distance,
            0,
            referencePosition.z + Math.sin(angle) * distance
        );
        if (this.figure) {
            this.figure.position.copy(this.position);
            this.figure.position.y += this.groundOffset; // Apply ground offset
        }
    }

    checkLineOfSight(creepPos, playerPos) {
        const direction = playerPos.clone().sub(creepPos).normalize();
        const distance = creepPos.distanceTo(playerPos);
        let effectiveDetectionRange = this.detectionRange;

        if (this.playerState.stance === 'crouching') {
            effectiveDetectionRange *= 0.5;
        }
        if (this.playerState.isInGrass && this.playerState.stance === 'crouching') {
            effectiveDetectionRange *= 0.1;
        }
        effectiveDetectionRange *= (1 + this.playerState.noiseLevel * 0.5);
        if (distance > effectiveDetectionRange) {
            return false;
        }
        this.raycaster.set(creepPos.clone().add(new THREE.Vector3(0, 1, 0)), direction);
        
        const obstacles = [];
        // Iterate over treeGrid (Map) values, which should be tree meshes or objects containing them
        for (const treeData of this.treeGrid.values()) { 
            const treeMesh = treeData.mesh || treeData; // Handle both {mesh: obj} and direct mesh storage
            if (treeMesh instanceof THREE.Object3D) {
                treeMesh.traverse((child) => {
                    if (child.isMesh) {
                        obstacles.push(child);
                    }
                });
            }
        }
        // Iterate over rocks (Map) values
        for (const rockMesh of this.rocks.values()) {
            const actualRockMesh = rockMesh.mesh || rockMesh; // Handle both {mesh: obj} and direct mesh storage
            if (actualRockMesh instanceof THREE.Object3D) {
                actualRockMesh.traverse((child) => { // Rocks might be groups
                    if (child.isMesh) {
                        obstacles.push(child);
                    }
                });
            }
        }

        const intersects = this.raycaster.intersectObjects(obstacles);
        if (intersects.length > 0 && intersects[0].distance < distance - 2) {
            return false;
        }
        return true;
    }

    update(deltaTime, playerPosition) {
        if (!this.figure) return;
        this.playerPosition.copy(playerPosition);
        this.stateTimer += deltaTime;
        const distanceToPlayer = this.position.distanceTo(this.playerPosition);
        const timeSinceStart = (performance.now() - this.gameStartTime) / 1000;
        const canDetect = timeSinceStart > this.spawnDelay;

        if (canDetect && !this.detectionActive) {
            this.detectionActive = true;
            // console.log(`👁️ Creeper #${this.id || 'main'} can now detect!`);
        }
        this.canSeePlayer = canDetect && this.checkLineOfSight(this.position, this.playerPosition);

        if (this.canSeePlayer && distanceToPlayer < this.detectionRange) {
            if (this.state !== 'chasing') {
                this.state = 'chasing';
                this.stateTimer = 0;
                // console.log(`🏃 Creeper #${this.id || 'main'} spotted player! Chasing!`);
                this.playScream();
            }
            this.targetPosition.copy(this.playerPosition);
            this.targetPosition.y = 0;
            this.moveTowards(this.targetPosition, this.chaseSpeed, deltaTime);
            this.isMoving = true;
            if (!this.isScreaming && performance.now() >= this.nextScreamTime) {
                this.playScream();
            }
            const directionToPlayer = this.playerPosition.clone().sub(this.position);
            directionToPlayer.y = 0;
            directionToPlayer.normalize();
            if (directionToPlayer.lengthSq() > 0) {
                const angle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
                this.figure.rotation.y = angle;
            }
        } else {
            if (this.state === 'chasing') {
                this.state = 'idle';
                this.stateTimer = 0;
                this.idleTime = 2 + Math.random() * 3;
                this.stopScream();
                // console.log(`❓ Creeper #${this.id || 'main'} lost sight of player.`);
            }
            if (this.state === 'idle') {
                this.isMoving = false;
                if (this.stateTimer > this.idleTime) {
                    this.state = 'wandering';
                    this.stateTimer = 0;
                    this.targetPosition = this.getRandomWanderPoint();
                }
            } else if (this.state === 'wandering') {
                const distanceToTarget = this.position.distanceTo(this.targetPosition);
                if (distanceToTarget < 2 || this.stateTimer > 8) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                    this.idleTime = 3 + Math.random() * 4;
                    this.isMoving = false;
                } else {
                    this.moveTowards(this.targetPosition, this.wanderSpeed, deltaTime);
                    this.isMoving = true;
                    const directionToTarget = this.targetPosition.clone().sub(this.position);
                    directionToTarget.y = 0;
                    directionToTarget.normalize();
                    if (directionToTarget.lengthSq() > 0) {
                        const angle = Math.atan2(directionToTarget.x, directionToTarget.z);
                        this.figure.rotation.y = angle;
                    }
                }
            }
        }
        this.updateScreamAudio();
        if (this.mixer) {
            this.mixer.update(deltaTime);
            if (this.animations && Object.keys(this.animations).length > 0) {
                let targetAnimationName = null;
                if (this.state === 'idle') {
                    targetAnimationName = this.getAnimationForState(0, 'idle');
                } else if (this.state === 'wandering') {
                    targetAnimationName = this.getAnimationForState(this.wanderSpeed, 'walk');
                } else if (this.state === 'chasing') {
                    targetAnimationName = this.getAnimationForState(this.chaseSpeed, 'run');
                }
                if (!targetAnimationName && Object.keys(this.animations).length > 0) {
                    targetAnimationName = Object.keys(this.animations)[0];
                }
                if (targetAnimationName && (!this.currentAction || this.currentAction.getClip().name.toLowerCase() !== targetAnimationName.toLowerCase())) {
                    this.playAnimation(targetAnimationName, true);
                }
                if (this.currentAction) {
                    let speedMultiplier = 1.0;
                    if (this.state === 'chasing') speedMultiplier = 1.8;
                    else if (this.state === 'wandering') speedMultiplier = 0.8;
                    else speedMultiplier = 0.6;
                    this.currentAction.setEffectiveTimeScale(speedMultiplier);
                }
            }
        }
        if (this.figure) {
            this.figure.position.copy(this.position);
            this.figure.position.y += this.groundOffset;
        }
    }

    moveTowards(target, speed, deltaTime) {
        const direction = target.clone().sub(this.position);
        const distance = direction.length();
        if (distance > 0.1) { // Reduced threshold for stopping
            direction.normalize();
            // Scale movement by deltaTime
            const moveDistance = speed * deltaTime;
            // Ensure creeper doesn't overshoot target in one frame
            if (moveDistance >= distance) {
                this.position.copy(target);
            } else {
                this.position.add(direction.multiplyScalar(moveDistance));
            }
        }
    }

    getRandomWanderPoint() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        return new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance, // Wander relative to current position
            0,
            this.position.z + Math.sin(angle) * distance
        );
    }

    forceAppear() {
        if (this.figure) {
            this.state = 'chasing';
            this.stateTimer = 0;
            this.position.copy(this.playerPosition).add(new THREE.Vector3(5, 0, 5)); 
            this.figure.position.copy(this.position);
            this.figure.position.y += this.groundOffset;
            this.figure.visible = true;
            this.opacity = 1;
            this.figure.traverse(child => {
                if(child.isMesh && child.material) {
                    child.material.transparent = false; // Or true if opacity < 1
                    child.material.opacity =1;
                }
            });
            console.log(`🔧 Forced creeper #${this.id || 'main'} to appear and chase`);
        }
    }

    testAnimation(animationName) {
        const animKey = this.findAnimation([animationName.toLowerCase()]);
        if (animKey && this.animations && this.animations[animKey]) {
            this.playAnimation(animKey, true);
            console.log(`🎬 Creeper #${this.id || 'main'} playing anim: ${animKey}`);
        } else {
            console.log(`❌ Anim '${animationName}' not found for #${this.id || 'main'}. Available:`, Object.keys(this.animations || {}));
        }
    }

    listAnimations() {
        if (this.animations) {
            console.log(`🎬 Creeper #${this.id || 'main'} animations:`);
            Object.keys(this.animations).forEach(name => {
                const isActive = this.currentAction?.getClip().name.toLowerCase() === name.toLowerCase();
                console.log(`  ${name}${isActive ? ' (ACTIVE)' : ''}`);
            });
            console.log(`Current state: ${this.state}`);
            return Object.keys(this.animations);
        } else {
            console.log(`❌ No animations loaded for creeper #${this.id || 'main'}`);
            return [];
        }
    }
    
    queueModelLoad() {
        queueModelLoad(this); // Calls the module-scoped function
    }

    loadModelNow() {
        this.loadModel();
    }
} 