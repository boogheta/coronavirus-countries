#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv

fields = [
    "confirmed",
    "deceased",
    "hospitalized",
    "intensive_care",
    "vaccinated_once",
    "vaccinated_fully"
]
countries = [
  "England",
  "Wales",
  "Scotland",
  "Northern Ireland"
]

data = {}
lastdate = "2100-01-01"

mapping = {
    "covidOccupiedMVBeds": "intensive_care",
    "cumCasesBySpecimenDate": "confirmed",
    "cumDeaths28DaysByDeathDate": "deceased",
    "hospitalCases": "hospitalized"
}
curcountry = None
with open(os.path.join("data", "covid-19-indicators-uk.csv")) as f:
    for row in csv.DictReader(f):
        if curcountry != row["areaName"]:
            if any([not row[k] for k in mapping]):
                continue
            curcountry = row["areaName"]
            if row["date"] < lastdate:
                lastdate = row["date"]
        if row["date"] not in data:
            data[row["date"]] = {
              "England":            {},
              "Wales":              {},
              "Scotland":           {},
              "Northern Ireland":   {}
            }
        for k, f in mapping.items():
            data[row["date"]][row["areaName"]][f] = row[k] or 0

curcountry = None
with open(os.path.join("data", "covid-19-vaccines-uk.csv")) as f:
    for row in csv.DictReader(f):
        if curcountry != row["areaName"]:
            curcountry = row["areaName"]
            if row["date"] < lastdate:
                lastdate = row["date"]
        data[row["date"]][row["areaName"]]["vaccinated_once"] = row["cumPeopleVaccinatedFirstDoseByPublishDate"] if not row["cumPeopleVaccinatedFirstDoseByVaccinationDate"] else row["cumPeopleVaccinatedFirstDoseByVaccinationDate"]
        data[row["date"]][row["areaName"]]["vaccinated_fully"] = row["cumPeopleVaccinatedCompleteByVaccinationDate"] or row["cumPeopleVaccinatedCompleteByPublishDate"]


print("date,country," + ",".join(fields))
for d in sorted(data.keys()):
    if d > lastdate:
        continue
    for c in countries:
        print(",".join([d, c] + [str(data[d][c].get(k, 0)) for k in fields]))

