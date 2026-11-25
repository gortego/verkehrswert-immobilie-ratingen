/*
 * Minimal DE/EN/ES UI translation for the Ratingen Verkehrswert wizard.
 *
 * German valuation terms (Verkehrswert, Sachwert, Bodenrichtwert, NHK, RND,
 * GND, ImmoWertV, Sachwertfaktor, Wohnungsrecht, ...) are deliberately kept
 * in all languages because they are defined legal/technical terms.
 *
 * No dependencies; works from file://.
 */
(function (global) {
  "use strict";

  var LANG_KEY = "vw-ratingen-lang";
  var current = "de";
  var nodeOriginals = new WeakMap();   // Text node -> original German text
  var attrOriginals = new WeakMap();   // Element -> { attrName: original value }

  // Exact-string dictionary: German UI text -> English UI text.
  // Keys that should stay German are simply omitted.
  var DICT = {
    /* top bar / global actions */
    "Geführte Ermittlung des Sachwerts nach ImmoWertV und Grundstücksmarktbericht": "Guided determination of the Sachwert under ImmoWertV and the Grundstücksmarktbericht",
    "☾ Dunkel": "☾ Dark",
    "☀ Hell": "☀ Light",
    "Zu dunklem Design wechseln": "Switch to dark theme",
    "Zu hellem Design wechseln": "Switch to light theme",
    "Eingaben speichern": "Save inputs",
    "Eingaben laden": "Load inputs",
    "Zurücksetzen": "Reset",
    "Drucken / PDF": "Print / PDF",
    "PDF-Bericht": "PDF report",
    "PDF-Bericht erstellt.": "PDF report created.",
    "PDF konnte nicht erstellt werden.": "PDF could not be created.",
    "Eingaben als JSON gespeichert.": "Inputs saved as JSON.",
    "Eingaben geladen.": "Inputs loaded.",
    "Datei konnte nicht geladen werden.": "File could not be loaded.",
    "Datei konnte nicht gelesen werden.": "File could not be read.",
    "Die Datei ist kein gültiger Eingaben-Export dieses Rechners.": "This file is not a valid input export from this tool.",
    "Eingaben zurücksetzen": "Reset inputs",
    "Alle Eingaben wirklich zurücksetzen?": "Reset all inputs?",
    "Alle eingegebenen Objektdaten und Berechnungswerte werden auf die Standardwerte zurückgesetzt. Ihr gespeicherter Eingabestand wird dabei überschrieben. Design und Sprache bleiben erhalten.": "All entered object data and calculation values will be reset to the defaults. Your saved input state will be overwritten. Theme and language are kept.",
    "Abbrechen": "Cancel",

    /* sidebar */
    "Schritte": "Steps",
    "Objekt & Stichtag": "Object & valuation date",
    "Flächen & Boden": "Areas & land",
    "Gebäude & NHK": "Building & NHK",
    "Alter & RND": "Age & RND",
    "Marktanpassung": "Market adaptation",
    "Besonderheiten": "Special features",
    "Ergebnis": "Result",
    "Live-Ergebnis": "Live result",
    "Faktor": "Factor",
    "Änderungen in allen Schritten werden sofort neu berechnet.": "Changes in any step are recalculated immediately.",
    "Beispiel laden": "Load example",
    "Beispiel (anonymisiert) laden": "Load example (anonymised)",
    "Beispiel auswählen": "Select example",
    "Beispiel geladen.": "Example loaded.",
    "Reihenmittelhaus (anonymisiert)": "Mid-terrace house (anonymised)",
    "Reihenendhaus (anonymisiert)": "End-terrace house (anonymised)",
    "Doppelhaushälfte (anonymisiert)": "Semi-detached house (anonymised)",
    "Mehrfamilienhaus (anonymisiert, manueller Faktor)": "Multi-family house (anonymised, manual factor)",
    "Adresse und Stichtag sind anonymisiert; die Rechenwerte bleiben erhalten.": "Address and valuation date are anonymised; the calculation values are retained.",
    "Jahr, Ortsteil, Bodenrichtwertzone, Gemarkung und Flur werden mitgeladen.": "Year, Ortsteil, Bodenrichtwertzone, Gemarkung and Flur are loaded as well.",
    "Hilfsmittel": "Resources",
    "Marktbericht 2026 (PDF) ↗": "Grundstücksmarktbericht 2026 (PDF) ↗",

    /* shared guide wording */
    "Was wird hier gefragt?": "What is asked here?",
    "Auszug aus BORIS/Open.NRW:": "Extract from BORIS/Open.NRW:",
    "Auszug aus Sachwert und SW-RL:": "Extract from Sachwert and SW-RL:",
    "Auszug zur RND:": "Extract on RND:",
    "Auszug aus dem Marktbericht:": "Extract from the Grundstücksmarktbericht:",
    "Auszug aus der Sachwertrichtlinie:": "Extract from the Sachwertrichtlinie:",
    "Grundlage:": "Basis:",
    "Quellen:": "Sources:",
    "Flächen prüfen:": "Check areas:",
    "Grundlagen:": "Fundamentals:",
    "Verständnishilfe:": "Explanation:",
    "Datenquelle:": "Data source:",
    "Abgrenzung:": "Delimitation:",
    "Vergleichswert prüfen:": "Check comparison value:",
    "Hinweis zum Beispiel:": "Note on the example:",

    /* step 1 */
    "Objekt und Wertermittlungsstichtag": "Object and Wertermittlungsstichtag",
    "Zuerst wird der Bewertungsgegenstand und der Zeitpunkt festgelegt, auf den sich alle Angaben beziehen.": "First, the valuation object and the date to which all inputs refer are defined.",
    "Straße, PLZ und Ort orientieren nur. Die eindeutige Parzelle wird in Schritt 2 erfasst. Der Stichtag ist nicht das heutige Datum: Er bestimmt Gebäudealter, Baupreisindex und maßgebliche Marktverhältnisse.": "Street, postcode and city are for orientation only. The exact parcel is recorded in step 2. The Stichtag is not today's date: it determines building age, Baupreisindex and the relevant market conditions.",
    "Der Verkehrswert gilt immer für einen bestimmten Zeitpunkt – den Wertermittlungsstichtag. Zustand und Marktverhältnisse sind auf diesen Tag bezogen.": "The Verkehrswert always refers to a specific point in time – the Wertermittlungsstichtag. Condition and market conditions relate to that day.",
    "Objektangaben": "Object details",
    "Straße und Hausnummer": "Street and house number",
    "Postleitzahl": "Postcode",
    "Ort": "City",
    "Maßgeblich für Gebäudealter, Baupreisindex und Marktverhältnisse.": "Relevant for building age, Baupreisindex and market conditions.",
    "Datum des Gutachtens / Berichts": "Date of the report",
    "Bemerkungen / Beobachtungen": "Comments / observations",
    "z. B. besondere Lage, Zustand, ergänzende Unterlagen": "e.g. special location, condition, additional documents",
    "Freitext für Hinweise, die keinem Zahlenfeld zugeordnet sind. Der Text erscheint auch im PDF-Bericht.": "Free text for notes that do not belong to a numeric field. The text is also included in the PDF report.",
    "Warum der Stichtag wichtig ist:": "Why the Stichtag matters:",
    "Das Gebäudealter ergibt sich aus Stichtag minus Baujahr – nicht aus dem aktuellen Kalenderjahr. Im Beispiel Gutachten wird der Stichtag an mehreren Stellen genannt; hier wird der ausdrücklich eingegebene Wert verwendet.": "Building age is Stichtag minus year of construction – not the current calendar year. In the example report the Stichtag is mentioned several times; here the explicitly entered value is used.",

    /* step 2 */
    "Grundstück und Bodenwert": "Land and land value",
    "Der Bodenwert wird aus dem Bodenrichtwert und der maßgeblichen Grundstücksfläche abgeleitet.": "The land value is derived from the Bodenrichtwert and the relevant land area.",
    "Zuerst wird das Grundstück über Gemarkung, Flur und Flurstück eindeutig benannt. Der Bodenrichtwert ist ein durchschnittlicher Euro-pro-m²-Wert für ein typisches unbebautes Grundstück einer Zone – nicht der Verkehrswert. Prüfen Sie immer Stichtag und Zonennummer. Die Fläche stammt aus dem Liegenschaftskataster; bei Übertiefe wird nur der zonentypische Anteil voll bewertet.": "The land is first identified by Gemarkung, Flur and Flurstück. The Bodenrichtwert is an average euro-per-m² value for a typical undeveloped plot in a zone – not the Verkehrswert. Always check the Stichtag and zone number. The area comes from the Liegenschaftskataster; for Übertiefe only the zone-typical share is valued in full.",
    "Ein Bodenrichtwert ist ein vorwiegend aus Kaufpreisen ermittelter durchschnittlicher Bodenwert je Quadratmeter für ein Gebiet mit im Wesentlichen gleichen wertbestimmenden Merkmalen.": "A Bodenrichtwert is an average land value per square metre, derived mainly from purchase prices, for an area with essentially the same value-determining characteristics.",
    "Grundstücksidentifikation": "Land identification",
    "Gemarkung": "Gemarkung",
    "Flur": "Flur",
    "Flurstück": "Flurstück",
    "Diese Felder dienen der Dokumentation. Der Offline-Auszug enthält keine Flurstücksgeometrie und kann daher keine Zone automatisch zuordnen. Ortsteil = Stadtteil, PLZ = Postleitzahl, WNUM = Nummer der Bodenrichtwertzone in BORISplus.NRW. Die passende Zone bitte dort am Flurstück ablesen oder unten über Ortsteil/PLZ eingrenzen.": "These fields serve documentation only. The offline extract contains no Flurstück geometry and therefore cannot assign a zone automatically. Ortsteil = district, PLZ = postcode, WNUM = number of the Bodenrichtwert zone in BORISplus.NRW. Please read the matching zone there for your Flurstück or narrow it down below via district/postcode.",
    "BORIS-Offline-Auswahl (Ratingen)": "BORIS offline extract (Ratingen)",
    "Jahr": "Year",
    "Suche (Ortsteil, PLZ)": "Search (district, postcode)",
    "Die Auswahl richtet sich nach dem gewählten Jahr. Die WNUM steht in der Zonenliste.": "The options depend on the selected year. The WNUM is shown in the zone list.",
    "Auswahl aus dem BORIS-Auszug oder eigene Eingabe möglich.": "Choose from the BORIS extract or enter your own value.",
    "Flur und Flurstück bitte aus TIM-Online übernehmen; der Offline-Auszug enthält keine Flurstücksdaten.": "Take Flur and Flurstück from TIM-Online; the offline extract contains no parcel data.",
    "Alle Orte": "All locations",
    "Übersicht der Richtwertzonen": "Overview of Bodenrichtwert zones",
    "Übersicht der Bodenrichtwertzonen": "Overview of Bodenrichtwert zones",
    "niedriger BRW": "low BRW",
    "hoher BRW": "high BRW",
    "Die Punkte zeigen die Lage der Bodenrichtwertnummer, nicht die Zonengrenzen. Punkte anklicken, um eine Zone zu übernehmen. Bitte die Wahl im amtlichen System bestätigen:": "The points mark the location of the Bodenrichtwertnummer, not the zone boundaries. Click a point to select a zone. Please confirm the choice in the official system:",
    "In BORISplus.NRW am Flurstück bestätigen ↗": "Confirm at the Flurstück in BORISplus.NRW ↗",
    " Zonen · ": " zones · ",
    "Keine Zonen für diese Auswahl.": "No zones for this selection.",
    "Was ist die WNUM und wie finde ich sie?": "What is the WNUM and how do I find it?",
    "WNUM ist die amtliche Bodenrichtwertnummer („Nummer des Bodenrichtwertes in der Gemeinde gemäß Landesschlüssel“), keine Flurstücksnummer.": "WNUM is the official Bodenrichtwertnummer (\"Nummer des Bodenrichtwertes in der Gemeinde gemäß Landesschlüssel\"); it is not a Flurstück number.",
    "In BORISplus.NRW das Grundstück in der Karte anklicken und in den Detailinformationen unter „Lage und Wert“ die Bodenrichtwertnummer ablesen.": "In BORISplus.NRW, click the property on the map and read the Bodenrichtwertnummer in the detail panel under \"Lage und Wert\".",
    "Stichtag und Bodenrichtwert notieren, hier das passende Jahr wählen und in der Zonenliste die WNUM suchen.": "Note the Stichtag and Bodenrichtwert, select the matching year here, and find the WNUM in the zone list.",
    "Ändern sich Geometrie oder Merkmale einer Zone, erhält sie eine neue WNUM; die alte Nummer wird historisch.": "If a zone's geometry or attributes change, it receives a new WNUM; the old number becomes historic.",
    "Richtwertzone": "Bodenrichtwert zone",
    "Keine Zone ausgewählt.": "No zone selected.",
    "BRW der ausgewählten Zone": "Bodenrichtwert of the selected zone",
    "Wert übernehmen": "Apply value",
    "Manuell eingeben": "Enter manually",
    "Ortsteil, PLZ": "Ortsteil, PLZ",
    "Marktbericht": "Grundstücksmarktbericht",
    "Marktbericht auswählen": "Select Grundstücksmarktbericht",
    "Hintergrundkarte: ": "Background map: ",
    "© OpenStreetMap-Mitwirkende": "© OpenStreetMap contributors",
    " (ODbL). Die Punkte zeigen die Lage der Bodenrichtwertnummer – keine amtlichen Zonengrenzen. Punkt anklicken, um Ortsteil, PLZ, Zone und BRW automatisch zu übernehmen. Bitte die Wahl im amtlichen System bestätigen: ": " (ODbL). The points show the location of the Bodenrichtwertnummer – not official zone boundaries. Click a point to apply Ortsteil, PLZ, zone and BRW automatically. Please confirm the choice in the official system: ",
    "(ODbL). Die Punkte zeigen die Lage der Bodenrichtwertnummer – keine amtlichen Zonengrenzen. Punkt anklicken, um Ortsteil, PLZ, Zone und BRW automatisch zu übernehmen. Bitte die Wahl im amtlichen System bestätigen:": "(ODbL). The points show the location of the Bodenrichtwertnummer – not official zone boundaries. Click a point to apply Ortsteil, PLZ, zone and BRW automatically. Please confirm the choice in the official system:",
    "Punkt anklicken, um Ortsteil, PLZ, Zone und BRW automatisch zu übernehmen.": "Click a point to apply Ortsteil, PLZ, zone and BRW automatically.",
    "Bei Auswahl eines Ortsteils wird die Karte vergrößert.": "Selecting an Ortsteil zooms the map.",
    "Zone oder Punkt auswählen: Der BRW wird sofort übernommen und kann jederzeit im Feld „Bodenrichtwert“ manuell überschrieben werden.": "Select a zone or point: the BRW is applied immediately and can be overwritten manually in the Bodenrichtwert field at any time.",
    "Bitte zuerst eine Richtwertzone auswählen – der BRW wird automatisch übernommen.": "Please first select a Bodenrichtwert zone – the BRW is applied automatically.",
    "Manuell eingegebener Wert – keine Entwicklung aus BORIS verfügbar.": "Manually entered value – no BORIS history available.",
    "Manueller Wert – keine BORIS-Zeitreihe.": "Manual value – no BORIS time series.",
    "Für diese Zone liegen keine Stichtage im Offline-Auszug vor.": "No valuation dates for this zone in the offline extract.",
    "Keine Daten für diese Zone.": "No data for this zone.",
    " Durchgezogene Linie = bisheriger Trend; Steigung ": " Solid line = past trend; slope ",
    " pro Jahr. Gestrichelt: Prognose ": " per year. Dashed: forecast ",
    " (lineare Fortschreibung, kein amtlicher Wert, nicht in der Berechnung verwendet).": " (linear extrapolation, not an official value and not used in the calculation).",
    "Prognose": "Forecast",
    " (Prognose)": " (forecast)",
    "Manueller Wert – keine BORIS-Zone ausgewählt.": "Manual value – no BORIS zone selected.",
    "Entwicklung des Bodenrichtwerts": "Bodenrichtwert development",
    "Wie wird die Prognose berechnet?": "How is the forecast calculated?",
    "Die Prognose ist eine lineare Fortschreibung der im Offline-Auszug vorhandenen Bodenrichtwerte derselben WNUM. Über alle verfügbaren Stichtage wird eine Ausgleichsgerade nach der Methode der kleinsten Quadrate gelegt; das Prognosejahr ist der letzte Stichtag plus ein Jahr.": "The forecast is a linear continuation of the Bodenrichtwerte available in the offline extract for the same WNUM. A least-squares straight line is fitted through all available Stichtage; the forecast year is the last Stichtag plus one year.",
    "Rechenweg: BRW(Prognose) = Mittelwert der BRW + Steigung × (Prognosejahr − Mitteljahr). Das Ergebnis wird auf ganze €/m² gerundet und auf den Bereich 0 bis zum Zweifachen des höchsten beobachteten BRW begrenzt. Die Prognose ist kein amtlicher Bodenrichtwert, wird nicht in der Wertermittlung verwendet und ersetzt nicht die aktuelle BORISplus.NRW-Auskunft.": "Calculation: BRW(forecast) = mean BRW + slope × (forecast year − mean year). The result is rounded to whole €/m² and limited to the range 0 to twice the highest observed BRW. The forecast is not an official Bodenrichtwert, is not used in the valuation and does not replace the current BORISplus.NRW information.",
    "Bitte zuerst eine Richtwertzone aus der Offline-Auswahl übernehmen.": "Please first apply a Bodenrichtwert zone from the offline extract.",
    "Stichtag": "Valuation date",
    "Änderung": "Change",
    "Bodenrichtwert": "Bodenrichtwert",
    "Lageart / Nutzung": "Location type / use",
    "manuell überschrieben": "manually overwritten",
    "Die Vorgaben sind gebietstypische Durchschnitte. Für das konkrete Flurstück bitte den BRW in BORISplus.NRW prüfen.": "The presets are area-typical averages. For the specific Flurstück please check the Bodenrichtwert in BORISplus.NRW.",
    "Zu-/Abschlag für mikrolage und Grundstücksbeschaffenheit (%)": "Adjustment for micro-location and land characteristics (%)",
    "Positiv für günstigere, negativ für ungünstigere Verhältnisse gegenüber dem Richtwertgrundstück.": "Positive for more favourable, negative for less favourable conditions compared with the reference plot.",
    "Flächen und Übertiefe": "Areas and Übertiefe",
    "Marktbericht 2026, Übertiefe ↗": "Grundstücksmarktbericht 2026, Übertiefe ↗",
    "Wie werden Fläche und Übertiefe angewendet?": "How are area and Übertiefe applied?",
    "Der Bodenrichtwert ist ein €/m²-Wert für ein zonentypisch geschnittenes Grundstück. Die Fläche bis zur zonentypischen Tiefe wird voll berücksichtigt. Nur der Teil, der über diese Tiefe hinausgeht, wird mit einem Koeffizienten aus der Tabelle gewichtet.": "The Bodenrichtwert is a €/m² value for a plot with the zone-typical shape. The area up to the zone-typical depth is counted in full. Only the part beyond that depth is weighted with a coefficient from the table.",
    "Tragen Sie in „Amtliche Grundstücksfläche“ die Gesamtfläche aus TIM-Online ein. „Fläche bis zur zonentypischen Tiefe“ ist der vordere Anteil; „Fläche darüber hinaus“ der hintere Anteil. Beide Flächen zusammen sollten die amtliche Gesamtfläche ergeben.": "Enter the total area from TIM-Online in “Official land area”. “Area up to the zone-typical depth” is the front part; “Area beyond that” is the rear part. Together the two areas should equal the official total area.",
    "Die Übertiefe in Metern ist die Überschreitung der zonentypischen Tiefe. Der Rechner verwendet: anrechenbare Fläche = Fläche bis zur zonentypischen Tiefe + Fläche darüber hinaus × Koeffizient; Bodenwert = lageangepasster BRW × anrechenbare Fläche.": "The Übertiefe in metres is the amount by which the plot depth exceeds the zone-typical depth. The tool uses: assessable area = area up to the zone-typical depth + area beyond that × coefficient; land value = location-adjusted BRW × assessable area.",
    "Beispiel: 600 m² gesamt, davon 400 m² bis zur zonentypischen Tiefe und 200 m² dahinter; Übertiefe 10 m → Koeffizient 0,40. Anrechenbar = 400 + 200 × 0,40 = 480 m². Bei BRW 790 €/m² ergibt das 379.200 € vor Lageanpassung.": "Example: 600 m² in total, of which 400 m² are up to the zone-typical depth and 200 m² beyond it; Übertiefe 10 m → coefficient 0.40. Assessable area = 400 + 200 × 0.40 = 480 m². At a BRW of 790 €/m² this gives 379,200 € before location adjustment.",
    "Keine Übertiefe bekannt? Gesamtfläche in das erste Feld, die anderen Flächenfelder und die Übertiefe auf 0 setzen. Dann wird die volle amtliche Fläche angesetzt. Bei ungewöhnlichen Grundrissen oder sehr großen Tiefen ist die sachverständige Würdigung maßgeblich.": "No Übertiefe known? Enter the total area in the first field and set the other area fields and the Übertiefe to 0. The full official area is then used. For unusual plot shapes or very large depths, expert judgement is decisive.",
    "Amtliche Grundstücksfläche (m²)": "Official land area (m²)",
    "Gesamtfläche laut Liegenschaftskataster, nicht die BGF des Gebäudes.": "Total area according to the Liegenschaftskataster, not the BGF of the building.",
    "Fläche bis zur zonentypischen Tiefe (m²)": "Area up to the zone-typical depth (m²)",
    "Vorderer Anteil bis zur zonentypischen Tiefe. Ohne Übertiefe = Gesamtfläche.": "Front part up to the zone-typical depth. Without Übertiefe = total area.",
    "Fläche darüber hinaus (m²)": "Area beyond that (m²)",
    "Hinterer Anteil; zusammen mit dem vorderen Anteil = amtliche Fläche.": "Rear part; together with the front part = official area.",
    "Übertiefe (m)": "Übertiefe (m)",
    "Überschreitung der zonentypischen Tiefe in Metern; 0, wenn keine Übertiefe vorliegt.": "Amount by which the zone-typical depth is exceeded, in metres; 0 if there is no Übertiefe.",
    "Koeffizient": "Coefficient",
    "Summe der Flächenfelder: {parts} m² · amtliche Fläche: {total} m²": "Sum of area fields: {parts} m² · official area: {total} m²",
    "stimmt überein": "matches",
    "Differenz {diff} m² bitte prüfen": "Difference {diff} m² – please check",
    "Berechneter Bodenwert": "Calculated land value",

    /* step 3 */
    "Gebäude und Normalherstellungskosten": "Building and Normalherstellungskosten",
    "Gebäudetyp, Bruttogrundfläche und Ausstattungsstufe bestimmen den Kostenkennwert nach NHK 2010.": "Building type, Bruttogrundfläche and Ausstattungsstufe determine the cost figure under NHK 2010.",
    "Hier werden die Kosten eines vergleichbaren Neubaus ermittelt. Die Bruttogrundfläche nach DIN 277 ist der Bezugsmaßstab. Die Stufen 1 bis 5 beschreiben die Ausstattung; neun Gewerke werden zu einer gewichteten Gesamtstufe verrechnet. Die Regler zeigen für jede Stufe eine kurze Bedeutung und ein praktisches Beispiel. Bauteile außerhalb der BGF, Baupreisindex, Baunebenkosten und Außenanlagen kommen anschließend hinzu.": "Here the cost of a comparable new building is determined. The Bruttogrundfläche under DIN 277 is the reference measure. Levels 1 to 5 describe the fittings; nine trades are combined into a weighted overall level. The sliders show a short meaning and a practical example for each level. Components outside the BGF, Baupreisindex, Baunebenkosten and Außenanlagen are added afterwards.",
    "Der Zeitwert der baulichen Anlagen ergibt sich aus den Herstellungskosten abzüglich der Alterswertminderung. Der Kostenkennwert richtet sich nach Gebäudeart und Ausstattungsstufe.": "The time value of the structural installations is the Herstellungskosten less Alterswertminderung. The cost figure depends on building type and Ausstattungsstufe.",
    "Gebäudedaten": "Building data",
    "Gebäudetyp (NHK 2010)": "Building type (NHK 2010)",
    "Freistehendes Einfamilienhaus: allseitig freistehendes Wohnhaus mit einer Wohneinheit. Der Kostenkennwert gilt für die Bruttogrundfläche; bei zwei Wohneinheiten ist die Korrektur unten zu prüfen.": "Detached single-family house: a free-standing dwelling with one residential unit. The cost figure refers to the Bruttogrundfläche; for two residential units, check the correction below.",
    "Doppel- und Reihenendhaus: eine Wohneinheit mit einer gemeinsamen Wand zur Nachbarbebauung (Doppelhaushälfte) oder einseitig angebaut. Der Kennwert liegt unter dem des freistehenden Einfamilienhauses.": "Semi-detached / end-terrace house: one residential unit sharing a wall with the neighbouring building (Doppelhaushälfte) or built on one side only. The cost figure is below that of a detached single-family house.",
    "Reihenendhaus: einseitig angebautes Reihenhaus mit einer Wohneinheit. Durch die zusätzliche Außenwand ist der Kennwert höher als bei Gebäudetyp 2.11.": "End-terrace house: a terraced house built on one side only with one residential unit. The additional external wall gives a higher cost figure than building type 2.11.",
    "Reihenmittelhaus: beidseitig angebautes Reihenhaus mit einer Wohneinheit. Es hat den niedrigsten Kennwert der hier aufgeführten Wohnhaustypen.": "Mid-terrace house: a terraced house built on both sides with one residential unit. It has the lowest cost figure of the dwelling types listed here.",
    "Mehrfamilienhaus bis 6 Wohnungen: Geschosswohnungsbau mit mehreren Wohneinheiten. NHK 2010 weist Kennwerte erst ab Ausstattungsstufe 3 aus; der Sachwertfaktor ist objektbezogen manuell zu prüfen.": "Multi-family house with up to 6 dwellings: multi-storey residential building with several residential units. NHK 2010 provides cost figures only from Ausstattungsstufe 3; the Sachwertfaktor must be checked manually for the object.",
    "Kostenkennwert bei Ausstattungsstufe 3": "Cost figure at Ausstattungsstufe 3",
    "Baujahr": "Year of construction",
    "Bruttogrundfläche BGF (m²)": "Bruttogrundfläche BGF (m²)",
    "nach DIN 277, einschließlich ausgebautem Dachgeschoss. Grundriss und Flächen ggf. in TIM-Online prüfen.": "Under DIN 277, including converted loft. Check floor plan and areas in TIM-Online if needed.",
    "Wohnfläche (m²)": "Living area (m²)",
    "Gesamtnutzungsdauer GND (Jahre)": "Gesamtnutzungsdauer GND (years)",
    "80 Jahre für EFH, DHH, Reihenhäuser und MFH (Anlage 1 ImmoWertV).": "80 years for EFH, DHH, terraced houses and MFH (Anlage 1 ImmoWertV).",
    "Regionalfaktor NHK": "Regional factor NHK",
    "Ratingen laut Marktbericht: 1,00.": "Ratingen per Grundstücksmarktbericht: 1.00.",
    "Ausstattungsstufe (Gewichtung nach NHK 2010)": "Ausstattungsstufe (weighted per NHK 2010)",
    "Regler von 1 (einfach) bis 5 (sehr hoch) in Halbschritten (0,5). Bedeutung und Beispiel passen sich dem Regler an; die gewichtete Stufe wird linear zwischen den NHK-Kostenkennwerten interpoliert.": "Sliders from 1 (basic) to 5 (very high) in half steps (0.5). Meaning and example follow the slider; the weighted level is interpolated linearly between the NHK cost figures.",
    "Regler von 1 (einfach) bis 5 (sehr hoch) in Halbschritten (0,5). Ein Halbschritt wird der unteren NHK-Stufe zugeordnet; Bedeutung und Beispiel sind für 3 und 3,5 gleich. Der gewichtete Wert wird linear zwischen den NHK-Kostenkennwerten interpoliert.": "Sliders from 1 (basic) to 5 (very high) in half steps (0.5). A half step is assigned to the lower NHK level, so the meaning and example are the same for 3 and 3.5. The weighted value is interpolated linearly between the NHK cost figures.",
    "Die Flächen sind schematisch aus den Punkten der Bodenrichtwertnummern erzeugt – keine amtlichen Zonengrenzen und keine Straßenkarte.": "The areas are generated schematically from the Bodenrichtwertnummer points – not official zone boundaries and not a street map.",
    "Punkten": "points",
    "Regler von 1 (einfach) bis 5 (sehr hoch), Zwischenwerte sind zulässig. Bedeutung und Beispiel passen sich dem Regler an.": "Sliders from 1 (simple) to 5 (very high); intermediate values are allowed. Meaning and example adjust to the slider.",
    "Gewichtete Standardstufe": "Weighted standard level",
    "Gewichtete Ausstattungsstufe": "Weighted Ausstattungsstufe",
    "Zuschläge für nicht in der BGF erfasste Bauteile": "Additions for components not covered by the BGF",
    "Zuschläge erfassen Bauteile und Anlagen außerhalb der Bruttogrundfläche nach DIN 277, die den Gebäudewert beeinflussen. Die Beträge sind Herstellungskosten; sie werden vor der Marktanpassung zum vorläufigen Sachwert addiert.": "Additions cover components and installations outside the Bruttogrundfläche under DIN 277 that affect the building value. The amounts are Herstellungskosten; they are added to the vorläufiger Sachwert before market adaptation.",
    "Beispiele: Hauseingangstreppe, Kelleraußentreppe, Gaube, Garage, Carport, Stellplatz, Terrasse, Einfriedung, Kamin oder Solaranlage. Bereits in der BGF enthaltene Bauteile sowie Baunebenkosten und Außenanlagen gehören nicht hierher – dafür gibt es eigene Felder.": "Examples: entrance steps, cellar outside steps, dormer, garage, carport, parking space, terrace, fencing, fireplace or solar installation. Components already included in the BGF, Baunebenkosten and Außenanlagen do not belong here – they have their own fields.",
    "+ Bauteil hinzufügen": "+ Add component",
    "Zuschlag insgesamt / je m² BGF": "Total addition / per m² BGF",
    "Index, Baunebenkosten und Außenanlagen": "Index, Baunebenkosten and Außenanlagen",
    "Baupreisindex (Basis 2010 = 100)": "Baupreisindex (base 2010 = 100)",
    "Eigener Wert": "Custom value",
    "Presets aus Destatis, Tabelle 61261-0002 ↗ (Faktor = Index ÷ 70,8). Eigene Werte sind möglich.": "Presets from Destatis, table 61261-0002 ↗ (factor = index ÷ 70.8). Custom values are possible.",
    "Baunebenkosten (%)": "Baunebenkosten (%)",
    "Marktbericht 2026: in NHK enthalten → 0 %. Ältere Modelle: häufig 17 %.": "Grundstücksmarktbericht 2026: included in NHK → 0%. Older models: often 17%.",
    "Zeitwert Außenanlagen (% vom Gebäudezeitwert)": "Time value of Außenanlagen (% of building time value)",
    "Kostenkennwert auf ganze €/m² runden (wie im Beispielgutachten)": "Round cost figure to whole €/m² (as in the example report)",
    "Korrektur freistehendes Zweifamilienhaus (Faktor 1,05)": "Correction for detached two-family house (factor 1.05)",
    "Korrektur Grundrissart / MFH": "Correction for floor-plan type / MFH",
    "Durchschnittliche Wohnungsgröße WF/WE bei MFH (m²)": "Average apartment size WF/WE for MFH (m²)",
    "0 = keine Korrektur. Nur für Gebäudetyp 4.1 relevant.": "0 = no correction. Only relevant for building type 4.1.",
    "Indexierter Kostenkennwert inkl. Zuschläge": "Indexed cost figure incl. additions",

    /* step 4 */
    "Gebäudealter und Restnutzungsdauer": "Building age and Restnutzungsdauer",
    "Die lineare Alterswertminderung ergibt sich aus RND ÷ GND. Modernisierungen können die RND verlängern.": "Linear Alterswertminderung is RND ÷ GND. Modernisation can extend the RND.",
    "Die Gesamtnutzungsdauer ist die typische Lebensdauer des Gebäudetyps. Ausgangspunkt ist linear: RND = GND − Gebäudealter. Für jede Modernisierungspunktzahl von 0 bis 20 prüft das Tool zusätzlich das Modell der Anlage 2 ImmoWertV. Die Alterswertminderung ist immer RND ÷ GND.": "The Gesamtnutzungsdauer is the typical service life of the building type. The baseline is linear: RND = GND − building age. For every Modernisierungspunktzahl from 0 to 20 the tool also checks the Anlage 2 ImmoWertV model. Alterswertminderung is always RND ÷ GND.",
    "Die Restnutzungsdauer ist die voraussichtliche Nutzungsdauer ab dem Wertermittlungsstichtag. Sie kann von der linearen RND abweichen, wenn Modernisierungen oder Baumängel das Alter verändert haben.": "The Restnutzungsdauer is the expected service life from the Wertermittlungsstichtag. It may differ from the linear RND if modernisation or defects have changed the effective age.",
    "Rechengrößen zum Alter": "Age calculation values",
    "Gebäudealter": "Building age",
    "Lineare RND": "Linear RND",
    "Modernisierungspunkte": "Modernisation points",
    "Maßgebliche RND": "Relevant RND",
    "Alterswertminderung": "Alterswertminderung",
    "Modernisierungspunkte (Kopfzeile)": "Modernisation points",
    "Punkte für Modernisierungsmaßnahmen, die am Stichtag oder kurz davor durchgeführt wurden; bei weiter zurückliegenden Maßnahmen ist die Punktzahl sachverständig zu prüfen. Maximal 20 Punkte nach Tabelle 1 der Anlage 2 ImmoWertV. Bewegen Sie die Regler; unter jeder Maßnahme erscheint die Kurzbeschreibung der gewählten Stufe.": "Points for modernisation measures carried out on or shortly before the Stichtag; for older measures the point count must be assessed by an expert. Maximum 20 points under Table 1 of Anlage 2 ImmoWertV. Move the sliders; a short description of the selected level appears under each measure.",
    "Modernisierungsgrad nach Tabelle 2 der Anlage 2 ImmoWertV": "Modernisierungsgrad under Table 2 of Anlage 2 ImmoWertV",
    "Auf der Grundlage einer sachverständigen Einschätzung des Modernisierungsgrades kann aufgrund der Tabelle 2 eine Gesamtpunktzahl für die Modernisierung ermittelt werden.": "On the basis of an expert assessment of the Modernisierungsgrad, a total point count for the modernisation can be determined from Table 2.",
    "Formel zur Ermittlung der Restnutzungsdauer, Anlage 2 (PDF) ↗": "Formula for determining the Restnutzungsdauer, Anlage 2 (PDF) ↗",
    "ImmoWertV online, Anlage 2 und Tabelle 2 ↗": "ImmoWertV online, Anlage 2 and Table 2 ↗",

    /* step 5 */
    "Marktanpassung mit Sachwertfaktor": "Market adaptation with Sachwertfaktor",
    "Der vorläufige Sachwert wird an die tatsächlichen Marktverhältnisse in Ratingen angepasst.": "The preliminary Sachwert is adapted to the actual market conditions in Ratingen.",
    "Der vorläufige Sachwert ist noch kein Marktpreis. Der Sachwertfaktor überträgt die im Marktbericht beobachteten Verhältnisse auf dieses Objekt. Standard ist der Marktbericht 2026. Gebäudeklasse und vorläufiger Sachwert bestimmen den Tabellen- oder Regressionswert. Weicht Ihr Objekt ab, geben Sie die Anpassung in Prozent ein; der Faktor wird dann sichtbar als „angepasst“ markiert.": "The preliminary Sachwert is not yet a market price. The Sachwertfaktor transfers the conditions observed in the Grundstücksmarktbericht to this object. The default is the 2026 report. Building class and preliminary Sachwert determine the table or regression value. If your object deviates, enter the adjustment as a percentage; the factor is then visibly marked as “adjusted”.",
    "Sachwertfaktoren werden aus Kaufpreisen und vorläufigen Sachwerten abgeleitet. Eine Extrapolation außerhalb der ausgewiesenen Sachwertspanne wird nicht empfohlen.": "Sachwertfaktoren are derived from purchase prices and preliminary Sachwerte. Extrapolation outside the stated Sachwert range is not recommended.",
    "Datenquelle": "Data source",
    "Gebäudeklasse": "Building class",
    "Objektspezifische Anpassung des Faktors (%)": "Object-specific adjustment of the factor (%)",
    "Entscheidungshilfe zur Anpassung: 0 % ist richtig, wenn das Objekt den im Marktbericht ausgewerteten Kauffällen entspricht und keine belegte Abweichung vorliegt. Ein negativer Wert ist angezeigt, wenn der Markt das Objekt geringer bewertet als der Modell-Sachwert (zum Beispiel ungünstiger Grundriss, starke Lärmbelastung, erheblicher Sanierungsbedarf oder rechtliche Belastung). Ein positiver Wert nur bei belegten, nicht bereits in BGF, Ausstattung oder RND erfassten Vorteilen (zum Beispiel besonders gute Mikrolage oder seltenes, gesuchtes Objekt). Korrigieren Sie zuerst die Eingaben; nutzen Sie die Prozentangabe nicht als Ausgleich für fehlende Daten. Endfaktor = Tabellen-/Regressionsfaktor × (1 + Anpassung ÷ 100).": "Decision aid: 0% is correct when the object corresponds to the transactions analysed in the Grundstücksmarktbericht and no documented deviation exists. A negative value is appropriate when the market values the object below the model Sachwert (for example poor layout, severe noise exposure, substantial modernisation backlog or legal burden). A positive value only for documented advantages not already captured in BGF, Ausstattung or RND (for example particularly good micro-location or a scarce, sought-after property). Correct the inputs first; do not use the percentage to compensate for missing data. Final factor = table/regression factor × (1 + adjustment ÷ 100).",
    "angepasst": "adjusted",
    "Beispiel: Tabellenfaktor 1,30 → 1,10 entspricht −15,38 %. Abweichungen werden als „angepasst“ markiert.": "Example: table factor 1.30 → 1.10 corresponds to −15.38%. Deviations are marked as “adjusted”.",
    "Manueller Sachwertfaktor": "Manual Sachwertfaktor",
    "Nur für MFH erforderlich: Die Ratinger Marktberichte enthalten keine MFH-Sachwertfaktoren.": "Only required for MFH: the Ratingen market reports contain no MFH Sachwertfaktoren.",
    "Tabellen-/Regressionsfaktor": "Table / regression factor",
    "Standardabweichung σ": "Standard deviation σ",
    "Datensätze": "Data sets",
    "Verwendeter Faktor": "Factor used",
    "Extrapolation:": "Extrapolation:",
    "Der Marktbericht empfiehlt keine Extrapolation außerhalb der dargestellten Sachwertspanne. Liegt der vorläufige Sachwert außerhalb, wird ein Hinweis ausgegeben.": "The Grundstücksmarktbericht does not recommend extrapolation outside the shown Sachwert range. If the preliminary Sachwert is outside, a note is issued.",
    "Sachwertfaktoren laut Marktbericht": "Sachwertfaktoren according to the market report",
    "Der Gutachterausschuss leitet die Faktoren aus bereinigten Kaufpreisen und vorläufigen Sachwerten ab. Sie gelten je Gebäudetyp und nur innerhalb der ausgewiesenen Sachwertspanne. Der Tabellenfaktor wird linear zwischen den Stützstellen interpoliert; die Regression ist die zugehörige Ausgleichsfunktion. σ beschreibt die Streuung der einzelnen Kauffälle – der Faktor ist also kein Festwert.": "The Gutachterausschuss derives the factors from adjusted purchase prices and preliminary Sachwerte. They apply by building type and only within the stated Sachwert range. The table factor is interpolated linearly between the support points; the regression is the corresponding fitted function. σ describes the dispersion of individual transactions – the factor is not a fixed value.",
    "Tabellenfaktor": "Table factor",
    "Regression": "Regression",
    "Spanne vorläufiger Sachwert": "Preliminary Sachwert range",
    "Angezeigt für": "Shown for",
    "vorläufigen Sachwert aus": "preliminary Sachwert from",
    "Die markierte Zeile und die Kurve zeigen die ausgewählte Gebäudeklasse.": "The highlighted row and the curve show the selected building class.",
    "Für Mehrfamilienhäuser enthält der Marktbericht keine Sachwertfaktoren; bitte den Faktor manuell festlegen.": "The market report contains no Sachwertfaktoren for multi-family houses; please set the factor manually.",

    /* step 6 */
    "Besondere objektspezifische Merkmale und Plausibilität": "Special object-specific features and plausibility",
    "Baumängel, Modernisierungsrückstände oder andere Abweichungen werden als Zu-/Abschläge erfasst.": "Defects, modernisation backlogs or other deviations are recorded as additions/deductions.",
    "Erfassen Sie nur Abweichungen, die noch nicht in Ausstattung, Restnutzungsdauer oder Sachwertfaktor stecken. Negative Beträge sind Abschläge, positive Beträge Zuschläge. Die Plausibilisierung stellt dem Ergebnis einen typischen Kaufpreis gegenüber; sie ersetzt kein Vergleichswertverfahren.": "Record only deviations not already covered by fittings, Restnutzungsdauer or Sachwertfaktor. Negative amounts are deductions, positive amounts additions. The plausibility check compares the result with a typical purchase price; it does not replace a Vergleichswertverfahren.",
    "Besondere objektspezifische Merkmale sind durch Zu- oder Abschläge zu berücksichtigen, soweit sie nicht bereits in anderen Eingangsgrößen erfasst sind.": "Special object-specific features are to be considered by additions or deductions insofar as they are not already covered by other input values.",
    "Wertmindernde oder wertsteigernde Merkmale": "Value-reducing or value-increasing features",
    "Beispiele für Zu- und Abschläge": "Examples of additions and deductions",
    "Abschlag (negativer Betrag)": "Deduction (negative amount)",
    "Feuchtigkeitsschaden im Keller: −15.000 €": "Damp damage in the basement: −15,000 €",
    "Veraltete Elektroinstallation: −8.000 €": "Outdated electrical installation: −8,000 €",
    "Schallschutzmangel zur Straße: −5.000 €": "Insufficient sound insulation towards the street: −5,000 €",
    "Dokumentierter Baumangel: −12.000 €": "Documented construction defect: −12,000 €",
    "Zuschlag (positiver Betrag)": "Addition (positive amount)",
    "Wintergarten oder überdachte Terrasse: +25.000 €": "Conservatory or covered terrace: +25,000 €",
    "Carport oder Stellplatz: +8.000 €": "Carport or parking space: +8,000 €",
    "Hochwertige Einbauküche: +6.000 €": "High-quality fitted kitchen: +6,000 €",
    "Zusätzliche Grundstücksfläche: +10.000 €": "Additional land area: +10,000 €",
    "Nur Beträge eintragen, die nicht bereits in Ausstattung, Restnutzungsdauer oder Sachwertfaktor stecken.": "Only enter amounts not already covered by fittings, Restnutzungsdauer or Sachwertfaktor.",
    "+ Merkmal hinzufügen": "+ Add feature",
    "Summe der Zu-/Abschläge": "Total additions/deductions",
    "Im anonymisierten Beispiel wurde der Modernisierungsrückstand über den Sachwertfaktor berücksichtigt; hier daher kein zusätzlicher Abzug.": "In the anonymised example the modernisation backlog was covered via the Sachwertfaktor; therefore no additional deduction here.",
    "Plausibilisierung": "Plausibility check",
    "Typischer Kaufpreis / Vergleichswert aus dem Marktbericht (€)": "Typical purchase price / comparison value from the Grundstücksmarktbericht (€)",
    "Sie können einen Wert aus dem BORIS-Preis-Kalkulator manuell übernehmen. Ein automatischer Abruf ist nicht vorgesehen.": "You can transfer a value from the BORIS price calculator manually. Automatic retrieval is not provided.",
    "Mittel aus Sachwert und Vergleichswert": "Average of Sachwert and comparison value",

    /* step 7 */
    "Unentgeltliches Wohnungsrecht": "Gratuitous Wohnungsrecht",
    "Optional: Belastung durch ein Wohnungsrecht nach dem Modell des Beispielgutachtens.": "Optional: burden of a Wohnungsrecht based on the example report model.",
    "Unentgeltliches Wohnungsrecht bei der Wertermittlung berücksichtigen": "Consider a gratuitous Wohnungsrecht in the valuation",
    "Für die meisten Objekte nicht zutreffend. Ohne Haken bleiben alle Eingaben und Ergebnisse dieses Schritts ausgeblendet.": "Not applicable to most objects. Without a tick, all inputs and results of this step remain hidden.",
    "Nur aktivieren, wenn tatsächlich ein unentgeltliches Wohnungsrecht besteht. Das Recht verkürzt die wirtschaftliche Nutzung. Der spätere Sachwert wird diskontiert, ein Unsicherheitsabschlag berücksichtigt und die ersparte Miete des künftigen Eigentümers addiert.": "Only activate if a gratuitous Wohnungsrecht actually exists. The right shortens the economic use. The future Sachwert is discounted, an uncertainty deduction applied and the future owner's saved rent added.",
    "Lebenserwartung, Diskontierungsfaktor und Rentenbarwertfaktor sind sachverständig zu bestimmen. Das Tool übernimmt dafür keine automatischen Werte.": "Life expectancy, discount factor and annuity factor must be determined by an expert. The tool does not provide automatic values.",
    "Statistische Lebenserwartung (Jahre)": "Statistical life expectancy (years)",
    "Diskontierungsfaktor (lebensabhängig)": "Discount factor (life-dependent)",
    "Unsicherheitsabschlag (%)": "Uncertainty deduction (%)",
    "Jährliche Ersparnis für den Eigentümer (€)": "Annual saving for the owner (€)",
    "Leibrentenbarwertfaktor": "Annuity present-value factor",
    "RND nach Ablauf des Rechts": "RND after expiry of the right",
    "Sachwert in der Zukunft": "Sachwert in the future",
    "Abgezinster Wert": "Discounted value",
    "Wert mit Wohnungsrecht": "Value with Wohnungsrecht",
    "Der Bodenwert wird unverändert in die Zukunft übernommen. Diskontierungs- und Rentenbarwertfaktor sind sachverständig zu ermitteln und hier frei eingebbar. Das anonymisierte Beispiel enthält alle erforderlichen Eingaben.": "The land value is carried forward unchanged. Discount and annuity factors must be determined by an expert and can be entered freely here. The anonymised example contains all required inputs.",
    "Kein Wohnungsrecht aktiviert – dieser Abschnitt ist deaktiviert.": "No Wohnungsrecht activated – this section is disabled.",

    /* step 8 */
    "Ergebnis und Rechenweg": "Result and calculation path",
    "Alle Zwischenschritte sind nachvollziehbar aufgeführt.": "All intermediate steps are listed transparently.",
    "Was bedeutet das Ergebnis?": "What does the result mean?",
    "Sehen Sie sich die Tabelle von unten nach oben an: Bodenwert, Herstellungskosten, Alterswertminderung, Sachwertfaktor und Wohnungsrecht. Prüfen Sie außerdem die automatischen Hinweise. Diese Seite ist eine nachvollziehbare Orientierung, kein vereidigtes Verkehrswertgutachten.": "Read the table from bottom to top: land value, Herstellungskosten, Alterswertminderung, Sachwertfaktor and Wohnungsrecht. Also check the automatic notes. This page is a transparent orientation aid, not a sworn Verkehrswertgutachten.",
    "Die Wertermittlung ist so darzustellen, dass die Ableitung der Ergebnisse für Dritte nachvollziehbar ist.": "The valuation must be presented so that the derivation of results is comprehensible to third parties.",
    "Marktangepasster Sachwert (unbelastet)": "Market-adapted Sachwert (unencumbered)",
    "Gebäude inkl. Außenanlagen": "Building incl. Außenanlagen",
    "Rechenweg": "Calculation path",
    "Position": "Item",
    "Ansatz": "Basis",
    "Ergebnis": "Result",
    "Hinweise": "Notes",
    "Verwendete Quellen": "Sources used",
    "Das Beispiel ist fiktiv aufbereitet, nutzt aber realistische Bewertungsansätze und Marktdaten. Objektangaben sind anonymisiert.": "The example is fictitious but uses realistic valuation approaches and market data. Object details are anonymised.",
    "Ergebnis kopieren": "Copy result",
    "← Zurück": "← Back",
    "Weiter →": "Next →",
    "Vorläufiger Sachwert": "Preliminary Sachwert",
    "Sachwert": "Sachwert",
    "Änderungen werden sofort berechnet.": "Changes are calculated immediately.",

    /* dynamic: calculation.js labels, methods and warnings */
    "linear (GND - Alter)": "linear (GND - age)",
    "ImmoWertV-Anlage-2-Modell (": "ImmoWertV-Anlage-2 model (",
    " Punkte)": " points)",
    "linear (relatives Alter unter dem Anwendungsbereich des RND-Modells)": "linear (relative age below the application range of the RND model)",
    ": Wert liegt unterhalb der Tabellenspanne; erster Tabellenwert wurde verwendet.": ": value is below the table range; first table value was used.",
    ": Wert liegt oberhalb der Tabellenspanne; letzter Tabellenwert wurde verwendet.": ": value is above the table range; last table value was used.",
    "Die Übertiefe übersteigt 50 m. Der Umrechnungskoeffizient 0,15 ist nur ein Richtwert; bitte sachverständig prüfen.": "The Übertiefe exceeds 50 m. The conversion coefficient 0.15 is only a guideline; please have it assessed by an expert.",
    "Bei ": "At ",
    "% relativem Alter liegt das Modernisierungsmodell noch außerhalb des Anwendungsbereichs (ab ": "% relative age, the modernisation model is still outside its application range (from ",
    "%); die lineare RND wurde verwendet.": "%); the linear RND was used.",
    "manuell eingegeben": "entered manually",
    "unbekannte Datenquelle – manueller Wert": "unknown data source – manual value",
    "Unbekannter Marktbericht. Der manuelle Sachwertfaktor wurde verwendet.": "Unknown market report. The manual Sachwertfaktor was used.",
    "manuell (für MFH liegen keine Faktoren vor)": "manual (no factors available for MFH)",
    "Die Ratinger Marktberichte enthalten keine Sachwertfaktoren für Mehrfamilienhäuser. Bitte einen objektspezifischen Faktor manuell eingeben.": "The Ratingen market reports contain no Sachwertfaktoren for multi-family houses. Please enter an object-specific factor manually.",
    "Für diesen vorläufigen Sachwert ist kein Tabellenwert verfügbar. Der Regressionswert wurde verwendet; eine Extrapolation ist nicht empfohlen.": "No table value is available for this preliminary Sachwert. The regression value was used; extrapolation is not recommended.",
    "Die Restnutzungsdauer wird durch das Wohnungsrecht auf 0 Jahre reduziert. Das Ergebnis ist ein Grenzfall.": "The Restnutzungsdauer is reduced to 0 years by the Wohnungsrecht. The result is a borderline case.",
    "Grundstücksmarktbericht 2026 (Beschluss 01.01.2026)": "Grundstücksmarktbericht 2026 (resolution 01.01.2026)",
    "Grundstücksmarktbericht 2025 (Beschluss 01.01.2025)": "Grundstücksmarktbericht 2025 (resolution 01.01.2025)",
    "1.11 Freistehendes Einfamilienhaus": "1.11 Detached single-family house",
    "2.11 Doppel- und Reihenendhaus": "2.11 Semi-detached and end-terrace house",
    "2.31 Reihenendhaus": "2.31 End-terrace house",
    "3.01 Reihenmittelhaus": "3.01 Mid-terrace house",
    "4.1 Mehrfamilienhaus (bis 6 Wohnungen)": "4.1 Multi-family house (up to 6 apartments)",

    /* dynamic: market classes / presets / BORIS */
    "Freistehende EFH/ZFH": "Detached EFH/ZFH",
    "Doppelhaushälfte": "Semi-detached house",
    "Doppelhaushälften": "Semi-detached houses",
    "Reihenendhaus": "End-terrace house",
    "Reihenendhäuser": "End-terrace houses",
    "Reihenmittelhaus": "Mid-terrace house",
    "Reihenmittelhäuser": "Mid-terrace houses",
    "Mehrfamilienhäuser (manuell)": "Multi-family houses (manual)",
    "Freistehende Ein-/Zweifamilienhäuser": "Detached one/two-family houses",
    "Wohnbau 1–2 geschossig, gute Lage": "Residential 1–2 storeys, good location",
    "Wohnbau 1–2 geschossig, mittlere Lage": "Residential 1–2 storeys, average location",
    "Wohnbau 1–2 geschossig, mäßige Lage": "Residential 1–2 storeys, moderate location",
    "Wohnbau 3+ geschossig, gute Lage": "Residential 3+ storeys, good location",
    "Wohnbau 3+ geschossig, mittlere Lage": "Residential 3+ storeys, average location",
    "Gemischte Nutzung, Ringe": "Mixed use, rings",
    "Gemischte Nutzung, sonstige": "Mixed use, other",
    "Kerngebiet": "Core area",
    "Wohnbau Außenbereich": "Residential outskirts",
    "Alle Jahre": "All years",
    "Bitte Zone wählen (": "Please select a zone (",
    "Keine Zone gefunden": "No zone found",
    "Offline-Auszug vom ": "Offline extract from ",
    " Ratingen-Zonen": " Ratingen zones",
    "Keine Offline-Daten geladen. Bitte den Bodenrichtwert manuell eingeben.": "No offline data loaded. Please enter the Bodenrichtwert manually.",
    "Wert aus der Offline-Auswahl übernommen. Sie können ihn jederzeit überschreiben.": "Value taken from the offline extract. You can overwrite it at any time.",
    "Manuell überschrieben – BORIS zeigt ": "Manually overwritten – BORIS shows ",
    "WNUM ": "WNUM ",
    "Stichtag ": "Stichtag ",
    " · PLZ ": " · postcode ",
    " / m²": " / m²",
    " im Offline-Auszug. ": " in the offline extract. ",
    " sind gebietstypische Durchschnitte, keine Kaufpreise.": " are area-typical averages, not purchase prices.",
    "z. B. Feuchtigkeitsschaden": "e.g. damp damage",
    "z. B. Wintergarten": "e.g. conservatory",
    "Bezeichnung": "Description",
    "Betrag (€)": "Amount (€)",
    "−5000 oder +5000": "−5000 or +5000",
    "Eintrag entfernen": "Remove entry",

    /* link labels */
    "BORISplus.NRW (WNUM ermitteln) ↗": "BORISplus.NRW (determine WNUM) ↗",
    "BORISplus.NRW – Bodenrichtwertabfrage ↗": "BORISplus.NRW – Bodenrichtwert query ↗",
    "BORIS-NRW, Immobilien-Preis-Kalkulator ↗": "BORIS-NRW, property price calculator ↗",
    "Open.NRW Datensatz ↗": "Open.NRW dataset ↗",
    "TIM-Online NRW – Liegenschaftskataster ↗": "TIM-Online NRW – cadastral register ↗",
    "ImmoWertV, Anlagen 1 und 4 (PDF) ↗": "ImmoWertV, Annexes 1 and 4 (PDF) ↗",
    "ImmoWertV, Anlage 2 (PDF) ↗": "ImmoWertV, Annex 2 (PDF) ↗",
    "GND und RND – Lehrbuch (PDF) ↗": "GND and RND – textbook (PDF) ↗",
    "Sachwertrichtlinie, Nr. 6 (PDF) ↗": "Sachwertrichtlinie, No. 6 (PDF) ↗",
    "Marktbericht 2026, Kap. 5.1.5 ↗": "Grundstücksmarktbericht 2026, chapter 5.1.5 ↗",
    "Marktbericht 2026, Kap. 4.5 ↗": "Grundstücksmarktbericht 2026, chapter 4.5 ↗",
    "Marktbericht 2025 ↗": "Grundstücksmarktbericht 2025 ↗",

    /* dynamic: slider labels */
    "Außenwände": "External walls",
    "Dach": "Roof",
    "Fenster und Außentüren": "Windows and external doors",
    "Innenwände und -türen": "Internal walls and doors",
    "Deckenkonstruktion und Treppen": "Ceiling construction and stairs",
    "Fußböden": "Floors",
    "Sanitäreinrichtungen": "Sanitary fittings",
    "Heizung": "Heating",
    "Sonstige technische Ausstattung": "Other technical equipment",
    "Dacherneuerung inkl. Wärmedämmung": "Roof renewal incl. insulation",
    "Leitungssysteme (Strom, Gas, Wasser, Abwasser)": "Service systems (electricity, gas, water, drainage)",
    "Heizungsanlage": "Heating system",
    "Wärmedämmung der Außenwände": "Thermal insulation of external walls",
    "Modernisierung von Bädern": "Bathroom modernisation",
    "Innenausbau (Decken, Fußböden, Treppen)": "Interior fit-out (ceilings, floors, stairs)",
    "Wesentliche Grundrissverbesserung": "Significant floor-plan improvement",

    /* dynamic: slider help */
    " Gewicht": " weight",
    "Stufe 3,0": "Level 3.0",
    "Stufe ": "Level ",
    " Punkte": " points",
    "1 einfach": "1 simple",
    "5 sehr hoch": "5 very high",
    "Bedeutung: ": "Meaning: ",
    "Beispiel: ": "Example: ",
    "Keine Beschreibung verfügbar.": "No description available.",

    /* dynamic: outputs / calc table */
    " Jahre": " years",
    " von 20": " of 20",
    " je m²": " per m²",
    "J.": "yrs",
    "Exakt: ": "Exact: ",
    " · Anpassung ": " · adjustment ",
    "auf ganze €/m² gerundet": "rounded to whole €/m²",
    "ungerundet": "unrounded",
    "Zuschlag": "Addition",
    "Grundstücksfläche": "Land area",
    "amtliche Fläche / anrechenbare Fläche": "official area / usable area",
    "Bruttogrundfläche": "Bruttogrundfläche",
    "NHK-Bezugsmaßstab": "NHK reference measure",
    "Stichtag − Baujahr": "Stichtag − year of construction",
    "Anlage 1 ImmoWertV": "Anlage 1 ImmoWertV",
    "Restnutzungsdauer": "Restnutzungsdauer",
    "Alterswertminderungsfaktor": "Alterswertminderung factor",
    "RND ÷ GND": "RND ÷ GND",
    "9 Gewerke nach NHK 2010": "9 trades under NHK 2010",
    "NHK-Kostenkennwert": "NHK cost figure",
    "Zuschlag nicht erfasster Bauteile": "Addition for uncaptured components",
    "Summe ÷ BGF": "total ÷ BGF",
    "Korrekturfaktoren": "Correction factors",
    "Regionalfaktor, Zweifamilienhaus, Grundriss": "regional factor, two-family house, floor plan",
    "Kostenkennwert mit Zuschlägen": "Cost figure with additions",
    "vor Indexierung": "before indexing",
    "Baupreisindex": "Baupreisindex",
    "Basis 2010 = 100": "base 2010 = 100",
    "Indexierter Kostenkennwert": "Indexed cost figure",
    "Herstellungskosten inkl. BNK": "Herstellungskosten incl. BNK",
    "indexiert × (1 + BNK)": "indexed × (1 + BNK)",
    "Alterswertgeminderte Herstellungskosten": "Herstellungskosten after Alterswertminderung",
    "× BGF × AWM-Faktor": "× BGF × AWM factor",
    "Zeitwert Außenanlagen": "Time value of Außenanlagen",
    "Bodenwert": "Land value",
    "Besondere Merkmale": "Special features",
    "Zu-/Abschläge": "Additions/deductions",
    "Summe vor Marktanpassung": "total before market adaptation",
    "Sachwertfaktor": "Sachwertfaktor",
    "Marktangepasster Sachwert": "Market-adapted Sachwert",
    "vorläufiger Sachwert × Faktor": "preliminary Sachwert × factor",
    "Gerundeter Sachwert": "Rounded Sachwert",
    "auf volle 1.000 €": "to full €1,000",
    "Wohnungsrecht: RND danach": "Wohnungsrecht: RND thereafter",
    "RND − Lebenserwartung": "RND − life expectancy",
    "Wohnungsrecht: Sachwert später": "Wohnungsrecht: future Sachwert",
    "mit reduzierter RND": "with reduced RND",
    "Wohnungsrecht: Diskontierung": "Wohnungsrecht: discounting",
    "Faktor ": "Factor ",
    "Wohnungsrecht: Unsicherheitsabschlag": "Wohnungsrecht: uncertainty deduction",
    "Wohnungsrecht: Vorteil Ersparnis": "Wohnungsrecht: savings benefit",
    "Sachwert mit Wohnungsrecht": "Sachwert with Wohnungsrecht",
    "Summe": "Total",
    "Keine automatischen Hinweise. Bitte alle Angaben fachlich prüfen.": "No automatic notes. Please check all inputs professionally.",
    "Achtung: ": "Caution: ",
    "Hinweis: ": "Note: ",
    " Hinweis(e) im Ergebnisplan aufgeführt.": " note(s) listed in the result panel.",

    /* copy output */
    "Verkehrswert-Rechner Ratingen": "Verkehrswert calculator Ratingen",
    "Objekt: ": "Object: ",
    "Gemarkung/Flur/Flurstück: ": "Gemarkung/Flur/Flurstück: ",
    "Stichtag: ": "Stichtag: ",
    "Bodenrichtwert: ": "Bodenrichtwert: ",
    " (manuell)": " (manual)",
    "Vorläufiger Sachwert: ": "Preliminary Sachwert: ",
    "Sachwertfaktor: ": "Sachwertfaktor: ",
    "Marktangepasster Sachwert: ": "Market-adapted Sachwert: ",
    "RND: ": "RND: ",
    "Mit Wohnungsrecht: ": "With Wohnungsrecht: ",

    /* footer */
    "Hinweis:": "Note:",
    "Dieses Werkzeug dient der Orientierung und Dokumentation. Es ersetzt kein Verkehrswertgutachten und keine sachverständige Würdigung des Einzelfalls.": "This tool serves orientation and documentation. It does not replace a Verkehrswertgutachten or an expert assessment of the individual case.",

    /* explanations / examples from data.js */
    "Einfacher, ungedämmter Massiv- oder Holzbau ohne anspruchsvolle Oberfläche.": "Simple, uninsulated solid or timber construction without demanding finishes.",
    "Massivwand mit einfacher Dämmung und einfachem Putz oder Verkleidung.": "Solid wall with basic insulation and simple plaster or cladding.",
    "Üblicher Baustandard mit Wärmedämmung und normalem Putz oder Verkleidung.": "Standard construction with insulation and normal plaster or cladding.",
    "Verbesserte Dämmung, hochwertiger Putz, Naturstein- oder Klinkerbereiche.": "Improved insulation, high-quality plaster, natural stone or brick areas.",
    "Sehr hochwertige, aufwendig gestaltete Fassade mit Premiummaterialien.": "Very high-quality, elaborately designed façade with premium materials.",
    "Einfamilienhaus aus den 1950ern, 24-cm-Mauerwerk ohne Dämmung.": "1950s detached house, 24 cm masonry without insulation.",
    "Baujahr 1980, 30-cm-Mauerwerk mit einfacher Dämmung und Putz.": "Built in 1980, 30 cm masonry with basic insulation and plaster.",
    "Neubau mit 36-cm-Ziegel, Dämmung und mineralischem Putz.": "New build with 36 cm brick, insulation and mineral plaster.",
    "Klinkerfassade mit Dämmung und aufwendigen Fensterbänken.": "Brick façade with insulation and elaborate window sills.",
    "Natursteinfassade, architektonisch aufwendig geplant und ausgeführt.": "Natural stone façade, architecturally elaborate in design and execution.",
    "Einfaches Satteldach ohne Dämmung und mit einfacher Eindeckung.": "Simple pitched roof without insulation and with basic roofing.",
    "Satteldach mit einfacher Dämmung und Standardziegeln.": "Pitched roof with basic insulation and standard tiles.",
    "Gedämmtes Dach, konventionelle Eindeckung, normale Dachrinnen.": "Insulated roof, conventional roofing, normal gutters.",
    "Hochwertige Eindeckung, bessere Dämmung und aufwendige Details.": "High-quality roofing, better insulation and elaborate details.",
    "Aufwendige Dachform mit Premiumeindeckung und integrierten Dachfenstern.": "Elaborate roof shape with premium roofing and integrated roof windows.",
    "Altes Satteldach mit ungedämmter Schalung und Betondachsteinen.": "Old pitched roof with uninsulated boarding and concrete roof tiles.",
    "Dachsanierung in den 1990ern mit einfacher Zwischensparrendämmung.": "Roof renovation in the 1990s with basic between-rafter insulation.",
    "Neubau mit 20-cm-Dämmung und handelsüblichen Tonziegeln.": "New build with 20 cm insulation and standard clay tiles.",
    "Schiefer- oder Zementziegeldeckung mit aufwendigen Ortgangdetails.": "Slate or cement tile roof with elaborate verge details.",
    "Walmdach mit Titanzink, Solarpaneele und drei hochwertigen Dachfenstern.": "Hipped roof with titanium zinc, solar panels and three high-quality roof windows.",
    "Einfachverglasung oder alte Isolierverglasung in einfachen Profilen.": "Single glazing or old double glazing in simple frames.",
    "Isolierverglasung, Kunststoffprofile und einfache Haustür.": "Double glazing, plastic frames and a simple front door.",
    "Wärmeschutzverglasung, solide Profile und qualitativ gute Eingangstür.": "Thermal glazing, solid frames and a good-quality entrance door.",
    "Hochwertige Wärmeschutzverglasung, designorientierte Profile, edle Haustür.": "High-quality thermal glazing, design-oriented frames, elegant front door.",
    "Passivhaus-taugliche Fenster, aufwendige Holz-Alu-Profile, repräsentative Tür.": "Passive-house suitable windows, elaborate timber-aluminium frames, representative door.",
    "Fenster aus den 1970ern mit Einfachscheiben und Holzrahmen.": "1970s windows with single panes and timber frames.",
    "Kunststofffenster mit 2-fach-Verglasung und einfache Holzhaustür.": "Plastic windows with double glazing and a simple timber front door.",
    "Kunststoff-Alu-Fenster mit 2-fach-Wärmeschutzglas und Sicherheitshaustür.": "Plastic-aluminium windows with double thermal glass and a secure front door.",
    "Holz-Alu-Fenster mit 3-fach-Verglasung und Design-Eingangstür.": "Timber-aluminium windows with triple glazing and a design entrance door.",
    "Passivhausfenster mit 3-fach-Verglasung, Motorsteuerung und Naturstein-Türumfassung.": "Passive-house windows with triple glazing, motor control and natural stone door surround.",
    "Einfache Trennwände, lackierte Holztüren ohne besondere Details.": "Simple partition walls, painted timber doors without special details.",
    "Massive Innenwände, einfache Türen mit Standardbeschlägen.": "Solid internal walls, simple doors with standard fittings.",
    "Putz oder Trockenbau in Normalqualität, Türen mit weißer Oberfläche.": "Plaster or drywall in standard quality, doors with a white finish.",
    "Hochwertige Oberflächen, designorientierte Türen und gute Schallentkopplung.": "High-quality finishes, design-oriented doors and good acoustic decoupling.",
    "Aufwendige Innenausbauten, maßgefertigte Türen und High-End-Beschläge.": "Elaborate interior fit-out, custom-made doors and high-end fittings.",
    "Raumteiler aus Spachtelputz und einfache Schlagtüren aus dem Baujahr.": "Room dividers in fill plaster and simple doors from the year of construction.",
    "Mauerwerk mit Gipsputz, Türen mit einfachem weißem Lack.": "Masonry with gypsum plaster, doors with simple white paint.",
    "Trockenbauwände mit Standarddämmung und grifflosen Innentüren.": "Drywall with standard insulation and handleless internal doors.",
    "Holzfurnierte Türen, satinierte Beschläge und schallgedämmte Wandanschlüsse.": "Wood-veneered doors, satin fittings and sound-insulated wall connections.",
    "Maßgefertigte Eichentüren, verdeckte Drehtüren und Design-Griffe aus Edelstahl.": "Custom oak doors, concealed hinges and stainless-steel design handles.",
    "Einfache Beton- oder Holzdecke, gerade Holztreppe ohne Belag.": "Simple concrete or timber ceiling, straight timber staircase without covering.",
    "Betondecke, einfache Treppe mit Standardgeländer.": "Concrete ceiling, simple staircase with standard railing.",
    "Übliche Deckenkonstruktion, Treppe mit solidem Aufbau und Handlauf.": "Standard ceiling construction, staircase with solid build and handrail.",
    "Hochwertige Treppenanlage, gute Akustikdecke und saubere Details.": "High-quality staircase, good acoustic ceiling and clean details.",
    "Aufwendige Treppe, Design-Geländer und anspruchsvolle Deckengestaltung.": "Elaborate staircase, design railing and sophisticated ceiling design.",
    "Sichtbare Betondecke und gerade Holztreppe mit einfachem Handlauf.": "Exposed concrete ceiling and straight timber staircase with a simple handrail.",
    "Abgehängte Gipskartondecke, Treppe mit Laminatbelag und Holzgeländer.": "Suspended plasterboard ceiling, staircase with laminate covering and timber railing.",
    "Gedämmte Decke, Betontreppe mit Natursteinbelag und Edelstahlhandlauf.": "Insulated ceiling, concrete staircase with natural stone covering and stainless-steel handrail.",
    "Schwebende Treppe mit Eichenstufen und indirekter Beleuchtung.": "Floating staircase with oak treads and indirect lighting.",
    "Gewendelte Treppe mit Glasgeländer und aufwendiger Deckenausleuchtung.": "Winding staircase with glass railing and elaborate ceiling lighting.",
    "Einfacher Estrich mit Linoleum oder einfachen Fliesen.": "Simple screed with linoleum or basic tiles.",
    "Standardbelag wie Laminat oder Fliesen in einfacher Qualität.": "Standard covering such as laminate or tiles in basic quality.",
    "Üblicher hochwertiger Belag mit Designboden oder Fliesen und Sockelleisten.": "Typical high-quality covering with design flooring or tiles and skirting boards.",
    "Hochwertiger Belag, zum Beispiel Echtholzdielen oder Feinsteinzeug.": "High-quality covering, e.g. solid wood boards or porcelain tiles.",
    "Premiummaterialien und aufwendige Verlegung, zum Beispiel Naturstein mit Mosaik.": "Premium materials and elaborate installation, e.g. natural stone with mosaic.",
    "Linoleumboden aus den 1980ern in Flur und Wohnraum.": "1980s linoleum flooring in hallway and living room.",
    "Laminat in 8 mm mit einfachen Sockelleisten.": "8 mm laminate with simple skirting boards.",
    "Designboden in 12 mm und großformatige Fliesen im Bad.": "12 mm design flooring and large-format tiles in the bathroom.",
    "Eichen-Dielenboden mit geölter Oberfläche und passenden Sockelleisten.": "Oak board flooring with oiled finish and matching skirting boards.",
    "Naturstein-Mosaik im Eingangsbereich und durchgehender Eichenparkett.": "Natural stone mosaic in the entrance area and continuous oak parquet.",
    "Einfache Ausstattung mit einer Dusche, WC und Standardarmaturen.": "Basic fittings with a shower, toilet and standard taps.",
    "Zwei Bäder in Standardqualität, einfache Fliesen und Standardarmaturen.": "Two bathrooms in standard quality, basic tiles and standard taps.",
    "Übliche Ausstattung mit Dusche, Wanne und Waschtisch, marktübliche Armaturen.": "Typical fittings with shower, bathtub and washbasin, standard taps.",
    "Hochwertige Sanitärkeramik, aufwendige Fliesen und designorientierte Armaturen.": "High-quality sanitary ware, elaborate tiles and design-oriented taps.",
    "Premium-Sanitärausstattung in mehreren Bädern mit individueller Planung.": "Premium sanitary fittings in several bathrooms with individual planning.",
    "Ein Bad mit Duschwanne, einfachem Waschtisch und Spiegel Schrank.": "One bathroom with shower tray, simple washbasin and mirror cabinet.",
    "Zwei Bäder mit Standardfliesen, Markenarmaturen und Weißkeramik.": "Two bathrooms with standard tiles, branded taps and white sanitary ware.",
    "Dusche plus Badewanne, Markenarmaturen und bodengleiche Dusche.": "Shower plus bathtub, branded taps and a level-access shower.",
    "Aufsteinwaschtische, Designarmaturen und großformatige Feinsteinzeugfliesen.": "Countertop washbasins, design taps and large-format porcelain tiles.",
    "Drei individuell geplante Bäder mit Naturstein, Regendusche und Einbaugeräten.": "Three individually planned bathrooms with natural stone, rain shower and built-in appliances.",
    "Alte Heizung, zum Beispiel Einöfen oder veraltete Zentralheizung ohne Steuerung.": "Old heating, e.g. single stoves or outdated central heating without controls.",
    "Einfache Zentralheizung mit Standardkessel und manueller Steuerung.": "Simple central heating with a standard boiler and manual controls.",
    "Moderne Brennwertheizung mit Zeitsteuerung und normalen Radiatoren.": "Modern condensing boiler with timer control and standard radiators.",
    "Effiziente Heizung mit App-Steuerung und hochwertigen Heizkörpern oder Flächenheizung.": "Efficient heating with app control and high-quality radiators or surface heating.",
    "Sehr effizientes System mit Wärmepumpe, Speicher und smarter Steuerung.": "Very efficient system with heat pump, storage and smart controls.",
    "Ölheizung aus den 1970ern mit Einzelöfen im Wohnbereich.": "1970s oil heating with individual stoves in the living area.",
    "Gasheizung aus den 1990ern mit einfachem Raumthermostat.": "1990s gas heating with a simple room thermostat.",
    "Brennwert-Gasheizung mit Zeitprogramm und Standard-Radiatoren.": "Condensing gas boiler with timer programme and standard radiators.",
    "Brennwertheizung mit Fernbedienung, Fußbodenheizung im Bad und Designheizkörpern.": "Condensing boiler with remote control, underfloor heating in the bathroom and design radiators.",
    "Luft-Wasser-Wärmepumpe mit Pufferspeicher, Photovoltaik und Smart-Home-Steuerung.": "Air-to-water heat pump with buffer tank, photovoltaics and smart-home control.",
    "Kaum technische Ausstattung, einfache Elektroinstallation.": "Few technical features, simple electrical installation.",
    "Standard-Elektroinstallation, einfache Lüftung, keine Smart-Home-Funktionen.": "Standard electrical installation, basic ventilation, no smart-home functions.",
    "Zeitgemäße Elektroinstallation, Photovoltaik oder Lüftung möglich, solide Steuerung.": "Up-to-date electrical installation, photovoltaics or ventilation possible, solid controls.",
    "Erweiterte technische Ausstattung mit Photovoltaik, Lüftung und Smart-Home-Grundausstattung.": "Extended technical features with photovoltaics, ventilation and basic smart-home equipment.",
    "Umfassende technische Ausstattung mit Photovoltaik, Speicher, Lüftung und Smart-Home.": "Comprehensive technical features with photovoltaics, storage, ventilation and smart home.",
    "Alte Sicherungen, wenige Steckdosen und kein Lüftungssystem.": "Old fuses, few sockets and no ventilation system.",
    "Neue Sicherungen, Standard-Schalter und einfache Badlüfter.": "New fuses, standard switches and simple bathroom fans.",
    "Moderne Verteilung, Photovoltaik auf dem Dach und programmierbare Lüftung.": "Modern distribution board, roof photovoltaics and programmable ventilation.",
    "Photovoltaik, Batteriespeicher, Lüftungsanlage und smartes Heizungsinterface.": "Photovoltaics, battery storage, ventilation system and smart heating interface.",
    "Vollintegriertes Smart-Home mit PV, Speicher, Lüftung, Rollläden und Energiemonitoring.": "Fully integrated smart home with PV, storage, ventilation, shutters and energy monitoring.",

    /* modernization explanations / examples */
    "Keine Dacherneuerung; Dach und Dämmung im Bestandszustand.": "No roof renewal; roof and insulation in original condition.",
    "Teilmaßnahme oder geringe Verbesserung der Wärmedämmung.": "Partial measure or slight improvement of insulation.",
    "Dach erneuert, Wärmedämmung teilweise verbessert.": "Roof renewed, insulation partly improved.",
    "Dach und Dämmung überwiegend erneuert.": "Roof and insulation largely renewed.",
    "Vollständige Dacherneuerung mit zeitgemäßer Wärmedämmung.": "Complete roof renewal with up-to-date insulation.",
    "Dachhaut und Dämmung noch aus dem Baujahr.": "Roof covering and insulation still from the year of construction.",
    "Einzelne Dachziegel ersetzt.": "Individual roof tiles replaced.",
    "Neue Dachhaut, alte Dämmung teilweise belassen.": "New roof covering, some old insulation retained.",
    "Große Dachfläche neu gedämmt, kleine Restfläche alt.": "Large roof area re-insulated, small remaining area old.",
    "Komplettes Dach inklusive Dämmung erneuert.": "Complete roof including insulation renewed.",
    "Fenster und Türen im Altbestand, nicht mehr zeitgemäß.": "Windows and doors original, no longer up to date.",
    "Teilweise erneuert, z. B. einzelne Fenster oder eine Tür.": "Partly renewed, e.g. individual windows or one door.",
    "Fenster und Außentüren vollständig erneuert.": "Windows and external doors fully renewed.",
    "Alte Einfachverglasung noch vorhanden.": "Old single glazing still present.",
    "Wohnzimmerfenster getauscht.": "Living room window replaced.",
    "Alle Fenster und die Haustür mit moderner Verglasung.": "All windows and the front door with modern glazing.",
    "Leitungssysteme überwiegend im Ursprungszustand.": "Service systems largely in original condition.",
    "Einzelne Systeme teilweise modernisiert.": "Individual systems partly modernised.",
    "Strom, Gas, Wasser und Abwasser vollständig modernisiert.": "Electricity, gas, water and drainage fully modernised.",
    "Alte Strom- und Wasserleitungen unverändert.": "Old electrical and water pipes unchanged.",
    "Elektroinstallation in der Küche erneuert.": "Electrical installation in the kitchen renewed.",
    "Alle Leitungen und Zähler getauscht.": "All pipes and meters replaced.",
    "Alte Heizungsanlage, nicht auf aktuellem Stand.": "Old heating system, not up to date.",
    "Heizung teilweise erneuert oder modernisiert.": "Heating partly renewed or modernised.",
    "Neue Heizungsanlage auf aktuellem technischen Stand.": "New heating system at current technical standard.",
    "Veralteter Ölkessel noch in Betrieb.": "Outdated oil boiler still in operation.",
    "Neue Heizungspumpe und Regelung installiert.": "New heating pump and controls installed.",
    "Moderne Gas- oder Wärmepumpenanlage eingebaut.": "Modern gas or heat pump system installed.",
    "Keine Außenwanddämmung vorhanden.": "No external wall insulation present.",
    "Erste Verbesserungen, z. B. in Teilbereichen.": "First improvements, e.g. in partial areas.",
    "Außenwände teilweise gedämmt, noch nicht durchgängig.": "External walls partly insulated, not yet continuous.",
    "Überwiegend gedämmt, einzelne Bereiche bleiben offen.": "Largely insulated, individual areas remain untreated.",
    "Vollständige, zeitgemäße Außenwanddämmung.": "Complete, up-to-date external wall insulation.",
    "Ungedämmtes Mauerwerk.": "Uninsulated masonry.",
    "Dämmung an einer Außenwand angebracht.": "Insulation applied to one external wall.",
    "Zwei von vier Außenwänden gedämmt.": "Two of four external walls insulated.",
    "Nur noch schmale Bereiche ungedämmt.": "Only narrow areas remain uninsulated.",
    "Alle Außenwände durchgängig gedämmt.": "All external walls continuously insulated.",
    "Bäder im Bestandszustand ohne Modernisierung.": "Bathrooms in original condition without modernisation.",
    "Einzelne Bäder teilweise modernisiert.": "Individual bathrooms partly modernised.",
    "Bäder vollständig modernisiert.": "Bathrooms fully modernised.",
    "Alte Fliesen und Armaturen.": "Old tiles and taps.",
    "Gäste-WC neu gefliest.": "Guest toilet re-tiled.",
    "Alle Bäder mit neuen Armaturen und Bodenbelägen.": "All bathrooms with new taps and floor coverings.",
    "Decken, Fußböden und Treppen im Altbestand.": "Ceilings, floors and stairs original.",
    "Innenausbau teilweise erneuert.": "Interior fit-out partly renewed.",
    "Innenausbau vollständig modernisiert.": "Interior fit-out fully modernised.",
    "Alter Linoleumboden und Holztreppe.": "Old linoleum floor and timber staircase.",
    "Fußböden in zwei Zimmern erneuert.": "Floors in two rooms renewed.",
    "Alle Böden, Decken und Treppen überarbeitet.": "All floors, ceilings and stairs refurbished.",
    "Grundriss unverändert.": "Floor plan unchanged.",
    "Kleinere Verbesserungen der Raumaufteilung.": "Minor improvements to the room layout.",
    "Wesentliche Grundrissverbesserung, z. B. neue Raumzuordnung.": "Significant floor-plan improvement, e.g. new room allocation.",
    "Räume wie im Ursprungsgrundriss.": "Rooms as in the original floor plan.",
    "Tür versetzt, Raum etwas größer.": "Door moved, room slightly larger.",
    "Zwei kleine Zimmer zu einem großen zusammengelegt.": "Two small rooms combined into one large room.",

    /* additions for components outside the BGF */
    "Entscheidungshilfe mit Beispielwerten": "Decision aid with example values",
    "Bauteil": "Component",
    "Hinweis": "Note",
    "Hauseingangstreppe": "Entrance steps",
    "besonders bewertetes Bauteil": "separately valued component",
    "Kelleraußentreppe": "External basement stairs",
    "vom NHK-Kostenkennwert nicht erfasst": "not covered by the NHK cost figure",
    "Nicht mit Schritt 6 verwechseln:": "Do not confuse with step 6:",
    "Presets aus": "Presets from",
    "(Factor = Index ÷ 70,8). Eigene Werte sind möglich.": "(factor = index ÷ 70.8). Custom values are possible.",
    "Gebäudetyp": "Building type",
    "Baunebenkosten (%)": "Baunebenkosten (%)",
    "Die Punkte sind die Destatis-Presets; die gestrichelte Linie markiert den aktuell eingestellten Wert. Zwischen den Quartalen wird nicht interpoliert.": "The points are the Destatis presets; the dashed line marks the currently entered value. No interpolation is performed between quarters.",
    "Extrapolation:": "Extrapolation:",
    "Regression": "Regression",

    /* energy efficiency guidance */
    "Energieeffizienz und Sachwert": "Energy efficiency and Sachwert",
    "Amtliche Grundlagen und Doppelberücksichtigung": "Official basis and avoidance of double counting",
    "Auszug aus ImmoWertV § 2 Abs. 3 Nr. 10d:": "Extract from ImmoWertV § 2(3) No. 10d:",
    "zu den wertbestimmenden Merkmalen zählen „Ausstattung und die Qualität … einschließlich ihrer energetischen Eigenschaften“. Nach § 4 Abs. 3 können Modernisierung und unterlassene Instandhaltung die Restnutzungsdauer verlängern oder verkürzen. § 8 Abs. 3 erfasst Baumängel, Bauschäden und andere erhebliche Abweichungen als besondere objektspezifische Grundstücksmerkmale – ausdrücklich nur, „wenn sie nicht bereits anderweitig berücksichtigt worden sind“.": "\"Fixtures and quality … including their energy-related characteristics\" are among the value-determining features. Under § 4(3), modernisation and neglected maintenance may lengthen or shorten the Restnutzungsdauer. § 8(3) treats structural defects, damage and other significant deviations as besondere objektspezifische Grundstücksmerkmale – expressly only \"if they have not already been taken into account elsewhere\".",
    "ImmoWertA, S. 72–73 (IV.III.1–4):": "ImmoWertA, pp. 72–73 (IV.III.1–4):",
    "Grundstücksmarktbericht Ratingen 2026, Kap. 5.1.5, S. 42:": "Grundstücksmarktbericht Ratingen 2026, chapter 5.1.5, p. 42:",
    "Doppelberücksichtigung vermeiden:": "Avoid double counting:",
    "Erst Ausstattungsstufe/Modernisierung und Restnutzungsdauer prüfen, dann eine verbleibende Abweichung dokumentiert als Merkmal (Schritt 6) oder als Anpassung des Sachwertfaktors (Schritt 5) erfassen. Es gibt keine amtliche Regel des Typs „Klasse G = automatisch −10 % vom Sachwert“.": "First check Ausstattungsstufe/modernisation and Restnutzungsdauer, then record any remaining deviation as a documented feature (step 6) or as an adjustment to the Sachwertfaktor (step 5). There is no official rule of the form \"class G = automatically −10 % of the Sachwert\".",
    "ImmoWertV ↗": "ImmoWertV ↗",
    "ImmoWertA (PDF) ↗": "ImmoWertA (PDF) ↗",
    "Marktstudie als Orientierung – kein amtlicher Sachwertfaktor": "Market study for orientation only – not an official Sachwertfaktor",
    "Die immowelt-Studie 2026 wertet Angebotspreise mit einem hedonichen Modell aus (Referenzklasse D). Die Werte sind": "The 2026 immowelt study analyses listing prices using a hedonic model (reference class D). The figures are",
    "Klasse": "Class",
    "Häuser": "Houses",
    "Eigentumswohnungen": "Flats",
    "Quelle:": "Source:",
    "immowelt, Pressemitteilung 2026 ↗": "immowelt, press release 2026 ↗",

    /* tenancy */
    "Wohnungsrecht & Miete": "Wohnungsrecht & tenancy",
    "Wohnungsrecht und Mietverhältnis": "Wohnungsrecht and tenancy",
    "Optionale rechtliche und ertragsmäßige Belastungen: unentgeltliches Wohnungsrecht oder ein bestehender Mietvertrag.": "Optional legal and income-related burdens: a gratuitous Wohnungsrecht or an existing tenancy.",
    "Bestehendes Mietverhältnis bei der Wertermittlung berücksichtigen": "Take an existing tenancy into account in the valuation",
    "Für selbst genutzte Ein-/Zweifamilienhäuser ist das Sachwertverfahren marktüblich; vermietete Objekte werden regelmäßig im Ertragswertverfahren bewertet. Bleibt das Sachwertmodell, wird nur die Differenz zwischen Vertragsmiete und ortsüblicher Marktmiete über die voraussichtliche Anpassungsdauer abgezinst und als besonderes objektspezifisches Merkmal erfasst (§§ 6, 8 Abs. 3 Nr. 1, 47 Abs. 5 ImmoWertV sinngemäß). „Kauf bricht nicht Miete“ (§ 566 BGB): nicht von sofortigem Leerstand ausgehen.": "The Sachwertverfahren is market-typical for owner-occupied one- and two-family houses; let properties are normally valued with the Ertragswertverfahren. If the Sachwert model is retained, only the difference between contract rent and local market rent is discounted over the expected adjustment period and recorded as a besonderes objektspezifisches Merkmal (§§ 6, 8(3) no. 1, 47(5) ImmoWertV by analogy). \"Kauf bricht nicht Miete\" (§ 566 BGB): do not assume immediate vacancy.",
    "Ist-Miete ist die aktuelle Nettokaltmiete laut Vertrag. Marktmiete ist die ortsüblich erzielbare Nettokaltmiete (Mietspiegel, Gutachterausschuss oder sachverständige Schätzung). Liegt die Ist-Miete darunter, mindert die ausgleichbare Differenz den Wert; liegt sie darüber, erhöht sie den Wert nur für die vertraglich gesicherte Laufzeit. Berücksichtigen Sie § 558 BGB (15 Monate, Kappungsgrenze 20/15 %) und eventuelle Mietpreisbremse (§ 556d BGB). Die Marktmiete darf nicht einfach gleich der Ist-Miete gesetzt werden.": "Ist-Miete is the current net rent exclusive of charges under the contract. Marktmiete is the net rent normally achievable locally (rent index, Gutachterausschuss or expert estimate). If the Ist-Miete is lower, the adjustable difference reduces the value; if higher, it increases the value only for the contractually secured term. Observe § 558 BGB (15 months, 20/15 % cap) and any rent brake (§ 556d BGB). The Marktmiete must not simply be set equal to the Ist-Miete.",
    "Umfang": "Scope",
    "Ganzes Objekt": "Whole property",
    "Teilvermietung": "Partial letting",
    "Nur bei Teilvermietung; Bezug ist die Wohnfläche oben.": "Only for partial letting; based on the living area above.",
    "Ist-Nettekaltmiete (€/Monat)": "Actual net rent (€/month)",
    "Markt-/ortsübliche Miete (€/Monat)": "Market/local rent (€/month)",
    "Anpassungsdauer (Jahre)": "Adjustment period (years)",
    "Ohne konkreten Nachweis 3 Jahre; bei Staffel/Index kürzer.": "3 years without specific evidence; shorter for stepped/indexed rents.",
    "Restlaufzeit (Jahre)": "Remaining term (years)",
    "Kündigungsfrist (Monate)": "Notice period (months)",
    "Abzinsungssatz (% p. a.)": "Discount rate (% p.a.)",
    "Liegenschaftszinssatz des Gutachterausschusses oder begründete Annahme.": "Liegenschaftszinssatz of the Gutachterausschuss or a reasoned assumption.",
    "Risikoabschlag (%)": "Risk deduction (%)",
    "Mietausfall, Bonität, Durchsetzbarkeit; 10–30 % bei Mindermiete.": "Rent default, creditworthiness, enforceability; 10–30 % for below-market rent.",
    "Monatliche Mietdifferenz": "Monthly rent difference",
    "Wirksame Anpassungsdauer": "Effective adjustment period",
    "Barwert der Korrektur": "Present value of the correction",
    "Sachwert nach Mietkorrektur": "Sachwert after rent correction",
    "Kein Mietverhältnis aktiviert – dieser Abschnitt ist deaktiviert.": "No tenancy activated – this section is disabled.",
    "Quellen: ImmoWertV §§ 6, 8, 47 und BGB §§ 556d, 558, 566, 573. Bei § 577a (Kündigungssperrfrist) oder Belegungsbindungen die Laufzeit entsprechend verlängern.": "Sources: ImmoWertV §§ 6, 8, 47 and BGB §§ 556d, 558, 566, 573. Extend the term accordingly for § 577a (notice restriction) or rent-binding obligations.",

    /* age/RND plot */
    "Ende der Nutzung": "End of useful life",
    "GND-Ende": "GND end",
    "Bau": "built",
    "mit Umbau": "with extension",
    "Alter": "age",
    "lineare": "linear",
    "lineares Ende": "linear end",
    "bisher": "elapsed",
    "linear": "linear",
    "Verlängerung": "extension",
    "relatives Alter": "relative age",
    "lineare RND": "linear RND",
    "Anlage-2-Modell wird ab 2 Punkten geprüft": "Anlage 2 model is checked from 2 points",
    "Modellgrenze": "model limit",
    "Modell anwendbar": "model applicable",
    "Modell nicht anwendbar": "model not applicable",
    "Jahre": "years",
    "Schritt": "Step",
    "Prognose": "Forecast",
    "Bodenrichtwert-Entwicklung": "Bodenrichtwert trend",
    "Sachwertfaktor-Kurve": "Sachwertfaktor curve",
    "Baupreisindex-Entwicklung": "Baupreisindex trend",

    /* report */
    "Verkehrswert-Rechner Ratingen · Orientierung, keine amtliche Wertermittlung": "Verkehrswert-Rechner Ratingen · guidance only, not an official valuation",
    "Seite": "Page",
    "Rechenweg (Fortsetzung)": "Calculation path (continued)",
    "Position": "Item",
    "Ansatz": "Basis",
    "Rechenweg": "Calculation path",
    "Hinweise": "Notes",
    "Begriffe und Abkürzungen": "Terms and abbreviations",
    "Quellen und Hinweis": "Sources and note",
    "Kartenübersicht": "Map overview",
    "Diagramme": "Charts",
    "Schritte im Wizard": "Wizard steps",
    "Verkehrswert-Schätzung Ratingen": "Verkehrswert estimate Ratingen",
    "erstellt am": "created on",
    "Objekt": "Property",
    "Grundstücksfläche": "Land area",
    "Bruttogrundfläche": "Gross floor area",
    "Datenquelle": "Data source",
    "Vorläufiger Sachwert": "Preliminary Sachwert",
    "Marktangepasster Sachwert (vor Miete)": "Market-adapted Sachwert (before rent)",
    "Mietdifferenz je Monat": "Rent difference per month",
    "Mietkorrektur (Barwert)": "Rent correction (present value)",
    "Gerundeter Sachwert": "Rounded Sachwert",
    "Exakt": "Exact",
    "Alterswertminderung": "Age-related depreciation",
    "Sachwert mit Wohnungsrecht": "Sachwert with Wohnungsrecht",
    "Achtung": "Caution",
    "Hinweis": "Note",
    "Keine automatischen Hinweise. Bitte alle Angaben fachlich prüfen.": "No automatic notes. Please check all inputs professionally.",
    "manuell überschrieben": "manually overwritten",
    "manuell": "manual",
    "Richtwertzone": "Bodenrichtwert zone",
    "Kartenuntergrund: OpenStreetMap-Mitwirkende; der Punkt ist eine repräsentative Lage, keine amtliche Zonengrenze.": "Map base: OpenStreetMap contributors; the point is a representative location, not an official zone boundary.",
    "keine_zone_ausgewählt": "no zone selected",
    "Bruttogrundfläche nach DIN 277; Bezugsgröße der Normalherstellungskosten.": "Gross floor area under DIN 277; reference unit for the Normalherstellungskosten.",
    "Normalherstellungskosten 2010; modellhafte Kostenkennwerte je Gebäudetyp und Ausstattungsstufe.": "Normalherstellungskosten 2010; model cost values by building type and Ausstattungsstufe.",
    "Gesamtnutzungsdauer; im Modell die Restnutzungsdauer bei Fertigstellung.": "Gesamtnutzungsdauer; in the model the Restnutzungsdauer at completion.",
    "Restnutzungsdauer; erwartete wirtschaftlich sinnvolle Nutzungsdauer ab Stichtag.": "Restnutzungsdauer; expected economically useful life from the Stichtag.",
    "Bodenrichtwert; gebietstypischer Durchschnittswert, kein individueller Kaufpreis.": "Bodenrichtwert; zone-typical average value, not an individual purchase price.",
    "Nummer des Bodenrichtwerts in der Gemeinde gemäß Landesschlüssel; nicht die Flurstücksnummer.": "Number of the Bodenrichtwert in the municipality under the state key; not the Flurstück number.",
    "Baunebenkosten; Planung, Genehmigung, Vermessung und Bauleitung. Im Ratinger Modell 2026 bereits in den NHK enthalten.": "Baunebenkosten; planning, approval, surveying and construction supervision. Already included in the NHK in the Ratingen 2026 model.",
    "Objektspezifisch angepasster Faktor zur marktlichen Anpassung des vorläufigen Sachwerts (§ 39 ImmoWertV).": "Object-specific adjusted factor for the market adaptation of the preliminary Sachwert (§ 39 ImmoWertV).",
    "Sachwertrichtlinie; konkretisiert das Sachwertverfahren, NHK, Alterswertminderung und Modernisierungspunkte.": "Sachwertrichtlinie; specifies the Sachwertverfahren, NHK, age-related depreciation and Modernisierungspunkte.",
    "1. Methodik des Sachwertverfahrens": "1. Method of the Sachwertverfahren",
    "2. Herstellungskosten, NHK 2010 und Baupreisindex": "2. Construction costs, NHK 2010 and Baupreisindex",
    "3. Alterswertminderung und Restnutzungsdauer": "3. Age-related depreciation and Restnutzungsdauer",
    "4. Bodenwert und BORIS-Daten": "4. Land value and BORIS data",
    "5. Marktanpassung mit Sachwertfaktor": "5. Market adaptation with Sachwertfaktor",
    "6. Besondere objektspezifische Merkmale": "6. Besondere objektspezifische Merkmale",
    "9. Quellenverzeichnis": "9. List of sources",
    "Dieses Werkzeug dient der Orientierung und Dokumentation. Es ersetzt kein Verkehrswertgutachten und keine sachverständige Würdigung des Einzelfalls. Bodenrichtwerte sind gebietstypische Durchschnitte, keine Kaufpreise.": "This tool serves guidance and documentation. It does not replace a Verkehrswertgutachten or an expert assessment of the individual case. Bodenrichtwerte are zone-typical averages, not purchase prices.",
    "Die verwendeten Beispielobjekte sind fiktiv und anonymisiert. Es liegen keine veröffentlichten Endwerte zugehöriger Gutachten zum direkten Vergleich vor.": "The example objects are fictitious and anonymised. No published final values of corresponding reports are available for direct comparison.",

    /* composed age/RND and Modernisierungsgrad sentences */
    "Standard-GND {gnd} Jahre: Bau {build}, Stichtag {date}, lineares Ende {end}.": "Standard GND {gnd} years: built {build}, Stichtag {date}, linear end {end}.",
    "{points} Modernisierungspunkte verlängern die RND um {ext} Jahre auf {rnd} Jahre (Ende {end}).": "{points} Modernisation points extend the RND by {ext} years to {rnd} years (end {end}).",
    "{points} Modernisierungspunkte: relatives Alter unter der Grenze; die lineare RND bleibt maßgeblich.": "{points} Modernisation points: relative age below the limit; the linear RND remains decisive.",
    "{points} Modernisierungspunkte erreichen mit der Modellformel keine Verlängerung; die RND bleibt bei {rnd} Jahren.": "{points} Modernisation points produce no extension under the model formula; the RND stays at {rnd} years.",
    "Alterswertminderung {awm}.": "Age-related depreciation {awm}.",
    "{points} Modernisierungspunkte · relatives Alter {age} < Modellgrenze {limit} → Modellformel noch nicht anwendbar; lineare RND {rnd} Jahre.": "{points} Modernisation points · relative age {age} < model limit {limit} → model formula not yet applicable; linear RND {rnd} years.",
    "{points} Modernisierungspunkte · relatives Alter {age} ≥ Modellgrenze {limit} → Modellformel anwendbar: RND {rnd} Jahre, Verlängerung +{ext} Jahre.": "{points} Modernisation points · relative age {age} ≥ model limit {limit} → model formula applicable: RND {rnd} years, extension +{ext} years.",
    "{points} Modernisierungspunkte · relatives Alter {age} ≥ Modellgrenze {limit} → Modellformel anwendbar, aber ohne Verlängerung: RND {rnd} Jahre.": "{points} Modernisation points · relative age {age} ≥ model limit {limit} → model formula applicable, but no extension: RND {rnd} years.",
    "Anlage 2, II.2 verlangt unterhalb von {limit} relativem Alter ausdrücklich RND = GND − Alter. Mit {age} liegt das Gebäude darunter; deshalb bleibt die lineare RND {rnd} Jahre.": "Anlage 2, II.2 explicitly requires RND = GND − Alter below {limit} relative age. At {age} the building is below that limit; therefore the linear RND of {rnd} years remains.",
    "Anlage 2, II.2 wendet die Modellformel ab {limit} relativem Alter an. Mit {age} liegt der Stichtag mindestens auf der Grenze; deshalb ergibt das Modell RND {rnd} Jahre und verlängert die lineare RND um {ext} Jahre. Unterhalb der Grenze würde RND = GND − Alter gelten.": "Anlage 2, II.2 applies the model formula from {limit} relative age. At {age} the Stichtag is at or above the limit; therefore the model gives RND {rnd} years and extends the linear RND by {ext} years. Below the limit, RND = GND − Alter would apply.",
    "Anlage 2, II.2 wendet die Modellformel ab {limit} relativem Alter an. Mit {age} liegt der Stichtag mindestens auf der Grenze, das Modell ergibt aber keine Verlängerung; die RND bleibt bei {rnd} Jahren.": "Anlage 2, II.2 applies the model formula from {limit} relative age. At {age} the Stichtag is at or above the limit, but the model gives no extension; the RND stays at {rnd} years.",
    "Modernisierungsgrad: {grade} ({range}) · {points} Modernisierungspunkte": "Modernisierungsgrad: {grade} ({range}) · {points} Modernisation points",
    "Aus {points} Modernisierungspunkten ergibt sich nach Tabelle 2 der Anlage 2 ImmoWertV der Modernisierungsgrad {grade} ({range}).": "From {points} Modernisation points, Table 2 of Anlage 2 ImmoWertV gives the Modernisierungsgrad {grade} ({range}).",
    "Nach Tabelle 2 der Anlage 2 ImmoWertV ergibt sich aus {points} Modernisierungspunkten der Modernisierungsgrad {grade} ({range}).": "Under Table 2 of Anlage 2 ImmoWertV, {points} Modernisation points give the Modernisierungsgrad {grade} ({range}).",
    "Anlage 2, II.2 (Auszug): „Liegt das relative Alter unterhalb des in der Tabelle 3 angegebenen Wertes, gilt für die Ermittlung der Restnutzungsdauer die Formel: RND = GND − Alter.“ Das ist der Grund für die Grenze: unterhalb wird linear gerechnet, ab dem Tabellenwert wird die Modellformel angewendet.": "Anlage 2, II.2 (extract): “If the relative age is below the value stated in Table 3, the formula for determining the Restnutzungsdauer is: RND = GND − Alter.” This is the reason for the limit: below it the linear rule is used, from the table value the model formula is applied.",
    "Warum wird das Anlage-2-Modell angewendet – oder nicht?": "Why is the Anlage 2 model applied – or not?",
    "Die Grenze ist keine willkürliche Einstellung des Rechners. Anlage 2 zu § 12 Abs. 5 ImmoWertV, Tabelle 3, nennt für jede Modernisierungspunktzahl von 0 bis 20 ein relatives Alter, ab dem die Modellformel gilt.": "The limit is not an arbitrary calculator setting. Anlage 2 to § 12(5) ImmoWertV, Table 3, gives for every Modernisierungspunktzahl from 0 to 20 a relative age from which the model formula applies.",
    "ImmoWertV, Anlage 2, II.2: „Liegt das relative Alter unterhalb des in der Tabelle 3 angegebenen Wertes, gilt für die Ermittlung der Restnutzungsdauer die Formel: RND = GND − Alter.“": "ImmoWertV, Anlage 2, II.2: “If the relative age is below the value stated in Table 3, the formula for determining the Restnutzungsdauer is: RND = GND − Alter.”",
    "Darum gilt: relatives Alter unterhalb der Grenze → lineare RND; relatives Alter mindestens auf der Grenze → Modellformel. Der Rechner vergleicht Alter ÷ GND genau mit diesem Tabellenwert.": "Therefore: relative age below the limit → linear RND; relative age at or above the limit → model formula. The tool compares Alter ÷ GND with exactly that table value.",
    "ImmoWertV, Anlage 2 und Tabelle 3 (PDF) ↗": "ImmoWertV, Anlage 2 and Table 3 (PDF) ↗",
    "ImmoWertV online, § 4 Abs. 3 und Anlage 2 ↗": "ImmoWertV online, § 4(3) and Anlage 2 ↗",
    "Anlage 2 zu § 12 Abs. 5 ImmoWertV, Tabelle 3 (Auszug): „ab einem relativen Alter von“. Die Modellformel gilt erst ab dem für die Modernisierungspunktzahl genannten relativen Alter; darunter bleibt RND = GND − Alter. Die Tabelle steht in der offiziellen ImmoWertV-Fassung bei gesetze-im-internet.de (ImmoWertV 2022).": "Anlage 2 to § 12(5) ImmoWertV, Table 3 (extract): 'from a relative age of'. The model formula applies only from the relative age listed for the Modernisierungspunktzahl; below it RND = GND − Alter remains. The table is in the official ImmoWertV version at gesetze-im-internet.de (ImmoWertV 2022).",

    /* PDF input-detail tables and results */
    "7. Ausstattungsstufe und NHK-2010-Gewichtung": "7. Fittings level and NHK 2010 weighting",
    "8. Modernisierungspunkte und Modernisierungsgrad": "8. Modernisation points and Modernisierungsgrad",
    "Die Ausstattungsstufen 1–5 werden je Gewerk mit den NHK-2010-Gewichten gewichtet. Halbschritte gehören zur unteren ganzen Stufe; der gewichtete Wert selbst bleibt erhalten und wird in den Kostenkennwert des gewählten Gebäudetyps interpoliert.": "Fittings levels 1–5 are weighted per trade using the NHK 2010 weights. Half steps belong to the lower whole level; the weighted value itself is retained and interpolated into the cost figure of the selected building type.",
    "Modernisierungspunkte werden je Maßnahme mit 0 bis zur angegebenen Höchstzahl erfasst (Anlage 2, Tabelle 1). Die Summe von 0 bis 20 Punkten ergibt nach Tabelle 2 den Modernisierungsgrad.": "Modernisation points are recorded per measure from 0 up to the stated maximum (Anlage 2, Table 1). The total of 0 to 20 points gives the Modernisierungsgrad under Table 2.",
    "Ergebnis Restnutzungsdauer: {rnd} Jahre · Alterswertminderung: {awm} · Rechenweg: {method}": "Resulting Restnutzungsdauer: {rnd} years · Alterswertminderung: {awm} · Method: {method}",
    "ImmoWertV-Anlage-2-Modell ({points} Punkte)": "ImmoWertV-Anlage-2 model ({points} points)",
    "Ausstattungsstufe (gewichtet)": "Fittings level (weighted)",
    "Gewichtete Ausstattungsstufe": "Weighted fittings level",
    "NHK-Basiskostenkennwert": "NHK base cost figure",
    "Gewerk": "Trade",
    "Stufe": "Level",
    "Gewicht": "Weight",
    "Bedeutung / Beispiel (NHK 2010)": "Meaning / example (NHK 2010)",
    "Maßnahme": "Measure",
    "Punkte": "points",
    "Bedeutung": "Meaning",
    "Beispiel": "Example",
    "nicht modernisiert": "not modernised",
    "kleine Modernisierungen im Rahmen der Instandhaltung": "minor modernisation as part of maintenance",
    "mittlerer Modernisierungsgrad": "medium Modernisierungsgrad",
    "überwiegend modernisiert": "largely modernised",
    "umfassend modernisiert": "comprehensively modernised",
    "0 bis 1 Punkt": "0 to 1 point",
    "2 bis 5 Punkte": "2 to 5 points",
    "6 bis 10 Punkte": "6 to 10 points",
    "11 bis 17 Punkte": "11 to 17 points",
    "18 bis 20 Punkte": "18 to 20 points"
  };

  // Spanish dictionary lives in its own file so the English one stays readable.
  var DICT_ES = global.VW_I18N_ES || {};
  var DICTS = { en: DICT, es: DICT_ES };
  var LANGS = ["de", "en", "es"];

  // Longest keys first so "vorläufiger Sachwert" is translated before
  // the shorter "Sachwert" inside the same string.
  var SORTED_KEYS = {};
  Object.keys(DICTS).forEach(function (lang) {
    SORTED_KEYS[lang] = Object.keys(DICTS[lang]).sort(function (a, b) { return b.length - a.length; });
  });

  var PATTERNS = {
    en: {
      prefixes: [
        ["Bedeutung: ", "Meaning: "],
        ["Beispiel: ", "Example: "],
        ["Achtung: ", "Caution: "],
        ["Hinweis: ", "Note: "]
      ],
      points: " points",
      stufe: "Level "
    },
    es: {
      prefixes: [
        ["Bedeutung: ", "Significado: "],
        ["Beispiel: ", "Ejemplo: "],
        ["Achtung: ", "Precaución: "],
        ["Hinweis: ", "Nota: "]
      ],
      points: " puntos",
      stufe: "Nivel "
    }
  };

  // German legal/technical terms stay German even when a shorter German word
  // inside them has a translation (e.g. "Ort" -> "City" must not corrupt
  // "Ortsteil"). Protected longest-first before substring replacement.
  var KEEP_GERMAN = [
    "Grundstücksmarktbericht", "Bodenrichtwertzone", "Bodenrichtwert",
    "Modernisierungspunktzahl", "Modernisierungspunkte", "Modernisierungsgrad",
    "Modernisierungen", "Modernisierung", "modernisiert", "Punkte", "Punkt",
    "Restnutzungsdauer", "Gesamtnutzungsdauer", "Sachwertrichtlinie",
    "Sachwertfaktor", "Verkehrswert", "Baunebenkosten", "Wohnungsrecht",
    "Baupreisindex", "ImmoWertV", "Sachwert", "Gemarkung", "Flurstück",
    "Stichtag", "Ortsteil", "Anlage 2", "Tabelle 2", "Tabelle 3",
    "Alterswertminderung", "Gebäudealter", "Alter",
    "Flur", "WNUM", "NHK", "RND", "GND"
  ].sort(function (a, b) { return b.length - a.length; });

  function lookup(text, dict) {
    return Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : null;
  }

  // Translate a single string. Exact matches first, then known prefix/suffix
  // patterns, then longest-first substring replacement for composed strings
  // such as "2 Hinweis(e) im Ergebnisplan aufgeführt." or "3 Jahre".
  function t(text) {
    if (current === "de" || typeof text !== "string") return text;
    var dict = DICTS[current];
    var sorted = SORTED_KEYS[current];
    var patterns = PATTERNS[current];
    if (!dict || !sorted || !patterns) return text;

    var trimmed = text.trim();
    var hit = lookup(trimmed, dict);
    if (hit !== null) return text.replace(trimmed, hit);

    for (var i = 0; i < patterns.prefixes.length; i++) {
      var at = text.indexOf(patterns.prefixes[i][0]);
      if (at !== -1) {
        var before = text.slice(0, at);
        var after = text.slice(at + patterns.prefixes[i][0].length);
        return before + patterns.prefixes[i][1] + t(after);
      }
    }

    if (trimmed.slice(-7) === " Punkte") {
      var atPoints = text.lastIndexOf(" Punkte");
      return text.slice(0, atPoints) + patterns.points + text.slice(atPoints + 7);
    }
    if (trimmed.indexOf("Stufe ") === 0) {
      return text.replace("Stufe ", patterns.stufe);
    }

    var result = text;
    var protectedTerms = [];
    KEEP_GERMAN.forEach(function (term, index) {
      var token = "\u0001" + index + "\u0002";
      if (result.indexOf(term) !== -1) {
        result = result.split(term).join(token);
        protectedTerms.push({ token: token, term: term });
      }
    });
    for (var k = 0; k < sorted.length; k++) {
      var key = sorted[k];
      if (result.indexOf(key) !== -1) {
        result = result.split(key).join(dict[key]);
      }
    }
    protectedTerms.forEach(function (item) {
      result = result.split(item.token).join(item.term);
    });
    return result;
  }

  function isExcluded(node) {
    var parent = node.parentElement;
    if (!parent) return true;
    var tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") return true;
    // The language button labels itself; translating it again would undo that.
    return !!(parent.closest && parent.closest("#langBtn"));
  }

  // Translate all text nodes and selected attributes under root.
  function apply(root) {
    if (current === "de") return;
    root = root || document.body;
    if (!root) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return isExcluded(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) {
      if (!nodeOriginals.has(node)) nodeOriginals.set(node, node.nodeValue);
      var translated = t(nodeOriginals.get(node));
      if (node.nodeValue !== translated) node.nodeValue = translated;
    }

    // Translate a small set of attributes (placeholders / ARIA labels / titles).
    var attrs = ["placeholder", "aria-label", "title"];
    Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) {
      if (el.id === "langBtn") return;
      var stored = attrOriginals.get(el);
      if (!stored) { stored = {}; attrOriginals.set(el, stored); }
      attrs.forEach(function (attr) {
        var value = el.getAttribute(attr);
        if (value === null) return;
        if (!Object.prototype.hasOwnProperty.call(stored, attr)) stored[attr] = value;
        var translated = t(stored[attr]);
        if (value !== translated) el.setAttribute(attr, translated);
      });
    });
  }

  // Restore German text by re-applying the stored originals.
  function restore(root) {
    root = root || document.body;
    if (!root) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return isExcluded(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      if (nodeOriginals.has(node)) node.nodeValue = nodeOriginals.get(node);
    }
    Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) {
      if (el.id === "langBtn") return;
      var stored = attrOriginals.get(el);
      if (!stored) return;
      Object.keys(stored).forEach(function (attr) {
        if (el.hasAttribute(attr)) el.setAttribute(attr, stored[attr]);
      });
    });
  }

  // Drop stored originals for a subtree whose text was changed programmatically
  // (e.g. the theme icon), so the next apply() treats the new German strings as
  // the values to translate.
  function forget(root) {
    if (!root) return;
    attrOriginals.delete(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) nodeOriginals.delete(node);
    Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) {
      attrOriginals.delete(el);
    });
  }

  function getLanguage() { return current; }

  function nextLanguage() {
    var index = LANGS.indexOf(current);
    return LANGS[(index + 1) % LANGS.length];
  }

  function setLanguage(lang) {
    current = lang === "en" || lang === "es" ? lang : "de";
    try { localStorage.setItem(LANG_KEY, current); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute("lang", current);
    if (current === "de") restore(document.body);
    else apply(document.body);
    updateButton();
    return current;
  }

  function updateButton() {
    var button = document.getElementById("langBtn");
    if (!button) return;
    // The badge shows the language currently displayed, not the next one.
    // Clicking still cycles DE -> EN -> ES -> DE.
    var label = current.toUpperCase();
    var aria = current === "de"
      ? "Sprache: Deutsch"
      : current === "en"
        ? "Language: English"
        : "Idioma: Español";
    button.textContent = label;
    button.setAttribute("aria-label", aria);
    button.setAttribute("title", aria);
    button.setAttribute("data-lang", current);
  }

  function init() {
    try {
      var storedLang = localStorage.getItem(LANG_KEY);
      if (LANGS.indexOf(storedLang) !== -1) current = storedLang;
    } catch (e) { /* ignore */ }
    document.documentElement.setAttribute("lang", current);
    updateButton();
  }

  global.VW_I18N = {
    t: t,
    apply: apply,
    restore: restore,
    forget: forget,
    getLanguage: getLanguage,
    nextLanguage: nextLanguage,
    setLanguage: setLanguage,
    init: init
  };
})(window);
