# SEAGNAL AI — UI FUNCTIONAL SPECIFICATION
## MARITIME THREAT INTELLIGENCE & GEOGRAPHIC SURVEILLANCE PLATFORM
**Current System Revision:** v1.0.2 (Operations Center Core)  
**Security Classification:** CONFIDENTIAL // SEAGNAL NET  
**Target Ingress Port:** Port 3000 (Cloud Run Container Base)

---

## SECTION 1: GLOBAL LAYOUT & SIDEBAR NAVIGATION
The application utilizes a persistent split-screen view comprising a sidebar drawer on the left side and a dynamic scrolling operations workspace on the right side. The overall visual theme is **Tac-Dark Slate Maritime** (an immersive dark theme featuring deep greys, rich navy tones, high-contrast cyan metrics, and warning accents) with support for administrative toggle transitions.

### 1. Brand Header
*   **Logo Indicator:** A dynamic Pulsing Signal Beacon icon (`Radio` from Lucide-React) representing active satellite coordinate telemetry capture.
*   **Platform Title Text:** `SEAGNAL AI` (Main Display font, bold tracking-wide).
*   **Subtitle Badge:** `Maritime Guard` (Monospace text style in high-contrast cyan color).
*   **Operations Center ID:** `SOC STRAITS-ALPHA-1` (Indicates the active sector. Standard green indicator representing a fully operational connection with Malacca Straits radar clusters).

### 2. Sidebar Navigation Items
Selecting any navigation option immediately instructs the parent frame `App.tsx` state manager to swap the actively rendered content in the primary dashboard workspace.
*   **Dashboard** (Icon: `LayoutDashboard`)
    *   *Purpose:* Centralizes tactical metric boards, live anomaly alerts, and active ship logs.
    *   *Indicator/Badge:* Displays status as highlighted/active in cyan when chosen.
*   **Vessel Map** (Icon: `Map`)
    *   *Purpose:* Visualizes ship tracks, active routes, and restricted geofenced polygons.
    *   *Indicator/Badge:* None.
*   **Vessel Profiles** (Icon: `Anchor`)
    *   *Purpose:* Deep examination of selected vessels, course bearings, and alert histories.
    *   *Indicator/Badge:* None.
*   **Alert Center** (Icon: `BellRing`)
    *   *Purpose:* Hub for investigating, auditing, and resolving active violations.
    *   *Indicator/Badge:* Counts active unresolved alarms (initialized with a red badge displaying `4` based on active mock telemetry data).
*   **Incident Reports** (Icon: `FileText`)
    *   *Purpose:* Document compilation drafting workspace with integrated multi-agent status logs.
    *   *Indicator/Badge:* None.
*   **System Settings** (Icon: `Settings`)
    *   *Purpose:* Configuration manual for adjusting sensors, risk scoring bounds, and SOP routing rules.
    *   *Indicator/Badge:* None.

### 3. User Identity Signature
Located at the bottom of the sidebar navigation drawer:
*   **User Avatar Badge:** Single-letter initial (`D` derived from current session user email).
*   **User Username:** Display-truncated identifier (`dini`).
*   **User Signed Email Footnote:** `dini@citysage.my` (Identifies the commanding analyst on duty).

---

## SECTION 2: APPLICATION VIEWS & FUNCTION SPECS

### VIEW 1: Maritime Intelligence Dashboard
#### 1. Purpose of the Page
Provides a comprehensive overview of real-time maritime safety parameters across active patrolling corridors. It allows officers to immediately detect anomalies, search active transponder list registries, and view live incoming threats without leaving the central terminal.

#### 2. Target User
Commanding tactical officers, port authority analysts, and defense agency directors on active watch.

