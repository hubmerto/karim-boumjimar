// Structured CV data, scraped from karimboumjimar.com/cvs and the
// supplied PDF. Edit here to update the CV view; the downloadable PDF
// lives at public/cv.pdf.

export type CvEntry = {
  year: string;
  title: string;
  venue?: string;
  city?: string;
  country?: string;
  note?: string;
  /** External page (institution / press article / programme page).
   * When present, BioView renders the entry as a link with an ↗ glyph
   * matching the News page convention. */
  url?: string;
};

export const CV_BIO = {
  born: "1998",
  nationality: "Moroccan-Spanish",
  location: "Copenhagen",
  email: "karim@karimboumjimar.com",
  studioEmail: "goat@karimboumjimar.com",
};

export const CV_EDUCATION: CvEntry[] = [
  {
    year: "2025",
    title: "MFA, Royal Danish Academy of Fine Arts",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2020",
    title: "BFA, Central Saint Martins",
    city: "London",
    country: "UK",
  },
];

export const CV_SOLO: CvEntry[] = [
  {
    year: "2026",
    title: "Rites of Affection",
    venue: "Malva Museum",
    city: "Lahti",
    country: "FI",
    url: "https://malvamuseo.fi/en/exhibitions/karim-boumjimar-rites-of-affection/",
  },
  {
    year: "2026",
    title: "Bodies Under Construction",
    venue: "Møstings, The Frederiksberg Museums",
    city: "Copenhagen",
    country: "DK",
    url: "https://frederiksbergmuseerne.dk/en/udstillinger/karim-boumjimar/",
  },
  {
    year: "2026",
    title: "Birds of Paradise",
    venue: "Viborg Kunsthal",
    city: "Viborg",
    country: "DK",
    url: "https://artviewer.org/karim-boumjimar-at-viborg-kunsthal/",
  },
  {
    year: "2025",
    title: "Pandemonium Paradiso",
    venue: "O—Overgaden, Institute of Contemporary Art",
    city: "Copenhagen",
    country: "DK",
    url: "https://artviewer.org/karim-boumjimar-at-o-overgaden-copenhagen/",
  },
  {
    year: "2025",
    title: "Deep Cuts",
    venue: "CFHILL",
    city: "Stockholm",
    country: "SE",
    url: "https://cultbytes.com/in-stockholm-karim-boumjimars-insistence-on-mutability-is-defiant/",
  },
  {
    year: "2025",
    title: "Drawings from the Hotel",
    venue: "Pori Art Museum",
    city: "Pori",
    country: "FI",
    url: "https://www.poriartmuseum.fi/en/events/karim-boumjimar-drawings-from-the-hotel-2/",
  },
  {
    year: "2025",
    title: "Mouths, Vessels, Portals",
    venue: "Alice Folker Gallery",
    city: "Copenhagen",
    country: "DK",
    url: "https://alicefolker.dk/exhibitions/7-karim-boumjimar-mouths-vessels-portals/",
  },
];

