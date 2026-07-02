import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import {
  Utensils, UtensilsCrossed, CalendarDays, ShoppingCart, Sunrise, Zap, Cookie,
  ChevronDown, ChevronLeft, ChevronRight, Clock, Sun, Moon, X, ExternalLink,
  Pencil, RotateCcw, User, Plus, Trash2,
} from 'lucide-react';
import { RECIPES, RECIPES_BY_ID, MEAL_TYPES, CATEGORIES } from './data/recipes.js';
import { WEEKS, getLatestWeek } from './data/weeks.js';
import { buildShoppingList } from './lib/shoppingList.js';
import { useMealOverrides } from './lib/useMealOverrides.js';
import { useProfile } from './lib/useProfile.js';
import { useSupplements } from './lib/useSupplements.js';
import { calcTargetMacros, ACTIVITY_LEVELS, GOALS } from './lib/macroCalculator.js';

// ---------- Тема ----------
const THEMES = {
  dark: {
    ACCENT: '#E08A3C', ACCENT_SOFT: '#EDA053', HERB: '#93A86A', GOLD: '#E3A72C',
    ACCENT_GRAD: 'linear-gradient(135deg,#EDA053,#C8643C)', GRAD_FROM: '#EDA053', GRAD_TO: '#C8643C',
    BG: '#16100A', BG_RAISED: '#211812', BG_INPUT: '#2A1F16', BORDER: '#2E2318',
    TEXT: '#F3E9DC', TEXT_DIM: '#B6A392', TEXT_FAINT: '#7C6A57',
    NAV_BG: 'rgba(26,19,13,.72)', NAV_BORDER: '#3a2c1d', RING_TRACK: '#33261a',
    BADGE_BG: '#2A1F16', GLOW: 'rgba(224,138,60,0.35)', isDark: true,
  },
  light: {
    ACCENT: '#BC6A28', ACCENT_SOFT: '#D98A3E', HERB: '#6F8A4A', GOLD: '#C68A24',
    ACCENT_GRAD: 'linear-gradient(135deg,#D98A3E,#BC6A28)', GRAD_FROM: '#D98A3E', GRAD_TO: '#BC6A28',
    BG: '#F6EFE4', BG_RAISED: '#FFFFFF', BG_INPUT: '#EFE6D6', BORDER: '#E7DAC6',
    TEXT: '#241A10', TEXT_DIM: '#6B5B48', TEXT_FAINT: '#9A8874',
    NAV_BG: 'rgba(255,255,255,.72)', NAV_BORDER: '#E7DAC6', RING_TRACK: '#EFE1CD',
    BADGE_BG: '#F1E6D4', GLOW: 'rgba(188,106,40,0.28)', isDark: false,
  },
};

// Сигнатурная триада КБЖУ — фиксированные цвета, не из темы
const MACRO_COLORS = { protein: '#D2694A', fat: '#E3A72C', carbs: '#93A86A' };

// Цвета категорий приёма пищи (левый бордюр строки блюда)
const CAT_COLORS = {
  breakfast: '#E3A72C', lunch: '#D2694A', pretrain: '#EDA053', dinner: '#C8643C', snack: '#A88A63',
};

// Линейные иконки приёмов пищи (lucide) вместо эмодзи
const MEAL_ICONS = {
  breakfast: Sunrise, lunch: UtensilsCrossed, pretrain: Zap, dinner: Moon, snack: Cookie,
};

const MONO = "'JetBrains Mono', monospace";
const DISPLAY = "'Space Grotesk', sans-serif";

const isNightNow = () => {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
};

const ThemeContext = createContext(THEMES.dark);
const useTheme = () => useContext(ThemeContext);

function useThemeController() {
  const [mode, setMode] = useState('auto');
  const [timeIsDark, setTimeIsDark] = useState(isNightNow());
  const [tgScheme, setTgScheme] = useState(null); // 'light' | 'dark' | null (не в Telegram)

  // Тайм-фолбэк для авто-режима вне Telegram
  useEffect(() => {
    const id = setInterval(() => setTimeIsDark(isNightNow()), 60000);
    return () => clearInterval(id);
  }, []);

  // Внутри Telegram Mini App — сразу берём тему клиента и реагируем на её смену
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    try { tg.ready(); tg.expand(); } catch (e) { /* игнор */ }
    const apply = () => setTgScheme(tg.colorScheme === 'dark' ? 'dark' : 'light');
    apply();
    tg.onEvent?.('themeChanged', apply);
    return () => { try { tg.offEvent?.('themeChanged', apply); } catch (e) { /* игнор */ } };
  }, []);

  // В авто-режиме приоритет у темы Telegram; вне TG — по времени суток
  const autoIsDark = tgScheme ? tgScheme === 'dark' : timeIsDark;
  const isDark = mode === 'auto' ? autoIsDark : mode === 'dark';
  const theme = isDark ? THEMES.dark : THEMES.light;
  const usingTg = mode === 'auto' && tgScheme != null;
  const cycle = () => setMode((m) => (m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto'));

  return { theme, mode, isDark, usingTg, cycle };
}

// Применяем тему Telegram, если открыто внутри Mini App
function useTelegramTheme() {
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
      }
    } catch (e) {
      /* не в Telegram — игнорируем */
    }
  }, []);
}

// ---------- Общие UI-примитивы ----------

function MealIcon({ mealType, size = 16, ...rest }) {
  const Icon = MEAL_ICONS[mealType] || Utensils;
  return <Icon size={size} {...rest} />;
}

