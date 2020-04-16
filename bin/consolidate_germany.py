#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv

landers = {}
dates = []

with open(os.path.join("data", "time_series_covid19_confirmed_Germany.csv")) as f:
    for row in csv.DictReader(f):
        if not dates:
            dates = list(row.keys())
            dates.remove("State")
        if row["State"] not in landers:
            landers[row["State"]] = {}
        landers[row["State"]]["confirmed"] = row

with open(os.path.join("data", "time_series_covid19_deaths_Germany.csv")) as f:
    for row in csv.DictReader(f):
        landers[row["State"]]["deceased"] = row

print("date,bundeslander,confirmed,deceased")
for d in sorted(dates):
    for b in list(landers.keys()):
        print(",".join([d, b, landers[b]["confirmed"][d], landers[b]["deceased"][d]]))
