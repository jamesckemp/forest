# Black Smoke Survival

A horror survival game built with Three.js where you must hide from a creepy figure in a dark, thunderstorm-filled forest.

## 🎮 Game Features

- **Hide-and-Seek Mechanics**: The creepy figure hunts you using line-of-sight detection
- **Realistic Forest Environment**: Procedurally generated trees, rocks, and logs
- **Dynamic Weather**: Thunderstorm with realistic lightning effects
- **Atmospheric Audio**: Forest ambience and background music
- **Survival Timer**: See how long you can survive

## 🎯 Objective

Hide from the creepy figure by using trees, rocks, and other obstacles to break line of sight. The figure has multiple AI states:
- **Hunting**: Patrols randomly looking for you
- **Stalking**: Moves toward you when spotted
- **Approaching**: Fast pursuit when close
- **Searching**: Investigates your last known position

## 🎮 Controls

- **WASD**: Move around
- **Mouse**: Look around (click to lock pointer)
- **Shift**: Walk slower/sneak
- **F**: Force creep to appear (debug)

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- NPM

### Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add your creep model**:
   - Place your `creep.glb` file in the root directory
   - Supported formats: GLB (recommended), GLTF
   - The game will use a fallback figure if the model isn't found

4. **Add audio files** (optional):
   - `forest.wav` - Forest ambience (loops)
   - `ambient.wav` - Background music (plays once)

### Running the Game

**Development server** (recommended):
```bash
npm run dev
```
This starts Vite dev server at `http://localhost:3000`

**Alternative HTTP server**:
```bash
npm run serve
```
This starts a simple HTTP server at `http://localhost:3000`

**Build for production**:
```bash
npm run build
```

## 📁 File Structure

```
black-smoke-survival/
├── index.html          # Main HTML file
├── main.js             # Game logic and Three.js code
├── package.json        # NPM configuration
├── vite.config.js      # Vite configuration
├── creep.glb          # Your creepy figure model (add this)
├── forest.wav         # Forest ambience audio (optional)
├── ambient.wav        # Background music (optional)
└── README.md          # This file
```

## 🎨 Model Requirements

For best results with your creep model:
- **Format**: GLB/GLTF (GLB recommended)
- **Scale**: The game will automatically scale to 2x
- **Animations**: Supported (idle, walk, run) but optional
- **Materials**: Will be automatically darkened for creepy effect

## 🔧 Technical Details

- **Engine**: Three.js r158
- **Build Tool**: Vite
- **Features**: 
  - ES6 modules
  - Post-processing effects (bloom, FXAA)
  - Procedural world generation
  - Real-time lighting and shadows
  - Particle systems

## 🐛 Troubleshooting

**Model not loading?**
- Ensure `creep.glb` is in the root directory
- Check browser console for error messages
- The game will use a fallback figure if model fails to load

**Audio not playing?**
- Modern browsers require user interaction to start audio
- Click or press a key to start audio
- Audio files are optional

**Performance issues?**
- Try reducing browser window size
- Close other browser tabs
- The game automatically culls distant objects

## 🎮 Tips for Survival

1. **Use trees as cover** - They block the creep's line of sight
2. **Stay mobile** - Don't hide in one spot too long
3. **Listen for audio cues** - The creep makes sounds when moving
4. **Watch the console** - Debug messages show the creep's state
5. **Use the terrain** - Rocks and logs also provide cover

Enjoy the game and see how long you can survive! 🌲👻 