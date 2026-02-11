import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { listIncidents, createIncident } from "../incidents/service";
import { listComments, postComment } from "../comments/service";
import type { Incident, Comment } from "../../shared/types";
import { Protocol } from "pmtiles";


const MIN_ZOOM_TO_POST = 14;
const NEARBY_KM = 10;

// 台湾 bbox：粗暴遮一大片（你说不考虑福建沿海）
const TAIWAN_BBOX = { minLng: 119.0, maxLng: 122.1, minLat: 21.8, maxLat: 25.4 };

function isInTaiwanBBox(lng: number, lat: number) {
  return lng >= TAIWAN_BBOX.minLng && lng <= TAIWAN_BBOX.maxLng && lat >= TAIWAN_BBOX.minLat && lat <= TAIWAN_BBOX.maxLat;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
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

function upsertTaiwanMask(map: any) {
  // 四角切角大小（单位：度），想缺得更大就调大一些（建议 0.15 ~ 0.5）
  const CUT_X = 0.85;
  const CUT_Y = 0.85;

  const minLng = 119.0;
  const maxLng = 122.8;
  const minLat = 21.8;
  const maxLat = 25.4;

  const data = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[
            // 从左边下方开始，顺时针绕一圈（8个点 + 闭合）
            [minLng, minLat + CUT_Y],           // 左边（避开左下角）
            [minLng + CUT_X, minLat],           // 下边（避开左下角）

            [maxLng - CUT_X, minLat],           // 下边（避开右下角）
            [maxLng, minLat + CUT_Y],           // 右边（避开右下角）

            [maxLng, maxLat - CUT_Y],           // 右边（避开右上角）
            [maxLng - CUT_X, maxLat],           // 上边（避开右上角）

            [minLng + CUT_X, maxLat],           // 上边（避开左上角）
            [minLng, maxLat - CUT_Y],           // 左边（避开左上角）

            [minLng, minLat + CUT_Y],           // 闭合
          ]],
        },
      },
    ],
  } as const;


  const srcId = "taiwan-mask-src";
  const layerId = "taiwan-mask-fill";

  const src = map.getSource(srcId);
  if (!src) map.addSource(srcId, { type: "geojson", data });
  else {
    try { src.setData(data); } catch {}
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "fill",
      source: srcId,
      paint: { "fill-color": "#000000", "fill-opacity": 0.92 },
    });
  }

  try { map.moveLayer(layerId); } catch {}
}

