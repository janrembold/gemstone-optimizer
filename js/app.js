import { materials, materialModel } from './materials.js';
import { getCut } from './cuts/cutDefinition.js';
import { presets, gridSize } from './optimizer/searchSpace.js';
import { validateConfig } from './optimizer/optimizer.js';
import { exportASC, manufacturingReport } from './export/gemcadAsc.js';
import { canonical } from './reproducibility.js';
import { scoringVersion } from './optics/metrics.js';
import { StoneRenderer } from './render/stoneRenderer.js';
import OptimizerWorker from './optimizer/worker.js?worker&inline';
const $ = (id) => document.getElementById(id);
let cut = getCut('round-brilliant');
let worker = null,
  paused = false,
  active = false,
  results = [],
  selected = null,
  currentConfig = null,
  completedRun = null,
  viewer = null,
  runStarted = 0,
  pauseStarted = 0,
  pausedMs = 0,
  timer = null;
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—'),
  time = (s) =>
    Number.isFinite(s)
      ? `${Math.floor(s / 60)
          .toString()
          .padStart(2, '0')}:${Math.floor(s % 60)
          .toString()
          .padStart(2, '0')}`
      : '—';
function message(text, error = false) {
  $('run-message').textContent = text;
  $('run-message').classList.toggle('error', error);
}
$('material').innerHTML = materials
  .map(
    (m) => `<option value="${m.id}" ${m.id === 'moissanite' ? 'selected' : ''}>${m.name}</option>`,
  )
  .join('');
