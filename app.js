(function () {
  "use strict";

  var DATA = window.VW_DATA;
  var CALC = window.VW_CALC;
  var BORIS = window.VW_BORIS || { meta: {}, zones: [] };
  var MAPS = window.VW_BORIS_MAPS || { locations: {} };
  var PDF = window.VW_PDF || { buildReport: function () { throw new Error("PDF module not loaded"); } };
  // Chart configs from the last render; re-used for the vector plots in the PDF.
  var reportCharts = {};
  var I18N = window.VW_I18N || { t: function (s) { return s; }, apply: function () {}, restore: function () {}, forget: function () {}, init: function () {}, setLanguage: function () {}, getLanguage: function () { return "de"; } };

  // Hover explanations for the technical abbreviations used in the wizard.
  // German meanings are the default and stay German in EN/ES, like the other
  // legal/technical terms. Detection works on the word under the caret, so it
  // also covers text generated later by JavaScript (BORIS notes, charts, ...).
  var ACRONYM_MEANINGS = {
    "BauGB": "Baugesetzbuch",
    "BGF": "Bruttogrundfläche",
    "BORIS": "Bodenrichtwertinformationssystem",
    "BRW": "Bodenrichtwert",
    "DHH": "Doppelhaushälfte",
    "EFH": "Einfamilienhaus",
    "GMB": "Grundstücksmarktbericht",
    "GND": "Gesamtnutzungsdauer",
    "ImmoWertV": "Immobilienwertermittlungsverordnung",
    "MFH": "Mehrfamilienhaus",
    "NHK": "Normalherstellungskosten",
    "PLZ": "Postleitzahl",
    "REH": "Reihenendhaus",
    "RND": "Restnutzungsdauer",
    "RMH": "Reihenmittelhaus",
    "SW-RL": "Sachwertrichtlinie",
    "WNUM": "Nummer des Bodenrichtwertes in der Gemeinde gemäß Landesschlüssel",
    "ZFH": "Zweifamilienhaus"
  };

  var STORAGE_KEY = "vw-ratingen-state-v1";
  var THEME_KEY = "vw-ratingen-theme";

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

  // Translates a German template and then inserts dynamic values. This keeps
  // composed sentences fully localized instead of leaving German fragments.
  function tr(template, values) {
    var out = I18N.t(template);
    Object.keys(values || {}).forEach(function (key) {
      out = out.split("{" + key + "}").join(values[key]);
    });
    return out;
  }

  var state = merge(DATA.defaultState, loadStored());
  if (state.market && state.market.source === "manual") state.market.source = "2026";

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
    populateSelect(document.getElementById("exampleSelect"), Object.keys(DATA.examples).map(function (key) {
      return { value: key, label: DATA.exampleLabels[key] };
    }));
    document.getElementById("exampleSelect").value = "anonymisiert";

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
      var fieldPath = "standard." + item.key;
      var inputId = "standard-" + item.key;
      var helpId = inputId + "-help";

      var row = document.createElement("div");
      row.className = "slider-field";

      var head = document.createElement("div");
      head.className = "slider-head";

      var label = document.createElement("label");
      label.className = "slider-label";
      label.htmlFor = inputId;
      label.textContent = item.label + " · " + Math.round(item.weight * 100) + " % Gewicht";

      var badge = document.createElement("span");
      badge.className = "slider-badge";
      badge.setAttribute("data-slider-badge", fieldPath);
      badge.textContent = "3,0";

      var input = document.createElement("input");
      input.type = "range";
      input.className = "standard-slider";
      input.id = inputId;
      input.min = "1";
      input.max = "5";
      input.step = "0.5";
      input.value = "3";
      input.setAttribute("data-field", fieldPath);
      input.setAttribute("aria-describedby", helpId);

      var scale = document.createElement("div");
      scale.className = "slider-scale";
      scale.innerHTML = "<span>1 einfach</span><span>5 sehr hoch</span>";

      var help = document.createElement("p");
      help.className = "slider-help";
      help.id = helpId;
      help.setAttribute("data-slider-help", fieldPath);

      head.appendChild(label);
      head.appendChild(badge);
      row.appendChild(head);
      row.appendChild(input);
      row.appendChild(scale);
      row.appendChild(help);
      standardWrap.appendChild(row);
    });

    var modernWrap = document.getElementById("modernizationFields");
    DATA.modernizationElements.forEach(function (item) {
      var fieldPath = "modernization." + item.key;
      var inputId = "modernization-" + item.key;
      var helpId = inputId + "-help";

      var row = document.createElement("div");
      row.className = "slider-field";

      var head = document.createElement("div");
      head.className = "slider-head";

      var label = document.createElement("label");
      label.className = "slider-label";
      label.htmlFor = inputId;
      label.textContent = item.label;

      var badge = document.createElement("span");
      badge.className = "slider-badge";
      badge.setAttribute("data-slider-badge", fieldPath);
      badge.textContent = "0 / " + item.max + " Punkte";

      var input = document.createElement("input");
      input.type = "range";
      input.className = "modernization-slider";
      input.id = inputId;
      input.min = "0";
      input.max = String(item.max);
      input.step = "1";
      input.value = "0";
      input.setAttribute("data-field", fieldPath);
      input.setAttribute("aria-describedby", helpId);

      var scale = document.createElement("div");
      scale.className = "slider-scale";
      scale.innerHTML = "<span>0</span><span>" + item.max + "</span>";

      var help = document.createElement("p");
      help.className = "slider-help";
      help.id = helpId;
      help.setAttribute("data-slider-help", fieldPath);

      head.appendChild(label);
      head.appendChild(badge);
      row.appendChild(head);
      row.appendChild(input);
      row.appendChild(scale);
      row.appendChild(help);
      modernWrap.appendChild(row);
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

  function borisZoneKey(zone) {
    return zone.jahr + "|" + zone.wnum;
  }

  function findBorisZone(key) {
    if (!key) return null;
    for (var i = 0; i < BORIS.zones.length; i++) {
      if (borisZoneKey(BORIS.zones[i]) === key) return BORIS.zones[i];
    }
    return null;
  }

  function borisLocationKey(zone) {
    return (zone.ortsteil || zone.gemarkung || "") + (zone.plz ? " · " + zone.plz : "");
  }

  function renderGemarkungOptions() {
    var list = document.getElementById("gemarkungOptions");
    if (!list) return;
    list.innerHTML = "";
    var names = [];
    BORIS.zones.forEach(function (zone) {
      if (zone.gemarkung && names.indexOf(zone.gemarkung) === -1) names.push(zone.gemarkung);
    });
    names.sort(function (a, b) { return String(a).localeCompare(String(b), "de"); });
    names.forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      list.appendChild(option);
    });
  }

  function renderBorisLocations() {
    var yearSelect = document.getElementById("borisYearSelect");
    var searchSelect = document.getElementById("borisSearchSelect");
    if (!yearSelect || !searchSelect) return;

    var year = yearSelect.value;
    var previous = searchSelect.value;
    var keys = [];
    BORIS.zones.forEach(function (zone) {
      if (year && String(zone.jahr) !== year) return;
      var key = borisLocationKey(zone);
      if (key && keys.indexOf(key) === -1) keys.push(key);
    });
    keys.sort(function (a, b) { return String(a).localeCompare(String(b), "de"); });

    var options = [{ value: "", label: "Alle Orte" }].concat(keys.map(function (key) {
      return { value: key, label: key };
    }));
    populateSelect(searchSelect, options);
    if (previous && keys.indexOf(previous) !== -1) searchSelect.value = previous;
  }

  function renderBorisZones() {
    var yearSelect = document.getElementById("borisYearSelect");
    var searchSelect = document.getElementById("borisSearchSelect");
    var zoneSelect = document.getElementById("borisZoneSelect");
    if (!yearSelect || !searchSelect || !zoneSelect) return;

    var year = yearSelect.value;
    var location = searchSelect.value;
    var filtered = BORIS.zones.filter(function (zone) {
      if (year && String(zone.jahr) !== year) return false;
      if (location && borisLocationKey(zone) !== location) return false;
      return true;
    });

    zoneSelect.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = filtered.length
      ? "Bitte Zone wählen (" + filtered.length + ")"
      : "Keine Zone gefunden";
    zoneSelect.appendChild(placeholder);

    filtered.forEach(function (zone) {
      var option = document.createElement("option");
      option.value = borisZoneKey(zone);
      option.textContent = [
        zone.jahr,
        "WNUM " + zone.wnum,
        zone.ortsteil || zone.gemarkung,
        zone.nutzungLabel || zone.nutzung,
        decimal(zone.brw, 2) + " €/m²",
        zone.stag
      ].filter(Boolean).join(" · ");
      zoneSelect.appendChild(option);
    });

    if (state.boris && state.boris.zoneKey) zoneSelect.value = state.boris.zoneKey;
    renderBorisMap(filtered);
    updateBorisSelectionInfo();
  }

  // Static OpenStreetMap background (bundled locally so file:// needs no live
  // tile request) plus the representative BRW points of the offline snapshot.
  // The image is cropped to the same EPSG:25832 extent (see the generator
  // script), so points and map share one fixed projection. This is orientation
  // only: the snapshot has no official zone polygons.
  function renderBorisMap(zones) {
    var host = document.getElementById("borisMap");
    var count = document.getElementById("borisMapCount");
    if (!host) return;

    var yearSelect = document.getElementById("borisYearSelect");
    var meta = BORIS.meta || {};
    var mapYear = (yearSelect && yearSelect.value) || String((meta.years || [])[0] || "");
    var points = (zones || []).filter(function (zone) {
      return (!mapYear || String(zone.jahr) === mapYear) && isFinite(zone.x) && isFinite(zone.y);
    });
    if (count) count.textContent = points.length + " Zonen · " + (mapYear || "alle Jahre");

    // With an Ortsteil/PLZ filter selected, show that area's own zoomed map;
    // otherwise the full Ratingen overview is used.
    var searchSelect = document.getElementById("borisSearchSelect");
    var locationKey = searchSelect ? searchSelect.value : "";
    var mapIndex = MAPS.locations || MAPS;
    var mapDef = mapIndex[locationKey] || null;
    var mapFile = mapDef ? mapDef.file : "assets/ratingen-basemap.png";

    var W = 720, H = 420;
    host.innerHTML = "";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    var image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("class", "basemap-image");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", String(W));
    image.setAttribute("height", String(H));
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("href", mapFile);
    image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", mapFile);
    svg.appendChild(image);

    if (!points.length) {
      var note = document.createElementNS("http://www.w3.org/2000/svg", "text");
      note.setAttribute("class", "empty-note");
      note.setAttribute("x", String(W / 2));
      note.setAttribute("y", String(H / 2));
      note.setAttribute("text-anchor", "middle");
      note.textContent = "Keine Zonen für diese Auswahl.";
      svg.appendChild(note);
      host.appendChild(svg);
      I18N.apply();
      return;
    }

    // Fixed extent from ALL snapshot zones (not just the filtered ones), so
    // the background and the dots stay registered when the filter changes.
    var all = (BORIS.zones || []).filter(function (z) { return isFinite(z.x) && isFinite(z.y); });
    var allX = all.map(function (z) { return Number(z.x); });
    var allY = all.map(function (z) { return Number(z.y); });
    var minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
    var minY = Math.min.apply(null, allY), maxY = Math.max.apply(null, allY);
    var padX = (maxX - minX) * 0.06, padY = (maxY - minY) * 0.08;
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;
    var extentHeight = maxY - minY || 1;
    var extentWidth = extentHeight * W / H;
    var centreX = (minX + maxX) / 2;
    minX = centreX - extentWidth / 2;
    maxX = centreX + extentWidth / 2;
    var spanX = maxX - minX || 1, spanY = maxY - minY || 1;

    // The zoomed image has its own georeferenced extent from the manifest.
    if (mapDef) {
      minX = CALC.num(mapDef.minX, minX); maxX = CALC.num(mapDef.maxX, maxX);
      minY = CALC.num(mapDef.minY, minY); maxY = CALC.num(mapDef.maxY, maxY);
      spanX = maxX - minX || 1; spanY = maxY - minY || 1;
    }

    var projectX = function (x) { return (Number(x) - minX) / spanX * W; };
    var projectY = function (y) { return H - (Number(y) - minY) / spanY * H; };

    var brws = points.map(function (z) { return CALC.num(z.brw, 0); });
    var minB = Math.min.apply(null, brws), maxB = Math.max.apply(null, brws);
    var spanB = maxB - minB || 1;

    points.forEach(function (zone) {
      var px = String(projectX(zone.x));
      var py = String(projectY(zone.y));

      // White halo makes the coloured dot readable on the OSM background and
      // on the inverted dark-mode map.
      var halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("class", "zone-halo");
      halo.setAttribute("cx", px);
      halo.setAttribute("cy", py);
      halo.setAttribute("r", "8.5");
      svg.appendChild(halo);

      var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "zone-point");
      circle.setAttribute("cx", px);
      circle.setAttribute("cy", py);
      circle.setAttribute("r", "6");
      circle.setAttribute("data-zone-key", borisZoneKey(zone));
      circle.setAttribute("tabindex", "0");
      circle.setAttribute("role", "button");
      circle.setAttribute("fill", "hsl(158 78% " + (66 - (CALC.num(zone.brw, 0) - minB) / spanB * 36).toFixed(1) + "%)");
      var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = zone.jahr + " · WNUM " + zone.wnum + " · " +
        (zone.ortsteil || zone.gemarkung || "") + " · " + decimal(zone.brw, 2) + " €/m²";
      circle.appendChild(title);
      svg.appendChild(circle);
    });

    host.appendChild(svg);
    syncBorisMapSelection();
    I18N.apply();
  }

  function syncBorisMapSelection() {
    var zoneSelect = document.getElementById("borisZoneSelect");
    var key = zoneSelect ? zoneSelect.value : "";
    Array.prototype.forEach.call(document.querySelectorAll("#borisMap .zone-point"), function (point) {
      point.classList.toggle("is-selected", point.getAttribute("data-zone-key") === key);
    });
  }

  // The snapshot has no "all years" view: a Bodenrichtwert is always tied to a
  // Stichtag. Prefer the loaded state's year, otherwise use the newest year.
  function preferredBorisYear() {
    var years = (BORIS.meta || {}).years || [];
    var latest = years.length ? String(years[0]) : "";
    // Only an explicit BORIS Stichtag counts as a stored year; the plain
    // valuation date of a fresh state must not override the newest snapshot.
    var date = (state.boris && state.boris.stag) || "";
    var match = String(date).match(/^(\d{4})/);
    var preferred = match ? match[1] : "";
    return years.map(String).indexOf(preferred) !== -1 ? preferred : latest;
  }

  function applyBorisYearFromState() {
    var yearSelect = document.getElementById("borisYearSelect");
    var searchSelect = document.getElementById("borisSearchSelect");
    if (!yearSelect) return;
    var year = preferredBorisYear();
    if (year) yearSelect.value = year;

    // Start without a location filter so the state's zone always wins over a
    // filter left over from a previously loaded example.
    if (searchSelect) searchSelect.value = "";
    renderBorisLocations();

    // Restore the example's Ortsteil/PLZ filter from its stored zone.
    if (searchSelect && state.boris && state.boris.zoneKey) {
      var zone = findBorisZone(state.boris.zoneKey);
      if (zone) {
        var location = borisLocationKey(zone);
        if (Array.prototype.some.call(searchSelect.options, function (option) {
          return option.value === location;
        })) searchSelect.value = location;
      }
    }
    renderBorisZones();
  }

  function initBorisUi() {
    var meta = BORIS.meta || {};
    setOutput("borisMeta", meta.source
      ? "Offline-Auszug vom " + meta.generated + " · " + meta.count + " Ratingen-Zonen · " + meta.license
      : "Keine Offline-Daten geladen. Bitte den Bodenrichtwert manuell eingeben.");

    var yearSelect = document.getElementById("borisYearSelect");
    if (yearSelect) {
      populateSelect(yearSelect, (meta.years || []).map(function (year) {
        return { value: String(year), label: String(year) };
      }));
    }
    renderGemarkungOptions();
    applyBorisYearFromState();
  }

  // Hover labels for abbreviations. The word under the caret is inspected, so
  // this also works for text created later by JS (BORIS notes, chart, results).
  function initAcronymTooltips() {
    var tip = document.createElement("div");
    tip.id = "acronymTooltip";
    tip.className = "acronym-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);

    var wordChar = /[A-Za-zÄÖÜäöüß0-9.-]/;
    var pending = null;
    var frame = 0;

    function wordAt(x, y) {
      var range = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (!range || range.startContainer.nodeType !== 3) return null;
      var text = range.startContainer.nodeValue || "";
      var start = range.startOffset, end = range.startOffset;
      while (start > 0 && wordChar.test(text.charAt(start - 1))) start--;
      while (end < text.length && wordChar.test(text.charAt(end))) end++;
      if (start === end) return null;
      return text.slice(start, end).replace(/^[.\-]+|[.\-]+$/g, "");
    }

    function hide() {
      if (!tip.hidden) tip.hidden = true;
    }

    function render() {
      frame = 0;
      if (!pending) return;
      var word = wordAt(pending.x, pending.y);
      var meaning = word && ACRONYM_MEANINGS[word];
      if (!meaning) { hide(); return; }
      tip.textContent = I18N.t(meaning);
      tip.hidden = false;
      var margin = 10;
      var box = tip.getBoundingClientRect();
      var left = Math.min(Math.max(margin, pending.x - box.width / 2), window.innerWidth - box.width - margin);
      var top = pending.y - box.height - 10;
      if (top < margin) top = pending.y + 20;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }

    document.addEventListener("mousemove", function (event) {
      if (event.target && event.target.closest &&
          event.target.closest("input, select, textarea, button, #acronymTooltip")) {
        hide();
        return;
      }
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(render);
    });
    document.addEventListener("mouseleave", hide);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
  }

  // Selecting a zone (dropdown or map point) immediately becomes the active
  // BRW. There is no separate apply step; the value can still be overwritten
  // directly in the Bodenrichtwert field at any time.
  function applyBorisZone(zone) {
    if (!zone) return;
    var zoneSelect = document.getElementById("borisZoneSelect");
    var searchSelect = document.getElementById("borisSearchSelect");
    var key = borisZoneKey(zone);

    if (zoneSelect) zoneSelect.value = key;
    if (searchSelect) {
      var location = borisLocationKey(zone);
      if (Array.prototype.some.call(searchSelect.options, function (option) {
        return option.value === location;
      })) searchSelect.value = location;
    }

    var hidden = {
      borisZoneKey: key,
      borisStag: zone.stag,
      borisBrw: zone.brw,
      borisSource: (BORIS.meta || {}).source || "BORISplus.NRW"
    };
    Object.keys(hidden).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = hidden[id];
    });
    var brwInput = document.querySelector('[data-field="land.brw"]');
    if (brwInput) brwInput.value = zone.brw;

    state = collectState();
    // Rebuild the zone list so it only contains zones matching Jahr + Ortsteil/PLZ.
    renderBorisZones();
    save();
    update();
  }

  function updateBorisSelectionInfo() {
    var zoneSelect = document.getElementById("borisZoneSelect");
    var info = document.getElementById("borisZoneInfo");
    var value = document.getElementById("borisSelectedValue");
    var note = document.getElementById("borisOverwriteNote");
    if (!zoneSelect || !info || !value || !note) return;
    syncBorisMapSelection();

    var zone = findBorisZone(zoneSelect.value);
    if (!zone) {
      info.textContent = "Keine Zone ausgewählt.";
      value.textContent = "–";
      note.textContent = "Manueller Wert – keine BORIS-Zone ausgewählt.";
      return;
    }

    info.textContent = "Stichtag " + zone.stag + " · WNUM " + zone.wnum +
      (zone.ortsteil ? " · " + zone.ortsteil : "") +
      (zone.plz ? " · PLZ " + zone.plz : "");
    value.textContent = money2(zone.brw) + " / m²";

    var current = CALC.num(state.land.brw, NaN);
    if (isFinite(current) && Math.abs(current - zone.brw) < 0.005) {
      note.textContent = "Wert aus der Offline-Auswahl übernommen. Sie können ihn jederzeit überschreiben.";
    } else {
      note.textContent = "Manuell überschrieben – BORIS zeigt " + money2(zone.brw) + " / m².";
    }
  }

  function renderRepeater(name, items) {
    var container = document.getElementById(name + "List");
    if (!container) return;
    container.innerHTML = "";
    var placeholder = name === "deductions"
      ? "z. B. Feuchtigkeitsschaden"
      : "z. B. Wintergarten";
    (items || []).forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = "repeater-row";
      row.setAttribute("data-repeater", name);
      row.innerHTML =
        '<label class="field">Bezeichnung<input type="text" data-row-field="label" placeholder="' + placeholder + '"></label>' +
        '<label class="field">Betrag (€)<input type="number" step="1" data-row-field="amount" placeholder="−5000 oder +5000"></label>' +
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

  // Modernisierungspunkte are whole points only (ImmoWertV, Anlage 2). The
  // range controls already use step="1"; this also normalises loaded JSON.
  function normalizedModernizationValue(path, value) {
    var key = path.indexOf("modernization.") === 0 ? path.split(".")[1] : "";
    var defs = (DATA.modernizationElements || []).filter(function (item) { return item.key === key; });
    var points = Math.round(CALC.num(value, 0));
    if (!defs.length) return points;
    return Math.min(defs[0].max, Math.max(0, points));
  }

  function collectState() {
    var next = clone(state);
    Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (input) {
      var path = input.getAttribute("data-field");
      var value;
      if (input.type === "checkbox") value = input.checked;
      else if (input.type === "number" || input.type === "range") value = input.value === "" ? "" : CALC.num(input.value, 0);
      else value = input.value;
      if (path.indexOf("modernization.") === 0) value = normalizedModernizationValue(path, value);
      setField(next, path, value);
    });
    next.extras = collectRepeater("extras");
    next.deductions = collectRepeater("deductions");
    return next;
  }

  function updateSliderDisplays() {
    var standardByKey = {};
    var modernizationByKey = {};
    DATA.standardWeights.forEach(function (item) { standardByKey[item.key] = item; });
    DATA.modernizationElements.forEach(function (item) { modernizationByKey[item.key] = item; });

    Array.prototype.forEach.call(document.querySelectorAll("[data-slider-badge]"), function (badge) {
      var fieldPath = badge.getAttribute("data-slider-badge");
      var isStandard = fieldPath.indexOf("standard.") === 0;
      var key = fieldPath.split(".")[1];
      var element = isStandard ? standardByKey[key] : modernizationByKey[key];
      var input = document.querySelector('[data-field="' + fieldPath + '"]');
      if (!element || !input) return;

      var raw = CALC.num(input.value, isStandard ? 3 : 0);
      var index;
      if (isStandard) {
        // NHK 2010 defines whole levels 1-5. A half step belongs to the lower
        // level, so 3 and 3.5 share the same description and example; the
        // weighted value itself is still shown in the badge.
        index = Math.min(5, Math.max(1, Math.floor(raw + 1e-9))) - 1;
        badge.textContent = decimal(raw, 1);
      } else {
        index = Math.min(element.max, Math.max(0, Math.round(raw)));
        badge.textContent = index + " / " + element.max + " Punkte";
      }

      var help = document.querySelector('[data-slider-help="' + fieldPath + '"]');
      if (!help) return;
      help.innerHTML = "";

      var meaning = document.createElement("span");
      meaning.className = "slider-help-main";
      var text = element.explanations && element.explanations[index];
      if (isStandard) {
        // Separate text nodes let the translator handle "Bedeutung: " and
        // "Stufe 3" (the correct whole NHK level) independently.
        meaning.appendChild(document.createTextNode("Bedeutung: "));
        var levelTag = document.createElement("span");
        levelTag.className = "slider-help-level";
        levelTag.textContent = "Stufe " + (index + 1);
        meaning.appendChild(levelTag);
        meaning.appendChild(document.createTextNode(" – "));
        meaning.appendChild(document.createTextNode(text || "Keine Beschreibung verfügbar."));
      } else {
        meaning.textContent = text ? "Bedeutung: " + text : "Keine Beschreibung verfügbar.";
      }
      help.appendChild(meaning);

      var example = element.examples && element.examples[index];
      if (example) {
        var sample = document.createElement("span");
        sample.className = "slider-help-example";
        sample.textContent = "Beispiel: " + example;
        help.appendChild(sample);
      }
    });
  }

  function syncForm() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (input) {
      var path = input.getAttribute("data-field");
      var value = getField(state, path);
      if (path.indexOf("modernization.") === 0) value = normalizedModernizationValue(path, value);
      if (input.type === "checkbox") input.checked = !!value;
      else input.value = (value === undefined || value === null) ? "" : value;
    });
    renderRepeater("extras", state.extras);
    renderRepeater("deductions", state.deductions);

    var source = state.market.source;
    var globalReport = document.getElementById("globalReportSelect");
    if (globalReport) globalReport.value = source;
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
    renderBorisZones();
    updateSliderDisplays();
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
      ["Marktangepasster Sachwert", "vorläufiger Sachwert × Faktor", money(r.marketAdaptedValue)]
    ];

    if (r.tenancy && r.tenancy.enabled) {
      var t = r.tenancy;
      rows.push(["Mietdifferenz je Monat", "Marktmiete − Ist-Miete", money2(t.monthlyDiff)]);
      rows.push(["Wirksame Anpassungsdauer", "min(Anpassung, Laufzeit + Frist, RND)", decimal(t.years) + " Jahre"]);
      rows.push(["Barwertfaktor", "Abzinsung " + decimal(state.tenancy.discountRate, 1) + " %", decimal(t.pvFactor, 4)]);
      rows.push(["Mietkorrektur", "Differenz × Barwert × (1 − Risiko)", money(t.correction)]);
      rows.push(["Sachwert nach Mietkorrektur", "besonderes Merkmal nach § 8 Abs. 3", money(t.after)]);
    }

    rows.push(["Gerundeter Sachwert", "auf volle 1.000 €", money(r.roundedValue)]);

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

  function markOverwritten(input, overwritten) {
    if (!input) return;
    input.classList.toggle("overwritten", !!overwritten);
    var badge = input.parentElement && input.parentElement.querySelector(".overwrite-badge");
    if (badge) badge.classList.toggle("hidden", !overwritten);
  }

  function updateOverwriteMarks() {
    var zone = findBorisZone(state.boris.zoneKey);
    var currentBrw = CALC.num(state.land.brw, NaN);
    markOverwritten(document.querySelector('[data-field="land.brw"]'),
      !!zone && isFinite(currentBrw) && Math.abs(currentBrw - zone.brw) >= 0.005);

    var adjustment = Math.abs(CALC.num(state.market.adjustmentPct, 0));
    markOverwritten(document.querySelector('[data-field="market.adjustmentPct"]'), adjustment > 0.0001);

    var factorSource = document.querySelector('[data-output="factorSource"]');
    if (factorSource) factorSource.classList.toggle("adjusted", adjustment > 0.0001);
  }

  // A manually changed BRW no longer matches the selected BORIS zone, so the
  // historic series would be misleading. Hide it and say why.
  function brwManuallyOverwritten() {
    var current = CALC.num(state.land.brw, NaN);
    if (!isFinite(current)) return false;
    var original = CALC.num(state.boris.brw, NaN);
    return !(isFinite(original) && state.boris.zoneKey && Math.abs(current - original) < 0.005);
  }

  function renderBrwTrend() {
    var chart = document.getElementById("brwTrendChart");
    var body = document.querySelector("#brwTrendTable tbody");
    var note = document.getElementById("brwTrendNote");
    if (!chart || !body || !note) return;
    reportCharts.brw = null;

    chart.innerHTML = "";
    body.innerHTML = "";
    // The note keeps its text node across renders, so drop the stored original
    // before writing new German text; I18N.apply() at the end of update()
    // then translates the current wording (including the forecast sentence).
    if (I18N.forget) I18N.forget(note);

    var empty = document.createElement("tr");
    var cell = document.createElement("td");
    cell.colSpan = 4;
    empty.appendChild(cell);
    body.appendChild(empty);

    if (brwManuallyOverwritten()) {
      note.textContent = "Manuell eingegebener Wert – keine Entwicklung aus BORIS verfügbar.";
      cell.textContent = "Manueller Wert – keine BORIS-Zeitreihe.";
      return;
    }

    var zone = findBorisZone(state.boris.zoneKey);
    if (!zone) {
      note.textContent = "Bitte zuerst eine Richtwertzone auswählen – der BRW wird automatisch übernommen.";
      cell.textContent = "Keine Zone ausgewählt.";
      return;
    }

    var history = BORIS.zones.filter(function (item) { return item.wnum === zone.wnum; })
      .sort(function (a, b) { return a.jahr - b.jahr; });
    if (!history.length) {
      note.textContent = "Für diese Zone liegen keine Stichtage im Offline-Auszug vor.";
      cell.textContent = "Keine Daten für diese Zone.";
      return;
    }

    // Least-squares line through all available Stichtage, continued one year.
    // This is an illustrative trend only, never an official Bodenrichtwert.
    var count = history.length;
    var meanX = 0, meanY = 0;
    history.forEach(function (item) { meanX += item.jahr; meanY += item.brw; });
    meanX /= count; meanY /= count;
    var numerator = 0, denominator = 0;
    history.forEach(function (item) {
      var dx = item.jahr - meanX;
      numerator += dx * (item.brw - meanY);
      denominator += dx * dx;
    });
    var slope = denominator ? numerator / denominator : 0;
    var forecastYear = history[count - 1].jahr + 1;
    var peak = history.reduce(function (m, item) { return Math.max(m, item.brw); }, 0);
    var forecast = Math.max(0, Math.min(peak * 2, Math.round(meanY + slope * (forecastYear - meanX))));

    note.textContent = "WNUM " + zone.wnum + " · " + history.length +
      " Stichtage im Offline-Auszug. Bodenrichtwerte sind gebietstypische Durchschnitte, keine Kaufpreise." +
      " Durchgezogene Linie = bisheriger Trend; Steigung " + money2(slope) +
      "/m² pro Jahr. Gestrichelt: Prognose " + forecastYear +
      " (lineare Fortschreibung, kein amtlicher Wert, nicht in der Berechnung verwendet).";

    // Draw bars and the trend line as one SVG so the line always meets the
    // bar tops, even while step 2 is still hidden during initial load.
    var ns = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs, text) {
      var el = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, String(attrs[key])); });
      if (text !== undefined) el.textContent = text;
      return el;
    }
    var slot = 92, pad = 14, barWidth = 38;
    var width = pad * 2 + slot * (count + 1), height = 180;
    var baseline = 132, plotHeight = 100;
    var maxValue = Math.max.apply(null, history.map(function (item) { return item.brw; }).concat([forecast])) || 1;
    var centerX = function (index) { return pad + slot * index + slot / 2; };
    var barTop = function (value) { return baseline - Math.max(3, value / maxValue * plotHeight); };

    var svg = svgEl("svg", {
      "class": "brw-svg", viewBox: "0 0 " + width + " " + height,
      role: "img", "aria-label": "Bodenrichtwert-Entwicklung"
    });
    svg.appendChild(svgEl("line", { "class": "brw-baseline", x1: pad, y1: baseline, x2: width - pad, y2: baseline }));

    var actualPoints = [];
    history.forEach(function (item, index) {
      var x = centerX(index), y = barTop(item.brw);
      actualPoints.push([x, y]);
      svg.appendChild(svgEl("rect", {
        "class": "brw-bar", x: x - barWidth / 2, y: y,
        width: barWidth, height: baseline - y, rx: 4
      }));
      svg.appendChild(svgEl("text", {
        "class": "brw-bar-value", x: x, y: Math.max(12, y - 7), "text-anchor": "middle"
      }, money2(item.brw)));
      svg.appendChild(svgEl("text", {
        "class": "brw-bar-year", x: x, y: 152, "text-anchor": "middle"
      }, String(item.jahr)));

      var row = document.createElement("tr");
      var change = index === 0 ? "–" : percent((item.brw / history[index - 1].brw - 1) * 100);
      [String(item.jahr), item.stag, money2(item.brw) + "/m²", change].forEach(function (text) {
        var td = document.createElement("td");
        td.textContent = text;
        row.appendChild(td);
      });
      body.appendChild(row);
    });

    svg.appendChild(svgEl("polyline", {
      "class": "brw-trend-line",
      points: actualPoints.map(function (point) { return point[0] + "," + point[1]; }).join(" ")
    }));
    actualPoints.forEach(function (point) {
      svg.appendChild(svgEl("circle", { "class": "brw-trend-dot", cx: point[0], cy: point[1], r: 2.8 }));
    });

    var last = actualPoints[actualPoints.length - 1];
    var forecastX = centerX(count), forecastY = barTop(forecast);
    svg.appendChild(svgEl("line", {
      "class": "brw-forecast-line", x1: last[0], y1: last[1], x2: forecastX, y2: forecastY
    }));
    svg.appendChild(svgEl("rect", {
      "class": "brw-forecast-bar", x: forecastX - barWidth / 2, y: forecastY,
      width: barWidth, height: baseline - forecastY, rx: 4
    }));
    svg.appendChild(svgEl("text", {
      "class": "brw-forecast-value", x: forecastX, y: Math.max(12, forecastY - 7), "text-anchor": "middle"
    }, money2(forecast)));
    svg.appendChild(svgEl("text", {
      "class": "brw-bar-year", x: forecastX, y: 152, "text-anchor": "middle"
    }, String(forecastYear)));
    svg.appendChild(svgEl("text", {
      "class": "brw-forecast-caption", x: forecastX, y: 166, "text-anchor": "middle"
    }, "Prognose"));
    chart.appendChild(svg);

    var forecastRow = document.createElement("tr");
    forecastRow.className = "brw-forecast-row";
    var lastBrw = history[count - 1].brw;
    [String(forecastYear) + " (Prognose)", "–", money2(forecast) + "/m²",
      percent((forecast / (lastBrw || 1) - 1) * 100)].forEach(function (text) {
      var td = document.createElement("td");
      td.textContent = text;
      forecastRow.appendChild(td);
    });
    body.appendChild(forecastRow);

    var chartX = function (index) { return count ? index / count : 0; };
    var chartY = function (value) { return Math.max(0, Math.min(1, (Number(value) || 0) / (maxValue || 1))); };
    reportCharts.brw = {
      title: I18N.t("Bodenrichtwert-Entwicklung"),
      height: 122,
      grid: [0, 0.5, 1],
      plots: [
        { type: "bars", bars: history.map(function (item, index) {
          return { x: chartX(index), y: chartY(item.brw), width: 0.11, color: "0.42 0.62 0.72" };
        }).concat([{ x: 1, y: chartY(forecast), width: 0.11, color: "0.82 0.54 0.24" }]) },
        { type: "line", points: history.map(function (item, index) {
          return [chartX(index), chartY(item.brw)];
        }), color: "0.10 0.29 0.37", width: 1.4 },
        { type: "line", points: [
          [chartX(count - 1), chartY(history[count - 1].brw)], [1, chartY(forecast)]
        ], color: "0.71 0.37 0.17", width: 1.4, dash: [3, 2] },
        { type: "dots", points: history.map(function (item, index) {
          return [chartX(index), chartY(item.brw)];
        }), color: "0.10 0.29 0.37", size: 3 },
        { type: "labels", items: history.map(function (item, index) {
          return { x: chartX(index), y: Math.min(0.96, chartY(item.brw) + 0.05), text: money2(item.brw), size: 6.5 };
        }).concat([{ x: 1, y: Math.min(0.96, chartY(forecast) + 0.05), text: money2(forecast), size: 6.5 }]) }
      ],
      xLabels: history.map(function (item, index) {
        return { x: chartX(index), text: String(item.jahr) };
      }).concat([{ x: 1, text: I18N.t("Prognose") + " " + String(forecastYear) }]),
      yLabels: [
        { y: 0, text: "0" },
        { y: 1, text: money2(maxValue) }
      ],
      caption: note.textContent
    };
  }

  function updateNhkTypeInfo() {
    var host = document.getElementById("nhkTypeInfo");
    if (!host) return;
    var select = document.getElementById("buildingTypeSelect");
    var key = (select && select.value) || state.building.type || "3.01";
    Array.prototype.forEach.call(host.querySelectorAll("[data-nhk-type]"), function (el) {
      el.hidden = el.getAttribute("data-nhk-type") !== key;
    });
    var type = DATA.nhkTypes[key];
    var level3 = type && type.levels ? type.levels[2] : NaN;
    setOutput("nhkReferenceCost", isFinite(level3) ? money(level3) + "/m² BGF" : "–");
  }

  function factorSeries(factors, key) {
    return factors.x.map(function (x, index) {
      return { x: x, y: factors[key] ? factors[key][index] : null };
    }).filter(function (point) {
      return point.y !== null && point.y !== undefined && isFinite(point.y);
    });
  }

  function renderFactorCurve(host, factors, key, preliminary) {
    host.innerHTML = "";
    var points = factorSeries(factors, key);
    if (points.length < 2) return;

    var ns = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs, text) {
      var el = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (name2) { el.setAttribute(name2, String(attrs[name2])); });
      if (text !== undefined) el.textContent = text;
      return el;
    }

    var width = 520, height = 160, left = 50, right = 16, top = 18, bottom = 30;
    var minX = points[0].x, maxX = points[points.length - 1].x;
    var values = points.map(function (point) { return point.y; });
    var minY = Math.min.apply(null, values), maxY = Math.max.apply(null, values);
    var pad = (maxY - minY) * 0.18 || 0.05;
    var xAt = function (x) { return left + (x - minX) / (maxX - minX || 1) * (width - left - right); };
    var yAt = function (y) { return top + (maxY + pad - y) / (maxY - minY + 2 * pad || 1) * (height - top - bottom); };

    var svg = svgEl("svg", {
      "class": "factor-svg", viewBox: "0 0 " + width + " " + height,
      role: "img", "aria-label": "Sachwertfaktor in Abhängigkeit vom vorläufigen Sachwert"
    });
    [0, 1 / 3, 2 / 3, 1].forEach(function (share) {
      var y = top + share * (height - top - bottom);
      svg.appendChild(svgEl("line", {
        "class": "factor-svg-grid", x1: left, y1: y, x2: width - right, y2: y
      }));
    });
    svg.appendChild(svgEl("polyline", {
      "class": "factor-svg-line",
      points: points.map(function (point) { return xAt(point.x) + "," + yAt(point.y); }).join(" ")
    }));

    var currentX = Math.min(maxX, Math.max(minX, preliminary));
    var currentY = CALC.interpolateSeries(points, currentX, "", null);
    if (isFinite(currentY)) {
      svg.appendChild(svgEl("line", {
        "class": "factor-svg-current", x1: xAt(currentX), y1: top,
        x2: xAt(currentX), y2: height - bottom
      }));
      svg.appendChild(svgEl("circle", {
        "class": "factor-svg-dot", cx: xAt(currentX), cy: yAt(currentY), r: 4
      }));
      svg.appendChild(svgEl("text", {
        "class": "factor-svg-value", x: Math.min(xAt(currentX) + 8, width - 58), y: Math.max(top + 10, yAt(currentY) - 8)
      }, decimal(currentY, 4)));
    }
    svg.appendChild(svgEl("text", { "class": "factor-svg-label", x: left, y: height - 8 }, money(minX)));
    svg.appendChild(svgEl("text", {
      "class": "factor-svg-label", x: width - right, y: height - 8, "text-anchor": "end"
    }, money(maxX)));
    svg.appendChild(svgEl("text", { "class": "factor-svg-label", x: 4, y: top + 4 }, decimal(maxY + pad, 2)));
    svg.appendChild(svgEl("text", {
      "class": "factor-svg-label", x: 4, y: height - bottom, "text-anchor": "start"
    }, decimal(minY - pad, 2)));
    host.appendChild(svg);
  }

  // Destatis Baupreisindex series (Tabelle 61261-0002). The chart is a visual
  // aid only; the numeric value in the select/input remains authoritative.
  // Building age, default GND and the modernization-related RND extension on
  // one timeline. The same normalised data is reused by the PDF chart.
  function modernizationGrade(points) {
    var value = Math.max(0, Math.min(20, Math.round(CALC.num(points, 0))));
    var grades = DATA.modernizationGrades || [];
    for (var i = 0; i < grades.length; i++) {
      if (value >= grades[i].min && value <= grades[i].max) return grades[i];
    }
    return grades[grades.length - 1] || { label: "nicht modernisiert", range: "0 bis 1 Punkt" };
  }

  function modernizationGradeText(points) {
    var grade = modernizationGrade(points);
    return I18N.t(grade.label) + " (" + I18N.t(grade.range) + ")";
  }

  // The calculation stores a German method string with a dynamic point count.
  // Use a translation template so the count is localised in EN/ES as well.
  function rndMethodText(result) {
    var method = result && result.rnd && result.rnd.method ? result.rnd.method : "";
    var prefix = "ImmoWertV-Anlage-2-Modell (";
    if (method.indexOf(prefix) === 0) {
      return tr("ImmoWertV-Anlage-2-Modell ({points} Punkte)", { points: result.rnd.points });
    }
    return I18N.t(method);
  }

  function renderModernizationGrade(result) {
    var badge = document.getElementById("modernizationGrade");
    var reason = document.getElementById("modernizationGradeReason");
    if (!badge || !reason || !result || !result.rnd) return;
    var grade = modernizationGrade(result.rnd.points);
    var values = {
      points: decimal(result.rnd.points, 0),
      grade: I18N.t(grade.label),
      range: I18N.t(grade.range)
    };
    if (I18N.forget) I18N.forget(badge);
    if (I18N.forget) I18N.forget(reason);
    badge.textContent = tr("Modernisierungsgrad: {grade} ({range}) · {points} Modernisierungspunkte", values);
    reason.textContent = tr("Aus {points} Modernisierungspunkten ergibt sich nach Tabelle 2 der Anlage 2 ImmoWertV der Modernisierungsgrad {grade} ({range}).", values);
  }

  function renderAgeTimeline(result) {
    var host = document.getElementById("ageTimelineChart");
    var note = document.getElementById("ageTimelineNote");
    var status = document.getElementById("ageModelStatus");
    if (!host || !result || !result.rnd) { reportCharts.age = null; return; }
    if (I18N.forget && note) I18N.forget(note);
    if (I18N.forget && status) I18N.forget(status);

    var rnd = result.rnd;
    var gnd = Math.max(1, CALC.num(state.building.gnd, 80));
    var buildYear = CALC.num(state.building.year, new Date().getFullYear());
    var valuationYear = CALC.num(state.building.valuationYear || String(state.object.valuationDate || "").slice(0, 4),
      new Date().getFullYear());
    var defaultEnd = buildYear + gnd;
    var effectiveEnd = valuationYear + rnd.rnd;
    var extension = Math.max(0, effectiveEnd - defaultEnd);
    // Anlage 2, II.2: "Liegt das relative Alter unterhalb des in der Tabelle 3
    // angegebenen Wertes ... RND = GND - Alter." At or above that value the
    // model formula applies. Show the limit for every point count 0-20.
    var modelParams = DATA.rndParameters[Math.min(20, Math.max(1, rnd.points))] || DATA.rndParameters[1];
    var modelLimit = modelParams.abRelAlter;
    var modelYear = buildYear + gnd * modelLimit;
    var relativeAge = rnd.age / gnd;
    var modelApplicable = relativeAge >= modelLimit;
    var start = buildYear;
    var end = Math.max(defaultEnd, effectiveEnd, valuationYear) || start + 1;
    var span = Math.max(1, end - start);
    var nx = function (year) { return Math.max(0, Math.min(1, (year - start) / span)); };

    var ns = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs, text) {
      var el = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, String(attrs[key])); });
      if (text !== undefined) el.textContent = text;
      return el;
    }

    var width = 520, height = 176, left = 14, right = 14;
    var usable = width - left - right;
    var trackY = 78, barH = 18;
    var topRows = [12, 24, 36, 48];
    var valueRows = [108, 120, 132];
    var px = function (year) { return left + nx(year) * usable; };
    var topLabels = [];
    var valueLabels = [];

    var svg = svgEl("svg", {
      "class": "age-svg", viewBox: "0 0 " + width + " " + height,
      role: "img", "aria-label": "Gebäudealter, Gesamtnutzungsdauer und Restnutzungsdauer"
    });
    svg.appendChild(svgEl("rect", {
      "class": "age-timeline-track", x: left, y: trackY, width: usable, height: barH, rx: 6
    }));
    svg.appendChild(svgEl("rect", {
      "class": "age-timeline-used", x: left, y: trackY,
      width: Math.max(1, px(valuationYear) - left), height: barH, rx: 4
    }));
    svg.appendChild(svgEl("rect", {
      "class": "age-timeline-remaining", x: px(valuationYear), y: trackY,
      width: Math.max(1, px(defaultEnd) - px(valuationYear)), height: barH, rx: 4
    }));
    if (extension > 0.01) {
      svg.appendChild(svgEl("rect", {
        "class": "age-timeline-extension", x: px(defaultEnd), y: trackY,
        width: Math.max(2, px(effectiveEnd) - px(defaultEnd)), height: barH, rx: 4
      }));
    }
    if (modelYear >= start && modelYear <= end) {
      svg.appendChild(svgEl("line", {
        "class": "age-timeline-limit", x1: px(modelYear), y1: trackY - 12,
        x2: px(modelYear), y2: trackY + barH + 12
      }));
    }

    function addLabel(collection, text, x, anchor, cssClass) {
      if (!text) return;
      var label = String(text);
      var approxWidth = label.length * 5.1;
      var labelLeft = anchor === "start" ? x
        : anchor === "end" ? x - approxWidth
          : x - approxWidth / 2;
      collection.push({
        text: label, x: x, anchor: anchor || "middle", cls: cssClass,
        left: labelLeft, right: labelLeft + approxWidth
      });
    }

    function placeLabels(collection, rows) {
      var cursors = rows.map(function () { return -Infinity; });
      collection.sort(function (a, b) { return a.left - b.left; });
      collection.forEach(function (item) {
        var row = 0;
        while (row < rows.length - 1 && cursors[row] + 6 > item.left) row++;
        item.y = rows[row];
        cursors[row] = item.right;
      });
      collection.forEach(function (item) {
        svg.appendChild(svgEl("text", {
          "class": item.cls, x: item.x, y: item.y, "text-anchor": item.anchor
        }, item.text));
      });
    }

    function marker(year, label, valueLabel, anchor) {
      var x = px(year);
      svg.appendChild(svgEl("line", {
        "class": "age-timeline-marker", x1: x, y1: trackY - 7, x2: x, y2: trackY + barH + 7
      }));
      addLabel(topLabels, label, x, anchor || "middle", "age-timeline-label");
      addLabel(valueLabels, valueLabel, x, anchor || "middle", "age-timeline-value");
    }

    marker(buildYear,
      I18N.t("Bau") + " " + String(buildYear),
      I18N.t("Alter") + " " + decimal(rnd.age, 0) + " " + I18N.t("J."), "start");
    marker(valuationYear,
      "Stichtag " + String(valuationYear),
      "RND " + decimal(rnd.rnd, 0) + " " + I18N.t("J."), "middle");
    marker(defaultEnd,
      I18N.t("GND-Ende") + " " + String(Math.round(defaultEnd)),
      I18N.t("linear") + " " + decimal(rnd.linearRnd, 0) + " " + I18N.t("J."), "middle");
    if (extension > 0.01) {
      marker(effectiveEnd,
        I18N.t("mit Umbau") + " " + String(Math.round(effectiveEnd)),
        "+" + decimal(extension, 0) + " " + I18N.t("J."), "end");
    }
    if (modelYear >= start && modelYear <= end) {
      addLabel(topLabels, I18N.t("Modellgrenze"), px(modelYear), "middle", "age-timeline-limit-label");
    }
    placeLabels(topLabels, topRows);
    placeLabels(valueLabels, valueRows);

    svg.appendChild(svgEl("text", {
      "class": "age-timeline-label", x: left, y: height - 6, "text-anchor": "start"
    }, I18N.t("Baujahr")));
    svg.appendChild(svgEl("text", {
      "class": "age-timeline-label", x: width - right, y: height - 6, "text-anchor": "end"
    }, I18N.t("Ende der Nutzung")));
    host.innerHTML = "";
    host.appendChild(svg);
    if (I18N.apply) I18N.apply(host);

    var values = {
      points: decimal(rnd.points, 0),
      age: percent(relativeAge * 100),
      limit: percent(modelLimit * 100),
      rnd: decimal(rnd.rnd, 0),
      ext: decimal(extension, 0)
    };

    if (status) {
      status.classList.toggle("is-applicable", modelApplicable);
      status.classList.toggle("is-blocked", !modelApplicable);
      status.textContent = !modelApplicable
        ? tr("{points} Modernisierungspunkte · relatives Alter {age} < Modellgrenze {limit} → Modellformel noch nicht anwendbar; lineare RND {rnd} Jahre.", values)
        : extension > 0.01
          ? tr("{points} Modernisierungspunkte · relatives Alter {age} ≥ Modellgrenze {limit} → Modellformel anwendbar: RND {rnd} Jahre, Verlängerung +{ext} Jahre.", values)
          : tr("{points} Modernisierungspunkte · relatives Alter {age} ≥ Modellgrenze {limit} → Modellformel anwendbar, aber ohne Verlängerung: RND {rnd} Jahre.", values);
    }

    var reason = document.getElementById("ageModelReason");
    if (reason) {
      if (I18N.forget) I18N.forget(reason);
      reason.textContent = !modelApplicable
        ? tr("Anlage 2, II.2 verlangt unterhalb von {limit} relativem Alter ausdrücklich RND = GND − Alter. Mit {age} liegt das Gebäude darunter; deshalb bleibt die lineare RND {rnd} Jahre.", values)
        : extension > 0.01
          ? tr("Anlage 2, II.2 wendet die Modellformel ab {limit} relativem Alter an. Mit {age} liegt der Stichtag mindestens auf der Grenze; deshalb ergibt das Modell RND {rnd} Jahre und verlängert die lineare RND um {ext} Jahre. Unterhalb der Grenze würde RND = GND − Alter gelten.", values)
          : tr("Anlage 2, II.2 wendet die Modellformel ab {limit} relativem Alter an. Mit {age} liegt der Stichtag mindestens auf der Grenze, das Modell ergibt aber keine Verlängerung; die RND bleibt bei {rnd} Jahren.", values);
    }

    if (note) {
      note.textContent =
        tr("Standard-GND {gnd} Jahre: Bau {build}, Stichtag {date}, lineares Ende {end}.", {
          gnd: decimal(gnd, 0), build: String(buildYear),
          date: String(valuationYear), end: String(Math.round(defaultEnd))
        }) + " " +
        tr(!modelApplicable
          ? "{points} Modernisierungspunkte: relatives Alter unter der Grenze; die lineare RND bleibt maßgeblich."
          : extension > 0.01
            ? "{points} Modernisierungspunkte verlängern die RND um {ext} Jahre auf {rnd} Jahre (Ende {end})."
            : "{points} Modernisierungspunkte erreichen mit der Modellformel keine Verlängerung; die RND bleibt bei {rnd} Jahren.", {
              points: decimal(rnd.points, 0), ext: decimal(extension, 0),
              rnd: decimal(rnd.rnd, 0), end: String(Math.round(effectiveEnd))
            }) + " " +
        tr("Alterswertminderung {awm}.", { awm: percent(rnd.awmPercent) });
    }

    reportCharts.age = {
      title: I18N.t("Gebäudealter und Restnutzungsdauer"),
      height: 95,
      grid: [0, 1],
      background: "0.985 0.985 0.985",
      plots: [
        { type: "hbars", items: [
          { start: nx(start), end: nx(valuationYear), row: 0.62, color: "0.42 0.54 0.60", label: I18N.t("bisher") },
          { start: nx(valuationYear), end: nx(defaultEnd), row: 0.62, color: "0.06 0.42 0.36", label: I18N.t("linear") }
        ].concat(extension > 0.01 ? [{
          start: nx(defaultEnd), end: nx(effectiveEnd), row: 0.62, color: "0.82 0.54 0.24", label: I18N.t("Verlängerung")
        }] : []) },
        { type: "vline", x: nx(valuationYear), color: "0.20 0.20 0.20" }
      ].concat(modelYear >= start && modelYear <= end ? [{
        type: "vline", x: nx(modelYear), color: "0.71 0.37 0.17", dash: [2, 2], width: 0.9
      }] : []),
      xLabels: [
        { x: 0, text: String(buildYear) },
        { x: nx(valuationYear), text: I18N.t("Stichtag") + " " + String(valuationYear) },
        { x: nx(defaultEnd), text: I18N.t("GND-Ende") + " " + String(Math.round(defaultEnd)) }
      ].concat(modelYear >= start && modelYear <= end
        ? [{ x: nx(modelYear), text: I18N.t("Modellgrenze") }] : [])
        .concat(extension > 0.01 ? [{ x: 1, text: "+" + decimal(extension, 0) + " " + I18N.t("J.") }] : []),
      yLabels: [],
      caption: [status ? status.textContent : "", note ? note.textContent : ""].filter(Boolean).join(" ")
    };
  }

  function renderIndexChart() {
    var host = document.getElementById("baupreisIndexChart");
    reportCharts.index = null;
    if (!host || !DATA.priceIndices || !DATA.priceIndices.length) return;
    host.innerHTML = "";

    var points = DATA.priceIndices.map(function (item) {
      var match = item.label.match(/(\d{4})\/(\d{2})/);
      return {
        x: match ? parseInt(match[1], 10) + (parseInt(match[2], 10) - 1) / 12 : 0,
        label: match ? match[1] + "/" + match[2] : item.label,
        y: parseFloat(String(item.value).replace(",", "."))
      };
    }).filter(function (point) {
      return isFinite(point.x) && isFinite(point.y);
    }).sort(function (a, b) { return a.x - b.x; });
    if (points.length < 2) return;

    var ns = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs, text) {
      var el = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, String(attrs[key])); });
      if (text !== undefined) el.textContent = text;
      return el;
    }

    var width = 520, height = 150, left = 48, right = 16, top = 18, bottom = 28;
    var minX = points[0].x, maxX = points[points.length - 1].x;
    var values = points.map(function (point) { return point.y; });
    var minY = Math.min.apply(null, values), maxY = Math.max.apply(null, values);
    var pad = (maxY - minY) * 0.18 || 0.02;
    var xAt = function (x) { return left + (x - minX) / (maxX - minX || 1) * (width - left - right); };
    var yAt = function (y) { return top + (maxY + pad - y) / (maxY - minY + 2 * pad || 1) * (height - top - bottom); };

    var svg = svgEl("svg", {
      "class": "index-svg", viewBox: "0 0 " + width + " " + height,
      role: "img", "aria-label": "Entwicklung des Baupreisindex (Destatis Tabelle 61261-0002)"
    });
    [0, 0.5, 1].forEach(function (share) {
      var y = top + share * (height - top - bottom);
      svg.appendChild(svgEl("line", { "class": "index-svg-grid", x1: left, y1: y, x2: width - right, y2: y }));
    });
    svg.appendChild(svgEl("polyline", {
      "class": "index-svg-line",
      points: points.map(function (point) { return xAt(point.x) + "," + yAt(point.y); }).join(" ")
    }));
    points.forEach(function (point) {
      svg.appendChild(svgEl("circle", { "class": "index-svg-dot", cx: xAt(point.x), cy: yAt(point.y), r: 2.5 }));
    });

    var current = parseFloat(String(state.building && state.building.index).replace(",", "."));
    if (isFinite(current)) {
      var clamped = Math.min(Math.max(current, minY - pad), maxY + pad);
      var currentY = yAt(clamped);
      svg.appendChild(svgEl("line", {
        "class": "index-svg-current", x1: left, y1: currentY, x2: width - right, y2: currentY
      }));
      svg.appendChild(svgEl("text", {
        "class": "index-svg-current-label", x: left + 6,
        y: currentY < top + 14 ? currentY + 13 : Math.max(top + 9, currentY - 6),
        "text-anchor": "start"
      }, decimal(current, 4)));
    }

    points.forEach(function (point, index) {
      if (index % 3 !== 0 && index !== points.length - 1) return;
      var anchor = index === 0 ? "start" : (index === points.length - 1 ? "end" : "middle");
      svg.appendChild(svgEl("text", {
        "class": "index-svg-label", x: xAt(point.x), y: height - 6, "text-anchor": anchor
      }, point.label));
    });
    svg.appendChild(svgEl("text", { "class": "index-svg-label", x: 4, y: top + 4 }, decimal(maxY + pad, 2)));
    svg.appendChild(svgEl("text", {
      "class": "index-svg-label", x: 4, y: top + (height - top - bottom) / 2 + 3
    }, decimal((maxY + minY) / 2, 2)));
    svg.appendChild(svgEl("text", {
      "class": "index-svg-label", x: 4, y: height - bottom, "text-anchor": "start"
    }, decimal(minY - pad, 2)));
    host.appendChild(svg);

    var caption = document.getElementById("baupreisIndexNote");
    var nx = function (x) { return Math.max(0, Math.min(1, (x - minX) / (maxX - minX || 1))); };
    // PDF charts use y=0 at the bottom and y=1 at the top, so higher index
    // values must map to higher normalised coordinates.
    var ny = function (y) { return Math.max(0, Math.min(1, (y - (minY - pad)) / (maxY - minY + 2 * pad || 1))); };
    var plots = [
      { type: "line", points: points.map(function (point) {
        return [nx(point.x), ny(point.y)];
      }), color: "0.10 0.29 0.37", width: 1.5 },
      { type: "dots", points: points.map(function (point) {
        return [nx(point.x), ny(point.y)];
      }), color: "0.10 0.29 0.37", size: 2.5 }
    ];
    if (isFinite(current)) {
      var clampedCurrent = Math.min(Math.max(current, minY - pad), maxY + pad);
      plots.push({ type: "hline", y: ny(clampedCurrent), color: "0.71 0.37 0.17", width: 0.9, dash: [3, 2] });
    }
    reportCharts.index = {
      title: I18N.t("Baupreisindex-Entwicklung"),
      height: 120,
      grid: [0, 0.5, 1],
      plots: plots,
      xLabels: [
        { x: 0, text: points[0].label },
        { x: 1, text: points[points.length - 1].label }
      ],
      yLabels: [
        { y: 0, text: decimal(minY - pad, 2) },
        { y: 1, text: decimal(maxY + pad, 2) }
      ],
      caption: caption ? caption.textContent : ""
    };
  }

  // Official market-report factor overview: table values, fitted regression
  // and dispersion for all four residential building classes.
  function renderFactorOverview(result) {
    var body = document.getElementById("factorOverviewBody");
    var note = document.getElementById("factorOverviewNote");
    var chart = document.getElementById("factorCurveChart");
    if (!body || !note) return;
    reportCharts.factor = null;
    var report = DATA.marketReports[state.market.source] || DATA.marketReports["2026"];
    var factors = report.factors || { parameter: {}, x: [] };
    var preliminary = result ? result.preliminary : 0;
    var keys = ["efh", "dhh", "reh", "rmh"];

    body.innerHTML = "";
    keys.forEach(function (key) {
      var params = factors.parameter[key];
      if (!params) return;
      var points = factorSeries(factors, key);
      var tableValue = points.length ? CALC.interpolateSeries(points, preliminary, "", null) : NaN;
      var regression = params.a * Math.pow(Math.max(1, preliminary), params.b);
      var tr = document.createElement("tr");
      if (key === state.market.buildingClass) tr.className = "is-selected";
      [
        params.label,
        decimal(tableValue, 4),
        decimal(regression, 4),
        points.length ? money(points[0].x) + " – " + money(points[points.length - 1].x) : "–",
        decimal(params.sigma),
        String(params.n)
      ].forEach(function (text) {
        var td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    var hasSelectedClass = !!factors.parameter[state.market.buildingClass];
    note.textContent = "Angezeigt für " + money(preliminary) + " vorläufigen Sachwert aus " +
      report.label + ". " + (hasSelectedClass
        ? "Die markierte Zeile und die Kurve zeigen die ausgewählte Gebäudeklasse."
        : "Für Mehrfamilienhäuser enthält der Marktbericht keine Sachwertfaktoren; bitte den Faktor manuell festlegen.");
    if (chart) {
      chart.innerHTML = "";
      if (hasSelectedClass) renderFactorCurve(chart, factors, state.market.buildingClass, preliminary);
    }

    if (hasSelectedClass) {
      var series = factorSeries(factors, state.market.buildingClass);
      if (series.length > 1) {
        var minX = series[0].x, maxX = series[series.length - 1].x;
        var values = series.map(function (point) { return point.y; });
        var minY = Math.min.apply(null, values), maxY = Math.max.apply(null, values);
        var pad = (maxY - minY) * 0.18 || 0.05;
        var nx = function (x) { return Math.max(0, Math.min(1, (x - minX) / (maxX - minX || 1))); };
        var ny = function (y) { return Math.max(0, Math.min(1, (y - (minY - pad)) / (maxY - minY + 2 * pad || 1))); };
        var currentX = Math.min(maxX, Math.max(minX, preliminary));
        var currentY = CALC.interpolateSeries(series, currentX, "", null);
        var currentPoint = isFinite(currentY) ? { x: nx(currentX), y: ny(currentY) } : null;
        reportCharts.factor = {
          title: I18N.t("Sachwertfaktor-Kurve"),
          height: 120,
          grid: [0, 0.5, 1],
          plots: [
            { type: "line", points: series.map(function (point) {
              return [nx(point.x), ny(point.y)];
            }), color: "0.10 0.29 0.37", width: 1.5 }
          ].concat(currentPoint ? [
            { type: "vline", x: currentPoint.x, color: "0.71 0.37 0.17", dash: [2, 2] },
            { type: "dots", points: [[currentPoint.x, currentPoint.y]], color: "0.71 0.37 0.17", size: 4 }
          ] : []),
          xLabels: [
            { x: 0, text: money(minX) },
            { x: 1, text: money(maxX) }
          ],
          yLabels: [
            { y: 0, text: decimal(minY - pad, 2) },
            { y: 1, text: decimal(maxY + pad, 2) }
          ],
          caption: note.textContent
        };
      }
    }
  }

  function update() {
    updateSliderDisplays();
    updateNhkTypeInfo();
    updateBorisSelectionInfo();
    updateOverwriteMarks();
    renderBrwTrend();
    var warnings = [];
    var result = CALC.calculate(state, warnings);
    renderFactorOverview(result);
    renderAgeTimeline(result);
    renderModernizationGrade(result);
    renderIndexChart();

    setOutput("landValue", money(result.landValue));
    var areaCheck = document.getElementById("landAreaCheck");
    if (areaCheck) {
      var officialArea = CALC.num(state.land.area, 0);
      var splitArea = CALC.num(state.land.zoneArea, 0) + CALC.num(state.land.overdepthArea, 0);
      var areaDiff = splitArea - officialArea;
      var areaMatches = Math.abs(areaDiff) < 0.01;
      if (I18N.forget) I18N.forget(areaCheck);
      areaCheck.classList.toggle("is-mismatch", !areaMatches);
      areaCheck.textContent =
        tr("Summe der Flächenfelder: {parts} m² · amtliche Fläche: {total} m²", {
          parts: decimal(splitArea, 2), total: decimal(officialArea, 2)
        }) + " · " + (areaMatches
          ? tr("stimmt überein")
          : tr("Differenz {diff} m² bitte prüfen", { diff: decimal(areaDiff, 2) }));
    }
    setOutput("standard", decimal(result.inputs.standard));
    setOutput("extras", money(result.inputs.extrasTotal) + " / " + money2(result.inputs.extrasPerM2) + " je m²");
    setOutput("indexedNhk", money2(result.nhk.indexed) + " / m²");
    setOutput("age", decimal(result.rnd.age) + " Jahre");
    setOutput("linearRnd", decimal(result.rnd.linearRnd) + " Jahre");
    setOutput("points", decimal(result.rnd.points) + " von 20");
    setOutput("rnd", decimal(result.rnd.rnd) + " Jahre");
    setOutput("awm", percent(result.rnd.awmPercent));
    var methodOutput = document.querySelector('[data-output="rndMethod"]');
    if (methodOutput && I18N.forget) I18N.forget(methodOutput);
    setOutput("rndMethod", rndMethodText(result));
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
    setOutput("liveValue", money(result.roundedValue));
    setOutput("liveFactor", decimal(result.factor.final, 4));
    setOutput("liveRnd", decimal(result.rnd.rnd) + " J.");

    var showManualFactor = state.market.buildingClass === "mfh";
    document.getElementById("manualFactorField").classList.toggle("hidden", !showManualFactor);
    var tenancyEnabled = !!state.tenancy.enabled;
    document.getElementById("tenancySection").classList.toggle("hidden", !tenancyEnabled);
    document.getElementById("tenancyOffNote").classList.toggle("hidden", tenancyEnabled);

    if (result.tenancy && result.tenancy.enabled) {
      var t = result.tenancy;
      setOutput("tenancyMonthlyDiff", money2(t.monthlyDiff) + " /Monat");
      setOutput("tenancyYears", decimal(t.years) + " Jahre");
      setOutput("tenancyCorrection", money(t.correction));
      setOutput("tenancyValue", money(t.after));
    } else {
      setOutput("tenancyMonthlyDiff", "–");
      setOutput("tenancyYears", "–");
      setOutput("tenancyCorrection", "–");
      setOutput("tenancyValue", "–");
    }

    var wohnrechtEnabled = !!state.wohnrecht.enabled;
    document.getElementById("wohnrechtSection").classList.toggle("hidden", !wohnrechtEnabled);
    document.getElementById("wohnrechtOffNote").classList.toggle("hidden", wohnrechtEnabled);

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

    I18N.apply();
    // Dynamic sentences were already translated by tr(). Do not let the
    // generic substring translator change protected formula terms (e.g.
    // "RND = GND − Alter") a second time.
    ["ageModelReason", "ageTimelineNote", "ageModelStatus",
      "modernizationGrade", "modernizationGradeReason"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && I18N.forget) I18N.forget(el);
    });
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

  function setFileStatus(text) {
    var el = document.getElementById("fileStatus");
    if (!el) return;
    if (I18N.forget) I18N.forget(el);
    el.textContent = text;
    I18N.apply();
  }

  function exportState() {
    var payload = {
      app: "vw-ratingen",
      version: 1,
      savedAt: new Date().toISOString(),
      state: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var date = (state.object.valuationDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
    link.href = url;
    link.download = "verkehrswert-ratingen-" + date + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    setFileStatus("Eingaben als JSON gespeichert.");
  }

  // Re-renders the currently selected local map on a canvas and adds the
  // selected zone dot. Maintains an aspect-correct JPEG snapshot for the PDF;
  // no live tiles and no network requests are involved.
  function captureMapImage() {
    return new Promise(function (resolve) {
      var host = document.getElementById("borisMap");
      var svg = host ? host.querySelector("svg") : null;
      var imageEl = svg ? svg.querySelector(".basemap-image") : null;
      var selected = svg ? svg.querySelector(".zone-point.is-selected") : null;
      var zone = findBorisZone(state.boris.zoneKey);
      var W = 720, H = 420;
      var canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }

      function fallback() {
        ctx.fillStyle = "#eef3f1";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "#d5e0dc";
        ctx.lineWidth = 1;
        for (var x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      }

      function dot() {
        var px = selected ? CALC.num(selected.getAttribute("cx"), W / 2) : W / 2;
        var py = selected ? CALC.num(selected.getAttribute("cy"), H / 2) : H / 2;
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#2aa588"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#16323c"; ctx.stroke();
      }

      function finish() {
        dot();
        var dataUrl;
        try {
          dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        } catch (e) {
          // A local file:// image can taint the canvas in some browsers.
          fallback(); dot();
          try { dataUrl = canvas.toDataURL("image/jpeg", 0.88); } catch (e2) { dataUrl = ""; }
        }
        if (!dataUrl) { resolve(null); return; }
        var caption = zone
          ? "Richtwertzone WNUM " + zone.wnum + " · " + decimal(zone.brw, 2) + " €/m² · Stichtag " + zone.stag +
            ". Kartenuntergrund: OpenStreetMap-Mitwirkende; der Punkt ist eine repräsentative Lage, keine amtliche Zonengrenze."
          : "Kartenuntergrund: OpenStreetMap-Mitwirkende; keine_zone_ausgewählt";
        resolve({
          dataUrl: dataUrl,
          width: W,
          height: H,
          heading: I18N.t("Kartenübersicht"),
          caption: I18N.t(caption)
        });
      }

      var href = imageEl ? (imageEl.getAttribute("href") || imageEl.getAttributeNS("http://www.w3.org/1999/xlink", "href")) : "";
      if (!href) { fallback(); finish(); return; }
      var img = new Image();
      img.onload = function () {
        try { ctx.drawImage(img, 0, 0, W, H); } catch (e) { fallback(); }
        finish();
      };
      img.onerror = function () { fallback(); finish(); };
      img.src = href;
    });
  }

  // Copies the information shown in all wizard steps into report sections.
  // Inactive steps are visually hidden by CSS, but their text and input values
  // must still be reported. Only explicitly hidden/disabled blocks, buttons,
  // charts and the calculation table (included separately) are skipped.
  function collectStepSections() {
    var sections = [];
    var skip = "button, svg, #borisMap, #brwTrendChart, #factorCurveChart, #ageTimelineChart, " +
      "#baupreisIndexChart, #calcTable, .nav-actions, .step-links, .hidden";
    function excluded(el) {
      return !el || el.hidden || (el.closest && el.closest(skip));
    }
    function clean(el) {
      return String(el.textContent || "").replace(/\s+/g, " ").trim();
    }
    function add(lines, seen, value) {
      value = String(value || "").replace(/\s+/g, " ").trim();
      if (!value || seen[value]) return;
      seen[value] = true;
      lines.push(value);
    }

    Array.prototype.forEach.call(document.querySelectorAll(".step"), function (step) {
      if (excluded(step)) return;
      var heading = step.querySelector("h2");
      var lines = [], seen = Object.create(null), tables = [];

      var blocks = step.querySelectorAll("h2, h3, p, li, dt, dd, .stat, .result-line, .card-title, " +
        ".slider-head, .slider-help, .chart-caption, .age-model-status, .extract, details summary, label.field");
      Array.prototype.forEach.call(blocks, function (el) {
        if (excluded(el)) return;
        var value = clean(el);
        var input = el.querySelector("input, select, textarea");
        if (input) value += ": " + (input.type === "checkbox" ? (input.checked ? "✓" : "–") : (input.value || "–"));
        add(lines, seen, value);
      });

      Array.prototype.forEach.call(step.querySelectorAll(".slider-field"), function (row) {
        if (excluded(row)) return;
        var input = row.querySelector("input");
        var head = row.querySelector(".slider-head");
        var help = row.querySelector(".slider-help");
        if (!input) return;
        add(lines, seen, clean(head) + ": " + input.value + (help ? " · " + clean(help) : ""));
      });

      Array.prototype.forEach.call(step.querySelectorAll("[data-repeater]"), function (row) {
        if (excluded(row)) return;
        var values = Array.prototype.map.call(row.querySelectorAll("input"), function (input) {
          return input.value || "–";
        });
        if (values.length) add(lines, seen, values.join(" | "));
      });

      Array.prototype.forEach.call(step.querySelectorAll("table"), function (table) {
        if (excluded(table)) return;
        var rows = [];
        Array.prototype.forEach.call(table.querySelectorAll("tr"), function (tr) {
          if (excluded(tr)) return;
          rows.push(Array.prototype.map.call(tr.querySelectorAll("th, td"), clean));
        });
        if (rows.length) tables.push(rows);
      });

      Array.prototype.forEach.call(step.querySelectorAll("a[href]"), function (link) {
        if (excluded(link)) return;
        add(lines, seen, clean(link) + " → " + link.getAttribute("href"));
      });

      Array.prototype.forEach.call(step.querySelectorAll("[data-field]"), function (input) {
        if (excluded(input)) return;
        var label = document.querySelector('label[for="' + input.id + '"]');
        var name = label ? clean(label) : input.getAttribute("data-field");
        var value = input.type === "checkbox" ? (input.checked ? "✓" : "–") : (input.value || "–");
        add(lines, seen, name + ": " + value);
      });

      sections.push({
        heading: heading ? clean(heading) : I18N.t("Schritt"),
        paragraphs: lines,
        rows: tables
      });
    });
    return sections;
  }

  // Builds explicit report sections for the slider values. The step copy in
  // collectStepSections() already lists them, but a dedicated detail section
  // keeps weights, descriptions, examples and the resulting grade readable.
  function reportInputDetails(result) {
    function meaning(element, index) {
      return I18N.t("Bedeutung: ") + I18N.t(element.explanations && element.explanations[index] || "Keine Beschreibung verfügbar.");
    }
    function example(element, index) {
      var value = element.examples && element.examples[index];
      return value ? I18N.t("Beispiel: ") + I18N.t(value) : "";
    }

    var nhkRows = [[
      I18N.t("Gewerk"), I18N.t("Stufe"), I18N.t("Gewicht"), I18N.t("Bedeutung / Beispiel (NHK 2010)")
    ]];
    DATA.standardWeights.forEach(function (element) {
      var raw = CALC.num(state.standard && state.standard[element.key], 0);
      var index = Math.min(5, Math.max(1, Math.floor(raw + 1e-9))) - 1;
      var detail = I18N.t("Stufe " + (index + 1)) + " – " + meaning(element, index);
      var sample = example(element, index);
      if (sample) detail += " " + sample;
      nhkRows.push([
        I18N.t(element.label),
        decimal(raw, 1),
        decimal(element.weight * 100, 0) + " %",
        detail
      ]);
    });

    var modernizationRows = [[
      I18N.t("Maßnahme"), I18N.t("Punkte"), I18N.t("Bedeutung"), I18N.t("Beispiel")
    ]];
    DATA.modernizationElements.forEach(function (element) {
      var points = Math.round(CALC.num(state.modernization && state.modernization[element.key], 0));
      var index = Math.min(element.max, Math.max(0, points));
      modernizationRows.push([
        I18N.t(element.label),
        decimal(points, 0),
        I18N.t(element.explanations && element.explanations[index] || "Keine Beschreibung verfügbar."),
        element.examples && element.examples[index] ? I18N.t(element.examples[index]) : "–"
      ]);
    });

    var grade = modernizationGrade(result.rnd.points);
    var gradeText = tr("Modernisierungsgrad: {grade} ({range}) · {points} Modernisierungspunkte", {
      grade: I18N.t(grade.label),
      range: I18N.t(grade.range),
      points: decimal(result.rnd.points, 0)
    });

    return [
      {
        heading: "7. Ausstattungsstufe und NHK-2010-Gewichtung",
        paragraphs: [
          I18N.t("Die Ausstattungsstufen 1–5 werden je Gewerk mit den NHK-2010-Gewichten gewichtet. Halbschritte gehören zur unteren ganzen Stufe; der gewichtete Wert selbst bleibt erhalten und wird in den Kostenkennwert des gewählten Gebäudetyps interpoliert.")
        ],
        kv: [
          [I18N.t("Gewichtete Ausstattungsstufe"), decimal(result.inputs.standard, 2)],
          [I18N.t("Gebäudetyp"), I18N.t(result.inputs.nhkTypeLabel)],
          [I18N.t("NHK-Basiskostenkennwert"), money2(result.nhk.base) + "/m² BGF"]
        ],
        rows: [nhkRows]
      },
      {
        heading: "8. Modernisierungspunkte und Modernisierungsgrad",
        paragraphs: [
          I18N.t("Modernisierungspunkte werden je Maßnahme mit 0 bis zur angegebenen Höchstzahl erfasst (Anlage 2, Tabelle 1). Die Summe von 0 bis 20 Punkten ergibt nach Tabelle 2 den Modernisierungsgrad."),
          gradeText,
          tr("Ergebnis Restnutzungsdauer: {rnd} Jahre · Alterswertminderung: {awm} · Rechenweg: {method}", {
            rnd: decimal(result.rnd.rnd),
            awm: percent(result.rnd.awmPercent),
            method: rndMethodText(result)
          })
        ],
        rows: [modernizationRows]
      }
    ];
  }

  // Creates the report as a PDF blob and downloads it. No print dialog and no
  // network request are involved, so this also works directly from file://.
  async function exportPdf() {
    try {
      var warnings = [];
      var result = CALC.calculate(state, warnings);
      var grade = modernizationGrade(result.rnd.points);
      var labels = {
        header: I18N.t("Verkehrswert-Rechner Ratingen"),
        footer: I18N.t("Verkehrswert-Rechner Ratingen · Orientierung, keine amtliche Wertermittlung"),
        page: I18N.t("Seite"),
        continued: I18N.t("Rechenweg (Fortsetzung)"),
        position: I18N.t("Position"),
        approach: I18N.t("Ansatz"),
        result: I18N.t("Ergebnis"),
        object: I18N.t("Objekt und Wertermittlungsstichtag"),
        calculation: I18N.t("Rechenweg"),
        notes: I18N.t("Hinweise"),
        glossary: I18N.t("Begriffe und Abkürzungen"),
        sources: I18N.t("Quellen und Hinweis"),
        map: I18N.t("Kartenübersicht"),
        charts: I18N.t("Diagramme"),
        steps: I18N.t("Schritte im Wizard"),
        reportTitle: I18N.t("Verkehrswert-Schätzung Ratingen")
      };
      var locale = I18N.getLanguage() === "es" ? "es-ES" : (I18N.getLanguage() === "en" ? "en-GB" : "de-DE");
      var mapImage = await captureMapImage();
      var stepSections = collectStepSections();
      var charts = [reportCharts.brw, reportCharts.age, reportCharts.factor, reportCharts.index]
        .filter(Boolean).map(function (chart) {
          return Object.assign({}, chart, { caption: I18N.t(chart.caption || "") });
        });
      var zone = findBorisZone(state.boris.zoneKey);
      var objectAddress = [state.object.street, state.object.zip, state.object.city]
        .filter(Boolean).join(", ");
      var parcel = [state.object.gemarkung, state.object.flur, state.object.flurstueck]
        .filter(Boolean).join(" / ");
      var brwText = money2(state.land.brw) + "/m²" +
        (zone ? " · " + zone.stag + ", WNUM " + zone.wnum
          : (brwManuallyOverwritten() ? " · " + I18N.t("manuell überschrieben") : " · " + I18N.t("manuell")));
      var generated = new Date().toLocaleString(locale);

      var summary = [
        [I18N.t("Vorläufiger Sachwert"), money(result.preliminary)],
        [I18N.t("Sachwertfaktor"), decimal(result.factor.final, 4) + " (" + result.factor.sourceLabel + ")"],
        [I18N.t("Marktangepasster Sachwert (vor Miete)"), money(result.marketAdaptedValue)]
      ];
      if (result.tenancy && result.tenancy.enabled) {
        summary.push([I18N.t("Mietdifferenz je Monat"), money2(result.tenancy.monthlyDiff)]);
        summary.push([I18N.t("Wirksame Anpassungsdauer"), decimal(result.tenancy.years) + " " + I18N.t("Jahre")]);
        summary.push([I18N.t("Mietkorrektur (Barwert)"), money(result.tenancy.correction)]);
        summary.push([I18N.t("Sachwert nach Mietkorrektur"), money(result.tenancy.after)]);
      }
      summary.push([I18N.t("Gerundeter Sachwert"), money(result.roundedValue)]);
      summary.push([I18N.t("Exakt"), money2(result.marketValue)]);
      summary.push([I18N.t("Ausstattungsstufe (gewichtet)"), decimal(result.inputs.standard, 2)]);
      summary.push([I18N.t("Modernisierungspunkte"), decimal(result.rnd.points, 0) + " / 20"]);
      summary.push([I18N.t("Restnutzungsdauer"), decimal(result.rnd.rnd) + " " + I18N.t("Jahre")]);
      summary.push([I18N.t("Modernisierungsgrad"), modernizationGradeText(result.rnd.points)]);
      summary.push([I18N.t("Alterswertminderung"), percent(result.rnd.awmPercent)]);
      if (state.wohnrecht.enabled && result.wohnrecht) {
        summary.push([I18N.t("Sachwert mit Wohnungsrecht"), money(result.wohnrecht.burdenedRounded)]);
      }

      var warningTexts = warnings.length
        ? warnings.map(function (warning) {
            return I18N.t((warning.level === "warn" ? "Achtung: " : "Hinweis: ") + warning.text);
          })
        : [I18N.t("Keine automatischen Hinweise. Bitte alle Angaben fachlich prüfen.")];

      var blob = PDF.buildReport({
        labels: labels,
        title: I18N.t("Verkehrswert-Schätzung Ratingen"),
        subtitle: I18N.t("Sachwertverfahren") + " · " + I18N.t("Stichtag") + " " + state.object.valuationDate +
          " · " + I18N.t("erstellt am") + " " + generated,
        meta: [
          [I18N.t("Objekt"), objectAddress || "–"],
          [I18N.t("Gemarkung / Flur / Flurstück"), parcel || "–"],
          [I18N.t("Bodenrichtwert"), brwText],
          [I18N.t("Grundstücksfläche"), decimal(result.inputs.effectiveArea) + " m²"],
          [I18N.t("Bruttogrundfläche"), decimal(result.inputs.bgf) + " m²"],
          [I18N.t("Datenquelle"), result.factor.sourceLabel],
          [I18N.t("Bemerkungen / Beobachtungen"), state.object.comments || "–"]
        ],
        summary: summary,
        rows: calcRows(result, warnings).map(function (row) {
          return row.map(function (cell) { return I18N.t(cell); });
        }),
        warnings: warningTexts,
        mapImage: mapImage,
        charts: charts,
        glossary: [
          ["BGF", I18N.t("Bruttogrundfläche nach DIN 277; Bezugsgröße der Normalherstellungskosten.")],
          ["NHK", I18N.t("Normalherstellungskosten 2010; modellhafte Kostenkennwerte je Gebäudetyp und Ausstattungsstufe.")],
          ["GND", I18N.t("Gesamtnutzungsdauer; im Modell die Restnutzungsdauer bei Fertigstellung.")],
          ["RND", I18N.t("Restnutzungsdauer; erwartete wirtschaftlich sinnvolle Nutzungsdauer ab Stichtag.")],
          ["BRW", I18N.t("Bodenrichtwert; gebietstypischer Durchschnittswert, kein individueller Kaufpreis.")],
          ["WNUM", I18N.t("Nummer des Bodenrichtwerts in der Gemeinde gemäß Landesschlüssel; nicht die Flurstücksnummer.")],
          ["BNK", I18N.t("Baunebenkosten; Planung, Genehmigung, Vermessung und Bauleitung. Im Ratinger Modell 2026 bereits in den NHK enthalten.")],
          ["Sachwertfaktor", I18N.t("Objektspezifisch angepasster Faktor zur marktlichen Anpassung des vorläufigen Sachwerts (§ 39 ImmoWertV).")],
          ["SW-RL", I18N.t("Sachwertrichtlinie; konkretisiert das Sachwertverfahren, NHK, Alterswertminderung und Modernisierungspunkte.")]
        ],
        sections: (function () {
        var sections = [
          {
            heading: "1. Methodik des Sachwertverfahrens",
            paragraphs: [
              "ImmoWertV § 35 Abs. 1–4 (Auszug): „Im Sachwertverfahren wird der Sachwert des Grundstücks aus den vorläufigen Sachwerten der nutzbaren baulichen und sonstigen Anlagen sowie aus dem Bodenwert ermittelt.“ „Der marktangepasste vorläufige Sachwert des Grundstücks ergibt sich durch Multiplikation des vorläufigen Sachwerts mit einem objektspezifisch angepassten Sachwertfaktor im Sinne des § 39.“ „Der Sachwert des Grundstücks ergibt sich aus dem marktangepassten vorläufigen Sachwert und der Berücksichtigung vorhandener besonderer objektspezifischer Grundstücksmerkmale des Wertermittlungsobjekts.“",
              "Das Werkzeug bildet genau diese Kette ab: Bodenwert + Zeitwert der baulichen Anlagen + Zeitwert der Außenanlagen = vorläufiger Sachwert; Multiplikation mit dem Sachwertfaktor = marktangepasster Sachwert; anschließend besondere Merkmale und gegebenenfalls Wohnungsrecht."
            ]
          },
          {
            heading: "2. Herstellungskosten, NHK 2010 und Baupreisindex",
            paragraphs: [
              "ImmoWertV § 36 Abs. 1–3 (Auszug): „Zur Ermittlung des vorläufigen Sachwerts der baulichen Anlagen, ohne bauliche Außenanlagen, sind die durchschnittlichen Herstellungskosten mit dem Regionalfaktor und dem Alterswertminderungsfaktor zu multiplizieren.“ „Der Ermittlung der durchschnittlichen Herstellungskosten sind in der Regel modellhafte Kostenkennwerte zugrunde zu legen, die auf eine Flächen-, Raum- oder sonstige Bezugseinheit bezogen sind (Normalherstellungskosten) …“ „Von den Normalherstellungskosten nicht erfasste werthaltige einzelne Bauteile sind durch marktübliche Zuschläge bei den durchschnittlichen Herstellungskosten zu berücksichtigen.“",
              "Zur Umrechnung auf den Wertermittlungsstichtag wird der Baupreisindex des Statistischen Bundesamtes verwendet (Destatis Tabelle 61261-0002). Der hier verwendete Faktor ist der Indexwert am Stichtag geteilt durch den Wert von 2010 (70,8). Die NHK-Stufen 1–5 werden linear interpoliert; ein Halbschritt wird der unteren ganzen Stufe zugeordnet. Baunebenkosten werden im Ratinger Modell 2026 nicht zusätzlich angesetzt (0 %); ältere Modelle verwenden häufig 17 %."
            ]
          },
          {
            heading: "3. Alterswertminderung und Restnutzungsdauer",
            paragraphs: [
              "ImmoWertV § 38 (Auszug): „Der Alterswertminderungsfaktor entspricht dem Verhältnis der Restnutzungsdauer zur Gesamtnutzungsdauer.“ ImmoWertV § 37 (Auszug): „Der vorläufige Sachwert der für die jeweilige Gebäudeart üblichen baulichen Außenanlagen und sonstigen Anlagen ist gesondert zu ermitteln, soweit die Anlagen wertbeeinflussend sind und nicht bereits anderweitig erfasst wurden.“",
              "Lehrbuch „Gesamtnutzungsdauer und Restnutzungsdauer“ (Auszug): „Die Restnutzungsdauer (RND) ist diejenige zu erwartende Lebensdauer eines Gebäudes, während der dieses noch wirtschaftlich sinnvoll zu nutzen ist.“ „Die Gesamtnutzungsdauer ist sozusagen die Restnutzungsdauer im Moment der Fertigstellung des Gebäudes.“ Die Linearmethode und das Modell der Anlage 2 ImmoWertV werden für mehr als einen Modernisierungspunkt gegenübergestellt; die Alterswertminderung ist stets RND ÷ GND.",
              "Anlage 2 zu § 12 Abs. 5 ImmoWertV, Tabelle 3 (Auszug): „ab einem relativen Alter von“. Die Modellformel gilt erst ab dem für die Modernisierungspunktzahl genannten relativen Alter; darunter bleibt RND = GND − Alter. Die Tabelle steht in ImmoWertV.pdf und online bei gesetze-im-internet.de (ImmoWertV 2022).",
              "Anlage 2, II.2 (Auszug): „Liegt das relative Alter unterhalb des in der Tabelle 3 angegebenen Wertes, gilt für die Ermittlung der Restnutzungsdauer die Formel: RND = GND − Alter.“ Das ist der Grund für die Grenze: unterhalb wird linear gerechnet, ab dem Tabellenwert wird die Modellformel angewendet.",
              tr("Nach Tabelle 2 der Anlage 2 ImmoWertV ergibt sich aus {points} Modernisierungspunkten der Modernisierungsgrad {grade} ({range}).", {
                points: decimal(result.rnd.points, 0),
                grade: I18N.t(grade.label),
                range: I18N.t(grade.range)
              })
            ]
          },
          {
            heading: "4. Bodenwert und BORIS-Daten",
            paragraphs: [
              "Der Bodenwert wird aus dem Bodenrichtwert und der anrechenbaren Grundstücksfläche gebildet. Übertiefe Flächen werden mit den Koeffizienten des Ratinger Marktberichts gewichtet. Der Bodenrichtwert ist ein gebietstypischer Durchschnitt; die WNUM identifiziert die Richtwertzone, nicht das Flurstück.",
              "Offline-Auszug: " + ((BORIS.meta && BORIS.meta.source) || "BORISplus.NRW / Open.NRW") +
                ", erzeugt " + ((BORIS.meta && BORIS.meta.generated) || "–") +
                ", " + ((BORIS.meta && BORIS.meta.count) || "–") + " Ratingen-Zonen, Lizenz " +
                ((BORIS.meta && BORIS.meta.license) || "Datenlizenz Deutschland – Zero – Version 2.0") +
                ". Die Flurstücksidentifikation ist manuell; zur rechtsverbindlichen Prüfung BORISplus.NRW und TIM-Online NRW nutzen. Die BRW-Prognose wird aus den im Offline-Auszug vorhandenen Stichtagen derselben WNUM berechnet: Ausgleichsgerade nach der Methode der kleinsten Quadrate über alle Werte, Prognosejahr = letzter Stichtag + 1, Wert = Mittelwert + Steigung × (Prognosejahr − Mitteljahr), gerundet auf ganze €/m² und begrenzt auf 0 bis zum Zweifachen des höchsten beobachteten BRW. Sie ist kein amtlicher Bodenrichtwert, geht nicht in die Berechnung ein und ersetzt nicht die aktuelle BORISplus.NRW-Auskunft."
            ]
          },
          {
            heading: "5. Marktanpassung mit Sachwertfaktor",
            paragraphs: [
              "Grundstücksmarktbericht Ratingen 2026, Kap. 5.1.5 (Auszug): „Um jedoch den örtlichen Grundstücksmarkt angemessen berücksichtigen zu können, ist eine Korrektur in Form von lokal gültigen Sachwertfaktoren erforderlich. Die Geschäftsstelle des Gutachterausschusses wertet zu diesem Zweck alle geeigneten Kauffälle des Berichtsjahres aus, setzt die berechneten Sachwerte zu den jeweiligen bereinigten (von sonstigen Einflüssen befreiten) Kaufpreisen in Beziehung und erhält hierdurch für jeden Kauffall einen individuellen Korrekturfaktor.“",
              "Grundstücksmarktbericht Ratingen 2026, Kap. 5.1.5 (Auszug): „Für die praktische Anwendung ist es dabei hinreichend genau, wenn Zwischenwerte linear interpoliert werden.“ „Eine Extrapolation des Sachwertfaktors für Sachwertobjekte außerhalb der dargestellten Wertspanne wird nicht empfohlen, da die ausgleichenden Funktionen dort nicht mehr durch tatsächliche Verkaufsfälle gestützt werden.“ „Der Sachwertfaktor ist kein Festwert, siehe Standardabweichung σ. Die Lage im Stadtgebiet, sowie die individuelle Ausstattung des Gebäudes, hier sei insbesondere auch der energetische Zustand genannt, soweit diese nicht explizit an anderer Stelle der Wertermittlung berücksichtigt wurden, kann zu sachverständigen Zu- oder Abschlägen im Sachwertfaktor führen.“",
              "ImmoWertV § 39 (Auszug): „Zur Ermittlung des objektspezifisch angepassten Sachwertfaktors ist der nach § 21 Absatz 3 ermittelte Sachwertfaktor auf seine Eignung im Sinne des § 9 Absatz 1 Satz 1 zu prüfen und bei etwaigen Abweichungen nach § 9 Absatz 1 Satz 2 und 3 an die Gegebenheiten des Wertermittlungsobjekts anzupassen.“ Der hier eingegebene Anpassungsprozentsatz ist daher eine fachlich zu begründende objektspezifische Korrektur, kein frei wählbarer Ergebnisregler."
            ]
          },
          {
            heading: "6. Besondere objektspezifische Merkmale",
            paragraphs: [
              "ImmoWertV § 7 Abs. 2 und § 8 Abs. 3 (sinngemäß): Allgemeine und besondere objektspezifische Grundstücksmerkmale sind bei der Wertermittlung zu berücksichtigen. Dazu zählen insbesondere Baumängel, Bauschäden, ungewöhnliche Grundrisse, energetische Mängel und besondere Ertragsverhältnisse. Sie werden als marktübliche Zu- oder Abschläge angesetzt, soweit sie nicht bereits in Ausstattung, Restnutzungsdauer, Baupreisindex oder Sachwertfaktor erfasst sind.",
              "Der Marktbericht nennt ausdrücklich den energetischen Zustand als möglichen Grund für sachverständige Zu- oder Abschläge im Sachwertfaktor, sofern er nicht bereits an anderer Stelle berücksichtigt wurde. Doppelberücksichtigung vermeiden: Erst Ausstattung/Modernisierung und RND prüfen, dann verbleibende Abweichung als Projekt‑ oder Faktorkorrektur erfassen. Werte ohne Nachweis sind nicht belastbar.",
              "Energieeffizienz: ImmoWertV § 2 Abs. 3 Nr. 10d nennt die energetischen Eigenschaften als wertbestimmendes Merkmal; § 4 Abs. 3 lässt Modernisierung und unterlassene Instandhaltung die RND verändern. Die NHK-2010-Standardstufen enthalten die energetischen Eigenschaften bereits (ImmoWertA S. 72–73). Es gibt keine amtliche Regel mit festen Prozentwerten je Effizienzklasse. Marktumfragen wie die immowelt-Studie 2026 (Angebotspreise, Referenzklasse D: Häuser A+ +15 %, H −17 %; ETW A+ +20 %, H −9 %) sind Preiseffekte am Markt und keine Sachwertfaktoren; eine Ableitung auf den Sachwert ist nicht zulässig.",
              "Bei einem bestehenden Mietverhältnis ist zuerst das Verfahren zu prüfen: Sachwertverfahren ist marktüblich für selbst genutzte Ein-/Zweifamilienhäuser; vermietete Objekte werden regelmäßig im Ertragswertverfahren bewertet. Bleibt das Sachwertmodell, wird die Differenz zwischen Vertragsmiete und ortsüblicher Vergleichsmiete über die voraussichtliche Anpassungsdauer abgezinst (§ 47 Abs. 5 ImmoWertV sinngemäß) und als besonderes Merkmal nach § 8 Abs. 3 erfasst. „Kauf bricht nicht Miete“ (§ 566 BGB): nicht von sofortigem Leerstand ausgehen."
            ]
          }
        ].concat(reportInputDetails(result)).concat([
          {
            heading: "9. Quellenverzeichnis",
            paragraphs: [
              "ImmoWertV (Fassung 2021, in Kraft seit 01.01.2022), insbesondere §§ 6–9, 21–23, 35–39, 46–47: https://www.gesetze-im-internet.de/immowertv_2022/ImmoWertV.pdf ; lokal: ImmoWertV.pdf.",
              "Sachwertrichtlinie (SW-RL) vom 05.09.2012, insbesondere Nr. 3–6 und Anlagen 1–5: lokal: HowTo/Bekanntmachung der Richtlinie zu rErmittlung des Sachwerts.pdf.",
              "Grundstücksmarktbericht Ratingen 2026, Kap. 5.1.5 Sachwertfaktoren und Kap. 7.1 Sachwertverfahren: https://www.boris.nrw.de/borisfachdaten/gmb/2026/GMB_27300_2026.pdf ; lokal: Grundstuecksmarktbericht/Grundstuecksmarktbericht_Ratingen_2026.pdf.",
              "Grundstücksmarktbericht Ratingen 2025, vergleichbare Auswertung: https://www.boris.nrw.de/borisfachdaten/gmb/2025/GMB_27300_2025.pdf ; lokal: Grundstuecksmarktbericht/Grundstücksmarktbericht Ratingen 2025.pdf.",
              "BORISplus.NRW / Open.NRW Bodenrichtwerte: https://www.boris.nrw/boris-nrw/?lang=de ; https://open.nrw/dataset/ce127d47-27d1-4f49-a4dc-65cc1dac339e . Flurstücke: https://www.tim-online.nrw.de/tim-online2/ .",
              "Baupreisindex: Destatis Tabelle 61261-0002, https://genesis.destatis.de/datenbank/online/table/61261-0002 .",
              "ImmoWertA – Muster-Anwendungshinweise (BMWSB), insbesondere S. 7, 16–17 und 72–73: https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/immowerta.pdf?__blob=publicationFile&v=1 .",
              "Zuschlagswerte für Bauteile außerhalb der BGF: lokales Beispielgutachten „An der Lilie 51“, Stichtag 12.04.2023 (Hauseingangstreppe 5.000 €, Kelleraußentreppe 5.000 €, Dachgaube 6.000 €).",
              "Energieeffizienz als Orientierung (nicht amtlich): immowelt-Studie 2026, https://www.immowelt.de/ueberuns/presse/pressemitteilungenkontakt/immoweltde/2026/gute-energiebilanz-zahlt-sich-aus-bis-zu-20-prozent-preisaufschlag-fuer-effiziente-immobilien/ .",
              "GND/RND-Lehrbuch (Auszug): lokal: HowTo/10. Gesamtnutzungsdauer und Restnutzungsdauer.pdf. Kartenuntergrund: OpenStreetMap-Mitwirkende, https://www.openstreetmap.org/copyright ."
            ]
          }
        ]);
        return sections.map(function (section) {
          return {
            heading: I18N.t(section.heading),
            paragraphs: (section.paragraphs || []).map(function (paragraph) { return I18N.t(paragraph); }),
            kv: section.kv || [],
            rows: section.rows || []
          };
        });
      }()),
        stepSections: stepSections.map(function (section) {
          return {
            heading: I18N.t(section.heading),
            paragraphs: (section.paragraphs || []).map(function (paragraph) { return I18N.t(paragraph); }),
            rows: section.rows || []
          };
        }),
        notes: [
          I18N.t("Dieses Werkzeug dient der Orientierung und Dokumentation. Es ersetzt kein Verkehrswertgutachten und keine sachverständige Würdigung des Einzelfalls. Bodenrichtwerte sind gebietstypische Durchschnitte, keine Kaufpreise."),
          I18N.t("Die verwendeten Beispielobjekte sind fiktiv und anonymisiert. Es liegen keine veröffentlichten Endwerte zugehöriger Gutachten zum direkten Vergleich vor.")
        ]
      });

      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      var date = (state.object.valuationDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
      link.href = url;
      link.download = "Verkehrswert_Ratingen_" + date + ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
      setFileStatus("PDF-Bericht erstellt.");
    } catch (e) {
      setFileStatus("PDF konnte nicht erstellt werden.");
    }
  }

  function importState(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || parsed.app !== "vw-ratingen" || !parsed.state || typeof parsed.state !== "object") {
          throw new Error("invalid format");
        }
        state = merge(DATA.defaultState, parsed.state);
        if (state.market && state.market.source === "manual") state.market.source = "2026";
        save();
        syncForm();
        applyBorisYearFromState();
        update();
        showStep(1);
        setFileStatus("Eingaben geladen.");
      } catch (e) {
        setFileStatus("Datei konnte nicht geladen werden.");
        window.alert(I18N.t("Die Datei ist kein gültiger Eingaben-Export dieses Rechners."));
      }
    };
    reader.onerror = function () { setFileStatus("Datei konnte nicht gelesen werden."); };
    reader.readAsText(file);
  }

  function attachEvents() {
    var themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      I18N.apply();
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    });

    var langBtn = document.getElementById("langBtn");
    if (langBtn) langBtn.addEventListener("click", function () {
      I18N.setLanguage(I18N.nextLanguage());
      update();
    });

    var saveBtn = document.getElementById("saveBtn");
    var loadBtn = document.getElementById("loadBtn");
    var loadFileInput = document.getElementById("loadFileInput");
    if (saveBtn) saveBtn.addEventListener("click", exportState);
    if (loadBtn) loadBtn.addEventListener("click", function () { if (loadFileInput) loadFileInput.click(); });
    if (loadFileInput) loadFileInput.addEventListener("change", function () {
      importState(this.files && this.files[0]);
      this.value = "";
    });

    var borisYear = document.getElementById("borisYearSelect");
    var borisSearch = document.getElementById("borisSearchSelect");
    var borisZones = document.getElementById("borisZoneSelect");

    if (borisYear) borisYear.addEventListener("change", function () {
      renderBorisLocations();
      renderBorisZones();
    });
    if (borisSearch) borisSearch.addEventListener("change", renderBorisZones);
    if (borisZones) borisZones.addEventListener("change", function () {
      applyBorisZone(findBorisZone(borisZones.value));
    });

    var borisMap = document.getElementById("borisMap");
    if (borisMap) {
      function selectZoneFromMap(point) {
        if (!point) return;
        applyBorisZone(findBorisZone(point.getAttribute("data-zone-key")));
      }
      borisMap.addEventListener("click", function (event) {
        var point = event.target.closest ? event.target.closest(".zone-point") : null;
        selectZoneFromMap(point);
      });
      borisMap.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var point = event.target.classList && event.target.classList.contains("zone-point") ? event.target : null;
        if (point) {
          event.preventDefault();
          selectZoneFromMap(point);
        }
      });
    }

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
      var globalReport = document.getElementById("globalReportSelect");
      var sourceSelect = document.querySelector('[data-field="market.source"]');
      var brwReportSelect = document.getElementById("brwReportSelect");

      if (target.id === "globalReportSelect") {
        state.market.source = target.value;
        if (sourceSelect) sourceSelect.value = target.value;
        if (target.value !== "manual" && brwReportSelect) {
          brwReportSelect.value = target.value;
          updateBrwPresets();
        }
      }

      if (target.id === "brwReportSelect") {
        updateBrwPresets();
        if (state.market.source !== "manual") {
          state.market.source = target.value;
          if (sourceSelect) sourceSelect.value = target.value;
          if (globalReport) globalReport.value = target.value;
        }
      }

      if (target && target.matches && target.matches('[data-field="market.source"]')) {
        state.market.source = target.value;
        if (globalReport) globalReport.value = target.value;
        if (target.value !== "manual" && brwReportSelect) {
          brwReportSelect.value = target.value;
          updateBrwPresets();
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
      var select = document.getElementById("exampleSelect");
      var key = (select && DATA.examples[select.value]) ? select.value : "anonymisiert";
      state = merge(DATA.defaultState, DATA.examples[key]);
      syncForm();
      applyBorisYearFromState();
      save();
      update();
      showStep(1);
      setFileStatus(I18N.t("Beispiel geladen."));
    });

    document.getElementById("resetBtn").addEventListener("click", function () {
      askResetConfirmation().then(function (confirmed) {
        if (!confirmed) return;
        state = clone(DATA.defaultState);
        syncForm();
        save();
        update();
        showStep(1);
      });
    });

    ["pdfBtn", "pdfBtn2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", exportPdf);
    });

    document.getElementById("copyBtn").addEventListener("click", function () {
      var result = update();
      var text = [
        "Verkehrswert-Rechner Ratingen",
        "Objekt: " + [state.object.street, state.object.zip, state.object.city].filter(Boolean).join(", "),
        "Gemarkung/Flur/Flurstück: " + [state.object.gemarkung, state.object.flur, state.object.flurstueck].filter(Boolean).join(" / "),
        "Stichtag: " + state.object.valuationDate,
        (function () {
          var zone = findBorisZone(state.boris.zoneKey);
          return zone
            ? "Bodenrichtwert: " + money2(state.land.brw) + "/m² (BORIS " + zone.stag + ", WNUM " + zone.wnum + ")"
            : "Bodenrichtwert: " + money2(state.land.brw) + "/m² (manuell)";
        })(),
        "Vorläufiger Sachwert: " + money(result.preliminary),
        "Sachwertfaktor: " + decimal(result.factor.final, 4),
        "Marktangepasster Sachwert: " + money(result.roundedValue),
        "RND: " + decimal(result.rnd.rnd) + " Jahre",
        result.tenancy && result.tenancy.enabled ? "Mietkorrektur: " + money(result.tenancy.correction) + " → " + money(result.tenancy.after) : "",
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

  // In-app confirmation dialog. The browser's window.confirm() has no title
  // we can control, so the reset action uses this modal instead.
  function askResetConfirmation() {
    var modal = document.getElementById("confirmModal");
    if (!modal) return Promise.resolve(false);
    var title = document.getElementById("confirmModalTitle");
    var message = document.getElementById("confirmModalMessage");
    var ok = document.getElementById("confirmModalOk");
    var cancel = document.getElementById("confirmModalCancel");
    if (!title || !message || !ok || !cancel) return Promise.resolve(false);

    return new Promise(function (resolve) {
      var previousFocus = document.activeElement;
      var focusables = [cancel, ok];

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
          return;
        }
        if (event.key === "Tab") {
          var index = focusables.indexOf(document.activeElement);
          var next = event.shiftKey
            ? (index <= 0 ? focusables.length - 1 : index - 1)
            : (index + 1) % focusables.length;
          event.preventDefault();
          focusables[next].focus();
        }
      }

      function onBackdrop(event) {
        if (event.target === modal) close(false);
      }

      function close(result) {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKeyDown);
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        resolve(result);
      }

      function onOk() { close(true); }
      function onCancel() { close(false); }

      if (I18N.forget) I18N.forget(modal);
      title.textContent = I18N.t("Eingaben zurücksetzen");
      message.textContent = I18N.t("Alle eingegebenen Objektdaten und Berechnungswerte werden auf die Standardwerte zurückgesetzt. Ihr gespeicherter Eingabestand wird dabei überschrieben. Design und Sprache bleiben erhalten.");
      cancel.textContent = I18N.t("Abbrechen");
      ok.textContent = I18N.t("Zurücksetzen");
      if (I18N.apply) I18N.apply(modal);
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      modal.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKeyDown);
      ok.focus();
    });
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    var isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    var button = document.getElementById("themeBtn");
    if (!button) return;
    I18N.forget(button);
    // Icon-only button; the meaning stays available via ARIA label and title.
    button.textContent = isDark ? "☀" : "☾";
    button.setAttribute("aria-pressed", isDark ? "true" : "false");
    button.setAttribute("aria-label", isDark ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln");
    button.setAttribute("title", I18N.t(isDark ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln"));
  }

  function init() {
    I18N.init();
    applyTheme(currentTheme());
    initStaticUi();
    initBorisUi();
    initAcronymTooltips();
    syncForm();
    attachEvents();
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
