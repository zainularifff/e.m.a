import worldtechLogoColor from "../assets/logo-worldtech-color.png";
import npointsLogo from "../assets/npoints-logo.png";

type ReportPayload = any;
type ReportFilters = any;

type SignalRow = {
  signal: string;
  status: string;
  reading: string;
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function text(value: unknown, fallback = "-", max = 260) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
  return esc(raw.length > max ? `${raw.slice(0, max - 1)}…` : raw);
}

function num(payload: ReportPayload, keys: string[], fallback = 0) {
  for (const key of keys) {
    const raw = payload?.metrics?.[key];
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findSection(payload: ReportPayload, type: string) {
  return (Array.isArray(payload?.sections) ? payload.sections : []).find((section: any) => section?.type === type);
}

function findChartSection(payload: ReportPayload) {
  return (Array.isArray(payload?.sections) ? payload.sections : []).find((section: any) => ["bar", "donut"].includes(section?.type));
}

function metricSummary(payload: ReportPayload) {
  const total = num(payload, ["endpointTotal", "totalEndpoints", "assets"], 0);
  const online = num(payload, ["onlineEndpoints", "online"], 0);
  const offline = num(payload, ["offlineEndpoints", "offline"], Math.max(0, total - online));
  const stale = num(payload, ["staleEndpoints", "stale"], 0);
  const openTickets = num(payload, ["openTickets", "tickets"], 0);
  const sla = num(payload, ["slaBreachCandidates", "slaBreaches", "slaBreached"], 0);
  const software = num(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 0);
  const distinctSoftware = num(payload, ["distinctSoftware", "softwareNames"], 0);
  const score = num(payload, ["operationalScore", "score"], 0);
  const onlineRate = total ? Math.round((online / Math.max(total, 1)) * 100) : num(payload, ["onlineRate"], 0);

  return { total, online, offline, stale, openTickets, sla, software, distinctSoftware, score, onlineRate };
}

function postureStatus(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Monitor";
  if (score >= 40) return "Warning";
  return "Critical";
}

function reachabilityStatus(rate: number) {
  if (rate >= 85) return "Strong";
  if (rate >= 60) return "Watch";
  return `${rate}%`;
}

function telemetryStatus(stale: number) {
  if (stale <= 0) return "Stable";
  if (stale < 10) return "Watch";
  return "Weak";
}

function serviceStatus(sla: number) {
  if (sla > 0) return "Breach Watch";
  return "Controlled";
}

function briefHtml(payload: ReportPayload) {
  const m = metricSummary(payload);
  const intro = payload?.narrative?.executiveSummary;

  if (intro && String(intro).length > 420) {
    return String(intro)
      .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
      .filter(Boolean)
      .slice(0, 5)
      .map((paragraph) => `<p>${text(paragraph, "", 520)}</p>`)
      .join("");
  }

  return `
    <h3>${m.score <= 40 ? "Immediate management attention is required" : "Management monitoring is required"}</h3>
    <p>The current report scope covers <b>${m.total}</b> endpoint(s). <b>${m.online}</b> endpoint(s) are online while <b>${m.offline}</b> are offline or not online, producing a <b>${m.onlineRate}%</b> reachability position. This is the strongest signal in the report because endpoint availability directly affects support visibility, compliance evidence and the ability to execute corrective action.</p>
    <p><b>${m.stale}</b> endpoint(s) have stale or missing last-seen telemetry. Management should treat this as a reporting-confidence issue, not only a technical agent issue, because delayed telemetry can hide ownership gaps, unmanaged devices and outdated inventory evidence.</p>
    <p><b>${m.openTickets}</b> service desk ticket(s) remain open and <b>${m.sla}</b> item(s) appear to have passed SLA due date. The recommended response is to prioritise breached records, validate assignment ownership and rebalance the support queue before the next reporting cycle.</p>
    <p><b>${m.software}</b> software inventory record(s) are available in scope. This provides enough evidence to extend the next review into software governance, licence cleanup, sensitive tools and browser/application exposure once endpoint availability has been stabilised.</p>
  `;
}

function signalRows(payload: ReportPayload): SignalRow[] {
  const m = metricSummary(payload);
  return [
    { signal: "Management Posture", status: postureStatus(m.score), reading: `${m.score}% board score based on availability, SLA exposure and reporting quality.` },
    { signal: "Endpoint Reachability", status: reachabilityStatus(m.onlineRate), reading: `${m.online} online / ${m.offline} offline or not online from ${m.total} endpoint(s).` },
    { signal: "Telemetry Confidence", status: telemetryStatus(m.stale), reading: `${m.stale} endpoint(s) with stale or missing last-seen telemetry.` },
    { signal: "Service Desk Exposure", status: serviceStatus(m.sla), reading: `${m.openTickets} open ticket(s), including ${m.sla} SLA breach candidate(s).` },
    { signal: "Software Visibility", status: m.software ? "Available" : "Limited", reading: `${m.software} software inventory record(s) available for governance and cleanup review.` },
  ];
}

function signalTableHtml(payload: ReportPayload) {
  return `
    <table class="exec-signal-table">
      <thead><tr><th>Signal</th><th>Status</th><th>Management Reading</th></tr></thead>
      <tbody>
        ${signalRows(payload).map((row) => `<tr><td>${text(row.signal, "", 80)}</td><td><b>${text(row.status, "", 40)}</b></td><td>${text(row.reading, "", 180)}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function statusCardsHtml(payload: ReportPayload) {
  const m = metricSummary(payload);
  const cards = [
    { label: "Continuity Risk", value: m.offline > 0 ? "High" : "Low", note: `${m.offline} offline / not online endpoint(s)` },
    { label: "Telemetry Confidence", value: telemetryStatus(m.stale), note: `${m.stale} stale or missing signal(s)` },
    { label: "SLA Exposure", value: m.sla > 0 ? "Action" : "Controlled", note: `${m.sla} breach candidate(s)` },
    { label: "Governance Evidence", value: m.software > 0 ? "Available" : "Limited", note: `${m.software} software record(s)` },
  ];
  return `<div class="exec-status-grid">${cards.map((card) => `<article><span>${text(card.label, "", 40)}</span><strong>${text(card.value, "", 30)}</strong><small>${text(card.note, "", 90)}</small></article>`).join("")}</div>`;
}

function findings(payload: ReportPayload) {
  const m = metricSummary(payload);
  const original = Array.isArray(payload?.narrative?.keyFindings) ? payload.narrative.keyFindings : [];
  const generated = [
    `Endpoint availability is below management comfort level: ${m.online} of ${m.total} endpoint(s) are online and ${m.offline} are offline or not online.`,
    `Telemetry freshness requires clean-up: ${m.stale} endpoint(s) have stale or missing last-seen records, reducing reporting confidence.`,
    `Service desk exposure remains visible: ${m.openTickets} open ticket(s) with ${m.sla} SLA breach candidate(s) need owner validation and escalation tracking.`,
    `The current management score is ${m.score}%, indicating that availability, SLA pressure and data quality must be improved before the estate can be considered healthy.`,
    `Software evidence is available through ${m.software} inventory record(s), enabling follow-up review on licence usage, sensitive tools and application governance.`,
    `${m.total} endpoint record(s) were evaluated with ${m.online} online and ${m.offline} offline/not online.`,
    `${m.openTickets} open ticket(s) are visible, including ${m.sla} SLA breach candidate(s).`,
    `${m.software} software inventory row(s) were found${m.distinctSoftware ? ` across ${m.distinctSoftware} distinct software name(s)` : ""}.`,
  ];
  return [...original, ...generated].filter(Boolean).slice(0, 8);
}

function findingPriority(index: number) {
  if (index < 4) return "High";
  if (index === 4) return "Medium";
  return index === 7 ? "Monitor" : "High";
}

function findingsTableHtml(payload: ReportPayload) {
  return `
    <table class="exec-finding-table">
      <thead><tr><th>No</th><th>Management Finding</th><th>Priority</th></tr></thead>
      <tbody>
        ${findings(payload).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${text(item, "", 260)}</td><td><span>${findingPriority(index)}</span></td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function chartRows(payload: ReportPayload) {
  const chart = findChartSection(payload);
  if (chart?.rows?.length) return chart.rows.slice(0, 6).map((row: any) => ({ label: row.label || row.name || row.status || "Metric", value: Number(row.value ?? row.count ?? row.total ?? 0) }));
  const m = metricSummary(payload);
  return [
    { label: "Online", value: m.online },
    { label: "Offline", value: m.offline },
    { label: "Stale", value: m.stale },
  ];
}

function barsHtml(payload: ReportPayload) {
  const rows = chartRows(payload);
  const max = Math.max(1, ...rows.map((row) => row.value));
  return `<div class="exec-bars">${rows.map((row) => {
    const width = Math.max(5, Math.round((row.value / max) * 100));
    return `<div><strong>${text(row.label, "", 60)}</strong><b>${row.value}</b><i><em style="width:${width}%"></em></i></div>`;
  }).join("")}</div>`;
}

function riskRows(payload: ReportPayload) {
  const risk = findSection(payload, "risk");
  if (risk?.rows?.length) return risk.rows.slice(0, 8);
  const m = metricSummary(payload);
  return [
    { area: "Endpoint availability", severity: "HIGH", finding: `${m.offline} endpoint(s) are currently classified as offline/not online.`, action: "Validate agent health, network access and endpoint ownership." },
    { area: "Telemetry freshness", severity: "HIGH", finding: `${m.stale} endpoint(s) have stale or missing last-seen telemetry.`, action: "Refresh inventory scan and investigate devices with delayed check-in." },
    { area: "Service desk SLA", severity: "HIGH", finding: `${m.sla} open ticket(s) appear to have passed SLA due date.`, action: "Escalate breached SLA records and rebalance support queue." },
    { area: "Data quality", severity: "LOW", finding: "0 device record quality issue(s) were detected.", action: "Clean missing IP, model and site mapping to improve reporting accuracy." },
  ];
}

function decisionTableHtml(payload: ReportPayload) {
  return `
    <table class="exec-decision-table">
      <thead><tr><th>Area</th><th>Severity</th><th>Finding</th><th>Action</th></tr></thead>
      <tbody>
        ${riskRows(payload).map((row: any) => {
          const severity = row.severity || row.priority || "Focus";
          return `<tr><td>${text(row.area || row.title || row.category || "Management Focus", "", 80)}</td><td><span>${text(severity, "", 24)}</span></td><td>${text(row.finding || row.description || row.issue || row.action || "Review this focus area.", "", 160)}</td><td>${text(row.action || row.recommendation || row.nextStep || "Assign owner and track closure.", "", 150)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function actionRows(payload: ReportPayload) {
  const existing = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
  if (existing.length) return existing.slice(0, 8).map((row: any, index: number) => ({
    priority: row.priority || `Priority ${index + 1}`,
    action: row.action || row.recommendation || row.title || row.description || "Review and assign next action.",
    owner: row.owner || row.assignee || row.assignedTo || "Management Team",
    target: row.targetDate || row.dueDate || row.eta || row.timeline || row.status || "Track in next review",
  }));
  const m = metricSummary(payload);
  return [
    { priority: "Priority 1", action: `Assign endpoint owner to review ${m.stale} stale endpoint(s).`, owner: "Management Team", target: "Track in next review" },
    { priority: "Priority 2", action: `Escalate ${m.sla} SLA breach candidate ticket(s).`, owner: "Management Team", target: "Track in next review" },
  ];
}

function actionsTableHtml(payload: ReportPayload) {
  return `
    <table class="exec-action-table">
      <thead><tr><th>Priority</th><th>Action</th><th>Owner</th><th>Target</th></tr></thead>
      <tbody>${actionRows(payload).map((row) => `<tr><td><span>${text(row.priority, "", 40)}</span></td><td>${text(row.action, "", 180)}</td><td>${text(row.owner, "", 80)}</td><td>${text(row.target, "", 80)}</td></tr>`).join("")}</tbody>
    </table>
  `;
}

function metaPeriod(payload: ReportPayload, filters: ReportFilters) {
  return payload?.narrative?.period || payload?.dateRange?.preset || filters?.dateRange || "current month";
}

export function buildExecutiveLegacyReportHtml(payload: ReportPayload, filters: ReportFilters, options: { preview?: boolean; autoPrint?: boolean } = {}) {
  const prepared = formatDateTime(payload?.generatedAt || new Date().toISOString());
  const period = metaPeriod(payload, filters);
  const scope = payload?.narrative?.scope || "all sites";
  const title = "Executive Summary Report";
  const autoPrint = options.autoPrint ? "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>" : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#eef3f8; color:#17233c; font-family:"Aptos","Inter","Segoe UI",Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { width:210mm; min-height:297mm; }
    .exec-pack { width:190mm; margin:0 auto; display:flex; flex-direction:column; gap:6mm; }
    .page-break { page-break-after:always; break-after:page; height:0; }
    .exec-cover { width:190mm; min-height:277mm; position:relative; overflow:hidden; border:1px solid #d9e3f0; border-radius:7mm; background:linear-gradient(135deg,#ffffff 0%,#eaf5f1 100%); padding:13mm; page-break-after:always; }
    .exec-cover::before { content:""; position:absolute; left:-26mm; top:34mm; width:120mm; height:38mm; border-radius:999px; border:10mm solid rgba(24,50,79,.14); transform:rotate(-8deg); }
    .exec-cover::after { content:""; position:absolute; right:-33mm; bottom:-38mm; width:118mm; height:118mm; border-radius:999px; border:13mm solid #0f4f83; box-shadow: inset 0 0 0 5mm #56a446; }
    .logo-card { position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; gap:8mm; background:rgba(255,255,255,.92); border:1px solid #dce6f2; border-radius:6mm; padding:7mm 9mm; box-shadow:0 4mm 18mm rgba(15,35,71,.08); }
    .logo-card img:first-child { max-width:56mm; max-height:22mm; object-fit:contain; }
    .logo-right { display:flex; align-items:center; gap:7mm; }
    .logo-title strong { display:block; font-size:14pt; color:#18324f; line-height:1.05; }
    .logo-title small { display:block; margin-top:1mm; font-size:6pt; color:#708299; text-transform:uppercase; letter-spacing:.25em; font-weight:900; }
    .logo-right img { max-width:38mm; max-height:15mm; object-fit:contain; }
    .cover-title { position:relative; z-index:2; margin-top:42mm; max-width:112mm; }
    .pill { display:inline-flex; align-items:center; height:8mm; padding:0 5mm; border:1px solid #d9e6f4; border-radius:99px; background:rgba(255,255,255,.82); color:#174472; font-size:6.4pt; font-weight:950; letter-spacing:.17em; text-transform:uppercase; }
    .cover-title h1 { margin:10mm 0 5mm; color:#09254a; font-size:31pt; line-height:.98; letter-spacing:-.05em; }
    .cover-title p { max-width:88mm; color:#52647e; font-size:11pt; line-height:1.45; font-weight:760; }
    .cover-meta { position:absolute; left:13mm; right:13mm; bottom:29mm; z-index:2; display:grid; grid-template-columns:repeat(4,1fr); gap:8mm; border-top:1px solid rgba(146,163,184,.45); padding-top:7mm; }
    .cover-meta small, .eyebrow { display:block; color:#73829b; font-size:6pt; font-weight:950; letter-spacing:.22em; text-transform:uppercase; }
    .cover-meta b { display:block; margin-top:2mm; color:#0f2347; font-size:7.5pt; }
    .dots { position:absolute; z-index:1; left:26mm; bottom:45mm; width:20mm; height:20mm; opacity:.22; background:radial-gradient(circle,#94a3b8 1.2mm,transparent 1.4mm); background-size:8mm 8mm; }
    .exec-section { width:190mm; border:1px solid #d9e3f0; border-top:2mm solid #164f7e; border-radius:6mm; background:#fff; padding:8mm; box-shadow:0 3mm 15mm rgba(15,35,71,.05); }
    .section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8mm; border-bottom:1px solid #dce6f2; padding-bottom:3mm; margin-bottom:5mm; }
    .section-head h2 { margin:0; color:#17325d; font-size:18pt; line-height:1.05; letter-spacing:-.04em; }
    .section-head p { margin:1.5mm 0 0; color:#708299; font-size:8.5pt; font-weight:720; }
    .section-head span { min-width:20mm; text-align:center; padding:2mm 4mm; border:1px solid #d8e5f6; border-radius:99px; color:#2563eb; background:#f4f8ff; font-size:6.5pt; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
    .snapshot-grid { display:grid; grid-template-columns:82mm 1fr; gap:8mm; }
    .brief h3 { margin:2mm 0 4mm; color:#15325d; font-size:20pt; line-height:1.05; letter-spacing:-.04em; }
    .brief p { margin:0 0 3.2mm; color:#2d405d; font-size:8.8pt; line-height:1.45; font-weight:760; text-align:justify; }
    table { width:100%; border-collapse:collapse; }
    th { background:#f1f5fb; color:#40516d; text-transform:uppercase; letter-spacing:.14em; font-size:6.1pt; text-align:left; }
    th, td { padding:3mm; border-bottom:1px solid #e0e8f2; vertical-align:top; font-size:7.5pt; line-height:1.35; }
    td { color:#2b405e; font-weight:650; }
    td b { color:#10264b; }
    .exec-status-grid { grid-column:1/-1; display:grid; grid-template-columns:repeat(4,1fr); gap:4mm; margin-top:6mm; }
    .exec-status-grid article { border:1px solid #dce6f2; border-radius:4mm; background:linear-gradient(180deg,#fff,#f8fbff); padding:4mm; min-height:22mm; }
    .exec-status-grid span { display:block; color:#73829b; font-size:6pt; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
    .exec-status-grid strong { display:block; margin:2mm 0 .5mm; color:#17325d; font-size:15pt; line-height:1; }
    .exec-status-grid small { color:#415572; font-size:7pt; font-weight:780; }
    .exec-finding-table td:first-child { width:13mm; text-align:center; }
    .exec-finding-table td:last-child { width:20mm; text-align:center; }
    .exec-finding-table span, .exec-decision-table span, .exec-action-table span { display:inline-flex; align-items:center; justify-content:center; min-height:6mm; padding:0 3mm; border-radius:99px; color:#1d4ed8; background:#eef5ff; font-size:6pt; font-weight:950; text-transform:uppercase; }
    .exec-bars { display:grid; gap:3mm; }
    .exec-bars div { display:grid; grid-template-columns:34mm 14mm 1fr; align-items:center; gap:4mm; }
    .exec-bars strong, .exec-bars b { color:#17325d; font-size:8pt; }
    .exec-bars i { height:5mm; border-radius:99px; background:#eef3f8; overflow:hidden; }
    .exec-bars em { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#164f7e,#56a446); }
    .exec-action-table th:nth-child(2), .exec-action-table td:nth-child(2) { width:48%; }
    @media screen { body { padding:8mm 0; } }
  </style>
  ${autoPrint}
</head>
<body>
  <main class="exec-pack">
    <section class="exec-cover">
      <div class="logo-card">
        <img src="${npointsLogo}" alt="nPoints" />
        <div class="logo-right">
          <div class="logo-title"><strong>EMA<br/>Unified<br/>System</strong><small>Executive & Management</small></div>
          <img src="${worldtechLogoColor}" alt="Worldtech" />
        </div>
      </div>
      <div class="cover-title">
        <span class="pill">Management-ready report pack</span>
        <h1>Executive Summary<br/>Report</h1>
        <p>Overall management view for endpoint, risk, support and compliance.</p>
      </div>
      <div class="cover-meta">
        <div><small>Prepared On</small><b>${esc(prepared)}</b></div>
        <div><small>Scope</small><b>${text(scope, "all sites", 60)}</b></div>
        <div><small>Period</small><b>${text(period, "current month", 60)}</b></div>
        <div><small>Output</small><b>${text(filters?.outputFormat || "PDF", "PDF", 30)}</b></div>
      </div>
      <div class="dots"></div>
    </section>

    <section class="exec-section">
      <div class="section-head"><div><h2>Management Snapshot</h2><p>Management-level operating risk, service continuity and data confidence summary.</p></div><span>Page 2</span></div>
      <div class="snapshot-grid">
        <div class="brief"><span class="eyebrow">Executive Management Brief</span>${briefHtml(payload)}</div>
        ${signalTableHtml(payload)}
        ${statusCardsHtml(payload)}
      </div>
    </section>

    <section class="exec-section">
      <div class="section-head"><div><h2>Key Findings</h2><p>Critical findings are prioritised for management action and review ownership.</p></div><span>Focus</span></div>
      ${findingsTableHtml(payload)}
    </section>

    <section class="exec-section">
      <div class="section-head"><div><h2>Endpoint Health Mix</h2><p>Visual summary rendered as PDF-safe chart rows.</p></div><span>Chart</span></div>
      ${barsHtml(payload)}
    </section>

    <section class="exec-section">
      <div class="section-head"><div><h2>Board Attention Focus</h2><p>Priority management attention items rendered as a proper decision table.</p></div><span>Decision Focus</span></div>
      ${decisionTableHtml(payload)}
    </section>

    <section class="exec-section">
      <div class="section-head"><div><h2>Recommended Actions</h2><p>Follow-up actions generated from current findings.</p></div><span>Action Plan</span></div>
      ${actionsTableHtml(payload)}
    </section>
  </main>
</body>
</html>`;
}
