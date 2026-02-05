import { config } from "../../shared/config";
import type { StyleSpecification } from "maplibre-gl";


export const mapStyle: StyleSpecification = {
  version: 8,
  name: "OSM Raster",
  sources: {
    osm: {
      type: "raster",
      tiles: [config.tilesUrl],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
  ],
} as const;
