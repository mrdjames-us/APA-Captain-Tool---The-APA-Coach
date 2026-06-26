
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Zap, CheckCircle, XCircle,
  ArrowRight, RotateCcw, ChevronRight,
} from 'lucide-react';

interface Props {
  onBack?:   () => void;
  onSignIn?: () => void;
}

type Phase = 'intro' | 'chat' | 'agent' | 'results';

interface Message {
  role: 'user' | 'ai';
  text: string;
  isLimitation?: boolean;
}

const MISSION_GOAL =
  'Help your organization access AI training in Missouri — find free programs, ' +
  'check eligibility, draft a team email, and schedule application deadlines.';

const DEFAULT_AGENT_GOAL =
  'Research Missouri AI training programs for nonprofits. Find free options ' +
  'currently accepting applications, verify eligibility, rank by success rate, ' +
  'draft a team email with top 3 recommendations, and add all deadlines to our calendar.';

const CHAT_STEPS = [
  {
    prompt: 'What AI training programs are available in Missouri?',
    response:
      'Missouri has several options: the Missouri Technology Corporation runs ' +
      'workforce development grants, St. Louis Community College offers AI fundamentals ' +
      'courses, and Coursera/edX have Missouri-specific scholarship partnerships.',
    isLimitation: false,
  },
  {
    prompt: 'Which ones are free or low-cost for nonprofits?',
    response:
      'For nonprofits, strong free options include the Missouri Dept. of Economic ' +
      'Development digital skills grants, the MOCAN digital literacy initiative, and ' +
      'federal WIOA-funded programs. Each has different requirements I can explain.',
    isLimitation: false,
  },
  {
    prompt: 'Are any of these accepting applications right now?',
    response:
      "I don't have real-time enrollment data — my knowledge has a cutoff date. " +
      "I can't tell you what's open today. You'll need to check each program's " +
      'website directly to confirm current availability.',
    isLimitation: true,
  },
  {
    prompt: 'What are the eligibility requirements?',
    response:
      'Requirements typically include 501(c)(3) status, Missouri-based operations, ' +
      'and a minimum cohort of 5+ participants. Requirements vary by program — ' +
      'confirm directly with each one before applying.',
    isLimitation: false,
  },
  {
    prompt: 'Which program has the best success rate?',
    response:
      "I don't have access to outcome tracking or success metrics for these specific " +
      'programs. Comparative data would require independent research I cannot perform ' +
      'in real time.',
    isLimitation: true,
  },
  {
    prompt: 'Summarize the top 3 options',
    response:
      'Top 3: (1) MTC Workforce AI Grant — up to $5K, quarterly cycle; (2) STL ' +
      'Community College AI Boot Camp — sliding scale, 8 weeks; (3) Federal WIOA ' +
      'Digital Skills — free for qualifying nonprofits with income verification.',
    isLimitation: false,
  },
  {
    prompt: 'Draft an email to share with my team',
    response:
      "Subject: AI Training Opportunities\n\nHi team,\n\nI've identified three strong " +
      'AI training options for our organization in Missouri. [See summary above.] ' +
      'Please review and reply with your interest level by Friday.\n\nBest, [Your name]',
    isLimitation: false,
  },
  {
    prompt: 'Add the application deadlines to our calendar',
    response:
      "I'm not able to access or modify your calendar. You'll need to add these " +
      'manually. Most programs run on quarterly cycles — check each website for ' +
      'specific dates.',
    isLimitation: true,
  },
];

const AGENT_STEPS = [
  { emoji: '🔍', text: 'Searching Missouri AI training databases and .gov portals…', highlight: false },
  { emoji: '🔍', text: 'Filtering for free programs open to nonprofits, enrollment open now…', highlight: false },
  { emoji: '✅', text: 'Found 3 programs currently accepting applications', highlight: true },
  { emoji: '📋', text: 'Verifying eligibility requirements for community organizations…', highlight: false },
  { emoji: '📊', text: 'Pulling success-rate data and outcome metrics from program databases…', highlight: false },
  { emoji: '📝', text: 'Drafting ranked team email with top 3 recommendations…', highlight: false },
  { emoji: '📅', text: 'Adding 3 application deadlines to your team calendar…', highlight: false },
  { emoji: '✅', text: 'Complete — research, email, and calendar ready', highlight: true },
];

const STEP_DELAYS_MS = [700, 900, 600, 850, 1050, 800, 750, 550];

