(function () {
  "use strict";

  var DATA = window.VW_DATA;
  var CALC = window.VW_CALC;
  var STORAGE_KEY = "vw-ratingen-state-v1";

  var eur0 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  var num4 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 4 });

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function merge(base, extra) {
    if (!extra || typeof extra !== "object") return clone(base);
    var result = clone(base);
    Object.keys(extra).forEach(function (key) {
      if (extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key]) && result[key]) {
        result[key] = merge(result[key], extra[key]);
      } else {
        result[key] = clone(extra[key]);
      }
    });
    return result;
  }

  function getField(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  function setField(obj, path, value) {
    var parts = path.split(".");
    var target = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]] || typeof target[parts[i]] !== "object") target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
  }

  function money(value) { return isFinite(value) ? eur0.format(value) : "–"; }
  function money2(value) { return isFinite(value) ? eur2.format(value) : "–"; }
  function decimal(value, digits) { return isFinite(value) ? (digits === 4 ? num4.format(value) : num2.format(value)) : "–"; }
  function percent(value) { return isFinite(value) ? num2.format(value) + " %" : "–"; }

  var state = merge(DATA.defaultState, loadStored());

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function populateSelect(select, options) {
    if (!select) return;
    select.innerHTML = "";
    options.forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.label = item.label;
      select.appendChild(option);
    });
  }

  function initStaticUi() {
    populateSelect(document.getElementById("buildingTypeSelect"), Object.keys(DATA.nhkTypes).map(function (key) {
      return { value: key, label: DATA.nhkTypes[key].label };
    }));

    populateSelect(document.getElementById("marketClassSelect"), [
      { value: "efh", label: "Freistehende EFH/ZFH" },
      { value: "dhh", label: "Doppelhaushälften" },
      { value: "reh", label: "Reihenendhäuser" },
      { value: "rmh", label: "Reihenmittelhäuser" },
      { value: "mfh", label: "Mehrfamilienhäuser (manuell)" }
    ]);

    populateSelect(document.getElementById("indexSelect"), DATA.priceIndices.map(function (item) {
      return { value: item.value, label: item.label };
    }));
    var customIndex = document.createElement("option");
    customIndex.value = "";
    customIndex.label = "Eigener Wert";
    customIndex.textContent = "Eigener Wert";
    document.getElementById("indexSelect").appendChild(customIndex);

    var standardWrap = document.getElementById("standardFields");
    DATA.standardWeights.forEach(function (item) {
      var label = document.createElement("label");
      label.className = "field";
      label.textContent = item.label + " (" + Math.round(item.weight * 100) + " %)";
      var input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = "5";
      input.step = "0.1";
      input.setAttribute("data-field", "standard." + item.key);
      label.appendChild(input);
      standardWrap.appendChild(label);
    });

    var modernWrap = document.getElementById("modernizationFields");
    DATA.modernizationElements.forEach(function (item) {
      var label = document.createElement("label");
      label.className = "field";
      label.textContent = item.label + " (max. " + item.max + ")";
      var input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(item.max);
      input.step = "1";
      input.setAttribute("data-field", "modernization." + item.key);
      label.appendChild(input);
      modernWrap.appendChild(label);
    });

    var tableBody = document.getElementById("overdepthTable");
    for (var i = 0; i < DATA.overdepthFactors.length; i += 2) {
      var left = DATA.overdepthFactors[i];
      var right = DATA.overdepthFactors[i + 1];
      var row = document.createElement("tr");
      row.innerHTML = "<td>" + left.label + "</td><td>" + decimal(left.factor) + "</td>" +
        "<td>" + (right ? right.label : "") + "</td><td>" + (right ? decimal(right.factor) : "") + "</td>";
      tableBody.appendChild(row);
    }

    updateBrwPresets();
  }

  function updateBrwPresets() {
    var reportSelect = document.getElementById("brwReportSelect");
    var presetSelect = document.getElementById("brwPresetSelect");
    var report = DATA.marketReports[reportSelect.value] || DATA.marketReports["2026"];
    var values = report.bodenrichtwerte;
    var options = [
      { value: values.wohn12.gut, label: "Wohnbau 1–2 geschossig, gute Lage" },
      { value: values.wohn12.mittel, label: "Wohnbau 1–2 geschossig, mittlere Lage" },
      { value: values.wohn12.maessig, label: "Wohnbau 1–2 geschossig, mäßige Lage" },
      { value: values.wohn3.gut, label: "Wohnbau 3+ geschossig, gute Lage" },
      { value: values.wohn3.mittel, label: "Wohnbau 3+ geschossig, mittlere Lage" },
      { value: values.gemischtRinge, label: "Gemischte Nutzung, Ringe" },
      { value: values.gemischtSonstige, label: "Gemischte Nutzung, sonstige" },
      { value: values.kern, label: "Kerngebiet" },
      { value: values.aussenbereich, label: "Wohnbau Außenbereich" }
    ].filter(function (o) { return o.value !== null && o.value !== undefined; });
    populateSelect(presetSelect, options);
  }

  function renderRepeater(name, items) {
    var container = document.getElementById(name + "List");
    if (!container) return;
    container.innerHTML = "";
    (items || []).forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = "repeater-row";
      row.setAttribute("data-repeater", name);
      row.innerHTML =
        '<label class="field">Bezeichnung<input type="text" data-row-field="label"></label>' +
        '<label class="field">Betrag (€)<input type="number" step="1" data-row-field="amount"></label>' +
        '<button type="button" class="icon-btn" data-remove="' + name + '" aria-label="Eintrag entfernen">×</button>';
      row.querySelector('[data-row-field="label"]').value = item.label || "";
      row.querySelector('[data-row-field="amount"]').value = item.amount === undefined ? "" : item.amount;
      container.appendChild(row);
    });
  }

  function collectRepeater(name) {
    return Array.prototype.map.call(document.querySelectorAll('[data-repeater="' + name + '"]'), function (row) {
      return {
        label: row.querySelector('[data-row-field="label"]').value,
        amount: CALC.num(row.querySelector('[data-row-field="amount"]').value, 0)
      };
    });
  }

  function collectState() {
    var next = clone(state);
    Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (input) {
      var path = input.getAttribute("data-field");
      var value;
      if (input.type === "checkbox") value = input.checked;
      else if (input.type === "number") value = input.value === "" ? "" : CALC.num(input.value, 0);
      else value = input.value;
      setField(next, path, value);
    });
    next.extras = collectRepeater("extras");
    next.deductions = collectRepeater("deductions");
    return next;
  }

  function syncForm() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (input) {
      var value = getField(state, input.getAttribute("data-field"));
      if (input.type === "checkbox") input.checked = !!value;
      else input.value = (value === undefined || value === null) ? "" : value;
    });
    renderRepeater("extras", state.extras);
    renderRepeater("deductions", state.deductions);

    var source = state.market.source;
    if (source === "2025" || source === "2026") {
      document.getElementById("brwReportSelect").value = source;
      updateBrwPresets();
    }
    var indexSelect = document.getElementById("indexSelect");
    if (indexSelect) indexSelect.value = String(state.building.index);
    if (indexSelect && indexSelect.value === "") {
      var custom = document.createElement("option");
      custom.value = String(state.building.index);
      custom.textContent = "Eigener Wert (" + decimal(state.building.index, 4) + ")";
      indexSelect.insertBefore(custom, indexSelect.lastChild);
      indexSelect.value = String(state.building.index);
    }
  }

  function setOutput(name, value) {
    var el = document.querySelector('[data-output="' + name + '"]');
    if (el) el.textContent = value;
  }

  function calcRows(result, warnings) {
    var r = result;
    var rows = [
      ["Grundstücksfläche", "amtliche Fläche / anrechenbare Fläche", decimal(r.inputs.effectiveArea) + " m²"],
      ["Bruttogrundfläche", "NHK-Bezugsmaßstab", decimal(r.inputs.bgf) + " m²"],
      ["Gebäudealter", "Stichtag − Baujahr", decimal(r.rnd.age) + " Jahre"],
      ["Gesamtnutzungsdauer", "Anlage 1 ImmoWertV", decimal(state.building.gnd) + " Jahre"],
      ["Restnutzungsdauer", r.rnd.method, decimal(r.rnd.rnd) + " Jahre"],
      ["Alterswertminderungsfaktor", "RND ÷ GND", decimal(r.rnd.awmFactor, 4)],
      ["Gewichtete Standardstufe", "9 Gewerke nach NHK 2010", decimal(r.inputs.standard)],
      ["NHK-Kostenkennwert", r.inputs.nhkTypeLabel, money2(r.nhk.base) + " / m²"],
      ["Zuschlag nicht erfasster Bauteile", "Summe ÷ BGF", money2(r.inputs.extrasPerM2) + " / m²"],
      ["Korrekturfaktoren", "Regionalfaktor, Zweifamilienhaus, Grundriss", decimal(r.inputs.correction, 4)],
      ["Kostenkennwert mit Zuschlägen", "vor Indexierung", money2(r.nhk.withCorrections) + " / m²"],
      ["Baupreisindex", "Basis 2010 = 100", decimal(r.inputs.index, 4)],
      ["Indexierter Kostenkennwert", state.building.roundNhk ? "auf ganze €/m² gerundet" : "ungerundet", money2(r.nhk.indexed) + " / m²"],
      ["Baunebenkosten", "Zuschlag", percent(r.inputs.bnkRate * 100)],
      ["Herstellungskosten inkl. BNK", "indexiert × (1 + BNK)", money2(r.nhk.indexedWithBnk) + " / m²"],
      ["Alterswertgeminderte Herstellungskosten", "× BGF × AWM-Faktor", money(r.buildingValue)],
      ["Zeitwert Außenanlagen", percent(r.inputs.outdoorRate * 100), money(r.outdoorValue)],
      ["Bodenwert", money2(r.inputs.brwAdjusted) + "/m² × " + decimal(r.inputs.effectiveArea) + " m²", money(r.landValue)],
      ["Besondere Merkmale", "Zu-/Abschläge", money(r.inputs.deductionsTotal)],
      ["Vorläufiger Sachwert", "Summe vor Marktanpassung", money(r.preliminary)],
      ["Sachwertfaktor", r.factor.sourceLabel, decimal(r.factor.final, 4)],
      ["Marktangepasster Sachwert", "vorläufiger Sachwert × Faktor", money(r.marketValue)],
      ["Gerundeter Sachwert", "auf volle 1.000 €", money(r.roundedValue)]
    ];

    if (r.plausibilityAverage !== null) {
      rows.push(["Plausibilität", "Mittel aus Sachwert und Vergleichswert", money(r.plausibilityAverage)]);
    }

    if (r.wohnrecht) {
      var w = r.wohnrecht;
      rows.push(["Wohnungsrecht: RND danach", "RND − Lebenserwartung", decimal(w.futureRnd) + " Jahre"]);
      rows.push(["Wohnungsrecht: Sachwert später", "mit reduzierter RND", money(w.futureMarket)]);
      rows.push(["Wohnungsrecht: Diskontierung", "Faktor " + decimal(state.wohnrecht.discountFactor, 5), money(w.discounted)]);
      rows.push(["Wohnungsrecht: Unsicherheitsabschlag", percent(state.wohnrecht.uncertaintyPct), money(w.afterUncertainty)]);
      rows.push(["Wohnungsrecht: Vorteil Ersparnis", money(state.wohnrecht.annualSavings) + " × " + decimal(state.wohnrecht.annuityFactor, 4), money(w.benefit)]);
      rows.push(["Sachwert mit Wohnungsrecht", "Summe", money(w.burdened)]);
    }

    return rows;
  }

  function renderCalcTable(result, warnings) {
    var body = document.getElementById("calcTableBody");
    if (!body) return;
    body.innerHTML = "";
    calcRows(result, warnings).forEach(function (row) {
      var tr = document.createElement("tr");
      var c1 = document.createElement("td"); c1.textContent = row[0];
      var c2 = document.createElement("td"); c2.textContent = row[1];
      var c3 = document.createElement("td"); c3.className = "num"; c3.textContent = row[2];
      tr.appendChild(c1); tr.appendChild(c2); tr.appendChild(c3);
      body.appendChild(tr);
    });
  }

  function renderWarnings(warnings) {
    var list = document.getElementById("warningList");
    var card = document.getElementById("warningCard");
    if (!list) return;
    list.innerHTML = "";
    if (!warnings.length) {
      var li = document.createElement("li");
      li.textContent = "Keine automatischen Hinweise. Bitte alle Angaben fachlich prüfen.";
      list.appendChild(li);
      return;
    }
    warnings.forEach(function (warning) {
      var li = document.createElement("li");
      li.textContent = (warning.level === "warn" ? "Achtung: " : "Hinweis: ") + warning.text;
      list.appendChild(li);
    });
    if (card && !warnings.some(function (w) { return w.level === "warn"; })) card.style.display = "block";
  }

  function update() {
    var warnings = [];
    var result = CALC.calculate(state, warnings);

    setOutput("landValue", money(result.landValue));
    setOutput("standard", decimal(result.inputs.standard));
    setOutput("extras", money(result.inputs.extrasTotal) + " / " + money2(result.inputs.extrasPerM2) + " je m²");
    setOutput("indexedNhk", money2(result.nhk.indexed) + " / m²");
    setOutput("age", decimal(result.rnd.age) + " Jahre");
    setOutput("linearRnd", decimal(result.rnd.linearRnd) + " Jahre");
    setOutput("points", decimal(result.rnd.points) + " von 20");
    setOutput("rnd", decimal(result.rnd.rnd) + " Jahre");
    setOutput("awm", percent(result.rnd.awmPercent));
    setOutput("rndMethod", result.rnd.method);
    setOutput("factorBase", decimal(result.factor.base, 4));
    setOutput("factorSigma", result.factor.sigma === null ? "–" : decimal(result.factor.sigma));
    setOutput("factorN", result.factor.sampleSize === null ? "–" : String(result.factor.sampleSize));
    setOutput("factorFinal", decimal(result.factor.final, 4));
    setOutput("factorSource", result.factor.sourceLabel + (result.factor.adjustmentPct ? " · Anpassung " + percent(result.factor.adjustmentPct) : ""));
    setOutput("deductions", money(result.inputs.deductionsTotal));
    setOutput("plausibility", result.plausibilityAverage === null ? "–" : money(result.plausibilityAverage));

    setOutput("heroValue", money(result.roundedValue));
    setOutput("heroExact", "Exakt: " + money2(result.marketValue));
    setOutput("heroLand", money(result.landValue));
    setOutput("heroBuilding", money(result.buildingAndOutdoor));
    setOutput("heroFactor", decimal(result.factor.final, 4));

    setOutput("panelPreliminary", money(result.preliminary));
    setOutput("panelMarket", money(result.roundedValue));
    setOutput("panelRnd", decimal(result.rnd.rnd) + " J.");
    setOutput("panelAwm", percent(result.rnd.awmPercent));
    setOutput("panelBgf", decimal(result.inputs.bgf) + " m²");
    setOutput("panelFactor", decimal(result.factor.final, 4));

    document.getElementById("manualFactorField").classList.toggle("hidden", state.market.source !== "manual");
    document.getElementById("wohnrechtFields").classList.toggle("hidden", !state.wohnrecht.enabled);

    if (result.wohnrecht) {
      var w = result.wohnrecht;
      setOutput("wrRnd", decimal(w.futureRnd) + " Jahre");
      setOutput("wrFuture", money(w.futureMarket));
      setOutput("wrDiscounted", money(w.discounted));
      setOutput("wrBurdened", money(w.burdenedRounded) + " (exakt " + money2(w.burdened) + ")");
    } else {
      setOutput("wrRnd", "–"); setOutput("wrFuture", "–"); setOutput("wrDiscounted", "–"); setOutput("wrBurdened", "–");
    }

    renderCalcTable(result, warnings);
    renderWarnings(warnings);
    document.getElementById("panelNote").textContent = warnings.length
      ? warnings.length + " Hinweis(e) im Ergebnisplan aufgeführt."
      : "Änderungen werden sofort berechnet.";

    return result;
  }

  function showStep(number) {
    var step = parseInt(number, 10);
    Array.prototype.forEach.call(document.querySelectorAll(".step"), function (el) {
      el.classList.toggle("active", parseInt(el.getAttribute("data-step"), 10) === step);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".step-link"), function (el) {
      el.classList.toggle("active", parseInt(el.getAttribute("data-step"), 10) === step);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentStep() {
    var active = document.querySelector(".step.active");
    return active ? parseInt(active.getAttribute("data-step"), 10) : 1;
  }

  function attachEvents() {
    document.addEventListener("input", function (event) {
      if (!event.target.matches("[data-field], [data-row-field]")) return;
      state = collectState();
      save();
      update();
    });

    document.addEventListener("change", function (event) {
      var target = event.target;
      if (target.id === "indexSelect" && target.value) {
        var input = document.querySelector('[data-field="building.index"]');
        if (input) input.value = target.value;
      }
      if (target.id === "brwReportSelect") {
        updateBrwPresets();
        if (state.market.source !== "manual") {
          state.market.source = target.value;
          var sourceSelect = document.querySelector('[data-field="market.source"]');
          if (sourceSelect) sourceSelect.value = target.value;
        }
      }
      if (target.id === "brwPresetSelect" && target.value) {
        var brwInput = document.querySelector('[data-field="land.brw"]');
        if (brwInput) brwInput.value = target.value;
      }
      state = collectState();
      save();
      update();
    });

    document.addEventListener("click", function (event) {
      var addBtn = event.target.closest("[data-add]");
      if (addBtn) {
        var name = addBtn.getAttribute("data-add");
        state[name] = state[name] || [];
        state[name].push({ label: "", amount: 0 });
        renderRepeater(name, state[name]);
        save();
        update();
        return;
      }
      var removeBtn = event.target.closest("[data-remove]");
      if (removeBtn) {
        var listName = removeBtn.getAttribute("data-remove");
        var rows = Array.prototype.slice.call(document.querySelectorAll('[data-repeater="' + listName + '"]'));
        var index = rows.indexOf(removeBtn.closest('[data-repeater="' + listName + '"]'));
        state = collectState();
        state[listName].splice(index, 1);
        renderRepeater(listName, state[listName]);
        save();
        update();
        return;
      }
      var stepBtn = event.target.closest(".step-link");
      if (stepBtn) { showStep(stepBtn.getAttribute("data-step")); return; }
    });

    document.getElementById("prevBtn").addEventListener("click", function () { showStep(Math.max(1, currentStep() - 1)); });
    document.getElementById("nextBtn").addEventListener("click", function () { showStep(Math.min(8, currentStep() + 1)); });

    document.getElementById("loadExampleBtn").addEventListener("click", function () {
      state = merge(DATA.defaultState, DATA.examples.anDerLilie51);
      syncForm();
      save();
      update();
      showStep(1);
    });

    document.getElementById("resetBtn").addEventListener("click", function () {
      if (!window.confirm("Alle Eingaben wirklich zurücksetzen?")) return;
      state = clone(DATA.defaultState);
      syncForm();
      save();
      update();
      showStep(1);
    });

    ["printBtn", "printBtn2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", function () { window.print(); });
    });

    document.getElementById("copyBtn").addEventListener("click", function () {
      var result = update();
      var text = [
        "Verkehrswert-Rechner Ratingen",
        "Objekt: " + [state.object.street, state.object.zip, state.object.city].filter(Boolean).join(", "),
        "Stichtag: " + state.object.valuationDate,
        "Vorläufiger Sachwert: " + money(result.preliminary),
        "Sachwertfaktor: " + decimal(result.factor.final, 4),
        "Marktangepasster Sachwert: " + money(result.roundedValue),
        "RND: " + decimal(result.rnd.rnd) + " Jahre",
        state.wohnrecht.enabled && result.wohnrecht ? "Mit Wohnungsrecht: " + money(result.wohnrecht.burdenedRounded) : ""
      ].filter(Boolean).join("\n");

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
    });
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(area);
  }

  function init() {
    initStaticUi();
    syncForm();
    attachEvents();
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
