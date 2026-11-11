# data/

`volve.json` – compact extract of the **Volve field dataset** released by Equinor (Volve Data Village, 2018) under the
Equinor Open Data Licence. Attribution: "Contains data from the Volve field, courtesy of Equinor ASA and the Volve licence
partners." Source: https://www.equinor.com/energy/volve-data-sharing

Contents: wellhead coordinates and KB from LAS headers; MD/TVD pairs (MWD TVD channels, formation-pressure file headers);
temperature points from formation-pressure tests (03.PRESSURE: maximum TEMP/AQAT per test or pTEMP); 5 m median-binned
GR, DT, RHOB, NPHI, RT logs; 3D/2D seismic metadata, survey corners and the seismic status report.
Rebuild: `python tools/build_volve.py <Volve folder> data/volve.json`.

LWD tool temperatures are measured with mud circulating and are lower bounds of static formation temperature.