#### 3. Information Displayed
*   **Header Section:** Operating welcome title (`Maritime Intelligence Dashboard`), patrol sector name (`Strait of Malacca, West Malaysia Coasts • Royal Patrol Section 4`).
*   **Five (5) Core Summary Metric Cards:**
    1.  **Monitored Vessels:** Total number of vessels currently within radar range.
    2.  **High Risk Vessels:** Total count of vessels carrying a "High" threat classification classification.
    3.  **Active Alerts:** Active alerts currently requiring manual review/audit.
    4.  **AIS Gaps Detected:** Total count of vessels experiencing a transponder blackout period.
    5.  **Zone Violations:** Alerts indicating restricted geofenced military boundary crossings.
*   **Interactive Tactical Marine Map Segment:** A responsive viewport displaying interactive vessel markers, direction courses, and restricted zone boundaries.
*   **Latest Telemetry Anomalies Feed:** Live timeline ranking the five (5) most critical active threats.
*   **Active Vessel Operations Registry:** Table listing every vessel currently operating in Sector 4 with corresponding telemetry metrics.

#### 4. Components Used
*   Dashboard View Module (`DashboardView.tsx`)
*   Operational Map Canvas (`VesselMap.tsx` / Leaflet Integration)
*   Table Grid Widgets (HTML `table` styled with Tailwind)
*   Dynamic Alert Badges and Search Fields

#### 5. Data Required
*   `vessels[]` Array (MMSI, Name, Hull Type, Coordinates, Speed, Classification, Status)
*   `alerts[]` Array (Alarm ID, Linked Vessel ID, Severity, Description, Course Recommendation)
*   `zones[]` Array (Restricted bounds polygon latitude/longitude coordinates)

#### 6. Navigation Behaviour
*   Clicking **"Launch Tactical Map Coordinator"** changes the active view state to `Vessel Map`.
*   Clicking **"View"** on any vessel in the Vessel Registry table changes the active view state to `Vessel Profiles` with that vessel pre-selected.
*   Clicking **"Audit"** on any alert in the live feed navigates to the `Alert Center` with the target entry pre-selected.

#### 7. User Flow
1.  Watch Commander logs onto Dashboard.
2.  Commander views the 5 summary metrics cards and notices `High Risk Vessels` count is red.
3.  Commander scrolls down to the **Active Vessel Operations Registry** table.
4.  Commander filters table by choosing `High` risk and types `Neptune` in the search bar.
5.  Commander clicks **"View"** on the matching row, which navigates to the detailed specifications profile.

---

### VIEW 2: Vessel Map Coordinator (Tactical Map)
#### 1. Purpose of the Page
A high-precision, interactive spatial tracking environment displaying geographic locations, vectors of movement, historical trails, and marine protection boundaries.

#### 2. Target User
Geofence dispatch teams, coast guard intercept pilots, and naval patrol navigators.

#### 3. Information Displayed
*   **Primary Map Canvas:** Interactive Leaflet GIS map with customized tilesets that sync with theme settings:
    *   **Light Mode:** CARTODB Light Matter Tiles.
    *   **Dark Mode (Default):** CARTODB Dark Matter tactical tiles.
*   **Overlay Layers:**
    *   *Restricted-Zone Polygons:* Color-coded dashed geofences showing restricted maritime regions.
    *   *Vessel Markers:* Triangle shapes pointing towards the vessel's course heading, color-coded by threat level. High-risk markers display a pulsing indicator ring behind them.
    *   *Movement Trails:* Line strings showing historical coordinates connected by a colored track.
*   **Interactive Map Popup:** Detailed bubble shown when clicking a vessel marker containing:
    *   Vessel Name, MMSI registration number, Speed (in knots and km/h), Heading (azimuth and cardinal direction), Flag state, active Status, and custom alert warnings if violated.
*   **Sidebar Controller Panel:**
    *   Search filter bar.
    *   Vessel select grid listing names and active threat ratings.
    *   Geofence Zone checklist with quick focus action triggers.
    *   Toggle Switch for drawing all historical trails or only the selected vessel's path.

#### 4. Components Used
*   Tactical Vessel Map Screen (`VesselMapView.tsx`)
*   Vessel Leaflet Handler (`VesselMap.tsx`)
*   Sidebar controls & interactive checkboxes.

