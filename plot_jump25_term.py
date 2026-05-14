#!/usr/bin/env python3
"""Plot Jump 25 Index 1M CSV in the terminal (no browser)."""

import csv
from plotext import plot, clear_figure, title, xlabel, ylabel, plotsize, show

FILE = "/home/salmarina/deriv/analisis/Jump 25 Index (1 M).csv"

x, y = [], []
with open(FILE, newline="") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        x.append(i)
        y.append(float(row["Close"]))

clear_figure()
plotsize(120, 30)
title("Jump 25 Index - 1M Close")
xlabel("Tick #")
ylabel("Price")
plot(x, y)
show()