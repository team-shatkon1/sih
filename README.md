# ORCA — Marine Ecosystem Reasoning with Collaborative Agents
### ISRO Problem Statement 26176 | Space Technology | Smart India Hackathon 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![ISRO](https://img.shields.io/badge/ISRO-Problem%2026176-orange.svg)](https://www.isro.gov.in/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Automated Tests](https://img.shields.io/badge/Tests-27%2F27%20Passed-brightgreen.svg)]()

> **"ORCA does not own special ocean data. ORCA's innovation is the reasoning layer.**  
> Multiple environmental domains independently evaluate a location. ORCA fuses their evidence, exposes disagreements, lets the user challenge the decision, and calculates what would need to change for the decision to flip.  
> **Gemini explains the result — it never invents it."**

---

## 🏆 SIH 2026 Hero Points — What Makes ORCA Unbeatable

| # | Hero Feature | Why It Dominates Competitors (Windy, MarineTraffic, Copernicus) |
|---|---|---|
| **1** | **ORCA Decision Council** | Unlike generic dashboards or chatbots, a selected location is independently evaluated by **4 specialist reasoning modules**: **Weather Agent**, **Ocean Agent**, **Ecosystem Agent**, and **Risk/Safety Agent**. |
| **2** | **Agent Disagreement Engine** | Agents are **never forced to agree**. When 3 domains report favorable conditions while the Risk Agent identifies elevated wave exposure, ORCA explicitly flags **`⚠ AGENT DISAGREEMENT DETECTED`** and derives the explanation from empirical telemetry. |
| **3** | **Deterministic Evidence Arbitration** | Pure rule-based fusion. The Large Language Model (Gemini) is **strictly prohibited from calculating authoritative scores**. Scores (0–100) are mathematically reproducible and verifiable. |
| **4** | **"Find Decision Flip" ($\Delta$ Solver)** | The signature interaction: Given Zone A (Score 82) and Zone B (Score 74), ORCA calculates the **exact physical threshold shift** (e.g., *Wave at Zone A: 1.2m &rarr; 2.1m* or *Wind: 17 &rarr; 31 km/h*) required for Zone B to overtake Zone A. |
| **5** | **"Challenge ORCA" (Adversarial Audit)** | Users can critically challenge recommendations via predefined audit vectors (*"Which agent disagrees?"*, *"What evidence is weakest?"*, *"What could make this decision wrong?"*) or free-text queries, answered strictly from council evidence. |
| **6** | **4D Lagrangian Particle Drift Twin** | Simulates 24–72 hour advection and Gaussian dispersion for **Search & Rescue (SAR) life-raft leeway** and **Oil Spill Slicks** using Runge-Kutta hydrodynamic integration with coastal landfall probabilities. |
| **7** | **Cayula-Cornillon Front Edge Detection** | Computes horizontal thermal and biomass breaks ($|\nabla SST|$ and $|\nabla Chl|$) from Sentinel-3 satellite telemetry to pinpoint **Potential Fishing Zones (PFZs)** and commercial pelagic species. |
| **8** | **Multilingual Regional Voice AI** | Native voice interaction supporting **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**, including Hinglish, mixed regional syntax, and phonetic Romanized dialects. |
| **9** | **Data Trust Passport & Provenance** | Zero fake data guarantee. Every observation is tagged as `LIVE`, `CACHED`, `FORECAST`, or `UNAVAILABLE` with complete sensor provenance and multi-provider disagreement detection. |
| **10** | **Green Maritime Hydrodynamic Routing** | Quantifies propulsion power savings ($P = \frac{1}{2}\rho C_T S (V_v - V_c)^3$), liters of bunker fuel conserved, and metric tons of $CO_2$ mitigated along drift-assisted transit corridors. |

---

## 🏛️ System Architecture & Reasoning Pipeline

