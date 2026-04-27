export const ARTIST_NAME = "Karim Boumjimar";

export const BIO_SHORT =
  "Karim Boumjimar (b. 1998, Málaga, Spain) is an artist whose work examines social hierarchies by exploring the ties between nature and identity. Rejecting human-centred perspectives, Boumjimar embraces hybridisation, underlining how society is entangled with surrounding ecologies.";

/** Biographical paragraphs — facts, places, education. */
export const BIO_PARAGRAPHS = [
  "Karim Boumjimar (b. 1998, Málaga, Spain) is a Spanish-Moroccan artist whose practice spans ceramics, drawing, performance, and publishing.",
  "He lives between Copenhagen, Stockholm, Berlin and Spain, after ten years in London. His studio is in Copenhagen.",
  "Boumjimar holds an MFA from the Royal Danish Academy of Fine Arts, Copenhagen (2025), and a BFA from Central Saint Martins, London. He is entirely self-taught in ceramics, developed through long hours of studio labour in Copenhagen. He has been a member of the performance collective Young Boy Dancing Group since 2016.",
];

/** Artist-statement paragraphs — describing the practice itself. */
export const ABOUT_PARAGRAPHS = [
  "Boumjimar's work examines social hierarchies by exploring the ties between nature and identity. Rejecting human-centred perspectives, he embraces hybridisation, underlining how society is entangled with surrounding ecologies.",
  "Across drawings and ceramics, bodies, myths, and environments merge in choreographies of desire, power, and vulnerability. Figures appear raw and hallucinatory, held in complete isolation from the external world — metamorphic beings that are simultaneously feminine, masculine, and animalistic, emerging with the fluidity of pigments, inks, and watercolours that echo the flesh.",
  "Identities cross-pollinate, boundaries loosen, and bodies conglomerate, released from hierarchical constraints. Boumjimar portrays this through works that function as stages for imagined forms of coexistence, drawing attention to marginalised communities and the systems that constrain them, exposing social and ecological harm. Through depictions of chaos and intimacy, and catalysed by affect and desire, his work imagines alternative modes of coexistence.",
  "Here, bodies survive extractive cultural pressures, moving, merging, and becoming worlds liberated from fixed binaries and rigid categories of identity. His works celebrate the diversity of sexual, racial, and ecological experiences, revealing a universe where humanity is plural, porous, and endlessly capable of transformation — a phantasmatic verification of certainties.",
];

/** Long-form bio combining both, used for the inspector default state. */
export const BIO_LONG = [...ABOUT_PARAGRAPHS, BIO_PARAGRAPHS[2]];

export const REPRESENTATION = [
  {
    name: "Alice Folker Gallery",
    city: "Copenhagen",
    url: "https://alicefolker.dk/artists/33-karim-boumjimar/overview/",
  },
  {
    name: "Helsinki Contemporary",
    city: "Helsinki",
    url: "https://helsinkicontemporary.com/artists/karim-boumjimar",
  },
] as const;

export const CONTACT = {
  email: "beigetype@gmail.com",
  instagram: "@beigetype",
  instagramUrl: "https://www.instagram.com/beigetype/",
};

export type NewsEntry = {
  date: string;
  text: string;
};

