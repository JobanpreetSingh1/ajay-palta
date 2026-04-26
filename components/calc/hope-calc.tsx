"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Sankey,
} from "recharts";

/** Dark UI + exports (matches site background) */
const CAPTURE_BG = "#000000";
const CHART_AXIS = "rgba(228, 228, 235, 0.8)";
const CHART_TICK = "#f4f4f5";
const CHART_GRID = "rgba(255, 255, 255, 0.22)";
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#111827",
  border: "1px solid #6b7280",
  borderRadius: 8,
  color: "#f9fafb",
};

/** Panel shell: visible edge on black backgrounds */
const panelShell =
  "rounded-2xl border border-zinc-400/55 bg-zinc-900/95 ring-1 ring-inset ring-white/16 shadow-[0_1px_0_0_rgba(255,255,255,0.08)]";

type UiRole = "input" | "readonly" | "derived" | "hidden" | "hidden_value" | string;
type DType = "number" | "percent" | "text" | string;

type ItemSchema = {
  metric_key: string;
  panel_key: string;
  panel_order: number;
  item_order: number;
  label: string;
  ui_role: UiRole;
  dtype?: DType;
  min?: any;
  max?: any;
  default?: any;
  format?: string;
  notes?: string;
  ui_visible?: string | boolean;
  ui_priority?: string | number;
};

type MasterSchema = {
  items: ItemSchema[];
};

type ComputeResponse = {
  ok?: boolean;
  values: Record<string, any>;
  value_display?: Record<string, string>;
};

type ModelState = {
  id: string;
  name: string;
  inputs: Record<string, any>;
  values: Record<string, any>;
  valueDisplay: Record<string, string>;
};

type PanelGroup = {
  panel_key: string;
  panel_order: number;
  items: ItemSchema[];
};

const MAX_MODELS = 5;

const KEY_METRICS = new Set([
  "CR",
  "lambda",
  "rpm",
  "bore_stroke_ratio",
  "P1_bar_derived",
  "P2_bar",
  "T2_C",
  "P3_real_bar",
  "T3_real_C",
  "W_comp_J",
  "W_exp_real_J",
  "W_net_real_J",
  "eta_brake_pct",
  "BMEP_bar",
  "Power_brake_kW",
  "bsfc_g_kWh",
  "Q_exh_real_bal_J",
  "water_phase_result",
]);

const GRAPH_METRIC_OPTIONS = [
  { key: "T2_C", label: "T2 Compression Temperature (°C)" },
  { key: "T3_real_C", label: "T3 Real Combustion Temperature (°C)" },
  { key: "P2_bar", label: "P2 Compression Pressure (bar)" },
  { key: "P3_real_bar", label: "P3 Real Peak Pressure (bar)" },
  { key: "eta_brake_pct", label: "Brake Efficiency (%)" },
  { key: "bsfc_g_kWh", label: "BSFC (g/kWh)" },
];

const EDITABLE_INPUT_KEYS = new Set([
  "CR",
  "lambda",
  "rpm",
  "bore_stroke_ratio",
]);

function shouldShow(it: ItemSchema) {
  const v = (it.ui_visible ?? "TRUE") as any;
  const isVisible = typeof v === "boolean" ? v : String(v).toLowerCase() !== "false";
  const role = (it.ui_role ?? "").toLowerCase();
  if (!isVisible) return false;
  if (role === "hidden_row" || role === "hidden") return false;
  return true;
}

function isEditable(it: ItemSchema) {
  return (it.ui_role ?? "").toLowerCase() === "input";
}

function normalizeDType(dtype?: string): DType {
  const dt = (dtype ?? "").toLowerCase().trim();
  if (dt === "percent") return "percent";
  if (dt === "number") return "number";
  if (dt === "text") return "text";
  return dt || "text";
}

function coerceDefault(it: ItemSchema) {
  if (it.default !== undefined && it.default !== null && it.default !== "") return it.default;
  const dt = normalizeDType(it.dtype);
  return dt === "number" || dt === "percent" ? 0 : "";
}

function shouldInit(uiRole?: string) {
  const r = (uiRole ?? "").toLowerCase().trim();
  return r === "input" || r === "readonly";
}

function buildInitialInputs(schema: MasterSchema) {
  const init: Record<string, any> = {};
  for (const it of schema.items ?? []) {
    if (!it?.metric_key) continue;
    if (shouldInit(it.ui_role)) {
      init[it.metric_key] = coerceDefault(it);
    }
  }
  return init;
}

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampIfNeeded(it: ItemSchema, raw: any) {
  const dt = normalizeDType(it.dtype);
  if (dt !== "number" && dt !== "percent") return raw;

  const n = safeNumber(raw);
  if (n === null) return raw;

  const mn = safeNumber(it.min);
  const mx = safeNumber(it.max);

  let out = n;
  if (mn !== null) out = Math.max(out, mn);
  if (mx !== null) out = Math.min(out, mx);
  return out;
}