```
+-------------------------------------------------------------------------------------------------+
|                                    ORCA REASONING PIPELINE                                      |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   1. REAL DATA INGESTION                                                                        |
|      • Copernicus Sentinel-3 OLCI (Chlorophyll-a Biomass) & SLSTR (Sea Surface Temperature)     |
|      • Open-Meteo GFS / ECMWF Marine Physics (Wave Height, Swell, Ocean Currents, Wind)        |
|      • INCOIS / NOAA Geospatial Sanctuaries, EEZ Boundaries & Cyclonic Advisories               |
|                                       │                                                         |
|                                       ▼                                                         |
|   2. NORMALIZATION & VALIDATION LAYER                                                           |
|      • SI Metric Mapping (meters, km/h, mg/m³, °C)                                              |
|      • Telemetry Quality Checks, Cloud Masking & Provenance Tagging                             |
|                                       │                                                         |
|                                       ▼                                                         |
|   3. SPECIALIST REASONING MODULES (ORCA DECISION COUNCIL)                                       |
|      ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐              |
|      │  WEATHER AGENT   │   OCEAN AGENT    │ ECOSYSTEM AGENT  │   RISK AGENT     │              |
|      │ Wind, gusts,     │ Waves, swell,    │ Sentinel-3 Chl,  │ Multi-factor     │              |
|      │ pressure, rain   │ current velocity │ SST, upwelling   │ exposure index   │              |
|      │ Contribution: +14│ Contribution: +18│ Contribution: +16│ Contribution: -10│              |
|      └──────────────────┴──────────────────┴──────────────────┴──────────────────┘              |
|                                       │                                                         |
|                                       ▼                                                         |
|   4. AGENT DISAGREEMENT & EVIDENCE ARBITRATION                                                  |
|      • Detects domain divergence (e.g. 3 Favorable vs 1 Caution)                                |
|      • Deterministic Fusion: Base 50 + Sum(Contributions) [Clamped 0 - 100]                     |
|      • Agreement Level calculation ("3/4 agents")                                               |
|                                       │                                                         |
|                                       ▼                                                         |
|   5. EXPLANATION & ACTION LAYER (GEMINI GROUNDED AI)                                            |
|      • Strictly grounded explanation generation (never invents numbers)                         |
|      • Triggers real map actions (ENABLE_LAYER, SELECT_ZONE, FOCUS_ZONE)                        |
|      • Regional voice response (English, Hindi, Marathi)                                        |
+-------------------------------------------------------------------------------------------------+
```

---

## 🔬 Peer-Reviewed Academic Grounding

ORCA's algorithms are directly derived from published peer-reviewed oceanographic literature:

1. **Front Edge Detection (Potential Fishing Zones):**
   * *Cayula, J. F., & Cornillon, P. (1992).* "Edge detection for SST images." *Journal of Atmospheric and Oceanic Technology*, 9(1), 67–80.
   * *Solanki, H. U., et al. (ISRO / INCOIS, 2003, 2017).* "Fishery forecast using OCM-derived chlorophyll and AVHRR SST: Operational PFZ methodology." *International Journal of Remote Sensing*, 24(12), 2479–2491.
2. **4D Lagrangian Ocean Dispersion:**
   * *van Sebille, E., et al. (2018).* "Lagrangian ocean analysis: Fundamentals and practices." *Ocean Modelling*, 121, 49–75.
3. **Search & Rescue (SAR) & Spill Leeway Drift:**
   * *Allen, A. A., & Plourde, J. V. (1999) / Breivik, Ø., & Allen, A. A. (2008).* "An operational search and rescue model for the Norwegian Sea and the North Sea." *Journal of Marine Systems*, 69(1-2), 99–113.
4. **Hydrodynamic Fuel & Carbon Economy:**
   * Power equation formulation: $P = \frac{1}{2}\rho C_T S (V_{\text{vessel}} - V_{\text{current}})^3$ accounting for relative fluid speed along current streamlines.

---

## ⚡ Core Features Breakdown

### 1. ORCA Decision Council
A dedicated panel within the marine workspace where each domain specialist independently assesses the operational sector:
- **Weather Agent**: Assesses sustained wind, gusts, and rain. Benchmarks: $< 20\text{ km/h}$ (Optimal, $+8$), $20-32\text{ km/h}$ (Moderate, $+3$), $> 32\text{ km/h}$ (Hazardous, $-8$).
- **Ocean Agent**: Assesses significant wave height and current velocity. Benchmarks: $< 1.3\text{m}$ (Calm, $+10$), $1.3-2.1\text{m}$ (Moderate, $+3$), $> 2.1\text{m}$ (Rough, $-12$).
- **Ecosystem Agent**: Assesses Sentinel-3 chlorophyll biomass and thermal stability. Benchmarks: $\ge 1.2\text{ mg/m}^3$ (Productive, $+10$), $26.5-29.5^\circ\text{C}$ (Pelagic optimal, $+6$).
- **Risk/Safety Agent**: Assesses non-linear exposure: $\text{Exposure} = \left(\frac{\text{Wave}}{3.2}\right)^{1.3} \times 45 + \left(\frac{\text{Wind}}{50}\right)^{1.2} \times 35 + \min\left(1, \frac{\text{Current}}{3.5}\right) \times 20$.

