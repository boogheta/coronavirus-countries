#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv

fields = [
    "confirmed",
    "deceased",
    "recovered"
]
bundeslanders = [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen"
]

data = {}

mapping = {
    "AnzahlFall": "confirmed",
    "AnzahlTodesfall": "deceased",
    "AnzahlGenesen": "recovered"
}
with open(os.path.join("data", "covid-germany-landkreisen.csv")) as f:
    for row in csv.DictReader(f):
        dat = row["Meldedatum"].split(" ")[0].replace("/", "-")
        if dat not in data:
            data[dat] = {k: {"confirmed": 0, "deceased": 0, "recovered": 0} for k in bundeslanders}
        bdl = row["Bundesland"]
        for k, f in mapping.items():
            data[dat][bdl][f] += int(row[k])

lastvals = {k: {"confirmed": 0, "deceased": 0, "recovered": 0} for k in bundeslanders}
print("date,bundeslander," + ",".join(fields))
for d in sorted(data.keys()):
    for c in sorted(bundeslanders):
        for k in fields:
            lastvals[c][k] += data[d][c].get(k, 0)
        print(",".join([d, c] + [str(lastvals[c][k]) for k in fields]))

