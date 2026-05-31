// ── GAUGE DRAWING ───────────────────────────────────────────────────────────
function drawGauge(canvasId, value, max, label, colorStart, colorEnd) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H * 0.72;
  const r  = W * 0.36;
  const startAngle = Math.PI * 0.75;
  const endAngle   = Math.PI * 2.25;
  const pct = Math.min(value / max, 1);
  const fillAngle = startAngle + pct * (endAngle - startAngle);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = "rgba(46,38,69,0.9)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  // Fill gradient
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0, colorStart);
  grad.addColorStop(1, colorEnd);

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, fillAngle);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  // Needle dot
  const nx = cx + r * Math.cos(fillAngle);
  const ny = cy + r * Math.sin(fillAngle);
  ctx.beginPath();
  ctx.arc(nx, ny, 5, 0, Math.PI * 2);
  ctx.fillStyle = colorEnd;
  ctx.fill();

  // Value text
  ctx.fillStyle = "#e8e0f5";
  ctx.font = `bold 16px 'Space Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value.toFixed(1), cx, cy - 4);

  // Unit label
  ctx.fillStyle = "#7a6fa0";
  ctx.font = `9px 'DM Sans', sans-serif`;
  ctx.fillText(label, cx, cy + 14);
}

// ── MINI BAR CHART (RMS history) ─────────────────────────────────────────────
let rmsChart = null;
let severityChart = null;

function initCharts() {
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    elements: { line: { tension: 0.45, borderWidth: 1.5 }, point: { radius: 0 } },
    scales: {
      x: {
        ticks: { color: "#7a6fa0", font: { family: "'Space Mono'", size: 8 }, maxTicksLimit: 6 },
        grid: { color: "rgba(46,38,69,0.6)" },
      },
      y: {
        ticks: { color: "#7a6fa0", font: { family: "'Space Mono'", size: 8 }, maxTicksLimit: 4 },
        grid: { color: "rgba(46,38,69,0.6)" },
      }
    }
  };

  // RMS chart
  const rmsCtx = document.getElementById("rmsChart").getContext("2d");
  const rmsGrad = rmsCtx.createLinearGradient(0, 0, 0, 130);
  rmsGrad.addColorStop(0, "rgba(176,106,255,0.3)");
  rmsGrad.addColorStop(1, "rgba(176,106,255,0)");

  rmsChart = new Chart(rmsCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: "#b06aff",
        backgroundColor: rmsGrad,
        fill: true,
      }]
    },
    options: { ...chartDefaults }
  });

  // Severity chart
  const sevCtx = document.getElementById("severityChart").getContext("2d");
  const sevGrad = sevCtx.createLinearGradient(0, 0, 0, 130);
  sevGrad.addColorStop(0, "rgba(255,77,184,0.3)");
  sevGrad.addColorStop(1, "rgba(255,77,184,0)");

  severityChart = new Chart(sevCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: "#ff4db8",
        backgroundColor: sevGrad,
        fill: true,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: {
          ...chartDefaults.scales.y,
          min: 0, max: 100
        }
      }
    }
  });
}

function updateCharts(history) {
  const labels = history.timestamps;

  rmsChart.data.labels = labels;
  rmsChart.data.datasets[0].data = history.rms;
  rmsChart.update("none");

  severityChart.data.labels = labels;
  severityChart.data.datasets[0].data = history.severity;
  severityChart.update("none");
}

// ── AXIS BARS ────────────────────────────────────────────────────────────────
function updateAxisBar(id, fillId, valId, val, max, color) {
  const pct = Math.min(Math.abs(val) / max * 100, 100);
  document.getElementById(fillId).style.width = pct + "%";
  document.getElementById(fillId).style.background = color;
  document.getElementById(valId).textContent = val.toFixed(3);
}

// ── ALERT LOG ────────────────────────────────────────────────────────────────
const alertLog = [];
function addAlert(msg, type, time) {
  alertLog.unshift({ msg, type, time });
  if (alertLog.length > 20) alertLog.pop();
  const container = document.getElementById("alertLog");
  container.innerHTML = alertLog.map(a => `
    <div class="alert-item ${a.type === 'fault' ? 'fault-item' : 'ok-item'}">
      <span class="alert-icon">${a.type === 'fault' ? '⚠️' : '✅'}</span>
      <div class="alert-text">
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>
  `).join("");
}

// ── UPTIME FORMATTER ──────────────────────────────────────────────────────────
function formatUptime(s) {
  const h = Math.floor(s / 3600).toString().padStart(2,"0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2,"0");
  const sec = (s % 60).toString().padStart(2,"0");
  return `${h}:${m}:${sec}`;
}

// ── MAIN POLL LOOP ────────────────────────────────────────────────────────────
let prevFault = null;

async function fetchData() {
  try {
    const res = await fetch("/data");
    const json = await res.json();
    const d = json.current;

    // Status pill
    const pill = document.getElementById("statusPill");
    if (d.fault) {
      pill.className = "status-pill fault";
      pill.innerHTML = `<span class="dot"></span> FAULT DETECTED`;
    } else {
      pill.className = "status-pill normal";
      pill.innerHTML = `<span class="dot"></span> NORMAL`;
    }

    // Alert log on state change
    if (prevFault !== d.fault) {
      if (d.fault) addAlert(`Fault detected — RMS ${d.rms} g`, "fault", d.timestamp);
      else         addAlert(`System returned to normal`, "ok", d.timestamp);
      prevFault = d.fault;
    }

    // Metric cards
    document.getElementById("valRMS").textContent      = d.rms.toFixed(3);
    document.getElementById("valSeverity").textContent = d.severity.toFixed(1);
    document.getElementById("valSpikes").textContent   = d.spikes;
    document.getElementById("valFaults").textContent   = json.fault_count;

    // Uptime
    document.getElementById("uptimeLabel").textContent = formatUptime(json.uptime);
    document.getElementById("sideUptime").textContent  = formatUptime(json.uptime);
    document.getElementById("sideFaults").textContent  = json.fault_count;
    document.getElementById("sideRSSI").textContent    = d.lora_rssi + " dBm";

    // Gauges
    const rmsColor    = d.fault ? "#ff4f6b" : "#b06aff";
    const rmsColorEnd = d.fault ? "#ff4db8" : "#7b4fff";
    drawGauge("gaugeRMS",      d.rms,      5,   "g",    rmsColor, rmsColorEnd);
    drawGauge("gaugeSeverity", d.severity, 100, "%",   "#ff4db8", "#ffd166");
    drawGauge("gaugeSNR",      d.lora_snr, 10,  "dB",  "#3dffa0", "#b06aff");

    // Axis bars
    updateAxisBar("axisX","fillX","valX", d.x, 5, "#b06aff");
    updateAxisBar("axisY","fillY","valY", d.y, 5, "#ff4db8");
    updateAxisBar("axisZ","fillZ","valZ", d.z, 15,"#3dffa0");

    // LoRa stats
    document.getElementById("loraRSSI").textContent    = d.lora_rssi;
    document.getElementById("loraSNR").textContent     = d.lora_snr;
    document.getElementById("loraPackets").textContent = d.packets_sent;

    // Charts
    updateCharts(json.history);

  } catch(e) {
    console.error("Fetch error:", e);
  }
}

async function resetSystem() {
  await fetch("/reset");
  alertLog.length = 0;
  document.getElementById("alertLog").innerHTML = "";
  prevFault = null;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  fetchData();
  setInterval(fetchData, 1500);

  document.getElementById("resetBtn").addEventListener("click", resetSystem);
});