#### 5. Data Required
*   Vessels array, alerts list, marine restricted polygons coordinates, and movement sequences (`mockMovements`).

#### 6. Navigation Behaviour
*   Clicking **"Launch Intel Briefing Dossier"** button inside the vessel popup box directly navigates the user to the `Incident Reports` view with that vessel loaded into the drafting suite.
*   Selecting a vessel in the map controller list automatically pans and zooms the map to center on that vessel location.

#### 7. User Flow
1.  Tactical Operator switches to the **Vessel Map** view.
2.  Operator toggles on the **"Show All Historical Trails"** switch to visually audit regional sailing patterns.
3.  Operator detects a track crossing into the "Malaysia Marine Sanctuary Core-2" restricted geofence.
4.  Operator clicks on the vessel marker (`Tanker Neptune`).
5.  Operator views speed anomaly warning inside the popup and clicks **"Launch Intel Briefing Dossier"** to draft a prosecution warning.

---

### VIEW 3: Vessel Spec Profiles (Detail Page)
#### 1. Purpose of the Page
A detailed specification worksheet displaying technical machinery facts, complete port logistics, speed trend logs, and chronological alert lists for a single vessel.

#### 2. Target User
Harbor masters, boardings planners, and customs auditing inspectors.

#### 3. Information Displayed
*   **Vessel Profile Identification Banner:** Vessel Name, Risk level badge, MMSI, and Hull category classification.
*   **Vessel Registry Specs Grid:** Core details including Registry State Flag, Threat Score, Telemetry status, active course Azimuth, exact speed (kn/km/h), Reported Destination, Estimated ETA, Length, and Width.
*   **Chronological Satellite Reporting Table:** Stream logs listing historically verified coordinate timestamps, latitude/longitude plots, speeds, and course head headings.
*   **Vessel Anomaly Chronological Timeline:** Stream feed showing all alarm alerts generated for this ship.
*   **Surveillance Action Center:** Interactive buttons allowing simulated radio actions to be executed.

#### 4. Components Used
*   Vessel Specifications Viewer Module (`VesselDetailView.tsx`)
*   Tactical Actions Console
*   Tabular coordinates tracking widget.

#### 5. Data Required
*   Vessel specs metadata object, coordinate history logs matching the active ID, and filtered warnings lines.

#### 6. Navigation Behaviour
*   Clicking the **"Back Arrow"** button returns the user to the view they occupied before accessing the detail page.
*   Selecting a different ship in the **"Toggle Subject"** dropdown updates the specs page instantly with the new vessel's data.

#### 7. User Flow
1.  Auditor navigates to **Vessel Profiles**.
2.  Auditor selects `Bluefin V` from the dropdown selector.
3.  Auditor reviews the Registry Specifications and notices the vessel type is `Fishing Trawler` but the historical speeds in the coordinates list are unusually fast for standard trawling patterns.
4.  Auditor reviews the linked alerts feed listing `Fishing-like Movement`.
5.  Auditor clicks **"VHF Radio Warning Hail"** to signal the ship.
6.  Auditor flags the vessel for a routine customs boarding.

---

### VIEW 4: Alert Center (Intelligence Dispatch Desk)
#### 1. Purpose of the Page
Centralized operational queue to monitor active safety violations, audit sensor details, and permanently archive resolved events with formal investigation logs.

#### 2. Target User
Watch commanders and systems auditing officers on active duty.

#### 3. Information Displayed
*   **Header Stats Counters:** High Threats counter, Medium Risks counter.
*   **Filter Matrix:**
    *   Search input field (filters by Vessel name, alert description, or Alarm ID).
    *   Severity dropdown filter.
    *   Review Status dropdown filter (Active, Under Review, Resolved).
    *   Anomaly Event Type dropdown filter.
*   **Alert Queue Table Columns:**
    *   `Alarm ID`
    *   `Subject Vessel` (Hyperlinked name)
    *   `Anomaly Event Type`
    *   `Trigger Time` (UTC)
    *   `Severity Badge`
    *   `SOP Action Guidelines`
    *   `Status Badge`
    *   `Operational Actions` (Controls column)