function nextModelName(count: number) {
  return `Model ${String.fromCharCode(65 + count)}`;
}

function formatModelNameFromInputs(inputs: Record<string, any>, fallback: string) {
  const cr = Number(inputs?.CR);
  if (!Number.isFinite(cr) || cr <= 0) return fallback;
  return `HOPE-${Math.round(cr)}`;
}

function uniqueModelName(
  proposed: string,
  currentId: string,
  models: { id: string; name: string }[]
) {
  const used = models.filter((m) => m.id !== currentId).map((m) => m.name);
  if (!used.includes(proposed)) return proposed;

  let i = 2;
  while (used.includes(`${proposed} (${i})`)) i++;
  return `${proposed} (${i})`;
}

function formatValueForDisplay(it: ItemSchema, raw: any) {
  if (it.metric_key === "m_water_display") return "Internally optimized";
  if (raw === null || raw === undefined || raw === "") return "";

  const fmt = String(it.format ?? "").toLowerCase();
  const dt = String(it.dtype ?? "").toLowerCase();

  if (dt === "percent" || fmt.startsWith("percent")) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    if (fmt === "percent_1") return `${(n * 100).toFixed(1)}%`;
    if (fmt === "percent_2") return `${(n * 100).toFixed(2)}%`;
    return `${(n * 100).toFixed(2)}%`;
  }

  if (fmt === "int") {
    const n = Number(raw);
    return Number.isFinite(n) ? String(Math.round(n)) : String(raw);
  }

  if (fmt === "1dp") {
    const n = Number(raw);
    return Number.isFinite(n) ? n.toFixed(1) : String(raw);
  }

  if (fmt === "2dp") {
    const n = Number(raw);
    return Number.isFinite(n) ? n.toFixed(2) : String(raw);
  }

  return String(raw);
}

function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildDisplayExportCsv(panels: PanelGroup[], models: ModelState[]) {
  const header = ["Panel", "Metric", "Label", ...models.map((m) => m.name)];
  const rows: string[][] = [header];

  for (const panel of panels) {
    for (const it of panel.items) {
      const row = [
        panel.panel_key,
        it.metric_key,
        it.label,
        ...models.map((model) => {
          if (model.valueDisplay[it.metric_key] !== undefined) {
            return String(model.valueDisplay[it.metric_key]);
          }
          if (model.values[it.metric_key] !== undefined) {
            return formatValueForDisplay(it, model.values[it.metric_key]);
          }
          if (model.inputs[it.metric_key] !== undefined) {
            return formatValueForDisplay(it, model.inputs[it.metric_key]);
          }
          return "";
        }),
      ];
      rows.push(row);
    }
  }

  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function splitPanels(source: PanelGroup[]): PanelGroup[] {
  const out: PanelGroup[] = [];

  for (const panel of source) {
    if (panel.panel_key !== "Input") {
      out.push(panel);
      continue;
    }

    const editable = panel.items.filter((it) => EDITABLE_INPUT_KEYS.has(it.metric_key));
    const reference = panel.items.filter((it) => !EDITABLE_INPUT_KEYS.has(it.metric_key));

    out.push({
      panel_key: "Editable Inputs",
      panel_order: panel.panel_order,
      items: editable,
    });

    out.push({
      panel_key: "Reference Inputs",
      panel_order: panel.panel_order + 0.1,
      items: reference,
    });
  }

  return out;
}

function getRangeText(it: ItemSchema) {
  const min = it.min;
  const max = it.max;

  if (min === undefined || min === null || max === undefined || max === null) {
    return "";
  }

  const dt = normalizeDType(it.dtype);

  if (dt === "percent") {
    const minNum = Number(min);
    const maxNum = Number(max);
    if (Number.isFinite(minNum) && Number.isFinite(maxNum)) {
      return `Range: ${(minNum * 100).toFixed(1)}%–${(maxNum * 100).toFixed(1)}%`;
    }
  }

  return `Range: ${min}–${max}`;
}

function stableSerializeInputs(inputs: Record<string, any>) {
  const keys = Object.keys(inputs).sort();
  return JSON.stringify(keys.map((k) => [k, inputs[k]]));
}

/** Panel header tints — higher alpha for contrast on near-black */
function getPanelHeaderColor(panelKey: string) {
  switch (panelKey) {
    case "Editable Inputs":
      return "rgba(255, 199, 0, 0.22)";
    case "Reference Inputs":
      return "rgba(255, 255, 255, 0.1)";
    case "Compression":
      return "rgba(255, 199, 0, 0.16)";
    case "Pressure & Force":
      return "rgba(248, 113, 113, 0.16)";
    case "Temperature":
      return "rgba(251, 146, 60, 0.16)";
    case "Heat":
      return "rgba(255, 199, 0, 0.14)";
    case "Work":
      return "rgba(74, 222, 128, 0.14)";
    case "Efficiency":
      return "rgba(52, 211, 153, 0.16)";
    case "Performance":
      return "rgba(56, 189, 248, 0.16)";
    case "Operating Envelope":
      return "rgba(167, 139, 250, 0.16)";
    default:
      return "rgba(255, 255, 255, 0.09)";
  }
}

function isPercentMetric(metricKey: string) {
  return metricKey === "eta_brake_pct";
}

function getGraphMetricDecimals(metricKey: string) {
  switch (metricKey) {
    case "T2_C":
    case "T3_real_C":
    case "P2_bar":
    case "P3_real_bar":
    case "bsfc_g_kWh":
      return 1;
    case "eta_brake_pct":
      return 1;
    default:
      return 2;
  }
}

function formatGraphValue(metricKey: string, raw: number) {
  if (!Number.isFinite(raw)) return "";
  const decimals = getGraphMetricDecimals(metricKey);
  if (isPercentMetric(metricKey)) {
    return `${(raw * 100).toFixed(decimals)}%`;
  }
  return raw.toFixed(decimals);
}

function pctOfInput(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) return 0;
  return (value / total) * 100;
}

