# Leo JR Edition — drei feste Pavillonwinkel

## Verbindliche Geometrie

Die aktuelle Version `leo-jr-three-tier-3-integer-orbits-1` konstruiert genau **21 Kronen-, 35 Pavillon- und 20 Rundistenfacetten**. Der Pavillon hat genau drei gemeinsame Neigungen und drei gemeinsame Ebenenabstände:

| Gruppe                | Anzahl | Standardneigung | Indexpositionen auf Rad 80            |
| --------------------- | ------ | --------------- | ------------------------------------- |
| P1 · Basis            | 20     | 40,40°          | 4, 8, 12, …, 80                       |
| P2 · Zwischenfacetten | 10     | 40,15°          | 8, 12, 24, 28, 40, 44, 56, 60, 72, 76 |
| P3 · Spitze           | 5      | 37,90°          | 10, 26, 42, 58, 74                    |
| Rundiste              | 20     | 90°             | identisch zu P1                       |

P1 ist **gleichmäßig in 18°-Schritten** verteilt. P2 besteht aus zwei fünfzähligen Reihen; P3 ist fünfzählig. Nur die Basisreihe und die Rundiste sind zwanzigzählig. Der gesamte Stein besitzt wegen Krone und inneren Pavillongruppen fünfzählige Rotationssymmetrie.

Die Rundiste wird direkt aus den 20 P1-Ebenen an der gemeinsamen Höhe `z₀ = −separation/200` abgeleitet. Sie hat dieselben Indizes und den gemeinsamen Apothem 1. Jede Rundistenfläche besitzt genau eine vollständige untere Anschlusskante an ihrer P1-Facette. P2 und P3 enden innerhalb des Pavillons und dürfen die Rundiste nicht anschneiden. Der Umriss ist ein regelmäßiges 20-Eck, ein facettierter runder Schliff.

## Was geändert wurde

Die bisherigen sieben unabhängig gefitteten Pavillon-Ebenengruppen und ihre unregelmäßig gerundeten Azimute werden für Leo JR nicht mehr verwendet. Die Optimierung hat drei explizite Eingaben `pavilionBase`, `pavilionMiddle`, `pavilionTip`. Jede Eingabe steuert immer ihre gesamte Facettengruppe. Es gibt keine anschließende Einzelkorrektur oder freie Optimierung der Pavillonazimute.

Zulässig sind nur `P1 > P2 > P3` mit mindestens 0,01° Abstand zwischen benachbarten Gruppen. Der Generator verwirft ungültige oder degenerierte Geometrien vor der Strahlenrechnung. Gemeinsame Winkel, feste Indizes und Gruppengrößen gelten für Vorschau, Screening, Verifikation und Export gleichermaßen. Im ASC entstehen genau drei Pavillonzeilen, beschriftet mit P1, P2 und P3; Neigungswinkel dürfen Dezimalstellen haben, Indexpositionen nicht.

Die Tafel bleibt bei 0°. Die Krone wird weiterhin aus dem vorhandenen Bildfit abgeleitet und ganzzahlig indexiert. Die eigenständige ältere Familie „Leonardo · Bildentwurf“ bleibt eine separate Rekonstruktion und wird durch diese Änderung an Leo JR nicht umdefiniert.

## Bildgrundlage und Grenzen

Die aktuelle Vorlage `leonardo-view.png` hat SHA-256 `524b9f8374d5227725d1aae23be9fe0e3b702fc5174a4f6946e947f3b2e02175`. Dieser Hash stimmt exakt mit der Quelle des gespeicherten [Bildfits](leonardo-fit-results.json) überein.

