/** Small offline gazetteer so the mock map can place common destinations without an API. */
export const KNOWN_PLACES: Record<string, { lat: number; lng: number; region: string }> = {
  bangalore: { lat: 12.9716, lng: 77.5946, region: "Karnataka" },
  bengaluru: { lat: 12.9716, lng: 77.5946, region: "Karnataka" },
  mysore: { lat: 12.2958, lng: 76.6394, region: "Karnataka" },
  hampi: { lat: 15.335, lng: 76.46, region: "Karnataka" },
  gokarna: { lat: 14.55, lng: 74.32, region: "Karnataka" },
  coorg: { lat: 12.42, lng: 75.74, region: "Karnataka" },
  kochi: { lat: 9.9312, lng: 76.2673, region: "Kerala" },
  cochin: { lat: 9.9312, lng: 76.2673, region: "Kerala" },
  munnar: { lat: 10.0889, lng: 77.0595, region: "Kerala" },
  alleppey: { lat: 9.4981, lng: 76.3388, region: "Kerala" },
  alappuzha: { lat: 9.4981, lng: 76.3388, region: "Kerala" },
  varkala: { lat: 8.7379, lng: 76.7163, region: "Kerala" },
  wayanad: { lat: 11.6854, lng: 76.132, region: "Kerala" },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366, region: "Kerala" },
  trivandrum: { lat: 8.5241, lng: 76.9366, region: "Kerala" },
  kovalam: { lat: 8.4004, lng: 76.9787, region: "Kerala" },
  chennai: { lat: 13.0827, lng: 80.2707, region: "Tamil Nadu" },
  pondicherry: { lat: 11.9416, lng: 79.8083, region: "Puducherry" },
  ooty: { lat: 11.4102, lng: 76.695, region: "Tamil Nadu" },
  madurai: { lat: 9.9252, lng: 78.1198, region: "Tamil Nadu" },
  goa: { lat: 15.2993, lng: 74.124, region: "Goa" },
  mumbai: { lat: 19.076, lng: 72.8777, region: "Maharashtra" },
  pune: { lat: 18.5204, lng: 73.8567, region: "Maharashtra" },
  hyderabad: { lat: 17.385, lng: 78.4867, region: "Telangana" },
  jaipur: { lat: 26.9124, lng: 75.7873, region: "Rajasthan" },
  udaipur: { lat: 24.5854, lng: 73.7125, region: "Rajasthan" },
  jodhpur: { lat: 26.2389, lng: 73.0243, region: "Rajasthan" },
  jaisalmer: { lat: 26.9157, lng: 70.9083, region: "Rajasthan" },
  pushkar: { lat: 26.4899, lng: 74.5511, region: "Rajasthan" },
  delhi: { lat: 28.6139, lng: 77.209, region: "Delhi" },
  "new delhi": { lat: 28.6139, lng: 77.209, region: "Delhi" },
  agra: { lat: 27.1767, lng: 78.0081, region: "Uttar Pradesh" },
  varanasi: { lat: 25.3176, lng: 82.9739, region: "Uttar Pradesh" },
  rishikesh: { lat: 30.0869, lng: 78.2676, region: "Uttarakhand" },
  manali: { lat: 32.2432, lng: 77.1892, region: "Himachal Pradesh" },
  dharamshala: { lat: 32.219, lng: 76.3234, region: "Himachal Pradesh" },
  leh: { lat: 34.1526, lng: 77.5771, region: "Ladakh" },
  kolkata: { lat: 22.5726, lng: 88.3639, region: "West Bengal" },
  darjeeling: { lat: 27.041, lng: 88.2663, region: "West Bengal" },
  gangtok: { lat: 27.3389, lng: 88.6065, region: "Sikkim" },
  shillong: { lat: 25.5788, lng: 91.8933, region: "Meghalaya" },
};

export function lookupPlace(name: string) {
  return KNOWN_PLACES[name.trim().toLowerCase()];
}

/** Very rough outline of India for the offline mock map (lat, lng). Not for navigation. */
export const INDIA_OUTLINE: [number, number][] = [
  [8.08, 77.55], [8.5, 76.9], [9.9, 76.2], [11.25, 75.77], [12.9, 74.85], [15.5, 73.8], [19.0, 72.8],
  [21.2, 72.8], [22.3, 72.6], [21.7, 72.15], [20.9, 70.4], [21.6, 69.6], [22.2, 68.97], [23.5, 68.5],
  [24.3, 68.8], [25.5, 70.2], [27.0, 70.0], [28.0, 71.5], [30.0, 73.8], [32.5, 74.6], [34.5, 74.0],
  [35.5, 77.0], [32.5, 79.0], [30.5, 80.2], [28.6, 81.0], [26.8, 84.0], [26.4, 88.0], [27.5, 88.8],
  [27.8, 92.0], [28.2, 95.5], [27.0, 96.8], [24.0, 94.5], [22.0, 93.0], [23.5, 91.5], [22.0, 89.0],
  [21.5, 87.0], [20.0, 86.4], [19.3, 85.0], [17.7, 83.3], [16.3, 81.2], [15.0, 80.1], [13.1, 80.3],
  [11.8, 79.8], [10.3, 79.85], [9.3, 79.2], [8.08, 77.55],
];
