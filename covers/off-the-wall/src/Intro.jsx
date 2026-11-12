// Pantalla de entrada: un vinilo de "Off the Wall" girando sobre su plato con
// un anillo que se llena según se prepara el plató (lienzo creado, letras
// cargadas y primeros fotogramas pintados). Al terminar aparece "Entrar al
// plató"; al pulsarlo la pantalla se desvanece y la cámara vuela desde el fondo
// del estudio hasta el encuadre de la portada.

const STAGES = {
  es: ['Montando el plató…', 'Encendiendo las luces…', 'Michael se coloca…', 'Todo listo'],
  en: ['Building the set…', 'Turning on the lights…', 'Michael takes his place…', 'All set'],
};
const TEXT = {
  es: { enter: 'Entrar al plató', tip: 'Sube el volumen: dentro suena el disco y Michael baila.' },
  en: { enter: 'Enter the set', tip: 'Turn the volume up: inside, the album plays and Michael dances.' },
};
const PROGRESS = [12, 45, 78, 100];
const COVER_URL = new URL('../public/monitor-cover.jpg', import.meta.url).href;

/**
 * @param {{ stage: number, entered: boolean, onEnter: () => void, lang: string }} props
 */
export default function Intro({ stage, entered, onEnter, lang }) {
  const t = TEXT[lang] ?? TEXT.es;
  const ready = stage >= 3;
  return (
    <div className={`otw__intro ${entered ? 'is-gone' : ''}`} aria-hidden={entered}>
      <div className="otw__intro-deck" style={{ '--p': `${PROGRESS[stage]}%` }}>
        {/* Anillo de carga alrededor del vinilo. */}
        <div className="otw__intro-ring" aria-hidden="true" />
        <div className="otw__intro-vinyl" aria-hidden="true">
          <div className="otw__intro-label" style={{ backgroundImage: `linear-gradient(rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.3)), url("${COVER_URL}")` }}>
            <span>Michael Jackson</span>
            <strong>OFF THE WALL</strong>
            <em>Epic · 1979</em>
          </div>
        </div>
      </div>
      <p className="otw__intro-status" role="status" aria-live="polite">
        {(STAGES[lang] ?? STAGES.es)[stage]} <span>{PROGRESS[stage]} %</span>
      </p>
      <button type="button" className="otw__intro-enter" disabled={!ready || entered} onClick={onEnter}>
        {t.enter}
      </button>
      <p className="otw__intro-tip">{t.tip}</p>
    </div>
  );
}
