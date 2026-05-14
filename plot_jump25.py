#!/usr/bin/env python3
"""Plot Jump 25 Index 1M CSV and save to PNG (no browser needed)."""

import csv, os
import matplotlib
matplotlib.use("Agg")          # non‑interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

FILE = "/home/salmarina/deriv/analisis/Jump 25 Index (1 M).csv"
OUTPUT = "/home/salmarina/deriv/analisis/jump25_plot.png"

date_times, closes = [], []
with open(FILE, newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        dt = datetime.strptime(f"{row['Date']} {row['Time']}", "%Y-%m-%d %H:%M")
        date_times.append(dt)
        closes.append(float(row["Close"]))

fig, ax = plt.subplots(figsize=(14, 6))
ax.plot(date_times, closes, linewidth=0.8, color="#1f77b4")
ax.set_title("Jump 25 Index – 1 Minute Close", fontsize=14)
ax.set_xlabel("Date / Time")
ax.set_ylabel("Close Price")
ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M\n%b %d"))
fig.autofmt_xdate()
ax.grid(True, alpha=0.3)

fig.savefig(OUTPUT, dpi=150, bbox_inches="tight")
print(f"Saved → {OUTPUT}")