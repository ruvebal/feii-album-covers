// Currents — portada 3D modelada en Blender, con reproductor y contraportada clicable.
// React pinta una sola vez el DOM (título, ficha, reproductor, ayuda); scene.js monta Three.js
// sobre el <canvas> de esta ruta, conecta los controles y devuelve su desmontaje.
// Con ?budget en la URL aparece un panel con renderer.info, para docs/renderer-info.md.

import { useEffect, useRef } from "react";
import { mountCover } from "./scene.js";
import "./route.css";

const SCOPE = "route-currents";

const IconMin = () => <svg className="icon-min" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8 H13" /></svg>;
const IconMax = () => <svg className="icon-max" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 H13 V13 H3 Z" /></svg>;
const IconClose = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" /></svg>;

function Sheet() {
	return (
		<aside id="sheet" className="sheet" aria-labelledby="sheet-title">
			<div className="stripes" aria-hidden="true" />
			<div className="sheet-body">
				<header className="player-head">
					<h2 id="sheet-title">Ficha del álbum</h2>
					<button id="sheet-toggle" className="head-button" type="button" aria-expanded="true" aria-controls="sheet-content" aria-label="Recoger la ficha">
						<IconMin />
						<IconMax />
					</button>
				</header>
				<div id="sheet-content" className="sheet-content">
					<ul className="facts">
						<li><strong>2015</strong><span>Salió el 17 de julio</span></li>
						<li><strong>Kevin Parker</strong><span>Lo compuso, grabó y produjo él solo</span></li>
						<li><strong id="sheet-total" /><span id="sheet-length" /></li>
						<li><strong>Robert Beatty</strong><span>Autor de la portada</span></li>
					</ul>
					<section className="sheet-section" aria-live="polite">
						<h3>Ahora</h3>
						<p id="sheet-track" className="sheet-track">Pulsa la bola para empezar</p>
						<p id="sheet-track-meta" className="sheet-meta" />
					</section>
				</div>
			</div>
		</aside>
	);
}

function Player() {
	return (
		<section id="tracklist" className="player" aria-labelledby="tracklist-title" hidden>
			<div className="stripes" aria-hidden="true" />
			<div className="player-body">
				<header className="player-head">
					<h2 id="tracklist-title">Currents · 2015</h2>
					<span id="album-total" />
					<button id="player-min" className="head-button" type="button" aria-expanded="true" aria-controls="tracklist" aria-label="Minimizar el reproductor">
						<IconMin />
						<IconMax />
					</button>
					<button id="player-close" className="head-button" type="button" aria-label="Recoger el reproductor" aria-keyshortcuts="Escape">
						<IconClose />
					</button>
				</header>

				<div className="now">
					<button id="play" className="chrome" type="button" aria-label="Reproducir" aria-keyshortcuts="Space P">
						<svg className="icon-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2 L14 8 L4 14 Z" /></svg>
						<svg className="icon-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
					</button>
					<div className="now-text">
						<p id="now-label">Pulsa la bola o un tema</p>
						<p id="now-title">Currents</p>
					</div>
					<button id="prev" className="step" type="button" aria-label="Tema anterior" aria-keyshortcuts="B">
						<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 2 L5 8 L13 14 Z M3 2 V14" /></svg>
					</button>
					<button id="next" className="step" type="button" aria-label="Tema siguiente" aria-keyshortcuts="N">
						<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2 L11 8 L3 14 Z M13 2 V14" /></svg>
					</button>
				</div>

				<canvas id="viz" width="324" height="64" role="img" aria-label="Visualizador: rayas lila que ondulan con la música" />

				<div className="seek">
					<label htmlFor="seek" className="visually-hidden">Posición del tema</label>
					<input id="seek" className="rail" type="range" min="0" max="0" step="any" defaultValue="0" />
					<div className="times"><span id="time-current">0:00</span><span id="time-total">0:00</span></div>
				</div>

				<div className="volume">
					<button id="mute" className="step" type="button" aria-label="Silenciar" aria-pressed="false" aria-keyshortcuts="M">
						<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6 H5 L9 3 V13 L5 10 H2 Z" /><path className="waves" d="M11.5 5.5 Q13.5 8 11.5 10.5 M13 3.5 Q16.5 8 13 12.5" /></svg>
					</button>
					<label htmlFor="volume" className="visually-hidden">Volumen</label>
					<input id="volume" className="rail" type="range" min="0" max="1" step="0.01" defaultValue="1" />
				</div>

				<ol id="tracks" className="tracks" />
				<p id="audio-source" className="note" role="status" />
			</div>
		</section>
	);
}

