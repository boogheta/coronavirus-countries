#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv
import json

noms = {
    "DEP-01": "Ain",
    "DEP-02": "Aisne",
    "DEP-03": "Allier",
    "DEP-04": "Alpes-de-Haute-Provence",
    "DEP-05": "Hautes-Alpes",
    "DEP-06": "Alpes-Maritimes",
    "DEP-07": "Ardèche",
    "DEP-08": "Ardennes",
    "DEP-09": "Ariège",
    "DEP-10": "Aube",
    "DEP-11": "Aude",
    "DEP-12": "Aveyron",
    "DEP-13": "Bouches-du-Rhône",
    "DEP-14": "Calvados",
    "DEP-15": "Cantal",
    "DEP-16": "Charente",
    "DEP-17": "Charente-Maritime",
    "DEP-18": "Cher",
    "DEP-19": "Corrèze",
    "DEP-21": "Côte-d'Or",
    "DEP-22": "Côtes-d'Armor",
    "DEP-23": "Creuse",
    "DEP-24": "Dordogne",
    "DEP-25": "Doubs",
    "DEP-26": "Drôme",
    "DEP-27": "Eure",
    "DEP-28": "Eure-et-Loir",
    "DEP-29": "Finistère",
    "DEP-2A": "Corse-du-Sud",
    "DEP-2B": "Haute-Corse",
    "DEP-30": "Gard",
    "DEP-31": "Haute-Garonne",
    "DEP-32": "Gers",
    "DEP-33": "Gironde",
    "DEP-34": "Hérault",
    "DEP-35": "Ille-et-Vilaine",
    "DEP-36": "Indre",
    "DEP-37": "Indre-et-Loire",
    "DEP-38": "Isère",
    "DEP-39": "Jura",
    "DEP-40": "Landes",
    "DEP-41": "Loir-et-Cher",
    "DEP-42": "Loire",
    "DEP-43": "Haute-Loire",
    "DEP-44": "Loire-Atlantique",
    "DEP-45": "Loiret",
    "DEP-46": "Lot",
    "DEP-47": "Lot-et-Garonne",
    "DEP-48": "Lozère",
    "DEP-49": "Maine-et-Loire",
    "DEP-50": "Manche",
    "DEP-51": "Marne",
    "DEP-52": "Haute-Marne",
    "DEP-53": "Mayenne",
    "DEP-54": "Meurthe-et-Moselle",
    "DEP-55": "Meuse",
    "DEP-56": "Morbihan",
    "DEP-57": "Moselle",
    "DEP-58": "Nièvre",
    "DEP-59": "Nord",
    "DEP-60": "Oise",
    "DEP-61": "Orne",
    "DEP-62": "Pas-de-Calais",
    "DEP-63": "Puy-de-Dôme",
    "DEP-64": "Pyrénées-Atlantiques",
    "DEP-65": "Hautes-Pyrénées",
    "DEP-66": "Pyrénées-Orientales",
    "DEP-67": "Bas-Rhin",
    "DEP-68": "Haut-Rhin",
    "DEP-69": "Rhône",
    "DEP-70": "Haute-Saône",
    "DEP-71": "Saône-et-Loire",
    "DEP-72": "Sarthe",
    "DEP-73": "Savoie",
    "DEP-74": "Haute-Savoie",
    "DEP-75": "Paris",
    "DEP-76": "Seine-Maritime",
    "DEP-77": "Seine-et-Marne",
    "DEP-78": "Yvelines",
    "DEP-79": "Deux-Sèvres",
    "DEP-80": "Somme",
    "DEP-81": "Tarn",
    "DEP-82": "Tarn-et-Garonne",
    "DEP-83": "Var",
    "DEP-84": "Vaucluse",
    "DEP-85": "Vendée",
    "DEP-86": "Vienne",
    "DEP-87": "Haute-Vienne",
    "DEP-88": "Vosges",
    "DEP-89": "Yonne",
    "DEP-90": "Territoire de Belfort",
    "DEP-91": "Essonne",
    "DEP-92": "Hauts-de-Seine",
    "DEP-93": "Seine-Saint-Denis",
    "DEP-94": "Val-de-Marne",
    "DEP-95": "Val-d'Oise",
    "DEP-971": "Guadeloupe",
    "DEP-972": "Martinique",
    "DEP-973": "Guyane",
    "DEP-974": "La Réunion",
    "DEP-976": "Mayotte",
    "REG-01": "Guadeloupe",
    "REG-02": "Martinique",
    "REG-03": "Guyane",
    "REG-04": "La Réunion",
    "REG-06": "Mayotte",
    "REG-11": "Île-de-France",
    "REG-24": "Centre-Val de Loire",
    "REG-27": "Bourgogne-Franche-Comté",
    "REG-28": "Normandie",
    "REG-32": "Hauts-de-France",
    "REG-44": "Grand Est",
    "REG-52": "Pays de la Loire",
    "REG-53": "Bretagne",
    "REG-75": "Nouvelle-Aquitaine",
    "REG-76": "Occitanie",
    "REG-84": "Auvergne-Rhône-Alpes",
    "REG-93": "Provence-Alpes-Côte d'Azur",
    "REG-94": "Corse"
}
source_nom = "Tableau de bord de suivi de l'épidémie de coronavirus en France, par Etalab"
source_url = "https://data.widgets.dashboard.covid19.data.gouv.fr/"
source_type = "widgets.dashboard.covid19.data.gouv.fr"
data = {}

