# Leonardo – Bildanalyse und Rekonstruktionsgrenzen

**Aktueller Stand:** Die App verwendet seit der Indexkorrektur eine ganzzahlige Ableitung dieses Fits. Die nachfolgenden Fitwinkel, Bildresiduen und Herstellungsgrenzen beschreiben die ursprüngliche kontinuierliche Rekonstruktion. Für die aktuellen simulierten/exportierten Ebenen gilt [INTEGER-INDICES.md](INTEGER-INDICES.md); Referenz-ASC und numerische Referenzauswertung wurden neu erzeugt.

Stand: 23.09.2026. Gewünschte neue Schlifffamilie: **Leonardo**.

**Ergebnis nach der Nutzerpräzisierung:** Die App enthält jetzt **Leonardo · Bildentwurf**. Auf Wunsch wird die Rundiste passend zu den rekonstruierbaren Kronen-/Pavillonflächen konstruiert. Der Entwurf hat 21 Kronen- und 35 Pavillonfacetten aus einem numerischen Bild-Fit sowie 80 ausdrücklich angenommene Rundistenfacetten. Es ist eine geschlossene, berechenbare Geometrie, aber keine bestätigte Rekonstruktion der Original-Schnittdaten. Winkel und Ansätze sind aus Linienlage und geschätzten Höhen abgeleitet. Die frühere Beurteilung „nicht eindeutig rekonstruierbar“ bleibt für das Original richtig; sie verhindert den nun ausdrücklich gewünschten Näherungsentwurf nicht.

[Konstruierte Ansichten](Leonardo-projections.svg) · [ASC des Ausgangsentwurfs](Leonardo-image-fit.asc) · [Geometrie und Referenzrechnung](leonardo-reference-results.json)

## Quellen und Verfahren

Analysiert wurden die beiden vom Nutzer gelieferten Bilder:

- `leonardo-sideview.png`: 1921 × 534 Pixel, getrennte Kronen-, Seiten- und Pavillonansicht. Diese Strichzeichnung ist die Grundlage der Messungen.
- `leonardo-cut Kopie.jpeg`: Übersicht mit einer ähnlichen Strichzeichnung und einem Foto. Das Foto bestätigt einen sternartigen optischen Eindruck, liefert jedoch keine zusätzlichen Facettenkoordinaten. Reflexe im Foto sind keine zuverlässigen Facettengrenzen. Orientierung und Maßstab der kleinen Ansichten sind nicht identisch mit der großen Zeichnung.

Die Dateien werden nicht verändert. SHA-256, Bildgrößen, Flächenmittelpunkte, Schwellenwertkontrollen und Messpunkte stehen in [leonardo-image-results.json](leonardo-image-results.json). Das Skript [analyze-leonardo.py](../scripts/analyze-leonardo.py) benötigt Pillow und NumPy:

```sh
python3 scripts/analyze-leonardo.py diagram.png photo.jpeg docs/leonardo-image-results.json
```

Die Koordinaten sind ausdrücklich an die angehängte große Zeichnung gebunden. Das Skript rekonstruiert keine Facettenebenen. Es zählt zusammenhängende helle Bildregionen innerhalb der Kontur, verwirft den äußeren Hintergrund und Anti-Aliasing-Inseln bis 100 Pixel. Die Zählung bleibt bei vier Helligkeitsschwellen (160, 180, 200, 220) unverändert.

## Krone und Tafel

Die zentrale Tafel ist ein Fünfeck. Um sie wiederholt sich das Muster fünfmal, also in 72°-Sektoren. Eine Drehung des Linienbildes um 72° findet innerhalb einer 3-Pixel-Nachbarschaft für praktisch alle inneren Kronenlinien eine Entsprechung. Das belegt die Symmetrie der Zeichnung, nicht eine Fertigungstoleranz des Steins.

