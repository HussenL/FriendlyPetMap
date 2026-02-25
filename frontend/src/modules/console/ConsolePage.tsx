import { useEffect, useMemo, useState } from "react";
import type { Incident } from "../../shared/types";
import { clearConsoleToken, getConsoleToken, setConsoleToken } from "./auth";
import {
  consoleDeleteComment,
  consoleDeleteIncident,
  consoleListComments,
  consoleListIncidents,
  consoleUpdateComment,
  consoleUpdateIncident,
  type ConsoleCommentRow,
} from "./service";

type Tab = "incidents" | "comments";

function numOrUndef(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function ConsolePage() {
  const [token, setToken] = useState<string | null>(() => getConsoleToken());
  const [tokenInput, setTokenInput] = useState("");

  const [tab, setTab] = useState<Tab>("incidents");

  const [latMin, setLatMin] = useState("");
  const [latMax, setLatMax] = useState("");
  const [lngMin, setLngMin] = useState("");
  const [lngMax, setLngMax] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incTotal, setIncTotal] = useState(0);

  const [comments, setComments] = useState<ConsoleCommentRow[]>([]);
  const [cTotal, setCTotal] = useState(0);

  const queryInput = useMemo(
    () => ({
      lat_min: numOrUndef(latMin),
      lat_max: numOrUndef(latMax),
      lng_min: numOrUndef(lngMin),
      lng_max: numOrUndef(lngMax),
      start: start.trim() || undefined,
      end: end.trim() || undefined,
      q: q.trim() || undefined,
      page,
      page_size: pageSize,
    }),
    [latMin, latMax, lngMin, lngMax, start, end, q, page, pageSize]
  );

  const totalPages = useMemo(() => {
    const total = tab === "incidents" ? incTotal : cTotal;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [tab, incTotal, cTotal, pageSize]);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      if (tab === "incidents") {
        const res = await consoleListIncidents(queryInput);
        setIncidents(res.items);
        setIncTotal(res.total);
      } else {
        const res = await consoleListComments(queryInput);
        setComments(res.items);
        setCTotal(res.total);
      }
    } catch (e: any) {
      setErr(e?.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab, page, pageSize]);

  const onApplyFilters = () => {
    setPage(1);
    load();
  };

  const onReset = () => {
    setLatMin("");
    setLatMax("");
    setLngMin("");
    setLngMax("");
    setStart("");
    setEnd("");
    setQ("");
    setPage(1);
    load();
  };

  const onSetToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    setConsoleToken(t);
    setToken(t);
    setTokenInput("");
  };

  const onLogoutToken = () => {
    clearConsoleToken();
    setToken(null);
  };

  if (!token) {
    return (
      <div style={{ padding: 16, maxWidth: 520 }}>
        <h2 style={{ margin: "0 0 12px" }}>/console</h2>
        <div style={{ marginBottom: 8, color: "#555" }}>请输入控制台 Token（固定 token）。</div>
        <input
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Console Token"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          onClick={onSetToken}
          style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          进入控制台
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>/console</h2>
        <button onClick={onLogoutToken} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
          清除 Token
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            setTab("incidents");
            setPage(1);
          }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: tab === "incidents" ? "#eee" : "#fff" }}
        >
          点位
        </button>
        <button
          onClick={() => {
            setTab("comments");
            setPage(1);
          }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: tab === "comments" ? "#eee" : "#fff" }}
        >
          留言
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 8,
          alignItems: "end",
        }}
      >
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Lat min</div>
          <input value={latMin} onChange={(e) => setLatMin(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Lat max</div>
          <input value={latMax} onChange={(e) => setLatMax(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Lng min</div>
          <input value={lngMin} onChange={(e) => setLngMin(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Lng max</div>
          <input value={lngMax} onChange={(e) => setLngMax(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Start (ISO)</div>
          <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2026-02-25T00:00:00Z" style={{ width: "100%" }} />
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>End (ISO)</div>
          <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="2026-02-25T23:59:59Z" style={{ width: "100%" }} />
        </label>

        <label style={{ gridColumn: "span 4" }}>
          <div style={{ fontSize: 12, color: "#666" }}>关键词（点位：标题；留言：内容）</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label style={{ gridColumn: "span 1" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Page size</div>
          <input
            value={String(pageSize)}
            onChange={(e) => setPageSize(Math.max(1, Math.min(200, Number(e.target.value) || 20)))}
            style={{ width: "100%" }}
          />
        </label>

        <div style={{ gridColumn: "span 1", display: "flex", gap: 8 }}>
          <button onClick={onApplyFilters} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
            查询
          </button>
          <button onClick={onReset} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
            重置
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#b00" }}>{err}</div>}
      {loading && <div style={{ marginTop: 12, color: "#666" }}>加载中…</div>}

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        {tab === "incidents" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10 }}>ID</th>
                <th style={{ textAlign: "left", padding: 10 }}>Lat</th>
                <th style={{ textAlign: "left", padding: 10 }}>Lng</th>
                <th style={{ textAlign: "left", padding: 10 }}>标题</th>
                <th style={{ textAlign: "left", padding: 10 }}>created_at</th>
                <th style={{ textAlign: "left", padding: 10 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((it) => (
                <tr key={it.incident_id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{it.incident_id}</td>
                  <td style={{ padding: 10 }}>{it.lat}</td>
                  <td style={{ padding: 10 }}>{it.lng}</td>
                  <td style={{ padding: 10, maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.title}
                  </td>
                  <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{(it as any).created_at ?? ""}</td>
                  <td style={{ padding: 10, display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        const title = prompt("修改标题", it.title);
                        if (!title) return;
                        await consoleUpdateIncident(it.incident_id, { title });
                        load();
                      }}
                      style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`确认删除点位 ${it.incident_id} ?`)) return;
                        await consoleDeleteIncident(it.incident_id);
                        load();
                      }}
                      style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10 }}>点位ID</th>
                <th style={{ textAlign: "left", padding: 10 }}>Lat</th>
                <th style={{ textAlign: "left", padding: 10 }}>Lng</th>
                <th style={{ textAlign: "left", padding: 10 }}>内容</th>
                <th style={{ textAlign: "left", padding: 10 }}>created_at</th>
                <th style={{ textAlign: "left", padding: 10 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={`${c.incident_id}::${c.created_at}`} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{c.incident_id}</td>
                  <td style={{ padding: 10 }}>{c.incident_lat}</td>
                  <td style={{ padding: 10 }}>{c.incident_lng}</td>
                  <td style={{ padding: 10, maxWidth: 520, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.content}
                  </td>
                  <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{c.created_at}</td>
                  <td style={{ padding: 10, display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        const content = prompt("修改留言内容", c.content);
                        if (!content) return;
                        await consoleUpdateComment({ incident_id: c.incident_id, created_at: c.created_at, content });
                        load();
                      }}
                      style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`确认删除留言?`)) return;
                        await consoleDeleteComment({ incident_id: c.incident_id, created_at: c.created_at });
                        load();
                      }}
                      style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#666" }}>
          共 {tab === "incidents" ? incTotal : cTotal} 条，{totalPages} 页
        </div>
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
        >
          上一页
        </button>
        <div style={{ fontFamily: "monospace" }}>{page}</div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}
        >
          下一页
        </button>
      </div>
    </div>
  );
}