# Ganzzahlige Indexpositionen — 2026-09-23

## Ursache und neue Regel

Die alten Generatoren lieferten freie Facettenazimute. Der ASC-Export schrieb diese unverändert als `Azimut × Indexrad / 360°`. Daher enthielt die gelieferte Datei `Leonardo_Moissanite_72.93_v1.asc` 55 Facetten mit gebrochenen Positionen. Auch geometrisch berechnete Nebenfacetten des Round Brilliant können freie Azimute haben. Ein reines Runden beim Export würde die Simulation ungültig machen.

Alle in der App registrierten Schlifffamilien werden jetzt **vor Vorschau und Strahlenrechnung** auf ganzzahlige Positionen des ausgewählten Indexrads gesetzt. Screening, Verifikation, Vorschau und Export verwenden dieselbe deterministische Konstruktion und dasselbe Rad. Neigungswinkel wie 40,14° bleiben erlaubt. „Ganzzahlig“ gilt für Zahnpositionen, nicht für Azimute in Grad: Beim 80er-Rad beträgt ein Schritt 4,5°.

## Zuordnung und Geometrie

`js/geometry/integerIndex.js` ordnet die verschiedenen Azimutgruppen jeder Steinregion auf dem jeweiligen Symmetriesektor ganzzahligen Zähnen zu. Eine dynamische Optimierung minimiert die Summe der quadrierten Verschiebungen unter den Bedingungen zyklische Reihenfolge, getrennte Positionen und Rotationssymmetrie. Es werden auch benachbarte Zähne geprüft; bloßes unabhängiges Runden könnte nahe Facetten zusammenfallen lassen.

Beispiel für die sieben Pavillongruppen im 16-Zähne-Sektor des 80er-Rads, sortiert nach ASC-Azimut:

| Ausgangsposition ungefähr | Ganzzahlige Position |
| ------------------------- | -------------------- |
| 5,0766                    | 5                    |
| 7,5353                    | 7                    |
| 7,6641                    | 8                    |
| 9,7775                    | 10                   |
| 11,8450                   | 11                   |
| 11,9234                   | 12                   |
| 14,8009                   | 15                   |

Die Wiederholungen folgen in 16er-Schritten. Gem Cut Studio kann die Pavillonpositionen entsprechend seiner Betrachtungsrichtung umgekehrt anzeigen; ganzzahlig bleiben sie in beiden Konventionen.

Die Facettennormalen werden um die Hochachse gedreht; ihr Z-Anteil und damit ihr Neigungswinkel bleiben erhalten. Die neue Ebene läuft durch den bisherigen Polygonmittelpunkt (arithmetisches Mittel seiner Eckpunkte). Dieser Anker ist eine explizite Konstruktionsentscheidung, keine Rückgewinnung unbekannter Originaldaten. Der vollständige Körper wird anschließend neu geschnitten und auf aktive Facetten, Geschlossenheit, Orientierung, Volumen und offene Rundiste geprüft. Ungültige Kandidaten werden verworfen, bevor Strahlen berechnet werden.

Das Indexrad muss zur Rotationssymmetrie passen, z. B. 80 für fünfzählige und 96 für acht- oder zwölfzählige Schliffe. Unpassende oder zu grobe Räder werden mit einem Fehler abgewiesen; es gibt keinen Rückfall auf gebrochene Positionen. Das Rad wird nicht heimlich vergrößert. Die vorgegebenen Suchräume liefern weiterhin gültige Kandidaten; eine willkürliche Erweiterung der Neigungswinkel war deshalb nicht erforderlich. Die optische Optimierung sucht weiterhin in den angegebenen Formparametern; die Zahnzuordnung ist eine deterministische geometrische Anpassung, keine behauptete globale Suche über alle Indexmuster.

## Leo JR Edition: feste Drei-Gruppen-Geometrie

Leo JR erzeugt seine Pavillonebenen inzwischen direkt mit drei gemeinsamen Neigungen: 20 Basis-, 10 Zwischen- und 5 Spitzenfacetten. Die 20 Basisfacetten liegen gleichmäßig in 18°-Schritten; die 20 Rundistenflächen übernehmen exakt dieselben Indexpositionen. Auf Indexrad 80 sind das 4, 8, 12, …, 80. Die Pavillonazimute werden nicht mehr individuell aus dem freien Bildfit gerundet.

Gekoppelte Ebenenabstände halten die Übergänge während der Winkeloptimierung zusammen. Jede Rundistenfläche hat genau eine vollständige Anschlusskante an ihrer Basisfacette. Insgesamt bleiben **21 + 35 + 20 = 76 Facetten**. Aktuelle Herleitung, Parameter und Grenzen stehen in [LEO-JR-EDITION.md](LEO-JR-EDITION.md). Die frühere Ableitung der Rundiste aus vier unregelmäßig verteilten Pavillongruppen ist damit ersetzt.

## Export, alte Ergebnisse und Reproduktion

Der Export akzeptiert nur bereits ganzzahlig konstruierte Ebenen und schreibt Indexpositionen als reine Ganzzahlen. Eine Toleranz von 0,000001 Zahn fängt ausschließlich Gleitkomma-Rechenreste ab. Echte Bruchteile werden als Fehler abgewiesen. Ein zum simulierten Körper abweichendes Export-Rad wird ebenfalls abgelehnt. Die Winkel- und Abstandspräzision bleibt bei 10 bzw. 12 Dezimalstellen.

Geometrieversionen tragen den Zusatz `integer-orbits-1`; die Suchversion lautet `verified-integer-archive-3`. Alte JSON-Runs können als Einstellungen geladen werden, ihre alten Ergebnisse werden nicht weiterverwendet. Die App fordert eine neue Berechnung. Unquantisierte Quellgeneratoren bleiben als interne Bildfit-/Analysegrundlage vorhanden; App und Referenzskripte verwenden die registrierten ganzzahligen Generatoren.

Die gelieferte ASC wurde als Regression gespeichert und separat korrigiert:

- [Korrigierte Leonardo-ASC für Indexrad 80](Leonardo-Moissanite-integer80.asc)
- [Neue Geometrie- und Optikauswertung](integer-index-reference.json)
- Reproduktion: `node scripts/validate-integer-indices.js`

Alle 136 Facetten und die ursprünglichen Neigungswinkel bleiben in dieser Korrektur erhalten; gebrochene Indizes: 55 → 0. Global der neuen unabhängigen Simulation: 72,667836 bei Moissanite, Seed 1919, 3200 Face-up-, 2200 Tilt- und 800 Spektralstrahlen. Der alte Dateiname/Score 72,93 wurde nicht übertragen. Das ist keine Validierung gegen die optische Auswertung von Gem Cut Studio. Ein manueller Import dort wurde nicht durchgeführt.

## Prüfungen

- Ganzzahlige Positionen über alle Standardraster der vier registrierten Familien; unbrauchbare Kandidaten dürfen nicht simuliert werden.
- Export enthält ausschließlich ganzzahlige Index-Tokens; Rekonstruktion aus ASC erhält die simulierten Ebenen und das Volumen.
- Die korrigierte Benutzerdatei erhält alle Facetten und Neigungen; die aus ASC rekonstruierte Geometrie liefert dieselbe optische Auswertung innerhalb numerischer Toleranz.
- Leo-JR-Anschlüsse, Rotationssymmetrie und Rundheit über den Standardparameterbereich.
- Verifizierte Optimierungsergebnisse lassen sich aus gespeicherten Parametern und Indexrad identisch neu simulieren.
- Browserprüfungen der heruntergeladenen ASC-Dateien für sämtliche Familien über HTTP und offline.