Die Zeichnung enthält **21 geschlossene Kronenregionen**, einschließlich der Tafel: eine zentrale Tafel plus vier weitere Bildregionen je Sektor. Auffällig sind fünf große Dreiecke, deren Spitzen weit nach außen bis an die Rundiste reichen. Die restlichen zehn plus fünf Regionen verbinden die Tafel-/Dreieckskanten mit dem Außenrand. Damit unterscheidet sich der Aufbau vom achtzähligen Round Brilliant und darf nicht durch Umbenennen seiner Parameter erzeugt werden. Die Bezeichnungen „Star“, „Bezel“ oder „Upper Girdle“ sollten erst nach einer bestätigten Schnittfolge fest vergeben werden.

Bei Annahme eines regelmäßigen Fünfecks betragen die ebenen Innenwinkel 108°. Diese Winkel und die 72° Sektorwinkel sind **keine Facettenneigungen**. Die Seitenansicht zeigt eine horizontale Tafel; 0° wäre dafür eine sinnvolle geometrische Vorgabe, liefert aber noch nicht ihre exakte Höhe bzw. ihren Ebenenabstand.

## Pavillon und Facettenzahl

Die Unteransicht enthält **35 geschlossene Bildregionen**, sieben pro wiederholtem Fünfersektor. Die Linien bilden mehrere ineinandergreifende sternartige Reihen, keine einfache Kopie der üblichen acht Pavillonhauptfacetten mit unteren Rundistenfacetten. Die Übereinstimmung der inneren Linien nach 72° Rotation liegt bei ungefähr 99,8% innerhalb der verwendeten 3-Pixel-Nachbarschaft.

