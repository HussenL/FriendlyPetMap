import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "./mapStyle";
import { listIncidents } from "../incidents/service";
import { postComment } from "../comments/service";

export function MapPage() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const map = new maplibregl.Map({
      container: ref.current,
      center: [121.5654, 25.033],
      zoom: 11,
      style: mapStyle,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      const incidents = await listIncidents();

      for (const it of incidents) {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "999px";
        el.style.background = "red";

        el.onclick = async () => {
          const text = prompt(`给「${it.title}」留言：`);
          if (!text) return;
          await postComment({ incident_id: it.incident_id, content: text });
          alert("已发送");
        };

        new maplibregl.Marker({ element: el })
          .setLngLat([it.lng, it.lat])
          .addTo(map);
      }
    });

    return () => map.remove();
  }, []);

  return <div ref={ref} style={{ height: "100vh" }} />;
}