function renderRanges() {
  $('ranges').innerHTML = cut.parameters
    .map(
      (p) =>
        `<tr><td>${p.label}</td>${['min', 'max', 'coarse', 'fine'].map((k) => `<td><input aria-label="${p.key} ${k}" data-key="${p.key}" data-field="${k}" type="number" step="any" value="${p[k]}" required></td>`).join('')}</tr>`,
    )
    .join('');

  $('cut-symmetry').textContent =
    `${cut.approximateSymmetry ? '≈ ' : ''}${cut.symmetry}-fach symmetrisch`;
  $('cut-note').textContent = cut.description || '';
  $('cut-note').hidden = !cut.description;
  $('viewer-cut-name').textContent = cut.name.toUpperCase();
}
function changeCut(id) {
  cut = getCut(id);
  $('cut').value = id;
  results = [];
  selected = null;
  completedRun = null;
  $('save-run').disabled = true;
  $('leaderboard').innerHTML =
    '<div class="empty"><p>Neue Schlifffamilie: Optimierung starten.</p></div>';
  $('status').textContent = 'BEREIT';
  $('phase').textContent = 'Bereit · Ausgangsdesign in der Vorschau';
  $('best').textContent = '';
  $('screening-best').textContent = '';
  $('current-parameters').textContent = '';
  $('progress').value = 0;
  $('percent').textContent = '0%';
  $('census-label').textContent = 'noch keine Ergebnisse';
  for (const id of ['evaluated', 'remaining', 'ray-tests']) $(id).textContent = '0';
  for (const id of ['elapsed', 'eta']) $(id).textContent = '—';
  renderRanges();
  estimate();
  showStone(null);
}
function parameterSummary(p) {
  return cut.parameters
    .filter(({ key }) => !key.endsWith('Distance'))
    .map(({ key, label }) => `${label}: ${fmt(p[key], cut.id === 'bl-m5' ? 6 : 2)}`)
    .join(' · ');
}
$('cut').onchange = () => {
  changeCut($('cut').value);
  message('Schlifffamilie gewechselt. Die Vorschau zeigt das Ausgangsdesign.');
};
renderRanges();
function updateMaterial(reset = true) {
  const m = materials.find((m) => m.id === $('material').value);
  if (reset) $('ri').value = m.ri ?? '';
  const notes = [];
  if (m.id === 'custom')
    notes.push('Brechungsindex eingeben. Die Auswahl wechselt dann auf Other.');
  if (m.id === 'other') notes.push('Eigener RI: Material und Kristalleigenschaften unbekannt.');
  if (m.anisotropic)
    notes.push('Doppelbrechendes Material: derzeit isotrope Näherung mit einem RI.');
  if (m.dispersion == null && !m.sellmeier)
    notes.push('Keine belegte Dispersion hinterlegt: Fire = 0 im nichtdispersiven Ersatzmodell.');
  if (m.ri != null && Number($('ri').value) !== m.ri)
    notes.push('Eigener RI: Dispersionskurve nur verschoben, nicht neu kalibriert.');
  if (!notes.length)
    notes.push('Repräsentativer Materialwert. Spektralmodell und Quellen im Methodenprotokoll.');
  $('material-note').textContent = notes.join(' ');
}
function readConfig() {
  return {
    cutId: cut.id,
    material: materialModel($('material').value, Number($('ri').value)),
    gear: Number($('gear').value),
    seed: Number($('seed').value),
    preset: document.querySelector('[name=preset]:checked').value,
    ranges: cut.parameters.map((p) => ({
      key: p.key,
      ...Object.fromEntries(
        ['min', 'max', 'coarse', 'fine'].map((k) => [
          k,
          Number(document.querySelector(`[data-key=${p.key}][data-field=${k}]`).value),
        ]),
      ),
    })),
    verification: Object.fromEntries(
      ['faceRays', 'tiltRays', 'spectralRays'].map((k) => [k, Number($(k).value)]),
    ),
  };
}
function estimate() {
  try {
    const c = readConfig();
    $('search-size').textContent =
      `${gridSize(c.ranges, presets[c.preset].coarseFactor).toLocaleString('de-DE')} Kombinationen im groben Raster`;
  } catch {
    $('search-size').textContent = 'Suchbereiche prüfen';
  }
}
function setActive(value) {
  active = value;
  for (const input of $('config-form').querySelectorAll('input,select,button'))
    input.disabled = value;
  $('pause').disabled = !value;
  $('cancel').disabled = !value;
  $('load-run').disabled = value;
  if (!value) {
    clearInterval(timer);
    paused = false;
    $('pause').textContent = 'Pause';
  }
}
function showStone(result) {
  selected = result;
  const stone = cut.generate(result?.parameters || cut.defaults),
    m = result?.reproduction.material || {
      name: materials.find((m) => m.id === $('material').value).name,
      ri: $('ri').value === '' ? NaN : Number($('ri').value),
    },
    gear = result?.reproduction.gear || Number($('gear').value);
  viewer?.setStone(stone);
  $('selected-id').textContent = result?.id || 'VORSCHAU';
  $('export-selected').disabled = !result;
  const data = [
    ['Material', m.name],
    ['RI', fmt(m.ri, 4)],
    [
      'Facetten',
      `${stone.derived.facetCount} (${stone.derived.opticalFacetCount} + ${stone.derived.facetCount - stone.derived.opticalFacetCount})`,
    ],
    ['Tafel', fmt(stone.parameters.table ?? stone.derived.tableWidth, 1) + '%'],
    ['Krone', fmt(stone.parameters.crown) + '°'],
    ['Pavillon', fmt(stone.parameters.pavilion) + '°'],
    ...(stone.parameters.crown2 != null
      ? [['Krone c2', fmt(stone.parameters.crown2, 6) + '°']]
      : []),
    ['Tiefe', fmt(stone.derived.totalDepth) + '%'],
    ['Global*', result ? fmt(result.metrics.Global) : '—'],
    ['Gear', gear],
  ];
  $('stone-data').replaceChildren(
    ...data.map(([label, value]) => {
      const span = document.createElement('span');
      span.textContent = label;
      const b = document.createElement('b');
      b.textContent = value;
      span.append(b);
      return span;
    }),
  );
  if (result) showOptical(result, stone);
  else
    $('optical-details').textContent =
      'Für diese Vorschau wurden noch keine optischen Werte berechnet.';
  renderLeaderboard();
}
function showOptical(result, stone) {
  const m = result.metrics,
    f = m.face;
  const report = manufacturingReport(stone, result.reproduction.gear);
  const energy = [
    ['Nützlicher Kronenrücklauf', f.useful],
    ['Pavillon / Rundiste (Leak)', f.leak],
    ['Krone außerhalb Sichtkegel', f.crownOther],
    ['Reflexion vor Eintritt', f.surface],
    ['Restenergie / Bounce-Limit', f.residual],
  ];
  $('optical-details').innerHTML =
    `<div class="optical-grid"><div><h3>Energiebilanz · 100% einfallende Energie</h3>${energy.map(([l, v]) => `<div class="energy-row"><span>${l}</span><b>${fmt(v, 3)}%</b></div>`).join('')}<div class="energy-row"><span>Summe</span><b>${fmt(
      energy.reduce((s, [, v]) => s + v, 0),
      6,
    )}%</b></div></div><div><h3>Tilt-Kurve · absoluter nützlicher Rücklauf</h3>${m.tiltCurve.map((t) => `<div class="tilt-row"><span>${t.angle}°</span><div class="tilt-track"><i style="width:${t.useful}%"></i></div><span>${fmt(t.useful, 1)}%</span></div>`).join('')}</div></div><p class="detail-foot">Face-up Head Shadow: ${fmt(m.HeadShadow)} Prozentpunkte ± ${fmt(m.headShadow.standardError, 3)} (Stichproben-SE), ${m.headShadow.halfAngle}° Halbwinkel. Gewicht: ${100 * m.opticalSettings.headShadowWeight}%. Gleichförmige obere Lichthemisphäre: ${fmt(m.headShadow.unobstructed)}% ohne Kopf → ${fmt(m.headShadow.visible)}% mit Kopf. Separates Beobachtermodell, kein zusätzlicher Posten der Energiebilanz.<br>Spektrale Trennung: ${fmt(m.fire.meanSeparationDeg, 4)}° · Pfadgleiche Rücklaufenergie: ${fmt(m.fire.matchedEnergyPct)}% · Fire*: Energieanteil mit ≥ ${m.opticalSettings.fireResolution}° Trennung (${m.fire.wavelengths.join(' / ')} nm). ${m.fire.available ? 'Cauchy-Näherung bzw. hinterlegtes Sellmeier-Modell.' : 'Dispersion fehlt: nichtdispersiver Ersatz, Fire nicht aussagekräftig.'}<br>Monte-Carlo-Standardfehler Brilliance: ± ${fmt(f.standardError, 3)} Prozentpunkte (nur Stichprobe, keine Modellunsicherheit).<br>${result.screening ? `Suchschätzung Global ≈ ${fmt(result.screening.Global)} (${result.screening.opticalSettings.faceRays} Face-up-Strahlen) → verifiziert ${fmt(m.Global)} (${m.opticalSettings.faceRays} Face-up-Strahlen).` : ''}<br>Minimum metric: ${fmt(m.minimumMetric)} · ${m.rayCount.toLocaleString('de-DE')} angenommene Spektral-/Tilt-Strahlen · Seed ${m.opticalSettings.seed} · ${result.verified ? 'Einheitlicher hoher Census' : 'Vorläufige Suchstichprobe'}<br>${report.fractional} Facetten benötigen gebrochene Gear-Indizes: Export erhält exakte Azimute; auf fester Zahnteilung ggf. Feineinstellung nötig.<br>* Fire und Global: vorläufige Bewertungsmodelle. Restenergie wird weder als Rücklauf noch als Leckage gezählt.</p>`;
}
function renderLeaderboard() {
  if (!results.length) return;
  $('leaderboard').replaceChildren(
    ...results.map((r, i) => {
      const card = document.createElement('article');
      card.className = 'candidate' + (selected?.id === r.id ? ' selected' : '');
      card.tabIndex = 0;
      card.setAttribute('aria-label', `Variante ${i + 1}, Global ${fmt(r.metrics.Global)}`);
      card.innerHTML = `<div class="candidate-head"><h3>0${i + 1} / ${cut.name}</h3><strong><small>GLOBAL*</small>${fmt(r.metrics.Global)}</strong></div><div class="metrics-mini">${['Brilliance', 'Fire', 'Tilt', 'Scintillation', 'Symmetry', 'Leak', 'HeadShadow'].map((k, i) => `<span>${['BRILL.', 'FIRE*', 'TILT', 'SCINT.', 'SYMM.', 'LEAK ↓', 'HEAD ↓'][i]}<b>${fmt(r.metrics[k], 1)}</b></span>`).join('')}</div><div class="parameters-line">${parameterSummary(r.parameters)}<br>Tiefe ${fmt(r.derived.totalDepth)}% · ${r.derived.facetCount} Facetten</div><div class="candidate-actions"><button class="view">View</button><button class="export">Export ASC ↓</button></div>`;
      card.onclick = (e) => {
        if (e.target.closest('.export')) downloadASC(r);
        else showStone(r);
      };
      card.onkeydown = (e) => {
        if (e.target === card && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          showStone(r);
        }
      };
      return card;
    }),
  );
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadASC(r) {
  const stone = cut.generate(r.parameters),
    m = r.reproduction.material;
  download(
    exportASC(stone, m, r.reproduction.gear, r),
    `${cut.name.replace(/[^a-zA-Z0-9-]/g, '')}_${m.name.replace(/[^a-zA-Z0-9]/g, '_')}_${fmt(r.metrics.Global)}.asc`,
    'text/plain',
  );
}
function onProgress(p) {
  $('phase').textContent = `Phase ${p.phase}/5 — ${p.phaseLabel}`;
  $('progress').value = p.percent;
  $('percent').textContent = fmt(p.percent, 0) + '%';
  $('evaluated').textContent = p.evaluated.toLocaleString('de-DE') + ` (${p.rejected} ungültig)`;
  $('remaining').textContent = p.remaining.toLocaleString('de-DE');
  $('eta').textContent = time(p.eta);
  $('ray-tests').textContent = p.rayTests.toLocaleString('de-DE');
  $('census-label').textContent = `LIVE · verifiziert · ${p.verifiedCount} geprüft`;
  const census = p.verificationSettings;
  $('screening-best').textContent = p.screeningBest
    ? `Suchschätzung: Global ≈ ${fmt(p.screeningBest.metrics.Global)} bei ${p.screeningSettings.faceRays} Face-up-Strahlen. Nur zur Vorauswahl; nicht mit der verifizierten Rangliste gleichsetzen.`
    : 'Suchschätzungen dienen nur der Vorauswahl. Die Rangliste verwendet von Anfang an den höheren Census.';
  if (p.current) $('current-parameters').textContent = `Aktuell: ${parameterSummary(p.current)}`;
  results = p.leaderboard;
  if (results.length) {
    const b = results[0].metrics;
    $('best').textContent =
      `Verifizierter Bestwert: Global ${fmt(b.Global)} · Brilliance ${fmt(b.Brilliance)} · Fire ${fmt(b.Fire)} · Tilt ${fmt(b.Tilt)} · Leak ${fmt(b.Leak)} · ${census.faceRays} / ${census.tiltRays} / ${census.spectralRays} Strahlen (Face-up / je Tilt / Spektraltripel)`;
    if (!selected || !results.some((r) => r.id === selected.id)) showStone(results[0]);
    else renderLeaderboard();
  } else {
    $('leaderboard').innerHTML =
      '<div class="empty"><p>Erster Kandidat wird mit dem höheren Census geprüft. Hier erscheinen ausschließlich verifizierte Werte.</p></div>';
    $('best').textContent = 'Verifizierter Bestwert: ausstehend';
  }
}
$('config-form').onsubmit = (e) => {
  e.preventDefault();
  if (active) return;
  try {
    currentConfig = readConfig();
    validateConfig(currentConfig);
  } catch (error) {
    message(error.message, true);
    return;
  }
  results = [];
  selected = null;
  completedRun = null;
  $('save-run').disabled = true;
  setActive(true);
  $('status').textContent = 'OPTIMIZING';
  message('Berechnung läuft im Hintergrund.');
  $('progress').value = 0;
  $('best').textContent = 'Verifizierter Bestwert: ausstehend';
  $('screening-best').textContent = '';
  $('census-label').textContent = 'Einheitliche Verifikation ab Start';
  runStarted = performance.now();
  pausedMs = 0;
  timer = setInterval(() => {
    if (!paused)
      $('elapsed').textContent = time((performance.now() - runStarted - pausedMs) / 1000);
  }, 250);
  $('leaderboard').innerHTML =
    '<div class="empty"><p>Erste Geometrien werden berechnet …</p></div>';
  showStone(null);
  worker?.terminate();
  worker = new OptimizerWorker();
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') onProgress(data.data);
    else if (data.type === 'done') {
      completedRun = data.data;
      results = completedRun.results;
      setActive(false);
      $('status').textContent = 'VERIFIZIERT';
      $('phase').textContent = 'Fertig · Top 5 nach identischem Verifikationscensus';
      $('percent').textContent = '100%';
      $('progress').value = 100;
      $('eta').textContent = '00:00';
      $('remaining').textContent = '0';
      $('save-run').disabled = false;
      $('census-label').textContent = 'FINAL · gleicher hoher Census';
      showStone(results[0]);
      message(
        'Fertig: derselbe Census wie in der Live-Rangliste. Suchschätzungen und Verifikation sind im Run JSON dokumentiert.',
      );
      worker.terminate();
    } else if (data.type === 'error' || data.type === 'cancelled') {
      setActive(false);
      $('status').textContent = data.type === 'error' ? 'FEHLER' : 'ABGEBROCHEN';
      message(data.message, data.type === 'error');
      worker.terminate();
    }
  };
  worker.onerror = (e) => {
    setActive(false);
    $('status').textContent = 'FEHLER';
    message(e.message, true);
    worker.terminate();
  };
  worker.postMessage({ type: 'start', config: currentConfig });
};
$('pause').onclick = () => {
  paused = !paused;
  worker.postMessage({ type: paused ? 'pause' : 'resume' });
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  $('status').textContent = paused ? 'PAUSIERT' : 'OPTIMIZING';
  if (paused) pauseStarted = performance.now();
  else pausedMs += performance.now() - pauseStarted;
  message(paused ? 'Pause nach der laufenden Variante.' : 'Berechnung fortgesetzt.');
};
$('cancel').onclick = () => {
  worker?.terminate();
  setActive(false);
  $('status').textContent = 'ABGEBROCHEN';
  $('phase').textContent = 'Abgebrochen · bisherige Ergebnisse sind nicht die finale Top 5';
  message('Berechnung beendet. Keine finale Rangliste bestätigt.');
};
$('material').onchange = () => {
  updateMaterial();
  estimate();
  if (!selected) showStone(null);
};
$('ri').oninput = () => {
  if ($('ri').value !== '') $('material').value = 'other';
  updateMaterial(false);
  estimate();
  if (!selected) showStone(null);
};
$('config-form').addEventListener('change', estimate);
$('export-selected').onclick = () => {
  if (selected) downloadASC(selected);
};
$('save-run').onclick = () =>
  download(JSON.stringify(completedRun, null, 2), 'gem-cut-run.json', 'application/json');
