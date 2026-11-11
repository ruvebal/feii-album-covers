# AI-assisted 3D merge log

Cambios propuestos con ayuda de IA (Claude Code) durante task1 y lo que se decidió con cada uno.

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| 1 — usar la foto de la portada como textura | literacy | REJECT | La regla D8 no permite publicar la portada sin permiso escrito; se modela todo con código y la portada se reconoce por la composición. |
| 2 — ladrillos con `RoundedBoxGeometry` de 2 segmentos y proyectando sombra | API truth | REJECT | El panel marcaba 704 566 triángulos; con 1 segmento y la pared solo recibiendo sombra baja a unos 166 000 y se ve igual a distancia de cámara. |
| 3 — `shadows` a secas en el `Canvas` (PCFSoftShadowMap) | API truth | REJECT | three 0.185 avisa de que está obsoleto y lo cambia por PCF; se pide `shadows="percentage"` con `shadow-radius` de forma explícita. |
| 4 — pelo con `flatShading` sobre un icosaedro poco subdividido | ui-canvas | REJECT | Se veía como un balón facetado; se subdivide, se fusionan vértices (`mergeVertices`) y los rizos salen del ruido y de la luz. |
| 5 — caja de las ventanas de luz abierta por detrás (`openEnded`) | ui-canvas | REJECT | Desde el plató se veía el difusor blanco por el agujero; se cierra. |
| 6 — reproductor creado con `useMemo` y liberado en el efecto de limpieza | memory | REJECT | En desarrollo React monta dos veces: la limpieza cancelaba la petición a Apple y el reproductor quedaba muerto ("No se ha podido cargar"). Se crea dentro del efecto y se guarda en una ref. |
| 7 — groove sintetizado con Web Audio en lugar de las canciones | literacy | REJECT | Se pidió que sonaran las canciones del disco; se usan los fragmentos oficiales de Apple, sin alojar audio. |
| 8 — `CameraRig`: vistas con nombre, caminar con WASD y flechas, límites de pared y de Michael | motion | ACCEPT | Sin objetos nuevos por fotograma, `delta` limitado a 0,05 y salto directo con `prefers-reduced-motion`. |
| 9 — limpieza al desmontar (geometrías y materiales hechos a mano, clase en `<html>`, fuentes, temporizadores y audio) | memory | ACCEPT | Cada `useMemo` que crea recursos de three tiene su `dispose` en un efecto, y el reproductor para el audio, cancela la petición y cierra su `AudioContext`. |
| 10 — estado por fotograma en refs, no en React (zona de la cámara, destello, pose) | literacy | ACCEPT | Solo se llama a `setState` cuando cambia la zona; lo demás se escribe directamente en los objetos de three dentro de `useFrame`. |
