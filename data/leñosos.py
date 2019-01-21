import pandas as pd
import numpy as np

# iconv -f ISO-8859-1 -t UTF-8 leñosos.csv > leñosos_utf8.csv

df = pd.read_csv("leñosos_utf8.csv",sep=";")

def calcular_ine(row):
    provincia = int(row["Codigo Provincia"])
    municipio = int(row["Codigo Municipio"])
    return "{:02d}{:03d}".format(provincia,municipio)

def calcular_ocupacion(row):
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
    "Superficie Secano que no produce",
    "Superficie Secano en producción",
    "Superficie Regadío que no produce",
    "Superficie Regadío en producción"]
df = df.drop(delete_columns, axis=1)
for year in range(2010,2018):
    df_year = df[df["Año"]==year]
    df_year.to_csv(f"leñosos_{year}.csv",index=False)