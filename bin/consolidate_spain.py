#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv

fields = [
    "confirmed",
    "deceased",
    "hospitalized",
    "intensive_care"
]

provincias = {
  "C" : "GA",
  "VI": "PV",
  "AB": "CM",
  "A" : "VC",
  "AL": "AN",
  "O" : "AS",
  "AV": "CL",
  "BA": "EX",
  "PM": "IB",
  "B" : "CT",
  "BU": "CL",
  "CC": "EX",
  "CA": "AN",
  "S" : "CB",
  "CS": "VC",
  "CR": "CM",
  "CO": "AN",
  "CU": "CM",
  "GI": "CT",
  "GR": "AN",
  "GU": "CM",
  "SS": "PV",
  "H" : "AN",
  "HU": "AR",
  "J" : "AN",
  "LO": "RI",
  "GC": "CN",
  "LE": "CL",
  "L" : "CT",
  "LU": "GA",
  "M" : "MD",
  "MA": "AN",
  "MU": "MC",
  "NA": "NC",
  "NC": "NC",
  "OR": "GA",
  "P" : "CL",
  "PO": "GA",
  "SA": "CL",
  "TF": "CN",
  "SG": "CL",
  "SE": "AN",
  "SO": "CL",
  "T" : "CT",
  "TE": "AR",
  "TO": "CM",
  "V" : "VC",
  "VA": "CL",
  "BI": "PV",
  "ZA": "CL",
  "Z" : "AR",
  "CE": "CE",
  "ML": "ML"
}

CCAAs = {
  "AN": "Andalucía",
  "AR": "Aragón",
  "AS": "Asturias",
  "IB": "Baleares",
  "CN": "Canarias",
  "CB": "Cantabria",
  "CM": "Castilla La Mancha",
  "CL": "Castilla y León",
  "CT": "Cataluña",
  "CE": "Ceuta",
  "GA": "Galicia",
  "VC": "Valenciana",
  "EX": "Extremadura",
  "MD": "Madrid",
  "ML": "Melilla",
  "MC": "Murcia",
  "NC": "Navarra",
  "PV": "País Vasco",
  "RI": "La Rioja"
}

data = {}

mapping = {
    "num_uci": "intensive_care",
    "num_casos": "confirmed",
    "num_def": "deceased",
    "num_hosp": "hospitalized"
}
curdate = None
with open(os.path.join("data", "casos_hosp_uci_def_sexo_edad_provres.csv")) as f:
    for row in csv.DictReader(f):
        if curdate != row["fecha"]:
            lastdate = curdate
            curdate = row["fecha"]
        curccaa = CCAAs[provincias[row["provincia_iso"]]]
        if not data:
            data[curdate] = {k: {"confirmed": 0, "deceased": 0, "hospitalized": 0, "intensive_care": 0} for k in CCAAs.values()}
        else:
            if curdate not in data:
                data[curdate] = {}
            if curccaa not in data[curdate]:
                data[curdate][curccaa] = dict(data[lastdate][curccaa])
        for k, f in mapping.items():
            data[curdate][curccaa][f] += int(row[k])

print("date,CCAA," + ",".join(fields))
for d in sorted(data.keys()):
    for c in CCAAs.values():
        print(",".join([d, c] + [str(data[d][c].get(k, 0)) for k in fields]))

