# Projektprotokoll – Gem Cut Lab

Stand: 19. September 2026. Dieses Protokoll ist der Einstieg für die weitere Arbeit. Die Implementierung entstand aus dem ausführlichen App-Prompt und den anschließend übergebenen ASC-Referenzen. Ausgangszustand des Repositories: ausschließlich eine README mit Projektnamen.

## Erreichtes Ergebnis

Die Anwendung erzeugt echte geschlossene Round-Brilliant-Geometrien, simuliert Lichtstrahlen an deren Facetten, optimiert semantische Parameter in einem Web Worker und zeigt fünf unter identischen höheren Strahlzahlen verifizierte Kandidaten. Jeder Kandidat kann als exakte Geometrie in Three.js angesehen und als ASC exportiert werden. Die Konfiguration ist als JSON exportierbar und erneut berechenbar.

**„Verifiziert“ bezeichnet hier den höheren numerischen Census. Es bedeutet weder experimentell validierte Edelsteinbewertung noch ein bewiesenes globales Optimum.** Fire und Global sind sichtbar vorläufig. Es wurden keine plausibel aussehenden Resultate erfunden.

## Umsetzungsschritte

1. Prompt und leeres Repository geprüft; offizielle GemCad-Dokumentation, Bewertungsdefinitionen aus dem App-Prompt, Tolkowsky sowie Materialdaten von GIA und SCHOTT recherchiert.
2. Achtfach symmetrische Schnittgeometrie aus Halbräumen aufgebaut. Primäre Parameter: Tafel, Kronenwinkel, Pavillonwinkel, Sternlänge, untere Rundistenlänge, Rundistendicke. Alle weiteren Ebenen werden aus Meetpoints abgeleitet.
3. Geschlossenheit, Ebenenlage, Orientierung, Kanteninzidenz, Euler-Charakteristik und Volumen geprüft. Die Oberfläche besteht aus 57 optischen Kronen-/Pavillonfacetten plus 16 echten Rundistenfacetten.
4. Isolierte Materialdatenbank mit Quellen, anisotropen Kennzeichen, editierbarem RI und spektralem Modell ergänzt. Fehlende Dispersionsdaten werden offengelegt, nicht geschätzt.
5. Snell, Totalreflexion, Fresnel-Energieaufteilung, Eintritt/Austritt, Restenergie und deterministische Stichproben implementiert. Exakte analytische Platte als unabhängiger Optiktest hinzugefügt.
6. Energiegewichtete Brilliance und Leak, vollständige Tilt-Kurve, pfadgleiche spektrale Trennung, angeforderte Gewichtungsformel und MinimumMetric ergänzt.
7. Hierarchische Suche, regionale Vielfalt, feine Nachbarschaft, 0,01°-Winkelraster und höheren finalen Census implementiert. Fortschritt wird gedrosselt aus dem Worker übertragen; Pause, Resume und Cancel integriert.
8. Bedienoberfläche, Live Top 5, Auswahl, exaktes Three.js-Modell und ASC-/JSON-Download umgesetzt. Mobile Ansicht und Fehlermeldungen geprüft.
9. Die vier gelieferten ASC-Dateien lokal gelesen, anhand ihrer Hashes dokumentiert und als geschlossene Körper rekonstruiert. Ihre Originalinhalte werden nicht mit dem Projekt veröffentlicht.
10. Rechenprüfungen, End-to-End-Browsertests, Konvergenzreihen, unabhängige Seeds und komplette wiederholte Optimierung ausgeführt. Tatsächliche Ergebnisse sind in `docs/VALIDATION.md` und den JSON-Rohdaten abgelegt.
11. Gepatchtes Vite 7.3.6 gewählt, Abhängigkeiten gesperrt und npm-Audit ohne gemeldete Schwachstellen abgeschlossen. Formatierung und GitHub-CI für fortlaufende Prüfungen eingerichtet.

## Bewusste Entscheidungen

