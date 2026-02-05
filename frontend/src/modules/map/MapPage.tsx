import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "./mapStyle";
import { listIncidents } from "../incidents/service";
import { postComment } from "../comments/service";

export function MapPage() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    console.log("map container size:", ref.current?.clientWidth, ref.current?.clientHeight); // 输出地图容器的尺寸，帮助调试地图加载问题

    const map = new maplibregl.Map({
      container: ref.current,
      center: [121.5654, 25.033],
      zoom: 11,
      style: mapStyle,
    });

    map.on("error", (e) => console.error("maplibre error:", e?.error || e)); // 监听地图错误事件
    map.on("load", () => console.log("map loaded ✅")); // 监听地图加载完成事件


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

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
    </div>
  );

}
