class Player {
  constructor({ x, y, radius, color, username, shipType }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
    this.shipType = shipType
    this.Alive = true
    this.isRespawning = false
    this.isPlayingExplosion = false
    this.angle = 0
    this.rotationSpeed = 0
    this.velocity = {
      x: 0,
      y: 0
    }
    this.launch = new Audio('../music/explosion.mp3')

    // Ship spritesheet properties
    this.shipImage = new Image()
    const baseSize = radius * 5

    switch (this.shipType) {
      case 1:
        this.shipImage.src = '/img/spritesheets/ship.png'
        this.shipFrameWidth = 16
        this.shipFrameHeight = 16
        this.displayWidth = baseSize
        this.displayHeight = baseSize
        break
      case 2:
        this.shipImage.src = '/img/spritesheets/ship2.png'
        this.shipFrameWidth = 32
        this.shipFrameHeight = 16
        this.displayWidth = baseSize * 1.2
        this.displayHeight = baseSize * 0.8
        break
      case 3:
        this.shipImage.src = '/img/spritesheets/ship3.png'
        this.shipFrameWidth = 32
        this.shipFrameHeight = 32
        this.displayWidth = baseSize * 1.2
        this.displayHeight = baseSize * 1.2
        break
    }

    // Animation properties
    this.shipFrame = 0
    this.shipTotalFrames = 2
    this.shipCounter = 0
    this.shipAnimationSpeed = 10
    this.width = this.displayWidth
    this.height = this.displayHeight

    // Explosion properties
    this.explosionImage = new Image()
    this.explosionImage.src = '/img/spritesheets/explosion.png'
    this.explosionFrame = 0
    this.explosionFrameWidth = 16
    this.explosionFrameHeight = 16
    this.explosionTotalFrames = 5
    this.frameCounter = 0
    this.explosionDisplaySize = radius * 5

    // Load confirmation
    this.loaded = false
    this.shipImage.onload = () => {
      this.loaded = true
    }
  }

  draw() {
    c.save()
    c.translate(this.x, this.y)
    c.rotate(this.angle)

    if (this.loaded) {
      if (this.isRespawning) {
        if (!this.isPlayingExplosion) {
          this.isPlayingExplosion = true
          this.explosionFrame = 0
          this.frameCounter = 1
        }

        if (this.explosionFrame < this.explosionTotalFrames) {
          this.launch.play()
          c.drawImage(
            this.explosionImage,
            this.explosionFrame * this.explosionFrameWidth,
            0,
            this.explosionFrameWidth,
            this.explosionFrameHeight,
            -this.explosionDisplaySize / 2,
            -this.explosionDisplaySize / 2,
            this.explosionDisplaySize,
            this.explosionDisplaySize
          )

          this.frameCounter++
          if (this.frameCounter >= 5) {
            this.frameCounter = 0
            this.explosionFrame++
          }
        }
      } else {
        this.isPlayingExplosion = false

        // Draw ship
        c.drawImage(
          this.shipImage,
          this.shipFrame * this.shipFrameWidth,
          0,
          this.shipFrameWidth,
          this.shipFrameHeight,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        )

        // Update animation frame
        this.shipCounter++
        if (this.shipCounter >= this.shipAnimationSpeed) {
          this.shipCounter = 0
          this.shipFrame = (this.shipFrame + 1) % this.shipTotalFrames
        }
      }
    } else {
      // Fallback circle if image not loaded
      c.beginPath()
      c.arc(0, 0, this.radius, 0, Math.PI * 2, false)
      c.fillStyle = this.color
      c.fill()
    }

    c.restore()

    // Draw username only if not respawning
    if (!this.isRespawning) {
      c.save()
      c.font = '12px sans-serif'
      c.fillStyle = 'white'
      c.textAlign = 'center'
      c.fillText(this.username, this.x, this.y + this.height / 2 + 10)
      c.restore()
    }
  }

  update() {
    if (!this.isRespawning) {
      this.draw()

      // Update position based on velocity
      this.x += this.velocity.x
      this.y += this.velocity.y

      // Update rotation
      this.angle += this.rotationSpeed

      // Apply friction (optional)
      this.velocity.x *= 0.99
      this.velocity.y *= 0.99
      this.rotationSpeed *= 0.97
    } else {
      this.draw()
    }
  }

  rotate(direction) {
    // direction should be 1 for clockwise, -1 for counter-clockwise
    const rotationAcceleration = 0.002
    this.rotationSpeed += direction * rotationAcceleration
  }

  thrust() {
    const thrustPower = 0.1
    this.velocity.x += Math.cos(this.angle) * thrustPower
    this.velocity.y += Math.sin(this.angle) * thrustPower
  }

  getVertices() {
    const vertices = []
    const numberOfVertices = 3
    const radius = this.radius * 2

    for (let i = 0; i < numberOfVertices; i++) {
      const angle = (i * 2 * Math.PI) / numberOfVertices + this.angle
      vertices.push({
        x: this.x + radius * Math.cos(angle),
        y: this.y + radius * Math.sin(angle)
      })
    }

    return vertices
  }
}
