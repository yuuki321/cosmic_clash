class Landmine {
  constructor(x, y, type) {
    this.x = x
    this.y = y
    this.type = type
    this.width = 30
    this.height = 30
    this.isActive = true
    this.image = null
  }

  draw() {
    if (!this.image) {
      console.error('No image assigned to landmine')
      return
    }

    if (this.isActive) {
      /* console.log(
        'Drawing landmine at:',
        this.x,
        this.y,
        'isActive:',
        this.isActive
      ) */
      c.drawImage(
        this.image,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      )
    }
  }
}
