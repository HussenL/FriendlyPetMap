import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "./mapStyle";
import { listIncidents, createIncident } from "../incidents/service";
import { postComment } from "../comments/service";
import type { Incident } from "../../shared/types";

const MIN_ZOOM_TO_POST = 14;

// MVP：用 bbox 先粗暴遮住台湾
const TAIWAN_BBOX = {
  minLng: 119.0,
  maxLng: 123.6,
  minLat: 21.6,
  maxLat: 26.6,
};

function isInTaiwanBBox(lng: number, lat: number) {
  return (
    lng >= TAIWAN_BBOX.minLng &&
    lng <= TAIWAN_BBOX.maxLng &&
    lat >= TAIWAN_BBOX.minLat &&
    lat <= TAIWAN_BBOX.maxLat
  );
}

function makeDot(color: string) {
  const el = document.createElement("div");
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.borderRadius = "999px";
  el.style.background = color;
  el.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.9)";
  el.style.cursor = "pointer";
  return el;
}

export function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // 诊断信息（你会在左上角看到）
  const [zoom, setZoom] = useState<number>(0);
  const [clickCount, setClickCount] = useState<number>(0);
  const [maskAdded, setMaskAdded] = useState<boolean>(false);

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [pendingLngLat, setPendingLngLat] = useState<{ lng: number; lat: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  

  useEffect(() => {
    console.log("✅ MapPage ACTIVE (debug build)"); // 关键：确认你跑的是这个文件

    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [121.4737, 31.2304], // 上海（避免你一上来就盯着台湾看不到大陆）
      zoom: 12, // 默认先不太近；能不能放点由 MIN_ZOOM 控制
      style: mapStyle as any,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const syncZoom = () => setZoom(Number(map.getZoom().toFixed(2)));
    syncZoom();
    map.on("zoom", syncZoom);

    const clearMarkers = () => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
    };

    const addIncidentMarker = (it: Incident) => {
      const el = makeDot("red");
      el.onclick = async (ev) => {
        ev.stopPropagation();
        if (map.getZoom() < MIN_ZOOM_TO_POST) {
          alert(`请放大到 Zoom ${MIN_ZOOM_TO_POST}+ 才能留言/放点（当前：${map.getZoom().toFixed(2)}）`);
          return;
        }
        if (isInTaiwanBBox(it.lng, it.lat)) {
          alert("台湾区域已禁用。");
          return;
        }
        const text = window.prompt(`给「${it.title}」留言：`);
        if (!text) return;
        await postComment({ incident_id: it.incident_id, content: text });
        alert("已发送");
      };

      const m = new maplibregl.Marker({ element: el }).setLngLat([it.lng, it.lat]).addTo(map);
      markersRef.current.push(m);
    };

    const loadAndRender = async () => {
      const incidents = await listIncidents();
      clearMarkers();
      for (const it of incidents) addIncidentMarker(it);
    };

    // ✅ 不把 click 绑在 load 里面（避免你之前那种“看起来没反应”）
    map.on("click", (e) => {
      setClickCount((c) => c + 1);

      const { lng, lat } = e.lngLat;

      // 先给你强提示：点击是否触发
      console.log("🖱 map click:", { lng, lat, zoom: map.getZoom() });

      if (map.getZoom() < MIN_ZOOM_TO_POST) {
        alert(`请放大到 Zoom ${MIN_ZOOM_TO_POST}+ 才能放点（当前：${map.getZoom().toFixed(2)}）`);
        return;
      }
      if (isInTaiwanBBox(lng, lat)) {
        alert("台湾区域已禁用。");
        return;
      }

      setPendingLngLat({ lng, lat });
      setDraftTitle("");
      setDraftContent("");
      setModalOpen(true);
    });

    map.on("load", async () => {
      await loadAndRender();

      // ✅ 台湾遮罩：加一个“绝对显眼”的不透明黑块（你不可能看不出来）
      const taiwanMaskGeojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[
                [TAIWAN_BBOX.minLng, TAIWAN_BBOX.minLat],
                [TAIWAN_BBOX.maxLng, TAIWAN_BBOX.minLat],
                [TAIWAN_BBOX.maxLng, TAIWAN_BBOX.maxLat],
                [TAIWAN_BBOX.minLng, TAIWAN_BBOX.maxLat],
                [TAIWAN_BBOX.minLng, TAIWAN_BBOX.minLat],
              ]],
            },
          },
        ],
      } as const;

      if (!map.getSource("taiwan-mask-src")) {
        map.addSource("taiwan-mask-src", { type: "geojson", data: taiwanMaskGeojson as any });
        map.addLayer({
          id: "taiwan-mask-fill",
          type: "fill",
          source: "taiwan-mask-src",
          paint: {
            "fill-color": "#000000",
            "fill-opacity": 0.92,
          },
        });
        setMaskAdded(true);
        console.log("✅ Taiwan mask layer added");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  const submit = async () => {
    const map = mapRef.current;
    if (!map || !pendingLngLat) return;

    const { lng, lat } = pendingLngLat;

    if (map.getZoom() < MIN_ZOOM_TO_POST) {
      alert(`请放大到 Zoom ${MIN_ZOOM_TO_POST}+ 才能放点（当前：${map.getZoom().toFixed(2)}）`);
      return;
    }
    if (isInTaiwanBBox(lng, lat)) {
      alert("台湾区域已禁用。");
      return;
    }

    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!title || !content) {
      alert("标题和留言内容都不能为空。");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createIncident({ lng, lat, title });
      const incident = created.incident;

      await postComment({ incident_id: incident.incident_id, content });

      // 立即加 marker
      const el = makeDot("red");
      el.onclick = async (ev) => {
        ev.stopPropagation();
        if (map.getZoom() < MIN_ZOOM_TO_POST) {
          alert(`请放大到 Zoom ${MIN_ZOOM_TO_POST}+ 才能留言（当前：${map.getZoom().toFixed(2)}）`);
          return;
        }
        const text = window.prompt(`给「${incident.title}」留言：`);
        if (!text) return;
        await postComment({ incident_id: incident.incident_id, content: text });
        alert("已发送");
      };

      const m = new maplibregl.Marker({ element: el }).setLngLat([incident.lng, incident.lat]).addTo(map);
      markersRef.current.push(m);

      setModalOpen(false);
      setPendingLngLat(null);
      alert("已创建点位并留言 ✅");
    } catch (e) {
      console.error(e);
      alert("创建失败（见控制台）");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* 诊断面板：你一定能看到，确认代码生效 */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 9999,
          background: "rgba(0,0,0,0.65)",
          color: "white",
          padding: "8px 10px",
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.4,
          pointerEvents: "none",
        }}
      >
        <div>MapPage: DEBUG ✅</div>
        <div>Zoom: {zoom}</div>
        <div>Clicks: {clickCount}</div>
        <div>Mask added: {maskAdded ? "YES" : "NO"}</div>
        <div>Min zoom to post: {MIN_ZOOM_TO_POST}</div>
      </div>

      {/* 弹窗 */}
      {modalOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            style={{
              width: 420,
              maxWidth: "92vw",
              background: "white",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>新建点位并留言</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                placeholder="标题（必填）"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                disabled={submitting}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
              />
              <textarea
                placeholder="留言内容（必填）"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                disabled={submitting}
                rows={5}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", resize: "vertical" }}
              />

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
                >
                  取消
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "white" }}
                >
                  {submitting ? "提交中..." : "创建并留言"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
