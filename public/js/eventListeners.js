addEventListener('click', (event) => {
  var launch = new Audio('../music/launch3.mp3')

  // Early return if not in game or not connected
  if (!socket?.id || !frontEndPlayers?.[socket.id]) {
    return
  }

  // Stop shooting when Game Over
  if (isGameOver || eiofwhweiofhfweiho) {
    return
  }

  // Early return if player is during isRespawning
  console.log(frontEndPlayers[socket.id].isRespawning)
  if (frontEndPlayers[socket.id].isRespawning != false) {
    return
  }
  launch.play()
  const canvas = document.querySelector('canvas')
  if (!canvas) return

  const { top, left } = canvas.getBoundingClientRect()
  const playerPosition = {
    x: frontEndPlayers[socket.id].x,
    y: frontEndPlayers[socket.id].y
  }

  const angle = Math.atan2(
    event.clientY - top - playerPosition.y,
    event.clientX - left - playerPosition.x
  )

  // const velocity = {
  //   x: Math.cos(angle) * 5,
  //   y: Math.sin(angle) * 5
  // }

  socket.emit('shoot', {
    x: playerPosition.x,
    y: playerPosition.y,
    angle
  })

  // frontEndProjectiles.push(
  //   new Projectile({
  //     x: playerPosition.x,
  //     y: playerPosition.y,
  //     radius: 5,
  //     color: 'white',
  //     velocity
  //   })
  // )

  if (frontEndProjectiles) {
    //console.log(frontEndProjectiles)
  }
})
