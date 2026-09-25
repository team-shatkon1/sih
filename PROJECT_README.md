# ORCA — Marine Ecosystem Reasoning with Collaborative Agents
## National-Scale AI-Powered Marine Environmental Intelligence & Maritime Decision-Support Platform

---

## 📌 Executive Summary

**ORCA** (**M**arine **E**cosystem **R**easoning with **C**ollaborative **A**gents) is an end-to-end, production-grade marine intelligence and decision-support workstation. It bridges the critical divide between raw, siloed satellite oceanography, numerical weather prediction models, and real-world maritime operations.

Unlike generic weather apps or simulated dashboards, ORCA is built on **verifiable live multi-provider telemetry**, **deterministic geospatial inference engines**, **physics-grounded oceanographic models**, and **state-of-the-art multimodal AI** powered by Google Gemini (`gemini-3.6-flash`). It provides maritime authorities, commercial fisheries, scientific researchers, and artisanal coastal fishermen with actionable, real-time situational awareness, route hazard scoring, 7-day predictive analytics, and regional multilingual voice assistance.

---

## 🌊 The Problem Statement

### 1. Fragmentation & Inaccessibility of Marine Data
* Oceanographic data (sea surface temperature, wave dynamics, bathymetry, ocean surface currents, chlorophyll-a trophic biomass) is locked across disparate scientific agencies (Copernicus, NOAA, ECMWF, INCOIS, GEBCO).
* Artisanal fishermen and regional operators lack the tools to interpret complex scientific datasets such as spectral satellite imagery or NetCDF wave models.

### 2. The Danger of Hallucinated / Black-Box AI in Mission-Critical Maritime Environments
* Standard generative AI platforms often hallucinate ocean conditions, invent coordinates, or provide generic advice that risks lives and vessels at sea.
* Maritime decision-making requires **deterministic calculations**, **auditable evidence trails**, and **explicit provenance**.

### 3. Coastal Language & Accessibility Barriers
* Coastal fishing communities frequently speak regional languages (e.g., Hindi, Marathi, Gujarati, Tamil) and operate in harsh, high-glare sea conditions where typing on touchscreens is impractical or dangerous.

### 4. Terrestrial False Positives in Ocean Sensing
* Many commercial dashboards naively query bounding boxes or coastal pixels, displaying erroneous ocean metrics (such as marine chlorophyll blooms) over land masses, destroying operator trust.

---

## 🚀 The ORCA Solution

ORCA resolves these challenges through a unified, resilient 3-tier architecture:
1. **Verifiable Multi-Provider Telemetry**: Real-time integration with Copernicus Sentinel-3 OLCI, Open-Meteo Marine (ECMWF 0.25°), Open-Meteo Weather (DWD/NOAA GFS), and GEBCO bathymetry.
2. **Deterministic Risk & Suitability Engine**: Transparent mathematical models scoring maritime navigation risk (0–100) and operational suitability (0–100) without black-box guesswork.
3. **Wise Terrestrial Land-Masking**: Strict coordinate validation that identifies inland/terrestrial coordinates and masks bio-optical values to `0.00 mg/m³` (`LAND_MASKED`).
4. **Interactive GIS Cartography with True Satellite Imagery**: Esri World Imagery (high-resolution satellite) and ArcGIS World Ocean basemaps with zero watermarks and zero third-party API key bottlenecks.
5. **Regional Multilingual Voice AI (`gemini-3.6-flash`)**: Hands-free, zero-raw-asterisk audio assistant equipped with a fluid glowing orb visualizer and real-time speech synthesis in English, Hindi, and Marathi.
6. **Role-Based Access Control (RBAC)**: Custom profiles for **Fisherman**, **Researcher**, **Maritime Authority**, and **Guest**, backed by Firebase OAuth.
7. **Simplified Tri-Segmented Intelligence Rail**:
   - **`🌊 Marine`**: Real-time ocean pulse, wave height, swell period, currents, risk/suitability hero cards, and vessel departure ratings.
   - **`🌦️ Weather & Predictions`**: Synoptic weather, dynamic astronomical tide gauge, 48-hour hourly strip, and 7-day extended sea state outlook.
   - **`🧬 Bio`**: Sentinel-3 Chlorophyll-a trophic biomass, Marine Fingerprint 2.0, and Data Trust Passport 2.0.