Die Dreigruppenstruktur und die regelmäßige Basis sind nun ausdrückliche Konstruktionsvorgaben des Nutzers. Die 20/10/5-Zuordnung folgt der bisherigen Segmentierung: äußere Gruppen `pavilion0/1/2/4`, mittlere Gruppen `pavilion3/5`, zentrale Gruppe `pavilion6`. Die gerundeten Startneigungen orientieren sich an deren früheren Fitneigungen. Das Bild enthält keine gemessenen Winkelangaben; die Werte sind deshalb keine bestätigten Original-Schnittdaten. Die alten Pixelresiduen des freien Sieben-Gruppen-Fits sind keine Genauigkeitsangabe für diese neue, stärker eingeschränkte Konstruktion.

## Gekoppelte Ebenenabstände

Die charakteristischen radialen Übergänge werden aus den gespeicherten Bildebenen berechnet, nicht unabhängig je Facette optimiert:

- P1/P2: Mittelwert der radialen Schnitte der Referenzpaare 3/2 und 5/4, **0,7125980416**.
- P2/P3: Mittelwert der radialen Schnitte der Referenzpaare 6/3 und 6/5, **0,4650335547**.

Ein radialer Schnitt wird auf dem Strahl in Richtung der inneren Facettennormalen bestimmt. Für zwei Höhenfunktionen `z = s·r + c` ist die Schnittposition `(c_inner − c_outer)/(s_outer − s_inner)`. Die gegenüberliegenden fünfzähligen Wiederholungen ergeben dieselben Werte. Diese Übergänge erben die Unsicherheit des Bildfits.

Mit `b = tan(P1)`, `m = tan(P2)`, `t = tan(P3)` und den Übergängen `r₁₂`, `r₂₃` werden die Tiefenachsenabschnitte so gesetzt:

- `H₁ = b − z₀`
- `H₂ = H₁ − (b − m)·r₁₂`
- `H₃ = H₂ − (m·cos(9°) − t)·r₂₃`

Der Faktor `cos(9°)` berücksichtigt, dass die Richtung der Spitzenfacette genau zwischen den beiden benachbarten P2-Richtungen liegt. Der Abstand einer Pavillonebene ist `d = H·cos(P)`, ihre Normale `(sin(P)·cos(A), sin(P)·sin(A), −cos(P))`. So bleiben Winkel und Abstand innerhalb jeder Gruppe exakt gemeinsam, während die Übergänge bei der Optimierung gekoppelt angepasst werden.

## Suchbereich und Reproduktion

Standardbereiche: P1 40,2–40,6°, P2 39,95–40,15°, P3 37,7–38,1°, Kronenskalierung 98–102 %, Abstand 7–8 % des Bezugsradius. Das reguläre Raster hat 162 Kombinationen. Der Präzisionsschritt optimiert ausschließlich die drei Gruppenwinkel in 0,01°-Schritten. Auch größere benutzerdefinierte Bereiche müssen die Geometrieprüfungen bestehen.

Alle unterstützten Indexräder sind Vielfache von 40; Rad 40, 80 und 160 werden explizit über das Standardraster geprüft. Basispositionen skalieren exakt mit der Zahnzahl und bleiben ganzzahlig und gleichmäßig. Alte Leo-JR-Konfigurationen mit `pavilionScale` müssen mit den neuen P1/P2/P3-Eingaben neu aufgesetzt werden. Alte Scores werden nicht übernommen.

- [Aktuelle ASC](Leo-JR-Edition.asc)
- [Geometrie, Übergänge und neu berechnete Optik](leo-jr-reference-results.json)
- [Drei berechnete Ansichten](Leo-JR-Edition-projections.svg)
- Erzeugen: `node scripts/validate-leo-jr.js`
- Testen: `npm test` und `npm run test:browser -- tests/browser/leoJR.spec.js`

Die Tests kontrollieren die tatsächlichen Normalen, gemeinsamen Abstände, ganzzahligen und regelmäßigen Positionen, 20/10/5-Facettenzahlen, gemeinsame Rundistenkanten, ASC-Roundtrip, Energiebilanz und optimierte Ergebnisse. Die optischen Bewertungsmodelle einschließlich des Facettenzahl-Scintillation-Proxys bleiben unverändert. Ein manueller Import in Gem Cut Studio wurde nicht durchgeführt.