export const MissionControl: React.FC<Props> = ({ onBack, onSignIn }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [stepIdx, setStepIdx]         = useState(0);
  const [limitations, setLimitations] = useState(0);
  const [agentGoal, setAgentGoal]     = useState(DEFAULT_AGENT_GOAL);
  const [revealed, setRevealed]       = useState(0);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentDone, setAgentDone]     = useState(false);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const timerRefs   = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatStep = () => {
    const step = CHAT_STEPS[stepIdx];
    setMessages(prev => [
      ...prev,
      { role: 'user', text: step.prompt },
      { role: 'ai',   text: step.response, isLimitation: step.isLimitation },
    ]);
    if (step.isLimitation) setLimitations(l => l + 1);
    const next = stepIdx + 1;
    setStepIdx(next);
    if (next >= CHAT_STEPS.length) setTimeout(() => setPhase('agent'), 1300);
  };

  const deployAgent = () => {
    setAgentRunning(true);
    let total = 0;
    STEP_DELAYS_MS.forEach((delay, i) => {
      total += delay;
      const t = setTimeout(() => {
        setRevealed(i + 1);
        if (i === AGENT_STEPS.length - 1) {
          setAgentDone(true);
          setAgentRunning(false);
        }
      }, total);
      timerRefs.current.push(t);
    });
  };

  const reset = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    setPhase('intro');
    setMessages([]);
    setStepIdx(0);
    setLimitations(0);
    setAgentGoal(DEFAULT_AGENT_GOAL);
    setRevealed(0);
    setAgentRunning(false);
    setAgentDone(false);
  };

  /* ── Shared nav strip ───────────────────────────────────────────── */
  const TopBar = ({ round, sub }: { round?: string; sub?: string }) => (
    <div className="mb-5">
      {onBack && (
        <button onClick={onBack}
          className="mb-3 text-[11px] font-mono flex items-center gap-1 transition-opacity opacity-40 hover:opacity-70"
          style={{ color: '#00B4D8' }}>
          ← Back
        </button>
      )}
      <div className="flex items-center gap-3">
        <img src="/aiformissouri-logo.png" alt="AI for Missouri" className="h-6 w-auto" />
        <span className="font-orbitron font-black text-xs tracking-[.16em]" style={{ color: '#00B4D8' }}>
          MISSION CONTROL
        </span>
        {round && (
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.25)', color: '#00B4D8' }}>
            {round}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[11px] font-mono opacity-35" style={{ color: '#E8F4F8' }}>{sub}</p>}
    </div>
  );

  /* ── INTRO ──────────────────────────────────────────────────────── */
  if (phase === 'intro') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0B1929' }}>
      <div className="w-full max-w-md">
        {onBack && (
          <button onClick={onBack}
            className="mb-6 text-[11px] font-mono flex items-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: '#00B4D8' }}>
            ← Back to Sign In
          </button>
        )}

        <div className="text-center mb-8">
          <img src="/aiformissouri-logo.png" alt="AI for Missouri" className="h-24 w-auto mx-auto mb-6" />
          <h1 className="font-orbitron font-black text-3xl tracking-widest mb-1" style={{ color: '#00B4D8' }}>
            MISSION CONTROL
          </h1>
          <p className="font-orbitron text-sm tracking-[.25em] opacity-40 text-white mb-5">CHAT vs. AGENT</p>
          <p className="text-sm leading-relaxed opacity-65 max-w-xs mx-auto" style={{ color: '#E8F4F8' }}>
            {MISSION_GOAL}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            { num: '01', title: 'Chat AI',   desc: 'Ask one question at a time',       icon: <MessageSquare className="w-5 h-5" />, color: '#00B4D8' },
            { num: '02', title: 'AI Agent',  desc: 'Give one goal, watch it finish',   icon: <Zap           className="w-5 h-5" />, color: '#E8981D' },
          ].map(r => (
            <div key={r.num} className="flex items-center gap-4 px-4 py-3 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                style={{ background: `${r.color}14`, color: r.color }}>
                {r.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] opacity-35">ROUND {r.num}</span>
                  <span className="font-bold text-sm text-white">{r.title}</span>
                </div>
                <p className="text-xs opacity-45" style={{ color: '#E8F4F8' }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setPhase('chat')}
          className="w-full py-4 rounded font-orbitron font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
          style={{ background: 'rgba(0,180,216,0.13)', border: '1px solid rgba(0,180,216,0.45)', color: '#00B4D8' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,180,216,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,180,216,0.13)')}>
          START MISSION <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  /* ── CHAT ROUND ─────────────────────────────────────────────────── */
  if (phase === 'chat') {
    const chatDone    = stepIdx >= CHAT_STEPS.length;
    const currentStep = CHAT_STEPS[stepIdx];
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0B1929' }}>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
          <TopBar
            round="ROUND 01 · CHAT AI"
            sub={`Step ${Math.min(stepIdx + 1, 8)} of 8  ·  ${limitations} roadblock${limitations !== 1 ? 's' : ''}`}
          />

          {/* Goal */}
          <div className="mb-4 px-4 py-3 rounded text-xs leading-relaxed"
            style={{ background: 'rgba(232,152,29,0.07)', border: '1px solid rgba(232,152,29,0.2)', color: '#E8981D' }}>
            <span className="font-orbitron font-bold tracking-wider">YOUR GOAL  </span>
            <span className="opacity-75">{MISSION_GOAL}</span>
          </div>

          {/* Chat window */}
          <div className="flex-1 rounded overflow-y-auto space-y-3 p-4 mb-4"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 360 }}>
            {messages.length === 0 && (
              <p className="text-center text-xs opacity-25 pt-8" style={{ color: '#E8F4F8' }}>
                Click the prompt below to start the conversation.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%] px-3 py-2.5 rounded text-xs leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? { background: 'rgba(0,180,216,0.14)', border: '1px solid rgba(0,180,216,0.28)', color: '#E8F4F8' }
                      : msg.isLimitation
                        ? { background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#E8F4F8' }
                  }>
                  {msg.isLimitation && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <XCircle className="w-3 h-3" style={{ color: '#EF4444' }} />
                      <span className="font-orbitron font-bold text-[9px] tracking-widest" style={{ color: '#EF4444' }}>
                        ROADBLOCK
                      </span>
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Next prompt or done state */}
          {!chatDone && currentStep ? (
            <div>
              <p className="text-[9px] font-orbitron tracking-[.18em] opacity-35 mb-2" style={{ color: '#00B4D8' }}>
                YOUR NEXT PROMPT
              </p>
              <button onClick={handleChatStep}
                className="w-full text-left px-4 py-3 rounded text-sm transition-all flex items-start gap-3"
                style={{ background: 'rgba(0,180,216,0.05)', border: '1px solid rgba(0,180,216,0.22)', color: '#E8F4F8' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,180,216,0.48)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,180,216,0.22)')}>
                <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#00B4D8' }} />
                <span className="opacity-80">"{currentStep.prompt}"</span>
              </button>
              <button onClick={() => setPhase('agent')}
                className="w-full mt-2 py-1.5 text-[11px] font-mono opacity-25 hover:opacity-55 transition-opacity text-center"
                style={{ color: '#E8981D' }}>
                Skip to Agent Round →
              </button>
            </div>
          ) : (
            <p className="text-center text-xs font-orbitron tracking-widest opacity-40 py-3" style={{ color: '#00B4D8' }}>
              Launching agent round…
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── AGENT ROUND ────────────────────────────────────────────────── */
  if (phase === 'agent') {
    const tasksCompleted = CHAT_STEPS.length - limitations;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0B1929' }}>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
          <TopBar round="ROUND 02 · AI AGENT" sub="Same goal — one instruction" />

          {/* Mini comparison */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Chat AI',  val: `${stepIdx} prompts`, sub: `${limitations} roadblock${limitations !== 1 ? 's' : ''}`, col: '#94A3B8' },
              { label: 'Agent',    val: '1 instruction',       sub: agentDone ? '8 / 8 done' : 'in progress…',               col: '#E8981D' },
            ].map(c => (
              <div key={c.label} className="px-4 py-3 rounded text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.col}20` }}>
                <p className="text-[9px] font-mono opacity-35 mb-1">{c.label}</p>
                <p className="font-orbitron font-bold text-xl" style={{ color: c.col }}>{c.val}</p>
                <p className="text-[10px] font-mono opacity-35 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Goal */}
          <div className="mb-4 px-4 py-3 rounded text-xs leading-relaxed"
            style={{ background: 'rgba(232,152,29,0.07)', border: '1px solid rgba(232,152,29,0.2)', color: '#E8981D' }}>
            <span className="font-orbitron font-bold tracking-wider">SAME GOAL  </span>
            <span className="opacity-75">{MISSION_GOAL}</span>
          </div>

          {/* Single input */}
          {!agentRunning && !agentDone && (
            <>
              <p className="text-[9px] font-orbitron tracking-[.18em] opacity-35 mb-2" style={{ color: '#E8981D' }}>
                YOUR ONE INSTRUCTION TO THE AGENT
              </p>
              <textarea
                value={agentGoal}
                onChange={e => setAgentGoal(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded text-sm resize-none mb-3"
                style={{
                  background: 'rgba(232,152,29,0.04)',
                  border: '1px solid rgba(232,152,29,0.28)',
                  color: '#E8F4F8',
                  outline: 'none',
                }}
              />
              <button onClick={deployAgent}
                className="w-full py-4 rounded font-orbitron font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(232,152,29,0.13)', border: '1px solid rgba(232,152,29,0.45)', color: '#E8981D' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,152,29,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,152,29,0.13)')}>
                <Zap className="w-4 h-4" /> DEPLOY AGENT
              </button>
            </>
          )}

          {/* Agent steps */}
          {(agentRunning || agentDone) && (
            <div className="space-y-2 mt-1">
              {AGENT_STEPS.slice(0, revealed).map((step, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded text-sm"
                  style={{
                    background: step.highlight ? 'rgba(56,189,248,0.07)' : 'rgba(232,152,29,0.05)',
                    border: `1px solid ${step.highlight ? 'rgba(56,189,248,0.22)' : 'rgba(232,152,29,0.18)'}`,
                  }}>
                  <span className="text-base shrink-0">{step.emoji}</span>
                  <span className="opacity-80 flex-1" style={{ color: step.highlight ? '#38BDF8' : '#E8F4F8' }}>
                    {step.text}
                  </span>
                  {step.highlight && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#38BDF8' }} />}
                </div>
              ))}
              {agentRunning && (
                <div className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono opacity-35"
                  style={{ color: '#E8981D' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E8981D' }} />
                  Agent working…
                </div>
              )}
            </div>
          )}

          {agentDone && (
            <button onClick={() => setPhase('results')}
              className="w-full mt-6 py-4 rounded font-orbitron font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(56,189,248,0.13)', border: '1px solid rgba(56,189,248,0.45)', color: '#38BDF8' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.13)')}>
              VIEW DEBRIEF <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULTS ────────────────────────────────────────────────────── */
  const tasksCompleted = CHAT_STEPS.length - limitations;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0B1929' }}>
      <div className="w-full max-w-lg">
        <TopBar />

        <div className="text-center mb-7">
          <p className="font-orbitron text-[10px] tracking-[.22em] opacity-35 mb-2" style={{ color: '#00B4D8' }}>
            MISSION DEBRIEF
          </p>
          <h2 className="font-orbitron font-black text-2xl text-white">How'd it compare?</h2>
        </div>

        {/* Comparison table */}
        <div className="rounded overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Header row */}
          <div className="grid grid-cols-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="px-4 py-3" />
            <div className="px-4 py-3 flex items-center justify-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
              <span className="text-[9px] font-orbitron tracking-widest" style={{ color: '#94A3B8' }}>CHAT AI</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: '#E8981D' }} />
              <span className="text-[9px] font-orbitron tracking-widest" style={{ color: '#E8981D' }}>AGENT</span>
            </div>
          </div>

          {[
            { label: 'Steps you took',   chat: `${stepIdx}`,                   agent: '1'     },
            { label: 'Tasks completed',  chat: `${tasksCompleted} / 8`,        agent: '8 / 8' },
            { label: 'Roadblocks hit',   chat: `${limitations}`,               agent: '0'     },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="px-4 py-4 text-xs opacity-50" style={{ color: '#E8F4F8' }}>{row.label}</div>
              <div className="px-4 py-4 text-center">
                <span className="font-orbitron font-bold text-xl" style={{ color: '#94A3B8' }}>{row.chat}</span>
              </div>
              <div className="px-4 py-4 text-center">
                <span className="font-orbitron font-bold text-xl" style={{ color: '#E8981D' }}>{row.agent}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div className="text-center px-6 py-5 rounded mb-7"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.18)' }}>
          <p className="font-orbitron font-bold text-base text-white">Chat answers questions.</p>
          <p className="font-orbitron font-bold text-base mt-0.5" style={{ color: '#00B4D8' }}>
            Agents complete goals.
          </p>
          <p className="text-xs font-mono opacity-40 mt-2" style={{ color: '#E8F4F8' }}>
            AI for Missouri is bringing agentic AI to our communities.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {onSignIn && (
            <button onClick={onSignIn}
              className="w-full py-4 rounded font-orbitron font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(0,180,216,0.13)', border: '1px solid rgba(0,180,216,0.45)', color: '#00B4D8' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,180,216,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,180,216,0.13)')}>
              EXPLORE THE FULL TOOL <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={reset}
            className="w-full py-3 rounded font-orbitron text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
};