function Help() {
	return (
		<>
			<div id="help" className="help" popover="auto" aria-labelledby="help-title">
				<header className="help-head">
					<h2 id="help-title">Controles</h2>
					<button className="head-button" type="button" popoverTarget="help" popoverTargetAction="hide" aria-label="Cerrar la ayuda">
						<IconClose />
					</button>
				</header>
				<section className="help-group" aria-labelledby="help-pointer">
					<h3 id="help-pointer">Ratón o dedo</h3>
					<ul className="help-list">
						<li><span className="help-act">Arrastrar</span><span>Gira el álbum, también hacia atrás</span></li>
						<li><span className="help-act">Rueda · pellizcar</span><span>Acerca y aleja</span></li>
						<li><span className="help-act">La bola</span><span>Reproduce o pausa</span></li>
						<li><span className="help-act">Un tema</span><span>Lo reproduce (contraportada)</span></li>
					</ul>
				</section>
				<section className="help-group" aria-labelledby="help-keys">
					<h3 id="help-keys">Teclado</h3>
					<ul className="help-list">
						<li><span className="help-act"><kbd>Espacio</kbd> <kbd>P</kbd></span><span>Reproduce o pausa</span></li>
						<li><span className="help-act"><kbd>N</kbd> <kbd>B</kbd></span><span>Siguiente · anterior</span></li>
						<li><span className="help-act"><kbd>M</kbd></span><span>Silencia</span></li>
						<li><span className="help-act"><kbd>T</kbd></span><span>Muestra u oculta el reproductor</span></li>
						<li><span className="help-act"><kbd>R</kbd></span><span>Vuelve a la vista inicial</span></li>
						<li><span className="help-act"><kbd>?</kbd> <kbd>Esc</kbd></span><span>Abre · cierra la ayuda</span></li>
					</ul>
				</section>
				<p className="help-note">Sin tocar nada unos segundos, la portada se mece sola. El audio son los previews oficiales de 30 s de Apple.</p>
			</div>

			<button id="help-button" className="help-button" type="button" popoverTarget="help" aria-keyshortcuts="Shift+?">
				<span className="help-mark" aria-hidden="true">?</span> Controles
			</button>
		</>
	);
}

export default function Route() {
	const rootRef = useRef(null);

	useEffect(() => {
		const html = document.documentElement;
		html.classList.add(SCOPE);
		const unmount = mountCover(rootRef.current);
		return () => {
			unmount();
			html.classList.remove(SCOPE);
		};
	}, []);

	return (
		<div className="currents" lang="es" ref={rootRef}>
			<canvas id="scene" role="img" aria-label="Portada 3D de Currents: rayas lila alrededor de una bola cromada y una estela multicolor. Por detrás, la contraportada con el tracklist." />
			<header className="hud">
				<p className="brand">Tame Impala</p>
				<h1 className="brand">Currents</h1>
			</header>

			<Sheet />
			<Player />
			<Help />

			<div id="loader" className="loader" role="status" aria-live="polite">
				<span className="loader-ball" aria-hidden="true" />
				<div className="loader-bar" aria-hidden="true"><span id="loader-fill" /></div>
				<p id="loader-label" className="loader-label">Cargando</p>
			</div>

			<pre id="budget" className="budget" aria-label="renderer.info" hidden />
		</div>
	);
}
