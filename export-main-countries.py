#!/usr/bin/env python

import os
import csv
import json
from collections import defaultdict

def clean_region(r):
    r = r.strip(" *")
    r = r.replace("Republic of Korea", "South Korea")
    r = r.replace("Korea, South", "South Korea")
    r = r.replace("Mainland China", "China")
    r = r.replace("Martinique", "France")
    r = r.replace("Reunion", "France")
    r = r.replace("Guadeloupe", "France")
    r = r.replace("French Guiana", "France")
    r = r.replace("Russian Federation", "Russia")
    if r == "US":
        r = "United States"
    return r

countries = {
    "confirmed": defaultdict(list),
    "recovered": defaultdict(list),
    "dead": defaultdict(list)
}
for typ, typS in [("confirmed", "Confirmed"), ("recovered", "Recovered"), ("dead", "Deaths")]:
    with open(os.path.join("data", "time_series_19-covid-%s.csv" % typS)) as f:
        for row in csv.DictReader(f):
            countries[typ][clean_region(row['Country/Region'])].append(row)

sum_values = lambda country, dat: sum([int(region[rconv(dat)] or 0) for region in country])

# TODO Fix naive dates parsing
conv = lambda d: '2020-0%s-%02d' % (d[0], int(d.split('/')[1]))
rconv = lambda d: '%s/%s/20' % (d.split('-')[1].lstrip('0'), d.split('-')[2].lstrip('0'))

dates = [conv(x) for x in countries["confirmed"]["France"][0].keys() if x not in ['Lat', 'Long', 'Province/State', 'Country/Region']]
dates.sort()

while not max([sum_values(countries["confirmed"][c], dates[-1]) for c in countries["confirmed"].keys()]):
    dates.pop()

data = {
    "dates": dates,
    "values": {},
    "last_update": "##LASTUPDATE##"
}
for c in sorted(countries["confirmed"].keys()):
    data["values"][c] = {
        "confirmed": [],
        "recovered": [],
        "dead": [],
        "sick": []
    }
    for d in dates:
        conf = sum_values(countries["confirmed"][c], d)
        data["values"][c]["confirmed"].append(conf)
        reco = sum_values(countries["recovered"][c], d)
        data["values"][c]["recovered"].append(reco)
        dead = sum_values(countries["dead"][c], d)
        data["values"][c]["dead"].append(dead)
        data["values"][c]["sick"].append(conf - reco - dead)

with open(os.path.join("data", "coronavirus-countries.json"), "w") as f:
    json.dump(data, f)