---

## 🏗️ System Architecture

```
                                  ORCA PLATFORM ARCHITECTURE
                                  
+--------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Vite + React)                             |
|                                                                                                  |
|   +-----------------------+   +-----------------------+   +----------------------------------+   |
|   |   Leaflet GIS Engine  |   |   Workspace Domains   |   |   Tri-Segmented Intelligence Rail|   |
|   |  • Esri Satellite     |   |  • Explore & Analysis |   |   [🌊 Marine | 🌦️ Weather | 🧬 Bio] |   |
|   |  • ArcGIS Ocean Cont. |   |  • Candidate Zones    |   |  • Hero Risk & Suitability Score |   |
|   |  • Vector Overlays    |   |  • Scenario Lab       |   |  • Vessel Departure Safety       |   |
|   |  • Controlled Zoom    |   |  • Route Inspector    |   |  • 48h Hourly & 7d Predictions   |   |
|   +-----------------------+   +-----------------------+   |  • Dynamic Coastal Tide Gauge    |   |
|                                                           +----------------------------------+   |
|   +------------------------------------------------------------------------------------------+   |
|   |   Gemini Multilingual Voice Assistant (gemini-3.6-flash + Animated Glowing Orb Visualizer) |   |
|   |   Firebase OAuth & RBAC (Fisherman, Researcher, Maritime Authority, Guest Gating)        |   |
|   +------------------------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
                                                │
                                    REST API / JSON Payloads
                                                ▼
+--------------------------------------------------------------------------------------------------+
|                                 APPLICATION BACKEND (Node.js + Express)                          |
|                                                                                                  |
|   +----------------------+   +-----------------------+   +-----------------------------------+   |
|   | Geospatial Service   |   | Deterministic Engines |   | Extended Weather & Tide Engine    |   |
|   | • Marine Validation  |   | • Risk Index Engine   |   | • 48h Diurnal Hourly Interpolation|   |
|   | • Land-Masking       |   | • Maritime Suitability|   | • 7-Day Sea State Prediction      |   |
|   | • Elevation Lookup   |   | • Evidence Graph (DAG)|   | • Semi-Diurnal Tide Model (12.42h)|   |
|   +----------------------+   +-----------------------+   +-----------------------------------+   |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | Gemini Assistant Service (Grounding Buoy Prompt, Structured Responses, Audio Sanitizer)   |   |
|   | In-Memory Cache & Decision Snapshot Audit Storage (StorageService)                       |   |
|   +------------------------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
                                                │
                                    Upstream Live Scientific APIs
                                                ▼
+--------------------------------------------------------------------------------------------------+
|                                 LIVE OCEANOGRAPHIC & MET DATA SOURCES                            |
|                                                                                                  |
|   • Copernicus Sentinel-3 OLCI (Bio-optical Chlorophyll-a Biomass)                               |
|   • Open-Meteo Marine API (Copernicus / ECMWF Global Wave & Ocean Current 0.25°)                 |
|   • Open-Meteo Weather API (DWD ICON & NOAA GFS High-Resolution Atmosphere)                      |
|   • GEBCO Bathymetric Elevation Model                                                            |
|   • OpenStreetMap Nominatim Geocoding                                                            |
+--------------------------------------------------------------------------------------------------+
```

---

## 🌟 Key Features & Capabilities

### 1. Interactive Oceanographic Workspace & Satellite Basemap
* **ArcGIS Ocean Basemap**: Rich blue oceanic color grading with bathymetric shelf contours.
* **Esri World Imagery**: Sub-meter satellite imagery selectable anytime with **zero API key requirement** and **zero watermarks**.
* **High-Precision Map Zoom Control**: Custom damping factors (`wheelPxPerZoomLevel: 160`, `zoomSnap: 0.5`) eliminating trackpad over-zoom.

