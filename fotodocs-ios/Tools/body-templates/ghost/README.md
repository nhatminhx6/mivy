# Ghost-suit templates (men's vest)

Source: headless suit PSDs (Drive folder "38 VEST DÁNG NAM", downloadonline.vn). Used: DL(9), retoned with `tone.py` → body-man-navy (navy) and body-man-black (black).

1. `pip install psd-tools` (own venv), then `python -I export.py <outdir> <file.psd>...` → the clothing layer (smart object) as RGBA PNG.
2. `python -I ghost.py <garment.png> <model.png> <model.json> <out.png> 0.06` puts the template model's head + neck
   (a prepped body template, e.g. man-navy-c-s37) behind the suit so the app can measure chin / jaw / collar.
   Scale the model up first so the garment keeps its own resolution (shrinking the suit made it blurry):
   factor = 1 / the `scale` ghost.py prints; scale the json values by the same factor.
3. `python -I tone.py <in.png> <out.png> navy|black` for a true navy / neutral black.
4. Copy png + json to `Packages/FotoDocsKit/Sources/FotoDocsImaging/Resources/Garments/body-man-<colour>.*`.

The json must carry `"ghost": 1`: the model's neck behind the suit is a stand-in for measuring only. The app never
draws it; it keeps the user's own neck inside the collar and patches what isn't bare skin from the skin around it
(`GarmentOverlay.compose`, `patch`). No shadow on the stand-in neck: darkened skin at the bottom of the V was not
recognised as skin and stayed on the suit as a grey patch.
