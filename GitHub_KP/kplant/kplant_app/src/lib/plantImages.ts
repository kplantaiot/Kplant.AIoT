/**
 * Maps scientific_name → public image path.
 * Images live in /public/plants/.
 * Add more entries as new photos are added.
 */
export const PLANT_IMAGES: Record<string, string> = {
  "Monstera deliciosa":             "/plants/b21df3ff65f7f994010c016fa9dd4281.jpg",
  "Monstera adansonii":             "/plants/f7995d0ca3f29200fbe43fc3de9f92f6.jpg",
  "Philodendron hederaceum":        "/plants/0a520115efebe7544e320c55155e04cb.jpg",
  "Philodendron gloriosum":         "/plants/e0443714cc08209ef5106995ac411e9c.jpg",
  "Aglaonema commutatum":           "/plants/7b9253327d64e6f6658cffb765a8913f.jpg",
  "Epipremnum aureum":              "/plants/c169cd07082b041bdac4a4f87b110c11.jpg",
  "Syngonium podophyllum":          "/plants/ae6b31e0aca68a89e4076b282a903931.jpg",
  "Alocasia amazonica":             "/plants/5ebfa37281d853466f96a26749001b86.jpg",
  "Calathea ornata":                "/plants/14bf04fea01c7c7c5939465365778761.jpg",
  "Calathea lancifolia":            "/plants/912495707cf579c3d023bab20889d964.jpg",
  "Dracaena trifasciata":           "/plants/8534b9dd5d610ac701a4c74980c5d9eb.jpg",
  "Dracaena marginata":             "/plants/dcc3834188c405f0498e07d0bfb20911.jpg",
  "Ficus elastica":                 "/plants/94342b74325e234b0310080e6821cb71.jpg",
  "Peperomia argyreia":             "/plants/6ba72c0c4d72ddf9076373c8f32be982.jpg",
  "Tradescantia zebrina":           "/plants/534715d8ca8f7f923cd94d71fce1f616.jpg",
  "Chlorophytum comosum":           "/plants/3ae60bf4f44645b031a68a096d2a184d.jpg",
  "Schlumbergera bridgesii":        "/plants/9fc87d6067e0a2f9c5539549cf0ba7c3.jpg",
};

export function getPlantImage(species: string | null | undefined): string | null {
  if (!species) return null;
  return PLANT_IMAGES[species] ?? null;
}
