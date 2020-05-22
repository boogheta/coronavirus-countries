#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

import os
import sys
import csv
import json
import subprocess
from copy import deepcopy
from collections import defaultdict


def clean_region(r):
    r = r.strip(" *")
    r = r.replace("Cruise Ship", "Diamond Princess")
    r = r.replace("Republic of Korea", "South Korea")
    r = r.replace("Cape Verde", "Cabo Verde")
    r = r.replace("East Timor", "Timor-Leste")
    r = r.replace("Republic of the Congo", "Congo (Brazzaville)")
    r = r.replace("Korea, South", "South Korea")
    r = r.replace("Mainland China", "China")
    r = r.replace("Martinique", "France")
    r = r.replace("Reunion", "France")
    r = r.replace("Guadeloupe", "France")
    r = r.replace("French Guiana", "France")
    r = r.replace("Russian Federation", "Russia")
    r = r.replace("United States Virgin", "Virgin")
    r = r.replace("The ", "")
    r = r.replace(", The", "")
    if r == "US":
        r = "USA"
    return r

def clean_spain_locality(r):
    r = r.replace("AN", "Andalucía")
    r = r.replace("AR", "Aragón")
    r = r.replace("AS", "Asturias")
    r = r.replace("IB", "Baleares")
    r = r.replace("CN", "Canarias")
    r = r.replace("CB", "Cantabria")
    r = r.replace("CM", "Castilla La Mancha")
    r = r.replace("CL", "Castilla y León")
    r = r.replace("CT", "Cataluña")
    r = r.replace("CE", "Ceuta")
    r = r.replace("GA", "Galicia")
    r = r.replace("VC", "Valenciana")
    r = r.replace("EX", "Extremadura")
    r = r.replace("MD", "Madrid")
    r = r.replace("ML", "Melilla")
    r = r.replace("MC", "Murcia")
    r = r.replace("NC", "Navarra")
    r = r.replace("PV", "País Vasco")
    r = r.replace("RI", "La Rioja")
    return r

