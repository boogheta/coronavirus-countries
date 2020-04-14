import os
import csv

initvals = lambda : {"confirmed": [], "deceased": []}
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
date_idx = -1

formatcase = lambda c : c.replace("ConfirmedCases", "confirmed").replace("Deaths", "deceased")

def complete_last_row():
    n = len(countries["UK"]["confirmed"])
    if not n:
        return
    for c in ["Wales", "Northern Ireland"]:
        if len(countries[c]["confirmed"]) < n:
            countries[c]["confirmed"].append(0)
            countries[c]["deceased"].append(0)
    if len(countries["England"]["confirmed"]) < n:
        for c in ["confirmed", "deceased"]:
            countries["England"][c].append(countries["UK"][c][-1] - countries["Wales"][c][-1] - countries["Scotland"][c][-1] - countries["Northern Ireland"][c][-1])


with open(os.path.join("data", "covid-19-indicators-uk.csv")) as f:
    for row in csv.DictReader(f):
        if row["Date"] < MINDATE or row["Indicator"] == "Tests":
            continue
        if curdate != row["Date"]:
            complete_last_row()
            curdate = row["Date"]
            dates.append(curdate)
        cas = formatcase(row["Indicator"])
        countries[row["Country"]][cas].append(int(row["Value"]))
    complete_last_row()
    del(countries["UK"])


print "date,country,confirmed,deceased"
for i, d in enumerate(sorted(dates)):
    for b in countries.keys():
        print ",".join([d, b, str(countries[b]["confirmed"][i]), str(countries[b]["deceased"][i])])