*   **Resolve Alarm Overlay Modal:** Dialog displayed when resolving an alert to collect the reviewer's signature and formal resolution logs.

#### 4. Components Used
*   Alert Center Module (`AlertManagementView.tsx`)
*   Interactive Filtering Fields
*   Investigative Resolve Modal Form

#### 5. Data Required
*   `alerts[]` array, `vessels[]` array, and function pointer hooks (`onModifyAlertStatus`).

#### 6. Navigation Behaviour
*   Clicking any cyan Vessel name hyperlink navigates directly to that vessel's specs profile page within **Vessel Profiles**.

#### 7. User Flow
1.  Officer enters the **Alert Center** to clear pending alarms.
2.  Officer identifies `AL-091` assigned to `Bluefin V` with `Active` status.
3.  Officer clicks **"Audit"**, which updates the status indicator to `Under Review`.
4.  Officer reviews ship telemetry and confirms it has departed the restricted zone.
5.  Officer clicks **"Resolve"** on the row, opening the investigation notes modal.
6.  Officer enters their signature (`Officer Miller`) and reasons (`Verified master manifests; detour weather exception allowed`).
7.  Officer clicks **"Force Archive Resolved"**. The alert status transitions to `Resolved` and displays a closed badge.

---

### VIEW 5: Incident Reports (Dossier Deck)
#### 1. Purpose of the Page
Interactive environment to organize, draft, analyze, and compile high-level intelligence reports utilizing automatic analysis across Seven (7) AI Agents. It exports compiled dossiers under formal digital signatures.

#### 2. Target User
Command analysts and legal prosecution officers drafting regulatory safety documents.

#### 3. Information Displayed
*   **Classified Stamp Indicator:** `CONFIDENTIAL // SEAGNAL NET` (Displays as a slanted security warning mark in red).
*   **Document Header block:** System ID block, Revision records, Subject name, and MMSI hash.
*   **Four (4) Core Telemetry Snapshots:** Threat score index, raw lat/lng snapshot, Velocity/bearing knots readout, and AIS ping status.
*   **AI Compound Agent Console:** Displaying status grids for Seven (7) AI Agents with detailed live execution log terminals for each.
*   **Official AI Generated Summary Briefing:** Explains the core risk findings.
*   **Prosecution Officer Notes Area:** Rich text drafting field where analysts write log details.
*   **Target Interdict Directive:** Specific operational procedures recommended by the system.

#### 4. Components Used
*   Dossier Drafting View (`IncidentReportView.tsx`)
*   Agent Grid Buttons Matrix
*   Terminal Log Stream panel
*   Officer drafting text editor area.

#### 5. Data Required
*   Vessels array metadata, AI agents logging schemas, and active drafts database storage object.

#### 6. Navigation Behaviour
*   Clicking **"Vessel Specs Profile"** redirects the browser to the details parameters panel.
*   Selecting folders in the active **"Briefing Subject"** dropdown switches the entire dossier subject instantly.

#### 7. User Flow
1.  Commanding Analyst opens **Incident Reports**.
2.  Analyst selects `Tanker Neptune` as the primary briefing subject.
3.  Analyst reviews the active subprocess console logs generated by the AI Agents.
4.  Analyst writes detailed prosecution logs inside the **Officer Prosecution Logs** text panel.
5.  Analyst clicks **"Commit Logs"** to save the drafting text securely.
6.  Analyst clicks **"Export Secure Dossier"**. A success toast is displayed with the file PDF download name under digital signature verification.

---

### VIEW 6: System Configuration (Tuning Controls)
#### 1. Purpose of the Page
Allows systems administrators to fine-tune the parameters, safety ranges, and automatic classification buckets utilized by Seagnal AI radar networks.

#### 2. Target User
Systems administrators and senior technical engineering leads.