function pctOfGrossCooling(value: number, gross: number) {
  if (!Number.isFinite(value) || !Number.isFinite(gross) || gross === 0) return 0;
  return (value / gross) * 100;
}

function safeMetric(values: Record<string, any>, key: string) {
  const n = Number(values?.[key]);
  return Number.isFinite(n) ? n : 0;
}

function linspace(start: number, end: number, count: number) {
  if (count <= 1) return [start];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
}



type HopeCalcProps = {
  /** When true, hides the duplicate in-component title (use with a page-level hero). */
  embedded?: boolean;
};

export default function HopeCalc({ embedded = false }: HopeCalcProps) {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const ihrlRef = useRef<HTMLDivElement | null>(null);
  const netEnergyRef = useRef<HTMLDivElement | null>(null);
  const [schema, setSchema] = useState<MasterSchema | null>(null);
  const [models, setModels] = useState<ModelState[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingCompute, setLoadingCompute] = useState(false);
  const [err, setErr] = useState("");
  const [keyMetricsOnly, setKeyMetricsOnly] = useState(false);
  const [selectedGraphMetric, setSelectedGraphMetric] = useState("T2_C");
  const [selectedSankeyModelId, setSelectedSankeyModelId] = useState<string>("");
  

  const [panelOpen, setPanelOpen] = useState<Record<string, boolean>>({
    "Performance Graph": true,
   
    "Editable Inputs": true,
    "Reference Inputs": false,
    Compression: true,
    "Pressure & Force": false,
    Temperature: false,
    Heat: false,
    Work: false,
    Efficiency: true,
    Performance: true,
    "Operating Envelope": false,
    "IHRL Cooling Recovery Flow": true,
    "Sankey Energy Flow": true,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingSchema(true);
        setErr("");

        const res = await fetch("/api/schema", { method: "GET" });
        if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`);

        const data = (await res.json()) as MasterSchema;
        if (!alive) return;

        const items = Array.isArray(data.items) ? data.items : [];
        const cleaned: MasterSchema = {
          items: items
            .filter((x) => x && x.metric_key && x.panel_key)
            .map((x) => ({
              ...x,
              panel_order: Number((x as any).panel_order ?? 999),
              item_order: Number((x as any).item_order ?? 999),
              dtype: normalizeDType((x as any).dtype),
            })),
        };

        setSchema(cleaned);

        const init = buildInitialInputs(cleaned);
        const firstId = crypto.randomUUID();
        const firstName = formatModelNameFromInputs(init, "Model A");

        setModels([
          {
            id: firstId,
            name: firstName,
            inputs: init,
            values: {},
            valueDisplay: {},
          },
        ]);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load schema");
      } finally {
        setLoadingSchema(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!schema || models.length === 0) return;

    let cancelled = false;

    const snapshot = models.map((m) => ({
      id: m.id,
      inputs: { ...m.inputs },
    }));

    const handle = setTimeout(() => {
      (async () => {
        try {
          setLoadingCompute(true);
          setErr("");

          const computed = await Promise.all(
            snapshot.map(async (model) => {
              const res = await fetch("/api/compute", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: model.inputs }),
              });

              if (!res.ok) throw new Error(`Compute failed: ${res.status}`);
              const data = (await res.json()) as ComputeResponse;

              return {
                id: model.id,
                values: data.values ?? {},
                valueDisplay: data.value_display ?? {},
              };
            })
          );

          if (cancelled) return;

          setModels((prev) =>
            prev.map((model) => {
              const hit = computed.find((x) => x.id === model.id);
              if (!hit) return model;
              return {
                ...model,
                values: hit.values,
                valueDisplay: hit.valueDisplay,
              };
            })
          );
        } catch (e: any) {
          if (!cancelled) setErr(e?.message ?? "Compute failed");
        } finally {
          if (!cancelled) setLoadingCompute(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [schema, models.map((m) => JSON.stringify(m.inputs)).join("|"), models.length]);

  useEffect(() => {
    if (!models.length) return;
    const exists = models.some((m) => m.id === selectedSankeyModelId);
    if (!selectedSankeyModelId || !exists) {
      setSelectedSankeyModelId(models[0].id);
    }
  }, [models, selectedSankeyModelId]);

  const modelsInputsKey = useMemo(
    () => models.map((m) => stableSerializeInputs(m.inputs)).join("|"),
    [models]
  );

  const panels = useMemo(() => {
    if (!schema) return [];

    const items = schema.items.filter((it) => {
      if (!shouldShow(it)) return false;
      if (!keyMetricsOnly) return true;
      return KEY_METRICS.has(it.metric_key);
    });

    const byPanel = new Map<string, ItemSchema[]>();

    for (const it of items) {
      if (!byPanel.has(it.panel_key)) byPanel.set(it.panel_key, []);
      byPanel.get(it.panel_key)!.push(it);
    }

    const panelList: PanelGroup[] = Array.from(byPanel.entries()).map(([panel_key, list]) => ({
      panel_key,
      panel_order: Math.min(...list.map((x) => x.panel_order ?? 999)),
      items: [...list].sort((a, b) => (a.item_order ?? 999) - (b.item_order ?? 999)),
    }));

    panelList.sort((a, b) => a.panel_order - b.panel_order);
    return splitPanels(panelList);
  }, [schema, keyMetricsOnly]);

  const graphData = useMemo(() => {
    return models
      .map((model, idx) => {
        const cr = Number(model.inputs.CR);
        const raw = model.values[selectedGraphMetric];

        let value: number | null = null;
        if (raw !== undefined && raw !== null && raw !== "") {
          const num = Number(raw);
          value = Number.isFinite(num) ? num : null;
        }

        return {
          name: model.name || `Model ${idx + 1}`,
          CR: Number.isFinite(cr) ? cr : idx + 1,
          value,
          valueLabel: value !== null ? formatGraphValue(selectedGraphMetric, value) : "",
        };
      })
      .filter((row) => row.value !== null)
      .sort((a, b) => a.CR - b.CR);
  }, [models, selectedGraphMetric]);

  const sankeyModel = useMemo(() => {
    return models.find((m) => m.id === selectedSankeyModelId) ?? models[0] ?? null;
  }, [models, selectedSankeyModelId]);

  const ihrlSankeyData = useMemo(() => {
    if (!sankeyModel) return null;

    const values = sankeyModel.values ?? {};
    const coolGross = safeMetric(values, "Q_cool_gross_J");
    const coolNet = safeMetric(values, "Q_cool_net_J");
    const ihrl = safeMetric(values, "Q_rec_IHRL_J");

    return {
      nodes: [
        { name: "Cooling Gross" },
        { name: "IHRL Recovery" },
        { name: "Cooling Net Loss" },
      ],
      links: [
        { source: 0, target: 1, value: Math.max(ihrl, 0) },
        { source: 0, target: 2, value: Math.max(coolNet, 0) },
      ],
      summary: {
        coolGross,
        ihrl,
        coolNet,
        ihrlPct: pctOfGrossCooling(ihrl, coolGross),
        coolNetPct: pctOfGrossCooling(coolNet, coolGross),
      },
    };
  }, [sankeyModel]);

  const hasIhrlFlow = useMemo(() => {
    if (!ihrlSankeyData) return false;
    return ihrlSankeyData.links.some(
      (link) => Number.isFinite(link.value) && link.value > 0
    );
  }, [ihrlSankeyData]);

  const sankeyData = useMemo(() => {
    if (!sankeyModel) return null;

    const values = sankeyModel.values ?? {};
    const qIn = safeMetric(values, "Q_in_J");
    const brake = safeMetric(values, "W_brake_J");
    const exhaust = safeMetric(values, "Q_exh_real_bal_J");
    const coolNet = safeMetric(values, "Q_cool_net_J");
    const friction = safeMetric(values, "Q_fric_J");
    const unburned = safeMetric(values, "Q_ub_J");

    return {
      nodes: [
        { name: "Fuel Input" },
        { name: "Cycle Energy" },
        { name: "Brake Work" },
        { name: "Exhaust" },
        { name: "Cooling Net Loss" },
        { name: "Friction" },
        { name: "Unburned" },
      ],
      links: [
        { source: 0, target: 1, value: qIn },
        { source: 1, target: 2, value: Math.max(brake, 0) },
        { source: 1, target: 3, value: Math.max(exhaust, 0) },
        { source: 1, target: 4, value: Math.max(coolNet, 0) },
        { source: 1, target: 5, value: Math.max(friction, 0) },
        { source: 1, target: 6, value: Math.max(unburned, 0) },
      ],
      summary: {
        qIn,
        brakePct: pctOfInput(brake, qIn),
        exhaustPct: pctOfInput(exhaust, qIn),
        coolNetPct: pctOfInput(coolNet, qIn),
        frictionPct: pctOfInput(friction, qIn),
        unburnedPct: pctOfInput(unburned, qIn),
      },
    };
  }, [sankeyModel]);

  const hasNetEnergyFlow = useMemo(() => {
    if (!sankeyData) return false;
    return sankeyData.links.some(
      (link) => Number.isFinite(link.value) && link.value > 0
    );
  }, [sankeyData]);

  function addModel() {
    if (!schema) return;

    setModels((prev) => {
      if (prev.length >= MAX_MODELS) return prev;

      const baseInputs =
        prev.length > 0 ? prev[prev.length - 1].inputs : buildInitialInputs(schema);

      const fallback = nextModelName(prev.length);
      const proposed = formatModelNameFromInputs(baseInputs, fallback);
      const finalName = uniqueModelName(proposed, "__new__", prev);

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: finalName,
          inputs: { ...baseInputs },
          values: {},
          valueDisplay: {},
        },
      ];
    });
  }

  function resetAllModels() {
    if (!schema) return;
    const base = buildInitialInputs(schema);

    setModels([
      {
        id: crypto.randomUUID(),
        name: formatModelNameFromInputs(base, "Model A"),
        inputs: base,
        values: {},
        valueDisplay: {},
      },
    ]);
  }

  function onChange(modelId: string, it: ItemSchema, nextRaw: string) {
    setModels((prev) =>
      prev.map((model) => {
        if (model.id !== modelId) return model;
        return {
          ...model,
          inputs: { ...model.inputs, [it.metric_key]: nextRaw },
        };
      })
    );
  }

  function onBlurValue(modelId: string, it: ItemSchema) {
    setModels((prev) =>
      prev.map((model) => {
        if (model.id !== modelId) return model;

        const dt = normalizeDType(it.dtype);
        const raw = model.inputs[it.metric_key];
        const nextInputs = { ...model.inputs };

        if (dt === "number" || dt === "percent") {
          if (raw !== "" && raw !== null && raw !== undefined) {
            const n = Number(raw);
            if (Number.isFinite(n)) {
              nextInputs[it.metric_key] = clampIfNeeded(it, n);
            } else {
              nextInputs[it.metric_key] = coerceDefault(it);
            }
          }
        }

        let nextName = model.name;
        if (it.metric_key === "CR") {
          const fallback = model.name.startsWith("HOPE-") ? "Model" : model.name;
          const proposed = formatModelNameFromInputs(nextInputs, fallback);
          nextName = uniqueModelName(proposed, model.id, prev);
        }

        return {
          ...model,
          name: nextName,
          inputs: nextInputs,
        };
      })
    );
  }

  function getDisplayValue(model: ModelState, it: ItemSchema) {
    if (model.valueDisplay[it.metric_key] !== undefined) return model.valueDisplay[it.metric_key];
    if (model.values[it.metric_key] !== undefined) return formatValueForDisplay(it, model.values[it.metric_key]);
    if (model.inputs[it.metric_key] !== undefined) return formatValueForDisplay(it, model.inputs[it.metric_key]);
    return "";
  }

function exportDisplayCsv() {
  const csv = buildDisplayExportCsv(panels, models);
  downloadTextFile("hope_display_compare.csv", csv, "text/csv;charset=utf-8");
}

async function downloadPanelPng(
  ref: React.RefObject<HTMLDivElement | null>,
  fileName: string
) {
  if (!ref.current) return;

  const dataUrl = await toPng(ref.current, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: CAPTURE_BG,
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

async function downloadExplorerPdf() {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const sections = [
    { ref: graphRef, title: "Performance Graph" },
    { ref: ihrlRef, title: "IHRL Cooling Recovery Flow" },
    { ref: netEnergyRef, title: "Net Energy Partition" },
  ];

  let first = true;

  for (const section of sections) {
    if (!section.ref.current) continue;

    const dataUrl = await toPng(section.ref.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: CAPTURE_BG,
    });

    const img = new Image();
    img.src = dataUrl;

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    const imgWidth = img.width;
    const imgHeight = img.height;

    const usableWidth = pageWidth - 20;
    const usableHeight = pageHeight - 20;

    const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;

    if (!first) pdf.addPage();

    pdf.setFontSize(12);
    pdf.text(section.title, 10, 10);
    pdf.addImage(dataUrl, "PNG", 10, 15, renderWidth, renderHeight);

    first = false;
  }

  pdf.save("hope_explorer_report.pdf");
}

function togglePanel(panelKey: string) {
  setPanelOpen((prev) => ({
    ...prev,
    [panelKey]: !(prev[panelKey] ?? true),
  }));
}

  if (loadingSchema && !schema) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-5 font-mono text-foreground"
      >
        <h1 className="m-0 font-sentient text-xl tracking-tight">HOPE Hybrid Cycle Explorer</h1>
        <p className="mt-2 text-sm text-zinc-100">Loading schema…</p>
      </div>
    );
  }

  const Root = embedded ? "section" : "main";

  const btnBase =
    "rounded-lg border border-zinc-300/70 bg-zinc-700/95 px-3.5 py-2 text-sm font-medium text-zinc-50 shadow-sm transition-colors hover:border-zinc-100 hover:bg-zinc-600/95 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <Root
      {...(embedded
        ? ({ "aria-label": "HOPE Hybrid Cycle Explorer" } as const)
        : {})}
      className="mx-auto max-w-[1600px] p-5 font-mono text-foreground antialiased [color-scheme:dark]"
    >
      <div
        className={cn(
          "mb-5 flex flex-wrap items-center justify-between gap-4",
          embedded ? "items-center" : "items-baseline"
        )}
      >
        {!embedded ? (
          <div>
            <h1 className="m-0 font-sentient text-2xl tracking-tight text-foreground md:text-3xl">
              HOPE Hybrid Cycle Explorer
            </h1>
            <div className="mt-1 text-sm text-zinc-100">
              Hydro Oxy Palta Engine • Reference Model • FAQ + White Paper Backed
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-zinc-100">Explorer controls</div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setKeyMetricsOnly((v) => !v)}
            className={cn(
              btnBase,
              keyMetricsOnly &&
                "border-primary bg-primary/25 font-semibold text-primary shadow-[0_0_12px_-2px_rgba(255,199,0,0.35)]"
            )}
          >
            {keyMetricsOnly ? "Key Metrics" : "Key Metrics Only"}
          </button>

          <button
            type="button"
            onClick={addModel}
            disabled={!schema || models.length >= MAX_MODELS}
            className={btnBase}
          >
            + Add Model
          </button>

          <button
            type="button"
            onClick={resetAllModels}
            disabled={!schema}
            className={btnBase}
          >
            Reset All
          </button>

          <button type="button" onClick={exportDisplayCsv} className={btnBase}>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadPanelPng(graphRef, "hope_performance_graph.png")}
            className={btnBase}
          >
            Download Graph PNG
          </button>

          <button type="button" onClick={downloadExplorerPdf} className={btnBase}>
            Download PDF
          </button>

          <div className="text-xs font-medium text-zinc-400">
            {loadingCompute ? "Computing…" : "Ready"}
          </div>
        </div>
      </div>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-400/50 bg-red-950/60 px-3 py-2.5 text-sm text-red-100">
          <span className="font-semibold">Error:</span> {err}
        </div>
      ) : null}

      {models.length > 0 ? (
        <section className={cn("mb-5 overflow-x-auto", panelShell)}>
          <div
            className="grid items-stretch"
            style={{
              gridTemplateColumns: `260px repeat(${models.length}, minmax(180px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-[3] border-b border-zinc-600/50 bg-zinc-800/90 px-3.5 py-3 font-bold text-zinc-100 shadow-[2px_0_0_0_rgba(161,161,170,0.35)]">
              Models
            </div>

            {models.map((model) => (
              <div
                key={model.id}
                className="border-b border-l border-zinc-600/45 bg-zinc-900/80 px-3.5 py-3 text-center text-[15px] font-bold text-zinc-100"
              >
                {model.name}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!schema ? (
        <p className="text-sm text-zinc-400">No schema loaded.</p>
      ) : (
        <div className="grid gap-5">
          {panels.map((panel) => {
            const isOpen = panelOpen[panel.panel_key] ?? true;

            return (
              <section key={panel.panel_key} className={cn("overflow-x-auto", panelShell)}>
                <button
                  type="button"
                  onClick={() => togglePanel(panel.panel_key)}
                  style={{ background: getPanelHeaderColor(panel.panel_key) }}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-zinc-600/50 px-4 py-3.5 text-left font-bold tracking-wide text-zinc-50"
                >
                  <span className="text-lg">
                    {isOpen ? "▼ " : "▶ "} {panel.panel_key}
                  </span>
                  <span className="text-xs font-medium text-zinc-300">Panel #{panel.panel_order}</span>
                </button>

                {isOpen ? (
                  <table className="min-w-[900px] w-full border-collapse">
                    <thead>
                      <tr>
                        <th
                          style={{ background: getPanelHeaderColor(panel.panel_key) }}
                          className="sticky left-0 z-[3] min-w-[260px] border-y border-zinc-600/45 px-3 py-2.5 text-left text-zinc-50 shadow-[2px_0_0_0_rgba(161,161,170,0.35)]"
                        >
                          Metric
                        </th>

                        {models.map((model) => (
                          <th
                            key={model.id}
                            style={{ background: getPanelHeaderColor(panel.panel_key) }}
                            className="min-w-[180px] border-y border-l border-zinc-600/40 px-3 py-2.5"
                          />
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {panel.items.map((it, rowIndex) => {
                        const role = (it.ui_role ?? "").toLowerCase();
                        if (role === "hidden") return null;

                        const rowBg =
                          rowIndex % 2 === 0 ? "bg-[#18181b]" : "bg-[#27272a]";

                        return (
                          <tr key={`${panel.panel_key}-${it.metric_key}`} className={rowBg}>
                            <td
                              className={cn(
                                "sticky left-0 z-[2] min-w-[260px] border-b border-zinc-600/35 px-3 py-2.5 align-top shadow-[2px_0_0_0_rgba(161,161,170,0.3)]",
                                rowBg
                              )}
                            >
                              <div className="font-semibold text-zinc-50">{it.label}</div>

                              {panel.panel_key === "Editable Inputs" && getRangeText(it) ? (
                                <div className="mt-1 text-xs text-zinc-200">{getRangeText(it)}</div>
                              ) : null}
                            </td>

                            {models.map((model) => {
                              const display = getDisplayValue(model, it);
                              const masked = role === "hidden_value";

                              return (
                                <td
                                  key={`${model.id}-${it.metric_key}`}
                                  className="border-b border-l border-zinc-600/30 px-3 py-2.5 text-right align-middle"
                                >
                                  {isEditable(it) ? (
                                    <input
                                      value={model.inputs[it.metric_key] ?? ""}
                                      onChange={(e) => onChange(model.id, it, e.target.value)}
                                      onBlur={() => onBlurValue(model.id, it)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          onBlurValue(model.id, it);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      className="min-w-[120px] w-full rounded-lg border border-zinc-300/70 bg-zinc-800 px-2.5 py-2 text-right text-sm text-zinc-50 outline-none placeholder:text-zinc-300 focus:border-primary focus:ring-2 focus:ring-primary/45"
                                      inputMode={
                                        normalizeDType(it.dtype) === "number" ||
                                        normalizeDType(it.dtype) === "percent"
                                          ? "decimal"
                                          : "text"
                                      }
                                    />
                                  ) : (
                                    <div className="inline-block min-w-[120px] rounded-lg border border-zinc-300/60 bg-zinc-800/95 px-2.5 py-2 text-right text-sm tabular-nums text-zinc-50">
                                      {masked ? "••••" : display}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
              </section>
            );
          })}

          <section className={cn("overflow-hidden", panelShell)}>
            <button
              type="button"
              onClick={() => togglePanel("Performance Graph")}
              className="flex w-full cursor-pointer items-center justify-between border-b border-zinc-600/50 bg-primary/20 px-4 py-3.5 text-left font-bold tracking-wide text-zinc-50"
            >
              <span className="text-lg">
                {(panelOpen["Performance Graph"] ?? true) ? "▼ " : "▶ "} Performance Graph
              </span>
              <span className="text-xs font-medium text-zinc-300">HOPE Cycle Thermodynamic Trend</span>
            </button>

            {(panelOpen["Performance Graph"] ?? true) ? (
              <div ref={graphRef} className="bg-[#111827] p-4">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="text-sm font-semibold text-zinc-100">Graph Metric:</label>

                    <select
                      value={selectedGraphMetric}
                      onChange={(e) => setSelectedGraphMetric(e.target.value)}
                      className="rounded-lg border border-zinc-300/70 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    >
                      {GRAPH_METRIC_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key} className="bg-background text-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm font-bold text-primary">
                    {GRAPH_METRIC_OPTIONS.find((x) => x.key === selectedGraphMetric)?.label}
                  </div>
                </div>

                <div className="h-[340px] w-full rounded-lg border border-zinc-400/50 bg-[#0b1220] p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      {selectedGraphMetric === "T2_C" ? (
                        <ReferenceLine
                          y={430}
                          stroke="#fdba74"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: "Knock limit", fill: CHART_TICK, fontSize: 11 }}
                        />
                      ) : null}
                      <XAxis
                        dataKey="CR"
                        stroke={CHART_AXIS}
                        tick={{ fill: CHART_TICK, fontSize: 12 }}
                        tickLine={{ stroke: CHART_AXIS }}
                      />
                      <YAxis
                        stroke={CHART_AXIS}
                        tick={{ fill: CHART_TICK, fontSize: 12 }}
                        tickLine={{ stroke: CHART_AXIS }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any) => {
                          const num = Number(value);
                          return [formatGraphValue(selectedGraphMetric, num), ""];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="value"
                        stroke="#FFC700"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#FFC700", stroke: "#1a1a1a", strokeWidth: 1 }}
                        activeDot={{ r: 7, fill: "#ffdf66", stroke: "#FFC700", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </section>

          <section className={cn("overflow-hidden", panelShell)}>
            <button
              type="button"
              onClick={() => togglePanel("IHRL Cooling Recovery Flow")}
              className="flex w-full cursor-pointer items-center justify-between border-b border-zinc-600/50 bg-zinc-800/80 px-4 py-3.5 text-left font-bold tracking-wide text-zinc-50"
            >
              <span className="text-lg">
                {(panelOpen["IHRL Cooling Recovery Flow"] ?? true) ? "▼ " : "▶ "} IHRL Cooling Recovery Flow
              </span>
              <span className="text-xs font-medium text-zinc-300">
                Gross cooling split into recovery and residual net loss
              </span>
            </button>

            {(panelOpen["IHRL Cooling Recovery Flow"] ?? true) ? (
              <div ref={ihrlRef} className="bg-[#111827] p-4">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="text-sm font-semibold text-zinc-100">Model:</label>

                    <select
                      value={selectedSankeyModelId}
                      onChange={(e) => setSelectedSankeyModelId(e.target.value)}
                      className="rounded-lg border border-zinc-300/70 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    >
                      {models.map((model) => (
                        <option key={model.id} value={model.id} className="bg-background text-foreground">
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm font-bold text-primary">{sankeyModel?.name ?? ""}</div>
                </div>

                {ihrlSankeyData && hasIhrlFlow ? (
                  <>
                    <div className="h-[280px] w-full rounded-lg border border-zinc-400/50 bg-[#0b1220] p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                          data={ihrlSankeyData}
                          nodePadding={70}
                          nodeWidth={20}
                          margin={{ top: 10, right: 120, bottom: 10, left: 120 }}
                          linkCurvature={0.35}
                          node={{ stroke: "#fbbf24", strokeWidth: 1.5, fill: "#27272a" }}
                          link={{ stroke: "rgba(251, 191, 36, 0.55)" }}
                        />
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Cooling Gross</div>
                        <div className="font-bold text-zinc-50">
                          {ihrlSankeyData.summary.coolGross.toFixed(0)} J
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">IHRL Recovery</div>
                        <div className="font-bold text-zinc-50">
                          {ihrlSankeyData.summary.ihrl.toFixed(0)} J (
                          {ihrlSankeyData.summary.ihrlPct.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Cooling Net Loss</div>
                        <div className="font-bold text-zinc-50">
                          {ihrlSankeyData.summary.coolNet.toFixed(0)} J (
                          {ihrlSankeyData.summary.coolNetPct.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-200">
                    IHRL flow chart is unavailable for the current model values.
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section className={cn("overflow-hidden", panelShell)}>
            <button
              type="button"
              onClick={() => togglePanel("Sankey Energy Flow")}
              className="flex w-full cursor-pointer items-center justify-between border-b border-zinc-600/50 bg-zinc-800/80 px-4 py-3.5 text-left font-bold tracking-wide text-zinc-50"
            >
              <span className="text-lg">
                {(panelOpen["Sankey Energy Flow"] ?? true) ? "▼ " : "▶ "} Net Energy Partition
              </span>
              <span className="text-xs font-medium text-zinc-300">
                Final cycle energy distribution using net cooling loss
              </span>
            </button>

            {(panelOpen["Sankey Energy Flow"] ?? true) ? (
              <div ref={netEnergyRef} className="bg-[#111827] p-4">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="text-sm font-semibold text-zinc-100">Model:</label>

                    <select
                      value={selectedSankeyModelId}
                      onChange={(e) => setSelectedSankeyModelId(e.target.value)}
                      className="rounded-lg border border-zinc-300/70 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    >
                      {models.map((model) => (
                        <option key={model.id} value={model.id} className="bg-background text-foreground">
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm font-bold text-primary">{sankeyModel?.name ?? ""}</div>
                </div>

                {sankeyData && hasNetEnergyFlow ? (
                  <>
                    <div className="h-[360px] w-full rounded-lg border border-zinc-400/50 bg-[#0b1220] p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                          data={sankeyData}
                          nodePadding={55}
                          nodeWidth={20}
                          margin={{ top: 10, right: 120, bottom: 10, left: 120 }}
                          linkCurvature={0.35}
                          node={{ stroke: "#fbbf24", strokeWidth: 1.5, fill: "#27272a" }}
                          link={{ stroke: "rgba(251, 191, 36, 0.5)" }}
                        />
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Fuel Input</div>
                        <div className="font-bold text-zinc-50">{sankeyData.summary.qIn.toFixed(0)} J</div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Brake Work</div>
                        <div className="font-bold text-zinc-50">
                          {sankeyData.summary.brakePct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Exhaust</div>
                        <div className="font-bold text-zinc-50">
                          {sankeyData.summary.exhaustPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Cooling Net</div>
                        <div className="font-bold text-zinc-50">
                          {sankeyData.summary.coolNetPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Friction</div>
                        <div className="font-bold text-zinc-50">
                          {sankeyData.summary.frictionPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-600/60 bg-zinc-900/90 p-3">
                        <div className="text-xs font-medium text-zinc-400">Unburned</div>
                        <div className="font-bold text-zinc-50">
                          {sankeyData.summary.unburnedPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-200">
                    Net energy flow chart is unavailable for the current model values.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </Root>
  );
}