- Alle Messwerte stammen aus der jeweiligen Geometrie, dem optischen Modell oder der ausdrücklich angeforderten deterministischen Facettenzahlformel. Keine Score-Tabellen, kein `Math.random()` für optische Resultate.
- Die Richtungs- und Energieberechnung ist geometrische Optik mit offengelegten Vereinfachungen. Doppelbrechung wird aktuell nicht physikalisch aufgespalten.
- Fire misst spektral getrennte Rücklaufenergie oberhalb einer angegebenen Winkelschwelle. Die Wahrnehmungsbewertung ist nicht experimentell kalibriert. Global erbt diese Einschränkung.
- Brilliance bezieht sich auf eingestrahlte Energie einschließlich Fresnel-Verlusten. Dadurch liegen die Resultate deutlich unter manchen veröffentlichten Ray-Census-Scores. Die Implementierung wurde nicht auf fremde Zielwerte hingetunt.
- Die 16 geometrischen Rundistenfacetten zählen bei Scintillation mit: 73 aktive Flächen, nicht 57. Das folgt dem Begriff „active facets reaching the surface“.
- Die Rundiste ist ein regelmäßiges 16-Eck. Das ist eine explizite facettierte Geometrie und keine glatte Kreisnäherung im Raytracer.
- Der Index-Gear beeinflusst nur Fertigungsdarstellung und Export. Geometrie und Optik verwenden reelle Azimute. Gebrochene Indizes werden erhalten und angezeigt.
- Ein Worker genügt bei der gemessenen Laufzeit und vermeidet unnötige CPU-Auslastung. Direktes Traversieren der wenigen Ebenen genügt; kein unbegründeter BVH-Aufwand.
- Bildschirmdarstellung und Raytracer verwenden dieselben Polygone. Die GPU-Schattierung wird nicht als optischer Messwert verkauft.

## Ergänzung aus der laufenden Benutzeranforderung

Die Materialauswahl enthält Standardmaterialien wie Moissanite, Diamant und Saphir mit automatischem RI. Zusätzlich leert Custom das RI-Feld. Jede manuelle Eingabe wechselt auf Other; die Dispersionsdaten und Kristalleigenschaften des vorher gewählten Standards werden entfernt. Browserprüfungen testen auch den Wechsel, das blockierte Starten bei leerem RI und den JSON-Rückimport eines Other-Runs.

## Gefundene und behobene Probleme

- Negative Null (`-0.000000`) in historischen ASC-Dateien musste beim Culet als Pavillonseite erhalten bleiben.
- Die naive `acos(dot)`-Winkelberechnung konnte selbst bei identischen Spektralrichtungen einen winzigen numerischen Winkel erzeugen. Sie wurde durch `atan2(|cross|, dot)` ersetzt; der Null-Dispersions-Test verlangt jetzt exakt null.
- Frühe Fortschrittszählung erfasste nur Bounce-Ereignisse. Sie zählt nun tatsächliche Ray-/Ebenentests inklusive verworfener Aperturstrahlen.
- Abhängigkeiten enthielten zunächst eine bereits gemeldete Vite-Schwachstelle. Update auf die gepatchte Version, anschließend erneuter Audit.
- Das lokale Betriebssystem blockierte Server/Chrome innerhalb der Sandbox. Die notwendigen Installations- und Browser-Testschritte wurden über die vorgesehenen Freigaben ausgeführt.

## Prüfung und Belege

`npm test` deckt analytische Physik, Spektralmodell, Geometrie, 729 Standard-Rasterpunkte, Reproduzierbarkeit, Scoreformeln, ASC-Rückimport und Optimierungsinvarianten ab. `npm run test:browser` startet den **Produktionsbuild**, führt den Standard-Moissanite-Ablauf aus und prüft Desktop/Mobil, Pause/Resume, Kandidatenauswahl und Downloads. Screenshots und heruntergeladene Testdateien liegen lokal in `test-results/`; in CI werden sie als Artefakte gespeichert.

`npm run validate` erzeugt ausführliche Messreihen und führt denselben vollständigen Standard-Fast-Run zweimal aus. Kandidaten, IDs und Resultate müssen identisch sein. Der Bericht speichert Laufzeit, Strahltests, Stichprobenfehler, Energieabschluss und verbleibende Energie. Hardwareabhängige Laufzeiten sind keine Leistungszusage.