#### 3. Information Displayed
*   **AIS Threshold Range Slider:** Adjusts the interval limits required before system flags an AIS gap hazard alert (Hours tracking, 0.5hr - 12hr range).
*   **High Risk and Medium Risk Threshold inputs:** Adjusts risk classification boundary scores.
*   **SOP Geofence Evaluation Logic rules editor:** An editable rules text block parsed by the AI compiler system.
*   **Surveillance Beacon Switch Toggles:** Toggles for terminal sounds, satellite geofencing algorithms, and intruder auto-escalation programs.
*   **Save Controls Panel:** Option triggers to apply tuning parameters or restore platform defaults.

#### 4. Components Used
*   Settings Panel (`SettingsView.tsx`)
*   Forms fields with customized HTML range sliders and toggles.

#### 5. Data Required
*   Active configuration settings structure (`PlatformSettings` object).

#### 6. Navigation Behaviour
*   Submission triggers a visual execution success notification card confirming parameters have successfully synchronized with operations servers.

#### 7. User Flow
1.  System Engineer opens **System Settings**.
2.  Engineer wants to flag AIS gaps sooner due to severe weather.
3.  Engineer drags the **AIS Signal Interval Limit Gap** slider from `1.5` down to `1.0` hour limits.
4.  Engineer changes the **High-Risk Threat Limit** input value from `75` to `70`.
5.  Engineer clicks **"Apply Platform Tuning"**.
6.  The system save status displays a green success confirmation block indicating updates have been successfully deployed.

---

## SECTION 3: SYSTEM INTERACTIVE CONTROLS SPECIFICATIONS
This section defines every clickable UI button, status classification, filter, card, and map detail displayed within the application.

### 1. ACTION COMPONENT INTERPRETATION TABLE

#### A. GLOBAL SIDEBAR ACTIONS
| Component Label | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard Menu Button** | Navigate to dashboard summary. | Updates visual active tab class. | `dashboard` view | None | Always enabled |
| **Vessel Map Menu Button** | Navigate to interactive map coordinator. | Updates visual active tab class. | `map` view | None | Always enabled |
| **Vessel Profiles Menu Button**| Navigate to profiles specs sheet. | Updates visual active tab class. | `vessels` view | None | Always enabled |
| **Alert Center Menu Button** | Navigate to intelligence alerts table. | Updates visual active tab class. | `alerts` view | None | Always enabled |
| **Incident Reports Menu Button**| Navigate to briefing drafting logs. | Updates visual active tab class. | `incident-reports` view | None | Always enabled |
| **System Settings Menu Button**| Navigate to platform tuning form. | Updates visual active tab class. | `settings` view | None | Always enabled |

#### B. DASHBOARD WORKSPACE ACTIONS
| Button Label / Metric Card | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Launch Tactical Map Coordinator** | Quick-launch map view. | Navigates to full map coordinator. | `map` view | None | Always enabled |
| **Monitored Vessels Card** | Displays count of active hulls. | Visually highlights vessel total metric. | None | None | Always active |
| **High Risk Vessels Card** | Displays count of critical threats. | Warning highlights focus. | None | None | Always active |
| **Active Alerts Card** | Displays count of active alarms. | Alerts status focus. | None | None | Always active |
| **AIS Gaps Detected Card** | Displays transponder signal loss counts. | Signal loss failure index. | None | None | Always active |
| **Zone Violations Card** | Displays spatial geofence intrusions. | Zone crossing index. | None | None | Always active |
| **Search Vessel Input** | Query registry hulls by name or MMSI. | Updates matching registry records. | None | None | Active input |
| **Risk Level Selector** | Filters table grid by threat classification. | Filters active list dynamically. | None | None | Select dropdown active |
| **Vessel Type Selector** | Filters table grid by hull cargo classification. | Filters active list dynamically. | None | None | Select dropdown active |
| **View Button** *(Registry Table)* | Access detailed target specs. | Swaps active component view. | `vessels` view | None | Enabled for row |

