import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

// ── Gemini Spark Icon SVG ──────────────────────────────────────────────────
const GeminiIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gemGradAI" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path d="M14 2C14 2 15.5 9.5 22 14C15.5 18.5 14 26 14 26C14 26 12.5 18.5 6 14C12.5 9.5 14 2 14 2Z" fill="url(#gemGradAI)" />
  </svg>
);

// ── Formats plain text AI response into structured HTML ───────────────────
function renderAIText(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Section headings (numbered or ALL CAPS patterns)
    if (/^#{1,3}\s/.test(line)) {
      const heading = line.replace(/^#{1,3}\s/, '');
      elements.push(
        <div key={i} className="ai-section-heading">{heading}</div>
      );
    } else if (/^\*\*(.+)\*\*$/.test(line) || /^[1-9]\.\s/.test(line) || /^[A-Z][A-Z\s\/]+:/.test(line)) {
      const clean = line.replace(/\*\*/g, '').replace(/^[1-9]\.\s/, '');
      const isPros = /pros|strength|going well|positive/i.test(clean);
      const isCons = /cons|improve|concern|weak|challeng|risk/i.test(clean);
      const isTop = /top performer/i.test(clean);
      const isRec = /recommend|action/i.test(clean);

      let icon = '📊';
      let color = '#6366f1';
      if (isPros) { icon = '✅'; color = '#10b981'; }
      if (isCons) { icon = '⚠️'; color = '#f59e0b'; }
      if (isTop) { icon = '🏆'; color = '#f59e0b'; }
      if (isRec) { icon = '💡'; color = '#3b82f6'; }

      elements.push(
        <div key={i} className="ai-section-heading" style={{ color }}>
          {icon} {clean}
        </div>
      );
    } else if (/^[-•*]\s/.test(line)) {
      const content = line.replace(/^[-•*]\s/, '').replace(/\*\*/g, '');
      const isPro = elements.some(el => el?.props?.style?.color === '#10b981');
      const isCon = elements.some(el => {
        const txt = el?.props?.children?.join?.('') || '';
        return /cons|improve|concern|weak/i.test(txt);
      });
      elements.push(
        <div key={i} className="ai-bullet-item">
          <span className="ai-bullet-dot" />
          <span>{content}</span>
        </div>
      );
    } else {
      const clean = line.replace(/\*\*/g, '');
      elements.push(
        <p key={i} className="ai-paragraph">{clean}</p>
      );
    }
    i++;
  }
  return elements;
}

// ── Stat card mini component ───────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = '#6366f1', icon }) => (
  <div className="ai-stat-card">
    <div className="ai-stat-icon" style={{ background: `${color}18`, color }}>
      {icon}
    </div>
    <div>
      <div className="ai-stat-value" style={{ color }}>{value}</div>
      <div className="ai-stat-label">{label}</div>
      {sub && <div className="ai-stat-sub">{sub}</div>}
    </div>
  </div>
);

