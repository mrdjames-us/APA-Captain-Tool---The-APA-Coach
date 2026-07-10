import React from 'react';
import { CheckCircle2, Circle, ChevronRight, Flag } from 'lucide-react';
import { TabId } from './Layout';

interface GettingStartedProps {
  connected: boolean;
  hasRoster: boolean;
  hasSchedule: boolean;
  loading: boolean;
  onGoToTab: (tab: TabId) => void;
}

interface Step {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  tab: TabId;
  cta: string;
}

// First-run checklist shown on the Command Board until a captain has connected
// APA, imported a roster, and synced a schedule. Disappears permanently once
// all three are true — this is onboarding, not a persistent nag.
export const GettingStarted: React.FC<GettingStartedProps> = ({
  connected, hasRoster, hasSchedule, loading, onGoToTab,
}) => {
  if (loading) return null;

  const steps: Step[] = [
    {
      key: 'connect', label: 'Connect your APA account', tab: 'apa', cta: 'Connect',
      hint: 'Sign in with your poolplayers.com email + password once — we only keep a revocable token, never your password.',
      done: connected,
    },
    {
      key: 'roster', label: 'Import your team roster', tab: 'apa', cta: 'Import',
      hint: 'Pick your team and load the roster — real skill levels and win/loss records fill in automatically.',
      done: hasRoster,
    },
    {
      key: 'schedule', label: 'Sync your schedule', tab: 'schedule', cta: 'Sync',
      hint: 'One click pulls your whole season — opponents, dates, locations, and scores as they happen.',
      done: hasSchedule,
    },
  ];

  const allDone = steps.every(s => s.done);
  if (allDone) return null;

  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="card rounded-2xl p-6" style={{ border: '1px solid rgba(242,193,78,0.3)' }}>
      <div className="flex items-center gap-3 mb-1">
        <Flag className="w-5 h-5" style={{ color: '#F2C14E' }} />
        <h3 className="font-orbitron font-bold text-base" style={{ color: '#EFE7D6', letterSpacing: '0.08em' }}>
          GETTING STARTED
        </h3>
        <span className="font-mono text-xs ml-auto" style={{ color: 'rgba(239,231,214,0.5)' }}>
          {doneCount}/{steps.length}
        </span>
      </div>
      <p className="text-sm mb-5" style={{ color: 'rgba(239,231,214,0.65)' }}>
        Connect poolplayers.com once and this whole app fills itself in — no manual entry.
      </p>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className="flex items-center gap-4 p-3 rounded-lg"
            style={{
              background: step.done ? 'rgba(57,196,107,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${step.done ? 'rgba(57,196,107,0.25)' : 'rgba(255,255,255,0.06)'}`,
              opacity: step.done ? 0.7 : 1,
            }}
          >
            {step.done
              ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#39C46B' }} />
              : <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgba(239,231,214,0.3)' }} />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'rgba(239,231,214,0.4)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: step.done ? 'rgba(239,231,214,0.6)' : '#EFE7D6',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {!step.done && (
                <p className="text-xs mt-1" style={{ color: 'rgba(239,231,214,0.5)' }}>{step.hint}</p>
              )}
            </div>

            {!step.done && (
              <button
                onClick={() => onGoToTab(step.tab)}
                className="btn-solid-cyan flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold shrink-0"
              >
                {step.cta}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
