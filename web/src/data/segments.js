/**
 * segments.js — per-segment design and data for the Hopkins corridor.
 *
 * Source: City of Berkeley staff report (May 10, 2022) and Workshop 4.3
 * (March 14, 2022). Parking figures verified against
 * data/processed/parking_data.json. Vehicle volumes from
 * data/processed/streetlight_verified.json (2025, StL Volume).
 *
 * BOUNDARY NOTE: Streetlight zones split the commercial strip at Sacramento
 * Ave. Design segments split it at Monterey Ave. mcgee-monterey and
 * monterey-gilman each partially overlap the Streetlight "Sacramento to McGee"
 * zone. Vehicle volumes for those two segments are the nearest enclosing zone
 * volume — not a segment-level figure. Disclose this in any UI displaying them.
 */

export const SEGMENTS = [
  {
    id: 'sutter-alameda',
    label: 'Sutter St to The Alameda',
    character: 'Residential — single-family homes, North Branch Library',
    proposed_design: {
      southside: 'Parking-protected bike lane (eastbound/uphill)',
      northside: 'Class II buffered bike lane (westbound/downhill)',
      parking: 'Retained on both sides',
      intersection_treatment: 'Modified Alameda intersection — beveled curbs, rose-colored islands',
    },
    parking_impact: 'No net loss',
    parking_spaces_lost: 0,
    source_page: 3,
    source_doc: 'Hopkins Corridor Project Conceptual Design, May 2022',
    streetlight: {
      vehicle_volume_daily: 1625,
      vehicle_volume_year: 2025,
      vehicle_zone: 'Alameda to Sutter',
      zone_match: 'exact',
      note: 'Eastern end — lowest vehicle volumes on the project corridor',
    },
    design_images: [
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900318/Screenshot_2026-03-18_at_11.05.13_PM_qpmwwv.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900383/Screenshot_2026-03-18_at_11.06.18_PM_v5f0qf.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900338/Screenshot_2026-03-18_at_11.05.32_PM_gsvc2a.png',
    ],
    intersection_image: 'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900352/Screenshot_2026-03-18_at_11.05.47_PM_wqxd3q.png',
    design_images_caption: 'Proposed treatment — Sutter St to The Alameda (east to west). Source: Hopkins Corridor Project Conceptual Design, May 2022.',
  },
  {
    id: 'alameda-mcgee',
    label: 'The Alameda to McGee Ave',
    character: 'Transitional — residential to commercial approach',
    proposed_design: {
      southside: 'Two-way protected bikeway with buffer zone',
      parking: 'Most on-street parking retained both sides',
      lane_width: 'Narrowed from 11ft to 10.5ft',
      intersection_treatment: 'Bulbouts at Josephine St, raised crosswalk',
    },
    parking_impact: 'Minimal loss',
    parking_spaces_lost: null, // exact count requires design map images
    source_page: 3,
    source_doc: 'Hopkins Corridor Project Conceptual Design, May 2022',
    streetlight: {
      vehicle_volume_daily: 2588,
      vehicle_volume_year: 2025,
      vehicle_zone: 'McGee to Alameda',
      zone_match: 'exact',
      note: null,
    },
    design_images: [
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900403/Screenshot_2026-03-18_at_11.06.38_PM_dpjpzr.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900538/Screenshot_2026-03-18_at_11.08.52_PM_n78nbz.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900556/Screenshot_2026-03-18_at_11.09.07_PM_ynbmw0.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900640/Screenshot_2026-03-18_at_11.10.33_PM_l48s86.png',
    ],
    intersection_image: 'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900696/Screenshot_2026-03-18_at_11.11.29_PM_qiak0s.png',
    design_images_caption: 'Proposed treatment — The Alameda to McGee Ave (east to west). Source: Hopkins Corridor Project Conceptual Design, May 2022.',
  },
  {
    id: 'mcgee-monterey',
    label: 'McGee Ave to Monterey Ave',
    character: 'Commercial strip approach',
    proposed_design: {
      southside: 'Bi-directional protected bikeway, protected by parked vehicles',
      parking: 'All parking retained on south side except one stall',
      loading: 'Buffer zone for separation and loading',
    },
    parking_impact: 'One space lost',
    parking_spaces_lost: 1,
    source_page: 3,
    source_doc: 'Workshop 4.3, March 14 2022',
    streetlight: {
      // Nearest zone is "Sacramento to McGee" — spans Sacramento to McGee,
      // larger than this segment (McGee to Monterey). Use with disclosure.
      vehicle_volume_daily: 5553,
      vehicle_volume_year: 2025,
      vehicle_zone: 'Sacramento to McGee',
      zone_match: 'partial — zone boundary (Sacramento) does not match segment boundary (Monterey)',
      note: 'Highest pedestrian zone activity on corridor is Sacramento to McGee (1,026 daily, 2022)',
    },
    design_images: [
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773900994/Screenshot_2026-03-18_at_11.16.30_PM_myzi1s.png',
    ],
    intersection_image: 'https://res.cloudinary.com/dbwkloipb/image/upload/v1773901058/Screenshot_2026-03-18_at_11.17.34_PM_wzs74d.png',
    design_images_caption: 'Proposed treatment — McGee Ave to Monterey Ave. Source: Workshop 4.3, March 14 2022.',
  },
  {
    id: 'monterey-gilman',
    label: 'Monterey Ave to Gilman St',
    character: 'Commercial strip core — most contested blocks',
    proposed_design: {
      southside: 'Bi-directional bikeway protected by raised concrete median',
      parking: 'All parking removed both sides',
      intersection_treatment: 'Bulbout at California/Monterey, raised crosswalk across Monterey (fatality location), raised median on northeast corner',
    },
    parking_impact: 'All on-street parking removed',
    parking_spaces_lost: null, // exact count requires design map images
    parking_spaces_retained: 0,
    fatality_note: '2017 pedestrian fatality at Hopkins/Monterey — raised crosswalk proposed here',
    source_page: '3–4',
    source_doc: 'Workshop 4.3, March 14 2022',
    streetlight: {
      // Spans two Streetlight zones: "Sacramento to McGee" (eastern portion)
      // and "Gilman to Sacramento" (western portion). Volume shown is for
      // "Gilman to Sacramento" — the larger zone covering most of this segment.
      vehicle_volume_daily: 7526,
      vehicle_volume_year: 2025,
      vehicle_zone: 'Gilman to Sacramento',
      zone_match: 'partial — segment spans two Streetlight zones (Sacramento-McGee and Gilman-Sacramento)',
      note: 'Site of 2017 pedestrian fatality at Hopkins/Monterey',
    },
    design_images: [
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773901018/Screenshot_2026-03-18_at_11.16.54_PM_o9bbkb.png',
      'https://res.cloudinary.com/dbwkloipb/image/upload/v1773901038/Screenshot_2026-03-18_at_11.17.14_PM_wyiecm.png',
    ],
    intersection_image: 'https://res.cloudinary.com/dbwkloipb/image/upload/v1773901058/Screenshot_2026-03-18_at_11.17.34_PM_wzs74d.png',
    design_images_caption: 'Proposed treatment — Monterey Ave to Gilman St. Source: Workshop 4.3, March 14 2022.',
  },
]

export const SOURCE_DOC = {
  title: 'Hopkins Corridor Project Conceptual Design',
  organization: "City of Berkeley City Manager's Office",
  date: 'May 10, 2022',
  url: 'https://berkeleyca.gov/sites/default/files/2022-04/2022-05-10%20Item%2033%20Hopkins%20Corridor%20Project.pdf',
}

// Keyed lookup for CorridorMap click handler
export const SEGMENTS_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]))
