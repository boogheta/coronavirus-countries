#!/bin/bash

cd $(dirname $0)/..
mkdir -p data

./bin/update_sources.sh

# Version data
if git diff data/*.csv | grep . > /dev/null; then
  echo "Data updated!"
  git commit -m "update source data" data/*.csv

  # Build agregated data for dashboard
  ./bin/export-main-countries.py
  git commit -m "update data" data/coronavirus-countries.json

  git push
fi
