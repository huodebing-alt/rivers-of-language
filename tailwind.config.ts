import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 奶白 / 暗红 / 哑金 系（沿用普拉多/卢浮宫）
        cream: {
          50: "#FBF8F1",
          100: "#F5EFE2",
          200: "#EDE3CC",
          300: "#E2D3B0",
        },
        carmine: {
          400: "#9C3B3F",
          500: "#82282C",
          600: "#691E22",
          700: "#4F1518",
          800: "#3A0F11",
        },
        gilt: {
          300: "#D9BC78",
          400: "#C4A05A",
          500: "#A8853C",
          600: "#8A6A28",
        },
        ink: {
          400: "#5C5247",
          500: "#3A332A",
          600: "#2A2520",
          700: "#1B1815",
          900: "#0E0C0A",
        },
        // 七大语系颜色
        family: {
          ie: "#3D5A80",        // 印欧 蓝
          st: "#9C3B3F",        // 汉藏 暗红
          afro: "#7A8B3A",      // 闪含 橄榄金绿
          an: "#3F7E84",        // 南岛 青
          ng: "#C97A3A",        // 尼日刚果 橙
          dr: "#6B4B8A",        // 达罗毗荼 紫
          turk: "#8A3F6B",      // 突厥 紫红
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "'Noto Serif SC'", "Georgia", "serif"],
        sans: ["Inter", "'PingFang SC'", "'Noto Sans SC'", "system-ui", "sans-serif"],
        cn: ["'Noto Serif SC'", "'Source Han Serif SC'", "serif"],
      },
      letterSpacing: {
        wider2: "0.18em",
      },
    },
  },
  plugins: [],
};
export default config;