### 2. Agent Disagreement Engine
When domain assessments conflict, ORCA exposes the disagreement rather than smoothing it over:
```
⚠ AGENT DISAGREEMENT DETECTED
Weather     ✓ Favorable
Ocean       ✓ Favorable
Ecosystem   ✓ Favorable
Risk        ⚠ Caution

"Why do they disagree?"
Three evidence domains support the location (Weather, Ocean, Ecosystem), while the
Risk Agent identifies elevated wave exposure (1.8m against 1.2m baseline).
```

### 3. "Find Decision Flip" ($\Delta$ Inversion Solver)
Computes the inverse mathematical solution showing how much physical conditions must deteriorate or improve for ranking to invert:
- **Zone Alpha:** Current Score **100/100**
- **Zone Bravo:** Current Score **67/100**
- **Flip Thresholds Generated:**
  1. *Wave at Zone Alpha:* $1.20\text{m} \rightarrow 3.39\text{m}$ ($+2.19\text{m}$ swell increase)
  2. *Wind at Zone Alpha:* $17.0\text{ km/h} \rightarrow 60.8\text{ km/h}$ ($+43.8\text{ km/h}$ wind stress)
  3. *Chlorophyll at Zone Bravo:* $1.10\text{ mg/m}^3 \rightarrow 4.40\text{ mg/m}^3$ ($+3.30\text{ mg/m}^3$ upwelling surge)

### 4. Interactive Evidence Graph (Clickable DAG)
Visualizes the deterministic provenance graph:
$$\text{ORCA Score} \longrightarrow \{\text{Suitability}, \text{Risk}\} \longrightarrow \{\text{Wind}, \text{Wave}, \text{SST}, \text{Chlorophyll}\} \longrightarrow \text{Source} \longrightarrow \text{Timestamp} \longrightarrow \text{Confidence}$$
Clicking any node reveals metric value, unit, contribution points, benchmark status, and sensor provenance.

### 5. Marine Time Machine & Change Radar
- **Time Machine:** Scrubber covering $-24\text{h}$, $-12\text{h}$, $-6\text{h}$, $\text{NOW}$, $+6\text{h}$, $+12\text{h}$, $+24\text{h}$, $+48\text{h}$.
- **Change Radar:** Quantifies $\Delta \text{Wind}$, $\Delta \text{Wave}$, $\Delta \text{SST}$, and $\Delta \text{Risk}$ against baseline to pinpoint the dominant environmental change driver.

### 6. Scenario Lab (🔮 What If?)
Interactive perturbation sliders allowing operators to simulate customized environmental swings (e.g., $+0.8\text{m}$ wave height, $+15\text{ km/h}$ wind) with instantaneous recalculation using the **same deterministic fusion engine**.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, MongoDB status, Gemini API configuration |
| `POST` | `/api/analysis` | Comprehensive environmental observation & risk bundle |
| `POST` | `/api/council/evaluate` | Runs 4 specialist reasoning modules & evidence arbitration |
| `POST` | `/api/council/disagreement` | Evaluates agent divergence and returns empirical explanation |
| `POST` | `/api/council/decision-flip` | Computes physical variable shifts to flip ranking between Zone A & B |
| `POST` | `/api/council/challenge` | Audits decision against council evidence chain for critical scrutiny |
| `POST` | `/api/digital-twin/drift-simulation` | 4D Lagrangian particle dispersion & leeway simulation |
| `POST` | `/api/digital-twin/fronts` | Cayula-Cornillon SST & Chlorophyll front edge extraction |
| `POST` | `/api/digital-twin/agent-debate` | Multi-agent consensus debate & green eco-routing metrics |
| `POST` | `/api/assistant` | Grounded conversational AI assistant with map control actions |
| `GET` | `/api/reports` | Community crowd-sourced maritime incident & observation feed |
| `POST` | `/api/reports` | Submit geo-referenced maritime hazard report |

---

## 🧪 Automated Test Suite

