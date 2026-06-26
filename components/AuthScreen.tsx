
import React from 'react';
import { Loader2, AlertCircle, Gamepad2 } from 'lucide-react';

interface AuthScreenProps {
  onGoogle:    () => void;
  onFacebook:  () => void;
  loading:     boolean;
  error:       string | null;
  onPlayGame?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onGoogle, onFacebook, loading, error, onPlayGame }) => (
  <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
    {/* Radial spotlight */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,180,216,0.07) 0%, transparent 70%)',
      }}
    />

    {/* Corner accents */}
    <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-aim-teal/20" />
    <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-aim-teal/20" />
    <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-aim-teal/20" />
    <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-aim-teal/20" />

    <div className="w-full max-w-sm relative z-10 flex flex-col items-center gap-10">
      {/* Logo & branding */}
      <div className="flex flex-col items-center gap-6">
        <img
          src="/aiformissouri-logo.png"
          alt="AI for Missouri"
          className="w-40 h-auto drop-shadow-lg"
        />
        <div className="text-center">
          <h1
            className="font-orbitron font-black text-3xl tracking-wider text-glow-teal flicker"
            style={{ color: '#00B4D8' }}
          >
            APA COACH
          </h1>
          <p className="section-label mt-3 opacity-70">Captain · Strategy · Victory</p>
          <p className="font-mono text-xs mt-1" style={{ color: 'rgba(232,152,29,0.75)' }}>
            Powered by AI for Missouri
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'rgba(0,180,216,0.15)' }} />
        <span className="section-label opacity-50">AUTHENTICATE</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,180,216,0.15)' }} />
      </div>

      {/* Sign-in buttons */}
      <div className="w-full flex flex-col gap-4">
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-mono text-xs">{error}</span>
          </div>
        )}

        <button
          onClick={onGoogle}
          disabled={loading}
          className="btn-neon w-full py-4 rounded flex items-center justify-center gap-3 font-orbitron text-sm font-bold tracking-widest uppercase"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Sign in with Google
        </button>

        <button
          onClick={onFacebook}
          disabled={loading}
          className="w-full py-4 rounded flex items-center justify-center gap-3 font-orbitron text-sm font-bold tracking-widest uppercase transition-all"
          style={{
            background: 'transparent',
            border: '1px solid #1877F2',
            color: '#1877F2',
            textShadow: '0 0 10px rgba(24,119,242,0.7)',
            boxShadow: '0 0 14px rgba(24,119,242,0.2)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(24,119,242,0.12)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(24,119,242,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 14px rgba(24,119,242,0.2)';
          }}
        >
          <FacebookIcon />
          Sign in with Facebook
        </button>
      </div>

      {onPlayGame && (
        <button
          onClick={onPlayGame}
          className="w-full py-3 rounded flex items-center justify-center gap-2 font-orbitron text-sm font-bold tracking-widest uppercase transition-all"
          style={{
            background: 'rgba(232,152,29,0.08)',
            border: '1px solid rgba(232,152,29,0.35)',
            color: '#E8981D',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,152,29,0.16)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,152,29,0.08)';
          }}
        >
          <Gamepad2 className="w-4 h-4" />
          Try Mission Control
        </button>
      )}

      <p className="text-center font-mono text-xs" style={{ color: 'rgba(232,244,248,0.25)' }}>
        No account needed · Your data stays yours
      </p>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);