Für die ASC-Referenzen: `node scripts/validate-asc-references.js /pfad/zur/datei.asc ...`. Hashes und Strukturergebnisse stehen in `docs/ASC-REFERENCES.md`. Native GemCad-Importprüfung ist noch offen, da das Programm hier nicht verfügbar ist.

## Wo bei späterer Arbeit anfangen?

- Mathematik und Quellen: `docs/SCIENCE.md`.
- Aktuelle tatsächlich berechnete Referenzdaten: `docs/VALIDATION.md` und `docs/validation-results.json`.
- Reproduzierbarer Anwendungsfall: `docs/example-run.json`.
- Architektur/API: `README.md`, `js/cuts/cutDefinition.js`.
- Geometrie: `js/cuts/roundBrilliant.js`, `js/geometry/meshBuilder.js`.
- Optik: `js/optics/rayTracer.js`, `fresnel.js`, `dispersion.js`, `metrics.js`.
- Suche: `js/optimizer/optimizer.js`, `searchSpace.js`, `worker.js`.
- UI/Export: `js/app.js`, `js/render/stoneRenderer.js`, `js/export/gemcadAsc.js`.

## Offene wissenschaftliche Erweiterungen

1. Experimentelle Daten/etablierte unabhängige Raytracer für kontrollierte Vergleiche derselben vollständigen Geometrie und Beleuchtung heranziehen.
2. Doppelbrechung, Kristallorientierung und über mehrere Grenzflächen fortgeführte Polarisation modellieren.
3. Gemessene wellenlängenabhängige RI-Kurven für weitere Materialien; kein vorgetäuschtes Fire bei fehlenden Daten.
4. Realistische Beleuchtungsumgebungen, Augenpupille, spektrale Wahrnehmung und dynamische Scintillation implementieren.
5. Suchgrenzen, Kandidatenunsicherheit und weitere Zielfunktionen ausbauen; auch ein dichtes Raster beweist keine kontinuierliche globale Optimalität.
6. Eigene generierte ASC-Dateien zusätzlich direkt in GemCad/Gem Cut Studio öffnen und Fertigungstoleranzen prüfen.

Diese Punkte sind Grenzen des Prototyps und werden nicht als bereits erledigt dargestellt.

## Abschließender geprüfter Stand

- 36 automatisierte Rechen-/Struktur-/Regressionstests: bestanden.
- 3 Browser-End-to-End-Tests am Produktionsbuild: bestanden, einschließlich vollständiger Moissanite-Optimierung, wiederholtem JSON-Run, Custom/Other und mobiler Darstellung.
- Produktionsbuild, Formatprüfung und Git-Whitespaceprüfung: erfolgreich.
- npm-Audit nach dem Abhängigkeitsupdate: 0 gemeldete Schwachstellen.
- Vier gelieferte ASC-Dateien: vollständig als geschlossene Körper rekonstruiert.
- Remote `main` vor dem Push mit dem anfänglichen Commit abgeglichen; keine zwischenzeitlichen fremden Änderungen.

Der zugehörige Implementierungscommit ist in der Git-Historie mit `Build deterministic gemstone optimizer with verified optics and ASC export` benannt.

## Nachbesserung: direktes Öffnen der index.html

Der Benutzer meldete eine leere Materialauswahl beim Doppelklick auf `index.html`. Ursache: Die Auswahl wurde erst durch ES-Module gefüllt, deren lokale Dateizugriffe der Browser blockiert; zusätzlich verwies der Stylesheet-Pfad auf die Dateisystemwurzel.

Der Einstieg lädt unter `file://` nun ein mitgeliefertes klassisches JavaScript-Bundle, unter HTTP weiterhin die modulare Anwendung. Der Stylesheet-Pfad ist relativ. Der Optimierungsworker ist in beiden Builds eingebettet und startet als Blob-Worker, sodass keine lokalen Modul-Fetches nötig sind. Das Bundle wird aus derselben Implementierung erzeugt; physikalische Modelle, Scores und Daten bleiben unverändert.