### 2. Tri-Segmented Simplified Intelligence Side Panel
* **`🌊 Marine` Tab**:
  - **No-Overlap Hero Metric Pair**: Modeled Risk (0–100) and Maritime Suitability (0–100) presented with discrete status pills and primary drivers.
  - **4 Compact Ocean Readings**: Wave Height (`m`), Wind Velocity (`km/h`), Sea Surface Temperature (`°C`), and Surface Drift (`km/h`) with live pulse indicators.
  - **Vessel Departure & Craft Workability Assessment**: Real-time safety ratings for *Small Craft / OBM (<25ft)*, *Commercial Trawlers*, and *Sailing Vessels*.
  - **One-Tap AI Audio Synoptic Briefing**: Immediate audio synthesis of wave, wind, and risk status in English, Hindi, or Marathi.
* **`🌦️ Weather & Predictions` Tab**:
  - **Synoptic Weather Card**: Real-time temperature, "feels-like" index, condition badge, wind gusts, humidity, pressure, and visibility in km.
  - **Dynamic Coastal Astronomical Tide Tracker**: 12.42-hour semi-diurnal astronomical tidal cycle calculation showing flood/ebb direction, current height in meters, and countdowns to next high and low tides.
  - **48-Hour Hourly Marine Strip**: Horizontal diurnal scroll bar displaying hourly temperatures, weather icons, significant wave heights (`m`), and wind speed.
  - **7-Day Oceanic Outlook Table**: Comprehensive forecast table covering day name, date, weather conditions, wave heights, sea states (Smooth, Slight, Moderate, Rough), temperature extremes, and suitability score.
* **`🧬 Bio` Tab**:
  - **Wise Land-Masked Chlorophyll-a Biomass**: Bio-optical sensor integration with automatic terrestrial suppression (`0.00 mg/m³` when placed inland).
  - **Marine Fingerprint 2.0**: Normalized multi-variable radial radar (Sea State, Wind, Thermal, Current, Rainfall, Risk, Confidence).
  - **Data Trust Passport 2.0**: Multi-source consensus score (e.g., 94% High Confidence) showing freshness, latency, and sensor provenance.

### 3. Regional Multilingual AI Assistant (`gemini-3.6-flash`)
* **Google Gemini Integration**: Connected directly to `gemini-3.6-flash` with grounded buoys and telemetry context.
* **Zero Raw Asterisks**: Custom markdown processor converts asterisks to clean semantic HTML for visual readability and completely strips markdown syntax from text-to-speech buffers.
* **Glowing Orb Visualizer**: Fluid multi-layer glowing aura reflecting `LISTENING`, `THINKING`, `SPEAKING`, and `IDLE` states.
* **Speech-to-Text & Text-to-Speech**: Hands-free operation supporting 8 regional Indian languages including Marathi (`mr-IN`) and Hindi (`hi-IN`).

### 4. Firebase Authentication & Role-Based Workspaces
* **Google OAuth & Email Login**: Secure enterprise authentication.
* **Guest Exploration**: Unauthenticated users can freely explore map layers, search coordinates, and inspect candidate zones with clear permission modals for restricted actions (Scenario Lab, snapshot exports).
* **Role Tailoring**:
  - **Fisherman**: High-contrast nearshore corridor safety, regional language defaults.
  - **Researcher**: Raw bio-optical chlorophyll bands, ocean temperature gradients.
  - **Maritime Authority**: Port departure clearance, hazard dispatch, vessel class restrictions.

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Core** | React 19, TypeScript, Vite |
| **Styling & Design** | Vanilla Modern CSS, Dark Mode, Glassmorphism, HSL Tokens |
| **GIS & Mapping** | Leaflet, Esri World Imagery, ArcGIS Ocean, OpenStreetMap Maritime |
| **AI & Voice** | Google Gemini SDK (`gemini-3.6-flash`), Web Speech Recognition & Synthesis |
| **Authentication** | Firebase Auth (Google OAuth, Email/Password, Anonymous/Guest) |
| **Icons & UI** | Lucide React, Canvas Waveform Visualizers |
| **Backend Core** | Node.js, Express, TypeScript |
| **Validation** | Zod Schema Validation |
| **Data Providers** | Copernicus Sentinel-3 OLCI, Open-Meteo Marine & Weather, GEBCO |

