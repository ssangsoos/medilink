// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      alert('로그인 성공! 메인으로 이동합니다.');
      router.push('/');
      router.refresh();

    } catch (error: any) {
      alert(`로그인 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <LogIn size={48} className="mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl font-bold">다시 오셨군요!</h1>
          <p className="text-blue-100 mt-2">메디링크에 로그인하세요.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-black" // text-black 추가
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-black" // text-black 추가
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? '로그인 중...' : '로그인하기'} <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}