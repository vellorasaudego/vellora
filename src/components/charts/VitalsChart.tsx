"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type VitalsPoint = {
  date: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  glucose: number | null;
};

const SERIES_1 = "#2a78d6"; // categorical slot 1 (blue)
const SERIES_2 = "#eb6834"; // categorical slot 2 (orange)
const GRID = "#e1e0d9";
const AXIS = "#898781";

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ChartFrame({
  title,
  unit,
  children,
}: {
  title: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{title}</h4>
        <span className="text-xs text-[var(--muted-2)]">{unit}</span>
      </div>
      <div className="h-48">{children}</div>
    </div>
  );
}

export function BloodPressureChart({ data }: { data: VitalsPoint[] }) {
  return (
    <ChartFrame title="Pressão arterial" unit="mmHg">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} domain={[40, 200]} />
          <Tooltip
            labelFormatter={(v) => formatDay(String(v))}
            contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="bp_systolic" name="Sistólica" stroke={SERIES_1} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="bp_diastolic" name="Diastólica" stroke={SERIES_2} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function SingleMetricChart({
  data,
  dataKey,
  title,
  unit,
  domain,
}: {
  data: VitalsPoint[];
  dataKey: keyof VitalsPoint;
  title: string;
  unit: string;
  domain?: [number, number];
}) {
  return (
    <ChartFrame title={title} unit={unit}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} domain={domain} />
          <Tooltip
            labelFormatter={(v) => formatDay(String(v))}
            contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 12 }}
          />
          <Line type="monotone" dataKey={dataKey} name={title} stroke={SERIES_1} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HeartRateChart({ data }: { data: VitalsPoint[] }) {
  return <SingleMetricChart data={data} dataKey="heart_rate" title="Frequência cardíaca" unit="bpm" domain={[40, 140]} />;
}

export function TemperatureChart({ data }: { data: VitalsPoint[] }) {
  return <SingleMetricChart data={data} dataKey="temperature" title="Temperatura" unit="°C" domain={[34, 40]} />;
}

export function Spo2Chart({ data }: { data: VitalsPoint[] }) {
  return <SingleMetricChart data={data} dataKey="spo2" title="Saturação O2" unit="%" domain={[80, 100]} />;
}

export function GlucoseChart({ data }: { data: VitalsPoint[] }) {
  return <SingleMetricChart data={data} dataKey="glucose" title="Glicemia" unit="mg/dL" domain={[50, 300]} />;
}