Ein zusätzlicher Browsertest öffnet ausdrücklich die lokale `index.html` bei deaktiviertem Netzwerk und prüft Materialien, Custom/Other, Three.js, vollständige Optimierung und ASC-/JSON-Download. Die fünf Ergebnis-IDs und Scores werden gegen den dokumentierten Standard-Run verglichen. Der vollständige Projektordner ist nötig; nur die einzelne HTML-Datei zu kopieren genügt nicht.

Nachprüfung der Startkorrektur: Alle vier Browsertests bestanden, einschließlich direktem `file://`-Start bei ausgeschaltetem Netzwerk. Der Offline-Run lieferte dieselben fünf Konfigurations-IDs und Global-Scores wie der dokumentierte Referenzlauf. Der HTTP-Produktionsbuild funktioniert weiterhin.

## 20. September 2026 – verlässlicher Bewertungsverlauf

Der Benutzer meldete sinkende Endwerte gegenüber der Live-Anzeige im Exhaustive-Profil. Der alte Ablauf zeigte zunächst kleine Suchstichproben (384 Face-up / 192 Tilt / 192 Spektraltripel), ersetzte die Rangliste erst in Phase 5 durch größere Messungen (3.200 / 2.200 / 800) und wählte Finalisten vorrangig nach geometrischer Vielfalt. In einem vollständigen Standardlauf ließ sich das Verhalten reproduzieren: Suchspitze 77,675816, finales Maximum 76,644334. Dies waren unterschiedliche Stichproben, keine vergleichbare Konvergenzkurve. Vielfaltsauswahl konnte zudem nahe Spitzenkandidaten auslassen.

Korrektur: Neue Suchrekorde werden direkt mit dem unveränderten hohen Census geprüft. Eine dauerhafte Sammlung aller geprüften Varianten speist sowohl Live- als auch Endrangliste. Geprüfte Spitzenwerte können dadurch nicht beim Phasenwechsel verloren gehen. Die Finalauswahl vereinigt die numerischen Top-K mit unterschiedlichen Regionen; Vielfalt verdrängt keine Top-K-Geometrie. Suchschätzungen bleiben separat sichtbar, und jede echte Auf-/Abkorrektur steht im JSON-Prüfverlauf. Kein Score wurde nach oben geklemmt oder durch eine optimistische Schätzung ersetzt. Raytracer, Materialdaten und Scoreformeln wurden nicht verändert.

Die Optimierung hat die neue Suchversion `verified-archive-2`; deshalb ändern sich Konfigurations-IDs und gegebenenfalls die gefundenen Finalisten. Physikalische Regressionstests bleiben unverändert. Tests prüfen monotone verifizierte Bestwerte, einen konstanten Census, das Beibehalten eng benachbarter Spitzenkandidaten sowie den sichtbaren Exhaustive-Verlauf im Browser. Der vollständige Gegenlauf wird in `docs/EXHAUSTIVE-VALIDATION.md` mit Rohdaten dokumentiert.

Auf Wunsch des Benutzers wurden außerdem die bisherigen Markenverweise aus Website, Quellcode und aktueller Dokumentation entfernt. Der numerische Validierungsbericht beschreibt nun ausschließlich unsere eigenen Rechnungen und ihre Grenzen. Die historische Git-Historie bleibt unverändert.

Ergebnis der vollständigen Exhaustive-Nachprüfung: 15.625 grobe Rasterpunkte, insgesamt 15.970 optische Auswertungen und 39 mit hohem Census geprüfte Geometrien. Der verifizierte Live-Bestwert entwickelte sich von 76,477640 über 76,539935 zum finalen 76,644334, ohne Rückgang. Die weiterhin separat protokollierte Suchschätzung erreichte 77,675816. Der finale Bestwert bleibt physikalisch korrekt unverändert gegenüber der früheren gründlichen Endprüfung; es wurden keine Scores künstlich verbessert. Alle 38 Rechen-/Strukturtests und fünf Browsertests bestanden. Der Namensscan fand keine verbliebenen Verweise in aktuellen Quellen, Dokumentation, Offline-Bundle oder Web-Build.

## 2026-09-20 — Face-up head shadow preference

Request: include the observer obstruction seen in the supplied Gem Cut Studio tilt graph, with a modest preference for less face-up shadow. The previous model had no observer occlusion term.

