import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

// ── Data ──
const AGE_GROUPS = [
  { label: '18–24', value: 1 }, { label: '25–29', value: 2 },
  { label: '30–34', value: 3 }, { label: '35–39', value: 4 },
  { label: '40–44', value: 5 }, { label: '45–49', value: 6 },
  { label: '50–54', value: 7 }, { label: '55–59', value: 8 },
  { label: '60–64', value: 9 }, { label: '65–69', value: 10 },
  { label: '70–74', value: 11 }, { label: '75–79', value: 12 },
  { label: '80+', value: 13 },
];

const EDU_LEVELS = [
  { label: 'None / FSLC', value: 1 },
  { label: 'JSCE (JSS 1–3)', value: 2 },
  { label: 'SSCE / WAEC / NECO', value: 3 },
  { label: 'OND / NCE / Trade', value: 4 },
  { label: 'HND / BSc / BA', value: 5 },
  { label: 'MSc / PhD / Prof', value: 6 },
];

const INCOME_LEVELS = [
  { label: '<₦200k', value: 1 }, { label: '₦200–500k', value: 2 },
  { label: '₦500k–1m', value: 3 }, { label: '₦1–2m', value: 4 },
  { label: '₦2–5m', value: 5 }, { label: '₦5–10m', value: 6 },
  { label: '₦10–20m', value: 7 }, { label: '>₦20m', value: 8 },
];

const HEALTH_RATINGS = [
  { label: 'Excellent', value: 1, tone: 'palm' },
  { label: 'V. Good', value: 2, tone: 'palm' },
  { label: 'Good', value: 3, tone: 'gold' },
  { label: 'Fair', value: 4, tone: 'terracotta' },
  { label: 'Poor', value: 5, tone: 'crimson' },
];

const TIER_META = {
  'Very Low':  { color: '#4a7c59', word: 'Minimal' },
  'Low':       { color: '#5a9e6d', word: 'Low' },
  'Moderate':  { color: '#c4853e', word: 'Moderate' },
  'High':      { color: '#b84a2f', word: 'High' },
  'Very High': { color: '#8b1e2b', word: 'Critical' },
};

const TONE_CSS = {
  palm:       { border: '#4a7c59', bg: 'rgba(74,124,89,0.12)', text: '#5a9e6d' },
  gold:       { border: '#c4853e', bg: 'rgba(196,133,62,0.12)', text: '#d4a843' },
  terracotta: { border: '#b84a2f', bg: 'rgba(184,74,47,0.10)',   text: '#c85a3f' },
  crimson:    { border: '#8b1e2b', bg: 'rgba(139,30,43,0.10)',   text: '#a03a4a' },
};

// ── Gauge ──
const Gauge = ({ pct, color }) => {
  const r = 52, stroke = 8;
  const n = Math.min(100, Math.max(0, pct));
  const circ = 2 * Math.PI * r;
  const off = circ - (n / 100) * circ;
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(232,213,183,0.06)" strokeWidth={stroke} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={60 + (r - 10) * Math.cos(a)} y1={60 + (r - 10) * Math.sin(a)}
              x2={60 + (r - 16) * Math.cos(a)} y2={60 + (r - 16) * Math.sin(a)}
              stroke="rgba(232,213,183,0.1)" strokeWidth="1"
            />
          );
        })}
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl" style={{ color, fontWeight: 500, lineHeight: 1 }}>
          {pct.toFixed(1)}<span className="text-sm" style={{ color: 'var(--sand-dim)' }}>%</span>
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] mt-0.5" style={{ color: 'var(--sand-dim)' }}>Diabetes Risk</span>
      </div>
    </div>
  );
};

