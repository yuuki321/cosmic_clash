const { GAME } = require('../config/constants')

class GameService {
  constructor() {
    this.players = {}
    this.projectiles = {}
    this.landmines = {}
    this.projectileId = 0
    this.playerSpeedBoosts = {}
    this.landmines = {}
    this.landmineId = 0
    this.lastLandmineTime = Date.now()
    this.landmineSpeed = 2 // Speed at which landmines move down
  }

  initializePlayer(socketId, username, width, height, shipType) {
    this.players[socketId] = {
      x: GAME.CANVAS_WIDTH * Math.random(),
      y: GAME.CANVAS_HEIGHT * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      canvas: { width, height },
      radius: GAME.PLAYER_RADIUS,
      isRespawning: false,
      shipType: Math.floor(Math.random() * 3) + 1
    }

    console.log(`Player initialized: ${username} (${socketId})`) // Debug log
    return this.players[socketId]
  }

  createProjectile(socketId, x, y, angle) {
    this.projectileId++
    const baseSpeed = 5
    const speedMultiplier = this.playerSpeedBoosts[socketId] ? 10 : 1

    this.projectiles[this.projectileId] = {
      x,
      y,
      velocity: {
        x: Math.cos(angle) * baseSpeed * speedMultiplier,
        y: Math.sin(angle) * baseSpeed * speedMultiplier
      },
      playerId: socketId
    }
    return this.projectiles[this.projectileId]
  }

  handleKeydown(socketId, keycode, sequenceNumber) {
    const player = this.players[socketId]
    if (!player) return null

    // Update sequence number
    player.sequenceNumber = sequenceNumber

    // Update position based on keycode
    switch (keycode) {
      case 'KeyW':
        player.y -= GAME.MOVE_SPEED
        break
      case 'KeyA':
        player.x -= GAME.MOVE_SPEED
        break
      case 'KeyS':
        player.y += GAME.MOVE_SPEED
        break
      case 'KeyD':
        player.x += GAME.MOVE_SPEED
        break
    }

    // Calculate player sides exactly as in old version
    const playerSides = {
      left: player.x - player.radius,
      right: player.x + player.radius,
      top: player.y - player.radius,
      bottom: player.y + player.radius
    }

    // Boundary checking exactly as in old version
    if (playerSides.left < 0) {
      player.x = player.radius
    }
    if (playerSides.right > GAME.CANVAS_WIDTH) {
      player.x = GAME.CANVAS_WIDTH - player.radius
    }
    if (playerSides.top < 0) {
      player.y = player.radius
    }
    if (playerSides.bottom > GAME.CANVAS_HEIGHT) {
      player.y = GAME.CANVAS_HEIGHT - player.radius
    }

    return player
  }

  updateProjectiles() {
    for (const id in this.projectiles) {
      const projectile = this.projectiles[id]
      projectile.x += projectile.velocity.x
      projectile.y += projectile.velocity.y

      // Check if projectile is out of bounds
      if (
        projectile.x - GAME.PROJECTILE_RADIUS >= GAME.CANVAS_WIDTH ||
        projectile.x + GAME.PROJECTILE_RADIUS <= 0 ||
        projectile.y - GAME.PROJECTILE_RADIUS >= GAME.CANVAS_HEIGHT ||
        projectile.y + GAME.PROJECTILE_RADIUS <= 0
      ) {
        delete this.projectiles[id]
        continue
      }

      // Check collisions with players
      this.checkProjectileCollisions(id)
    }
  }

  checkProjectileCollisions(projectileId) {
    const projectile = this.projectiles[projectileId]
    if (!projectile) return

    for (const playerId in this.players) {
      const player = this.players[playerId]

      // Skip collision check if player is respawning
      if (player.isRespawning) continue

      const distance = Math.hypot(
        projectile.x - player.x,
        projectile.y - player.y
      )

      if (
        distance < GAME.PROJECTILE_RADIUS + player.radius &&
        projectile.playerId !== playerId
      ) {
        if (this.players[projectile.playerId]) {
          this.players[projectile.playerId].score++
        }

        delete this.projectiles[projectileId]

        player.isRespawning = true
        player.explosionFrame = 0
        player.lastTickTime = Date.now()

        // Start 3-second countdown
        setTimeout(() => {
          const spawnPosition = this.getSpawnPosition()
          player.x = spawnPosition.x
          player.y = spawnPosition.y
          player.isRespawning = false
        }, 3000)

        break
      }
    }
  }

