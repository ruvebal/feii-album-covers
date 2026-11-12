// El destello del flash al hacer la foto, compartido por la luz de la escena
// y por el brillo de los calcetines y la camisa de Michael.

/** Cuánto (0..1) queda del destello: sube de golpe y se apaga en 0,4 s. */
export function flashLevel(flashAt) {
  if (flashAt === null) return 0;
  const dt = performance.now() / 1000 - flashAt;
  return dt >= 0 && dt < 0.4 ? 1 - dt / 0.4 : 0;
}

/** Con el flash los calcetines y la camisa se queman de blanco, como en la foto. */
export function glowWhites(mats, flash) {
  mats.sock.emissiveIntensity = 0.8 + flash * 3;
  mats.shirt.emissiveIntensity = flash * 0.7;
}