function ThemeToggle({ mode, isDark, cycle, usingTg }) {
  const t = useTheme();
  const title = mode === 'auto'
    ? (usingTg ? (isDark ? 'Авто · тема Telegram (тёмная)' : 'Авто · тема Telegram (светлая)') : (isDark ? 'Авто · ночь' : 'Авто · день'))
    : (isDark ? 'Тёмная' : 'Светлая');
  return (
    <button
      onClick={cycle}
      aria-label="Переключить тему"
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.BORDER}`,
        background: t.BG_INPUT, color: t.ACCENT, cursor: 'pointer', position: 'relative',
      }}
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
      {mode === 'auto' && (
        <span style={{
          position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%',
          background: t.ACCENT,
        }} />
      )}
    </button>
  );
}

// Плавающая нижняя стеклянная навигация
function BottomNav({ tab, goToTab }) {
  const t = useTheme();
  const items = [
    { key: 'recipes', label: 'Рецепты', Icon: Utensils },
    { key: 'plan', label: 'План', Icon: CalendarDays },
    { key: 'shopping', label: 'Покупки', Icon: ShoppingCart },
  ];
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex',
      justifyContent: 'center', pointerEvents: 'none', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{
        pointerEvents: 'auto', width: '100%', maxWidth: 480,
        margin: '0 18px 16px', height: 60, borderRadius: 20,
        background: t.NAV_BG, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${t.NAV_BORDER}`, boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)',
        display: 'flex',
      }}>
        {items.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => goToTab(key)}
              style={{
                position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                color: active ? t.ACCENT : t.TEXT_DIM, opacity: active ? 1 : 0.5,
                transition: 'color 0.2s ease, opacity 0.2s ease',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%,-1px)',
                  width: 34, height: 3, borderRadius: 2, background: t.ACCENT_GRAD,
                }} />
              )}
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Сигнатурный элемент: "тарелка" БЖУ — три полоски-порции вместо голых чисел.
function MacroPlate({ protein, fat, carbs, kcal, compact }) {
  const t = useTheme();
  const total = protein + fat + carbs || 1;
  const segs = [
    { key: 'protein', label: 'Б', value: protein, color: MACRO_COLORS.protein },
    { key: 'fat', label: 'Ж', value: fat, color: MACRO_COLORS.fat },
    { key: 'carbs', label: 'У', value: carbs, color: MACRO_COLORS.carbs },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <div style={{
        display: 'flex', width: '100%', height: compact ? 6 : 8, borderRadius: 5, overflow: 'hidden',
        background: t.BORDER,
      }}>
        {segs.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: 'width 0.3s ease' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {segs.map((s) => (
            <span key={s.key} style={{ fontSize: compact ? 11.5 : 12.5, color: t.TEXT_DIM, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
              {s.label} {s.value}
            </span>
          ))}
        </div>
        {kcal != null && (
          <span style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 800, color: t.TEXT, fontFamily: MONO }}>
            {kcal} ккал
          </span>
        )}
      </div>
    </div>
  );
}

// Развёрнутая тарелка КБЖУ для экрана рецепта: полоса + три колонки с числами
function MacroPlateDetailed({ protein, fat, carbs }) {
  const t = useTheme();
  const total = protein + fat + carbs || 1;
  const segs = [
    { key: 'protein', label: 'Белок', value: protein, color: MACRO_COLORS.protein },
    { key: 'fat', label: 'Жир', value: fat, color: MACRO_COLORS.fat },
    { key: 'carbs', label: 'Углев.', value: carbs, color: MACRO_COLORS.carbs },
  ];
  return (
    <div>
      <div style={{
        display: 'flex', width: '100%', height: 9, borderRadius: 5, overflow: 'hidden',
        background: t.BORDER, marginBottom: 14,
      }}>
        {segs.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: 'width 0.3s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {segs.map((s) => (
          <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.TEXT_FAINT, fontWeight: 600 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.TEXT, fontFamily: DISPLAY }}>{s.value}г</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealTypeBadge({ mealType }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  if (!meta) return null;
  const color = CAT_COLORS[mealType] || t.ACCENT;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
      color: t.TEXT_DIM, background: t.BG_INPUT, border: `1px solid ${color}55`,
      padding: '4px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.03em',
      fontFamily: MONO,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {meta.label}
    </span>
  );
}

// ---------- Карточка рецепта (список) ----------

function RecipeCard({ recipe, onOpen }) {
  const t = useTheme();
  const color = CAT_COLORS[recipe.mealType] || t.ACCENT;
  return (
    <button
      onClick={() => onOpen(recipe)}
      style={{
        display: 'flex', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 16,
        padding: 0, fontFamily: 'inherit', boxSizing: 'border-box', overflow: 'hidden',
      }}
    >
      <span style={{ width: 3, alignSelf: 'stretch', background: color, flexShrink: 0 }} />
      <span style={{ display: 'block', flex: 1, minWidth: 0, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16.5, fontWeight: 700, color: t.TEXT, marginBottom: 6, lineHeight: 1.25,
              fontFamily: DISPLAY,
            }}>
              {recipe.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.TEXT_FAINT, fontSize: 12.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: MONO }}>
                <Clock size={13} /> {recipe.totalTime} мин
              </span>
            </div>
          </div>
        </div>
        <MacroPlate protein={recipe.protein} fat={recipe.fat} carbs={recipe.carbs} kcal={recipe.kcal} compact />
      </span>
    </button>
  );
}

// ---------- Экран деталей рецепта ----------

