/** @type {import('tailwindcss').Config} */
export default {
  // ★★★ 이 부분이 핵심입니다: 모든 JSX 파일을 스캔하라고 지정함 ★★★
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Tailwind가 스타일을 찾을 경로
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          DEFAULT: '#2563EB', // 병원용 파란색
          hover: '#1D4ED8',
        },
        worker: {
          DEFAULT: '#581C87', // 의료인용 보라색
          hover: '#4C1D95',
        }
      }
    },
  },
  plugins: [],
}