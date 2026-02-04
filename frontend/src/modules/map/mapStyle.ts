import { config } from "../../shared/config";

export const mapStyle = {
  version: 8,
  sources: {
    osm: { type: "raster", tiles: [config.tilesUrl], tileSize: 256 },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
} as any;
