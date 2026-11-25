/*
 * Market data and valuation parameters extracted from the supplied PDFs and
 * the previous Verkehrswert.xlsx workbook.
 *
 * All values are embedded so that index.html works from file:// without a
 * server or any external dependency.
 */
(function (global) {
  "use strict";

  var standardWeights = [
    { key: "walls", label: "Außenwände", weight: 0.23 },
    { key: "roof", label: "Dach", weight: 0.15 },
    { key: "windows", label: "Fenster und Außentüren", weight: 0.11 },
    { key: "innerWalls", label: "Innenwände und -türen", weight: 0.11 },
    { key: "ceilings", label: "Deckenkonstruktion und Treppen", weight: 0.11 },
    { key: "floors", label: "Fußböden", weight: 0.05 },
    { key: "sanitary", label: "Sanitäreinrichtungen", weight: 0.09 },
    { key: "heating", label: "Heizung", weight: 0.09 },
    { key: "technical", label: "Sonstige technische Ausstattung", weight: 0.06 }
  ];

  var modernizationElements = [
    { key: "roof", label: "Dacherneuerung inkl. Wärmedämmung", max: 4 },
    { key: "windows", label: "Fenster und Außentüren", max: 2 },
    { key: "utilities", label: "Leitungssysteme (Strom, Gas, Wasser, Abwasser)", max: 2 },
    { key: "heating", label: "Heizungsanlage", max: 2 },
    { key: "wallInsulation", label: "Wärmedämmung der Außenwände", max: 4 },
    { key: "bathrooms", label: "Modernisierung von Bädern", max: 2 },
    { key: "interior", label: "Innenausbau (Decken, Fußböden, Treppen)", max: 2 },
    { key: "layout", label: "Wesentliche Grundrissverbesserung", max: 2 }
  ];

  // ImmoWertV, Anlage 2 (RND model). "abRelAlter" is the upper relative age
  // for which the formula may be used; beyond it the linear GND - age applies.
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

  // NHK 2010 cost classes (EUR/m2 BGF) from Anlage 4 ImmoWertV / Verkehrswert.xlsx.
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

  var priceIndices = [
    { value: "1.717", label: "4. Quartal 2022 (1,717)" },
    { value: "1.828", label: "2. Quartal 2024 (1,828)" },
    { value: "1.886", label: "2. Quartal 2025 (1,886)" }
  ];

  var defaultState = {
    object: {
      street: "",
      zip: "",
      city: "Ratingen",
      valuationDate: new Date().toISOString().slice(0, 10),
      reportDate: ""
    },
    land: {
      area: 400,
      brw: 725,
      brwLocationAdjustment: 0,
      zoneArea: 400,
      overdepthArea: 0,
      overdepthMeters: 0
    },
    building: {
      type: "3.01",
      year: 1980,
      gnd: 80,
      bgf: 300,
      livingArea: 140,
      regionalFactor: 1,
      bnkRate: 0,
      index: 1.886,
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
    }
  };

  var examples = {
    anDerLilie51: {
      object: {
        street: "An der Lilie 51",
        zip: "40878",
        city: "Ratingen",
        valuationDate: "2023-03-11",
        reportDate: "11.03.2023"
      },
      land: {
        area: 393,
        brw: 830,
        brwLocationAdjustment: 0,
        zoneArea: 393,
        overdepthArea: 0,
        overdepthMeters: 0
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
        source: "manual",
        buildingClass: "rmh",
        adjustmentPct: 0,
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
    }
  };

  var data = {
    standardWeights: standardWeights,
    modernizationElements: modernizationElements,
    rndParameters: rndParameters,
    nhkTypes: nhkTypes,
    overdepthFactors: overdepthFactors,
    marketReports: marketReports,
    priceIndices: priceIndices,
    defaultState: defaultState,
    examples: examples
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = data;
  }
  global.VW_DATA = data;
})(typeof window !== "undefined" ? window : globalThis);
