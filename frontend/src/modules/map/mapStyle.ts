import type { StyleSpecification } from "maplibre-gl";
import { config } from "../../shared/config";


export const mapStyle: StyleSpecification = {
  // glyphs: "https://metark.ai/glyphs/{fontstack}/{range}.pbf",
  glyphs:"https://d2p2zorx0aji3h.cloudfront.net/fonts/{fontstack}/{range}.pbf",

  
  version: 8,
  name: "FPM Vector (PMTiles)",

  sources: {
    openmaptiles: {
      type: "vector",
      url: `pmtiles://${config.pmtilesUrl}`,
    },
  },

  layers: [
    // 背景
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f8f9fa" },
    },

    // 水域
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "fill-color": "#a0c8f0",
      },
    },

    // 陆地覆盖
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: {
        "fill-color": "#e5e5e5",
      },
    },

    // 道路
    {
      id: "roads",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      paint: {
        "line-color": "#ffffff",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5, 0.5,
          10, 1.2,
          14, 2.5,
        ],
      },
    },

    // 建筑
    {
      id: "buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      paint: {
        "fill-color": "#d1d1d1",
        "fill-opacity": 0.7,
      },
    },

    // 道路名（常见层：transportation_name）
    {
      id: "transportation-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:zh"], ["get", "name"], ["get", "ref"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 14, 16, 16],
        "text-max-angle": 30,
        "text-padding": 2,
        "text-keep-upright": true
      },
      paint: {
        "text-color": "#2b2b2b",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1
      }
    },

    // 地名（常见层：place）
    {
      id: "place-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      layout: {
        "text-field": ["coalesce", ["get", "name:zh"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 14, 14, 18],
        "text-anchor": "center",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#111111",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2
      }
    },

    // POI 文字（常见层：poi）
    {
      id: "poi-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "poi",
      minzoom: 14,
      layout: {
        "text-field": ["coalesce", ["get", "name:zh"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-offset": [0, 0.6],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#333333",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1
      }
    }

  ],
};
