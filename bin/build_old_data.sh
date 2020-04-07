#!/bin/bash

cd $(dirname $0)/..
mkdir -p data

for typ in confirmed recovered deaths; do
  curl -sL https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/archived_data/archived_time_series/time_series_19-covid-${typ^}_archived_0325.csv > data/time_series_covid19_${typ}_global.csv
done;

./bin/export-main-countries.py 1

git checkout -- data/time_series_covid19_*_global.csv
