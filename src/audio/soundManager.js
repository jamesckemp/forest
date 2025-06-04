export let audioInitialized = false;
export let forestAudio = null;
let baseHeartbeatRate = 1.0;
let currentHeartbeatRate = 1.0;
let targetHeartbeatRate = 1.0;

export function updateHeartbeatSpeed(creepyFigure, creepers, cameraGroup) {
    if (!forestAudio || forestAudio.paused || forestAudio.ended) return;
    let closestDistance = Infinity;
    const playerPos = cameraGroup.position;
    if (creepyFigure && creepyFigure.position) {
        const distance = Math.sqrt(
            Math.pow(creepyFigure.position.x - playerPos.x, 2) +
            Math.pow(creepyFigure.position.z - playerPos.z, 2)
        );
        closestDistance = Math.min(closestDistance, distance);
    }
    for (const [key, creeper] of creepers.entries()) {
        if (creeper && creeper.position) {
            const distance = Math.sqrt(
                Math.pow(creeper.position.x - playerPos.x, 2) +
                Math.pow(creeper.position.z - playerPos.z, 2)
            );
            closestDistance = Math.min(closestDistance, distance);
        }
    }
    if (closestDistance === Infinity) {
        targetHeartbeatRate = baseHeartbeatRate;
    } else {
        const maxDistance = 50;
        const minDistance = 5;
        const maxRate = 3.6;
        if (closestDistance >= maxDistance) {
            targetHeartbeatRate = baseHeartbeatRate;
        } else if (closestDistance <= minDistance) {
            targetHeartbeatRate = baseHeartbeatRate * maxRate;
        } else {
            const normalized = (closestDistance - minDistance) / (maxDistance - minDistance);
            const mult = maxRate - (normalized * (maxRate - 1));
            targetHeartbeatRate = baseHeartbeatRate * mult;
        }
    }
    if (Math.abs(currentHeartbeatRate - targetHeartbeatRate) > 0.001) {
        const transitionSpeed = 0.001;
        if (currentHeartbeatRate < targetHeartbeatRate) {
            currentHeartbeatRate = Math.min(targetHeartbeatRate, currentHeartbeatRate + transitionSpeed);
        } else {
            currentHeartbeatRate = Math.max(targetHeartbeatRate, currentHeartbeatRate - transitionSpeed);
        }
        const clampedRate = Math.max(0.8, Math.min(1.8, currentHeartbeatRate));
        if (Math.abs(forestAudio.playbackRate - clampedRate) > 0.005) {
            try {
                forestAudio.playbackRate = clampedRate;
            } catch (error) {
                console.log('⚠️ Playback rate change failed, resetting to 1.0');
                forestAudio.playbackRate = 1.0;
                currentHeartbeatRate = 1.0;
                targetHeartbeatRate = 1.0;
            }
        }
    }
}

export function initAudio() {
    if (!audioInitialized) {
        try {
            if (!forestAudio) {
                forestAudio = new Audio('assets/audio/410390__univ_lyon3__pantigny_jeanloup_2017_2018_heartbeatbreath.wav');
                forestAudio.loop = true;
                forestAudio.volume = 1;
            }
            forestAudio.play().then(() => {
                console.log('✅ Heartbeat/breath audio successfully started!');
                audioInitialized = true;
                removeAudioListeners();
            }).catch(e => {
                console.log('❌ Audio play failed:', e.message);
                forestAudio.play().catch(err => console.log('Heartbeat/breath audio failed:', err.message));
            });
        } catch (error) {
            console.log('❌ Could not load audio files:', error);
        }
    }
}

export function tryStartAudio() {
    if (audioInitialized || (forestAudio && !forestAudio.paused)) {
        removeAudioListeners();
        return;
    }
    initAudio();
}

export function removeAudioListeners() {
    if (audioInitialized && forestAudio && !forestAudio.paused) {
        document.removeEventListener('click', tryStartAudio);
        document.removeEventListener('keydown', tryStartAudio);
        document.removeEventListener('touchstart', tryStartAudio);
    }
}

export function setupAudioListeners() {
    document.addEventListener('click', tryStartAudio);
    document.addEventListener('keydown', tryStartAudio);
    document.addEventListener('touchstart', tryStartAudio);
    setInterval(() => {
        if (forestAudio && !forestAudio.paused && !audioInitialized) {
            audioInitialized = true;
            removeAudioListeners();
        }
    }, 2000);
}
