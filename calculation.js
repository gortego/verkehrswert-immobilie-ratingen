/*
 * Pure calculation engine for the Sachwertverfahren (ImmoWertV).
 * No DOM access. Loaded before app.js in the browser.
 */
(function (global) {
  "use strict";

  var DATA = (typeof module !== "undefined" && module.exports)
    ? require("./data.js")
    : global.VW_DATA;

  function num(value, fallback) {
    if (value === undefined || value === null || value === "") {
      return typeof fallback === "number" ? fallback : 0;
    }
    var parsed = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    return isFinite(parsed) ? parsed : (typeof fallback === "number" ? fallback : 0);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sumValues(obj, keys) {
    return keys.reduce(function (total, key) {
      return total + num(obj && obj[key], 0);
    }, 0);
  }

  function interpolateSeries(points, x, label, warnings) {
    var usable = points.filter(function (p) { return p.y !== null && p.y !== undefined && isFinite(p.y); });
    if (!usable.length) return null;

    if (x <= usable[0].x) {
      if (warnings) warnings.push({ level: "info", text: label + ": Wert liegt unterhalb der Tabellenspanne; erster Tabellenwert wurde verwendet." });
      return usable[0].y;
    }
    var last = usable[usable.length - 1];
    if (x >= last.x) {
      if (warnings) warnings.push({ level: "info", text: label + ": Wert liegt oberhalb der Tabellenspanne; letzter Tabellenwert wurde verwendet." });
      return last.y;
    }

    for (var i = 0; i < usable.length - 1; i++) {
      var left = usable[i];
      var right = usable[i + 1];
      if (x >= left.x && x <= right.x) {
        var share = (x - left.x) / (right.x - left.x);
        return left.y + share * (right.y - left.y);
      }
    }
    return null;
  }

  function interpolateLevels(levels, standard, warnings) {
    var points = levels.map(function (level, index) {
      return { x: index + 1, y: (level === null || level === "") ? null : num(level) };
    });
    var value = interpolateSeries(points, standard, "NHK-Standardstufe", warnings);
    return value === null ? 0 : value;
  }

  function getOverdepthFactor(meters, warnings) {
    if (meters <= 0) return 1;
    var entries = DATA.overdepthFactors;
    for (var i = 0; i < entries.length; i++) {
      if (meters <= entries[i].max) return entries[i].factor;
    }
    if (warnings) {
      warnings.push({ level: "warn", text: "Die Übertiefe übersteigt 50 m. Der Umrechnungskoeffizient 0,15 ist nur ein Richtwert; bitte sachverständig prüfen." });
    }
    return 0.15;
  }

  function calcRnd(building, modernization, warnings) {
    var gnd = Math.max(1, num(building.gnd, 80));
    var year = num(building.year, 1970);
    var valuationYear = num(building.valuationYear, new Date().getFullYear());
    var age = clamp(valuationYear - year, 0, gnd);
    var linearRnd = Math.max(0, gnd - age);
    var points = clamp(Math.round(sumValues(modernization, DATA.modernizationElements.map(function (e) { return e.key; }))), 0, 20);
    var rnd = linearRnd;
    var method = "linear (GND - Alter)";

    // ImmoWertV 2022, Anlage 2, II.1: the Modernisierungspunktzahl from I
    // (0–20 points) is used in the II.2 formula. Tabelle 3: "ab einem
    // relativen Alter von" — the formula applies from the listed relative
    // age upwards; below it RND = GND - Alter. The old SW-RL treatment of
    // 0–1 points as "nicht modernisiert" is not used here.
    var params = DATA.rndParameters[points] || DATA.rndParameters[20];
    var relativeAge = age / gnd;
    if (relativeAge >= params.abRelAlter) {
      var modelled = (params.a * age * age) / gnd - params.b * age + params.c * gnd;
      rnd = clamp(Math.max(linearRnd, modelled), 0, 1.7 * gnd);
      method = "ImmoWertV-Anlage-2-Modell (" + points + " Punkte)";
    } else {
      method = "linear (relatives Alter unter dem Anwendungsbereich des RND-Modells)";
      if (warnings) {
        warnings.push({ level: "info", text: "Bei " + Math.round(relativeAge * 100) + "% relativem Alter liegt das Modernisierungsmodell noch außerhalb des Anwendungsbereichs (ab " + Math.round(params.abRelAlter * 100) + "%); die lineare RND wurde verwendet." });
      }
    }

    var factor = clamp(rnd / gnd, 0, 1);
    return {
      age: age,
      linearRnd: linearRnd,
      points: points,
      rnd: rnd,
      method: method,
      awmFactor: factor,
      awmPercent: (1 - factor) * 100
    };
  }

  function calcStandard(standard) {
    var value = 0;
    DATA.standardWeights.forEach(function (item) {
      value += num(standard && standard[item.key], 0) * item.weight;
    });
    return value;
  }

  function getSachwertfaktor(state, preliminary, warnings) {
    var market = state.market || {};
    var adjustmentPct = num(market.adjustmentPct, 0);
    var buildingClass = market.buildingClass || "rmh";
    var report = DATA.marketReports[market.source];
    var factorResult;

    if (market.source === "manual") {
      factorResult = {
        base: num(market.manualFactor, 1),
        final: num(market.manualFactor, 1),
        sourceLabel: "manuell eingegeben",
        fromTable: false,
        sigma: null,
        sampleSize: null
      };
    } else if (!report) {
      factorResult = {
        base: num(market.manualFactor, 1),
        final: num(market.manualFactor, 1),
        sourceLabel: "unbekannte Datenquelle – manueller Wert",
        fromTable: false,
        sigma: null,
        sampleSize: null
      };
      warnings.push({ level: "warn", text: "Unbekannter Marktbericht. Der manuelle Sachwertfaktor wurde verwendet." });
    } else if (buildingClass === "mfh") {
      factorResult = {
        base: num(market.manualFactor, 1),
        final: num(market.manualFactor, 1),
        sourceLabel: "manuell (für MFH liegen keine Faktoren vor)",
        fromTable: false,
        sigma: null,
        sampleSize: null
      };
      warnings.push({ level: "warn", text: "Die Ratinger Marktberichte enthalten keine Sachwertfaktoren für Mehrfamilienhäuser. Bitte einen objektspezifischen Faktor manuell eingeben." });
    } else {
      var series = report.factors;
      var tableValue = interpolateSeries(
        series.x.map(function (x, i) { return { x: x, y: series[buildingClass][i] }; }),
        preliminary,
        "Sachwertfaktor-Tabelle",
        warnings
      );
      var params = series.parameter[buildingClass];
      var usedTable = tableValue !== null;
      var base = usedTable
        ? tableValue
        : params.a * Math.pow(Math.max(1, preliminary), params.b);

      if (!usedTable) {
        warnings.push({ level: "warn", text: "Für diesen vorläufigen Sachwert ist kein Tabellenwert verfügbar. Der Regressionswert wurde verwendet; eine Extrapolation ist nicht empfohlen." });
      }

      factorResult = {
        base: base,
        final: base,
        sourceLabel: report.label + " / " + params.label,
        fromTable: usedTable,
        sigma: params.sigma,
        sampleSize: params.n
      };
    }

    if (market.source !== "manual") {
      factorResult.final = factorResult.base * (1 + adjustmentPct / 100);
    }

    factorResult.adjustmentPct = adjustmentPct;
    return factorResult;
  }

  // Existing tenancies are treated as a besonderes objektspezifisches
  // Grundstücksmerkmal (§ 8 Abs. 3 ImmoWertV). Only the difference between
  // contract rent and market rent is capitalised over the period in which the
  // owner cannot adjust it. This is a transparency aid, not a full
  // Ertragswertverfahren.
  function calcTenancy(state, baseValue, rnd, warnings) {
    var t = state.tenancy || {};
    var empty = {
      enabled: false, correction: 0, before: baseValue, after: baseValue,
      annualDiff: 0, years: 0, pvFactor: 0, share: 1, monthlyDiff: 0
    };
    if (!t.enabled) return empty;

    warnings.push({ level: "info", text: "Bei vermieteten Objekten ist das Ertragswertverfahren regelmäßig das Regelverfahren. Die Mietkorrektur im Sachwert ist eine Plausibilisierung; Verfahrenswahl und Modellkonformität des Sachwertfaktors sind zu begründen (§ 6 Abs. 1, § 10 ImmoWertV)." });

    var actual = num(t.actualRent, 0);
    var market = num(t.marketRent, 0);
    if (actual <= 0 || market <= 0) {
      warnings.push({ level: "warn", text: "Mietverhältnis aktiv, aber Ist- oder Marktmiete fehlt. Es wurde keine Korrektur berechnet." });
      return empty;
    }

    var scope = t.scope === "part" ? "part" : "whole";
    var living = Math.max(0, num(state.building && state.building.livingArea, 0));
    var rented = Math.max(0, num(t.rentedArea, 0));
    var share = scope === "part" ? (living > 0 ? clamp(rented / living, 0, 1) : 0) : 1;
    if (scope === "part" && living <= 0) {
      warnings.push({ level: "warn", text: "Für die Teilvermietung fehlt die Wohnfläche. Es wurde keine Korrektur berechnet." });
      return empty;
    }

    var years = Math.max(0, Math.min(
      num(t.adjustmentYears, 3),
      num(t.remainingTerm, 0) + num(t.noticeMonths, 0) / 12,
      rnd
    ));
    if (years <= 0) {
      warnings.push({ level: "warn", text: "Die wirksame Anpassungsdauer des Mietverhältnisses ist 0 Jahre. Es wurde keine Korrektur berechnet." });
      return empty;
    }

    var rate = Math.max(0, num(t.discountRate, 0)) / 100;
    var pvFactor = rate > 0 ? (1 - Math.pow(1 + rate, -years)) / rate : years;
    var monthlyDiff = market - actual; // positive = Mindermiete
    var annualDiff = monthlyDiff * 12 * share;
    var risk = clamp(num(t.riskPct, 0), 0, 100) / 100;
    var correction = -annualDiff * pvFactor * (1 - risk);
    var cap = Math.abs(baseValue) * 0.30;
    if (Math.abs(correction) > cap) {
      warnings.push({ level: "warn", text: "Die Mietkorrektur übersteigt 30 % des marktangepassten Sachwerts und wurde begrenzt. Bitte sachverständig prüfen." });
      correction = clamp(correction, -cap, cap);
    }
    if (Math.abs(monthlyDiff / market) > 0.10) {
      warnings.push({ level: "warn", text: "Die Ist-Miete weicht um mehr als 10 % von der Marktmiete ab: besondere Ertragsverhältnisse nach § 8 Abs. 3 Nr. 1 ImmoWertV. Marktmiete und Laufzeit bitte belegen." });
    }
    if (state.wohnrecht && state.wohnrecht.enabled) {
      warnings.push({ level: "warn", text: "Mietverhältnis und unentgeltliches Wohnungsrecht sind gleichzeitig aktiv. Bitte sicherstellen, dass dieselbe Fläche/Periode nicht doppelt korrigiert wird." });
    }

    return {
      enabled: true,
      scope: scope,
      share: share,
      actualRent: actual,
      marketRent: market,
      monthlyDiff: monthlyDiff,
      annualDiff: annualDiff,
      years: years,
      pvFactor: pvFactor,
      riskPct: num(t.riskPct, 0),
      correction: correction,
      before: baseValue,
      after: baseValue + correction
    };
  }

  function calculate(state, warnings) {
    warnings = warnings || [];
    var land = state.land || {};
    var building = Object.assign({}, state.building || {});
    building.valuationYear = state.object && state.object.valuationDate
      ? num(String(state.object.valuationDate).slice(0, 4), new Date().getFullYear())
      : new Date().getFullYear();

    var rndResult = calcRnd(building, state.modernization, warnings);
    var bgf = Math.max(0, num(building.bgf, 0));
    var standard = calcStandard(state.standard);
    var nhkType = DATA.nhkTypes[building.type] || DATA.nhkTypes["3.01"];
    var nhkBase = interpolateLevels(nhkType.levels, standard, warnings);

    var correction = num(building.regionalFactor, 1);
    if (building.twoFamilyCorrection && building.type === "1.11") correction *= 1.05;
    if (num(building.apartmentSize, 0) > 0 && building.type === "4.1") {
      var w = num(building.apartmentSize);
      correction *= w * (-0.0017647 * w + 1.088235) / 100;
    }
    correction *= num(building.layoutFactor, 1);

    var extras = state.extras || [];
    var extrasTotal = extras.reduce(function (total, item) { return total + num(item.amount, 0); }, 0);
    var extrasPerM2 = bgf > 0 ? extrasTotal / bgf : 0;

    var nhkWithCorrections = nhkBase * correction + extrasPerM2;
    var index = num(building.index, 1);
    var indexedNhk = nhkWithCorrections * index;
    if (building.roundNhk) indexedNhk = Math.round(indexedNhk);
    var bnkRate = num(building.bnkRate, 0);
    var indexedWithBnk = indexedNhk * (1 + bnkRate);
    var buildingValue = indexedWithBnk * bgf * rndResult.awmFactor;

    var outdoorRate = num(building.outdoorRate, 0);
    var outdoorValue = buildingValue * outdoorRate;
    var buildingAndOutdoor = buildingValue + outdoorValue;

    var overdepth = num(land.overdepthMeters, 0);
    var overdepthFactor = getOverdepthFactor(overdepth, warnings);
    var zoneArea = Math.max(0, num(land.zoneArea, num(land.area, 0)));
    var extraArea = Math.max(0, num(land.overdepthArea, 0));
    var effectiveArea = zoneArea + extraArea * overdepthFactor;
    var brw = num(land.brw, 0);
    var brwAdjusted = brw * (1 + num(land.brwLocationAdjustment, 0) / 100);
    var landValue = brwAdjusted * effectiveArea;

    var deductions = state.deductions || [];
    var deductionsTotal = deductions.reduce(function (total, item) { return total + num(item.amount, 0); }, 0);
    var preliminary = buildingAndOutdoor + landValue + deductionsTotal;

    var factor = getSachwertfaktor(state, preliminary, warnings);
    var marketAdaptedValue = preliminary * factor.final;
    var tenancy = calcTenancy(state, marketAdaptedValue, rndResult.rnd, warnings);
    var marketValue = tenancy.after;
    var roundedValue = Math.round(marketValue / 1000) * 1000;

    var comparison = num(state.plausibility && state.plausibility.comparisonValue, 0);
    var plausibilityAverage = comparison > 0 ? (marketValue + comparison) / 2 : null;

    var result = {
      inputs: {
        valuationYear: building.valuationYear,
        bgf: bgf,
        standard: standard,
        nhkTypeLabel: nhkType.label,
        extrasTotal: extrasTotal,
        extrasPerM2: extrasPerM2,
        correction: correction,
        index: index,
        bnkRate: bnkRate,
        outdoorRate: outdoorRate,
        brw: brw,
        brwAdjusted: brwAdjusted,
        effectiveArea: effectiveArea,
        overdepthFactor: overdepthFactor,
        deductionsTotal: deductionsTotal
      },
      rnd: rndResult,
      nhk: {
        base: nhkBase,
        withCorrections: nhkWithCorrections,
        indexed: indexedNhk,
        indexedWithBnk: indexedWithBnk
      },
      buildingValue: buildingValue,
      outdoorValue: outdoorValue,
      buildingAndOutdoor: buildingAndOutdoor,
      landValue: landValue,
      preliminary: preliminary,
      factor: factor,
      marketAdaptedValue: marketAdaptedValue,
      tenancy: tenancy,
      marketValue: marketValue,
      roundedValue: roundedValue,
      plausibilityAverage: plausibilityAverage
    };

    var wr = state.wohnrecht || {};
    if (wr.enabled && num(wr.lifeExpectancy, 0) > 0) {
      var futureRnd = Math.max(0, rndResult.rnd - num(wr.lifeExpectancy, 0));
      var futureAwmFactor = clamp(futureRnd / Math.max(1, num(building.gnd, 80)), 0, 1);
      var futureBuilding = indexedWithBnk * bgf * futureAwmFactor;
      var futureOutdoor = futureBuilding * outdoorRate;
      var futurePreliminary = futureBuilding + futureOutdoor + landValue + deductionsTotal;
      var futureMarket = futurePreliminary * factor.final;
      var discounted = futureMarket * num(wr.discountFactor, 1);
      var afterUncertainty = discounted * (1 - num(wr.uncertaintyPct, 0) / 100);
      var benefit = num(wr.annualSavings, 0) * num(wr.annuityFactor, 0);
      var burdened = afterUncertainty + benefit;

      if (futureRnd <= 0) {
        warnings.push({ level: "warn", text: "Die Restnutzungsdauer wird durch das Wohnungsrecht auf 0 Jahre reduziert. Das Ergebnis ist ein Grenzfall." });
      }

      result.wohnrecht = {
        futureRnd: futureRnd,
        futureAwmFactor: futureAwmFactor,
        futureBuilding: futureBuilding,
        futureOutdoor: futureOutdoor,
        futurePreliminary: futurePreliminary,
        futureMarket: futureMarket,
        discounted: discounted,
        afterUncertainty: afterUncertainty,
        benefit: benefit,
        burdened: burdened,
        burdenedRounded: Math.round(burdened / 1000) * 1000
      };
    }

    return result;
  }

  var api = {
    num: num,
    calculate: calculate,
    calcRnd: calcRnd,
    calcStandard: calcStandard,
    interpolateSeries: interpolateSeries,
    getOverdepthFactor: getOverdepthFactor,
    getSachwertfaktor: getSachwertfaktor
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.VW_CALC = api;
})(typeof window !== "undefined" ? window : globalThis);
