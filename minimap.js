class Minimap {
    constructor(containerSelector = 'body') {
        this.container = document.querySelector(containerSelector)
        this.canvas = null
        this.ctx = null
        this.size = 200 // Minimap size in pixels
        this.scale = 2 // Units per pixel (higher = more zoomed out)
        this.playerPosition = { x: 0, z: 0 }
        this.playerRotation = 0 // Player's facing direction in radians
        this.creeperDots = new Map() // Store creeper dots with fade timers
        this.isLightningActive = false
        this.lastLightningTime = 0
        this.fadeOutDuration = 4000 // 4 seconds fade out after lightning (increased from 2)
        
        this.init()
    }
    
    init() {
        // Create minimap container
        const minimapContainer = document.createElement('div')
        minimapContainer.id = 'minimap-container'
        minimapContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: ${this.size}px;
            height: ${this.size}px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            z-index: 1000;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
            overflow: hidden;
        `
        
        // Create canvas
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.size
        this.canvas.height = this.size
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
        `
        
        this.ctx = this.canvas.getContext('2d')
        
        // Add title
        const title = document.createElement('div')
        title.textContent = 'RADAR'
        title.style.cssText = `
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.8);
            font-family: monospace;
            font-size: 12px;
            font-weight: bold;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
        `
        
        minimapContainer.appendChild(this.canvas)
        minimapContainer.appendChild(title)
        this.container.appendChild(minimapContainer)
        
        console.log('📡 Minimap initialized')
    }
    
    updatePlayerPosition(x, z, rotation = 0) {
        this.playerPosition.x = x
        this.playerPosition.z = z
        this.playerRotation = rotation
    }
    
    onLightningFlash(creeperPositions) {
        this.isLightningActive = true
        this.lastLightningTime = performance.now()
        
        // Add/update creeper dots
        creeperPositions.forEach((pos, id) => {
            const distance = Math.sqrt(
                Math.pow(pos.x - this.playerPosition.x, 2) + 
                Math.pow(pos.z - this.playerPosition.z, 2)
            )
            
            // Only show creepers within radar range
            const radarRange = this.size * this.scale / 2
            if (distance <= radarRange) {
                // For test creepers, store the position so they stay static
                if (id === 'test') {
                    this.creeperDots.set(id, {
                        id: id,
                        x: pos.x, // Store static position
                        z: pos.z, // Store static position
                        revealTime: performance.now(),
                        opacity: 1.0
                    })
                } else {
                    // For regular creepers, don't store position (will be dynamic)
                    this.creeperDots.set(id, {
                        id: id, // Store the creeper ID for tracking
                        revealTime: performance.now(),
                        opacity: 1.0
                    })
                }
            }
        })
        
        console.log(`⚡ Lightning revealed ${this.creeperDots.size} creepers on radar`)
    }
    
    onLightningEnd() {
        this.isLightningActive = false
    }
    
    worldToScreen(worldX, worldZ, debug = false) {
        // Convert world coordinates to screen coordinates relative to player
        let relativeX = worldX - this.playerPosition.x
        let relativeZ = worldZ - this.playerPosition.z
        
        if (debug) {
            console.log(`🔍 Debug worldToScreen:`)
            console.log(`  World pos: (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`)
            console.log(`  Player pos: (${this.playerPosition.x.toFixed(1)}, ${this.playerPosition.z.toFixed(1)})`)
            console.log(`  Relative: (${relativeX.toFixed(1)}, ${relativeZ.toFixed(1)})`)
            console.log(`  Player rotation: ${(this.playerRotation * 180 / Math.PI).toFixed(1)}°`)
        }
        
        // In Three.js:
        // - Positive X is right
        // - Positive Z is backward (towards camera)
        // - Negative Z is forward (away from camera)
        // - camera.rotation.y rotates around Y axis (left/right look)
        
        // For the minimap:
        // - We want forward (negative Z in world) to be up (negative Y on screen)
        // - We want right (positive X in world) to be right (positive X on screen)
        // - When player turns left, objects should rotate clockwise around them
        
        // Let's try inverting the Z coordinate first, then rotating
        // This should make forward (negative Z) become positive before rotation
        const adjustedX = relativeX
        const adjustedZ = -relativeZ // Flip Z so forward becomes positive
        
        if (debug) {
            console.log(`  After Z flip: (${adjustedX.toFixed(1)}, ${adjustedZ.toFixed(1)})`)
        }
        
        // Rotate the adjusted coordinates by the NEGATIVE of player's Y rotation
        // This makes objects rotate clockwise when player turns left
        const cos = Math.cos(-this.playerRotation)
        const sin = Math.sin(-this.playerRotation)
        
        // Standard 2D rotation matrix
        const rotatedX = adjustedX * cos - adjustedZ * sin
        const rotatedY = adjustedX * sin + adjustedZ * cos
        
        if (debug) {
            console.log(`  After rotation: (${rotatedX.toFixed(1)}, ${rotatedY.toFixed(1)})`)
        }
        
        // Convert to screen coordinates
        // Map rotatedX to screen X (right is positive)
        // Map rotatedY to screen Y (up is negative, so forward should be negative Y)
        const screenX = (this.size / 2) + (rotatedX / this.scale)
        const screenY = (this.size / 2) - (rotatedY / this.scale) // Negative Y is up
        
        if (debug) {
            console.log(`  Screen pos: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`)
            console.log(`  Expected: center should be (${this.size/2}, ${this.size/2}), forward should be (${this.size/2}, <${this.size/2})`)
        }
        
        return { x: screenX, y: screenY }
    }
    
    update(creepyFigure = null, creepers = null) {
        const currentTime = performance.now()
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.size, this.size)
        
        // Create circular clipping mask
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.arc(this.size / 2, this.size / 2, this.size / 2, 0, Math.PI * 2)
        this.ctx.clip()
        
        // Draw transparent radar background
        this.ctx.fillStyle = 'rgba(0, 20, 0, 0.7)'
        this.ctx.fillRect(0, 0, this.size, this.size)
        
        // Draw radar grid
        this.drawRadarGrid()
        
        // Draw range circles
        this.drawRangeCircles()
        
        // Draw player dot first (so it appears behind creeper dots)
        this.drawPlayer()
        
        // Draw objective point (always visible)
        this.drawObjective()
        
        // Update and draw creeper dots on top (now with dynamic positions)
        if (creepyFigure && creepers) {
            this.updateCreeperDots(currentTime, creepyFigure, creepers)
        }
        
        // Restore canvas state
        this.ctx.restore()
    }
    
    drawRadarGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)'
        this.ctx.lineWidth = 1
        
        const center = this.size / 2
        
        // Draw concentric circles (range rings)
        const numRings = 4
        for (let i = 1; i <= numRings; i++) {
            const radius = (center / numRings) * i
            this.ctx.beginPath()
            this.ctx.arc(center, center, radius, 0, Math.PI * 2)
            this.ctx.stroke()
        }
        
        // Draw radial lines (bearing lines)
        const numLines = 8 // 8 lines = every 45 degrees
        for (let i = 0; i < numLines; i++) {
            const angle = (i * Math.PI * 2) / numLines
            const startX = center + Math.cos(angle) * 10 // Start from inner circle
            const startY = center + Math.sin(angle) * 10
            const endX = center + Math.cos(angle) * center
            const endY = center + Math.sin(angle) * center
            
            this.ctx.beginPath()
            this.ctx.moveTo(startX, startY)
            this.ctx.lineTo(endX, endY)
            this.ctx.stroke()
        }
        
        // Draw center crosshairs (more prominent)
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(center - 8, center)
        this.ctx.lineTo(center + 8, center)
        this.ctx.moveTo(center, center - 8)
        this.ctx.lineTo(center, center + 8)
        this.ctx.stroke()
    }
    
    drawRangeCircles() {
        const center = this.size / 2
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)'
        this.ctx.lineWidth = 1
        
        // Draw range circles at 25, 50, 75 units
        const ranges = [25, 50, 75]
        ranges.forEach(range => {
            const radius = range / this.scale
            if (radius < center) {
                this.ctx.beginPath()
                this.ctx.arc(center, center, radius, 0, Math.PI * 2)
                this.ctx.stroke()
            }
        })
    }
    
    updateCreeperDots(currentTime, creepyFigure, creepers) {
        // Update creeper dot opacities and remove expired ones
        for (const [id, dot] of this.creeperDots.entries()) {
            const timeSinceReveal = currentTime - dot.revealTime
            
            if (this.isLightningActive) {
                // During lightning, dots are fully visible
                dot.opacity = 1.0
            } else {
                // After lightning, fade out over time with smooth curve
                const fadeProgress = timeSinceReveal / this.fadeOutDuration
                // Use smooth fade curve (ease-out)
                dot.opacity = Math.max(0, Math.pow(1.0 - fadeProgress, 2))
                
                // Remove completely faded dots
                if (dot.opacity <= 0.01) {
                    this.creeperDots.delete(id)
                    continue
                }
            }
            
            // Handle test creepers differently - they stay static
            if (id === 'test') {
                // Test creepers use their stored position and don't move
                this.drawCreeperDot(dot)
                continue
            }
            
            // Get current position of this creeper (for non-test creepers)
            let currentPos = null
            
            // Check main creepy figure
            if (id === 'main' && creepyFigure && creepyFigure.position) {
                currentPos = { x: creepyFigure.position.x, z: creepyFigure.position.z }
            } else {
                // Check other creepers
                for (const [key, creeper] of creepers.entries()) {
                    if ((creeper.id && creeper.id === id) || key === id) {
                        if (creeper && creeper.position) {
                            currentPos = { x: creeper.position.x, z: creeper.position.z }
                            break
                        }
                    }
                }
            }
            
            // Only draw if we found the creeper's current position
            if (currentPos) {
                // Check if still within radar range
                const distance = Math.sqrt(
                    Math.pow(currentPos.x - this.playerPosition.x, 2) + 
                    Math.pow(currentPos.z - this.playerPosition.z, 2)
                )
                
                const radarRange = this.size * this.scale / 2
                if (distance <= radarRange) {
                    // Draw the dot at current position
                    this.drawCreeperDot({ ...dot, x: currentPos.x, z: currentPos.z })
                } else {
                    // Creeper moved out of range, remove dot
                    this.creeperDots.delete(id)
                }
            } else {
                // Creeper no longer exists, remove dot
                this.creeperDots.delete(id)
            }
        }
    }
    
    drawCreeperDot(dot) {
        const isTestCreeper = dot.id === 'test'
        const screenPos = this.worldToScreen(dot.x, dot.z, isTestCreeper)
        
        // Only draw if within screen bounds
        if (screenPos.x >= 0 && screenPos.x <= this.size && 
            screenPos.y >= 0 && screenPos.y <= this.size) {
            
            const alpha = dot.opacity
            const radius = 4 // Fixed radius, no pulsing
            
            // Outer glow
            this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`
            this.ctx.beginPath()
            this.ctx.arc(screenPos.x, screenPos.y, radius * 2, 0, Math.PI * 2)
            this.ctx.fill()
            
            // Inner dot
            this.ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`
            this.ctx.beginPath()
            this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
            this.ctx.fill()
            
            // Bright center
            this.ctx.fillStyle = `rgba(255, 150, 150, ${alpha})`
            this.ctx.beginPath()
            this.ctx.arc(screenPos.x, screenPos.y, radius * 0.4, 0, Math.PI * 2)
            this.ctx.fill()
        }
    }
    
    drawPlayer() {
        const center = this.size / 2
        
        // Player dot (bright green, always visible)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'
        this.ctx.beginPath()
        this.ctx.arc(center, center, 6, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Player center
        this.ctx.fillStyle = 'rgba(150, 255, 150, 1.0)'
        this.ctx.beginPath()
        this.ctx.arc(center, center, 3, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Direction indicator - arrow pointing up (forward)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        this.ctx.beginPath()
        this.ctx.moveTo(center, center - 8) // Top point
        this.ctx.lineTo(center - 3, center - 2) // Left point
        this.ctx.lineTo(center + 3, center - 2) // Right point
        this.ctx.closePath()
        this.ctx.fill()
        
        // Subtle pulse effect for the outer ring
        const pulseAlpha = 0.2 + Math.sin(performance.now() * 0.003) * 0.1
        this.ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`
        this.ctx.beginPath()
        this.ctx.arc(center, center, 10, 0, Math.PI * 2)
        this.ctx.fill()
    }
    
    drawObjective() {
        // Get objective position from global scope (passed from main.js)
        if (typeof window !== 'undefined' && window.objective) {
            const obj = window.objective
            
            // Don't draw if objective is completed
            if (obj.completed) return
            
            const screenPos = this.worldToScreen(obj.position.x, obj.position.z)
            
            // Only draw if within screen bounds
            if (screenPos.x >= 0 && screenPos.x <= this.size && 
                screenPos.y >= 0 && screenPos.y <= this.size) {
                
                // Pulsing yellow objective dot
                const pulseScale = 1 + Math.sin(performance.now() * 0.005) * 0.3
                const radius = 5 * pulseScale
                
                // Outer glow
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'
                this.ctx.beginPath()
                this.ctx.arc(screenPos.x, screenPos.y, radius * 2, 0, Math.PI * 2)
                this.ctx.fill()
                
                // Main dot
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.9)'
                this.ctx.beginPath()
                this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
                this.ctx.fill()
                
                // Bright center
                this.ctx.fillStyle = 'rgba(255, 255, 150, 1.0)'
                this.ctx.beginPath()
                this.ctx.arc(screenPos.x, screenPos.y, radius * 0.4, 0, Math.PI * 2)
                this.ctx.fill()
                
                // Add objective marker symbol (small cross)
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
                this.ctx.lineWidth = 2
                this.ctx.beginPath()
                this.ctx.moveTo(screenPos.x - 3, screenPos.y)
                this.ctx.lineTo(screenPos.x + 3, screenPos.y)
                this.ctx.moveTo(screenPos.x, screenPos.y - 3)
                this.ctx.lineTo(screenPos.x, screenPos.y + 3)
                this.ctx.stroke()
            }
        }
    }
    
    // Method to be called when lightning state changes
    setLightningState(isActive) {
        if (isActive && !this.isLightningActive) {
            // Lightning just started - this will be handled by onLightningFlash
        } else if (!isActive && this.isLightningActive) {
            this.onLightningEnd()
        }
    }
    
    // Get current creeper positions for lightning reveal (now dynamic)
    getCreeperPositions(creepyFigure, creepers) {
        const positions = new Map()
        
        // Add main creepy figure (get current position)
        if (creepyFigure && creepyFigure.figure && creepyFigure.position) {
            positions.set('main', {
                x: creepyFigure.position.x,
                z: creepyFigure.position.z
            })
        }
        
        // Add all other creepers (get current positions)
        for (const [key, creeper] of creepers.entries()) {
            if (creeper && creeper.figure && creeper.position) {
                positions.set(creeper.id || key, {
                    x: creeper.position.x,
                    z: creeper.position.z
                })
            }
        }
        
        return positions
    }
    
    // Cleanup method
    destroy() {
        const container = document.getElementById('minimap-container')
        if (container) {
            container.remove()
        }
        console.log('📡 Minimap destroyed')
    }
}

// Export for use in main.js
window.Minimap = Minimap 