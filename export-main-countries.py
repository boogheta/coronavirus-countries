#!/usr/bin/env python

import os
import sys
import csv
import json
from copy import deepcopy
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
        r = "USA"
    return r

US_states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "D.C.": "District of Columbia",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}
def clean_locality(r):
    r = r.strip(" *")
    if "," in r:
        r = US_states.get(r.split(",")[1].strip(), r)
    return r

countries = {
    "confirmed": defaultdict(list),
    "recovered": defaultdict(list),
    "deceased": defaultdict(list)
}
for typ, typS in [("confirmed", "Confirmed"), ("recovered", "Recovered"), ("deceased", "Deaths")]:
    with open(os.path.join("data", "time_series_19-covid-%s.csv" % typS)) as f:
        for row in sorted(csv.DictReader(f), key=lambda x: (x["Country/Region"], x["Province/State"])):
            countries[typ][clean_region(row['Country/Region'])].append(row)

# TODO Fix naive dates parsing
conv = lambda d: '2020-0%s-%02d' % (d[0], int(d.split('/')[1]))
rconv = lambda d: '%s/%s/20' % (d.split('-')[1].lstrip('0'), d.split('-')[2].lstrip('0'))

get_value = lambda row, dat: int(row[rconv(dat)] or 0)
sum_values = lambda country, dat: sum([get_value(region, dat) for region in country])

dates = [conv(x) for x in countries["confirmed"]["France"][0].keys() if x not in ['Lat', 'Long', 'Province/State', 'Country/Region']]
dates.sort()

while not max([sum_values(countries["confirmed"][c], dates[-1]) for c in countries["confirmed"].keys()]):
    dates.pop()
n_dates = len(dates)

data = {
    "dates": dates,
    "scopes": {
      "World": {
        "level": "country",
      },
      "China": {
        "level": "province",
      },
      "USA": {
        "level": "state",
      },
    #  "France": {
    #    "level": "region",
    #  },
    #  "Italy": {
    #    "level": "region",
    #  },
      "Canada": {
        "level": "province",
      },
    #  "United Kingdom": {
    #    "level": "country",
    #  },
      "Australia": {
        "level": "state",
      }
    },
    "last_update": "##LASTUPDATE##"
}

#for c, values in countries["confirmed"].items():
#    if len(values) > 1:
#        print c, len(values)

unit_vals = {
    # population: 0,
    # annotations: [],
    "confirmed":      [0] * n_dates,
    "recovered":      [0] * n_dates,
    "deceased":       [0] * n_dates,
    "currently_sick": [0] * n_dates
}
for name, scope in data["scopes"].items():
    level = scope["level"]
    scope["values"] = {"total": deepcopy(unit_vals)}
    if name == "World":
        geounits = countries["confirmed"].keys()
    else:
        geounits = countries["confirmed"][name]
    for idx, geounit in enumerate(geounits):
        c = geounit if name == "World" else clean_locality(geounit["Province/State"])
        if c not in scope["values"]:
            scope["values"][c] = deepcopy(unit_vals)
        for i, d in enumerate(dates):
            vals = {}
            for cas in ["confirmed", "recovered", "deceased"]:
                vals[cas] = sum_values(countries[cas][c], d) if name == "World" else get_value(countries[cas][name][idx], d)
                scope["values"][c][cas][i] += vals[cas]
                scope["values"]["total"][cas][i] += vals[cas]
            sick = vals["confirmed"] - vals["recovered"] - vals["deceased"]
            scope["values"][c]["currently_sick"][i] += sick
            scope["values"]["total"]["currently_sick"][i] += sick

with open(os.path.join("data", "coronavirus-countries.json"), "w") as f:
    json.dump(data, f)
