# Smart Motor Fault Detection Dashboard

A real-time motor monitoring dashboard built with Flask, Chart.js, and Canvas gauges.
Purple/pink dark theme. No scrolling required — everything fits on one screen.

---

## Folder Structure

```
MotorDashboard/
├── app.py                  ← Flask backend + /data API
├── requirements.txt
├── templates/
│   └── index.html          ← Main dashboard page
└── static/
    ├── style.css           ← Purple/pink dark theme
    └── dashboard.js        ← Gauges, charts, live polling
```

---

## Setup Instructions (Raspberry Pi or Laptop)

### Step 1 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 2 — Run the Flask app

```bash
python app.py
```

### Step 3 — Open the dashboard

Open your browser and go to:
```
http://localhost:5000
```

If running on Raspberry Pi and you want to access it from another device on the same WiFi:
```
http://<raspberry-pi-ip>:5000
```

---

## Connecting Real ESP32/STM32 + LoRa Data

The `/data` route in `app.py` currently returns simulated data.

To use real sensor data, replace the `generate_vibration_data()` function with:

```python
import serial
import json

ser = serial.Serial('/dev/ttyUSB0', 9600)  # adjust port

def generate_vibration_data():
    line = ser.readline().decode('utf-8').strip()
    data = json.loads(line)   # ESP32 sends JSON over serial/LoRa
    return data
```

Your ESP32 should send JSON like:
```json
{"rms": 0.35, "x": 0.12, "y": -0.08, "z": 9.81, "fault": false, "severity": 12.5, "spikes": 0}
```

---

## Dashboard Features

- Live RMS vibration metric card
- Fault severity metric card
- Spike count card
- Total fault counter
- 3 semicircle gauges (RMS / Severity / LoRa SNR)
- RMS vibration history line chart
- Fault severity trend chart
- ADXL345 X/Y/Z axis bars
- Live alert log (state-change events)
- LoRa RSSI / SNR / packet stats
- Auto-refreshes every 1.5 seconds
- Reset button to clear session