USA_states = {
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
def clean_locality(r, scope):
    if scope.strip() != "France":
        r = clean_region(r)
    if "," in r and scope == "USA":
        r = USA_states.get(r.split(",")[1].strip(), r)
    elif scope == "Spain":
        r = clean_spain_locality(r)
    return r

def last_file_update(f):
    process = subprocess.Popen(['git', 'log', '-1', '--format=%ct', f], stdout=subprocess.PIPE)
    return int(process.communicate()[0].strip() or 0)


countries = {
    "confirmed": defaultdict(list),
    "recovered": defaultdict(list),
    "deceased": defaultdict(list)
}
last_jhu_update = 0

for typ in ["confirmed", "recovered", "deceased"]:
    fname = os.path.join("data", "time_series_covid19_%s_global.csv" % typ.replace("deceased", "deaths"))
    res = last_file_update(fname)
    if last_jhu_update < res:
        last_jhu_update = res
    with open(fname) as f:
        for row in sorted(csv.DictReader(f), key=lambda x: (x["Country/Region"], x["Province/State"])):
            if row["Province/State"] in ["Recovered", "From Diamond Princess", "US"]:
                continue
            countries[typ][clean_region(row['Country/Region'])].append(row)

if len(sys.argv) > 1:
    for typ in ["confirmed", "recovered", "deceased"]:
        print("-- %s --" % typ)
        for c, values in countries[typ].items():
            if len(values) > 1:
                print(c, len(values), [v["Province/State"] for v in values])
    exit(0)

usa_states = {
    #"tested": defaultdict(list),
    "confirmed": defaultdict(list),
    "deceased": defaultdict(list)
}
last_usa_update = 0

for typ in ["confirmed", "deceased", "tested"]:
    fname = os.path.join("data", "time_series_covid19_%s_US.csv" % typ.replace("deceased", "deaths").replace("tested", "testing"))
    res = last_file_update(fname)
    if last_usa_update < res:
        last_usa_update = res
    with open(fname) as f:
        for row in sorted(csv.DictReader(f), key=lambda x: (x["Province_State"], x["Admin2"])):
            usa_states[typ][clean_region(row['Province_State'])].append(row)

eldate = lambda d, i: int(d.split('/')[i])
fix_year = lambda d: d if d > 2000 else 2000 + d
conv = lambda d: '%d-%02d-%02d' % (fix_year(eldate(d, 2)), eldate(d, 0), eldate(d, 1))
conv_fr = lambda d: '%d-%02d-%02d' % (fix_year(eldate(d, 2)), eldate(d, 1), eldate(d, 0))
rconv = lambda d: '%s/%s/%s' % (d.split('-')[1].lstrip('0'), d.split('-')[2].lstrip('0'), int(d.split('-')[0]) - 2000)
rconv_alt = lambda d: '%s/%s/%s' % (d.split('-')[1].lstrip('0'), d.split('-')[2].lstrip('0'), d.split('-')[0])

get_value = lambda row, dat: int(float(row.get(rconv(dat), row.get(rconv_alt(dat))) or 0))
sum_values = lambda country, dat: sum([get_value(region, dat) for region in country])

ignore_fields = ['Lat', 'Long', 'Province/State', 'Country/Region']
dates = [conv(x) for x in countries["confirmed"]["France"][0].keys() if x not in ignore_fields]
dates.sort()
while not max([sum_values(countries["confirmed"][c], dates[-1]) for c in countries["confirmed"].keys()]):
    dates.pop()
n_dates = len(dates)

data = {
  "dates": dates,
  "scopes": {
    "World": {
      "level": "country",
      "source": {
        "name": "JHU CSSE",
        "url": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    },
    "China": {
      "level": "province",
      "source": {
        "name": "JHU CSSE",
        "url": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    },
    "Canada": {
      "level": "province",
      "source": {
        "name": "JHU CSSE",
        "url": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    },
    "Australia": {
      "level": "state",
      "source": {
        "name": "JHU CSSE",
        "url": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    },
    "USA": {
      "level": "state",
      "source": {
        "name": "JHU CSSE",
        "url": "https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series"
      }
    }
  }
}

populations = {}
def load_populations(scopes):
    for name in scopes:
        name = name.strip()
        try:
            with open(os.path.join("data", "population-%s.csv" % name)) as f:
                populations[name] = {}
                for place in csv.DictReader(f):
                    populations[name][place["id"]] = int(place["pop"])
        except ValueError:
            print("WARNING: population data missing in scope %s for place %s" % (name, place), file=sys.stderr)
        except IOError:
            print("WARNING: population data missing for scope %s" % name, file=sys.stderr)
load_populations(data["scopes"].keys())


def unit_vals(ndates, fieldnames, population=0):
    unit = {
        # annotations: [],
        "population": population
    }
    for f in fieldnames:
        unit[f] = [0] * ndates
    return unit


for name, scope in data["scopes"].items():
    fields = ["confirmed", "deceased"]
    if name == "USA":
        #fields.append("tested")
        pass
    elif name != "Canada":
        fields += ["recovered", "currently_sick"]
    scope["values"] = {"total": unit_vals(n_dates, fields)}
    scope["lastUpdate"] = last_usa_update if name == "USA" else last_jhu_update

    values = countries
    if name == "USA":
        values = usa_states
    if name in ["World", "USA"]:
        geounits = values["confirmed"].keys()
    else:
        geounits = values["confirmed"][name]

    for idx, geounit in enumerate(geounits):
        c = geounit if name in ["World", "USA"] else clean_locality(geounit["Province/State"], name)
        if c not in scope["values"]:
            try:
                pop = populations[name.strip()][c]
            except KeyError:
                print("WARNING: missing population for region %s / %s" % (name, c), file=sys.stderr)
                pop = 0
            scope["values"][c] = unit_vals(n_dates, fields, pop)
        scope["values"]["total"]["population"] += pop
        for i, d in enumerate(dates):
            vals = {}
            # TODO Handle tested for USA when there
            for cas in ["confirmed", "deceased"] + (["recovered"] if "recovered" in fields else []):
                vals[cas] = sum_values(values[cas][c], d) if name in ["World", "USA"] else get_value(values[cas][name][idx], d)
                scope["values"][c][cas][i] += vals[cas]
                scope["values"]["total"][cas][i] += vals[cas]
            if "recovered" in fields:
                sick = vals["confirmed"] - vals["recovered"] - vals["deceased"]
                scope["values"][c]["currently_sick"][i] += sick
                scope["values"]["total"]["currently_sick"][i] += sick


france_ehpad = 0
with open(os.path.join("data", "chiffres-cles.csv")) as f:
    for row in csv.DictReader(f):
        if row["granularite"] == "pays" and row["deces_ehpad"]:
            try:
                france_ehpad = int(row["deces_ehpad"])
            except ValueError:
                pass
france_disclaimer = 'France does not release detailed data on tests performed and confirmed: only national (<a href="https://github.com/CSSEGISandData/COVID-19/issues/2094" target="_blank">and</a>&nbsp;<a href="https://www.liberation.fr/checknews/2020/04/05/covid-19-pourquoi-des-sites-evoquent-90-000-cas-en-france-contre-68-000-au-bilan-officiel_1784232" target="_blank">controversial</a>) figures are published. Deaths cases are also only detailed for hospitals: the %s deceased cases in nursing homes are therefore not accounted in this dataset.' % ('{:,}'.format(france_ehpad).replace(',', '&nbsp;'))


localities = {
    "Italy": {
        "source": {
          "name": "Italy's Department of Civil Protection",
          "url": "https://github.com/pcm-dpc/COVID-19"
        },
        "filename": "dpc-covid19-ita-regioni.csv",
        "level": "region",
        "level_field": "denominazione_regione",
        "date_accessor": lambda row: row["data"].split("T")[0],
        "fields": {
            "tested": "tamponi",
            "confirmed": "totale_casi",
            "recovered": "dimessi_guariti",
            "hospitalized": "totale_ospedalizzati",
            "intensive_care": "terapia_intensiva",
            "deceased": "deceduti",
            "currently_sick": "totale_positivi"
        }
    },
    "France": {
        "source": {
          "name": "Santé Publique France (curated by OpenCOVID19-fr)",
          "url": "https://github.com/opencovid19-fr/data",
          "disclaimer": france_disclaimer
        },
        "filename": "chiffres-cles.csv",
        "level": "department",
        "level_field": "maille_nom",
        "date_accessor": lambda row: row["date"],
        "filter": lambda row: row["granularite"] == "departement" and row["source_type"] == "sante-publique-france-data",
        "fields": {
            "recovered": "gueris",
            "hospitalized": "hospitalises",
            "intensive_care": "reanimation",
            "deceased": "deces"
        }
    },
    "France ": {
        "source": {
          "name": "Santé Publique France (curated by OpenCOVID19-fr)",
          "url": "https://github.com/opencovid19-fr/data",
          "disclaimer": france_disclaimer
        },
        "filename": "chiffres-cles.csv",
        "level": "region",
        "level_field": "maille_nom",
        "date_accessor": lambda row: row["date"],
        "filter": lambda row: row["granularite"] == "region" and row["source_type"] == "opencovid19-fr",
        "fields": {
            "recovered": "gueris",
            "hospitalized": "hospitalises",
            "intensive_care": "reanimation",
            "deceased": "deces"
        }
    },
    "Spain": {
        "source": {
          "name": "Spain's Ministry of Health",
          "url": "https://covid19.isciii.es"
        },
        "filename": "spain.csv",
        "encoding": "iso-8859-15",
        "level": "autonom. community",
        "level_field": "CCAA",
        "date_accessor": lambda row: conv_fr(row["FECHA"]),
        "filter": lambda row: row["FECHA"] and "/202" in row["FECHA"],
        "fields": {
            "confirmed": "CASOS",
            #"recovered": "Recuperados",
            "hospitalized": "Hospitalizados",
            "intensive_care": "UCI",
            "deceased": "Fallecidos"
        }
    },
    "Germany": {
        "source": {
          "name": "Robert Koch Institute (curated by Michael Große)",
          "url": "https://github.com/micgro42/COVID-19-DE"
        },
        "filename": "germany.csv",
        "level": "bundesländer",
        "level_field": "bundeslander",
        "date_accessor": lambda row: row["date"],
        "fields": {
            "confirmed": "confirmed",
            "deceased": "deceased"
        }
    },
    "UK": {
        "source": {
          "name": "UK NHS (curated by Tom White)",
          "url": "https://github.com/tomwhite/covid-19-uk-data"
        },
        "filename": "uk.csv",
        "level": "country",
        "level_field": "country",
        "date_accessor": lambda row: row["date"],
        "fields": {
            "tested": "tested",
            "confirmed": "confirmed",
            "deceased": "deceased"
        }
    }
}

load_populations(localities.keys())

for scope, metas in localities.items():
    if "filename" not in metas or not metas["filename"]:
        continue
    fname = os.path.join("data", metas["filename"])

    data["scopes"][scope] = {
        "level": metas["level"],
        "source": metas["source"],
        "lastUpdate": last_file_update(fname),
        "dates": [],
        "values": {}
    }

    with (open(fname) if sys.version < "3" else open(fname, encoding=metas.get("encoding"))) as f:
        rows = [row for row in csv.DictReader(f) if "filter" not in metas or metas["filter"](row)]

        for row in rows:
            data["scopes"][scope]["dates"].append(metas["date_accessor"](row))
        data["scopes"][scope]["dates"] = list(set(data["scopes"][scope]["dates"]))
        data["scopes"][scope]["dates"].sort()
        dates_idx = {d: i for i, d in enumerate(data["scopes"][scope]["dates"])}
        n_dates = len(data["scopes"][scope]["dates"])

        fields = metas["fields"].keys()
        data["scopes"][scope]["values"]["total"] = unit_vals(n_dates, fields, populations["World"][scope.strip().replace("UK", "United Kingdom")])
        for row in rows:
            idx = dates_idx[metas["date_accessor"](row)]
            name = clean_locality(row[metas["level_field"]], scope)
            if name not in data["scopes"][scope]["values"]:
                try:
                    pop = populations[scope.strip()][name]
                except KeyError:
                    print("WARNING: missing population for region %s / %s" % (scope, name), file=sys.stderr)
                    pop = 0
                data["scopes"][scope]["values"][name] = unit_vals(n_dates, fields, pop)
            for field in fields:
                val = int(row[metas["fields"][field]] or 0)
                data["scopes"][scope]["values"][name][field][idx] = val
                data["scopes"][scope]["values"]["total"][field][idx] += val
            if "currently_sick" not in fields and "confirmed" in fields and "recovered" in fields and "deceased" in fields:
                if "currently_sick" not in data["scopes"][scope]["values"][name]:
                    data["scopes"][scope]["values"][name]["currently_sick"] = [0] * n_dates
                    data["scopes"][scope]["values"]["total"]["currently_sick"] = [0] * n_dates
                sick = data["scopes"][scope]["values"][name]["confirmed"][idx] - data["scopes"][scope]["values"][name]["recovered"][idx] - data["scopes"][scope]["values"][name]["deceased"][idx]
                data["scopes"][scope]["values"][name]["currently_sick"][idx] = sick
                data["scopes"][scope]["values"]["total"]["currently_sick"][idx] = sick


with open(os.path.join("data", "coronavirus-countries.json"), "w") as f:
    json.dump(data, f, sort_keys=True)