export function MapPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState<number>(0);

  // 右侧栏：选中点位 → 打开留言列表
  const [selected, setSelected] = useState<Incident | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");

  // 创建点位弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [pendingLngLat, setPendingLngLat] = useState<{ lng: number; lat: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canPostHint = useMemo(
    () => `请继续放大，再点击地图创建新点位`,
    [zoom]
  );

  // 计算 10km 内点位
  const nearby = useMemo(() => {
    if (!userPos) return [];
    return incidents
      .map((it) => ({
        it,
        km: haversineKm(userPos, { lat: it.lat, lng: it.lng }),
      }))
      .filter((x) => x.km <= NEARBY_KM)
      .sort((a, b) => a.km - b.km)
      .slice(0, 50);
  }, [incidents, userPos]);

  // 拉留言列表
  const openComments = async (incident: Incident) => {
    setSelected(incident);
    setCommentsLoading(true);
    try {
      const resp = await listComments(incident.incident_id);
      setComments(resp.items);
    } finally {
      setCommentsLoading(false);
    }
  };

  const clearMarkers = () => {
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
  };

  const renderMarkers = (map: MLMap, list: Incident[]) => {
    clearMarkers();

    for (const it of list) {
      const el = makeDot("red");
      el.onclick = (ev) => {
        ev.stopPropagation();
        // 禁台湾交互
        if (isInTaiwanBBox(it.lng, it.lat)) {
          alert("该区域不可用。");
          return;
        }
        openComments(it);
        map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), MIN_ZOOM_TO_POST) });
      };

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([it.lng, it.lat])
        .addTo(map);

      markersRef.current.push(m);
    }
  };

  // 获取定位
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // 拒绝定位：不报错，右侧栏提示即可
        setUserPos(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!mapDivRef.current) return;
    // ✅ 注册 pmtiles:// 协议（必须在 new map 之前）
    const pmtilesProtocol = (globalThis as any).__pmtilesProtocol || new Protocol();
    (globalThis as any).__pmtilesProtocol = pmtilesProtocol;

    if (!(globalThis as any).__pmtilesRegistered) {
      maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
      (globalThis as any).__pmtilesRegistered = true;
    }

    if (mapRef.current) return; // ✅ 防止重复初始化

    // Register pmtiles:// protocol (only once)
    if (!(maplibregl as any).__pmtilesProtocol) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      (maplibregl as any).__pmtilesProtocol = protocol;
    }

    const styleUrl = `${import.meta.env.BASE_URL}styles/style.json`; // "/fpm/" + "styles/style.json"

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      center: [121.4737, 31.2304],
      zoom: 12,
      // style: mapStyle as any, // 本地前端网络osm
      // style: "/styles/style.json", // 本地前端aws osm
      style: styleUrl, // 线上aws osm
    });

    // ✅ 明确开启交互（有些情况下会被禁掉）
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const syncZoom = () => setZoom(Number(map.getZoom().toFixed(2)));
    syncZoom();
    map.on("zoom", syncZoom);

    map.on("load", async () => {
      console.log("STYLE", map.getStyle());
      console.log("LAYERS", map.getStyle().layers?.map(l => ({ id: l.id, source: (l as any).source, "source-layer": (l as any)["source-layer"] })));
      map.on("idle", () => {
        try {
          const feats =
            map.queryRenderedFeatures({ layers: ["water", "landcover", "roads", "buildings"] }) || [];
          console.log("rendered features count:", feats.length);
        } catch (e) {
          console.log("queryRenderedFeatures error", e);
        }
      });
      (map as any).showTileBoundaries = false;
      (map as any).showCollisionBoxes = false;
      map.on("error", (e: any) => {
        console.log("MAP_ERROR", e?.error, e);
      });

      




      // 台湾遮罩（强制置顶）
      upsertTaiwanMask(map);

      const list = await listIncidents();
      setIncidents(list);
      renderMarkers(map, list);

      // 点击地图创建新点位（禁台湾 + 需要 zoom）
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;

        if (isInTaiwanBBox(lng, lat)) {
          alert("该区域不可用。");
          return;
        }
        if (map.getZoom() < MIN_ZOOM_TO_POST) {
          alert(canPostHint);
          return;
        }

        setPendingLngLat({ lng, lat });
        setDraftTitle("");
        setDraftContent("");
        setModalOpen(true);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // ✅ 必须是空依赖

  // 跳转到当前位置
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;

    // 禁止跳到台湾遮罩里（可选）
    if (isInTaiwanBBox(userPos.lng, userPos.lat)) return;

    map.flyTo({
      center: [userPos.lng, userPos.lat],
      zoom: Math.max(map.getZoom(), 14), // 想直接进入可放点级别
      essential: true,
    });
  }, [userPos]);

  // 当 incidents state 更新时重新渲染 marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    renderMarkers(map, incidents);
  }, [incidents]);

  const submitNewIncidentAndFirstComment = async () => {
    const map = mapRef.current;
    if (!map || !pendingLngLat) return;

    const { lng, lat } = pendingLngLat;

    if (isInTaiwanBBox(lng, lat)) {
      alert("该区域不可用。");
      return;
    }
    if (map.getZoom() < MIN_ZOOM_TO_POST) {
      alert(canPostHint);
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

      // 更新 incidents（触发 marker 重绘 + 右侧栏重算）
      setIncidents((prev) => [...prev, incident]);

      setModalOpen(false);
      setPendingLngLat(null);

      // 立刻打开留言列表
      await openComments(incident);

      map.flyTo({ center: [incident.lng, incident.lat], zoom: Math.max(map.getZoom(), MIN_ZOOM_TO_POST) });
    } catch (e) {
      console.error(e);
      alert("创建失败（见控制台）");
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!selected) return;
    const text = newComment.trim();
    if (!text) return;

    await postComment({ incident_id: selected.incident_id, content: text });
    setNewComment("");

    // 重新拉列表（MVP 简单粗暴）
    await openComments(selected);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

        {/* 创建点位弹窗 */}
        {modalOpen && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
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
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                新建点位并留言
              </div>

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
                    onClick={submitNewIncidentAndFirstComment}
                    disabled={submitting}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #111",
                      background: "#111",
                      color: "white",
                    }}
                  >
                    {submitting ? "提交中..." : "创建并留言"}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "#666" }}>
                  限制：中国台湾地区已完全遮盖并禁用。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: 360,
          borderLeft: "1px solid #e5e5e5",
          padding: 12,
          overflow: "auto",
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
          附近 {NEARBY_KM}km 内点位
        </div>

        <div style={{ color: "#666", fontSize: 12, marginBottom: 10 }}>
          {userPos
            ? `已获取定位（${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}）`
            : "未获取定位（可在浏览器允许定位后显示附近点位）"}
          <br />
          当前 Zoom：{zoom.toFixed(2)}
        </div>

        {!userPos && (
          <div style={{ padding: 10, background: "#fafafa", border: "1px solid #eee", borderRadius: 10 }}>
            需要浏览器定位权限，才能显示你附近 10km 的点位列表。
          </div>
        )}

        {userPos && nearby.length === 0 && (
          <div style={{ padding: 10, background: "#fafafa", border: "1px solid #eee", borderRadius: 10 }}>
            10km 内暂无点位。
          </div>
        )}

        {userPos && nearby.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nearby.slice(0, 30).map(({ it, km }) => (
              <button
                key={it.incident_id}
                onClick={() => {
                  const map = mapRef.current;
                  if (map) map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), MIN_ZOOM_TO_POST) });
                  openComments(it);
                }}
                style={{
                  textAlign: "left",
                  border: "1px solid #eee",
                  background: selected?.incident_id === it.incident_id ? "#f3f4f6" : "white",
                  borderRadius: 10,
                  padding: "10px 10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{km.toFixed(2)} km</div>
              </button>
            ))}
          </div>
        )}

        {/* Comments panel */}
        <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
            留言
          </div>

          {!selected && <div style={{ color: "#666" }}>请选择一个点位查看留言。</div>}

          {selected && (
            <>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{selected.title}</div>

              {commentsLoading ? (
                <div style={{ color: "#666" }}>加载中...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {comments.length === 0 && (
                    <div style={{ color: "#666" }}>暂无留言。</div>
                  )}
                  {comments.map((c) => (
                    <div
                      key={c.comment_id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 10,
                        background: "white",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                placeholder="写一条留言…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={submitComment}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  发送留言
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