export const CV_GROUP: CvEntry[] = [
  {
    year: "2026-27",
    title: "Génération Céramique",
    venue: "Fondation d'entreprise Bernardaud",
    city: "Limoges",
    country: "FR",
    url: "https://www.bernardaud.com/en/us/news/exposition-generation-ceramique",
  },
  {
    year: "2026",
    title: "Beauty Is the Best Defense",
    venue: "Jessica Silverman Gallery",
    city: "San Francisco",
    country: "US",
    url: "https://jessicasilvermangallery.com/online-shows/beauty-is-the-best-defense-ovr/",
  },
  {
    year: "2026",
    title: "Body Politics",
    venue: "Kuntsi Museum of Modern Art",
    city: "Vaasa",
    country: "FI",
    url: "https://vaasa.fi/koe-ja-nae/kulttuuria-vaasassa-ja-seudulla/vaasan-museot/nayttelyt-ja-tapahtumat/miettinen-collection-body-politics/",
  },
  {
    year: "2026",
    title: "I Can Buy Myself Flowers",
    venue: "Kunsthal N",
    city: "Copenhagen",
    country: "DK",
    url: "https://kunsthaln.dk/en/udstilling/i-can-buy-myself-flowers/",
  },
  {
    year: "2025",
    title: "Stockholm Cosmologies",
    venue: "Liljevalchs Konsthall",
    city: "Stockholm",
    country: "SE",
    url: "https://liljevalchs.se/en/kalender/stockholm-cosmologies/",
  },
  {
    year: "2025",
    title: "I Will Look Into the Earth",
    venue: "Kunsthalle Helsinki",
    city: "Helsinki",
    country: "FI",
    url: "https://taidehalli.fi/en/events/i-will-look-into-the-earth/",
  },
  {
    year: "2025",
    title: "This Is Just the Beginning",
    venue: "Miettinen Collection",
    city: "Berlin",
    country: "DE",
    url: "https://miettinen-collection.de/2025/10/26/this-is-just-the-beginning/",
  },
  {
    year: "2025",
    title: "Afgang (Royal Danish Academy graduate exhibition)",
    venue: "Kunsthal Charlottenborg",
    city: "Copenhagen",
    country: "DK",
    url: "https://afgangskataloget.dk/artist/karim-boumjimar/",
  },
  {
    year: "2025",
    title: "Charlottenborg Spring Exhibition",
    venue: "Kunsthal Charlottenborg",
    city: "Copenhagen",
    country: "DK",
    url: "https://artmap.com/kunsthalcharlottenborg/exhibition/charlottenborg-spring-exhibition-2025",
  },
  {
    year: "2025",
    title: "When Form Becomes Attitude",
    venue: "Robert Grunenberg",
    city: "Berlin",
    country: "DE",
    url: "https://robertgrunenberg.com/exhibition/when-form-becomes-attitude/",
  },
  {
    year: "2025",
    title: "Kultuur",
    venue: "TINA Gallery",
    city: "London",
    country: "UK",
    url: "https://saliva.live/exhibitions/66c4dd65",
  },
  {
    year: "2023",
    title: "Ecologías Queer",
    venue: "Centre d'Art La Panera",
    city: "Lleida",
    country: "ES",
    url: "https://www.lapanera.cat/en/programming/expositions/ecologies-queer-aberracions-naturalment-subversives",
  },
  {
    year: "2023",
    title: "Fear and Fauna",
    venue: "ARIEL – Feminism in the Aesthetic",
    note: "nomadic",
    country: "DK",
    url: "https://arielfeminisms.dk/#upcoming-fear-and-fauna",
  },
  {
    year: "2021",
    title: "Psychopathia Sexualis",
    venue: "O—Overgaden, Institute of Contemporary Art",
    city: "Copenhagen",
    country: "DK",
    url: "https://overgaden.org/en/exhibitions/psychopathia-sexualis",
  },
  {
    year: "2021",
    title: "Moby Dick; or The Whale (feature film)",
    venue: "Schauspielhaus",
    city: "Zürich",
    country: "CH",
  },
];

export const CV_PERFORMANCES: CvEntry[] = [
  {
    year: "2025",
    title: "Den Genfundne Bro",
    venue: "Horsens Art Museum",
    city: "Horsens",
    country: "DK",
  },
  {
    year: "2024",
    title: "Glory on Earth",
    venue: "O Days Festival",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2016-25",
    title: "Multiple performances with Young Boy Dancing Group",
    venue: "Schinkel Pavillon, Baltic Triennial 13, Café OTO and others",
  },
];

export const CV_RESIDENCIES: CvEntry[] = [
  {
    year: "2027",
    title: "International Studio & Curatorial Program (ISCP)",
    city: "New York City",
    country: "US",
    note: "forthcoming",
  },
];