Implemented a separate reciprocal observer-ray census: parallel camera rays, uniform upper-hemisphere radiance, black lower hemisphere, Fresnel-weighted internal paths and direct surface reflection. A black observer cone has a 10° half-angle, following the official Gem Cut Studio manual's convention. The screenshot is context, not calibration data or a recovered stone mesh.

Global now gives 95% to the previous composite and 5% to `100 − HeadShadow`. The weight is an explicit preference, not a physical law. Existing energy and Brilliance/Tilt/Fire calculations are unchanged. New scoring version, optical settings and result IDs prevent silently mixing old scores. Older JSON configurations can still be loaded for recomputation. Cards, optical diagnostics and ASC metadata expose the new factor; the offline bundle is rebuilt from the same source.

Validation: analytic normal-incidence slab including surface reflection, zero obstruction, nested cones, observer budget closure, exact score sensitivity, unchanged legacy fixture at zero weight, and existing verified-ranking invariants. `node scripts/validate-head-shadow.js` measures a fixed 25-candidate crown/pavilion neighborhood around the previous audited Moissanite leader, with 12,800 face rays, 8,800 tilt rays and 3,200 spectral triplets. Both objectives selected the same geometry: crown 29.52°, pavilion 40.76°, other parameters held fixed. Head shadow 20.565889 percentage points (sampling SE 0.252003), Brilliance 69.176479, Tilt 85.346129; old composite 76.614854, new composite 76.755817. Three additional seeds confirm repeat measurement but do not demonstrate an improvement: the selected geometry is identical. This neighborhood deliberately extends outside the previous run's crown lower bound; it is a local sensitivity study, not a rerun within that search box. Raw data and all candidates: `docs/head-shadow-results.json`. No claim of lower shadow in Gem Cut Studio follows from this study.

`npm run validate` regenerated the convergence report and two identical complete Fast runs under the new model. The earlier exhaustive audit remains historical evidence for the previous scoring version, not a current optimum claim.

Final checks: 41 Node tests and all 5 Playwright browser tests passed, including the reduced-grid Exhaustive live/final invariant and offline `file://` workflow. Production/standalone build, formatting and diff checks passed. Desktop screenshot reviewed: the seventh metric fits the ranking cards and the observer report renders correctly.

## 2026-09-20 — BL-M5 family from supplied ASC, with flat table

User requested a second family from `BL-M5.asc`, then explicitly requested the table be set to exactly 0°. Implemented `bl-m5-flat-table-1`: 24 pavilion + 24 girdle + 24 c1 + 12 c2 + 1 table facets, preserving all non-table ASC planes and the table's normal distance. The source table tilt 0.000994° is deliberately removed. The original file is untouched; a numerical fixture, source SHA-256, corrected ASC export and full explanation are in `docs/BL-M5.md`.

Added three angular parameters and four explicit plane distances; distances are fixed by default and angles search ±0.2°. No Round Brilliant percentage parameters are reused for this family. The selector, preview metadata, ranking, progress, export names and JSON import now follow the selected cut. Changing families clears stale results. Worker and offline bundles use the same registry. Round Brilliant optical results and result IDs remain unchanged.

Tests compare all source planes with the one documented exception, check exactly horizontal table vertices, 30° rotational and mirror symmetry, 85-facet topology throughout the default grid, original/perturbed ASC roundtrip, optical energy and deterministic optimization. `scripts/validate-bl-m5.js` records reference convergence and a full Fast run in `docs/bl-m5-results.json`, with an importable config and all result reproduction settings. A first strict normal-vector assertion exposed JavaScript negative zero; the table now uses the literal normal `[0, 0, 1]`.

## 2026-09-21 — Cross-chat ASC export audit

At the user's request, read the latest turns of “ASC Fehler analysieren” and inspected its available Round Brilliant and T105 attachments. The latest verified lesson supersedes the earlier wrong symmetry theory: keep the correct symmetry and full index lists; remove `G` cutting-instruction comments for the demonstrated compatibility issue. Confirmed the field grammar against the official GemCad manual, p. 21.

