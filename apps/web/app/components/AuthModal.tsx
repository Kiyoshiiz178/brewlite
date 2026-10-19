'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { loginUser, registerUser } from '../lib/api';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        await registerUser(email, password);
        setSuccessMsg('Đăng ký thành công! Đang tự động đăng nhập...');
        // Auto login after register
        const loginRes = await loginUser(email, password);
        localStorage.setItem('brewlite_token', loginRes.access_token);
        onSuccess(loginRes.access_token, loginRes.user);
        onClose();
      } else {
        const res = await loginUser(email, password);
        localStorage.setItem('brewlite_token', res.access_token);
        onSuccess(res.access_token, res.user);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-stone-100 flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-stone-800 mb-6 pb-2 gap-4">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`text-base font-bold pb-1 transition-all ${
              mode === 'login'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`text-base font-bold pb-1 transition-all ${
              mode === 'register'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {/* Error / Success message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: khachhang@brewlite.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản mới'}</span>
          </button>
        </form>

        <p className="text-[11px] text-stone-500 text-center mt-5">
          BrewLite – Đặt cà phê nhanh chóng, tích lũy điểm thưởng hấp dẫn
        </p>
      </div>
    </div>
  );
};