#### C. TACTICAL VESSEL MAP COORDINATOR ACTIONS
| UI Control / Toggle | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Show All Historical Trails** | Toggles GPS coordinate lines on map. | Renders trails for all hulls or selected. | None | Leaflet Layer state | Toggle control active |
| **Vessel Selector Drawer Item** | Quick focus on target map location. | Pans map view and opens popup bubble. | None | Leaflet coordinates | Enabled when clicked |
| **Geofence Zone Item Checkbox** | Multi-select spatial outlines. | Toggles visibility of warning polygons. | None | Leaflet polygons | Checkbox control |
| **Tactical Specs Dossier** *(Popup)* | Launch details panel. | SWAPs view to vessel specs instantly. | `vessels` view | Selected vessel parameter | Enabled on marker popup |

#### D. ALERT CENTER DESK ACTIONS
| Button Label / Filter Widget | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Audit Button** | Mark an active alert as being assessed. | Status indicator badge turns warning yellow. | None | `alert.status` to `'Under Review'` | Active when alert status is `'Active'` |
| **Resolve Button** | Open notes resolution dialog. | Displays the resolving modal component. | None | Temporary modal focus | Alert status is not `'Resolved'` |
| **Force Archive Resolved** *(Modal)* | Submit investigation logs. | Archives threat, closes ticket permanently. | None | `alert.status` to `'Resolved'` | Requires notes text field input filled |
| **Abort Button** *(Modal)* | Close resolve dialog. | Dismisses modal without saving. | None | Modal state | Active inside resolve modal |
| **Vessel Name Hyperlink** *(Grid)*| Quick spectating profile redirection. | Redirects view. | `vessels` view | Selected vessel parameter | Clickable link |

#### E. INCIDENT DOSSIER DRAFT ACTIONS
| Component Label | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Briefing Subject Dropdown** | Switch report focus. | Changes entire dossier data metrics. | None | Active draft selection | Dropdown select items |
| **AI Agent Tab Button** *(Agent ID)* | Focus specific subprocess terminal logs. | Content switches to focused agent log history. | None | Selected agent focus state | Always active |
| **Officer Prosecution Log Area** | Enter investigation notes. | Stores draft logs in state. | None | Notebook draft object | Enabled typing |
| **Commit Logs Button** | Save officer’s logs. | Saved check-mark indicator appears. | None | Updates mock database state | Notes modified |
| **Vessel Specs Profile Button** | Check technical specification details. | Switches active workspace view. | `vessels` view | Pre-selects active vessel ID | Always active |
| **Export Secure Dossier Button** | High-precision PDF export simulation. | Initiates compilation loader, shows success toast. | None | System export logs | Operational compilation |

#### F. SYSTEM CONFIGURATION ACTIONS
| Parameter Control / Button | Purpose | Resulting Event | Navigation Target | Data Mutated | Enabled Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AIS Signal Limit Slider** | Adjust telemetry absence threshold bounds. | Updates gap hour limits text badge. | None | Settings configuration parameters | Slider dragged |
| **High-Risk Threat Limit Input** | Adjust High threat boundary bracket. | Updates numeric boundary state. | None | Settings configuration parameters | Int input changed |
| **Medium-Risk Limit Input** | Adjust Medium threat boundary bracket. | Updates numeric boundary state. | None | Settings configuration parameters | Int input changed |
| **SOP Geofence Area** | Modify SOP guidelines guidelines parsing logic. | Stores text rule inside settings draft. | None | System rule parameters | Text typed |
| **Terminal Sound Switch Toggle** | Toggle audio alerts. | Toggles trigger audio flag status. | None | Audio surveillance trigger status | Click toggle |
| **Satellite Geofence Switch Toggle**| Toggle vector geofence scan engine. | Toggles active polygon matching code. | None | Geofence match trigger status | Click toggle |
| **Intruder Escalation Switch Toggle**| Toggle auto patrol dispatch queues. | Toggles escalation timers code. | None | Escalation queue status | Click toggle |
| **Apply Platform Tuning Button** | Commit parameters to active radar system. | Displays a success toast, saves settings object. | None | Global `settings` profile | Form submit |
| **Restore Factory Settings Button** | Restore system config to standard defaults. | Reverts values back to preset factory values. | None | Settings configuration defaults | Enabled click |

