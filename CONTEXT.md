# Context

Domain terms for this repo. Added lazily, as decisions resolve them — this is not
a complete glossary of the app, only the terms that carry design weight.

## Frame composition

**Scene** — everything needed to draw the video, already resolved. No show/hide
flags: narration hidden is `cues: []`, mosaic off is `mosaic: []`. Built by
`buildScene` from app state; transformed by `convertScene` for Chinese caption
conversion on the export path only. A Scene is the same object whether it is
being previewed, exported, thumbnailed or downloaded as a still.

**Frame** — what the exported video contains at one time `t`. Frames are
addressed by time only; `timeOfPoint(scene, i)` converts a camera point index to
its hold time for callers that think in points.

**Layer** — one positioned thing to draw, produced by `layersAt(scene, t, target)`.
The array order *is* the paint order, so hit-testing walks it reversed and cannot
disagree with what was drawn. Layers are plain data — computing them touches no
canvas, which is what makes frame composition testable.

**Chrome** — editor-only marks: guides, snap lines, the caption box, the safe
area, overlay handles. Never part of a Frame. Drawn by a separate `drawChrome`
pass, so the export path cannot draw chrome — it simply never calls it.

**Source view** — the whole-image editing projection (`composeSourceView`), used
by the camera tab. Same Scene, different projection: the source image fitted to
the canvas rather than framed by a camera. Shares mosaic and overlay drawing
with a Frame; shares nothing else.

**Measure** — `(text, font) => width`. Injected into `layersAt` so caption layout
can be computed without a canvas. Production supplies a canvas-backed measurer
carrying a font-generation stamp for cache invalidation; tests supply a
deterministic stub. Subtitle cue splitting uses the same seam.

## Notes

- **Output ratio is a property of the target, not a constant.** A Frame drawn to
  the 9:16 export canvas and a Frame drawn to a variable-ratio still share one
  implementation; the ratio comes from the target canvas.