// ── Period Button ──────────────────────────────────────────────────────────
const PeriodBtn = ({ active, onClick, label, desc }) => (
  <button
    onClick={onClick}
    className={`ai-period-btn ${active ? 'active' : ''}`}
  >
    <span className="ai-period-label">{label}</span>
    <span className="ai-period-desc">{desc}</span>
  </button>
);

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
const AISalesSummary = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [dots, setDots] = useState('');
  const dotsRef = useRef(null);

  // Animated loading dots
  useEffect(() => {
    if (loading) {
      dotsRef.current = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.');
      }, 400);
    } else {
      clearInterval(dotsRef.current);
      setDots('');
    }
    return () => clearInterval(dotsRef.current);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/admin/ai-sales-summary', { period }, { timeout: 45000 });
      setResult(res.data);
      setHasGenerated(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate AI summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = period === 'day' ? 'Today' : period === 'week' ? 'Last 7 Days' : 'This Month';

  return (
    <div className="ai-summary-wrapper">
      {/* ── CSS styles injected inline ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes geminiPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(99,102,241,0.5)); }
          50%       { filter: drop-shadow(0 0 14px rgba(168,85,247,0.8)); }
        }
        @keyframes spinDot {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ai-summary-wrapper {
          animation: fadeSlideIn 0.4s ease;
        }

        /* Header */
        .ai-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ai-header-left { display: flex; align-items: center; gap: 14px; }
        .ai-gem-icon-wrap {
          width: 52px; height: 52px; border-radius: 16px;
          background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.14));
          border: 1.5px solid rgba(99,102,241,0.25);
          display: flex; align-items: center; justify-content: center;
          animation: geminiPulse 3s ease-in-out infinite;
          flex-shrink: 0;
        }
        .ai-title { font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; margin-bottom: 4px; }
        .ai-subtitle { font-size: 12.5px; color: #64748b; }
        .ai-gemini-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px 4px 8px; border-radius: 100px;
          background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.12), rgba(59,130,246,0.10));
          border: 1px solid rgba(99,102,241,0.25); margin-top: 6px;
          backdrop-filter: blur(8px); font-size: 11px; font-weight: 600;
          background-clip: text;
        }
        .ai-gemini-badge span {
          background: linear-gradient(90deg, #6366f1, #a855f7, #3b82f6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Period selector */
        .ai-period-row {
          display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;
        }
        .ai-period-btn {
          display: flex; flex-direction: column; align-items: center;
          padding: 10px 22px; border-radius: 14px; border: 1.5px solid #e2e8f0;
          background: #ffffff; cursor: pointer; transition: all 0.2s ease;
          min-width: 100px;
        }
        .ai-period-btn:hover { border-color: #6366f1; background: #f5f3ff; }
        .ai-period-btn.active {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border-color: transparent; color: white;
          box-shadow: 0 6px 18px rgba(99,102,241,0.35);
        }
        .ai-period-label { font-size: 13px; font-weight: 700; }
        .ai-period-desc { font-size: 10px; opacity: 0.65; margin-top: 2px; }

        /* Generate button */
        .ai-generate-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 13px 28px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          color: white; font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 0 8px 20px rgba(99,102,241,0.35);
          transition: all 0.2s ease; margin-bottom: 28px;
        }
        .ai-generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(99,102,241,0.45);
        }
        .ai-generate-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        /* Loading state */
        .ai-loading-card {
          background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(168,85,247,0.06));
          border: 1.5px solid rgba(99,102,241,0.15);
          border-radius: 20px; padding: 40px 32px; text-align: center;
          animation: fadeSlideIn 0.3s ease;
        }
        .ai-loading-spinner {
          width: 42px; height: 42px; border-radius: 50%;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          animation: spinDot 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        .ai-loading-text { font-size: 15px; font-weight: 600; color: #6366f1; }
        .ai-loading-sub { font-size: 12px; color: #94a3b8; margin-top: 6px; }

        /* Error */
        .ai-error-card {
          background: #fef2f2; border: 1.5px solid #fecaca;
          border-radius: 16px; padding: 20px 24px;
          display: flex; gap: 12px; align-items: flex-start;
          animation: fadeSlideIn 0.3s ease; margin-bottom: 20px;
        }
        .ai-error-text { font-size: 13.5px; color: #dc2626; font-weight: 500; }

        /* Stats row */
        .ai-stats-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px; margin-bottom: 24px;
          animation: fadeSlideIn 0.4s ease 0.1s both;
        }
        .ai-stat-card {
          background: #ffffff; border: 1px solid #f1f5f9;
          border-radius: 16px; padding: 16px 18px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ai-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
        .ai-stat-icon {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .ai-stat-value { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
        .ai-stat-label { font-size: 11px; color: #64748b; font-weight: 500; margin-top: 1px; }
        .ai-stat-sub { font-size: 10px; color: #94a3b8; margin-top: 1px; }

        /* AI Result Card */
        .ai-result-card {
          background: #ffffff; border: 1.5px solid rgba(99,102,241,0.15);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 8px 30px rgba(99,102,241,0.08);
          animation: fadeSlideIn 0.5s ease 0.15s both;
        }
        .ai-result-header {
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(99,102,241,0.07), rgba(168,85,247,0.06));
          border-bottom: 1px solid rgba(99,102,241,0.12);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .ai-result-header-left { display: flex; align-items: center; gap: 10px; }
        .ai-result-title { font-size: 14px; font-weight: 700; color: #1e293b; }
        .ai-result-period-badge {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white; font-size: 11px; font-weight: 700;
          padding: 3px 10px; border-radius: 20px;
        }
        .ai-result-body { padding: 24px; }

        /* AI text rendering */
        .ai-section-heading {
          font-size: 13.5px; font-weight: 800; color: #6366f1;
          margin: 20px 0 8px;
          padding-bottom: 6px;
          border-bottom: 1.5px solid rgba(99,102,241,0.12);
          letter-spacing: -0.2px;
        }
        .ai-section-heading:first-child { margin-top: 0; }
        .ai-paragraph {
          font-size: 13.5px; color: #334155; line-height: 1.7;
          margin: 0 0 10px;
        }
        .ai-bullet-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; color: #475569; line-height: 1.65;
          margin-bottom: 8px;
          background: #f8fafc; border-radius: 10px; padding: 9px 14px;
          border-left: 3px solid rgba(99,102,241,0.35);
        }
        .ai-bullet-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #6366f1; flex-shrink: 0; margin-top: 7px;
        }

        /* Empty state */
        .ai-empty-state {
          text-align: center; padding: 60px 32px;
          background: linear-gradient(135deg, rgba(99,102,241,0.03), rgba(168,85,247,0.04));
          border: 2px dashed rgba(99,102,241,0.18);
          border-radius: 20px; animation: fadeSlideIn 0.4s ease;
        }
        .ai-empty-icon {
          font-size: 52px; margin-bottom: 16px;
          animation: geminiPulse 3s ease-in-out infinite;
          display: block;
        }
        .ai-empty-title { font-size: 17px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
        .ai-empty-sub { font-size: 13px; color: #64748b; max-width: 360px; margin: 0 auto; }

        /* Footer regenerate */
        .ai-regen-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          border-top: 1px solid rgba(99,102,241,0.1);
          background: rgba(99,102,241,0.03);
          flex-wrap: wrap; gap: 10px;
        }
        .ai-regen-note { font-size: 11px; color: #94a3b8; }
        .ai-regen-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #6366f1;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px; padding: 6px 14px; cursor: pointer;
          transition: all 0.2s ease;
        }
        .ai-regen-btn:hover { background: rgba(99,102,241,0.15); }
      `}</style>

      {/* ── Header ── */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-gem-icon-wrap">
            <GeminiIcon size={28} />
          </div>
          <div>
            <div className="ai-title">AI Sales Intelligence</div>
            <div className="ai-subtitle">Powered by Gemini 2.5 Flash · Admin Exclusive</div>
            <div className="ai-gemini-badge">
              <GeminiIcon size={13} />
              <span>Gemini AI Integrated</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Period selector ── */}
      <div style={{ marginBottom: 10, fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Select Analysis Period
      </div>
      <div className="ai-period-row">
        <PeriodBtn
          active={period === 'day'}
          onClick={() => setPeriod('day')}
          label="Today"
          desc="Daily overview"
        />
        <PeriodBtn
          active={period === 'week'}
          onClick={() => setPeriod('week')}
          label="Last 7 Days"
          desc="Weekly view"
        />
        <PeriodBtn
          active={period === 'month'}
          onClick={() => setPeriod('month')}
          label="This Month"
          desc="Monthly report"
        />
      </div>

      {/* ── Generate Button ── */}
      <div>
        <button
          className="ai-generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          <GeminiIcon size={18} />
          {loading ? `Gemini is analyzing${dots}` : `Generate AI Summary · ${periodLabel}`}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="ai-error-card">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4, fontSize: 13 }}>AI Summary Failed</div>
            <div className="ai-error-text">{error}</div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="ai-loading-card">
          <div className="ai-loading-spinner" />
          <div className="ai-loading-text">Gemini is analyzing your sales data{dots}</div>
          <div className="ai-loading-sub">Crunching numbers, identifying patterns, writing insights…</div>
        </div>
      )}

      {/* ── Result ── */}
      {result && !loading && (
        <>
          {/* Stats bar */}
          <div className="ai-stats-row">
            <StatCard
              label="Sales Entries"
              value={result.stats.salesCount}
              sub={`₹${(result.stats.totalSalesValue || 0).toLocaleString('en-IN')}`}
              color="#6366f1"
              icon="📦"
            />
            <StatCard
              label="Won Leads"
              value={result.stats.wonLeadsCount}
              sub={`₹${(result.stats.totalLeadsValue || 0).toLocaleString('en-IN')}`}
              color="#10b981"
              icon="🏆"
            />
            <StatCard
              label="Combined Revenue"
              value={`₹${(result.stats.combinedRevenue || 0).toLocaleString('en-IN')}`}
              color="#f59e0b"
              icon="💰"
            />
            <StatCard
              label="Staff Analyzed"
              value={`${result.stats.staffCount} members`}
              color="#3b82f6"
              icon="👥"
            />
          </div>

          {/* AI Result Card */}
          <div className="ai-result-card">
            <div className="ai-result-header">
              <div className="ai-result-header-left">
                <GeminiIcon size={18} />
                <div className="ai-result-title">Gemini AI Analysis Report</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ai-result-period-badge">{periodLabel}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="ai-result-body">
              {renderAIText(result.summary)}
            </div>
            <div className="ai-regen-row">
              <span className="ai-regen-note">
                ✨ Generated by Gemini 2.5 Flash · AI insights may vary
              </span>
              <button className="ai-regen-btn" onClick={handleGenerate}>
                <GeminiIcon size={12} /> Regenerate
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Empty state (before first generate) ── */}
      {!loading && !result && !error && (
        <div className="ai-empty-state">
          <span className="ai-empty-icon">✨</span>
          <div className="ai-empty-title">Your AI Sales Analyst is Ready</div>
          <div className="ai-empty-sub">
            Select a time period above and click <strong>Generate AI Summary</strong> to get Gemini's intelligent analysis of your team's sales performance — including pros, cons, top performers, and actionable recommendations.
          </div>
        </div>
      )}
    </div>
  );
};

export default AISalesSummary;