// ── Robust Number Input ──
const NumInput = ({ label, value, onChange, min, max, unit }) => {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused
  React.useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  const commit = useCallback(() => {
    let num = parseFloat(raw);
    if (isNaN(num) || raw === '' || raw === '-') {
      num = value;
    } else {
      num = Math.max(min, Math.min(max, num));
    }
    setRaw(String(num));
    onChange(num);
    setFocused(false);
  }, [raw, value, min, max, onChange]);

  return (
    <div>
      <label className="font-body text-sm uppercase block mb-0" style={{ color: 'var(--sand-dim)' }}>{label}</label>
      <div className="flex items-baseline">
        <input
          type="text"
          inputMode="decimal"
          value={focused ? raw : String(value)}
          onFocus={() => { setFocused(true); setRaw(String(value)); }}
          onBlur={commit}
          onChange={(e) => {
            const v = e.target.value;
            // Allow empty, minus sign, or valid decimal partials
            if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) {
              setRaw(v);
            }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          className="w-full bg-transparent border-b border-[rgba(232,213,183,0.15)] py-0.5 font-mono text-base focus:outline-none focus:border-[var(--ochre)] transition-colors"
          style={{ color: 'var(--sand)' }}
        />
        {unit && <span className="font-mono text-xs ml-1" style={{ color: 'var(--sand-dim)' }}>{unit}</span>}
      </div>
    </div>
  );
};

// ── Primitives ──
const Btn = ({ onClick, children, ghost, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={ghost ? 'btn-ghost' : 'btn-ochre'}>
    {children}
  </button>
);

const Pill = ({ label, value, current, onClick }) => (
  <button onClick={() => onClick(value)}
    className="pill-selector"
    style={{
      padding: '0.45rem 0.8rem', fontSize: '1rem',
      borderColor: current === value ? 'var(--ochre)' : 'rgba(232,213,183,0.1)',
      background: current === value ? 'var(--ochre)' : 'transparent',
      color: current === value ? 'var(--earth-deep)' : 'var(--sand-dim)',
      fontWeight: current === value ? 700 : 400,
    }}>
    {label}
  </button>
);

const Toggle = ({ label, value, onChange, risk, tooltip }) => (
  <div className="tooltip-wrap w-full h-full">
    {tooltip && <span className="tooltip-text">{tooltip}</span>}
    <button onClick={() => onChange(value === 1 ? 0 : 1)}
      className="toggle-clinical w-full h-full"
      style={{
        padding: '0.45rem 0.5rem',
        borderColor: value === 1 ? (risk ? 'var(--terracotta)' : 'var(--palm)') : 'rgba(232,213,183,0.08)',
        background: value === 1
          ? (risk ? 'linear-gradient(145deg,rgba(184,74,47,0.1),rgba(42,31,18,0.5))' : 'linear-gradient(145deg,rgba(74,124,89,0.12),rgba(42,31,18,0.5))')
          : 'rgba(42,31,18,0.5)',
        boxShadow: value === 1 ? (risk ? '0 0 12px var(--terracotta-glow)' : '0 0 12px var(--palm-glow)') : 'none',
      }}>
      <span className="font-body text-base leading-tight text-center" style={{ color: value === 1 ? 'var(--sand)' : 'var(--sand-dim)' }}>{label}</span>
      <div className="toggle-track" style={{ width: 32, height: 16 }}>
        <div className="toggle-knob" style={{
          width: 12, height: 12, top: 2, left: value === 1 ? 18 : 2,
          background: value === 1 ? (risk ? 'var(--terracotta)' : 'var(--palm)') : 'var(--sand-dim)',
          boxShadow: value === 1 ? (risk ? '0 0 6px var(--terracotta-glow)' : '0 0 6px var(--palm-glow)') : 'none',
        }} />
      </div>
    </button>
  </div>
);

const Slider = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center gap-3">
    <span className="font-body text-base shrink-0" style={{ color: 'var(--sand-dim)', width: 180 }}>{label}</span>
    <input type="range" min={min} max={max} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider-clinical flex-1" />
    <span className="font-mono text-sm shrink-0" style={{ color: 'var(--ochre)', width: 28, textAlign: 'right' }}>{value}</span>
  </div>
);

const Card = ({ children, className = '', style = {} }) => (
  <div className={`card-editorial ${className}`} style={{ padding: '0.75rem 1rem', ...style }}>{children}</div>
);

// ── Main App ──
export default function App() {
  const [view, setView] = useState('landing');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [weightUnit, setWeightUnit] = useState('kg');

  const [form, setForm] = useState({
    Sex: 0, Age: 4, Education: 4, Income: 4,
    HeightFt: 5, HeightIn: 9, WeightKg: 77, // ~77kg default (~170lb)
    HighBP: 0, HighChol: 0, CholCheck: 1,
    Stroke: 0, HeartDiseaseorAttack: 0, DiffWalk: 0,
    GenHlth: 3, PhysActivity: 0, Fruits: 1, Veggies: 1,
    Smoker: 0, HvyAlcoholConsump: 0,
    MentHlth: 2, PhysHlth: 2,
    AnyHealthcare: 1, NoDocbcCost: 0,
  });

  // ── Backend Health Status ──
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const API_BASE = 'https://lifelens-ai-2it2.onrender.com';
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          setBackendStatus(data.model_loaded ? 'online' : 'degraded');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    };

    checkHealth();
    const id = setInterval(checkHealth, 15000);
    return () => clearInterval(id);
  }, []);

  const weightLb = useMemo(() => {
    return weightUnit === 'kg' ? form.WeightKg * 2.20462 : form.WeightKg;
  }, [form.WeightKg, weightUnit]);

  const bmi = useMemo(() => {
    const totalInches = form.HeightFt * 12 + form.HeightIn;
    if (totalInches <= 0) return 0;
    return (703 * weightLb) / (totalInches * totalInches);
  }, [form.HeightFt, form.HeightIn, weightLb]);

  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      const payload = {
        HighBP: form.HighBP, HighChol: form.HighChol, CholCheck: form.CholCheck,
        BMI: parseFloat(bmi.toFixed(2)), Smoker: form.Smoker, Stroke: form.Stroke,
        HeartDiseaseorAttack: form.HeartDiseaseorAttack, PhysActivity: form.PhysActivity,
        Fruits: form.Fruits, Veggies: form.Veggies, HvyAlcoholConsump: form.HvyAlcoholConsump,
        AnyHealthcare: form.AnyHealthcare, NoDocbcCost: form.NoDocbcCost,
        GenHlth: form.GenHlth, MentHlth: form.MentHlth, PhysHlth: form.PhysHlth,
        DiffWalk: form.DiffWalk, Sex: form.Sex, Age: form.Age,
        Education: form.Education, Income: form.Income,
      };
      const res = await fetch('https://lifelens-ai-2it2.onrender.com/api/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResult(await res.json());
      setStep(4);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const resultsRef = useRef(null);

  const downloadReport = useCallback(async () => {
    if (!resultsRef.current) return;
    const canvas = await html2canvas(resultsRef.current, {
      backgroundColor: '#1a1209',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `LifeLens_Report_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // ── Step 1: Identity & Body ──
  const Step1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Left: Demographics */}
      <div className="md:col-span-3 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Sex</label>
        <div className="flex flex-col gap-2">
          <Pill label="Female" value={0} current={form.Sex} onClick={(v) => upd('Sex', v)} />
          <Pill label="Male" value={1} current={form.Sex} onClick={(v) => upd('Sex', v)} />
        </div>

        <label className="font-mono text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--ochre)' }}>Age Group</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
          {AGE_GROUPS.map((a) => (
            <Pill key={a.value} label={a.label} value={a.value} current={form.Age} onClick={(v) => upd('Age', v)} />
          ))}
        </div>
      </div>

      {/* Middle: Body Composition */}
      <div className="md:col-span-4 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Body Composition</label>
        <Card>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            <NumInput label="Feet" value={form.HeightFt} onChange={(v) => upd('HeightFt', v)} min={1} max={8} />
            <NumInput label="Inches" value={form.HeightIn} onChange={(v) => upd('HeightIn', v)} min={0} max={11} />
            <NumInput
              label={`Weight (${weightUnit})`}
              value={weightUnit === 'kg' ? Math.round(form.WeightKg) : Math.round(form.WeightKg * 2.20462)}
              onChange={(v) => {
                if (weightUnit === 'kg') upd('WeightKg', v);
                else upd('WeightKg', v / 2.20462);
              }}
              min={weightUnit === 'kg' ? 20 : 44}
              max={weightUnit === 'kg' ? 250 : 551}
            />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(232,213,183,0.06)]">
            <div className="flex items-center gap-2">
              <span className="font-body text-sm uppercase" style={{ color: 'var(--sand-dim)' }}>Unit</span>
              <div className="flex gap-1">
                <button onClick={() => setWeightUnit('kg')}
                  className="font-mono text-sm uppercase px-2.5 py-1 rounded-sm transition-all"
                  style={{
                    background: weightUnit === 'kg' ? 'var(--ochre)' : 'transparent',
                    color: weightUnit === 'kg' ? 'var(--earth-deep)' : 'var(--sand-dim)',
                    border: `1px solid ${weightUnit === 'kg' ? 'var(--ochre)' : 'rgba(232,213,183,0.15)'}`,
                  }}>kg</button>
                <button onClick={() => setWeightUnit('lb')}
                  className="font-mono text-sm uppercase px-2.5 py-1 rounded-sm transition-all"
                  style={{
                    background: weightUnit === 'lb' ? 'var(--ochre)' : 'transparent',
                    color: weightUnit === 'lb' ? 'var(--earth-deep)' : 'var(--sand-dim)',
                    border: `1px solid ${weightUnit === 'lb' ? 'var(--ochre)' : 'rgba(232,213,183,0.15)'}`,
                  }}>lb</button>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-body text-sm uppercase" style={{ color: 'var(--sand-dim)' }}>BMI</span>
              <span className="font-mono text-xl leading-none" style={{
                color: bmi >= 30 ? 'var(--terracotta)' : bmi >= 25 ? 'var(--gold)' : 'var(--palm)',
                textShadow: bmi >= 30 ? '0 0 12px var(--terracotta-glow)' : bmi >= 25 ? '0 0 12px var(--gold-glow)' : '0 0 12px var(--palm-glow)',
              }}>
                {bmi.toFixed(1)}
              </span>
            </div>
          </div>
        </Card>

        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Clinical Conditions</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Toggle label="High BP" value={form.HighBP} onChange={(v) => upd('HighBP', v)} risk tooltip="Has a doctor told you your blood pressure is high?" />
          <Toggle label="High Chol" value={form.HighChol} onChange={(v) => upd('HighChol', v)} risk tooltip="Has a doctor told you your cholesterol level is high?" />
          <Toggle label="Stroke" value={form.Stroke} onChange={(v) => upd('Stroke', v)} risk tooltip="Have you ever had a stroke?" />
          <Toggle label="Heart Disease" value={form.HeartDiseaseorAttack} onChange={(v) => upd('HeartDiseaseorAttack', v)} risk tooltip="Have you had a heart attack or been told you have coronary heart disease?" />
          <Toggle label="Diff. Walking" value={form.DiffWalk} onChange={(v) => upd('DiffWalk', v)} risk tooltip="Do you have serious difficulty walking or climbing stairs?" />
          <Toggle label="Chol Check" value={form.CholCheck} onChange={(v) => upd('CholCheck', v)} tooltip="Have you had your cholesterol checked in the past 5 years?" />
        </div>
      </div>

      {/* Right: Socioeconomic */}
      <div className="md:col-span-5 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Education Level</label>
        <div className="grid grid-cols-2 gap-2">
          {EDU_LEVELS.map((e) => (
            <Pill key={e.value} label={e.label} value={e.value} current={form.Education} onClick={(v) => upd('Education', v)} />
          ))}
        </div>

        <label className="font-mono text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--ochre)' }}>Annual Income (₦)</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INCOME_LEVELS.map((i) => (
            <Pill key={i.value} label={i.label} value={i.value} current={form.Income} onClick={(v) => upd('Income', v)} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 2: Lifestyle & Habits ──
  const Step2 = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Left: Health & Food */}
      <div className="md:col-span-5 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>General Health</label>
        <div className="grid grid-cols-3 sm:flex gap-2">
          {HEALTH_RATINGS.map((h) => {
            const t = TONE_CSS[h.tone];
            return (
              <button key={h.value} onClick={() => upd('GenHlth', h.value)}
                className="pill-selector flex-1"
                style={{
                  padding: '0.4rem 0.35rem', fontSize: '0.95rem',
                  borderColor: form.GenHlth === h.value ? t.border : 'rgba(232,213,183,0.1)',
                  background: form.GenHlth === h.value ? t.bg : 'transparent',
                  color: form.GenHlth === h.value ? t.text : 'var(--sand-dim)',
                  fontWeight: form.GenHlth === h.value ? 700 : 400,
                }}>
                {h.label}
              </button>
            );
          })}
        </div>

        <label className="font-mono text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--ochre)' }}>Daily Habits</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Toggle label="Exercise (walk/farm)" value={form.PhysActivity} onChange={(v) => upd('PhysActivity', v)} tooltip="Do you engage in physical activity or exercise (brisk walking, farming, trekking) in a typical week?" />
          <Toggle label="Eat Fruits (mango)" value={form.Fruits} onChange={(v) => upd('Fruits', v)} tooltip="Do you eat fruits (mango, orange, watermelon, banana, etc.) at least once daily?" />
          <Toggle label="Eat Veg (efo/ugwu)" value={form.Veggies} onChange={(v) => upd('Veggies', v)} tooltip="Do you eat vegetables (efo, ugwu, okra, bitter leaf, cabbage) at least once daily?" />
          <Toggle label="Heavy Drink (wine)" value={form.HvyAlcoholConsump} onChange={(v) => upd('HvyAlcoholConsump', v)} risk tooltip="Do you drink heavily? For men: 14+ drinks/week. For women: 7+ drinks/week." />
          <Toggle label="Smoker" value={form.Smoker} onChange={(v) => upd('Smoker', v)} risk tooltip="Have you smoked at least 100 cigarettes in your entire life and do you currently smoke?" />
          <Toggle label="Has NHIS/Private" value={form.AnyHealthcare} onChange={(v) => upd('AnyHealthcare', v)} tooltip="Do you have any kind of health care coverage — NHIS, private insurance, HMO, or employer plan?" />
        </div>

        <Toggle label="Skipped doctor (cost)" value={form.NoDocbcCost} onChange={(v) => upd('NoDocbcCost', v)} risk tooltip="In the past 12 months, was there a time you needed to see a doctor but could not because of cost?" />

        <label className="font-mono text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--ochre)' }}>Health Burden (days / 30)</label>
        <Card className="flex flex-col gap-4 justify-center">
          <Slider label="Poor Mental Health" value={form.MentHlth} min={0} max={30} onChange={(v) => upd('MentHlth', v)} />
          <Slider label="Poor Physical Health" value={form.PhysHlth} min={0} max={30} onChange={(v) => upd('PhysHlth', v)} />
        </Card>
      </div>

      {/* Right: Review Preview */}
      <div className="md:col-span-7 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Review Before Analysis</label>
        <Card className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Sex <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{form.Sex === 0 ? 'Female' : 'Male'}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Age <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{AGE_GROUPS.find(a => a.value === form.Age)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>BMI <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: bmi >= 30 ? 'var(--terracotta)' : bmi >= 25 ? 'var(--gold)' : 'var(--palm)' }}>{bmi.toFixed(1)}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Health <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{HEALTH_RATINGS.find(h => h.value === form.GenHlth)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Income <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{INCOME_LEVELS.find(i => i.value === form.Income)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Education <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono text-right" style={{ color: 'var(--sand)' }}>{EDU_LEVELS.find(e => e.value === form.Education)?.label}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-[rgba(232,213,183,0.06)] flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-mono">
            {form.HighBP === 1 && <span style={{ color: 'var(--terracotta)' }}>● High BP</span>}
            {form.HighChol === 1 && <span style={{ color: 'var(--terracotta)' }}>● High Cholesterol</span>}
            {form.Stroke === 1 && <span style={{ color: 'var(--terracotta)' }}>● Stroke</span>}
            {form.HeartDiseaseorAttack === 1 && <span style={{ color: 'var(--terracotta)' }}>● Heart Disease</span>}
            {form.DiffWalk === 1 && <span style={{ color: 'var(--terracotta)' }}>● Diff. Walking</span>}
            {form.Smoker === 1 && <span style={{ color: 'var(--terracotta)' }}>● Smoker</span>}
            {form.HvyAlcoholConsump === 1 && <span style={{ color: 'var(--terracotta)' }}>● Heavy Drinker</span>}
            {form.NoDocbcCost === 1 && <span style={{ color: 'var(--terracotta)' }}>● Skipped Care (Cost)</span>}
            {form.PhysActivity === 1 && <span style={{ color: 'var(--palm)' }}>● Active</span>}
            {form.Fruits === 1 && <span style={{ color: 'var(--palm)' }}>● Eats Fruits</span>}
            {form.Veggies === 1 && <span style={{ color: 'var(--palm)' }}>● Eats Vegetables</span>}
            {form.AnyHealthcare === 1 && <span style={{ color: 'var(--palm)' }}>● Has Insurance</span>}
          </div>
        </Card>
      </div>
    </div>
  );

  // ── Step 3: Review & Generate ──
  const Step3 = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div className="md:col-span-5 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Summary</label>
        <Card className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Sex <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{form.Sex === 0 ? 'Female' : 'Male'}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Age <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{AGE_GROUPS.find(a => a.value === form.Age)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>BMI <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: bmi >= 30 ? 'var(--terracotta)' : bmi >= 25 ? 'var(--gold)' : 'var(--palm)' }}>{bmi.toFixed(1)}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Health <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{HEALTH_RATINGS.find(h => h.value === form.GenHlth)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Income <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono" style={{ color: 'var(--sand)' }}>{INCOME_LEVELS.find(i => i.value === form.Income)?.label}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--sand-dim)' }}>Education <span style={{ color: 'var(--sand-dim)', opacity: 0.4 }}>—</span></span><span className="font-mono text-right" style={{ color: 'var(--sand)' }}>{EDU_LEVELS.find(e => e.value === form.Education)?.label}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-[rgba(232,213,183,0.06)] flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
            {form.HighBP === 1 && <span style={{ color: 'var(--terracotta)' }}>● High BP</span>}
            {form.HighChol === 1 && <span style={{ color: 'var(--terracotta)' }}>● High Chol</span>}
            {form.Stroke === 1 && <span style={{ color: 'var(--terracotta)' }}>● Stroke</span>}
            {form.HeartDiseaseorAttack === 1 && <span style={{ color: 'var(--terracotta)' }}>● Heart Disease</span>}
            {form.DiffWalk === 1 && <span style={{ color: 'var(--terracotta)' }}>● Diff. Walk</span>}
            {form.Smoker === 1 && <span style={{ color: 'var(--terracotta)' }}>● Smoker</span>}
            {form.HvyAlcoholConsump === 1 && <span style={{ color: 'var(--terracotta)' }}>● Heavy Drink</span>}
            {form.NoDocbcCost === 1 && <span style={{ color: 'var(--terracotta)' }}>● Skipped Care</span>}
            {form.PhysActivity === 1 && <span style={{ color: 'var(--palm)' }}>● Active</span>}
            {form.Fruits === 1 && <span style={{ color: 'var(--palm)' }}>● Fruits</span>}
            {form.Veggies === 1 && <span style={{ color: 'var(--palm)' }}>● Veggies</span>}
            {form.AnyHealthcare === 1 && <span style={{ color: 'var(--palm)' }}>● Insurance</span>}
          </div>
        </Card>
      </div>
      <div className="md:col-span-7 flex flex-col gap-4">
        <label className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Ready to Generate</label>
        <Card className="flex flex-col items-center justify-center text-center gap-4 p-8">
          <div className="font-display text-xl" style={{ color: 'var(--sand)' }}>Generate Your Risk Report</div>
          <p className="font-body text-sm max-w-sm" style={{ color: 'var(--sand-dim)' }}>
            Review the summary. Once satisfied, click below to run the analysis.
          </p>
          <Btn onClick={submit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-[var(--earth-deep)] border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : 'Generate Report →'}
          </Btn>
        </Card>
      </div>
    </div>
  );

  // ── Step 4: Results ──
  const Step4 = () => {
    if (!result) return null;
    const meta = TIER_META[result.tier] || TIER_META['Moderate'];
    const highRecs = result.recommendations.filter((r) => r.priority === 'high');
    const medRecs = result.recommendations.filter((r) => r.priority === 'medium');

    return (
      <div ref={resultsRef} className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Left: Gauge + Grade + Snapshot */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <Card className="flex items-center gap-3">
            <Gauge pct={result.risk_percentage} color={meta.color} />
            <div className="flex-1 min-w-0">
              <span className="font-display text-2xl" style={{ color: meta.color, lineHeight: 1.1 }}>{meta.word}</span>
              <p className="font-body text-base mt-1 leading-snug" style={{ color: 'var(--sand-dim)' }}>{result.action}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="font-mono text-5xl font-medium shrink-0"
              style={{
                color: result.lifestyle.grade === 'A' ? 'var(--palm)' :
                       result.lifestyle.grade === 'F' ? 'var(--crimson)' : 'var(--gold)',
                textShadow: result.lifestyle.grade === 'A' ? '0 0 20px var(--palm-glow)' :
                            result.lifestyle.grade === 'F' ? '0 0 20px var(--crimson-glow)' : 'none',
              }}>
              {result.lifestyle.grade}
            </div>
            <div>
              <div className="font-mono text-lg" style={{ color: 'var(--sand)' }}>
                {result.lifestyle.score}<span className="text-base ml-1" style={{ color: 'var(--sand-dim)' }}>/ 100</span>
              </div>
              <span className="font-body text-sm" style={{ color: 'var(--sand-dim)' }}>Lifestyle Score</span>
            </div>
          </Card>

          <Card className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <div className="h-px w-3" style={{ background: 'var(--ochre)' }} />
              <span className="font-mono text-sm uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Clinical Snapshot</span>
            </div>
            <div className="space-y-1 text-base">
              {[
                ['Comorbidity Score', result.feature_vector[25], 'var(--sand)'],
                ['BMI Class', result.feature_vector[24] ? 'Severely Obese' : result.feature_vector[21] ? 'Obese' : result.feature_vector[22] ? 'Overweight' : 'Normal',
                  result.feature_vector[24] ? 'var(--crimson)' : result.feature_vector[21] ? 'var(--terracotta)' : result.feature_vector[22] ? 'var(--gold)' : 'var(--palm)'],
                ['Metabolic Syndrome', result.feature_vector[28] ? 'Detected' : 'None', result.feature_vector[28] ? 'var(--terracotta)' : 'var(--palm)'],
                ['Healthcare Gap', result.feature_vector[37] ? 'Present' : 'None', result.feature_vector[37] ? 'var(--gold)' : 'var(--palm)'],
                ['Risk Index', result.feature_vector[36], 'var(--sand)'],
              ].map(([label, val, col]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: 'var(--sand-dim)' }}>{label}</span>
                  <span className="font-mono" style={{ color: col }}>{val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Recommendations */}
        <div className="md:col-span-8 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <div className="h-px w-4" style={{ background: 'var(--ochre)' }} />
              <span className="font-mono text-sm uppercase tracking-wider" style={{ color: 'var(--ochre)' }}>Interventions</span>
              <span className="font-mono text-sm" style={{ color: 'var(--sand-dim)' }}>{result.recommendations.length} flagged</span>
            </div>
            <button onClick={downloadReport} className="font-mono text-sm uppercase px-4 py-2 rounded-sm transition-all flex items-center gap-2 shrink-0"
              style={{ background: 'var(--ochre)', color: 'var(--earth-deep)', border: '1px solid var(--ochre)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Save Report
            </button>
          </div>

          {result.recommendations.length === 0 ? (
            <Card className="flex-1 flex items-center justify-center">
              <span className="font-display text-2xl" style={{ color: 'var(--palm)' }}>No interventions flagged</span>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {highRecs.map((rec, i) => (
                <Card key={`h-${i}`} className="glow-high" style={{ padding: '0.75rem 1rem' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm uppercase tracking-wider px-2 py-1" style={{ background: 'rgba(184,74,47,0.15)', color: 'var(--terracotta)', borderRadius: '3px' }}>High</span>
                    <span className="font-body text-sm" style={{ color: 'var(--sand-dim)' }}>{rec.category}</span>
                  </div>
                  <h4 className="font-display text-lg mb-1" style={{ color: 'var(--sand)' }}>{rec.title}</h4>
                  <p className="font-body text-base leading-relaxed mb-2" style={{ color: 'var(--sand-dim)' }}>{rec.text}</p>
                  <p className="font-body text-sm italic leading-snug pl-3 border-l-2 border-[var(--terracotta)]" style={{ color: 'var(--sand-dim)', opacity: 0.8 }}>{rec.evidence}</p>
                </Card>
              ))}
              {medRecs.map((rec, i) => (
                <Card key={`m-${i}`} className="glow-medium" style={{ padding: '0.75rem 1rem' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm uppercase tracking-wider px-2 py-1" style={{ background: 'rgba(212,168,67,0.12)', color: 'var(--gold)', borderRadius: '3px' }}>Medium</span>
                    <span className="font-body text-sm" style={{ color: 'var(--sand-dim)' }}>{rec.category}</span>
                  </div>
                  <h4 className="font-display text-lg mb-1" style={{ color: 'var(--sand)' }}>{rec.title}</h4>
                  <p className="font-body text-base leading-relaxed mb-2" style={{ color: 'var(--sand-dim)' }}>{rec.text}</p>
                  <p className="font-body text-sm italic leading-snug pl-3 border-l-2 border-[var(--gold)]" style={{ color: 'var(--sand-dim)', opacity: 0.8 }}>{rec.evidence}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Landing Page ──
  const LandingPage = () => (
    <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-8 gap-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="space-y-4">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight" style={{ color: 'var(--sand)' }}>
          Know Your Diabetes Risk
        </h1>
        <p className="font-body text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--sand-dim)' }}>
          A clinical-grade assessment built for Nigerians. Enter your health details, get a personalized risk score, and receive actionable lifestyle recommendations.
        </p>
      </div>

      {/* Gauge Preview */}
      <div className="flex flex-col items-center gap-2">
        <Gauge pct={50} color={'var(--ochre)'} />
        <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--sand-dim)' }}>Sample Risk Output</span>
      </div>

      {/* CTA */}
      <Btn onClick={() => { setStep(1); setResult(null); setError(null); setView('app'); }}>
        Take Test →
      </Btn>

      {/* How It Works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-4">
        {[
          { title: 'Enter Details', desc: 'Age, weight, habits, and health history' },
          { title: 'Get Assessed', desc: 'ML-powered risk score + lifestyle grade' },
          { title: 'Take Action', desc: 'Personalized Nigerian-context recommendations' },
        ].map((card, i) => (
          <Card key={i} className="flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center font-mono text-sm"
              style={{ borderRadius: '50%', border: '1px solid var(--ochre)', color: 'var(--ochre)' }}>
              {String(i + 1)}
            </div>
            <h3 className="font-display text-lg" style={{ color: 'var(--sand)' }}>{card.title}</h3>
            <p className="font-body text-sm" style={{ color: 'var(--sand-dim)' }}>{card.desc}</p>
          </Card>
        ))}
      </div>

      {/* Trust line */}
      <p className="font-body text-xs max-w-xl" style={{ color: 'rgba(232,213,183,0.35)' }}>
        Based on CDC BRFSS clinical data. Not a substitute for professional medical advice.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen h-screen flex flex-col relative overflow-hidden">
      <div className="atmosphere" />

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(232,213,183,0.06)] shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center relative">
          {/* Left: Logo */}
          <button onClick={() => setView('landing')} className="flex items-baseline gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="font-display text-lg tracking-tight" style={{ color: 'var(--sand)' }}>LifeLens</span>
          </button>

          {/* Center: Title (absolute on desktop, hidden on very small) */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: 'var(--ochre)' }}>Diabetes Risk Screening</span>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="w-2 h-2 rounded-full self-center" style={{
              background: backendStatus === 'online' ? 'var(--palm)' : backendStatus === 'degraded' ? 'var(--gold)' : 'var(--terracotta)',
              boxShadow: backendStatus === 'online' ? '0 0 6px var(--palm-glow)' : backendStatus === 'degraded' ? '0 0 6px var(--gold-glow)' : '0 0 6px var(--terracotta-glow)',
            }} />
            <span className="font-mono text-xs uppercase tracking-wider leading-none self-center" style={{ color: 'var(--sand-dim)' }}>
              {backendStatus === 'online' ? 'Online' : backendStatus === 'degraded' ? 'Degraded' : backendStatus === 'checking' ? 'Checking…' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Landing Page */}
          {view === 'landing' && <LandingPage />}

          {/* App Wizard */}
          {view === 'app' && (
            <>
              {/* Step Indicator */}
              {step < 4 && (
                <div className="flex items-center gap-0 mt-8 mb-4 sm:mb-6 shrink-0 mx-auto max-w-5xl">
                  {[1, 2, 3].map((s, i) => (
                    <React.Fragment key={s}>
                      <button onClick={() => step > s && setStep(s)}
                        className="flex flex-col items-center gap-1 px-3 py-1 transition-all"
                        style={{ opacity: step >= s ? 1 : 0.35, cursor: step > s ? 'pointer' : 'default' }}>
                        <div className="w-8 h-8 flex items-center justify-center font-mono text-sm"
                          style={{
                            borderRadius: '50%',
                            border: step === s ? '2px solid var(--ochre)' : step > s ? '2px solid rgba(196,133,62,0.4)' : '2px solid rgba(232,213,183,0.1)',
                            background: step === s ? 'rgba(196,133,62,0.15)' : 'transparent',
                            color: step >= s ? 'var(--ochre)' : 'var(--sand-dim)',
                            boxShadow: step === s ? '0 0 14px var(--ochre-glow)' : 'none',
                          }}>
                          {step > s ? '✓' : String(s)}
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: step >= s ? 'var(--sand-dim)' : 'rgba(232,213,183,0.2)' }}>
                          {s === 1 ? 'Identity' : s === 2 ? 'Lifestyle' : 'Review'}
                        </span>
                      </button>
                      {s < 3 && (
                        <div className="w-10 h-0.5 relative mx-1">
                          <div className="absolute inset-0" style={{ background: 'rgba(232,213,183,0.08)' }} />
                          <div className="absolute inset-0 origin-left transition-transform duration-500"
                            style={{ background: 'var(--ochre)', transform: step > s ? 'scaleX(1)' : 'scaleX(0)', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center">
                  <div className={`w-full mx-auto ${step < 4 ? 'max-w-5xl' : 'max-w-7xl'}`}>
                    {step === 1 && <Step1 />}
                    {step === 2 && <Step2 />}
                    {step === 3 && <Step3 />}
                    {step === 4 && <Step4 />}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-2 p-2 shrink-0" style={{ background: 'rgba(139,30,43,0.1)', borderLeft: '2px solid var(--crimson)', borderRadius: '0 2px 2px 0' }}>
                  <p className="font-body text-xs" style={{ color: '#c45a6b' }}>{error}</p>
                </div>
              )}

              {/* Navigation */}
              {step < 3 && (
                <div className="mt-auto pt-4 flex items-center justify-between shrink-0">
                  <Btn ghost onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>← Back</Btn>
                  <Btn onClick={() => setStep((s) => s + 1)}>Continue →</Btn>
                </div>
              )}
              {step === 4 && (
                <div className="mt-auto pt-4 flex justify-end shrink-0">
                  <Btn ghost onClick={() => { setResult(null); setStep(1); }}>New Assessment →</Btn>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(232,213,183,0.06)] shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(232,213,183,0.25)' }}>
            DISCLAIMER: Not a substitute for professional medical advice. Consult a physician at a General Hospital or Teaching Hospital.
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(232,213,183,0.2)' }}>v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
