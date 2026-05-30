from flask import Flask, render_template, jsonify
import random
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/data")
def data():

    fault = random.random() > 0.7

    if fault:
        rms = round(random.uniform(13,18),2)
        spike = round(random.uniform(65,90),1)
        severity = round(random.uniform(70,95))
        status = "FAULT"
    else:
        rms = round(random.uniform(6,10),2)
        spike = round(random.uniform(30,50),1)
        severity = round(random.uniform(10,40))
        status = "NORMAL"

    return jsonify({
        "rms": rms,
        "spike": spike,
        "severity": severity,
        "status": status,
        "time": datetime.now().strftime("%H:%M:%S")
    })

if __name__ == "__main__":
    app.run(debug=True)