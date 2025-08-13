const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
//define the game is running or not
let gameisrunning = false
let coinmusic = new Audio('../music/coin.mp3')
const socket = io()

const scoreEl = document.querySelector('#scoreEl')
const startButton = document.getElementById('startButton')

const landmineImage = new Image()
const landmineImage2 = new Image()
landmineImage.src = '/img/landmine.png'
landmineImage2.src = '/img/landmine2.png' // Fixed: Added .src

landmineImage.onload = () => {
  console.log('Landmine image 1 loaded successfully') // Debug log
}
landmineImage.onerror = () => {
  console.error('Failed to load landmine image 1') // Debug log
}

landmineImage2.onload = () => {
  console.log('Landmine image 2 loaded successfully') // Debug log
}
landmineImage2.onerror = () => {
  console.error('Failed to load landmine image 2') // Debug log
}

// Correct audio event listeners
coinmusic.addEventListener('loadeddata', () => {
  console.log('Coin music loaded successfully')
})

coinmusic.addEventListener('error', (e) => {
  console.error('Error loading coin music:', e)
})

const devicePixelRatio = 1
canvas.width = 1024 * devicePixelRatio
canvas.height = 576 * devicePixelRatio

c.scale(devicePixelRatio, devicePixelRatio)

const x = canvas.width
const y = canvas.height

const frontEndPlayers = {}
const frontEndProjectiles = {}
const frontEndLandmines = {}

// Track speed boost state
const gameState = {
  playerSpeedBoosts: {}
}

// Use the existing timer element
const timerEl = document.getElementById('gameTimer')
timerEl.style.position = 'absolute'
timerEl.style.top = '25%' // Use percentage for top position
timerEl.style.left = '50%'
timerEl.style.transform = 'translateX(-50%)'
timerEl.style.fontFamily = 'sans-serif'
timerEl.style.fontSize = '2rem' // Use relative units for responsive font size
timerEl.style.color = 'white'
timerEl.style.zIndex = '1000'

// Add a variable to track if the game is over
let isGameOver = false
let eiofwhweiofhfweiho = false
// Listen for timer updates from the server
socket.on('updateTimer', (remainingTime) => {
  timerEl.textContent = `${remainingTime}s`
  if (remainingTime >= 60) {
    isGameOver = false
    eiofwhweiofhfweiho = true
  } else {
    eiofwhweiofhfweiho = false
  }
  // Change color to red in the last 10 seconds
  if (remainingTime <= 10) {
    timerEl.style.color = 'red'
  } else {
    timerEl.style.color = 'white'
  }
  gameisrunning = true

  // Hide the timer when the game is over
  if (remainingTime <= 0) {
    gameisrunning = false
    timerEl.textContent = 'Game Over !'
    isGameOver = true
    showRestartButton()
    document.dispatchEvent(new Event('gameOver'))
  }
})

const restartButton = document.getElementById('restartButton')
function showRestartButton() {
  gameisrunning = false
  restartButton.style.display = 'block' // Show the restart button
  restartButton.addEventListener('click', () => {
    socket.emit('restartGame')
    location.reload() // Reload the page to restart the game
  })
}

// Ensure the restart button is hidden initially
restartButton.style.display = 'none'

socket.on('gameRestarted', () => {
  gameisrunning = true
  isGameOver = false
  eiofwhweiofhfweiho = true
  startButton.style.display = 'none'
  restartButton.style.display = 'none'

  // Reset animation
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  animate() // Restart animation loop

  // Reset game state
  for (const id in frontEndProjectiles) {
    delete frontEndProjectiles[id]
  }

  // Reset player positions
  for (const id in frontEndPlayers) {
    if (frontEndPlayers[id].target) {
      frontEndPlayers[id].x = frontEndPlayers[id].target.x
      frontEndPlayers[id].y = frontEndPlayers[id].target.y
    }
  }
})

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
      //console.log('create:', backEndProjectile)
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
    } else {
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }

  for (const frontEndProjectileId in frontEndProjectiles) {
    if (!backEndProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId]
    }
  }
})

