export let globalScreamBuffer = null
export let isLoadingGlobalBuffer = false

export function getGlobalScreamBuffer(audioContext) {
    return new Promise((resolve, reject) => {
        if (globalScreamBuffer) {
            resolve(globalScreamBuffer)
            return
        }
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
        isLoadingGlobalBuffer = true
        console.log('🔄 Loading global scream buffer...')
        fetch('assets/audio/759456__akridiy__a-single-scream-of-a-young-male.wav')
            .then(r => r.arrayBuffer())
            .then(data => audioContext.decodeAudioData(data))
            .then(buffer => {
                globalScreamBuffer = buffer
                isLoadingGlobalBuffer = false
                console.log('✅ Global scream buffer loaded - will be reused by all creepers')
                resolve(buffer)
            })
            .catch(err => {
                isLoadingGlobalBuffer = false
                console.log(`❌ Failed to load global scream buffer: ${err.message}`)
                reject(err)
            })
    })
}

export let modelLoadingQueue = []
export let isLoadingModel = false

export function queueModelLoad(creeper) {
    modelLoadingQueue.push(creeper)
    processModelQueue()
}

export function processModelQueue() {
    if (isLoadingModel || modelLoadingQueue.length === 0) return
    isLoadingModel = true
    const next = modelLoadingQueue.shift()
    console.log(`🔄 Loading model for creeper #${next.id || 'main'} (${modelLoadingQueue.length} remaining in queue)`)
    next.loadModelNow()
}

export function onModelLoadComplete() {
    isLoadingModel = false
    setTimeout(processModelQueue, 100)
}
