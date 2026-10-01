# Reject before integration
Footer paints over continuation: availableH=maxFootY-reqY allocates rows all the way to maxFootY, cue is then placed at maxFootY, and footer fill begins at actualFootY<=maxFootY. Thus cue is always erased for >3 points, and last row can be covered. Reserve cue+gap BEFORE allocating rows, based on actualFootY.
Also fields.salary now overrides edited copy.subline, regressing edit preservation. Prefer copy.subline when present; apply SALARY label only when displayed value equals supplied salary. Text height uses character-count heuristic, not requested measured wrapping.
Next revision must address these exact issues; do not apply change.patch. No product edits made.
