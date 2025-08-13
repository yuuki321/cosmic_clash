// auth.js

class AuthManager {
  constructor() {
    // Add debug logging
    console.log('AuthManager initializing...')

    this.bgm = new Audio('../music/bgm.mp3')
    this.bgm.loop = true

    document.addEventListener('DOMContentLoaded', () => {
      this.loginContainer = document.getElementById('loginContainer')
      this.signupContainer = document.getElementById('signupContainer')
      this.startButton = document.getElementById('startButton')
      this.restartButton = document.getElementById('restartButton')
      this.logoutButton = document.getElementById('logoutButton')

      // Debug logging
      console.log('Login container:', this.loginContainer)
      console.log('Signup container:', this.signupContainer)
      console.log('Start button:', this.startButton)

      if (!this.loginContainer || !this.signupContainer || !this.startButton) {
        console.error('Required DOM elements not found:', {
          loginContainer: !!this.loginContainer,
          signupContainer: !!this.signupContainer,
          startButton: !!this.startButton
        })
        return
      }

      this.initializeEventListeners()
    })
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
    }
  }

  initializeEventListeners() {
    // Toggle forms
    document
      .getElementById('showSignup')
      .addEventListener('click', () => this.toggleForms('signup'))
    document
      .getElementById('showLogin')
      .addEventListener('click', () => this.toggleForms('login'))

    // Form submissions
    document
      .getElementById('loginForm')
      .addEventListener('submit', (e) => this.handleLogin(e))
    document
      .getElementById('signupForm')
      .addEventListener('submit', (e) => this.handleSignup(e))

    // Listen for game over event
    document.addEventListener('gameOver', () => this.stopBGM())

    // Check session on load
    this.checkSession()

    // Add start button listener
    this.startButton.addEventListener('click', () => {
      // Do not hide the start button here
      // this.startButton.style.display = 'none' // Remove this line
      socket.emit('startGame') // Emit 'startGame' event to server
    })

    // Listen for 'hideStartButton' event from server
    socket.on('hideStartButton', () => {
      this.startButton.style.display = 'none'
      this.restartButton.style.display = 'none'
      isGameOver = false
      eiofwhweiofhfweiho = true
      this.bgm.play() // Play background music when game starts
      this.startButton = document.getElementById('startButton')
      this.startButton.style.display = 'none'
    })

    // Add logout button listener
    this.logoutButton.addEventListener('click', () => this.logout())

    // Update restart button listener
    this.restartButton.addEventListener('click', () => {
      socket.emit('restartGame')
    })
  }

  async handleLogin(e) {
    e.preventDefault()
    const username = document.getElementById('usernameInput').value
    const password = document.getElementById('passwordInput').value

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (response.ok) {
        this.loginContainer.style.display = 'none'
        socket.emit('getGameState')
        socket.on(
          'stateToFrontend',
          (gameInitialized, remainingTime, gameStarted) => {
            this.gameInitialized = gameInitialized
            this.remainingTime = remainingTime
            this.gameStarted = gameStarted

            // Only show start button if game not initialized and restart button is hidden
            // Move this check inside the callback
            if (
              !this.gameInitialized.gameStarted &&
              this.restartButton.style.display !== 'block'
            ) {
              this.startButton.style.display = 'block'
            }
          }
        )

        this.logoutButton.style.display = 'block'
        this.currentUsername = username

        socket.emit('initGame', {
          username: this.currentUsername,
          width: canvas.width,
          height: canvas.height
        })
      } else {
        const data = await response.json()
        alert(data.message || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed')
    }
  }

  async checkSession() {
    try {
      const response = await fetch('/check-session')
      const data = await response.json()

      if (data.success) {
        this.loginContainer.style.display = 'none'

        socket.emit('getGameState')
        socket.on(
          'stateToFrontend',
          (gameInitialized, remainingTime, gameStarted) => {
            this.gameInitialized = gameInitialized
            this.remainingTime = remainingTime
            this.gameStarted = gameStarted
            console.log('gameStarted', this.gameStarted)
            console.log('gameInitialized', this.gameInitialized)
            console.log('remainingTime', this.remainingTime)

            // Move this check inside the callback
            if (
              !this.gameInitialized.gameStarted &&
              this.restartButton.style.display !== 'block'
            ) {
              this.startButton.style.display = 'block'
            }
          }
        )

        this.logoutButton.style.display = 'block'
        this.currentUsername = data.username

        socket.emit('initGame', {
          username: this.currentUsername,
          width: canvas.width,
          height: canvas.height
        })
      }
    } catch (error) {
      console.error('Session check error:', error)
    }
  }

  toggleForms(form) {
    if (!this.loginContainer || !this.signupContainer) return

    this.loginContainer.style.display = form === 'login' ? 'flex' : 'none'
    this.signupContainer.style.display = form === 'signup' ? 'flex' : 'none'
  }

  async handleSignup(e) {
    e.preventDefault()
    const username = document.getElementById('signupUsername').value
    const password = document.getElementById('signupPassword').value

    try {
      const response = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (response.ok) {
        alert('Signup successful! Please login.')
        this.toggleForms('login')
      } else {
        const data = await response.json()
        alert(data.message || 'Signup failed')
      }
    } catch (error) {
      console.error('Signup error:', error)
      alert('Signup failed')
    }
  }

  logout() {
    // Clear cookies
    document.cookie =
      'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'

    // Hide logout button and start button
    this.logoutButton.style.display = 'none'
    this.startButton.style.display = 'none'

    // Show login container
    this.loginContainer.style.display = 'flex'

    // Disconnect socket if needed
    if (socket) {
      socket.disconnect()
    }

    // Reload the page to reset the game state
    window.location.reload()
  }
}

// Initialize auth manager
const authManager = new AuthManager()