---

## SECTION 4: THREAT IDENTIFICATION & RADAR MAP SPECIFICATION

### 1. Vessel Marker Threat Classifications
Vessels and active alerts are prioritized based on their calculated **Threat Score Index (0-100)**:
*   **HIGH RISK THREAT / PRIORITY Watch:**
    *   *System Score Range:* Score $\ge 75$ (Adjustable in Settings).
    *   *Theme Color Representation:* Dark-Mode: High-Contrast Coral Rose Red (`rose-500` - `#f43f5e`) // Light-Mode: Deep Crimson Red.
    *   *Visual Marker Effect:* Marker utilizes an outer pulsing ring representation to capture immediate focus on the tactical layout.
    *   *Maritime Interpretation:* Vessel represents a serious anomaly violation (e.g., restricted military zone penetration or severe AIS signal blackout period in defense channels). Immediate dispatch of patrol units recommended.
*   **MEDIUM RISK THREAT / ANOMALY WATCH:**
    *   *System Score Range:* $40 \ge$ Score $< 75$ (Adjustable in Settings).
    *   *Theme Color Representation:* Amber-Yellow (`amber-500` - `#f59e0b`).
    *   *Visual Marker Effect:* Static bold colored triangle pointing to heading direction of course.
    *   *Maritime Interpretation:* Potential safety deviations detected (e.g., atypical movement trajectories on course such as looping or slow circular drifting pattern indicative of illegal unreported commercial fishing operations). Monitoring required.
*   **LOW RISK / NOMINAL CLASS STATUS:**
    *   *System Score Range:* Score $< 40$.
    *   *Theme Color Representation:* High-Contrast Marine Cyan (`cyan-400` - `#22d3ee`).
    *   *Visual Marker Effect:* Sleek sharp cyan directional pointer.
    *   *Maritime Interpretation:* Nominal transit parameters. Normal courses. Fully operational AIS telemetry signals transmitting. Standard commercial voyage reporting.

### 2. Geofence Restricted Zones Polygons
Restricted areas are rendered on Leaflet as colored dashed polygons:
*   **Red Dashed Polygons:** Restricted Military Training Outposts and Naval Defense Sectors.
*   **Yellow/Amber Dashed Polygons:** Eco-Marine Sanctuaries, vulnerable coral reefs, and exclusive preservation marine parks.

### 3. AIS Blackout Detection (AIS Gap)
When a vessel's telemetry transponder transmission interval exceeds the standard limit threshold (defaulting to 1.5 hours), the status is flagged as `"AIS Gap"`. The marker remains anchored at the last known radar return coordinate but represents a dotted track line indicating coordinate telemetry drop.

---

## SECTION 5: REAL-TIME DATA SOURCE & FUTURE INTEGRATIONS GRAPH

This structural mapping layout represents the active mock variables utilized inside the operational frontend, and documents their planned migrations to cloud-hosted BigQuery tables, Google Maps Platform APIs, and secure server-side telemetry processors.

