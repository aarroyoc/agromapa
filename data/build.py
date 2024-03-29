import pandas as pd
import numpy as np
import json

# iconv -f ISO-8859-1 -t UTF-8 herbaceos.csv > herbaceos_utf8.csv
# iconv -f ISO-8859-1 -t UTF-8 leñosos.csv > leñosos_utf8.csv

df = pd.read_csv("herbaceos_utf8.csv",sep=";")
dl = pd.read_csv("leñosos_utf8.csv",sep=";")

def calcular_ine(row):
    provincia = int(row["Codigo Provincia"])
    municipio = int(row["Codigo Municipio"])
    return "{:02d}{:03d}".format(provincia,municipio)

def calcular_ocupacion(row):
    a = row["Ocupación Primera Secano"]
    b = row["Ocupaciones Posteriores Secano"]
    c = row["Ocupación Primera Regadío"]
    d = row["Ocupaciones Posteriores Regadío"]
    s = np.array([a,b,c,d])
    s = np.nan_to_num(s)
    s = s.sum()
    return s

def calcular_superficie(row):
    a = row["Superficie Secano que no produce"]
    b = row["Superficie Secano en producción"]
    c = row["Superficie Regadío que no produce"]
    d = row["Superficie Regadío en producción"]
    s = np.array([a,b,c,d])
    s = np.nan_to_num(s)
    s = s.sum()
    return s


df["INE"] = df.apply(calcular_ine,axis=1)
df["Ocupacion"] = df.apply(calcular_ocupacion,axis=1)
delete_columns = ["Municipio",
    "Codigo Comarca",
    "Comarca",
    "Codigo Provincia",
    "Codigo Municipio",
    "codigo producto",
    "Ocupación Primera Secano",
    "Ocupaciones Posteriores Secano",
    "Ocupación Primera Regadío",
    "Ocupaciones Posteriores Regadío"]
df = df.drop(delete_columns, axis=1)

dl["INE"] = dl.apply(calcular_ine,axis=1)
dl["Ocupacion"] = dl.apply(calcular_superficie,axis=1)
delete_columns = ["Municipio",
    "Codigo Comarca",
    "Comarca",
    "Codigo Provincia",
    "Codigo Municipio",
    "codigo producto",
    "Superficie Secano que no produce",
    "Superficie Secano en producción",
    "Superficie Regadío que no produce",
    "Superficie Regadío en producción"]
dl = dl.drop(delete_columns, axis=1)

with open("Castile and León_AL8.GeoJson") as f:
    geojson = json.load(f)

for feature in geojson["features"]:
    code = feature["properties"]["alltags"]["ine:municipio"]
    df_town = df[df["Año"]==2017]
    df_town = df_town[df_town["INE"]==code]
    dl_town = dl[dl["Año"]==2017]
    dl_town = dl_town[dl_town["INE"]==code]
    cultivos = list()
    cultivos.extend(df_town[["cultivo","Ocupacion"]].values.tolist())
    cultivos.extend(dl_town[["cultivo","Ocupacion"]].values.tolist())
    feature["properties"]["cultivos"] = cultivos
    feature["properties"]["cultivos"].sort(key=lambda x: x[1],reverse=True)

with open("AgroMapa.GeoJson","w") as f:
    json.dump(geojson,f)

"""
for year in range(2010,2018):
    df_year = df[df["Año"]==year]
    df_year.to_csv(f"herbaceos_{year}.csv",index=False)
"""
    