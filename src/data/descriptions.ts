/**
 * Long-form project descriptions, keyed by `${title}|${year}`.
 * Edit freely - these power the second right panel and the mobile sheet's
 * "About this project" view. Empty/missing keys hide the panel.
 */
export const PROJECT_DESCRIPTIONS: Record<string, string> = {
  "Pandemonium Paradiso|2025": [
    "Solo exhibition at O-Overgaden, Copenhagen, 29 August - 26 October 2025.",
    "Four roughly two-metre-tall coiled and carved earthenware vessels anchor an installation built up from hand-drawn line murals and figures painted directly onto the gallery walls. The vases are constructed by hand-coiling, then sliced and scored - an additive and subtractive process - until figures and motifs surface from the clay's skin, as if cut back to expose secrets or hidden bodies beneath the surface.",
    "Boumjimar's first major institutional solo, Pandemonium Paradiso reads as a stage for imagined coexistence: bodies, animals, and mythological figures cross-pollinate, boundaries loosen, and hierarchies relax into a single ecology.",
  ].join("\n\n"),

  "Beauty is the Best Defense|2026": [
    "Solo presentation at Jessica Silverman, San Francisco.",
    "A new body of glazed earthenware vessels and figures that turn ornament inward. Each vase is at once container and body - surfaces inscribed with figures, animals, and abstracted scenery that fold around the form. The title proposes ornament not as decoration but as armour: a way of staking a claim to a body that refuses fixed categories.",
  ].join("\n\n"),

  "Bodies Under Construction|2026": [
    "Solo at Møstings, The Frederiksberg Museums, Copenhagen - running through 7 June 2026.",
    "Boumjimar's most domestic-scale presentation: clay figures and vessels arranged across the historical rooms of Møstings, in dialogue with the building's ornament. The works treat the body as a site that is always being built, never finished - under perpetual construction by the cultural pressures and intimacies that pass through it.",
    "Installation photography by Mikkel Kaldal.",
  ].join("\n\n"),

  "Birds of Paradise|2026": [
    "Solo at Viborg Kunsthal, Viborg, Denmark.",
    "Birds of Paradise extends Boumjimar's interest in metamorphic figures into an aviary of glazed ceramic creatures. The works draw on mythological birds and queer iconographies of plumage and display, refusing the binary of natural / cultural by leaning fully into the ornamental.",
    "Installation photography by Jacob Friis-Holm Nielsen.",
  ].join("\n\n"),

  "Symbiosis (MFA)|2025": [
    "MFA graduation presentation at the Royal Danish Academy of Fine Arts, Copenhagen - Spring 2025.",
    "Five named works - One look at you and I turn into dust, Seasonal spark has faded, Two Lovers on a stallion, Elope, and Jumping through the Loop - establish a vocabulary of glazed earthenware figures that will recur across the 2025-2026 exhibitions. The series articulates a thesis on the body as a site of transformation, desire and ritual, drawing on mythological, ecological, and queer narratives.",
    "Installation photography by David Stjernholm.",
  ].join("\n\n"),

  "Mouths, Vessels, Portals|2025": [
    "Solo at Alice Folker Gallery, Copenhagen, 2025.",
    "A focused presentation of vessels treated as thresholds: openings, mouths, and portals carved into the surface of the clay. The vessel is reframed not as a container of contents but as a passageway between states.",
  ].join("\n\n"),

  "Deep Cuts|2025": [
    "Solo at CFHILL, Stockholm, 14 November - 30 December 2025.",
    "The exhibition announces a turn toward sculpture - toward clay, weight, gravity, and fragility. These are not vessels in the functional sense, nor sculptures in a classical one. They feel more like bodies interrupted mid-transformation.",
    "(From the Cultbytes review.)",
  ].join("\n\n"),

  "Stockholm Cosmologies|2026": [
    "Group exhibition at Liljevalchs Konsthall, Stockholm, 21 November 2025 - 11 January 2026.",
    "A multi-artist constellation in which Boumjimar contributes a small grouping of ceramic figures. The works fold neatly into the show's interest in cosmology: bodies as planets, planets as bodies, all in slow orbit.",
  ].join("\n\n"),

  "Kultuur|2025": [
    "Group exhibition at TINA Gallery, London, 2025.",
    "A London showing for a small group of vessels - Boumjimar's most recent return to a city he lived in for a decade prior to relocating to Copenhagen.",
  ].join("\n\n"),

  "Drawings|2025": [
    "An ongoing practice of watercolour, ink, and crayon drawings on handmade mulberry paper, often produced as scrolls or large sheets.",
    "Where the ceramics carry their figures inside the clay, the drawings push them outward in fluid, hallucinatory choreographies. Series include Cruising Parks (2024) and Queer Ecologies (2023).",
  ].join("\n\n"),

  "Spring Has Arrived|2023": [
    "Drawing-based contribution to Fear and Fauna, Dag H 42 / ARIEL - Feminisms in the Aesthetics, Copenhagen, 2023.",
    "An early example of the chaotic-figure drawing practice that becomes Boumjimar's signature on paper.",
  ].join("\n\n"),

  "Glory on Earth|2024": [
    "Performance and ceramic presentation at O Days Festival, Copenhagen, 2024.",
    "A performance staged within a ceramic installation - bodies and clay in proximity, both vulnerable, both witnesses.",
    "Photography by Robert Damisch.",
  ].join("\n\n"),

  "Psychopathia Sexualis|2021": [
    "Performance / group exhibition at Overgaden, Copenhagen, 2021.",
    "Boumjimar's earliest documented work in a Copenhagen institutional context - predating the ceramic practice. Performance with Young Boy Dancing Group, the collective Boumjimar has worked with since 2016.",
  ].join("\n\n"),
};

export function descriptionFor(title: string, year: number | string) {
  return PROJECT_DESCRIPTIONS[`${title}|${year}`];
}