The app's export already has no `G` instruction tails/lines, uses one complete line per tier, emits each first index once and preserves cut-specific symmetry. Added direct structural export regressions, including `n G` / numeric labels, a synthetic oval and fractional angles. Corrected coarse tier-grouping precision (8 decimals -> actual serialized angle/distance precision) and preservation of negative-zero pavilion culet angles. Neither is a reinterpretation or redesign of the supplied BL-M5. Native Gem Cut Studio import is not claimed. See `docs/ASC-REFERENCES.md` for scope and evidence.

Final validation for BL-M5 and the export audit: **51 Node tests and 7 Playwright tests passed** after the export fixes. Both families work through the production server and direct offline `file://` entry point; BL-M5 export and cross-family JSON import are covered. The full build regenerates the committed standalone bundle. Desktop BL-M5 screenshot reviewed, formatting/diff checks passed, and the removed branding was not reintroduced.

## 2026-09-23 — Leonardo image analysis, initial assessment before user clarification

User requested a new Leonardo family from two images, with particular attention to the girdle, or an explanation if reconstruction is not possible. Inspected both supplied views and checked the official maker's description. The diagram shows a pentagonal table and fivefold repetition. A reproducible read-only pixel analysis found 21 crown and 35 pavilion enclosed image regions at four thresholds; that is 56 regions excluding the girdle, while the maker advertises 57 facets. A possible unresolved culet remains a hypothesis, not an added face.

Measured projected profile proportions and apparent edge angles, explicitly not true facet inclinations: crown ~14.4%, girdle ~2.0%, pavilion ~40.1%, total depth ~56.5%, apparent silhouette slopes ~24.1° and ~38.7°. Documented why projected girdle subdivisions cannot establish full facet count, why a smooth circular outline plus straight band lines is not a complete planar-solid definition, and which angle/distance/meetpoint data remain missing.

Created `docs/LEONARDO-ANALYSE.md`, raw measured `docs/leonardo-image-results.json` with source hashes and uncertainty, and `scripts/analyze-leonardo.py` (Pillow/NumPy). Executed the script using the bundled Python runtime. Images were not altered. No production cut, arbitrary optical score, guessed ASC, or fake extra facet was added. A convex fivefold family is possible in principle, but the images do not uniquely specify the requested original geometry. A hypothetical approximation requires clear labeling and remains distinct from a validated reconstruction.

## 2026-09-23 — Leonardo image-fit authorized with a constructed girdle

User clarified that crown/pavilion angles and facet starts take priority and authorized constructing a girdle to match them. Continued the same task with an explicitly labeled image-fit rather than stopping at the original-data ambiguity. `fit-leonardo.py` extracts shared image edges, assigns fivefold groups, solves plane-height equations with documented height/rim priors and writes the exact model data. All 21 crown + 35 pavilion regions correspond to active 3D facets. Median internal-edge deviations are 1.03/1.33 px; p95 deviations 2.97/4.80 px. Sensitivity to edge weights 5/10/20 is recorded separately; angle precision is not claimed from pixels.

Added Leonardo to the cut registry and UI, with 80 explicitly constructed vertical girdle planes at apothem 0.98, variable band thickness, flat table, height-scale optimization parameters, and its own topology version. Default actual band thickness 0.447–3.724% of diameter. The 57-facet marketing count is not used to invent an extra facet or infer a polygon count; 56 plus one curved band is a possible but unconfirmed convention. The prototype has 136 computational facets. ASC declares rotation-only `y 5 n` and explicitly labels the approximation. Export roundtrips, all default grid geometries, image-region correspondence, energy conservation and live/final leader stability are checked. The existing scintillation proxy's dependence on the chosen girdle subdivision is documented; no measured real-world performance is claimed.

Generated a reference ASC, vector projections and reference optical report. Images remain unchanged. The earlier no-configuration assessment above records the intermediate state before authorization; the final app now includes the Leonardo image-fit.

Final checks: 56 Node tests and all 9 browser tests passed. After the angle-list layout adjustment, both Leonardo browser cases were re-run successfully online and offline. Re-running the final fit script reproduced the stored plane data and diagnostics exactly. Production and standalone builds, formatting and diff checks passed. The Leonardo desktop screenshot was reviewed and reconstructed vector views opened for inspection.