export const CV_GRANTS: CvEntry[] = [
  {
    year: "2026",
    title: "Carl Nielsen and Anne Marie Carl-Nielsen Talent Award",
  },
  { year: "2026", title: "Danish Arts Foundation Working Grant" },
  {
    year: "2025",
    title: "Ulrica Hydman Vallien Foundation Talent Scholarship",
    url: "https://www.ulricahydmanvalliensstiftelse.se/the-scholarships/",
  },
  {
    year: "2025",
    title:
      "Symbiosis sculptural work received the Blix Prize at Kunsthal Charlottenborg",
  },
  {
    year: "2025",
    title: "Named one of Frieze’s Ten Artists to Watch",
    url: "https://www.frieze.com/article/ten-artists-watch-2025",
  },
  { year: "2025", title: "Danish Arts Foundation Working Grant" },
  { year: "2022", title: "Danish Arts Foundation Working Grant" },
  { year: "2021", title: "Danish Arts Foundation Working Grant" },
];

export const CV_COLLECTIONS = [
  "Art Museum of Contemporary Art (AMOCA Wales)",
  "Pori Art Museum",
  "Miettinen Collection",
  "Fondazione Fiera Milano",
  "The Danish Arts Foundation",
];

export const CV_PRESS: CvEntry[] = [
  {
    year: "2026",
    title: "Munchies Art Club — Bodies Under Construction",
    url: "https://www.munchiesart.club/karim-boumjimar-bodies-construction-mostings/",
  },
  {
    year: "2026",
    title: "Art Viewer — Bodies Under Construction at Frederiksberg",
    url: "https://artviewer.org/karim-boumjimar-at-frederiksberg-museum/",
  },
  {
    year: "2026",
    title: "Art Viewer — Birds of Paradise at Viborg Kunsthal",
    url: "https://artviewer.org/karim-boumjimar-at-viborg-kunsthal/",
  },
  {
    year: "2026",
    title: "Politiken — Interview",
    url: "https://politiken.dk/ibyen/art10617381/%C2%BBDer-er-ikke-s%C3%A5-meget-jeg-f%C3%B8ler-jeg-g%C3%A5r-glip-af.-Jo-m%C3%A5ske-lige-et-par-n%C3%A6tter-mere-p%C3%A5-Berghain%C2%AB",
  },
  {
    year: "2025",
    title: "Cultbytes — Insistence on Mutability is Defiant",
    url: "https://cultbytes.com/in-stockholm-karim-boumjimars-insistence-on-mutability-is-defiant/",
  },
  {
    year: "2025",
    title: "Dagens Industri Weekend — Feature",
    url: "https://www.di.se/nyheter/mestadels-formogna-som-koper-mina-verk/",
  },
  {
    year: "2025",
    title: "Art Viewer — Pandemonium Paradiso at O—Overgaden",
    url: "https://artviewer.org/karim-boumjimar-at-o-overgaden-copenhagen/",
  },
  {
    year: "2025",
    title: "Ceramics Now — weekly news roundup",
    url: "https://www.ceramicsnow.org/news/the-weeks-news-in-the-ceramic-art-world-october-22-2025/",
  },
  {
    year: "2025",
    title: "ELLE Danmark — Interview",
    url: "https://elle.dk/agenda/karriere/billedkunstner-karim-boumjimar-at-springe-ud-som-kunstner-var-i-virkeligheden-svaerere-end-at-springe-ud-som-queer/",
  },
  {
    year: "2025",
    title: "Frieze — Ten Artists to Watch in 2025",
    url: "https://www.frieze.com/article/ten-artists-watch-2025",
  },
  {
    year: "2024",
    title: "Politiken — Feature",
    url: "https://politiken.dk/kultur/design/art10131168/%C2%BBHun-stod-og-peb-s%C3%A5-jeg-hev-hende-op-i-sengen.-Det-skulle-jeg-nok-ikke-have-gjort%C2%AB",
  },
  {
    year: "2023",
    title: "Arts Help — Queer Ecologies",
    url: "https://www.artshelp.com/queer-ecologies-by-karim-boumjimar-chaotic-drawings-for-queer-rights/",
  },
  {
    year: "2016",
    title: "Dazed Digital — early @beigetype coverage",
    url: "https://www.dazeddigital.com/artsandculture/article/31032/1/teen-artist-removes-his-nipples-and-sells-them-as-art",
  },
];