---

## 🛠️ Quickstart & Local Installation

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Clone & Install
```bash
git clone https://github.com/your-org/orca-marine-intelligence.git
cd orca-marine-intelligence
npm install
```

### 2. Environment Configuration
Create `.env` in the root directory:
```env
PORT=8787
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Optional Firebase Configuration (defaults to mock/local if omitted)
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 3. Run in Development Mode
```bash
# Start both Backend API and Vite Frontend concurrently:
npm run dev
```
* **Frontend**: `http://127.0.0.1:5173`
* **Backend API**: `http://127.0.0.1:8787`

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🎤 Presentation & Demo Guide

Use this structured walkthrough for presentations, client demos, or hackathon defense:

### Slide 1: The Hook & Problem Statement
* **Key Point**: "Oceans cover 71% of our planet, yet marine operators either risk their lives with outdated static forecasts or drown in disconnected scientific satellite files. ORCA turns satellite oceanography into deterministic, life-saving intelligence."

### Slide 2: The Core Innovation (Live Demo Step 1)
* **Action**: Open the map at `16.521° N, 71.993° E` (Arabian Sea).
* **Talking Points**: Show the clean ArcGIS Ocean canvas. Switch seamlessly to **Esri Satellite** imagery. Highlight the absence of watermarks and explain that this is zero-cost, high-reliability enterprise mapping.

### Slide 3: Simplified Side Panel & Vessel Safety (Live Demo Step 2)
* **Action**: Point to the right-hand panel.
* **Talking Points**:
  - Show the **Hero Stat Pair** (Modeled Risk & Maritime Suitability) with zero text collision.
  - Highlight the **Vessel Workability Section**: Show that Small Craft (OBM) have an immediate `CAUTION` status while Commercial Trawlers have `SAFE`.
  - Click the **"Audio Brief"** button to play an immediate multi-language synoptic readout.

### Slide 4: Real Weather Predictions & Coastal Tide Gauge (Live Demo Step 3)
* **Action**: Click the **`🌦️ Weather`** tab.
* **Talking Points**:
  - Point out the **Dynamic Tide Gauge**: Show the real-time calculated water level (e.g. `1.7m - Flood Tide (Rising)`) and next high/low tide predictions.
  - Scroll through the **48-Hour Hourly Strip**: Point out wave height and wind velocity trends.
  - Review the **7-Day Outlook Table**: Point out how suitability automatically recalculates across the upcoming week based on wave swells.

### Slide 5: Wise Terrestrial Land-Masking (Live Demo Step 4)
* **Action**: Click on an inland location (e.g., Pune, India).
* **Talking Points**:
  - Show that the backend immediately triggers **Wise Land-Masking**.
  - Show Chlorophyll-a dropping strictly to `0.00 mg/m³` with a `LAND MASKED` badge.
  - Explain: "Other dashboards would show 2.5 mg/m³ of marine plankton over dry land. ORCA enforces geographical truth."

### Slide 6: Regional Multilingual Voice AI (Live Demo Step 5)
* **Action**: Click the microphone icon or open the AI Console. Switch language to **Marathi** or **Hindi**. Ask: *"आज समुद्रात जाणे सुरक्षित आहे का?"* ("Is it safe to go out to sea today?")
* **Talking Points**:
  - Watch the **Glowing Orb Visualizer** transition from pulsing blue to green listening waves.
  - Point out the response: Clean headings, bold metrics, **zero raw asterisks**, and natural Indian voice synthesis.

---

## 🔒 Security & Provenance

* **Auditable Log**: Every query generates an immutable audit record with user ID, role, coordinate boundary, risk calculation, and data freshness.
* **Data Trust Verification**: Sensors carry explicit provenance tags (ECMWF, Sentinel-3, NOAA). Stale or cached data is visually tagged to prevent maritime miscalculations.
* **Non-Certification Disclaimer**: ORCA provides decision-support analytics grounded in public scientific models and is designed to supplement official government hydrographic notices.