ORCA includes an automated verification suite covering Council evaluation, disagreement detection, decision flip inversion, evidence arbitration, and regional language normalization.

To execute the test suite:
```bash
npx tsx tests/orcaCouncilTest.ts
```

**Output:**
```
=============================================================
ORCA DECISION COUNCIL AUTOMATED TEST SUITE (ISRO PS-26176)
=============================================================

[1/7] Testing Council Evaluation (Favorable Baseline)
  ✓ PASS: Final score exceeds 75 for benign sea state
  ✓ PASS: Decision status is favorable
  ✓ PASS: Weather Agent reports FAVORABLE
  ✓ PASS: Ocean Agent reports FAVORABLE
  ✓ PASS: Ecosystem Agent reports FAVORABLE
  ✓ PASS: Risk Agent reports FAVORABLE
  ✓ PASS: Zero disagreement under unanimous favorable baseline

[2/7] Testing Agent Disagreement Engine (Elevated Wave Perturbation)
  ✓ PASS: Disagreement is correctly flagged (hasDisagreement = true)
  ✓ PASS: At least 1 dissenting agent detected
  ✓ PASS: Deterministic explanation explains root cause of divergence
  ✓ PASS: Cautionary factors list is populated

[3/7] Testing Evidence Arbitration (Deterministic Fusion Rules)
  ✓ PASS: Confidence is within [80, 100]% range
  ✓ PASS: Dominant positive factors extracted correctly
  ✓ PASS: Evidence chain contains 5 sequential validation steps

[4/7] Testing Decision Flip Solver (Zone A vs Zone B)
  ✓ PASS: Zone A currently outranks Zone B
  ✓ PASS: At least 2 concrete physical flip conditions generated
  ✓ PASS: Wave flip threshold represents realistic deterioration
  ✓ PASS: Simulated perturbation confirms Zone B overtakes Zone A

[5/7] Testing "Challenge ORCA" Evidence Audit
  ✓ PASS: Challenge identifies dissenting domain
  ✓ PASS: Confidence score returned with challenge audit
  ✓ PASS: Challenge identifies physical boundary failure modes

[6/7] Testing Candidate Zone Engine
  ✓ PASS: Generated at least 3 spatial candidate zones
  ✓ PASS: Candidate zones contain valid suitability score
  ✓ PASS: Candidate zones contain structured "Why This Zone" evidence

[7/7] Testing Multilingual & Regional Query Grounding
  ✓ PASS: Hindi query input normalized
  ✓ PASS: Marathi regional query input normalized
  ✓ PASS: Hinglish romanized query recognized

-------------------------------------------------------------
TOTAL TESTS: 27 | PASSED: 27 | FAILED: 0
-------------------------------------------------------------
ALL ORCA COUNCIL TESTS PASSED SUCCESSFULLY!
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js $\ge 18.0.0$
- npm $\ge 9.0.0$

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/orca-marine-intelligence.git
cd orca-marine-intelligence
npm install
```

### 2. Environment Configuration
Create `.env` in the root directory:
```env
PORT=8787
CLIENT_URL=http://127.0.0.1:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/orca
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Workstation
```bash
npm run dev
```
- Client runs at: `http://127.0.0.1:5173`
- Server API runs at: `http://127.0.0.1:8787`

### 4. Build Production Bundle
```bash
npm run build
```
Compiles both client Vite bundle and server TypeScript backend with zero errors.

---

## 👥 Role-Based Experience

ORCA dynamically customizes UI workflows based on operational roles:
- **Fisherman Mode:** Prioritizes Potential Fishing Zones (PFZs), sea state suitability, wind comfort, and audio briefings in regional languages (Marathi/Hindi).
- **Maritime Authority Mode:** Prioritizes multi-factor physical exposure risk, active cyclonic/storm geofences, EEZ compliance, and crowd-sourced hazard validation.
- **General Operator Mode:** Balanced overview with synoptic weather, tide windows, and interactive scenario simulations.

---

## ⚖️ Safety & Legal Disclaimer

*The environmental indices, candidate zone rankings, and Lagrangian drift simulations generated by ORCA are computational decision-support indicators. They do not constitute official navigational certification, safety guarantees, or statutory maritime warnings. Vessel masters and operators remain strictly responsible for compliance with international regulations (COLREGS) and official advisories issued by national meteorological and maritime authorities (IMD, INCOIS, Indian Coast Guard).*
