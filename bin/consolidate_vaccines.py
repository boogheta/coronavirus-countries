#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import csv
import json
from datetime import timedelta, date

def daterange(date1, date2):
    d1 = date.fromisoformat(date1)
    d2 = date.fromisoformat(date2)
    for n in range(int ((d2 - d1).days)+1):
        yield (d1 + timedelta(n)).isoformat()

fields = [
    "vaccinated_once",
    "vaccinated_fully"
]
excludes = [
    "Anguilla",
    "Aruba",
    "Bermuda",
    "Bonaire Sint Eustatius and Saba",
    "British Virgin Islands",
    "Cayman Islands",
    "Cook Islands",
    "Curacao",
    "Faeroe Islands",
    "Falkland Islands",
    "French Polynesia",
    "Gibraltar",
    "Greenland",
    "Guernsey",
    "Hong Kong",
    "Isle of Man",
    "Jersey",
    "Macao",
    "Montserrat",
    "Nauru",
    "New Caledonia",
    "Niue",
    "Pitcairn",
    "Saint Helena",
    "Sint Maarten (Dutch part)",
    "Tokelau",
    "Tonga",
    "Turkmenistan",
    "Turks and Caicos Islands",
    "Tuvalu",
    "Wallis and Futuna"
]

mapped = {
    "Cape Verde": "Cabo Verde",
    "Congo": "Congo (Brazzaville)",
    "Democratic Republic of Congo": "Congo (Kinshasa)",
    "Myanmar": "Burma",
    "Timor": "Timor-Leste",
    "United States": "USA",
    "Palestine": "West Bank and Gaza"
}
data = {}
countries = []
mindate = "2050-01-01"
maxdate = "2000-01-01"

with open(os.path.join("data", "vaccinations.csv")) as f:
    for row in csv.DictReader(f):
        loc = mapped.get(row["location"], row["location"])
        if loc in excludes or (loc != "Kosovo" and row["iso_code"].startswith("OWID_")) or (not row["people_vaccinated"] and not row["people_fully_vaccinated"]):
            continue
        if loc not in data:
            data[loc] = {}

        dat = row["date"]
        if dat > maxdate:
            maxdate = dat
        if dat < mindate:
            mindate = dat
        data[loc][dat] = {}
        if row["people_vaccinated"]:
            data[loc][dat]["vaccinated_once"] = row["people_vaccinated"]
        if row["people_fully_vaccinated"]:
            data[loc][dat]["vaccinated_fully"] = row["people_fully_vaccinated"]


print("date,country," + ",".join(fields))
countries = sorted(data.keys())
lastd = None
for d in daterange(mindate, maxdate):
    for c in countries:
        if d not in data[c]:
            if lastd:
                data[c][d] = dict(data[c][lastd])
            else:
                data[c][d] = {"vaccinated_once": 0, "vaccinated_fully": 0}
        else:
            if not data[c][d].get("vaccinated_once"):
                data[c][d]["vaccinated_once"] = 0 if not lastd else data[c][lastd]["vaccinated_once"]
            if not data[c][d].get("vaccinated_fully"):
                data[c][d]["vaccinated_fully"] = 0 if not lastd else data[c][lastd]["vaccinated_fully"]
        print(",".join([d, c] + [str(data[c][d][k]) for k in fields]))
    lastd = d

with open(os.path.join("data", "vaccines.json"), "w") as f:
    json.dump(data, f)
