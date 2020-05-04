#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv

initvals = lambda : {"confirmed": [], "deceased": [], "tested": []}
countries = {
  "England": initvals(),
  "Wales": initvals(),
  "Scotland": initvals(),
  "Northern Ireland": initvals(),
  "UK": initvals()
}
dates = []
curdate = None
MINDATE = "2020-01-30"

formatcase = lambda c : c.replace("ConfirmedCases", "confirmed").replace("Deaths", "deceased").replace("Tests", "tested")

def complete_last_row(dates, countries):
    n = len(countries["UK"]["confirmed"])
    if not n:
        return dates, countries
    dates = dates[0:n]
    for case in ["confirmed", "deceased", "tested"]:
        for c in ["Wales", "Northern Ireland", "Scotland", "UK", "England"]:
            countries[c][case] = countries[c][case][0:n]
            if not len(countries[c][case]):
                countries[c][case].append(0)
            elif len(countries[c][case]) < n:
                countries[c][case].append(countries[c][case][n-2])
    # Use substraction of UK only for Tests since confimed cases seem inconsistent with England ones until figuring out https://github.com/tomwhite/covid-19-uk-data/issues/52
    countries["England"]["tested"][-1] = countries["UK"][case][-1] - countries["Wales"][case][-1] - countries["Scotland"][case][-1] - countries["Northern Ireland"][case][-1]
    return dates, countries

with open(os.path.join("data", "covid-19-indicators-uk.csv")) as f:
    for row in csv.DictReader(f):
        if row["Date"] < MINDATE:
            continue
        if curdate != row["Date"]:
            dates, countries = complete_last_row(dates, countries)
            curdate = row["Date"]
            dates.append(curdate)
        cas = formatcase(row["Indicator"])
        countries[row["Country"]][cas].append(int(row["Value"]))
    dates, countries = complete_last_row(dates, countries)
    del(countries["UK"])


print("date,country,confirmed,deceased,tested")
for i, d in enumerate(sorted(dates)):
    for b in countries.keys():
        print(",".join([d, b, str(countries[b]["confirmed"][i]), str(countries[b]["deceased"][i]), str(countries[b]["tested"][i])]))

