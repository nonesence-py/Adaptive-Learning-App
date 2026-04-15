import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { KNOWLEDGE_GRAPH, getUserProfile } from '@/lib/store';
import { CONCEPTS } from '@/lib/questions';
import { motion } from 'framer-motion';
import { Network, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple force-directed layout positions (pre-calculated for stability)
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  "Theory": { x: 400, y: 60 },
  "Supervised Learning": { x: 200, y: 180 },
  "Unsupervised Learning": { x: 600, y: 180 },
  "Optimization": { x: 400, y: 180 },
  "Methodology": { x: 650, y: 60 },
  "Metrics": { x: 100, y: 320 },
  "Overfitting": { x: 300, y: 320 },
  "Regularization": { x: 300, y: 440 },
  "Neural Networks": { x: 500, y: 320 },
  "Ensemble": { x: 150, y: 440 },
};

export default function KnowledgeGraph() {
  const { user, profile } = useAuth();

  const conceptStats = useMemo(() => {
    if (!user) return {};
    const p = getUserProfile(user);
    return p?.stats.conceptStats || {};
  }, [user]);

  const getAccuracy = (concept: string) => {
    const s = conceptStats[concept];
    if (!s || s.total === 0) return 0;
    return Math.round((s.correct / s.total) * 100);
  };

  const getColor = (accuracy: number) => {
    if (accuracy === 0) return { bg: '#E2E8F0', border: '#CBD5E1', text: '#64748B' };
    if (accuracy < 40) return { bg: '#FEE2E2', border: '#FCA5A5', text: '#DC2626' };
    if (accuracy < 70) return { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' };
    return { bg: '#D1FAE5', border: '#6EE7B7', text: '#059669' };
  };

  // SVG dimensions
  const svgWidth = 780;
  const svgHeight = 520;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Network size={22} className="text-violet-500" />
          Knowledge Graph
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Concept dependencies and your mastery levels</p>
      </div>

      {/* Legend */}
      <GlassCard hover={false} className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Mastery:</span>
          {[
            { label: 'Not Started', color: '#E2E8F0' },
            { label: '< 40%', color: '#FEE2E2' },
            { label: '40-70%', color: '#FEF3C7' },
            { label: '> 70%', color: '#D1FAE5' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: l.color }} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Graph */}
      <GlassCard hover={false} className="p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[600px]"
          style={{ maxHeight: '500px' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {Object.entries(KNOWLEDGE_GRAPH).map(([concept, prereqs]) =>
            prereqs.map(prereq => {
              const from = NODE_POSITIONS[prereq];
              const to = NODE_POSITIONS[concept];
              if (!from || !to) return null;
              // Calculate shortened line (don't overlap nodes)
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const offsetFrom = 45;
              const offsetTo = 45;
              const x1 = from.x + (dx / dist) * offsetFrom;
              const y1 = from.y + (dy / dist) * offsetFrom;
              const x2 = to.x - (dx / dist) * offsetTo;
              const y2 = to.y - (dy / dist) * offsetTo;
              return (
                <line
                  key={`${prereq}-${concept}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                  strokeDasharray="4 3"
                />
              );
            })
          )}

          {/* Nodes */}
          {CONCEPTS.map((concept, i) => {
            const pos = NODE_POSITIONS[concept];
            if (!pos) return null;
            const accuracy = getAccuracy(concept);
            const colors = getColor(accuracy);
            const stats = conceptStats[concept];
            return (
              <motion.g
                key={concept}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                {/* Node background */}
                <rect
                  x={pos.x - 65}
                  y={pos.y - 28}
                  width={130}
                  height={56}
                  rx={14}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth={2}
                  filter="url(#glow)"
                />
                {/* Concept name */}
                <text
                  x={pos.x}
                  y={pos.y - 5}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {concept.length > 16 ? concept.slice(0, 14) + '…' : concept}
                </text>
                {/* Stats */}
                <text
                  x={pos.x}
                  y={pos.y + 14}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={10}
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  opacity={0.8}
                >
                  {stats ? `${accuracy}% (${stats.total} Q)` : 'Not Started'}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </GlassCard>

      {/* Concept Details */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CONCEPTS.map(concept => {
          const accuracy = getAccuracy(concept);
          const stats = conceptStats[concept];
          const prereqs = KNOWLEDGE_GRAPH[concept] || [];
          const colors = getColor(accuracy);
          return (
            <GlassCard key={concept} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded" style={{ background: colors.bg, border: `1px solid ${colors.border}` }} />
                <h4 className="text-xs font-semibold text-foreground">{concept}</h4>
              </div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <p>Accuracy: <span className="font-medium" style={{ color: colors.text }}>{accuracy}%</span></p>
                <p>Questions Answered: {stats?.total || 0}</p>
                {prereqs.length > 0 && (
                  <p>Prerequisites: {prereqs.join(', ')}</p>
                )}
              </div>
              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${accuracy}%`, background: colors.border }} />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
