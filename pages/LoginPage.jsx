import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, AlertCircle, ShieldCheck, Loader2, User, Lock, Sparkles, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const Login = ({ onLogin }) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [lightningStrikes, setLightningStrikes] = useState([]);
  const ballRefs = useRef([]);
  const animationRef = useRef(null);
  const lastFrameRef = useRef(0);
  const ballsRef = useRef([]);
  const lightningTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const configs = [
      { size: 180, className: 'from-yellow-200 via-yellow-400 to-amber-600' },
      { size: 220, className: 'from-yellow-100 via-amber-400 to-yellow-700' },
      { size: 200, className: 'from-yellow-100 via-yellow-400 to-amber-600' },
    ];

    const speedMin = 90;
    const speedMax = 170;

    const createBall = (config) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      return {
        ...config,
        x: Math.random() * Math.max(window.innerWidth - config.size, 1),
        y: Math.random() * Math.max(window.innerHeight - config.size, 1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    };

    ballsRef.current = configs.map(createBall);

    const setBallPosition = (ball, index) => {
      const el = ballRefs.current[index];
      if (!el) return;
      el.style.transform = `translate3d(${ball.x}px, ${ball.y}px, 0)`;
    };

    const clampInsideViewport = () => {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      ballsRef.current.forEach((ball, index) => {
        ball.x = Math.min(Math.max(ball.x, 0), Math.max(maxW - ball.size, 0));
        ball.y = Math.min(Math.max(ball.y, 0), Math.max(maxH - ball.size, 0));
        setBallPosition(ball, index);
      });
    };

    const animate = (time) => {
      if (!lastFrameRef.current) lastFrameRef.current = time;
      const dt = Math.min((time - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = time;

      const maxW = window.innerWidth;
      const maxH = window.innerHeight;

      ballsRef.current.forEach((ball, index) => {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const maxX = Math.max(maxW - ball.size, 0);
        const maxY = Math.max(maxH - ball.size, 0);
        const bounceFactor = 0.96 + Math.random() * 0.12;

        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx) * bounceFactor;
          ball.vy += (Math.random() - 0.5) * 22;
        } else if (ball.x >= maxX) {
          ball.x = maxX;
          ball.vx = -Math.abs(ball.vx) * bounceFactor;
          ball.vy += (Math.random() - 0.5) * 22;
        }

        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy) * bounceFactor;
          ball.vx += (Math.random() - 0.5) * 22;
        } else if (ball.y >= maxY) {
          ball.y = maxY;
          ball.vy = -Math.abs(ball.vy) * bounceFactor;
          ball.vx += (Math.random() - 0.5) * 22;
        }

        const velocity = Math.hypot(ball.vx, ball.vy);
        if (velocity < speedMin) {
          const scale = speedMin / Math.max(velocity, 1);
          ball.vx *= scale;
          ball.vy *= scale;
        } else if (velocity > speedMax * 1.25) {
          const scale = (speedMax * 1.25) / velocity;
          ball.vx *= scale;
          ball.vy *= scale;
        }

        setBallPosition(ball, index);
      });

      animationRef.current = window.requestAnimationFrame(animate);
    };

    clampInsideViewport();
    animationRef.current = window.requestAnimationFrame(animate);
    window.addEventListener('resize', clampInsideViewport);

    return () => {
      window.removeEventListener('resize', clampInsideViewport);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const minDelay = 1400;
    const maxDelay = 4200;

    const scheduleStrike = () => {
      if (isCancelled) return;
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      lightningTimerRef.current = window.setTimeout(() => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const x = 8 + Math.random() * 84;
        const y = 6 + Math.random() * 56;
        const angle = -20 + Math.random() * 40;
        const height = 120 + Math.random() * 180;

        setLightningStrikes((prev) => [...prev, { id, x, y, angle, height }]);
        window.setTimeout(() => {
          setLightningStrikes((prev) => prev.filter((strike) => strike.id !== id));
        }, 560);

        scheduleStrike();
      }, delay);
    };

    scheduleStrike();
    return () => {
      isCancelled = true;
      if (lightningTimerRef.current) {
        window.clearTimeout(lightningTimerRef.current);
      }
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      const res = await api.login({ login: cleanUsername, password: cleanPassword });
      onLogin(res.data);
      navigate('/');
    } catch (err) {
      setError("Login yoki parol noto'g'ri. Qaytadan urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] min-h-screen bg-slate-950 relative overflow-x-hidden overflow-y-auto font-sans pb-[max(1.5rem,env(safe-area-inset-bottom))]">

      {/* Background glow */}
      {[
        { size: 180, className: 'from-yellow-200 via-yellow-400 to-amber-600' },
        { size: 220, className: 'from-yellow-100 via-amber-400 to-yellow-700' },
        { size: 200, className: 'from-yellow-100 via-yellow-400 to-amber-600' },
      ].map((ball, index) => (
        <div
          key={`bg-ball-${index}`}
          ref={(el) => { ballRefs.current[index] = el; }}
          className={`absolute top-0 left-0 rounded-full bg-gradient-to-br ${ball.className} shadow-[0_0_70px_rgba(245,158,11,0.35)] pointer-events-none will-change-transform`}
          style={{ width: `${ball.size}px`, height: `${ball.size}px` }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(234,179,8,0.24),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(245,158,11,0.2),transparent_45%)] pointer-events-none" />
      {lightningStrikes.map((strike) => (
        <div
          key={strike.id}
          className="pointer-events-none absolute z-[1] login-lightning-wrapper"
          style={{ left: `${strike.x}%`, top: `${strike.y}%`, transform: `rotate(${strike.angle}deg)` }}
        >
          <div className="login-lightning-core" style={{ height: `${strike.height}px` }} />
          <div className="login-lightning-glow" style={{ height: `${strike.height + 40}px` }} />
          <div className="login-lightning-flash" />
        </div>
      ))}

      {/* ── LANDING (forma yopiq) ── */}
      {!showLoginForm && (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8 sm:p-6 text-center relative z-10">
          <div className="w-full max-w-md rounded-3xl border border-yellow-200/25 bg-slate-900/45 backdrop-blur-2xl shadow-[0_25px_80px_rgba(2,6,23,0.65)] px-6 py-10 sm:px-8 sm:py-12 space-y-6 sm:space-y-7">
            {/* Logo */}
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-4xl xs:text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none uppercase italic">
                DOST
              </h1>
              <h1 className="text-4xl xs:text-5xl sm:text-7xl font-black text-yellow-400 tracking-tighter leading-none uppercase italic">
                ELECTRIC
              </h1>
            </div>

            <p className="text-yellow-100/75 text-xs font-black uppercase tracking-[0.3em]">
              Ishchilar boshqaruv tizimi
            </p>

            <button
              type="button"
              onClick={() => setShowLoginForm(true)}
              className="group w-full flex items-center justify-center gap-4 px-10 py-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-slate-950 font-black rounded-2xl hover:brightness-105 transition-all shadow-[0_14px_40px_rgba(234,179,8,0.45)] active:scale-[0.99] uppercase tracking-wide italic text-lg sm:text-xl"
            >
              Tizimga Kirish
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-yellow-100/70">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Xavfsiz ulanish</span>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN FORMA ── */}
      {showLoginForm && (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-6 sm:p-5 relative z-10">
          <div className="w-full max-w-md space-y-6">

            {/* Sarlavha */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-3 py-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Secure Login</span>
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter">
                DOST <span className="text-yellow-400">ELECTRIC</span>
              </h2>
              <p className="text-yellow-100/70 text-[10px] font-black uppercase tracking-[0.3em]">
                Tizimga kirish
              </p>
            </div>

            {/* Forma */}
            <div className="bg-slate-900/55 backdrop-blur-2xl border border-yellow-200/20 rounded-3xl p-6 sm:p-7 space-y-5 shadow-[0_24px_70px_rgba(2,6,23,0.65)]">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="text-yellow-400" size={20} />
                <span className="text-white font-black text-lg tracking-[0.2em]">LOGIN</span>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-300 leading-snug">{error}</p>
                  </div>
                )}

                <div className="group relative">
                  <User className="w-4 h-4 text-yellow-100/60 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-yellow-300 transition-colors" />
                  <input
                    type="text"
                    required
                    inputMode="text"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-4 bg-slate-950/70 border border-yellow-200/20 rounded-2xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25 outline-none text-white font-semibold transition-all placeholder:text-yellow-100/40 text-sm"
                    placeholder="Login"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>

                <div className="group relative">
                  <Lock className="w-4 h-4 text-yellow-100/60 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-yellow-300 transition-colors" />
                  <Eye className="w-4 h-4 text-yellow-100/60 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-11 pr-11 py-4 bg-slate-950/70 border border-yellow-200/20 rounded-2xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25 outline-none text-white font-semibold transition-all placeholder:text-yellow-100/40 text-sm"
                    placeholder="Parol"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-yellow-100/80">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/40 bg-transparent accent-yellow-500" />
                    <span>Eslab qolish</span>
                  </label>
                  <button type="button" className="hover:text-white transition-colors">Parolni unutdingizmi?</button>
                </div>

                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-slate-950 font-black rounded-2xl hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-yellow-500/35 flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-sm disabled:opacity-50"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Kirilmoqda...</>
                    : 'Tizimga ulanish'
                  }
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => { setShowLoginForm(false); setError(null); }}
              className="w-full text-yellow-100/70 text-[10px] font-black uppercase py-3 hover:text-yellow-300 transition-colors tracking-[0.3em]"
            >
              ← Ortga
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;