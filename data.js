/*
 * Market data and valuation parameters extracted from the supplied PDFs and
 * official ImmoWertV/SW-RL material and the Destatis Baupreisindex series.
 *
 * All values are embedded so that index.html works from file:// without a
 * server or any external dependency.
 */
(function (global) {
  "use strict";

  var standardWeights = [
    {
      key: "walls", label: "Außenwände", weight: 0.23,
      explanations: [
        "Einfacher, ungedämmter Massiv- oder Holzbau ohne anspruchsvolle Oberfläche.",
        "Massivwand mit einfacher Dämmung und einfachem Putz oder Verkleidung.",
        "Üblicher Baustandard mit Wärmedämmung und normalem Putz oder Verkleidung.",
        "Verbesserte Dämmung, hochwertiger Putz, Naturstein- oder Klinkerbereiche.",
        "Sehr hochwertige, aufwendig gestaltete Fassade mit Premiummaterialien."
      ],
      examples: [
        "Einfamilienhaus aus den 1950ern, 24-cm-Mauerwerk ohne Dämmung.",
        "Baujahr 1980, 30-cm-Mauerwerk mit einfacher Dämmung und Putz.",
        "Neubau mit 36-cm-Ziegel, Dämmung und mineralischem Putz.",
        "Klinkerfassade mit Dämmung und aufwendigen Fensterbänken.",
        "Natursteinfassade, architektonisch aufwendig geplant und ausgeführt."
      ]
    },
    {
      key: "roof", label: "Dach", weight: 0.15,
      explanations: [
        "Einfaches Satteldach ohne Dämmung und mit einfacher Eindeckung.",
        "Satteldach mit einfacher Dämmung und Standardziegeln.",
        "Gedämmtes Dach, konventionelle Eindeckung, normale Dachrinnen.",
        "Hochwertige Eindeckung, bessere Dämmung und aufwendige Details.",
        "Aufwendige Dachform mit Premiumeindeckung und integrierten Dachfenstern."
      ],
      examples: [
        "Altes Satteldach mit ungedämmter Schalung und Betondachsteinen.",
        "Dachsanierung in den 1990ern mit einfacher Zwischensparrendämmung.",
        "Neubau mit 20-cm-Dämmung und handelsüblichen Tonziegeln.",
        "Schiefer- oder Zementziegeldeckung mit aufwendigen Ortgangdetails.",
        "Walmdach mit Titanzink, Solarpaneele und drei hochwertigen Dachfenstern."
      ]
    },
    {
      key: "windows", label: "Fenster und Außentüren", weight: 0.11,
      explanations: [
        "Einfachverglasung oder alte Isolierverglasung in einfachen Profilen.",
        "Isolierverglasung, Kunststoffprofile und einfache Haustür.",
        "Wärmeschutzverglasung, solide Profile und qualitativ gute Eingangstür.",
        "Hochwertige Wärmeschutzverglasung, designorientierte Profile, edle Haustür.",
        "Passivhaus-taugliche Fenster, aufwendige Holz-Alu-Profile, repräsentative Tür."
      ],
      examples: [
        "Fenster aus den 1970ern mit Einfachscheiben und Holzrahmen.",
        "Kunststofffenster mit 2-fach-Verglasung und einfache Holzhaustür.",
        "Kunststoff-Alu-Fenster mit 2-fach-Wärmeschutzglas und Sicherheitshaustür.",
        "Holz-Alu-Fenster mit 3-fach-Verglasung und Design-Eingangstür.",
        "Passivhausfenster mit 3-fach-Verglasung, Motorsteuerung und Naturstein-Türumfassung."
      ]
    },
    {
      key: "innerWalls", label: "Innenwände und -türen", weight: 0.11,
      explanations: [
        "Einfache Trennwände, lackierte Holztüren ohne besondere Details.",
        "Massive Innenwände, einfache Türen mit Standardbeschlägen.",
        "Putz oder Trockenbau in Normalqualität, Türen mit weißer Oberfläche.",
        "Hochwertige Oberflächen, designorientierte Türen und gute Schallentkopplung.",
        "Aufwendige Innenausbauten, maßgefertigte Türen und High-End-Beschläge."
      ],
      examples: [
        "Raumteiler aus Spachtelputz und einfache Schlagtüren aus dem Baujahr.",
        "Mauerwerk mit Gipsputz, Türen mit einfachem weißem Lack.",
        "Trockenbauwände mit Standarddämmung und grifflosen Innentüren.",
        "Holzfurnierte Türen, satinierte Beschläge und schallgedämmte Wandanschlüsse.",
        "Maßgefertigte Eichentüren, verdeckte Drehtüren und Design-Griffe aus Edelstahl."
      ]
    },
    {
      key: "ceilings", label: "Deckenkonstruktion und Treppen", weight: 0.11,
      explanations: [
        "Einfache Beton- oder Holzdecke, gerade Holztreppe ohne Belag.",
        "Betondecke, einfache Treppe mit Standardgeländer.",
        "Übliche Deckenkonstruktion, Treppe mit solidem Aufbau und Handlauf.",
        "Hochwertige Treppenanlage, gute Akustikdecke und saubere Details.",
        "Aufwendige Treppe, Design-Geländer und anspruchsvolle Deckengestaltung."
      ],
      examples: [
        "Sichtbare Betondecke und gerade Holztreppe mit einfachem Handlauf.",
        "Abgehängte Gipskartondecke, Treppe mit Laminatbelag und Holzgeländer.",
        "Gedämmte Decke, Betontreppe mit Natursteinbelag und Edelstahlhandlauf.",
        "Schwebende Treppe mit Eichenstufen und indirekter Beleuchtung.",
        "Gewendelte Treppe mit Glasgeländer und aufwendiger Deckenausleuchtung."
      ]
    },
    {
      key: "floors", label: "Fußböden", weight: 0.05,
      explanations: [
        "Einfacher Estrich mit Linoleum oder einfachen Fliesen.",
        "Standardbelag wie Laminat oder Fliesen in einfacher Qualität.",
        "Üblicher hochwertiger Belag mit Designboden oder Fliesen und Sockelleisten.",
        "Hochwertiger Belag, zum Beispiel Echtholzdielen oder Feinsteinzeug.",
        "Premiummaterialien und aufwendige Verlegung, zum Beispiel Naturstein mit Mosaik."
      ],
      examples: [
        "Linoleumboden aus den 1980ern in Flur und Wohnraum.",
        "Laminat in 8 mm mit einfachen Sockelleisten.",
        "Designboden in 12 mm und großformatige Fliesen im Bad.",
        "Eichen-Dielenboden mit geölter Oberfläche und passenden Sockelleisten.",
        "Naturstein-Mosaik im Eingangsbereich und durchgehender Eichenparkett."
      ]
    },
    {
      key: "sanitary", label: "Sanitäreinrichtungen", weight: 0.09,
      explanations: [
        "Einfache Ausstattung mit einer Dusche, WC und Standardarmaturen.",
        "Zwei Bäder in Standardqualität, einfache Fliesen und Standardarmaturen.",
        "Übliche Ausstattung mit Dusche, Wanne und Waschtisch, marktübliche Armaturen.",
        "Hochwertige Sanitärkeramik, aufwendige Fliesen und designorientierte Armaturen.",
        "Premium-Sanitärausstattung in mehreren Bädern mit individueller Planung."
      ],
      examples: [
        "Ein Bad mit Duschwanne, einfachem Waschtisch und Spiegel Schrank.",
        "Zwei Bäder mit Standardfliesen, Markenarmaturen und Weißkeramik.",
        "Dusche plus Badewanne, Markenarmaturen und bodengleiche Dusche.",
        "Aufsteinwaschtische, Designarmaturen und großformatige Feinsteinzeugfliesen.",
        "Drei individuell geplante Bäder mit Naturstein, Regendusche und Einbaugeräten."
      ]
    },
    {
      key: "heating", label: "Heizung", weight: 0.09,
      explanations: [
        "Alte Heizung, zum Beispiel Einöfen oder veraltete Zentralheizung ohne Steuerung.",
        "Einfache Zentralheizung mit Standardkessel und manueller Steuerung.",
        "Moderne Brennwertheizung mit Zeitsteuerung und normalen Radiatoren.",
        "Effiziente Heizung mit App-Steuerung und hochwertigen Heizkörpern oder Flächenheizung.",
        "Sehr effizientes System mit Wärmepumpe, Speicher und smarter Steuerung."
      ],
      examples: [
        "Ölheizung aus den 1970ern mit Einzelöfen im Wohnbereich.",
        "Gasheizung aus den 1990ern mit einfachem Raumthermostat.",
        "Brennwert-Gasheizung mit Zeitprogramm und Standard-Radiatoren.",
        "Brennwertheizung mit Fernbedienung, Fußbodenheizung im Bad und Designheizkörpern.",
        "Luft-Wasser-Wärmepumpe mit Pufferspeicher, Photovoltaik und Smart-Home-Steuerung."
      ]
    },
    {
      key: "technical", label: "Sonstige technische Ausstattung", weight: 0.06,
      explanations: [
        "Kaum technische Ausstattung, einfache Elektroinstallation.",
        "Standard-Elektroinstallation, einfache Lüftung, keine Smart-Home-Funktionen.",
        "Zeitgemäße Elektroinstallation, Photovoltaik oder Lüftung möglich, solide Steuerung.",
        "Erweiterte technische Ausstattung mit Photovoltaik, Lüftung und Smart-Home-Grundausstattung.",
        "Umfassende technische Ausstattung mit Photovoltaik, Speicher, Lüftung und Smart-Home."
      ],
      examples: [
        "Alte Sicherungen, wenige Steckdosen und kein Lüftungssystem.",
        "Neue Sicherungen, Standard-Schalter und einfache Badlüfter.",
        "Moderne Verteilung, Photovoltaik auf dem Dach und programmierbare Lüftung.",
        "Photovoltaik, Batteriespeicher, Lüftungsanlage und smartes Heizungsinterface.",
        "Vollintegriertes Smart-Home mit PV, Speicher, Lüftung, Rollläden und Energiemonitoring."
      ]
    }
  ];

  var modernizationElements = [
    {
      key: "roof", label: "Dacherneuerung inkl. Wärmedämmung", max: 4,
      explanations: [
        "Keine Dacherneuerung; Dach und Dämmung im Bestandszustand.",
        "Teilmaßnahme oder geringe Verbesserung der Wärmedämmung.",
        "Dach erneuert, Wärmedämmung teilweise verbessert.",
        "Dach und Dämmung überwiegend erneuert.",
        "Vollständige Dacherneuerung mit zeitgemäßer Wärmedämmung."
      ],
      examples: [
        "Dachhaut und Dämmung noch aus dem Baujahr.",
        "Einzelne Dachziegel ersetzt.",
        "Neue Dachhaut, alte Dämmung teilweise belassen.",
        "Große Dachfläche neu gedämmt, kleine Restfläche alt.",
        "Komplettes Dach inklusive Dämmung erneuert."
      ]
    },
    {
      key: "windows", label: "Fenster und Außentüren", max: 2,
      explanations: [
        "Fenster und Türen im Altbestand, nicht mehr zeitgemäß.",
        "Teilweise erneuert, z. B. einzelne Fenster oder eine Tür.",
        "Fenster und Außentüren vollständig erneuert."
      ],
      examples: [
        "Alte Einfachverglasung noch vorhanden.",
        "Wohnzimmerfenster getauscht.",
        "Alle Fenster und die Haustür mit moderner Verglasung."
      ]
    },
    {
      key: "utilities", label: "Leitungssysteme (Strom, Gas, Wasser, Abwasser)", max: 2,
      explanations: [
        "Leitungssysteme überwiegend im Ursprungszustand.",
        "Einzelne Systeme teilweise modernisiert.",
        "Strom, Gas, Wasser und Abwasser vollständig modernisiert."
      ],
      examples: [
        "Alte Strom- und Wasserleitungen unverändert.",
        "Elektroinstallation in der Küche erneuert.",
        "Alle Leitungen und Zähler getauscht."
      ]
    },
    {
      key: "heating", label: "Heizungsanlage", max: 2,
      explanations: [
        "Alte Heizungsanlage, nicht auf aktuellem Stand.",
        "Heizung teilweise erneuert oder modernisiert.",
        "Neue Heizungsanlage auf aktuellem technischen Stand."
      ],
      examples: [
        "Veralteter Ölkessel noch in Betrieb.",
        "Neue Heizungspumpe und Regelung installiert.",
        "Moderne Gas- oder Wärmepumpenanlage eingebaut."
      ]
    },
    {
      key: "wallInsulation", label: "Wärmedämmung der Außenwände", max: 4,
      explanations: [
        "Keine Außenwanddämmung vorhanden.",
        "Erste Verbesserungen, z. B. in Teilbereichen.",
        "Außenwände teilweise gedämmt, noch nicht durchgängig.",
        "Überwiegend gedämmt, einzelne Bereiche bleiben offen.",
        "Vollständige, zeitgemäße Außenwanddämmung."
      ],
      examples: [
        "Ungedämmtes Mauerwerk.",
        "Dämmung an einer Außenwand angebracht.",
        "Zwei von vier Außenwänden gedämmt.",
        "Nur noch schmale Bereiche ungedämmt.",
        "Alle Außenwände durchgängig gedämmt."
      ]
    },
    {
      key: "bathrooms", label: "Modernisierung von Bädern", max: 2,
      explanations: [
        "Bäder im Bestandszustand ohne Modernisierung.",
        "Einzelne Bäder teilweise modernisiert.",
        "Bäder vollständig modernisiert."
      ],
      examples: [
        "Alte Fliesen und Armaturen.",
        "Gäste-WC neu gefliest.",
        "Alle Bäder mit neuen Armaturen und Bodenbelägen."
      ]
    },
    {
      key: "interior", label: "Innenausbau (Decken, Fußböden, Treppen)", max: 2,
      explanations: [
        "Decken, Fußböden und Treppen im Altbestand.",
        "Innenausbau teilweise erneuert.",
        "Innenausbau vollständig modernisiert."
      ],
      examples: [
        "Alter Linoleumboden und Holztreppe.",
        "Fußböden in zwei Zimmern erneuert.",
        "Alle Böden, Decken und Treppen überarbeitet."
      ]
    },
    {
      key: "layout", label: "Wesentliche Grundrissverbesserung", max: 2,
      explanations: [
        "Grundriss unverändert.",
        "Kleinere Verbesserungen der Raumaufteilung.",
        "Wesentliche Grundrissverbesserung, z. B. neue Raumzuordnung."
      ],
      examples: [
        "Räume wie im Ursprungsgrundriss.",
        "Tür versetzt, Raum etwas größer.",
        "Zwei kleine Zimmer zu einem großen zusammengelegt."
      ]
    }
  ];

  // ImmoWertV, Anlage 2, Tabelle 2: sachverständige Einschätzung des
  // Modernisierungsgrades. The selected total point count maps to one grade.
  var modernizationGrades = [
    { min: 0,  max: 1,  label: "nicht modernisiert", range: "0 bis 1 Punkt" },
    { min: 2,  max: 5,  label: "kleine Modernisierungen im Rahmen der Instandhaltung", range: "2 bis 5 Punkte" },
    { min: 6,  max: 10, label: "mittlerer Modernisierungsgrad", range: "6 bis 10 Punkte" },
    { min: 11, max: 17, label: "überwiegend modernisiert", range: "11 bis 17 Punkte" },
    { min: 18, max: 20, label: "umfassend modernisiert", range: "18 bis 20 Punkte" }
  ];

  // ImmoWertV, Anlage 2 (RND model). "abRelAlter" is the relative age from
  // which the formula may be used ("ab einem relativen Alter von", Tabelle 3);
  // below it the linear GND - age applies.
  var rndParameters = [
    { points: 0,  a: 1.25,   b: 2.625,  c: 1.525,  abRelAlter: 0.60 },
    { points: 1,  a: 1.25,   b: 2.625,  c: 1.525,  abRelAlter: 0.60 },
    { points: 2,  a: 1.0767, b: 2.2757, c: 1.3878, abRelAlter: 0.55 },
    { points: 3,  a: 0.9033, b: 1.9263, c: 1.2505, abRelAlter: 0.55 },
    { points: 4,  a: 0.73,   b: 1.577,  c: 1.1133, abRelAlter: 0.40 },
    { points: 5,  a: 0.6725, b: 1.4578, c: 1.085,  abRelAlter: 0.35 },
    { points: 6,  a: 0.615,  b: 1.3385, c: 1.0567, abRelAlter: 0.30 },
    { points: 7,  a: 0.5575, b: 1.2193, c: 1.0283, abRelAlter: 0.25 },
    { points: 8,  a: 0.5,    b: 1.1,    c: 1.0,    abRelAlter: 0.20 },
    { points: 9,  a: 0.466,  b: 1.027,  c: 0.9906, abRelAlter: 0.19 },
    { points: 10, a: 0.432,  b: 0.954,  c: 0.9811, abRelAlter: 0.18 },
    { points: 11, a: 0.398,  b: 0.881,  c: 0.9717, abRelAlter: 0.17 },
    { points: 12, a: 0.364,  b: 0.808,  c: 0.9622, abRelAlter: 0.16 },
    { points: 13, a: 0.33,   b: 0.735,  c: 0.9528, abRelAlter: 0.15 },
    { points: 14, a: 0.304,  b: 0.676,  c: 0.9506, abRelAlter: 0.14 },
    { points: 15, a: 0.278,  b: 0.617,  c: 0.9485, abRelAlter: 0.13 },
    { points: 16, a: 0.252,  b: 0.558,  c: 0.9463, abRelAlter: 0.12 },
    { points: 17, a: 0.226,  b: 0.499,  c: 0.9442, abRelAlter: 0.11 },
    { points: 18, a: 0.2,    b: 0.44,   c: 0.942,  abRelAlter: 0.10 },
    { points: 19, a: 0.2,    b: 0.44,   c: 0.942,  abRelAlter: 0.10 },
    { points: 20, a: 0.2,    b: 0.44,   c: 0.942,  abRelAlter: 0.10 }
  ];

  // NHK 2010 cost classes (EUR/m2 BGF) from Anlage 4 ImmoWertV and the Sachwertrichtlinie.
  var nhkTypes = {
    "1.11": {
      label: "1.11 Freistehendes Einfamilienhaus",
      levels: [655, 725, 835, 1005, 1260]
    },
    "2.11": {
      label: "2.11 Doppel- und Reihenendhaus",
      levels: [615, 685, 785, 945, 1180]
    },
    "2.31": {
      label: "2.31 Reihenendhaus",
      levels: [675, 750, 865, 1040, 1300]
    },
    "3.01": {
      label: "3.01 Reihenmittelhaus",
      levels: [497, 553, 635, 765, 955]
    },
    "4.1": {
      label: "4.1 Mehrfamilienhaus (bis 6 Wohnungen)",
      levels: [null, null, 825, 985, 1190]
    }
  };

  var overdepthFactors = [
    { max: 5,  factor: 0.50, label: "bis 5 m" },
    { max: 10, factor: 0.40, label: "10 m" },
    { max: 15, factor: 0.34, label: "15 m" },
    { max: 20, factor: 0.29, label: "20 m" },
    { max: 25, factor: 0.25, label: "25 m" },
    { max: 30, factor: 0.23, label: "30 m" },
    { max: 35, factor: 0.20, label: "35 m" },
    { max: 40, factor: 0.18, label: "40 m" },
    { max: 45, factor: 0.16, label: "45 m" },
    { max: 50, factor: 0.15, label: "50 m" }
  ];

  var marketReports = {
    "2026": {
      label: "Grundstücksmarktbericht 2026 (Beschluss 01.01.2026)",
      resolution: "2026-01-01",
      bodenrichtwerte: {
        wohn12: { gut: 790, mittel: 725, maessig: 585 },
        wohn3:  { gut: 730, mittel: 695, maessig: null },
        gewerbe: { gut: 240, mittel: 160, maessig: 120 },
        buero: { gut: 650, mittel: 295, maessig: null },
        gemischtRinge: 850,
        gemischtSonstige: 770,
        kern: 950,
        aussenbereich: 145,
        landwirtschaft: 9,
        forst: 1.5
      },
      factors: {
        parameter: {
          efh: { a: 3.0131, b: -0.084, sigma: 0.14, n: 70, label: "Freistehende Ein-/Zweifamilienhäuser" },
          dhh: { a: 0.176, b: 0.1413, sigma: 0.21, n: 56, label: "Doppelhaushälften" },
          reh: { a: 22.729, b: -0.227, sigma: 0.19, n: 30, label: "Reihenendhäuser" },
          rmh: { a: 11.247, b: -0.167, sigma: 0.22, n: 48, label: "Reihenmittelhäuser" }
        },
        x: [150000, 175000, 200000, 225000, 250000, 275000, 300000, 325000, 350000, 375000, 400000, 425000, 450000, 475000, 500000, 550000, 600000, 650000, 700000, 750000, 800000, 850000, 900000, 950000, 1000000, 1100000, 1200000, 1300000],
        efh:  [null, null, null, null, null, null, 1.04, 1.04, 1.03, 1.03, 1.02, 1.01, 1.01, 1.01, 1.00, 0.99, 0.99, 0.98, 0.97, 0.97, 0.96, 0.96, 0.95, 0.95, 0.94, 0.94, 0.93, 0.92],
        dhh:  [null, null, null, 1.00, 1.02, 1.03, 1.05, 1.06, 1.07, 1.08, 1.09, 1.10, 1.11, 1.12, 1.12, 1.14, 1.15, 1.17, 1.18, 1.19, 1.20, null, null, null, null, null, null, null],
        reh:  [null, null, 1.42, 1.39, 1.35, 1.32, 1.30, 1.27, 1.25, 1.23, 1.22, 1.20, 1.18, 1.17, 1.16, 1.13, 1.11, 1.09, 1.07, null, null, null, null, null, null, null, null, null],
        rmh:  [1.54, 1.50, 1.46, 1.44, 1.41, 1.39, 1.37, 1.35, 1.33, 1.32, 1.30, 1.29, 1.28, 1.27, 1.26, 1.24, null, null, null, null, null, null, null, null, null, null, null, null]
      }
    },
    "2025": {
      label: "Grundstücksmarktbericht 2025 (Beschluss 01.01.2025)",
      resolution: "2025-01-01",
      bodenrichtwerte: {
        wohn12: { gut: 780, mittel: 705, maessig: 585 },
        wohn3:  { gut: 730, mittel: 695, maessig: null },
        gewerbe: { gut: 225, mittel: 160, maessig: 120 },
        buero: { gut: 650, mittel: 295, maessig: null },
        gemischtRinge: 850,
        gemischtSonstige: 770,
        kern: 950,
        aussenbereich: 145,
        landwirtschaft: 9,
        forst: 1.5
      },
      factors: {
        parameter: {
          efh: { a: 2.8964, b: -0.081, sigma: 0.17, n: 60, label: "Freistehende Ein-/Zweifamilienhäuser" },
          dhh: { a: 0.4599, b: 0.0719, sigma: 0.14, n: 60, label: "Doppelhaushälften" },
          reh: { a: 19.233, b: -0.219, sigma: 0.17, n: 40, label: "Reihenendhäuser" },
          rmh: { a: 17.314, b: -0.201, sigma: 0.22, n: 62, label: "Reihenmittelhäuser" }
        },
        x: [200000, 225000, 250000, 275000, 300000, 325000, 350000, 375000, 400000, 425000, 450000, 475000, 500000, 550000, 600000, 650000, 700000, 750000, 800000, 850000, 900000, 950000, 1000000, 1100000, 1200000, 1300000, 1400000, 1500000],
        efh:  [null, null, null, 1.05, 1.04, 1.04, 1.03, 1.02, 1.02, 1.01, 1.01, 1.00, 1.00, 0.99, 0.99, 0.98, 0.97, 0.97, 0.96, 0.96, 0.95, 0.95, 0.95, 0.94, 0.94, 0.94, 0.93, null],
        dhh:  [1.11, 1.12, 1.12, 1.13, 1.14, 1.15, 1.15, 1.16, 1.16, 1.17, 1.17, 1.18, 1.18, 1.19, 1.20, 1.20, 1.21, 1.22, null, null, null, null, null, null, null, null, null, null],
        reh:  [null, 1.29, 1.26, 1.24, 1.21, 1.19, 1.17, 1.16, 1.14, 1.13, 1.11, 1.10, 1.09, 1.06, 1.04, 1.03, null, null, null, null, null, null, null, null, null, null, null, null],
        rmh:  [1.49, 1.45, 1.42, 1.40, 1.37, 1.35, 1.33, 1.31, 1.30, 1.28, 1.27, 1.25, 1.24, 1.22, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
      }
    }
  };

  // NHK 2010 factor = Destatis Baupreisindex (2021=100) / 70.8 (2010 average).
  var priceIndices = [
    { value: "2.001", label: "2026/08 – aktuell (2,001)" },
    { value: "1.982", label: "2026/05 (1,982)" },
    { value: "1.935", label: "2026/02 (1,935)" },
    { value: "1.907", label: "2025/11 (1,907)" },
    { value: "1.897", label: "2025/08 (1,897)" },
    { value: "1.887", label: "2025/05 (1,887)" },
    { value: "1.873", label: "2025/02 (1,873)" },
    { value: "1.847", label: "2024/11 (1,847)" },
    { value: "1.840", label: "2024/08 (1,840)" },
    { value: "1.828", label: "2024/05 (1,828)" },
    { value: "1.815", label: "2024/02 (1,815)" }
  ];

  var defaultState = {
    object: {
      street: "",
      zip: "",
      city: "Ratingen",
      gemarkung: "",
      flur: "",
      flurstueck: "",
      valuationDate: new Date().toISOString().slice(0, 10),
      reportDate: "",
      comments: ""
    },
    land: {
      area: 400,
      brw: 725,
      brwLocationAdjustment: 0,
      zoneArea: 400,
      overdepthArea: 0,
      overdepthMeters: 0
    },
    boris: {
      zoneKey: "",
      stag: "",
      brw: "",
      source: ""
    },
    building: {
      type: "3.01",
      year: 1980,
      gnd: 80,
      bgf: 300,
      livingArea: 140,
      regionalFactor: 1,
      bnkRate: 0,
      index: 2.001,
      outdoorRate: 0.05,
      roundNhk: true,
      twoFamilyCorrection: false,
      apartmentSize: 0,
      layoutFactor: 1
    },
    standard: {
      walls: 3,
      roof: 3,
      windows: 3,
      innerWalls: 3,
      ceilings: 3,
      floors: 3,
      sanitary: 3,
      heating: 3,
      technical: 3
    },
    extras: [],
    modernization: {
      roof: 0, windows: 0, utilities: 0, heating: 0,
      wallInsulation: 0, bathrooms: 0, interior: 0, layout: 0
    },
    market: {
      source: "2026",
      buildingClass: "rmh",
      adjustmentPct: 0,
      manualFactor: 1.10
    },
    deductions: [],
    plausibility: {
      comparisonValue: 0
    },
    wohnrecht: {
      enabled: false,
      lifeExpectancy: 0,
      discountFactor: 0.77916,
      uncertaintyPct: 5,
      annualSavings: 0,
      annuityFactor: 9.8334
    },
    tenancy: {
      enabled: false,
      scope: "whole",
      rentedArea: 0,
      actualRent: 0,
      marketRent: 0,
      adjustmentYears: 3,
      remainingTerm: 3,
      noticeMonths: 3,
      discountRate: 4,
      riskPct: 20
    }
  };

  // Shallow per-section merge keeps the example definitions compact while
  // retaining every default field (all examples are fictional/anonymised).
  function exampleState(overrides) {
    var result = JSON.parse(JSON.stringify(defaultState));
    Object.keys(overrides || {}).forEach(function (section) {
      var value = overrides[section];
      var target = result[section];
      if (value && typeof value === "object" && !Array.isArray(value) &&
          target && typeof target === "object" && !Array.isArray(target)) {
        Object.keys(value).forEach(function (key) { target[key] = value[key]; });
      } else {
        result[section] = value;
      }
    });
    return result;
  }

  var exampleLabels = {
    anonymisiert: "Reihenmittelhaus (anonymisiert)",
    reihenendhaus: "Reihenendhaus (anonymisiert)",
    doppelhaushaelfte: "Doppelhaushälfte (anonymisiert)",
    mehrfamilienhaus: "Mehrfamilienhaus (anonymisiert, manueller Faktor)"
  };

  var examples = {
    anonymisiert: {
      object: {
        street: "Musterobjekt (anonymisiert)",
        zip: "40878",
        city: "Ratingen",
        gemarkung: "Ratingen",
        flur: "30",
        flurstueck: "",
        valuationDate: "2023-03-01",
        reportDate: "anonymisiert"
      },
      land: {
        area: 393,
        brw: 830,
        brwLocationAdjustment: 0,
        zoneArea: 393,
        overdepthArea: 0,
        overdepthMeters: 0
      },
      boris: {
        zoneKey: "2023|1241",
        stag: "2023-01-01",
        brw: 830,
        source: "BORISplus.NRW / Open.NRW, Bodenrichtwerte NRW"
      },
      building: {
        type: "3.01",
        year: 1978,
        gnd: 80,
        bgf: 331,
        livingArea: 152.75,
        regionalFactor: 1,
        bnkRate: 0.17,
        index: 1.717,
        outdoorRate: 0.05,
        roundNhk: true,
        twoFamilyCorrection: false,
        apartmentSize: 0,
        layoutFactor: 1
      },
      standard: {
        walls: 2, roof: 2, windows: 2, innerWalls: 2, ceilings: 3,
        floors: 3, sanitary: 4, heating: 3, technical: 2
      },
      extras: [
        { label: "Hauseingangstreppe", amount: 5000 },
        { label: "Kelleraußentreppe", amount: 5000 },
        { label: "Gaube", amount: 6000 }
      ],
      modernization: {
        roof: 0, windows: 0, utilities: 0, heating: 0,
        wallInsulation: 0, bathrooms: 0, interior: 0, layout: 0
      },
      market: {
        source: "2026",
        buildingClass: "rmh",
        adjustmentPct: -12.12,
        manualFactor: 1.10
      },
      deductions: [],
      plausibility: {
        comparisonValue: 567225
      },
      wohnrecht: {
        enabled: true,
        lifeExpectancy: 11,
        discountFactor: 0.77916,
        uncertaintyPct: 5,
        annualSavings: 2500,
        annuityFactor: 9.8334
      }
    },

    // Fictional reconstruction of a 2025 Reihenendhaus valuation approach.
    reihenendhaus: exampleState({
      object: {
        street: "Musterweg (anonymisiert)", zip: "40878", city: "Ratingen",
        gemarkung: "Ratingen", flur: "000", flurstueck: "",
        valuationDate: "2025-03-31", reportDate: "anonymisiert"
      },
      land: { area: 307, brw: 640, zoneArea: 307, overdepthArea: 0, overdepthMeters: 0 },
      boris: {
        zoneKey: "2025|1110", stag: "2025-01-01", brw: 640,
        source: "BORISplus.NRW / Open.NRW, Bodenrichtwerte NRW"
      },
      building: {
        type: "2.31", year: 1995, gnd: 80, bgf: 196.89, livingArea: 152,
        regionalFactor: 1, bnkRate: 0, index: 1.873, outdoorRate: 0.05
      },
      standard: {
        walls: 4, roof: 4, windows: 3.5, innerWalls: 4, ceilings: 4,
        floors: 4, sanitary: 4, heating: 3.5, technical: 4
      },
      market: { source: "2025", buildingClass: "reh", adjustmentPct: 4.5, manualFactor: 1.10 },
      plausibility: { comparisonValue: 0 }
    }),

    // Fictional reconstruction of a 2026 Doppelhaushälfte valuation approach.
    doppelhaushaelfte: exampleState({
      object: {
        street: "Musterstraße (anonymisiert)", zip: "40878", city: "Ratingen",
        gemarkung: "Ratingen", flur: "7", flurstueck: "",
        valuationDate: "2026-02-10", reportDate: "anonymisiert"
      },
      land: { area: 313, brw: 1050, zoneArea: 313, overdepthArea: 0, overdepthMeters: 0 },
      boris: {
        zoneKey: "2026|1380", stag: "2026-01-01", brw: 1050,
        source: "BORISplus.NRW / Open.NRW, Bodenrichtwerte NRW"
      },
      building: {
        type: "2.11", year: 1980, gnd: 80, bgf: 193, livingArea: 148,
        regionalFactor: 1, bnkRate: 0, index: 2.001, outdoorRate: 0.065
      },
      standard: {
        walls: 4, roof: 4, windows: 4, innerWalls: 4, ceilings: 4,
        floors: 4, sanitary: 4, heating: 4, technical: 4
      },
      market: { source: "2026", buildingClass: "dhh", adjustmentPct: -6.3, manualFactor: 1.10 },
      plausibility: { comparisonValue: 0 }
    }),

    // MFH is supported only with an object-specific manual Sachwertfaktor.
    mehrfamilienhaus: exampleState({
      object: {
        street: "Musterallee (anonymisiert)", zip: "40878", city: "Ratingen",
        gemarkung: "Ratingen", flur: "000", flurstueck: "",
        valuationDate: "2026-01-01", reportDate: "anonymisiert"
      },
      land: { area: 620, brw: 790, zoneArea: 620, overdepthArea: 0, overdepthMeters: 0 },
      boris: {
        zoneKey: "2026|1150", stag: "2026-01-01", brw: 790,
        source: "BORISplus.NRW / Open.NRW, Bodenrichtwerte NRW"
      },
      building: {
        type: "4.1", year: 1972, gnd: 80, bgf: 780, livingArea: 560,
        regionalFactor: 1, bnkRate: 0, index: 2.001, outdoorRate: 0.05,
        apartmentSize: 85, layoutFactor: 1
      },
      standard: {
        walls: 3, roof: 3, windows: 3, innerWalls: 3, ceilings: 3,
        floors: 3, sanitary: 3, heating: 3, technical: 3
      },
      market: { source: "2026", buildingClass: "mfh", adjustmentPct: 0, manualFactor: 1.10 },
      plausibility: { comparisonValue: 0 }
    })
  };

  var data = {
    standardWeights: standardWeights,
    modernizationElements: modernizationElements,
    modernizationGrades: modernizationGrades,
    rndParameters: rndParameters,
    nhkTypes: nhkTypes,
    overdepthFactors: overdepthFactors,
    marketReports: marketReports,
    priceIndices: priceIndices,
    defaultState: defaultState,
    examples: examples,
    exampleLabels: exampleLabels
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = data;
  }
  global.VW_DATA = data;
})(typeof window !== "undefined" ? window : globalThis);
