# Verkehrswert-Rechner Ratingen

A dependency-free web wizard that guides a user through the data needed to estimate the **Verkehrswert** of a residential property in Ratingen using the **Sachwertverfahren** (ImmoWertV).

- **User interface:** German
- **Documentation:** English
- **Runtime:** static HTML/CSS/JavaScript; no build step, no backend, no external packages

> This tool is for orientation and documentation. It does not replace a certified valuation (Verkehrswertgutachten) or the expert judgement of a Sachverständiger.

---

## 1. Quick start

Open `index.html` in a modern browser. All data is embedded in `data.js`, so `file://` works.

Optional local server:

```bash
python -m http.server 8765
# then open http://127.0.0.1:8765/index.html
```

Use the sidebar steps 1–8. Inputs are recalculated immediately. The state is saved in the browser's `localStorage` and can be reset with **Zurücksetzen**.

The button **An der Lilie 51** loads the complete worked example from the supplied Gutachten.

---

## 2. Scope

The calculation engine implements:

- Sachwertverfahren for owner-occupied residential property (EFH, ZFH, DHH, REH, RMH; MFH only with a manual Sachwertfaktor).
- Bodenwert derivation from a Bodenrichtwert with adjustable micro-location correction and Übertiefe coefficient.
- NHK 2010 cost classes, weighted Ausstattungsstufe, Baupreisindex, Baunebenkosten, regional factor and add-ons for components outside the BGF.
- Linear Alterswertminderung using GND and RND.
- RND extension from modernization points (ImmoWertV, Anlage 2).
- Market adaptation using the Sachwertfaktoren from the Ratingen Grundstücksmarktberichte 2025 and 2026, including tabular interpolation and regression fallback.
- Optional unentgeltliches Wohnungsrecht, following the method in the main example.
- Plausibility comparison with a typical purchase price supplied by the user.

It does **not** implement the full Ertragswertverfahren or Vergleichswertverfahren. The second supplied example (MFH Köln, 2014) is used as structural guidance only; its market area and old ImmoWertV/SW-RL version are outside the Ratingen Sachwertfaktor dataset.

---

## 3. Source material

| File | Use in this project |
| --- | --- |
| `ImmoWertV.pdf` / `HowTo/ImmoWertV.pdf` | §§ 35–39, Anlage 1 (GND), Anlage 2 (RND model), Anlage 4 (NHK structure). |
| `HowTo/Bekanntmachung der Richtlinie zu rErmittlung des Sachwerts.pdf` | Sachwertrichtlinie: workflow, Ausstattungsstufe, Außenanlagen, Marktanpassung, Modernisierungspunkte. |
| `HowTo/10. Gesamtnutzungsdauer und Restnutzungsdauer.pdf` | Explanation of GND/RND concepts and the effect of modernization. |
| `Verkehrswertgutachten/Beispiele/AnDerLilie51.pdf` | Main worked example; all example values and the Wohnungsrecht calculation. |
| `Verkehrswertgutachten/Beispiele/3_VA_GA_beispiel_indiv_MFH_Ausschnitte.pdf` | Second example; used for UI structure and to document the limits of the Ratingen Sachwertfaktor data. |
| `Grundstuecksmarktbericht/Grundstuecksmarktbericht_Ratingen_2026.pdf` | 2026 Bodenrichtwerte, Übertiefe coefficients, Sachwertfaktor parameters/tables, Sachwertverfahren model description (chapter 7.1). |
| `Grundstuecksmarktbericht/Grundstücksmarktbericht Ratingen 2025.pdf` | Same data for 2025, kept for comparison and older Stichtage. |
| `Verkehrswert.xlsx` | Previous spreadsheet attempt; NHK cost tables, Gewerke weights, index values, differentiation between 17 % Baunebenkosten and the newer “included in NHK” model. |

Extracted text and spreadsheet dumps were kept in a temporary working directory during analysis; the application does not depend on them at runtime.

---

## 4. Calculation method

### 4.1 Sequence

1. **Object and Stichtag** – the valuation date drives `Gebäudealter = Stichtag − Baujahr`.
2. **Bodenwert** – `BRW × anrechenbare Fläche`, with optional location adjustment and Übertiefe coefficient.
3. **Herstellungskosten** – interpolate NHK 2010 cost class by weighted Ausstattungsstufe, add corrections and non-BGF components, apply Baupreisindex and Baunebenkosten.
4. **Alterswertminderung** – `AWM-Faktor = RND / GND`.
5. **Bauliche Anlagen** – `indexierte HK × BGF × AWM-Faktor`; add Zeitwert Außenanlagen.
6. **Vorläufiger Sachwert** – building/outdoor value + Bodenwert + special adjustments.
7. **Marktanpassung** – multiply by the object-adjusted Sachwertfaktor.
8. **Plausibility / rights** – optional comparison value and optional Wohnungsrecht.

### 4.2 Standardstufe

Nine Gewerke are weighted:

| Gewerk | Weight |
| --- | ---: |
| Außenwände | 23 % |
| Dach | 15 % |
| Fenster und Außentüren | 11 % |
| Innenwände und -türen | 11 % |
| Deckenkonstruktion und Treppen | 11 % |
| Fußböden | 5 % |
| Sanitäreinrichtungen | 9 % |
| Heizung | 9 % |
| Sonstige technische Ausstattung | 6 % |

The resulting value (1–5, fractional values allowed) is linearly interpolated between the NHK cost levels.

### 4.3 RND

- Default: `RND = GND − Gebäudealter`.
- With more than one modernization point and a relative age inside the model's applicability range:

```text
RND = (a × Alter²) / GND − b × Alter + c × GND
```

The result is limited to the linear RND as a minimum and `1.7 × GND` as a maximum. Parameters `a`, `b`, `c` and the relative-age limit are stored in `data.js` (ImmoWertV, Anlage 2).

### 4.4 Sachwertfaktor

For the selected report and building class, `data.js` contains:

- the regression `k = a × x^b` (`x` = vorläufiger Sachwert),
- σ and sample size,
- the published factor table.

The table is used by linear interpolation where a value exists. If the value is outside the published span, the regression is used and a warning is shown; the report explicitly warns against extrapolation.

An object-specific adjustment can be entered as a percentage. For example, changing the table value 1.30 to 1.10 is an adjustment of −15.38 %.

### 4.5 Wohnungsrecht

Following `AnDerLilie51.pdf`:

1. Reduce RND by the statistical life expectancy.
2. Recalculate the Sachwert with the reduced RND (Bodenwert unchanged).
3. Discount the future Sachwert with a life-dependent discount factor.
4. Apply an uncertainty deduction.
5. Add the capitalized annual savings from the future owner taking over maintenance costs.

Discount factor, uncertainty deduction, annual savings and annuity factor are user inputs because they require expert/mortality-table judgement.

---

## 5. Built-in market data

### Bodenrichtwerte (gute / mittlere / mäßige Lage)

| Use | 2025 | 2026 |
| --- | --- | ---: |
| Wohnbau, 1–2 geschossig | 780 / 705 / 585 | 790 / 725 / 585 |
| Wohnbau, 3+ geschossig | 730 / 695 / – | 730 / 695 / – |
| Gemischte Nutzung, Ringe | 850 | 850 |
| Gemischte Nutzung, sonstige | 770 | 770 |
| Kerngebiet | 950 | 950 |
| Außenbereich | 145 | 145 |

Übertiefe coefficients: 0.50–1.0 up to 5 m, then 0.40 / 0.34 / 0.29 / 0.25 / 0.23 / 0.20 / 0.18 / 0.16 / 0.15 for 10–50 m.

### Sachwertfaktor regression parameters

| Building class | 2025 a / b / σ / n | 2026 a / b / σ / n |
| --- | --- | --- |
| EFH/ZFH | 2.8964 / −0.081 / 0.17 / 60 | 3.0131 / −0.084 / 0.14 / 70 |
| DHH | 0.4599 / 0.0719 / 0.14 / 60 | 0.176 / 0.1413 / 0.21 / 56 |
| REH | 19.233 / −0.219 / 0.17 / 40 | 22.729 / −0.227 / 0.19 / 30 |
| RMH | 17.314 / −0.201 / 0.22 / 62 | 11.247 / −0.167 / 0.22 / 48 |

The complete interpolation tables are in `data.js`.

---

## 6. Worked example verification

Loading **An der Lilie 51** should produce:

| Quantity | Report | App |
| --- | ---: | ---: |
| Stichtag | 11.03.2023 | 2023-03-11 |
| Baujahr / GND / RND | 1978 / 80 / 35 | 1978 / 80 / 35 |
| Alterswertminderung | 56.25 % | 56.25 % |
| Weighted Standardstufe | approx. 2.43 | 2.43 |
| Indexierter HK | 1.093 €/m² | 1.093 €/m² |
| Bodenwert | 326.190 € | 326.190 € |
| Vorläufiger Sachwert | 520.636 € | 520.637 € |
| Sachwertfaktor | 1.10 | 1.10 |
| Sachwert | 572.699 € | 572.701 € (rounded 573.000 €) |
| Sachwert with Wohnungsrecht | 398.737 € | 398.739 € (rounded 399.000 €) |

Small differences of a few euros come from the report truncating intermediate values, while the app keeps full precision until final rounding.

---

## 7. Files

| File | Purpose |
| --- | --- |
| `index.html` | German wizard UI with eight steps. |
| `styles.css` | Responsive styling and print layout. |
| `data.js` | Embedded market data, NHK tables, RND parameters, defaults and examples. |
| `calculation.js` | Pure calculation engine; no DOM access. |
| `app.js` | Form binding, live rendering, navigation, persistence and export helpers. |
| `docs/CALCULATION.md` | Detailed formula reference in English. |
| `README.md` | This document. |

`calculation.js` and `data.js` use a small UMD-style wrapper, so they can also be required by CommonJS tooling if needed.

---

## 8. Assumptions and limitations

- Baupreisindex values are user-enterable presets taken from the previous spreadsheet work; they are not published in the supplied Ratingen reports.
- For the 2026 model, Baunebenkosten are treated as included in NHK (0 %). The example uses 17 %; both are supported.
- Bodenrichtwerte in this app are gebietstypische averages. The actual zone BRW should be taken from BORISplus.NRW for the specific property and entered manually.
- The RND model is an orientation model; it does not replace sachverständige Würdigung.
- No full Ertragswertverfahren, Vergleichswertverfahren, income capitalization, or tax/transaction-cost module is included.
- Fiscal or legal rights other than the modelled Wohnungsrecht must be assessed separately.

---

## 9. Maintenance

When a new Grundstücksmarktbericht is published:

1. Update `marketReports` in `data.js` (BRW, Übertiefe, factor parameters, factor table, model description).
2. Add a new option to the report selects in `index.html` / `app.js` if needed.
3. Update the year-specific model notes (GND, BNK treatment, Regionalfaktor).
4. Re-run the example verification in section 6 to make sure the engine still reproduces the reference values.