socket.on('updateLandmines', (backEndLandmines) => {
  //console.log('Received landmines:', backEndLandmines)

  for (const id in backEndLandmines) {
    const backEndLandmine = backEndLandmines[id]
    //console.log('Processing landmine:', id, backEndLandmine)

    if (!frontEndLandmines[id]) {
      frontEndLandmines[id] = new Landmine(backEndLandmine.x, backEndLandmine.y)

      if (backEndLandmine.type == 1) {
        frontEndLandmines[id].image = landmineImage // Set the image
      } else {
        frontEndLandmines[id].image = landmineImage2 // Set the image
      }
    }

    frontEndLandmines[id].x = backEndLandmine.x
    frontEndLandmines[id].y = backEndLandmine.y
    frontEndLandmines[id].isActive = backEndLandmine.active // Change 'active' to 'isActive'
  }
  // Remove landmines that no longer exist in backend
  for (const id in frontEndLandmines) {
    if (!backEndLandmines[id]) {
      delete frontEndLandmines[id]
    }
  }
  //if collision with a type 2 landmine, play coin sound
  for (const id in backEndLandmines) {
    if (
      backEndLandmines[id].type == 2 &&
      backEndLandmines[id].active == false
    ) {
      coinmusic.play()
    }
  }
})

socket.on('updatePlayers', (backEndPlayers) => {
  //console.log('gameover' + isGameOver)
  /* if (gameisrunning == false) {
    startButton.style.display = 'none'
  } */
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    if (!frontEndPlayers[id]) {
      // Create new player instance
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color,
        username: backEndPlayer.username,
        isRespawning: backEndPlayer.isRespawning,
        shipType: backEndPlayer.shipType
      })

      // Add player label to leaderboard
      document.querySelector(
        '#playerLabels'
      ).innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`

      console.log(`New player joined: ${backEndPlayer.username}`) // Debug log
    }

    // Update player position
    frontEndPlayers[id].target = {
      x: backEndPlayer.x,
      y: backEndPlayer.y
    }

    //update isRespawning
    frontEndPlayers[id].isRespawning = backEndPlayer.isRespawning

    //update shipType
    frontEndPlayers[id].shipType = backEndPlayer.shipType

    // Update score
    document.querySelector(
      `div[data-id="${id}"]`
    ).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
  }

  // Remove disconnected players
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      if (divToDelete) {
        divToDelete.parentNode.removeChild(divToDelete)
      }
      delete frontEndPlayers[id]
      console.log(`Player disconnected: ${id}`) // Debug log
    }
  }
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  // Only run game logic if the game is not over
  if (!isGameOver) {
    c.fillStyle = 'rgba(0, 0, 0, 0.1)'
    c.clearRect(0, 0, canvas.width, canvas.height)

    for (const id in frontEndPlayers) {
      const frontEndPlayer = frontEndPlayers[id]

      // linear interpolation
      if (frontEndPlayer.target) {
        frontEndPlayers[id].x +=
          (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5
        frontEndPlayers[id].y +=
          (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5
      }

      frontEndPlayer.draw()
    }

    for (const id in frontEndProjectiles) {
      const frontEndProjectile = frontEndProjectiles[id]
      frontEndProjectile.draw()
    }

    // Draw dynamic landmines
    for (const id in frontEndLandmines) {
      const frontEndLandmine = frontEndLandmines[id]
      if (frontEndLandmine && frontEndLandmine.isActive) {
        if (!frontEndLandmine.image) {
          if (frontEndLandmine.type == 1) {
            frontEndLandmine.image = landmineImage // Ensure image is set
          } else {
            frontEndLandmine.image = landmineImage2 // Ensure image is set
          }
        }
        frontEndLandmine.draw()
      }
    }
  }
}

animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

let sequenceNumber = 0
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++

    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }

  if (keys.a.pressed) {
    sequenceNumber++

    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }

  if (keys.s.pressed) {
    sequenceNumber++

    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }

  if (keys.d.pressed) {
    sequenceNumber++

    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

window.addEventListener('keydown', (event) => {
  //console.log('key down')
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break

    case 'KeyA':
      keys.a.pressed = true
      break

    case 'KeyS':
      keys.s.pressed = true
      break

    case 'KeyD':
      keys.d.pressed = true
      break
  }

  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    console.log('Shift key pressed') // Debug shift specifically
    gameState.playerSpeedBoosts[socket.id] = true
    socket.emit('speedBoostChange', true)
  }
})

window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }

  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    console.log('Shift key released') // Debug shift specifically
    gameState.playerSpeedBoosts[socket.id] = false
    socket.emit('speedBoostChange', false)
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault()
  document.querySelector('#usernameForm').style.display = 'none'
  socket.emit('initGame', {
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio,
    username: document.querySelector('#usernameInput').value
  })
})

// Listen for speed boost updates from server
socket.on('speedBoostUpdate', ({ playerId, isActive }) => {
  gameState.playerSpeedBoosts[playerId] = isActive
})
/* 
// Update projectile rendering
socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
    } else {
      frontEndProjectiles[id].x = backEndProjectile.x
      frontEndProjectiles[id].y = backEndProjectile.y

      // Only show speed boost effect for projectiles from players using boost
      if (gameState.playerSpeedBoosts[backEndProjectile.playerId]) {
        c.save()
        c.beginPath()
        c.arc(
          frontEndProjectiles[id].x,
          frontEndProjectiles[id].y,
          frontEndProjectiles[id].radius + 5,
          0,
          Math.PI * 2,
          false
        )
        c.strokeStyle = 'yellow'
        c.stroke()
        c.restore()
      }
    }
  }
}) */

// Make sure these listeners are added after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, key listeners initialized') // Debug initialization
})

socket.on('playLandmineSound', () => {
  coinmusic.play()
})

// Update the socket.on('forceSyncGame') handler
socket.on('forceSyncGame', (data) => {
  // Update local state
  currentResetCount = data.resetCount
  gameState = data.gameState

  // Reset game visuals
  gameisrunning = gameState.isRunning
  isGameOver = gameState.isOver
  eiofwhweiofhfweiho = gameState.hasStarted

  // Force hide both buttons
  startButton.style.display = 'none'
  restartButton.style.display = 'none'

  // Clear and reset projectiles
  frontEndProjectiles = {}

  // Reset animation
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  animate()

  // Update player positions
  for (const id in data.players) {
    if (frontEndPlayers[id]) {
      frontEndPlayers[id].target = {
        x: data.players[id].x,
        y: data.players[id].y
      }
    }
  }

  // Update landmines positions
  for (const id in data.landmines) {
    if (frontEndLandmines[id]) {
      frontEndLandmines[id].x = data.landmines[id].x
      frontEndLandmines[id].y = data.landmines[id].y
      frontEndLandmines[id].isActive = data.landmines[id].isActive
    }
  }

  // Emit hideStartButton to ensure all clients hide it
  socket.emit('hideStartButton')
})

function updateGameVisuals() {
  gameisrunning = gameState.isRunning
  isGameOver = gameState.isOver
  eiofwhweiofhfweiho = gameState.hasStarted

  // Always hide start button after game has started
  startButton.style.display = 'none'
  restartButton.style.display = gameState.isOver ? 'block' : 'none'

  if (!gameState.isRunning && animationId) {
    cancelAnimationFrame(animationId)
  } else if (gameState.isRunning && !animationId) {
    animate()
  }
}

// Update the showRestartButton function
function showRestartButton() {
  gameisrunning = false
  restartButton.style.display = 'block'
  startButton.style.display = 'none' // Ensure start button stays hidden
}
