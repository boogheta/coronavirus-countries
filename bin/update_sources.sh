#!/bin/bash


# Vaccination data
curl -sfL "https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/vaccinations/vaccinations.csv" > data/vaccinations.csv
./bin/consolidate_vaccines.py > data/vaccines.csv

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
curl -sfL https://cnecovid.isciii.es/covid19/resources/casos_hosp_uci_def_sexo_edad_provres.csv > data/casos_hosp_uci_def_sexo_edad_provres.csv
./bin/consolidate_spain.py > data/spain.csv

# France official data
curl -sfL https://raw.githubusercontent.com/opencovid19-fr/data/master/dist/chiffres-cles.csv > data/chiffres-cles.csv
curl -sfL https://dashboard.covid19.data.gouv.fr/data/code-FRA.json > data/france-ehpad.json
for typ in deces hospitalisations soins_critiques retour_a_domicile cas_positifs vaccins_premiere_dose vaccins_vaccines; do
  curl -sfL https://data.widgets.dashboard.covid19.data.gouv.fr/$typ.json > data/france-$typ.json
done
./bin/consolidate_france.py

# UK official data
curl -sfL "https://api.coronavirus.data.gov.uk/v2/data?areaType=nation&metric=covidOccupiedMVBeds&metric=cumCasesBySpecimenDate&metric=cumDeaths28DaysByDeathDate&metric=hospitalCases&format=csv" > data/covid-19-indicators-uk.csv
curl -sfL "https://api.coronavirus.data.gov.uk/v2/data?areaType=nation&metric=cumPeopleVaccinatedCompleteByVaccinationDate&metric=cumPeopleVaccinatedCompleteByPublishDate&metric=cumPeopleVaccinatedFirstDoseByVaccinationDate&metric=cumPeopleVaccinatedFirstDoseByPublishDate&format=csv" > data/covid-19-vaccines-uk.csv
./bin/consolidate_uk.py > data/uk.csv

# Germany official data
curl -sfL "https://opendata.arcgis.com/api/v3/datasets/dd4580c810204019a7b8eb3e0b329dd6_0/downloads/data?format=csv&spatialRefId=4326" > data/covid-germany-landkreisen.csv
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

