# Calculation reference

This document describes the formulas implemented in `calculation.js`. Field names in parentheses correspond to the German labels in the UI.

## Notation

| Symbol | Meaning |
| --- | --- |
| `A` | Grundstücksfläche (m²) |
| `BRW` | Bodenrichtwert (€/m²) |
| `BGF` | Bruttogrundfläche (m²) |
| `GND` | Gesamtnutzungsdauer (years) |
| `RND` | wirtschaftliche Restnutzungsdauer (years) |
| `HK` | Herstellungskosten per m² BGF |
| `BNK` | Baunebenkosten rate |
| `I` | Baupreisindex (Basis 2010 = 100) |
| `k` | Sachwertfaktor |
| `fw` | Alterswertminderungsfaktor |

All rates stored in the state are decimals (e.g. `0.17` for 17 %). The UI displays percentages.

---

## 1. Object date and age

```text
Alter = year(Wertermittlungsstichtag) − Baujahr
```

`Alter` is clamped to `[0, GND]`. The current calendar year is never used when a Stichtag is present.

---

## 2. Bodenwert

```text
BRW_adj   = BRW × (1 + Lageanpassung / 100)
A_eff     = Fläche_bis_typische_Tiefe + Fläche_übertiefe × Übertiefe-Koeffizient
Bodenwert = BRW_adj × A_eff
```

The Übertiefe coefficient is selected from the table in `data.js`. Values above 50 m produce a warning because the published table ends there.

---

## 3. Ausstattungsstufe and NHK

```text
Standardstufe = Σ (Stufe_i × Gewicht_i)
```

Weights sum to 1.0. The result is linearly interpolated between the five NHK cost levels of the selected building type:

```text
HK_base = level[n] + (Standardstufe − n) × (level[n+1] − level[n])
```

where `n = floor(Standardstufe)` clamped to the available levels.

Corrections applied before indexation:

```text
HK_corr = HK_base × Regionalfaktor
          × (1.05 if freistehendes Zweifamilienhaus and type 1.11)
          × MFH_Wohnungsgrößenkorrektur
          × Grundrissartkorrektur
          + Σ(Zuschläge_nicht_in_BGF) / BGF
```

The MFH apartment-size correction follows the spreadsheet model:

```text
f = WF/WE × (−0.0017647 × WF/WE + 1.088235) / 100
```

---

## 4. Index and Baunebenkosten

```text
HK_indexed = HK_corr × I
```

If `roundNhk` is enabled, `HK_indexed` is rounded to whole €/m² before the next step. This reproduces the published worked example.

```text
HK_with_BNK = HK_indexed × (1 + BNK)
```

The 2026 Ratingen model states that Baunebenkosten are already contained in NHK (`BNK = 0`). The worked example uses `BNK = 0.17`.

---

## 5. RND and Alterswertminderung

Linear baseline:

```text
RND_linear = GND − Alter
fw         = RND / GND
AWM_%      = (1 − fw) × 100
```

Modernization model (ImmoWertV, Anlage 2) if points > 1 and `Alter / GND ≤ maximum` for that point count:

```text
RND_modell = (a × Alter²) / GND − b × Alter + c × GND
RND        = min(max(RND_modell, RND_linear), 1.7 × GND)
```

Maximum modernization points: 20. Up to one point is treated as not modernized (SW-RL, Anlage 4).

---

## 6. Building and outdoor value

```text
Herstellungskosten_zeitlich   = HK_with_BNK × BGF × fw
Zeitwert_Außenanlagen         = Herstellungskosten_zeitlich × Außenanlagenrate
Sachwert_bauliche_Anlagen     = Herstellungskosten_zeitlich + Zeitwert_Außenanlagen
```

Typical Außenanlagen rates are 5 % for the main RMH example and can be changed in the UI.

---

## 7. Vorläufiger Sachwert

```text
Vorläufiger_Sachwert =
    Sachwert_bauliche_Anlagen
  + Bodenwert
  + Σ(besondere objektspezifische Merkmale)
```

Positive values in the special-features list increase the preliminary value; negative values reduce it.

---

## 8. Sachwertfaktor and final Sachwert

```text
k_final = k_base × (1 + objektspezifische_Anpassung / 100)
Sachwert = Vorläufiger_Sachwert × k_final
Gerundeter_Sachwert = round(Sachwert / 1000) × 1000
```

`k_base` is either:

- the manually entered factor,
- a linear interpolation of the report table, or
- the regression `k = a × x^b` when no table value is available (with warning).

---

## 9. Plausibility

If a comparison value is entered:

```text
Plausibilitätswert = (Sachwert + Vergleichswert) / 2
```

This is a display-only average; it does not change the computed Sachwert.

---

## 10. Wohnungsrecht

```text
RND_future = max(0, RND − Lebenserwartung)
fw_future  = RND_future / GND

HK_future            = HK_with_BNK × BGF × fw_future
Anlagen_future       = HK_future × Außenanlagenrate
Preliminary_future   = HK_future + Anlagen_future + Bodenwert + Sondermerkmale
Sachwert_future      = Preliminary_future × k_final

Diskontierter_Wert   = Sachwert_future × Diskontierungsfaktor
Nach_Unsicherheit    = Diskontierter_Wert × (1 − Unsicherheitsabschlag / 100)
Vorteil_Ersparnis    = jährliche_Ersparnis × Leibrentenbarwertfaktor

Sachwert_mit_Wohnrecht = Nach_Unsicherheit + Vorteil_Ersparnis
```

The model assumes the Bodenwert and the Sachwertfaktor remain unchanged until the right ends. Discount and annuity factors are external inputs because they depend on mortality tables and an object-specific interest rate.

---

## 11. Rounding and precision

- Internal calculations keep floating-point precision.
- Only the indexierte HK can optionally be rounded to whole €/m².
- Final values are rounded to full 1,000 € for display.
- The worked report truncates some intermediate euro values, which explains euro-level differences.