function RecipeDetail({ recipe, onClose }) {
  const t = useTheme();
  const touchRef = React.useRef({ y: 0, active: false });
  const scrollRef = React.useRef(null);

  if (!recipe) return null;

  const handleTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 4) {
      touchRef.current.active = false;
      return;
    }
    touchRef.current = { y: e.touches[0].clientY, active: true };
  };

  const handleTouchMove = (e) => {
    if (!touchRef.current.active) return;
    const dy = e.touches[0].clientY - touchRef.current.y;
    if (dy > 90) {
      touchRef.current.active = false;
      onClose();
    }
  };

  const handleTouchEnd = () => {
    touchRef.current.active = false;
  };

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="recipe-detail-enter"
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: t.BG,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        position: 'sticky', top: 0, zIndex: 5, background: t.BG,
        maxWidth: 480, margin: '0 auto',
        padding: '14px max(18px, env(safe-area-inset-right)) 10px max(18px, env(safe-area-inset-left))',
        boxSizing: 'border-box', borderBottom: `1px solid ${t.BORDER}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px 8px 10px', borderRadius: 11, border: `1px solid ${t.BORDER}`,
            background: t.BG_RAISED, color: t.TEXT, cursor: 'pointer', flexShrink: 0,
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={18} /> Назад
        </button>
        <MealTypeBadge mealType={recipe.mealType} />
      </div>

      <div style={{
        maxWidth: 480, margin: '0 auto',
        padding: '18px max(18px, env(safe-area-inset-right)) 40px max(18px, env(safe-area-inset-left))',
        boxSizing: 'border-box',
      }}>
        <h1 style={{
          fontSize: 25, fontWeight: 700, color: t.TEXT, margin: '0 0 16px', lineHeight: 1.15,
          fontFamily: DISPLAY,
        }}>
          {recipe.title}
        </h1>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{
            flex: 1, background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 14,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6, fontFamily: MONO }}>
              <Clock size={12} /> Время
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT, fontFamily: DISPLAY }}>
              {recipe.totalTime} мин <span style={{ fontSize: 12, color: t.TEXT_FAINT, fontWeight: 500 }}>· актив {recipe.activeTime}</span>
            </div>
          </div>
          <div style={{
            flex: 1, borderRadius: 14, padding: '12px 14px',
            background: t.isDark ? 'rgba(224,138,60,0.12)' : 'rgba(188,106,40,0.10)',
            border: `1px solid ${t.ACCENT}55`,
          }}>
            <div style={{ fontSize: 10.5, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6, fontFamily: MONO }}>
              Калории
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.ACCENT, fontFamily: DISPLAY }}>{recipe.kcal} ккал</div>
          </div>
        </div>

        <div style={{
          background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 16, padding: 16, marginBottom: 22,
        }}>
          <MacroPlateDetailed protein={recipe.protein} fat={recipe.fat} carbs={recipe.carbs} />
        </div>

        <SectionLabel>Ингредиенты</SectionLabel>
        <div style={{ marginBottom: 22 }}>
          {recipe.ingredients.map((ing, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'flex-start', gap: 10, padding: '9px 2px',
              borderBottom: i === recipe.ingredients.length - 1 ? 'none' : `1px solid ${t.BORDER}`,
              fontSize: 14,
            }}>
              <span style={{ color: t.TEXT, minWidth: 0, flex: 1 }}>{ing.label}</span>
              <span style={{ color: t.TEXT_DIM, fontFamily: MONO, fontSize: 13, flexShrink: 0 }}>{ing.display}</span>
            </div>
          ))}
        </div>

        <SectionLabel>Способ приготовления</SectionLabel>
        <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: t.BG_INPUT,
                border: `1px solid ${t.BORDER}`, color: t.ACCENT, fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: MONO,
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 14.5, color: t.TEXT, lineHeight: 1.55, paddingTop: 2 }}>{step}</span>
            </div>
          ))}
        </div>

        {recipe.link && (
          <a
            href={recipe.link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: t.ACCENT,
              textDecoration: 'none', marginBottom: 22, fontWeight: 600,
            }}
          >
            <ExternalLink size={14} /> {recipe.link.label}
          </a>
        )}

        <SectionLabel>Как выглядит готовое блюдо</SectionLabel>
        <p style={{ fontSize: 13.5, color: t.TEXT_DIM, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 22, marginTop: 8 }}>
          {recipe.look}
        </p>

        <div style={{
          background: t.isDark ? 'rgba(224,138,60,0.09)' : 'rgba(188,106,40,0.09)',
          border: `1px solid ${t.isDark ? '#6b4526' : '#E6C69A'}`, borderRadius: 14,
          padding: 14,
        }}>
          <div style={{ fontSize: 11.5, color: t.ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6, fontFamily: MONO }}>
            Совет тренера
          </div>
          <p style={{ fontSize: 13.5, color: t.TEXT_DIM, lineHeight: 1.5, margin: 0 }}>{recipe.tip}</p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  const t = useTheme();
  return (
    <div style={{
      fontSize: 11, color: t.TEXT_FAINT, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.14em', marginBottom: 10, fontFamily: MONO,
    }}>
      {children}
    </div>
  );
}

// ---------- Today-hero: кольцо прогресса дня + бары КБЖУ ----------

function ProgressRing({ pct, t }) {
  const size = 96;
  const sw = 9;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circ * (1 - clamped / 100);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.GRAD_FROM} />
          <stop offset="100%" stopColor={t.GRAD_TO} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.RING_TRACK} strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
        fill={t.TEXT} fontSize="20" fontWeight="700" fontFamily={DISPLAY}>
        {Math.round(pct)}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle"
        fill={t.TEXT_FAINT} fontSize="10" fontFamily={MONO}>
        дня
      </text>
    </svg>
  );
}

function TodayHero({ day, dayIndex, getOverride, hasOverride }) {
  const t = useTheme();
  const { profile } = useProfile();
  const macros = useMemo(() => calcTargetMacros(profile || {}), [profile]);

  const totals = useMemo(() => {
    const slots = ['breakfast', 'lunch', 'pretrain', 'dinner', 'snack'];
    let kcal = 0, p = 0, f = 0, c = 0;
    slots.forEach((s) => {
      const rid = hasOverride(dayIndex, s) ? getOverride(dayIndex, s) : day[s];
      const r = rid ? RECIPES_BY_ID[rid] : null;
      if (r) { kcal += r.kcal; p += r.protein; f += r.fat; c += r.carbs; }
    });
    return { kcal, p, f, c };
  }, [day, dayIndex, getOverride, hasOverride]);

  const targetKcal = macros.targetKcal || day.kcal || 1;
  const pct = (totals.kcal / targetKcal) * 100;

  const bars = [
    { label: 'Белок', val: totals.p, target: macros.proteinG, color: MACRO_COLORS.protein },
    { label: 'Жир', val: totals.f, target: macros.fatG, color: MACRO_COLORS.fat },
    { label: 'Углеводы', val: totals.c, target: macros.carbsG, color: MACRO_COLORS.carbs },
  ];

  return (
    <div style={{
      background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 22, padding: 18,
      display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20,
    }}>
      <ProgressRing pct={pct} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT, fontFamily: DISPLAY, marginBottom: 12 }}>
          {totals.kcal} <span style={{ color: t.TEXT_FAINT, fontWeight: 500 }}>/ {targetKcal} ккал</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {bars.map((b) => {
            const w = b.target ? Math.min(100, (b.val / b.target) * 100) : 0;
            return (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: t.TEXT_DIM, fontFamily: MONO }}>{b.label}</span>
                  <span style={{ fontSize: 10, color: t.TEXT_FAINT, fontFamily: MONO }}>{b.val}/{b.target || '—'}г</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: t.BORDER, overflow: 'hidden' }}>
                  <div style={{ width: `${w}%`, height: '100%', background: b.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Вкладка: План недели ----------

function WeekSwitcher({ weeks, activeId, onChange }) {
  const t = useTheme();
  if (weeks.length <= 1) return null;
  const idx = weeks.findIndex((w) => w.id === activeId);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <button
        onClick={() => idx > 0 && onChange(weeks[idx - 1].id)}
        disabled={idx <= 0}
        style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.BORDER}`,
          background: t.BG_INPUT, color: idx <= 0 ? t.TEXT_FAINT : t.TEXT_DIM,
          cursor: idx <= 0 ? 'default' : 'pointer', opacity: idx <= 0 ? 0.4 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronLeft size={17} />
      </button>
      <div style={{
        flex: 1, textAlign: 'center', fontSize: 14.5, fontWeight: 700, color: t.TEXT,
        background: t.BG_INPUT, border: `1px solid ${t.BORDER}`, borderRadius: 12, padding: '9px 0',
        fontFamily: DISPLAY,
      }}>
        {weeks[idx]?.label}
      </div>
      <button
        onClick={() => idx < weeks.length - 1 && onChange(weeks[idx + 1].id)}
        disabled={idx >= weeks.length - 1}
        style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.BORDER}`,
          background: t.BG_INPUT, color: idx >= weeks.length - 1 ? t.TEXT_FAINT : t.TEXT_DIM,
          cursor: idx >= weeks.length - 1 ? 'default' : 'pointer', opacity: idx >= weeks.length - 1 ? 0.4 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function DayMealRow({ mealType, recipeId, customLabel, note, onOpenRecipe, isOverridden, isNewDish, onEdit }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  const recipe = recipeId ? RECIPES_BY_ID[recipeId] : null;
  const color = CAT_COLORS[mealType] || t.ACCENT;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '10px 2px', borderBottom: `1px solid ${t.BORDER}`,
    }}>
      <span style={{ width: 3, alignSelf: 'stretch', background: color, borderRadius: 2, flexShrink: 0 }} />
      <button
        onClick={() => recipe && onOpenRecipe(recipe)}
        disabled={!recipe}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textAlign: 'left',
          background: 'transparent', border: 'none', cursor: recipe ? 'pointer' : 'default',
          fontFamily: 'inherit', padding: 0,
        }}
      >
        <span style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: t.BG_INPUT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          <MealIcon mealType={mealType} size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO }}>
            {meta.label}
            {isOverridden && (
              <span style={{ color: t.ACCENT, fontSize: 9, fontWeight: 700, background: t.isDark ? 'rgba(224,138,60,0.16)' : 'rgba(188,106,40,0.14)', padding: '1px 6px', borderRadius: 4, textTransform: 'none', letterSpacing: 0 }}>
                заменено
              </span>
            )}
            {isNewDish && (
              <span style={{ color: t.GOLD, fontSize: 9, fontWeight: 700, background: 'rgba(227,167,44,0.16)', padding: '1px 6px', borderRadius: 4, textTransform: 'none', letterSpacing: 0 }}>
                ✨ новое блюдо недели
              </span>
            )}
          </div>
          <div style={{ fontSize: 13.5, color: t.TEXT, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recipe ? recipe.title : customLabel}
          </div>
          {note && (
            <div style={{ fontSize: 12, color: t.HERB, fontWeight: 600, marginTop: 1 }}>{note}</div>
          )}
        </div>
        {recipe && <ChevronRight size={16} style={{ color: t.TEXT_FAINT, flexShrink: 0 }} />}
      </button>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Заменить блюдо"
          style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: `1px solid ${t.BORDER}`,
            background: t.BG_INPUT, color: t.TEXT_DIM, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

function DayCard({ day, dayIndex, onOpenRecipe, defaultOpen, getOverride, hasOverride, onEditMeal }) {
  const t = useTheme();
  const [open, setOpen] = useState(!!defaultOpen);
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const isToday = day.date === `${dd}.${mm}`;

  const resolveMeal = (mealType, defaultRecipeId, extra = {}) => {
    const overridden = hasOverride(dayIndex, mealType);
    const recipeId = overridden ? getOverride(dayIndex, mealType) : defaultRecipeId;
    const isNewDish = day[`${mealType}Note`] === 'Новое блюдо недели';
    return { mealType, recipeId, isOverridden: overridden, isNewDish, ...extra };
  };

  const meals = [
    resolveMeal('breakfast', day.breakfast, { customLabel: day.breakfastCustom, note: day.breakfastNote !== 'Новое блюдо недели' ? day.breakfastNote : null }),
    resolveMeal('lunch', day.lunch, { note: day.lunchNote }),
    resolveMeal('pretrain', day.pretrain),
    resolveMeal('dinner', day.dinner),
    ...(day.snack ? [resolveMeal('snack', day.snack)] : []),
  ];

  return (
    <div style={{
      background: t.BG_RAISED, border: `1px solid ${isToday ? t.ACCENT : t.BORDER}`, borderRadius: 16,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '13px 15px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, color: isToday ? '#FFF' : t.TEXT,
            background: isToday ? undefined : t.BADGE_BG, backgroundImage: isToday ? t.ACCENT_GRAD : undefined,
            padding: '4px 9px', borderRadius: 8, fontFamily: MONO,
          }}>
            {day.day}
          </span>
          <span style={{ fontSize: 13.5, color: t.TEXT_DIM, fontWeight: 600, opacity: 0.6 }}>{day.date}</span>
          {isToday && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: t.ACCENT, border: `1px solid ${t.ACCENT}`, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: MONO }}>
              сегодня
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.TEXT, fontFamily: MONO }}>
            ~{day.kcal} ккал
          </span>
          <ChevronDown size={16} style={{ color: t.TEXT_FAINT, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 15px 6px' }}>
          {meals.map((m) => (
            <DayMealRow
              key={m.mealType}
              {...m}
              onOpenRecipe={onOpenRecipe}
              onEdit={() => onEditMeal(dayIndex, m.mealType, m.recipeId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplementRow({ supplement, onUpdate, onRemove }) {
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(supplement);

  useEffect(() => { setLocal(supplement); }, [supplement]);

  const commit = () => {
    onUpdate(supplement.id, {
      name: local.name,
      amount: local.amount,
      unit: local.unit,
      timing: local.timing,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        background: t.BG_RAISED, border: `1px solid ${t.ACCENT}`, borderRadius: 12, padding: 12,
      }}>
        <input
          value={local.name}
          onChange={(e) => setLocal((l) => ({ ...l, name: e.target.value }))}
          placeholder="Название"
          style={{
            width: '100%', border: `1px solid ${t.BORDER}`, background: t.BG_INPUT, color: t.TEXT,
            borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="number"
            value={local.amount ?? ''}
            onChange={(e) => setLocal((l) => ({ ...l, amount: e.target.value === '' ? null : parseFloat(e.target.value) }))}
            placeholder="Порция"
            style={{
              flex: 1, border: `1px solid ${t.BORDER}`, background: t.BG_INPUT, color: t.TEXT,
              borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <input
            value={local.unit ?? ''}
            onChange={(e) => setLocal((l) => ({ ...l, unit: e.target.value }))}
            placeholder="Единица (г/мг/капсула)"
            style={{
              flex: 1.4, border: `1px solid ${t.BORDER}`, background: t.BG_INPUT, color: t.TEXT,
              borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
        <input
          value={local.timing ?? ''}
          onChange={(e) => setLocal((l) => ({ ...l, timing: e.target.value }))}
          placeholder="Когда принимать"
          style={{
            width: '100%', border: `1px solid ${t.BORDER}`, background: t.BG_INPUT, color: t.TEXT,
            borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={commit}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', backgroundImage: t.ACCENT_GRAD,
              color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 6px 18px -8px ${t.GLOW}`,
            }}
          >
            Сохранить
          </button>
          <button
            onClick={() => onRemove(supplement.id)}
            style={{
              width: 38, padding: '9px 0', borderRadius: 10, border: `1px solid ${t.BORDER}`,
              background: t.BG_INPUT, color: t.ACCENT, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left',
        background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 12,
        padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 700, color: t.TEXT }}>
        {supplement.name}
        {supplement.amount != null && (
          <span style={{ color: t.TEXT_DIM, fontWeight: 600 }}> · {supplement.amount} {supplement.unit}</span>
        )}
      </span>
      <span style={{ fontSize: 12.5, color: t.TEXT_DIM }}>{supplement.timing}</span>
    </button>
  );
}

