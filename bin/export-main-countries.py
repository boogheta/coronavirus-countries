#!/usr/bin/env python

import os
import sys
import csv
import json
from copy import deepcopy
from collections import defaultdict

OLDRECOVERED = (len(sys.argv) > 1)

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
for typ in ["confirmed", "recovered", "deceased"]:
    with open(os.path.join("data", "time_series_covid19_%s_global.csv" % typ.replace("deceased", "deaths"))) as f:
        for row in sorted(csv.DictReader(f), key=lambda x: (x["Country/Region"], x["Province/State"])):
            if row["Province/State"] == "Recovered":
                continue
            countries[typ][clean_region(row['Country/Region'])].append(row)

# Uncomment to see which countries JHU has granularity for
#for c, values in countries["confirmed"].items():
#    if len(values) > 1:
#        print c, len(values)

# TODO Fix naive dates parsing
conv = lambda d: '2020-0%s-%02d' % (d[0], int(d.split('/')[1]))
rconv = lambda d: '%s/%s/20' % (d.split('-')[1].lstrip('0'), d.split('-')[2].lstrip('0'))

get_value = lambda row, dat: int(row[rconv(dat)] or 0)
sum_values = lambda country, dat: sum([get_value(region, dat) for region in country])

dates = [conv(x) for x in countries["recovered" if OLDRECOVERED else "confirmed"]["France"][0].keys() if x not in ['Lat', 'Long', 'Province/State', 'Country/Region']]
dates.sort()
if OLDRECOVERED:
    dates.pop()
while not max([sum_values(countries["confirmed"][c], dates[-1]) for c in countries["confirmed"].keys()]):
    dates.pop()
n_dates = len(dates)

data = {
    "dates": dates,
    "scopes": {
      "World": {
        "level": "country",
        "source": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      },
      "China": {
        "level": "province",
        "source": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      },
      "Canada": {
        "level": "province",
        "source": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      },
      "Australia": {
        "level": "state",
        "source": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    },
    "last_update": "##LASTUPDATE##"
}

if OLDRECOVERED:
    data["scopes"]["USA"] = {
        "level": "state",
        "source": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
    }

populations = {}
def load_populations(scopes):
    for name in scopes:
        try:
            with open(os.path.join("data", "population-%s.csv" % name)) as f:
                populations[name] = {}
                for place in csv.DictReader(f):
                    populations[name][place["id"]] = int(place["pop"])
        except IOError:
            print >> sys.stderr, "WARNING: population data missing for scope", name
load_populations(data["scopes"].keys())


def unit_vals(ndates, fieldnames, population=0):
    unit = {
        # annotations: [],
        "population": population
    }
    for f in fieldnames:
        unit[f] = [0] * ndates
    return unit


fields = ["confirmed", "deceased"]
if OLDRECOVERED:
    fields += ["recovered", "currently_sick"]

for name, scope in data["scopes"].items():
    scope["values"] = {"total": unit_vals(n_dates, fields)}
    if name == "World":
        geounits = countries["confirmed"].keys()
    else:
        geounits = countries["confirmed"][name]
    for idx, geounit in enumerate(geounits):
        c = geounit if name == "World" else clean_locality(geounit["Province/State"])
        if c not in scope["values"]:
            try:
                pop = populations[name][c]
            except KeyError:
                print >> sys.stderr, "WARNING: missing population for region %s / %s" % (name, c)
                pop = 0
            scope["values"][c] = unit_vals(n_dates, fields, pop)
        scope["values"]["total"]["population"] += pop
        for i, d in enumerate(dates):
            vals = {}
            for cas in ["confirmed", "deceased"] + (["recovered"] if OLDRECOVERED else []):
                vals[cas] = sum_values(countries[cas][c], d) if name == "World" else get_value(countries[cas][name][idx], d)
                scope["values"][c][cas][i] += vals[cas]
                scope["values"]["total"][cas][i] += vals[cas]
            if OLDRECOVERED:
                sick = vals["confirmed"] - vals["recovered"] - vals["deceased"]
                scope["values"][c]["currently_sick"][i] += sick
                scope["values"]["total"]["currently_sick"][i] += sick


localities = {
    "Italy": {
        "source": "https://github.com/pcm-dpc/COVID-19",
        "filename": "dpc-covid19-ita-regioni.csv",
        "level": "region",
        "date_accessor": lambda row: row["data"].split("T")[0],
        "fields": {
            "confirmed": "totale_casi",
            "recovered": "dimessi_guariti",
            "deceased": "deceduti",
            "currently_sick": "totale_attualmente_positivi",
            "tested": "tamponi",
            "hospitalized": "totale_ospedalizzati",
            "intensive_care": "terapia_intensiva"
        }
    },
    "France": {
        "level": "region"
    },
    "United Kingdom": {
        "level": "country"
    }
}
if not OLDRECOVERED:
    localities["US"] = {
        "level": "state"
    }

load_populations(localities.keys())

for scope, metas in localities.items():
    if "filename" not in metas:
        continue

    data["scopes"][scope] = {
        "level": metas["level"],
        "source": metas["source"],
        "dates": [],
        "values": {}
    }
    with open(os.path.join("data", metas["filename"])) as f:
        rows = list(csv.DictReader(f))

        for row in rows:
            data["scopes"][scope]["dates"].append(metas["date_accessor"](row))
        data["scopes"][scope]["dates"] = list(set(data["scopes"][scope]["dates"]))
        data["scopes"][scope]["dates"].sort()
        dates_idx = {d: i for i, d in enumerate(data["scopes"][scope]["dates"])}
        n_dates = len(data["scopes"][scope]["dates"])

        fields = metas["fields"].keys()
        data["scopes"][scope]["values"]["total"] = unit_vals(n_dates, fields, populations["World"][scope])
        for row in rows:
            idx = dates_idx[metas["date_accessor"](row)]
            name = row["denominazione_regione"]
            if name not in data["scopes"][scope]["values"]:
                try:
                    pop = populations[scope][name]
                except KeyError:
                    print >> sys.stderr, "WARNING: missing population for region %s / %s" % (scope, name)
                    pop = 0
                data["scopes"][scope]["values"][name] = unit_vals(n_dates, fields, pop)
            for field in fields:
                val = int(row[metas["fields"][field]])
                data["scopes"][scope]["values"][name][field][idx] = val
                data["scopes"][scope]["values"]["total"][field][idx] += val


with open(os.path.join("data", "coronavirus-countries%s.json" % ("-oldrecovered" if OLDRECOVERED else "")), "w") as f:
    json.dump(data, f)
