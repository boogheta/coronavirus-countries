#!/bin/bash

mkdir -p data

for typ in Confirmed Recovered Deaths; do
  curl -sL https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${typ}.csv > data/time_series_19-covid-${typ}.csv
done;

./export-main-countries.py