| Page / Workspace View | UI Element Name | Active Screen Text | Interactive Function | User Input / Action | Current Mock Data Source | Planned Production BigQuery Table / API Endpoint | Target View Destination |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Tactical Coordinator Map | `Launch Tactical Map Coordinator` | Swaps view. | Click button. | Local View-State manager | N/A (Client-only swap) | `Vessel Map` view |
| **Dashboard** | Total Vessels Counter | `Monitored Vessels` | Displays live telemetry sum count. | Spectate metric. | `vessels.length` | `SELECT COUNT(MMSI) FROM bq_dataset.live_ais_transponder_logs` | Static display |
| **Dashboard** | Threats Registry Table | `Active Vessel Operations Registry` | List, search, and dynamic risk type filtering. | Search input typing, select filters. | `mockVessels[]` array from memory | `GET /api/vessels?search={q}&risk={lvl}&type={t}` via Google Cloud SQL PostgreSQL database | Detail specifications view upon clicking "View" |
| **Vessel Map** | Interactive Map base | CARTODB Tiles | Spatial overlay rendering. | Zoom / Drag. | Leaflet library standard | Google Maps API Platform (or Custom Tileservers) | Map viewport |
| **Vessel Map** | Informational Popup box | `MMSI Hash:` / `Hull Type:` / `Speed:` | Reveals detailed spec summary when clicking markers. | Click marked targets on Leaflet. | `vessel` object properties | `GET /api/vessels/{id}/telemetry` | Profile specs panel upon clicking "Specs" |
| **Vessel Profiles**| Tech Specifications Card| `Vessel Registry Specs` | Display detailed mechanical properties parameters. | Select subject drop-downs. | `mockVessels[]` selected property item | `bq_dataset.vessel_registry_profiles` (Official Lloyd's List marine data catalog) | Profiles list viewport |
| **Vessel Profiles**| Tactical Actions Cluster | `VHF Radio Warning Hail` / `Navy Intercept Request` | Simulates Operations Room communications. | Click action buttons. | Temporary state trigger (displays action confirmation toast notice) | `POST /api/integrations/tactical-dispatch` (Fires encrypted REST payload to Maritime Defense Command API) | Static notification prompt |
| **Alert Center** | Alarm Management Table | `Alarm ID` / `Subject Vessel` / `SOP Guidelines` | Audits, transitions, and resolves pending logs. | Click "Audit" or click "Resolve" triggers modal. | `mockAlerts[]` array state | `bq_dataset.security_incident_violations` via `/api/alerts/{id}/resolve` | Standard center workspace |
| **Incident Reports**| Compound Agent Matrix | `Maritime Orchestrator Agent` / `Vessel Movement Agent` | Renders individual subprocess agent diagnostics logs. | Click agent button tabs. | `aiAgents[]` array configuration properties | Vertex AI / Gemini LLM multi-agent telemetry orchestration pipeline logs | Live terminal stdout display |
| **Incident Reports**| Officer Journal Draft | `Officer Prosecution Logs` | Compose investigation logs. | Type notes inside raw text panel. | `officerNotes[]` KV storage objects | `bq_dataset.patrol_incident_dossiers` via `POST /api/reports/save-notes` | Local cache sync |
| **Incident Reports**| Secure Export Controller | `EXPORT SECURE Dossier` | Export declassified compiled incident documents. | Click PDF compile. | Client compilation loader | Server-side Puppeteer PDF generator API route | Success toast indicator prompts |
| **System Settings**| Tuning Controller Panel | `PLATFORM TRIGGER CONFIGURATION` | Fine-tune calculations, alarm thresholds, and SOP codes. | Handle sliders, inputs, rules, and switches. | `settings` memory states | Cloud SQL Settings Table via `PUT /api/settings/tuning` | Settings save confirmation banner |

---

## SECTION 6: DESIGN INTEGRITY & POLISH STANDARDS
This frontend is hand-crafted with **Desktop-First Precision** and structured with strict boundaries that eliminate typical clutter and artificial developer placeholders:
1.  **No Mock Infrastructure Log Clutter:** Displays real-time calculations directly derived from real telemetry equations. There are no placeholder codes (such as `CORE_NODE_ONLINE` or `PORT: 3000`) placed in borders, rails, or footer blocks.
2.  **No Unsolicited Theme Selection toggles:** Chooses a singular, highly refined high-contrast slate-dark Operations Center theme, keeping administrative focus simple and clean.
3.  **Human Literal Labeling:** UI components utilize descriptive, professional, of-the-shelf nomenclature (e.g. "Incident Intelligence Dossier Deck", "Vessel Specification Profiles", "Intelligence Dispatch Desk"). Overly dramatic or sci-fi labels are avoided to preserve professional integrity.
4.  **Touch Target Standards:** Every interactive grid command control, map tab button, filter selector dropdown, and action item spans a minimum height target size of `44px` with transition micro-animations to ensure usability in real operations environments.
