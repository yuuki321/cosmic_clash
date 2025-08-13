const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cookieParser = require('cookie-parser')
const authService = require('./services/authService')
const gameService = require('./services/gameService')
const { GAME, AUTH } = require('./config/constants')

class GameServer {
  constructor() {
    this.app = express()
    this.server = http.createServer(this.app)
    this.io = new Server(this.server, {
      pingInterval: 2000,
      pingTimeout: 5000
    })

    this.timer = null // Timer variable
    this.remainingTime = 60 // Game duration in seconds
    this.gameInitialized = false // Track whether the game has started

    this.players = {} // Store player data
    this.gameStarted = false // Track if the game has started

    this.setupMiddleware()
    this.setupRoutes()
    this.setupSocketHandlers()
    this.setupGameLoop()
  }

  setupMiddleware() {
    this.app.use(express.json())
    this.app.use(express.static('public'))
    this.app.use(cookieParser())
  }

  setupRoutes() {
    this.app.post('/signup', async (req, res) => {
      try {
        await authService.signup(req.body.username, req.body.password)
        res.json({ success: true })
      } catch (error) {
        res.status(400).json({ success: false, message: error.message })
      }
    })

    this.app.post('/login', async (req, res) => {
      try {
        const { sessionToken, username } = await authService.login(
          req.body.username,
          req.body.password
        )

        res.cookie('sessionToken', sessionToken, {
          maxAge: AUTH.COOKIE_MAX_AGE,
          httpOnly: true,
          path: '/'
        })
        res.cookie('username', username, {
          maxAge: AUTH.COOKIE_MAX_AGE,
          path: '/'
        })

        res.json({ success: true })
      } catch (error) {
        res.status(401).json({ success: false, message: error.message })
      }
    })

    this.app.get('/check-session', async (req, res) => {
      const { sessionToken, username } = this.extractCookies(req)
      if (!sessionToken || !username) {
        return res.json({ success: false })
      }

      const isValid = await authService.validateSession(sessionToken, username)
      res.json({ success: isValid, username: isValid ? username : null })
    })
  }

  extractCookies(req) {
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})

    return {
      sessionToken: cookies?.sessionToken,
      username: cookies?.username
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id)

      // Send current game state to new player
      socket.emit('updatePlayers', gameService.getGameState().players)

      // Send the remaining timer to the newly connected client
      socket.emit('updateTimer', this.remainingTime)

      socket.on('shoot', ({ x, y, angle }) => {
        if (this.gameStarted) {
          // Allow shooting only if the game has started
          gameService.createProjectile(socket.id, x, y, angle)
        }
      })

      socket.on('initGame', ({ username, width, height }) => {
        console.log(`Game initialized for ${username}`)
        gameService.initializePlayer(socket.id, username, width, height)

        // Initialize player data
        this.players[socket.id] = {
          id: socket.id,
          username: username,
          x: Math.random() * width,
          y: Math.random() * height,
          score: 0,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          isRespawning: false,
          shipType: 1 // Default ship type
        }

        // Broadcast to all clients including sender
        this.io.emit('updatePlayers', gameService.getGameState().players)
      })

      socket.on('startGame', () => {
        if (!this.gameStarted) {
          this.gameStarted = true
          this.io.emit('hideStartButton')
          this.startGameTimer()
        }
      })

      //recevie the request from the client to get the game state
      socket.on('getGameState', () => {
        //send the game state to the client
        socket.emit('stateToFrontend', {
          gameInitialized: this.gameInitialized,
          remainingTime: this.remainingTime,
          gameStarted: this.gameStarted
        })
      })

      socket.on('restartGame', () => {
        this.resetCount++

        // Reset server game state
        this.gameState = {
          isRunning: true,
          isOver: false,
          hasStarted: true
        }

        // Reset game parameters
        this.gameStarted = true
        this.remainingTime = 60
        this.gameInitialized = true

        // Reset all player scores and states
        for (const playerId in gameService.players) {
          gameService.players[playerId].score = 0
          gameService.players[playerId].isRespawning = false
        }

        // Clear all projectiles and speed boosts
        gameService.projectiles = {}
        gameService.playerSpeedBoosts = {}

        // Force hide start button for all clients
        this.io.emit('hideStartButton')

        // Force sync all clients
        this.io.emit('forceSyncGame', {
          resetCount: this.resetCount,
          gameState: this.gameState,
          players: gameService.getGameState().players,
          projectiles: gameService.projectiles
        })

        // Start new game timer
        this.startGameTimer()
      })

      socket.on('hideStartButton', () => {
        // Broadcast to all clients to hide start button
        this.io.emit('hideStartButton')
      })

      socket.on('keydown', ({ keycode, sequenceNumber }) => {
        gameService.handleKeydown(socket.id, keycode, sequenceNumber)
      })

      socket.on('disconnect', (reason) => {
        console.log(`Player disconnected: ${socket.id}, reason: ${reason}`)
        delete this.players[socket.id]
        gameService.removePlayer(socket.id)
        this.io.emit('updatePlayers', gameService.getGameState().players)
      })

      socket.on('speedBoostChange', (isActive) => {
        gameService.setSpeedBoost(socket.id, isActive)
        this.io.emit('speedBoostUpdate', { playerId: socket.id, isActive })
      })
    })
  }

  setupGameLoop() {
    setInterval(() => {
      if (!this.gameStarted) return
      gameService.updateProjectiles()
      gameService.updateLandmines()
      const gameState = gameService.getGameState()
      this.io.emit('updateProjectiles', gameState.projectiles)
      this.io.emit('updatePlayers', gameState.players)
      this.io.emit('updateLandmines', gameState.landmines)
    }, GAME.TICK_RATE)
  }

  sendSoundToPlayer(playerId) {
    io.emit('playLandmineSound', playerId) // Broadcast to all players
  }

  startGameTimer() {
    if (this.timer) {
      clearInterval(this.timer)
    }

    // Reset timer state
    this.remainingTime = 60
    this.gameStarted = true
    this.gameInitialized = true

    this.timer = setInterval(() => {
      if (this.remainingTime > 0) {
        this.remainingTime -= 1
        this.io.emit('updateTimer', this.remainingTime)
      } else {
        clearInterval(this.timer)
        this.timer = null
        this.gameStarted = false
        this.gameInitialized = false
        this.io.emit('updateTimer', 0)
      }
    }, 1000)
  }

  start(port) {
    this.server.listen(port, () => {
      console.log(`Game server running on port ${port}`)
      console.log(`Please paste this in your browser "http://localhost:8000"`)
    })
  }
}

const gameServer = new GameServer()
gameServer.start(8000)