Krone plus Pavillon ergeben somit **56 gezeichnete Regionen**, ohne Rundistenband. Die [Herstellerbeschreibung](https://eng.leonardodavincicut.com/diamond) nennt eine pentagonale Tafel und 57 Facetten. Die Differenz ist nicht geklärt. Eine zusätzliche sehr kleine Kalettenfläche könnte die Zählung rechnerisch ergänzen; aus den Bildern ist sie aber nicht nachweisbar. Die Seitenansicht endet zeichnerisch in einer Spitze. Ebenso ist nicht sicher, welche Facetten die Herstellerzählung einschließt. 56 Facetten plus eine durchgehend gekrümmte Rundistenfläche wäre eine weitere mögliche Zählweise für 57 Flächen. Das ist keine nachgewiesene Zählkonvention des Herstellers und insbesondere keine einzelne ebene Rundistenfacette. Der Entwurf weist deshalb seine tatsächlichen 56 optischen und 80 konstruierten Rundistenfacetten getrennt aus.

Die Ebenennormalen, Ebenenabstände, Höhen der inneren Meetpoints und die genaue räumliche Zuordnung zwischen Unter- und Seitenansicht fehlen. Auch die Drehrichtung einer Unteransicht muss beim Zusammenbau berücksichtigt werden. Die optischen Werbeaussagen des Herstellers werden nicht als Zielwerte oder physikalische Nachweise verwendet.

## Besondere Rundiste

Die Draufsichten zeigen einen nahezu kreisförmigen Umriss. Die Seitenansicht zeichnet dagegen ein dünnes Band mit vielen schmalen, vertikal begrenzten Abschnitten. Damit ist eine Übernahme unserer groben 16- bzw. 24-seitigen Rundiste nicht begründet.

Ein horizontaler Scan durch das Band bei Bildzeile 201 ergibt 22 getrennte vertikale Strichgruppen, also 21 sichtbare Zwischenräume. **Das ist keine gesicherte Rundistenfacettenzahl.** Sichtbare und verdeckte Kanten könnten überlagert sein, und die Zeichnung kann vereinfacht sein. Eine Verdopplung auf 42 oder die Wahl von 40, 80 bzw. einer anderen Teilung wäre eine zusätzliche Annahme.

Die unterschiedlichen Abschnittsbreiten im Seitenbild beweisen keine unregelmäßige Teilung im Raum: Bereits eine gleichmäßige Winkelteilung erscheint durch die Projektion zu den Seiten hin schmaler. Es ist nicht festgelegt, ob das Original eine geriebene/gerundete Rundiste, viele planare Rundistenfacetten oder eine andere Mikrofacettierung besitzt. Neigung, Staffelung, Phasenlage und tatsächliche Ober-/Unterkanten sind ebenfalls nicht ausreichend spezifiziert.

Hinzu kommt eine geometrische Grenze wörtlicher Bildübernahme: Eine geneigte Ebene schneidet eine horizontale Ebene entlang einer **Geraden**. Sie kann nicht gleichzeitig einem beliebigen Kreisbogen folgen und an diesem durchgehend dieselbe Höhe halten. Kreisförmige Außenlinien in der Draufsicht und vollkommen gerade horizontale Bandkanten in der Seitenansicht sind daher nicht automatisch eine exakte Beschreibung aller Crown/Girdle-Meetpoints. Eine reale gerundete Rundiste kann dort höhenveränderliche Schnittlinien haben; die Zeichnung zeigt diese nicht zuverlässig. Die App arbeitet derzeit mit konvexen planaren Halbräumen. Eine wirklich gekrümmte Rundiste würde eine ausdrücklich deklarierte Polygonapproximation oder eine Erweiterung der Schnittflächen erfordern.

## Messbare Proportionen und dargestellte Winkel

Manuell gesetzte Mittellinienpunkte der großen Seitenansicht: Rundistenbreite von x=617 bis x=1306, Tafel von x=838 bis x=1083 bei y=95, Rundistenoberkante y=194, Unterkante y=208, Spitze ungefähr (961,484). Die Ableseunsicherheit liegt ungefähr bei ±2 Pixeln pro Koordinate. Es gibt keine Maßangaben, Winkelbeschriftungen oder Zusicherung einer unverzerrten orthografischen Darstellung.

| Größe                     |           Bildmessung | Einordnung                                                     |
| ------------------------- | --------------------: | -------------------------------------------------------------- |
| Projizierte Breite D      |                689 px | Nur Bezugslänge im Seitenbild                                  |
| Kronenhöhe                |       99 px ≈ 14,4% D | Grobe Bildproportion                                           |
| Rundistendicke            |        14 px ≈ 2,0% D | Grobe Bandhöhe, keine gemessene reale Dickenverteilung         |
| Pavillontiefe             |      276 px ≈ 40,1% D | Grobe Bildproportion                                           |
| Gesamthöhe                |      389 px ≈ 56,5% D | Grobe Bildproportion                                           |
| Projizierte Tafelbreite   |      245 px ≈ 35,6% D | Orientierungsabhängige Fünfeckprojektion                       |
| Linke Kronen-Silhouette   |  atan(99/221) ≈ 24,1° | Projizierter Linienwinkel, **kein bestätigter Kronenwinkel**   |
| Linke Pavillon-Silhouette | atan(276/344) ≈ 38,7° | Projizierter Linienwinkel, **kein bestätigter Pavillonwinkel** |

Die Prozentwerte besitzen bereits durch die Punktablesung Unsicherheiten in der Größenordnung von bis zu einem Prozentpunkt; die Winkel ungefähr ein bis zwei Grad. Unbekannte zeichnerische Verzerrungen kommen hinzu. Nachkommastellen im Rohbericht dienen ausschließlich der Nachrechnung.

Warum die Silhouettenwinkel nicht einfach als Schnittwinkel übernommen werden dürfen: Bei einer Ebene `z = a x + b y + c` ist die Neigung zur Horizontalen `atan(sqrt(a²+b²))`. Ein einzelner projizierter Schnitt gibt nur eine Richtungsinformation. Ohne Orientierung, passende 3D-Meetpoints bzw. weitere Constraints ist die andere Komponente nicht festgelegt. Eine sichtbare Polygonkante ist außerdem nicht zwingend die Richtung des stärksten Gefälles ihrer angrenzenden Facette. Ein einzelner „Crown angle“ und „Pavilion angle“ beschreibt diesen mehrreihigen Schliff ohnehin nicht vollständig.

## Für eine belastbare Leonardo-Konfiguration benötigt

Am besten eignet sich eine ASC-/GEM-/CAD-Datei oder eine vollständige Schnittanleitung. Alternativ reichen technische Angaben, die für jede Facettenreihe **Winkel, Azimute/Indexpositionen und Ebenenabstände bzw. eindeutige Meetpoints** festlegen. Zusätzlich benötigt werden:

- Rundistentyp und Teilung, Orientierung zur fünfzähligen Krone, Dicke und etwaige Neigungen;
- Tafelgröße/-höhe und Kalettenform;
- Zuordnung und Orientierung der drei Ansichten sowie die fehlende Facettenzählung.

72° entsprechen auf einem 96er Indexrad 19,2 Teilungen. Ein 96er Rad würde allein für die Fünferteilung bereits gebrochene Indizes benötigen; eine andere Teilung könnte günstiger sein. Daraus folgt aber noch keine vollständige Indexliste für den Schliff. Ein 96er Round-Brilliant-Schema zu übernehmen wäre unbegründet.

Mit diesen Angaben kann die App eine eigene fünfzählige Familie einschließlich der passenden Rundiste erhalten. Ohne sie wäre nur ein offen als **Näherungsentwurf** gekennzeichnetes neues Design möglich. Korrektes Raytracing auf einem erfundenen Netz würde dessen Ähnlichkeit zum Original nicht nachweisen.

## Implementierter Ebenen-Fit und Annahmen

Die zusätzliche Nutzeranweisung priorisiert Winkel und Ansätze von Krone/Pavillon und erlaubt eine synchron dazu konstruierte Rundiste. Dafür wurde ein inverser Ebenen-Fit implementiert, nicht einfach ein Satz vermuteter Standardwinkel eingesetzt.

1. Geschlossene Bildregionen und ihre gemeinsamen Linien werden aus dem Raster bestimmt. Das Skript ordnet jede Region anhand ihrer rotierten Mittelpunkte einer fünfzähligen Gruppe zu.
2. Jede Facette erhält eine Höhenebene `z = a x + b y + c`. Ihre fünf Kopien entstehen durch 72°-Rotation. Die gemeinsame Kante zweier Facetten verlangt gleiche Höhen entlang der beobachteten Linie. Die Linienrichtung wird mittels Hauptkomponentenanalyse bestimmt; zwei Punkte an den 15%- und 85%-Quantilen bilden die Gleichungsbedingungen.
3. Die Kronenhöhe `198/689` und die Pavillontiefe `552/689` in Bezugsradius-Einheiten stammen aus der Seitenbildmessung. Nahe dem gezeichneten Außenkreis werden mittlere Höhen von ungefähr null als **weiche Konstruktionsannahme** gesetzt. Die Tafel wird auf exakt 0° festgelegt; fünf innere Pavillonflächen treffen sich an der Spitze.
4. Ein lineares Least-Squares-System minimiert Höhenabweichungen: gemeinsame Kanten mit Gewicht 10, weiche Randhöhen mit Gewicht 1, Tafel-/Spitzenbedingungen mit Gewicht 1000. Diese Gewichte sind offengelegte Regularisierungsentscheidungen, keine gemessenen Materialkonstanten. Die Tafelnormalen werden anschließend exakt horizontal gesetzt.
5. Die Lösungen werden in normierte Halbräume `n·x ≤ d` umgerechnet. Der bestehende Geometriekern schneidet sie zu einem geschlossenen konvexen Körper. Alle 56 Bildregionen liegen mit ihrem Mittelpunkt unter der jeweils zugeordneten aktiven Facette. Die Randpunkte der Facetten ergeben sich aus wirklichen Ebenenschnitten, nicht aus einer unverbundenen optischen Illustration.

Das Skript [fit-leonardo.py](../scripts/fit-leonardo.py) erzeugt [leonardo-fit-results.json](leonardo-fit-results.json) und die verwendeten Ebenen in `js/cuts/leonardoFit.js`. Beispiel:

```sh
python3 scripts/fit-leonardo.py diagram.png docs/leonardo-fit-results.json js/cuts/leonardoFit.js
```

Der fünfte Kommandozeilenparameter kann für eine Sensitivitätsprüfung das Kantengewicht ändern. [Die Prüfung mit 5, 10 und 20](leonardo-fit-sensitivity-results.json) zeigt insbesondere bei den Kronenwinkeln merkliche Unterschiede. Die Aufteilung ist damit gut gestützt, die Winkel sind aber nicht eindeutig auf Hundertstelgrade aus dem Bild bestimmt. Alternative Gewichtungen sind keine freigegebenen App-Presets und keine statistischen Konfidenzintervalle.

### Abgeleitete Startwinkel

Die Reihenfolge entspricht den Fit-Gruppen in den Rohdaten; kleine Unterschiede spiegeln auch Rasterungenauigkeit wider.

| Bereich  | Fünfergruppen: Neigung zur Horizontalen                             |
| -------- | ------------------------------------------------------------------- |
| Tafel    | exakt 0°                                                            |
| Krone    | 23,665° / 23,665° / 22,288° / 33,380°                               |
| Pavillon | 40,708° / 40,474° / 40,298° / 40,216° / 40,100° / 40,052° / 37,900° |

Die mittlere absolute Linienabweichung wird hier als Median ausgewiesen: ca. 1,03 Pixel an der Krone und 1,33 Pixel am Pavillon. Das 95%-Quantil beträgt ca. 2,97 bzw. 4,80 Pixel; das Maximum ca. 4,01 bzw. 12,15 Pixel. Diese Zahlen betreffen innere gemeinsame Linien der beiden Draufsichten. Sie bewerten weder die frei konstruierte Rundiste noch die Genauigkeit gegenüber einem realen Stein. Eine experimentelle Lichtleistungsvalidierung folgt daraus nicht.

### Konstruierte Rundiste und Parameter

80 vertikale Ebenen bilden das Rundistenband, ausgerichtet auf fünf Wiederholungen. Ihr Abstand zur Achse beträgt 0,98 Bezugsradien: Diese kleine Beschneidung des unsicheren Randes lässt alle 56 inneren Fit-Flächen aktiv und ein offenes Band entstehen. Krone und Pavillon werden um je ±0,02 Bezugseinheiten getrennt. Die Schnittlinien an ihren Rändern bestimmen die tatsächliche Bandhöhe. Am Ausgangsentwurf liegt die Rundistendicke zwischen etwa **0,447% und 3,724%** des Durchmessers; sie wird ausdrücklich nicht als konstant 2% ausgegeben. Das Polygonband ist die genehmigte Konstruktionsannahme, keine aus „57“ abgeleitete Originalteilung.

Im Optimierer sind Kronenhöhen-Skalierung, Pavillontiefen-Skalierung und deren Abstand einstellbar. Die Startwerte 100% / 100% / 4% zeigen den Fit; vertikale Skalierung verändert die Tangenten sämtlicher betroffener Facettenwinkel und hält die Ebene jeder Facette korrekt. Eine unabhängige Winkeländerung sämtlicher elf Reihen würde die bildbasierten Meetpoint-Beziehungen verlassen und ist daher zunächst nicht Teil der Suche. Das Ausgangsdesign hat ungefähr 37,15% maximale Tafelbreite und 57,53% Gesamttiefe; diese Werte gehören zum konstruierten Modell, nicht zum Herstelleroriginal.

Die Default-Geometrie und alle 18 Standard-Rasterkombinationen behalten 136 aktive Facetten und positive Rundistendicke. `y 5 n` im ASC deklariert die konstruktiv exakte Rotationssymmetrie ohne eine aus den Rasterdaten nicht exakt gesicherte Spiegelsymmetrie zu behaupten. 80 ist die Standard-Indexradwahl; die gefitteten Azimute benötigen trotzdem gebrochene Indizes. Der Export schreibt deshalb exakte Indexwerte und kennzeichnet `IMAGE-FIT approximate geometry`.

Der bestehende Scintillation-Wert ist ein Facettenzahl-Proxy. Beim Vergleich verschiedener Schlifffamilien wird er durch die hier angenommene feine Rundiste beeinflusst; ein höherer Gesamtwert belegt daher keine überlegene reale Lichtleistung des Originals. Innerhalb dieser Familie bleibt die Rundistenteilung fest. Raytracing und Energiebilanz beziehen sich ausschließlich auf die tatsächlich konstruierte Geometrie.