/** Reverse-chronological. */
export const NEWS: NewsEntry[] = [
  { date: "19 June 2026", text: "Group exhibition, Génération Céramique at Fondation d'entreprise Bernardaud, Limoges (19 June 2026 — 30 April 2027)." },
  { date: "10 April 2026", text: "Solo exhibition, Rites of Affection at Malva Museum, Lahti, with premiere of the film Traces of Spring (10 April — 13 September 2026)." },
  { date: "28 March 2026", text: "Solo exhibition, Bodies Under Construction at Møstings, Frederiksberg Museum (28 March — 7 June 2026)." },
  { date: "8 March 2026", text: "Group exhibition, I Can Buy Myself Flowers at Kunsthal N (8 March — 2 August 2026)." },
  { date: "5 March 2026", text: "Group exhibition, Beauty is the Best Defense at Jessica Silverman Gallery, San Francisco (5 March — 11 April 2026)." },
  { date: "5 February 2026", text: "Interview in Politiken." },
  { date: "24 January 2026", text: "Group exhibition, Body Politics at Kuntsi Museum of Modern Art (24 January — 4 April 2026)." },
  { date: "23 January 2026", text: "Solo exhibition, Birds of Paradise at Viborg Kunsthal (23 January — 10 May 2026)." },
  { date: "18 December 2025", text: "Article in Cultbytes." },
  { date: "10 December 2025", text: "Interview in Dagens Industri Weekend." },
  { date: "21 November 2025", text: "Recipient of Ulrica Hydman Vallien Foundation grant." },
  { date: "14 November 2025", text: "Solo exhibition, Deep Cuts at CFHILL, Stockholm (14 November — 30 December 2025)." },
  { date: "1 November 2025", text: "Group exhibition, I Will Look Into the Earth at Helsinki Kunsthalle (1 November 2025 — 11 January 2026)." },
  { date: "9 October 2025", text: "Solo exhibition, Mouths, Vessels, Portals at Alice Folker Gallery (9 October — 28 November 2025)." },
  { date: "29 August 2025", text: "Solo exhibition, Pandemonium Paradiso at Overgaden Institute of Contemporary Art (29 August — 26 October 2025)." },
  { date: "27 June 2025", text: "Article in ELLE Danmark." },
  { date: "20 June 2025", text: "Group exhibition, When Form Becomes Attitude at Robert Grunenberg, Berlin (20 June — 9 August 2025)." },
  { date: "17 May 2025", text: "Solo exhibition, Drawings from the Hotel at Pori Art Museum (17 May — 6 July 2025)." },
  { date: "11 April 2025", text: "Ceramic installation Symbiosis received the 2025 Blix Prize." },
  { date: "4 April 2025", text: "Participation in MiArt, Milan (4 — 6 April 2025)." },
  { date: "6 February 2025", text: "Group exhibition, Charlottenborg Spring Exhibition at Kunsthal Charlottenborg (6 February — 9 March 2025)." },
  { date: "17 January 2025", text: "Duo exhibition, Kultuur at TINA Gallery, London (17 January — 1 March 2025)." },
  { date: "January 2025", text: 'Named one of the "Ten Artists to Watch in 2025" by Frieze.' },
  { date: "November 2024", text: "Article in Politiken." },
  { date: "28 October 2023", text: "Group exhibition, Queer Ecologies: Naturally Subversive Aberrations at Centre d'Art la Panera (28 October 2023 — 28 January 2024)." },
];

export type ExhibitionEntry = {
  year: string;
  title: string;
  venue: string;
  city?: string;
  date?: string;
  type?: "solo" | "group" | "duo" | "performance";
};

export const EXHIBITIONS: ExhibitionEntry[] = [
  // 2026
  { year: "2026", title: "Bodies Under Construction", venue: "Møstings, Frederiksberg Museum", city: "Copenhagen", date: "28 March – 7 June", type: "solo" },
  { year: "2026", title: "Beauty Is the Best Defense", venue: "Jessica Silverman Gallery", city: "San Francisco", date: "5 March – 18 April", type: "solo" },
  { year: "2026", title: "Birds of Paradise", venue: "Viborg Kunsthal", city: "Viborg", date: "23 January – 10 May", type: "solo" },
  // 2025
  { year: "2025", title: "Stockholm Cosmologies", venue: "Liljevalchs Konsthall", city: "Stockholm", date: "21 November – 11 January 2026", type: "group" },
  { year: "2025", title: "Deep Cuts", venue: "CFHILL", city: "Stockholm", date: "14 November – 30 December", type: "solo" },
  { year: "2025", title: "Pandemonium Paradiso", venue: "Overgaden Institute for Contemporary Art", city: "Copenhagen", date: "29 August – 26 October", type: "solo" },
  { year: "2025", title: "Symbiosis", venue: "Kunsthal Charlottenborg", city: "Copenhagen", date: "12 April – 10 August", type: "solo" },
  { year: "2025", title: "Club", venue: "Performance", date: "1 February", type: "performance" },
  { year: "2025", title: "Kultuur", venue: "TINA Gallery", city: "London", date: "16 January – 1 March", type: "duo" },
  // 2024
  { year: "2024", title: "Glory on Earth", venue: "O Days Festival", city: "Copenhagen", date: "3 August", type: "performance" },
  // 2023
  { year: "2023", title: "Spring Has Arrived", venue: "Dag H 42 / ARIEL", city: "Copenhagen", date: "4 May – 18 June", type: "group" },
  // 2021
  { year: "2021", title: "Psychopathia Sexualis", venue: "Overgaden Institute for Contemporary Art", city: "Copenhagen", date: "14 August – 10 October", type: "performance" },
];

export const GRANT_INFO = {
  title: "Working-Class Creative Grant",
  intro:
    "A one-off 500 Euro grant awarded throughout the year to a different working-class creative anywhere in the world, funded through art sales.",
  body: [
    "The grant targets individuals who receive little or no institutional support and who would benefit from practical financial assistance. Recipients can use funds flexibly — for materials, equipment, research, travel, studio costs, or living expenses.",
    "There are no strings attached and no expectation of exchange. Applications remain in consideration indefinitely with rolling reviews throughout the year and no fixed deadline.",
    "Previous recipients (2025–2026) include artists and organizations working in visual arts, photography, and community services across international locations.",
  ],
  applyEmail: "karim@karimboumjimar.com",
  applySubject: "Grant: Your Name",
  applyChecklist: [
    "Brief personal introduction",
    "Work sample or description of interests / situation",
    "Contact information",
  ],
};