function SupplementsSection() {
  const t = useTheme();
  const { supplements, error, addSupplement, updateSupplement, removeSupplement, isSupabaseConfigured } = useSupplements();

  const handleAdd = () => {
    addSupplement({ name: 'Новый БАД', amount: null, unit: null, timing: '' });
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SectionLabel>БАДы</SectionLabel>
        <button
          onClick={handleAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
            border: `1px solid ${t.BORDER}`, background: t.BG_INPUT, color: t.TEXT_DIM,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={13} /> Добавить
        </button>
      </div>
      {!isSupabaseConfigured && (
        <p style={{ fontSize: 11.5, color: t.TEXT_FAINT, marginTop: -4, marginBottom: 10 }}>
          Изменения не сохранятся между визитами без подключённого Supabase.
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: t.ACCENT, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {supplements.map((s) => (
          <SupplementRow key={s.id} supplement={s} onUpdate={updateSupplement} onRemove={removeSupplement} />
        ))}
        {supplements.length === 0 && (
          <p style={{ fontSize: 13, color: t.TEXT_FAINT, textAlign: 'center', padding: '12px 0' }}>
            Список пуст — нажми «Добавить»
          </p>
        )}
      </div>
    </div>
  );
}

function RecipePicker({ mealType, currentRecipeId, hasOverride, onPick, onResetToDefault, onClose }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  const isSnack = mealType === 'snack';
  const options = useMemo(
    () => (isSnack ? RECIPES : RECIPES.filter((r) => r.mealType === mealType)),
    [mealType, isSnack]
  );
  const groups = useMemo(() => {
    if (!isSnack) return [{ key: mealType, label: null, items: options }];
    const byType = {};
    options.forEach((r) => {
      if (!byType[r.mealType]) byType[r.mealType] = [];
      byType[r.mealType].push(r);
    });
    return Object.entries(MEAL_TYPES)
      .filter(([key]) => byType[key])
      .map(([key, m]) => ({ key, label: m.label, items: byType[key] }));
  }, [options, isSnack, mealType]);

  return (
    <div className="overlay-fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '80vh', background: t.BG,
          borderRadius: '18px 18px 0 0', border: `1px solid ${t.BORDER}`, borderBottom: 'none',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px', borderBottom: `1px solid ${t.BORDER}`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT, display: 'flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY }}>
            <span style={{ color: CAT_COLORS[mealType] || t.ACCENT, display: 'flex' }}><MealIcon mealType={mealType} size={17} /></span>
            Заменить {meta.label.toLowerCase()}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${t.BORDER}`, background: t.BG_INPUT,
              color: t.TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 14, flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {hasOverride && (
            <button
              onClick={onResetToDefault}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '12px 14px', borderRadius: 11, marginBottom: 10,
                border: `1px dashed ${t.BORDER}`, background: 'transparent', color: t.TEXT_DIM,
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <RotateCcw size={15} /> Вернуть исходное блюдо плана
            </button>
          )}
          {groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 14 }}>
              {group.label && (
                <div style={{ fontSize: 12, color: t.TEXT_FAINT, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO }}>
                  <span style={{ color: CAT_COLORS[group.key] || t.ACCENT, display: 'flex' }}><MealIcon mealType={group.key} size={13} /></span>
                  {group.label}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((r) => {
                  const isCurrent = r.id === currentRecipeId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => onPick(r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${isCurrent ? t.ACCENT : t.BORDER}`,
                        background: isCurrent ? (t.isDark ? 'rgba(224,138,60,0.12)' : 'rgba(188,106,40,0.10)') : t.BG_RAISED,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? t.ACCENT : t.TEXT, marginBottom: 2, fontFamily: DISPLAY }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: t.TEXT_FAINT, fontFamily: MONO }}>
                          {r.kcal} ккал · Б{r.protein} Ж{r.fat} У{r.carbs}
                        </div>
                      </div>
                      {isCurrent && <span style={{ color: t.ACCENT, fontSize: 16, flexShrink: 0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanTab({ onOpenRecipe }) {
  const t = useTheme();
  const [activeWeekId, setActiveWeekId] = useState(getLatestWeek()?.id);
  const week = WEEKS.find((w) => w.id === activeWeekId) || getLatestWeek();
  const { loaded, error, schemaMissing, getOverride, hasOverride, setOverride, isSupabaseConfigured } = useMealOverrides(week?.id);
  const [editingMeal, setEditingMeal] = useState(null);

  if (!week) {
    return <div style={{ color: t.TEXT_FAINT, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>Пока нет планов на неделю.</div>;
  }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  let todayIdx = week.days.findIndex((d) => d.date === `${dd}.${mm}`);
  if (todayIdx < 0) todayIdx = 0;

  const handleEditMeal = (dayIndex, mealType, currentRecipeId) => {
    setEditingMeal({ dayIndex, mealType, currentRecipeId });
  };

  const handlePick = async (recipeId) => {
    if (editingMeal) {
      await setOverride(editingMeal.dayIndex, editingMeal.mealType, recipeId);
    }
    setEditingMeal(null);
  };

  const handleResetToDefault = async () => {
    if (editingMeal) {
      await setOverride(editingMeal.dayIndex, editingMeal.mealType, null);
    }
    setEditingMeal(null);
  };

  return (
    <div>
      <WeekSwitcher weeks={WEEKS} activeId={week.id} onChange={setActiveWeekId} />

      <TodayHero day={week.days[todayIdx]} dayIndex={todayIdx} getOverride={getOverride} hasOverride={hasOverride} />

      {!isSupabaseConfigured && (
        <div style={{
          background: t.isDark ? 'rgba(227,167,44,0.1)' : 'rgba(198,138,36,0.1)', border: `1px solid ${t.GOLD}`, borderRadius: 12,
          padding: '10px 13px', marginBottom: 14, fontSize: 12, color: t.TEXT_DIM, lineHeight: 1.5,
        }}>
          Замены блюд работают, но не сохраняются между визитами — подключи Supabase (см. README), чтобы план запоминался навсегда.
        </div>
      )}
      {isSupabaseConfigured && schemaMissing && (
        <div style={{
          background: t.isDark ? 'rgba(227,167,44,0.1)' : 'rgba(198,138,36,0.1)', border: `1px solid ${t.GOLD}`, borderRadius: 12,
          padding: '10px 13px', marginBottom: 14, fontSize: 12, color: t.TEXT_DIM, lineHeight: 1.5,
        }}>
          Supabase подключён, но таблицы ещё не созданы — запусти <b>supabase/schema.sql</b> в SQL Editor, чтобы замены блюд сохранялись. Пока показан план по умолчанию.
        </div>
      )}
      {error && (
        <div style={{
          background: t.isDark ? 'rgba(224,138,60,0.14)' : 'rgba(188,106,40,0.12)', border: `1px solid ${t.ACCENT}`, borderRadius: 12,
          padding: '10px 13px', marginBottom: 14, fontSize: 12.5, color: t.ACCENT,
        }}>
          {error}
        </div>
      )}

      <SectionLabel>Дни</SectionLabel>
      <p style={{ fontSize: 12, color: t.TEXT_FAINT, marginTop: -6, marginBottom: 14 }}>
        Нажми ✏️ рядом с блюдом, чтобы заменить его на другое из той же категории.
      </p>
      <div style={{ marginBottom: 22 }}>
        {week.days.map((d, i) => (
          <DayCard
            key={d.day + d.date}
            day={d}
            dayIndex={i}
            onOpenRecipe={onOpenRecipe}
            defaultOpen={i === todayIdx}
            getOverride={getOverride}
            hasOverride={hasOverride}
            onEditMeal={handleEditMeal}
          />
        ))}
      </div>

      <SupplementsSection />

      {editingMeal && (
        <RecipePicker
          mealType={editingMeal.mealType}
          currentRecipeId={editingMeal.currentRecipeId}
          hasOverride={hasOverride(editingMeal.dayIndex, editingMeal.mealType)}
          onPick={handlePick}
          onResetToDefault={handleResetToDefault}
          onClose={() => setEditingMeal(null)}
        />
      )}
    </div>
  );
}

function RecipesTab({ onOpenRecipe }) {
  const t = useTheme();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return RECIPES;
    return RECIPES.filter((r) => r.mealType === filter);
  }, [filter]);

  const groupedSections = useMemo(() => {
    if (filter !== 'all') return null;
    return Object.entries(MEAL_TYPES)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, meta]) => ({
        key, meta,
        items: RECIPES.filter((r) => r.mealType === key),
      }))
      .filter((section) => section.items.length > 0);
  }, [filter]);

  const filterOptions = [
    { key: 'all', label: 'Все' },
    ...Object.entries(MEAL_TYPES)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, meta]) => ({ key, label: meta.label })),
  ];

  return (
    <div>
      <div style={{
        display: 'flex', gap: 7, marginBottom: 18, overflowX: 'auto', paddingBottom: 2,
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        {filterOptions.map((opt) => {
          const active = filter === opt.key;
          const color = CAT_COLORS[opt.key];
          return (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 13px', borderRadius: 10,
                border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? (t.isDark ? 'rgba(224,138,60,0.16)' : 'rgba(188,106,40,0.12)') : 'transparent',
                color: active ? t.ACCENT : t.TEXT_DIM,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.key !== 'all' && (
                <span style={{ color: color || 'inherit', display: 'flex' }}><MealIcon mealType={opt.key} size={14} /></span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {groupedSections ? (
        groupedSections.map((section, idx) => (
          <div key={section.key} style={{ marginBottom: idx === groupedSections.length - 1 ? 0 : 26 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <span style={{ color: CAT_COLORS[section.key] || t.ACCENT, display: 'flex' }}><MealIcon mealType={section.key} size={16} /></span>
              <span style={{
                fontSize: 13, fontWeight: 800, color: t.TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO,
              }}>
                {section.meta.label}
              </span>
              <div style={{ flex: 1, height: 1, background: t.BORDER }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.items.map((r) => (
                <RecipeCard key={r.id} recipe={r} onOpen={onOpenRecipe} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={onOpenRecipe} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Вкладка: Покупки ----------

function ShoppingGroup({ title, items, checkedMap, onToggle, onToggleAll }) {
  const t = useTheme();
  const allChecked = items.length > 0 && items.every((it) => checkedMap[it.item]);

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => onToggleAll(items, !allChecked)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{
          flexShrink: 0, width: 16, height: 16, borderRadius: 5,
          border: `2px solid ${allChecked ? t.HERB : t.TEXT_FAINT}`,
          background: allChecked ? t.HERB : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFF',
        }}>
          {allChecked ? '✓' : ''}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.TEXT }}>{title}</span>
      </button>
      <div style={{ background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {items.map((it, i) => {
          const isChecked = !!checkedMap[it.item];
          return (
            <button
              key={it.item}
              onClick={() => onToggle(it.item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '11px 14px', background: 'transparent', border: 'none',
                borderBottom: i === items.length - 1 ? 'none' : `1px solid ${t.BORDER}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                border: `2px solid ${isChecked ? t.HERB : t.TEXT_FAINT}`,
                background: isChecked ? t.HERB : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFF',
              }}>
                {isChecked ? '✓' : ''}
              </span>
              <span style={{
                fontSize: 13.5, color: isChecked ? t.TEXT_FAINT : t.TEXT,
                textDecoration: isChecked ? 'line-through' : 'none',
              }}>
                {it.display}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PortionMultiplier({ value, onChange }) {
  const t = useTheme();
  const options = [
    { key: 1, label: '×1' },
    { key: 1.5, label: '×1.5' },
    { key: 2, label: '×2' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8, fontFamily: MONO }}>
        Порций
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? (t.isDark ? 'rgba(224,138,60,0.16)' : 'rgba(188,106,40,0.12)') : 'transparent',
                color: active ? t.ACCENT : t.TEXT_DIM,
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: DISPLAY,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShoppingTab() {
  const t = useTheme();
  const [activeWeekId, setActiveWeekId] = useState(getLatestWeek()?.id);
  const week = WEEKS.find((w) => w.id === activeWeekId) || getLatestWeek();
  const [checkedMap, setCheckedMap] = useState({});
  const [multiplier, setMultiplier] = useState(1);
  const { getOverride, loaded: overridesLoaded } = useMealOverrides(week?.id);

  const shoppingList = useMemo(
    () => buildShoppingList(week, CATEGORIES, multiplier, getOverride),
    [week, multiplier, getOverride, overridesLoaded]
  );

  const toggleItem = (itemKey) => setCheckedMap((c) => ({ ...c, [itemKey]: !c[itemKey] }));

  const toggleAllInGroup = (items, checkedState) => {
    setCheckedMap((c) => {
      const next = { ...c };
      items.forEach((it) => { next[it.item] = checkedState; });
      return next;
    });
  };

  if (!week) {
    return <div style={{ color: t.TEXT_FAINT, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>Пока нет плана на эту неделю.</div>;
  }

  const totalLong = shoppingList.long.reduce((s, g) => s + g.items.length, 0);
  const totalFresh = shoppingList.freshBatches.reduce(
    (s, b) => s + b.groups.reduce((s2, g) => s2 + g.items.length, 0), 0
  );

  return (
    <div>
      <WeekSwitcher weeks={WEEKS} activeId={week.id} onChange={setActiveWeekId} />

      <p style={{ fontSize: 12, color: t.TEXT_FAINT, lineHeight: 1.5, marginBottom: 16 }}>
        Список считается автоматически из всех блюд недели — поменяешь день в плане, список обновится сам.
      </p>

      <PortionMultiplier value={multiplier} onChange={setMultiplier} />

      {totalLong === 0 && totalFresh === 0 ? (
        <div style={{ color: t.TEXT_FAINT, fontSize: 14, textAlign: 'center', padding: '30px 0' }}>
          На эту неделю пока нет выбранных блюд.
        </div>
      ) : (
        <>
          {totalLong > 0 && (
            <>
              <SectionLabel>Купить сразу на всю неделю</SectionLabel>
              <p style={{ fontSize: 12, color: t.TEXT_FAINT, marginTop: -4, marginBottom: 14 }}>
                Хранится долго — холодильник/морозилка/полка
              </p>
              {shoppingList.long.map((g) => (
                <ShoppingGroup key={g.key} title={g.title} items={g.items} checkedMap={checkedMap} onToggle={toggleItem} onToggleAll={toggleAllInGroup} />
              ))}
            </>
          )}

          {shoppingList.freshBatches.map((batch) => {
            const batchTotal = batch.groups.reduce((s, g) => s + g.items.length, 0);
            if (batchTotal === 0) return null;
            return (
              <React.Fragment key={batch.key}>
                <div style={{ height: 1, background: t.BORDER, margin: '4px 0 22px' }} />
                <SectionLabel>{batch.label}</SectionLabel>
                <p style={{ fontSize: 12, color: t.TEXT_FAINT, marginTop: -4, marginBottom: 14 }}>
                  Свежие продукты только на этот промежуток дней — не портятся заранее
                </p>
                {batch.groups.map((g) => (
                  <ShoppingGroup key={g.key} title={g.title} items={g.items} checkedMap={checkedMap} onToggle={toggleItem} onToggleAll={toggleAllInGroup} />
                ))}
              </React.Fragment>
            );
          })}

          <p style={{ fontSize: 12, color: t.TEXT_FAINT, textAlign: 'center', marginTop: 8 }}>
            Количества — точные суммы по рецептам{multiplier !== 1 ? ` (×${multiplier})` : ''}, подгоняй на глаз под упаковки в магазине.
          </p>
        </>
      )}
    </div>
  );
}

// ---------- Корневое приложение ----------

function ProfileModal({ onClose }) {
  const t = useTheme();
  const { profile, loaded, error, saveProfile, isSupabaseConfigured } = useProfile();
  const [form, setForm] = useState(profile);

  useEffect(() => { if (loaded) setForm(profile); }, [loaded, profile]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    saveProfile(form);
  };

  const macros = useMemo(() => calcTargetMacros(form), [form]);

  return (
    <div className="overlay-fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '88vh', background: t.BG,
          borderRadius: '18px 18px 0 0', border: `1px solid ${t.BORDER}`, borderBottom: 'none',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px', borderBottom: `1px solid ${t.BORDER}`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT, display: 'flex', alignItems: 'center', gap: 7, fontFamily: DISPLAY }}>
            <User size={16} /> Профиль
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${t.BORDER}`, background: t.BG_INPUT,
              color: t.TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {!isSupabaseConfigured && (
            <div style={{
              background: t.isDark ? 'rgba(227,167,44,0.1)' : 'rgba(198,138,36,0.1)', border: `1px solid ${t.GOLD}`, borderRadius: 12,
              padding: '10px 13px', marginBottom: 14, fontSize: 12, color: t.TEXT_DIM, lineHeight: 1.5,
            }}>
              Профиль не сохранится между визитами — подключи Supabase (см. README).
            </div>
          )}
          {error && (
            <div style={{
              background: t.isDark ? 'rgba(224,138,60,0.14)' : 'rgba(188,106,40,0.12)', border: `1px solid ${t.ACCENT}`, borderRadius: 12,
              padding: '10px 13px', marginBottom: 14, fontSize: 12.5, color: t.ACCENT,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[{ v: 'male', l: 'Мужчина' }, { v: 'female', l: 'Женщина' }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => update('sex', opt.v)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: `1px solid ${form.sex === opt.v ? t.ACCENT : t.BORDER}`,
                  background: form.sex === opt.v ? (t.isDark ? 'rgba(224,138,60,0.16)' : 'rgba(188,106,40,0.12)') : 'transparent',
                  color: form.sex === opt.v ? t.ACCENT : t.TEXT_DIM,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <ProfileField label="Возраст" value={form.age} unit="лет" onChange={(v) => update('age', v)} />
            <ProfileField label="Рост" value={form.heightCm} unit="см" onChange={(v) => update('heightCm', v)} />
            <ProfileField label="Вес" value={form.weightKg} unit="кг" onChange={(v) => update('weightKg', v)} step={0.1} />
          </div>

          <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8, marginTop: 8, fontFamily: MONO }}>
            Активность
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {ACTIVITY_LEVELS.map((lvl) => {
              const active = form.activity === lvl.value;
              return (
                <button
                  key={lvl.value}
                  onClick={() => update('activity', lvl.value)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 13px', borderRadius: 10, textAlign: 'left',
                    border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                    background: active ? (t.isDark ? 'rgba(224,138,60,0.12)' : 'rgba(188,106,40,0.10)') : t.BG_RAISED,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? t.ACCENT : t.TEXT }}>{lvl.label}</span>
                  <span style={{ fontSize: 11.5, color: t.TEXT_FAINT }}>{lvl.desc}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8, fontFamily: MONO }}>
            Цель
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {GOALS.map((g) => {
              const active = form.goal === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => update('goal', g.value)}
                  style={{
                    flex: '1 1 auto', padding: '9px 12px', borderRadius: 10,
                    border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                    background: active ? (t.isDark ? 'rgba(224,138,60,0.16)' : 'rgba(188,106,40,0.12)') : 'transparent',
                    color: active ? t.ACCENT : t.TEXT_DIM,
                    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>

          <div style={{
            background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 16, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10, fontFamily: MONO }}>
              Расчётная норма на день
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.TEXT, marginBottom: 10, fontFamily: DISPLAY }}>
              {macros.targetKcal} ккал
            </div>
            <MacroPlate protein={macros.proteinG} fat={macros.fatG} carbs={macros.carbsG} compact />
            <div style={{ fontSize: 11.5, color: t.TEXT_FAINT, marginTop: 10, lineHeight: 1.5, fontFamily: MONO }}>
              Базовый обмен (BMR): {macros.bmr} ккал · С учётом активности (TDEE): {macros.tdee} ккал
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              backgroundImage: t.ACCENT_GRAD, color: '#FFF', fontSize: 14.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 8px 22px -8px ${t.GLOW}`,
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value, unit, onChange, step = 1 }) {
  const t = useTheme();
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: MONO }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, background: t.BG_INPUT,
        border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '8px 10px',
      }}>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: '100%', border: 'none', background: 'transparent', color: t.TEXT,
            fontSize: 15, fontWeight: 700, fontFamily: DISPLAY, outline: 'none',
          }}
        />
        <span style={{ fontSize: 11.5, color: t.TEXT_FAINT, flexShrink: 0, fontFamily: MONO }}>{unit}</span>
      </div>
    </div>
  );
}

function NutritionAppInner({ mode, isDark, cycle, usingTg }) {
  const t = useTheme();
  const TAB_ORDER = ['recipes', 'plan', 'shopping'];
  const [tab, setTab] = useState('plan');
  const [slideDir, setSlideDir] = useState(0);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const touchRef = React.useRef({ x: 0, y: 0, active: false });

  useTelegramTheme();

  const goToTab = (nextTab) => {
    if (nextTab === tab) return;
    const fromIdx = TAB_ORDER.indexOf(tab);
    const toIdx = TAB_ORDER.indexOf(nextTab);
    setSlideDir(toIdx > fromIdx ? 1 : -1);
    setTab(nextTab);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, active: true };
  };

  const handleTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = TAB_ORDER.indexOf(tab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      goToTab(TAB_ORDER[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      goToTab(TAB_ORDER[idx - 1]);
    }
  };

  const titles = { recipes: 'Рецепты', plan: 'План недели', shopping: 'Покупки' };

  return (
    <div className="content-fade-in" style={{
      background: t.BG, minHeight: '100vh', width: '100%',
      padding: '24px max(18px, env(safe-area-inset-right)) calc(96px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))',
      fontFamily: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
      maxWidth: 480, margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden',
      transition: 'background-color 0.4s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * {
          transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, fill 0.4s ease, stroke 0.4s ease;
        }
        @keyframes slideInRight {
          from { transform: translateX(24px); opacity: 0.4; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-24px); opacity: 0.4; }
          to { transform: translateX(0); opacity: 1; }
        }
        .slide-in-right { animation: slideInRight 0.22s ease-out; }
        .slide-in-left { animation: slideInLeft 0.22s ease-out; }
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .content-fade-in { animation: contentFadeIn 0.35s ease-out; }
        @keyframes recipeDetailEnter {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .recipe-detail-enter { animation: recipeDetailEnter 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes sheetEnter {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .sheet-enter { animation: sheetEnter 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .overlay-fade-in { animation: overlayFadeIn 0.25s ease-out; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 22 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10.5, color: t.TEXT_FAINT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 4 }}>
            Дневник питания
          </div>
          <h1 style={{
            fontSize: 23, fontWeight: 700, color: t.TEXT, margin: 0, letterSpacing: '-0.01em',
            fontFamily: DISPLAY,
          }}>
            {titles[tab]}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setProfileOpen(true)}
            aria-label="Профиль"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.BORDER}`,
              background: t.BG_INPUT, color: t.ACCENT, cursor: 'pointer',
            }}
          >
            <User size={16} />
          </button>
          <ThemeToggle mode={mode} isDark={isDark} cycle={cycle} usingTg={usingTg} />
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        key={tab}
        className={slideDir === 1 ? 'slide-in-right' : slideDir === -1 ? 'slide-in-left' : ''}
        style={{ touchAction: 'pan-y' }}
      >
        {tab === 'recipes' && <RecipesTab onOpenRecipe={setOpenRecipe} />}
        {tab === 'plan' && <PlanTab onOpenRecipe={setOpenRecipe} />}
        {tab === 'shopping' && <ShoppingTab />}
      </div>

      <BottomNav tab={tab} goToTab={goToTab} />

      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

export default function NutritionApp() {
  const { theme, mode, isDark, usingTg, cycle } = useThemeController();
  return (
    <ThemeContext.Provider value={theme}>
      <NutritionAppInner mode={mode} isDark={isDark} cycle={cycle} usingTg={usingTg} />
    </ThemeContext.Provider>
  );
}
