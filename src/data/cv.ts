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
  },
  {
    year: "2026",
    title: "Bodies Under Construction",
    venue: "Møstings, The Frederiksberg Museums",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2026",
    title: "Birds of Paradise",
    venue: "Viborg Kunsthal",
    city: "Viborg",
    country: "DK",
  },
  {
    year: "2025",
    title: "Pandemonium Paradiso",
    venue: "O—Overgaden, Institute of Contemporary Art",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2025",
    title: "Deep Cuts",
    venue: "CFHILL",
    city: "Stockholm",
    country: "SE",
  },
  {
    year: "2025",
    title: "Drawings from the Hotel",
    venue: "Pori Art Museum",
    city: "Pori",
    country: "FI",
  },
  {
    year: "2025",
    title: "Mouths, Vessels, Portals",
    venue: "Alice Folker Gallery",
    city: "Copenhagen",
    country: "DK",
  },
];

export const CV_GROUP: CvEntry[] = [
  {
    year: "2026-27",
    title: "Génération Céramique",
    venue: "Fondation d'entreprise Bernardaud",
    city: "Limoges",
    country: "FR",
  },
  {
    year: "2026",
    title: "Beauty Is the Best Defense",
    venue: "Jessica Silverman Gallery",
    city: "San Francisco",
    country: "US",
  },
  {
    year: "2026",
    title: "Body Politics",
    venue: "Kuntsi Museum of Modern Art",
    city: "Vaasa",
    country: "FI",
  },
  {
    year: "2026",
    title: "I Can Buy Myself Flowers",
    venue: "Kunsthal N",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2025",
    title: "Stockholm Cosmologies",
    venue: "Liljevalchs Konsthall",
    city: "Stockholm",
    country: "SE",
  },
  {
    year: "2025",
    title: "I Will Look Into the Earth",
    venue: "Kunsthalle Helsinki",
    city: "Helsinki",
    country: "FI",
  },
  {
    year: "2025",
    title: "This Is Just the Beginning",
    venue: "Miettinen Collection",
    city: "Berlin",
    country: "DE",
  },
  {
    year: "2025",
    title: "Afgang (Royal Danish Academy graduate exhibition)",
    venue: "Kunsthal Charlottenborg",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2025",
    title: "Charlottenborg Spring Exhibition",
    venue: "Kunsthal Charlottenborg",
    city: "Copenhagen",
    country: "DK",
  },
  {
    year: "2025",
    title: "Kultuur",
    venue: "TINA Gallery",
    city: "London",
    country: "UK",
  },
  {
    year: "2023",
    title: "Ecologías Queer",
    venue: "Centre d'Art La Panera",
    city: "Lleida",
    country: "ES",
  },
  {
    year: "2021",
    title: "Psychopathia Sexualis",
    venue: "O—Overgaden, Institute of Contemporary Art",
    city: "Copenhagen",
    country: "DK",
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
  },
  {
    year: "2025",
    title:
      "Symbiosis sculptural work received the Blix Prize at Kunsthal Charlottenborg",
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
    title: "Kultur Information - Birds of Paradise review by Kirsten Kytner",
  },
  { year: "2026", title: "Politiken - Interview" },
  { year: "2025", title: "Frieze - Ten Artists to Watch in 2025" },
  { year: "2025", title: "Cultbytes - Feature by Jalane Note" },
  { year: "2025", title: "ELLE Denmark - Interview by Ditlev Fejerskov" },
  {
    year: "2025",
    title: "Kunstkritikk - Dionysus at Berghain by Louise Steiwer",
  },
  { year: "2025", title: "Dagens Industri Weekend - Feature" },
  { year: "2024", title: "Politiken - Feature" },
];