for typ, key in [("deces", "deces"), ("hospitalisations", "hospitalises"), ("soins_critiques", "reanimation"), ("retour_a_domicile", "gueris"), ("cas_positifs", "cas_confirmes"), ("vaccins_premiere_dose", "vaccines_premiere_dose"), ("vaccins_vaccines", "vaccines_entierement")]:
    with open(os.path.join("data", "france-%s.json" % typ)) as f:
        typdata = json.load(f)
        for gran in ["regions", "departements"]:
            for place in typdata[gran]:
                granularite = gran.rstrip("s")
                maille_code = "%s-%s" % ("REG" if gran == "regions" else "DEP", place["code_level"])
                maille_nom = noms.get(maille_code, "")
                for el in place["values"]:
                    if el["date"] not in data:
                        data[el["date"]] = {}
                    if maille_code not in data[el["date"]]:
                        data[el["date"]][maille_code] = {
                            "granularite": granularite,
                            "maille_nom": maille_nom
                        }
                    data[el["date"]][maille_code][key] = el["value"]


with open(os.path.join("data", "chiffres-cles.csv"), "a") as f:
    f.write("\n")
    writer = csv.writer(f)
    for dat in sorted(data.keys()):
        if dat <= "2021-08-12":
            continue
        for cod in sorted(data[dat].keys()):
            el = data[dat][cod]
            writer.writerow([dat, el["granularite"], cod, el["maille_nom"], "", "", "", "", el["deces"], "", el["reanimation"], el["hospitalises"], "", "", el["gueris"], "", source_nom, source_url, "", source_type])


last_vaccines_1st_values = {}
last_vaccines_full_values = {}
with open(os.path.join("data", "france.csv"), "w") as f:
    writer = csv.writer(f)
    writer.writerow(["date", "granularite", "maille_code", "maille_nom", "deces", "reanimation", "hospitalises", "gueris", "vaccines_premiere_dose", "vaccines_entierement", "source_nom", "source_url", "source_type"])
    for dat in sorted(data.keys()):
        for cod in sorted(data[dat].keys()):
            el = data[dat][cod]
            if el.get("vaccines_premiere_dose"):
                last_vaccines_1st_values[cod] = el["vaccines_premiere_dose"]
            if el.get("vaccines_entierement"):
                last_vaccines_full_values[cod] = el["vaccines_entierement"]
            writer.writerow([dat, el["granularite"], cod, el["maille_nom"], el.get("deces", ""), el.get("reanimation", ""), el.get("hospitalises", ""), el.get("gueris", ""), el.get("vaccines_premiere_dose", last_vaccines_1st_values.get(cod, "")), el.get("vaccines_entierement", last_vaccines_full_values.get(cod, "")), source_nom, source_url, source_type])