$('load-run').onclick = () => $('import-file').click();
$('import-file').onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    const run = JSON.parse(await file.text()),
      c = run.config;
    validateConfig(c);
    if (run.results?.some((r) => r.reproduction?.topologyVersion !== getCut(c.cutId).version))
      throw new Error('Run uses a different topology version');
    const known = materials.find((m) => m.id === c.material.id);
    if (!known) throw new Error('Unknown material');
    const rebuilt = materialModel(c.material.id, c.material.ri);
    if (canonical(rebuilt) !== canonical(c.material))
      throw new Error('Material model differs from this app version');
    changeCut(c.cutId);
    $('material').value = c.material.id;
    $('ri').value = c.material.ri;
    updateMaterial(false);
    $('gear').value = c.gear;
    $('seed').value = c.seed;
    document.querySelector(`[name=preset][value=${c.preset}]`).checked = true;
    for (const r of c.ranges)
      for (const k of ['min', 'max', 'coarse', 'fine'])
        document.querySelector(`[data-key=${r.key}][data-field=${k}]`).value = r[k];
    for (const k of ['faceRays', 'tiltRays', 'spectralRays']) $(k).value = c.verification[k];
    estimate();
    showStone(null);
    message(
      run.results?.some((r) => r.metrics?.scoringVersion !== scoringVersion)
        ? 'Ältere Bewertung: Konfiguration geladen. Optimize Cut berechnet alle Werte mit Head Shadow neu.'
        : 'Konfiguration geladen. Optimize Cut berechnet den Run erneut.',
    );
  } catch (error) {
    message('Import: ' + error.message, true);
  } finally {
    e.target.value = '';
  }
};
try {
  viewer = new StoneRenderer($('viewer'));
} catch (error) {
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = 'WebGL nicht verfügbar: ' + error.message;
  $('viewer').append(p);
}
for (const b of document.querySelectorAll('[data-view]'))
  b.onclick = () => viewer?.view(b.dataset.view);
for (const id of ['wireframe', 'edges', 'transparent'])
  $(id).onchange = () =>
    viewer?.setOptions({
      wireframe: $('wireframe').checked,
      edges: $('edges').checked,
      transparent: $('transparent').checked,
    });
updateMaterial();
estimate();
showStone(null);
