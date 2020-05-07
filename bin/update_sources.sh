#!/bin/bash


# World JHU data
for typ in confirmed deaths recovered; do
  curl -sfL https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${typ}_global.csv > data/time_series_covid19_${typ}_global.csv
done;

# USA JHU data
for typ in confirmed deaths testing; do
  curl -sfL https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${typ}_US.csv > data/time_series_covid19_${typ}_US.csv
done;

# Italy official data
curl -sfL https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-regioni/dpc-covid19-ita-regioni.csv > data/dpc-covid19-ita-regioni.csv

# Spain official data
curl -sfL https://covid19.isciii.es/resources/serie_historica_acumulados.csv > data/serie_historica_acumulados.csv
if ! head -2 data/serie_historica_acumulados.csv | tail -1 | grep 2020 > /dev/null; then
  echo "WARNING: Spain data is missing dates"
  git checkout -- data/serie_historica_acumulados.csv
fi
LC_ALL=C sed -n '/NOTA.*/q;p' data/serie_historica_acumulados.csv > data/spain.csv

# France official data
curl -sfL https://raw.githubusercontent.com/opencovid19-fr/data/master/dist/chiffres-cles.csv > data/chiffres-cles.csv

# UK official data
curl -sfL https://raw.githubusercontent.com/tomwhite/covid-19-uk-data/master/data/covid-19-indicators-uk.csv > data/covid-19-indicators-uk.csv
./bin/consolidate_uk.py > data/uk.csv

# Germany official data
curl -sfL https://raw.githubusercontent.com/micgro42/COVID-19-DE/master/time_series/time-series_19-covid-Confirmed.csv > data/time_series_covid19_confirmed_Germany.csv
curl -sfL https://raw.githubusercontent.com/micgro42/COVID-19-DE/master/time_series/time-series_19-covid-Deaths.csv > data/time_series_covid19_deaths_Germany.csv
./bin/consolidate_germany.py > data/germany.csv


# Population data
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=0" > data/population-World.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=1662739553" > data/population-Australia.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=702355833" > data/population-China.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=88045307" > data/population-Canada.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=334671180" > data/population-Italy.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=117825319" > data/population-Spain.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=1500184457" > data/population-UK.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=2101017542" > data/population-Germany.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=1101367004" > data/population-France.csv
curl -sfL "https://docs.google.com/spreadsheets/d/1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0/export?format=csv&id=1e703pe3GmBQt0i2yAOS0F6Bhxy91U1-NTB6JMRSTzc0&gid=1285380985" > data/population-USA.csv


# Checkout bad files from errored queries
find data -size 0 -exec git checkout -- {} \;

