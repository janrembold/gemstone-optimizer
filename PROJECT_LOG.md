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
