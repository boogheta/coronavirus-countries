#!/bin/bash

cd $(dirname $0)
mkdir -p data

for typ in Confirmed Recovered Deaths; do
  curl -sL https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${typ}.csv > data/time_series_19-covid-${typ}.csv
done;

./export-main-countries.py

if git diff data/coronavirus-countries.json > /dev/null; then
  echo "Data updated!"
  ts=$(date +%s)
  sed -i 's/"##LASTUPDATE##"/'$ts'/' data/coronavirus-countries.json
  git commit -m "update data" data/coronavirus-countries.json
  git push
fi
