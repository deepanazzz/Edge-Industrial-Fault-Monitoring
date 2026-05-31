from flask import Flask, render_template, jsonify
import random
import math
import time
from datetime import datetime

app = Flask(__name__)

# Simulated state
state = {
    "fault": False,
    "fault_count": 0,
    "start_time": time.time(),
    "history": [],
}

def generate_vibration_data():
    """Simulate vibration readings. Randomly inject faults."""
    t = time.time()

    # Every ~15 seconds, randomly decide if fault occurs
    fault_chance = random.random()
    if fault_chance < 0.15:
        state["fault"] = True
    elif fault_chance > 0.85:
        state["fault"] = False

    if state["fault"]:
        state["fault_count"] += 1
        rms = round(random.uniform(2.8, 4.5), 3)
        x = round(random.uniform(-3.5, 3.5), 3)
        y = round(random.uniform(-3.5, 3.5), 3)
        z = round(random.uniform(7.5, 11.0), 3)
        severity = round(random.uniform(65, 95), 1)
        spikes = random.randint(4, 9)
    else:
        rms = round(random.uniform(0.1, 0.6), 3)
        x = round(random.uniform(-0.4, 0.4), 3)
        y = round(random.uniform(-0.4, 0.4), 3)
        z = round(random.uniform(9.6, 10.2), 3)
        severity = round(random.uniform(5, 25), 1)
        spikes = random.randint(0, 1)

    now = datetime.now()
    entry = {
        "timestamp": now.strftime("%H:%M:%S"),
        "rms": rms,
        "x": x,
        "y": y,
        "z": z,
        "fault": state["fault"],
        "severity": severity,
        "spikes": spikes,
        "lora_rssi": random.randint(-110, -65),
        "lora_snr": round(random.uniform(3.0, 9.5), 1),
        "packets_sent": state["fault_count"] + random.randint(10, 30),
        "uptime": int(time.time() - state["start_time"]),
    }

    state["history"].append(entry)
    if len(state["history"]) > 30:
        state["history"].pop(0)

    return entry

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/data")
def data():
    current = generate_vibration_data()
    history = state["history"][-20:]
    return jsonify({
        "current": current,
        "history": {
            "timestamps": [h["timestamp"] for h in history],
            "rms": [h["rms"] for h in history],
            "x": [h["x"] for h in history],
            "y": [h["y"] for h in history],
            "z": [h["z"] for h in history],
            "severity": [h["severity"] for h in history],
        },
        "fault_count": state["fault_count"],
        "uptime": int(time.time() - state["start_time"]),
    })

@app.route("/reset")
def reset():
    state["fault"] = False
    state["fault_count"] = 0
    state["start_time"] = time.time()
    state["history"] = []
    return jsonify({"status": "reset"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
