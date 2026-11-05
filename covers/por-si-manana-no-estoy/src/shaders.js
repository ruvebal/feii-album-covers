// Un único vinilo con la portada impresa en el centro (picture disc).
// La foto se funde con los surcos hacia fuera y su depth map levanta la propia superficie del disco.

const common = /* glsl */ `
  uniform float uPhoto; // media anchura de la foto, en radios del disco
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  // 1 en el centro de la foto, 0 donde empieza el vinilo. Funde en círculo para que no se vea el cuadrado.
  float photoMask(vec2 p) {
    vec2 pu = p / uPhoto;
    vec2 e = smoothstep(1.0, 0.9, abs(pu));
    return smoothstep(1.0, 0.62, length(pu)) * e.x * e.y;
  }
`;

export const recordVertex = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uTime;
  varying vec2 vUv, vPhotoUv;
  ${common}
  void main() {
    vUv = uv;
    vec2 p = (uv - 0.5) * 2.0;
    vPhotoUv = p / uPhoto * 0.5 + 0.5;
    float m = photoMask(p);
    float d = texture2D(uDepth, clamp(vPhotoUv, 0.0, 1.0)).r;
    vec3 pos = position;
    // la foto sale en relieve del propio vinilo y se aplana al llegar a los surcos
    pos.z += max(d - 0.08, 0.0) * 0.5 * m;
    pos.z += smoothstep(0.7, 0.85, d) * sin(uTime * 1.6 + vPhotoUv.x * 6.0) * 0.03 * m;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const recordFragment = /* glsl */ `
  uniform sampler2D uMap, uDepth, uGlow, uHeart, uStrands;
  uniform vec2 uMouse, uLight;
  uniform float uTime, uBoost, uSpin, uTrack, uTrackGlow;
  varying vec2 vUv, vPhotoUv;
  ${common}
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  const float R0 = 0.66;   // fin de la zona grabada (justo donde termina la foto)
  const float R1 = 0.975;  // inicio: la primera canción va por fuera, como en un vinilo real
  const float N = 18.0;

  vec3 photo(vec2 puv) {
    float d = texture2D(uDepth, puv).r;
    vec2 uv = puv + uMouse * (d - 0.4) * 0.025;
    float s = texture2D(uStrands, puv).r;
    uv.y += s * (noise(vec2(puv.x * 8.0 - uTime * 0.8, uTime * 0.5)) - 0.5) * 0.006;
    vec3 col = texture2D(uMap, uv).rgb;
    // latido del corazón (doble golpe) + extra al pasar por el tracklist
    float t = mod(uTime, 1.2);
    float beat = exp(-pow((t - 0.10) * 14.0, 2.0)) + 0.6 * exp(-pow((t - 0.35) * 14.0, 2.0));
    col += vec3(1.0, 0.15, 0.3) * texture2D(uHeart, uv).r * (beat * 0.9 + uBoost * 0.8);
    // neones realzados para el bloom
    float g = texture2D(uGlow, uv).r;
    col += col * g * (0.35 + 0.15 * sin(uTime * 2.0 + puv.y * 10.0));
    col += vec3(1.0, 0.3, 0.4) * s * (0.25 + 0.25 * noise(vec2(puv.x * 20.0 + uTime * 2.0, 0.0)));
    return col;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float aa = fwidth(r);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float m = photoMask(p);

    // coordenadas que giran con el disco
    float c = cos(uSpin), sn = sin(uSpin);
    vec2 q = mat2(c, -sn, sn, c) * p;

    // surcos con antialias (se funden a gris medio cuando son más finos que un píxel)
    float gf = r * 600.0;
    float grooves = 0.5 + 0.5 * sin(gf);
    grooves = mix(grooves, 0.5, smoothstep(0.25, 0.7, fwidth(gf) / 6.2831));

    // bandas de pista y separaciones lisas entre canciones
    float inMusic = step(R0, r) * step(r, R1);
    float band = (R1 - r) / (R1 - R0) * N;
    float idx = floor(band);
    float f = fract(band);
    float gap = inMusic * (1.0 - smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f));

    // vinilo: negro azulado con mármol que gira
    float mb = fbm(q * 2.2 + fbm(q * 3.0 + 4.0) * 1.6);
    vec3 vinyl = mix(vec3(0.006, 0.008, 0.03), vec3(0.04, 0.04, 0.16), smoothstep(0.5, 0.9, mb));
    vinyl *= 0.75 + 0.5 * grooves;

    // foto impresa: también lleva surcos encima, más marcados según se acerca al borde
    vec3 pic = photo(clamp(vPhotoUv, 0.0, 1.0));
    pic *= mix(0.55 + 0.45 * grooves, 0.94 + 0.06 * grooves, smoothstep(0.0, 0.85, m));
    vec3 col = mix(vinyl, pic, m);

    // brillo anisótropo: dos haces opuestos fijos respecto a la luz, sobre todo el disco
    float la = atan(uLight.y, uLight.x);
    float ca = abs(cos(a - la));
    float sheen = pow(ca, 36.0) * 0.75 + pow(ca, 6.0) * 0.08;
    vec3 iri = mix(vec3(0.30, 1.0, 0.85), vec3(1.0, 0.32, 0.85), 0.5 + 0.5 * sin(r * 22.0 + a + uTime * 0.25));
    float surface = inMusic * (1.0 - gap) * (0.35 + 0.65 * grooves) + gap * 0.25 + (1.0 - inMusic) * (0.2 + 0.4 * grooves);
    col += iri * sheen * surface * (1.0 - 0.75 * m) * smoothstep(0.08, 0.3, r);

    float dust = step(0.997, hash(floor(q * 220.0)));
    col += vec3(0.7) * dust * 0.35 * inMusic;

    // la canción que estás señalando se ilumina en su banda
    float hit = inMusic * (1.0 - step(0.5, abs(idx - uTrack)));
    col += vec3(1.0, 0.18, 0.34) * hit * uTrackGlow * (0.3 + 0.9 * sheen + 0.25 * grooves);

    // canto brillante y borde suave
    col += vec3(0.35, 0.4, 1.0) * smoothstep(0.982, 1.0, r) * (0.3 + sheen);
    float alpha = 1.0 - smoothstep(1.0 - aa * 1.5, 1.0, r);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Destellos que titilan
export const particleVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime, uPixel;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vec3 p = position;
    p.y += sin(uTime * 0.3 + aSeed * 30.0) * 0.15;
    p.x += cos(uTime * 0.2 + aSeed * 20.0) * 0.1;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 50.0), 3.0);
    gl_PointSize = (3.0 + aSeed * 6.0) * uPixel * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // estrella de 4 puntas como los destellos de la portada
    float star = max(0.0, 1.0 - (abs(c.x) * abs(c.y) * 60.0 + length(c) * 1.6));
    float core = smoothstep(0.18, 0.0, length(c));
    float a = clamp(star + core, 0.0, 1.0) * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