  updateGameState() {
    // Update explosion frames based on TICK_RATE
    for (const playerId in this.players) {
      const player = this.players[playerId]
      if (player.isRespawning) {
        const currentTime = Date.now()
        if (currentTime - player.lastTickTime >= GAME.TICK_RATE) {
          player.explosionFrame = (player.explosionFrame + 1) % 5
          player.lastTickTime = currentTime
        }
      }
    }

    // Rest of your update logic
    this.updateProjectiles()
  }

  getSpawnPosition() {
    // Define spawn position logic (e.g., random spawn points)
    return {
      x: Math.random() * 800, // Example: canvas width
      y: Math.random() * 600 // Example: canvas height
    }
  }

  removePlayer(socketId) {
    delete this.players[socketId]
  }

  getGameState() {
    // Debug log current player count
    /* s */
    console.log('landmine', Object.keys(this.landmines).length)

    console.log(
      'Landmines:',
      Object.keys(this.landmines).map((id) => this.landmines[id].type)
    )
    //print out landmine positions
    /* console.log(
      'Landmines:',
      Object.keys(this.landmines).map((id) => this.landmines[id].x)
    )
    console.log(
      'Landmines:',
      Object.keys(this.landmines).map((id) => this.landmines[id].y)
    ) */
    /* console.log(
      'Players:',
      Object.keys(this.players).map((id) => this.players[id].isRespawning)
    ) */
    /* console.log(
      'Players:',
      Object.keys(this.players).map((id) => this.players[id].shipType)
    ) */

    return {
      players: this.players,
      projectiles: this.projectiles,
      landmines: this.landmines
    }
  }

  createLandmine() {
    // Create landmine at random x position but start from top
    const x = Math.random() * 800 // Canvas width
    const y = -30 // Start above the canvas

    //random generate 2 types of landmines
    const type = Math.floor(Math.random() * 2) + 1

    this.landmineId++
    this.landmines[this.landmineId] = {
      x: x,
      y: y,
      id: this.landmineId,
      active: true,
      type: type
    }
  }

  updateLandmines() {
    // Stop update when Game Over
    if (this.gameOver) return
    console.log(this.gameOver)

    const currentTime = Date.now()
    if (currentTime - this.lastLandmineTime >= 4000) {
      // 5 seconds
      console.log('landmine created')
      this.createLandmine()
      this.lastLandmineTime = currentTime
    }

    // Update positions and check boundaries
    Object.keys(this.landmines).forEach((id) => {
      const landmine = this.landmines[id]

      // Move landmine down
      landmine.y += this.landmineSpeed

      // Check if landmine is out of bounds
      if (
        landmine.y >= GAME.CANVAS_HEIGHT + 30 || // 30 pixels buffer
        !landmine.active
      ) {
        delete this.landmines[id]
      }
      //check Collision with players
      this.checkLandmindCollisions(id)
    })
  }

  checkLandmindCollisions(landmineId) {
    const landmine = this.landmines[landmineId]
    if (!landmine) return

    for (const playerId in this.players) {
      const player = this.players[playerId]

      // Skip collision check if player is respawning
      if (player.isRespawning) continue

      const distance = Math.hypot(landmine.x - player.x, landmine.y - player.y)

      if (distance < 40 && landmine.active) {
        if (landmine.type === 1) {
          player.isRespawning = true
          player.explosionFrame = 0
          player.lastTickTime = Date.now()

          // Start 3-second countdown
          setTimeout(() => {
            const spawnPosition = this.getSpawnPosition()
            player.x = spawnPosition.x
            player.y = spawnPosition.y
            player.isRespawning = false
          }, 3000)

          this.deactivateLandmine(landmineId)
          break
        }
        if (landmine.type === 2) {
          player.score += 1
          //play sound effect to frontend player

          this.deactivateLandmine(landmineId)
          break
        }
      }
    }
  }

  deactivateLandmine(id) {
    if (this.landmines[id]) {
      this.landmines[id].active = false
    }
  }

  setSpeedBoost(socketId, isActive) {
    this.playerSpeedBoosts[socketId] = isActive
  }
}

module.exports = new GameService()
