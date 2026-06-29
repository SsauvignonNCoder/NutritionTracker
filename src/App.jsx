import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import {
  BookOpen, CalendarDays, ShoppingCart, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Sun, Moon, X, ExternalLink, Pencil, RotateCcw,
} from 'lucide-react';
import { RECIPES, RECIPES_BY_ID, MEAL_TYPES, CATEGORIES } from './data/recipes.js';
import { WEEKS, getLatestWeek } from './data/weeks.js';
import { buildShoppingList } from './lib/shoppingList.js';
import { useMealOverrides } from './lib/useMealOverrides.js';

// ---------- Тема ----------
const THEMES = {
  dark: {
    ACCENT: '#A8334C', ACCENT_SOFT: '#C4566E', HERB: '#8AA06B', GOLD: '#CC9F3D',
    BG: '#1C1714', BG_RAISED: '#262019', BG_INPUT: '#2D2620', BORDER: '#3D3127',
    TEXT: '#EDE6DB', TEXT_DIM: '#A89C8C', TEXT_FAINT: '#766A5C',
  },
  light: {
    ACCENT: '#A8334C', ACCENT_SOFT: '#8C2A3F', HERB: '#5C7048', GOLD: '#9C7A1F',
    BG: '#FBF6EE', BG_RAISED: '#FFFFFF', BG_INPUT: '#F2E9DA', BORDER: '#E0D2BA',
    TEXT: '#2A2218', TEXT_DIM: '#5C5040', TEXT_FAINT: '#80735E',
  },
};

const isNightNow = () => {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
};

const ThemeContext = createContext(THEMES.dark);
const useTheme = () => useContext(ThemeContext);

function useThemeController() {
  const [mode, setMode] = useState('auto');
  const [autoIsDark, setAutoIsDark] = useState(isNightNow());

  useEffect(() => {
    const id = setInterval(() => setAutoIsDark(isNightNow()), 60000);
    return () => clearInterval(id);
  }, []);

  const isDark = mode === 'auto' ? autoIsDark : mode === 'dark';
  const theme = isDark ? THEMES.dark : THEMES.light;
  const cycle = () => setMode((m) => (m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto'));

  return { theme, mode, isDark, cycle };
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

function ThemeToggle({ mode, isDark, cycle }) {
  const t = useTheme();
  const title = mode === 'auto' ? (isDark ? 'Авто · ночь' : 'Авто · день') : (isDark ? 'Тёмная' : 'Светлая');
  return (
    <button
      onClick={cycle}
      aria-label="Переключить тему"
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.BORDER}`,
        background: t.BG_INPUT, color: t.TEXT_DIM, cursor: 'pointer', position: 'relative',
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

function NavPill({ children, active, onClick, icon: Icon }) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 8px', borderRadius: 10, flex: active ? 1.6 : 0.7, minWidth: 0,
        border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
        background: active ? 'rgba(168,51,76,0.16)' : 'transparent',
        color: active ? t.ACCENT_SOFT : t.TEXT_DIM,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'flex 0.25s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
        fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {Icon && <Icon size={active ? 14 : 17} strokeWidth={2.2} style={{ flexShrink: 0, transition: 'all 0.2s ease' }} />}
      {active && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>}
    </button>
  );
}

// Сигнатурный элемент: "тарелка" БЖУ — три полоски-порции вместо голых чисел.
function MacroPlate({ protein, fat, carbs, kcal, compact }) {
  const t = useTheme();
  const total = protein + fat + carbs || 1;
  const segs = [
    { key: 'protein', label: 'Б', value: protein, color: t.ACCENT },
    { key: 'fat', label: 'Ж', value: fat, color: t.GOLD },
    { key: 'carbs', label: 'У', value: carbs, color: t.HERB },
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
          <span style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 800, color: t.TEXT, fontFamily: "'SF Mono', 'Roboto Mono', monospace" }}>
            {kcal} ккал
          </span>
        )}
      </div>
    </div>
  );
}

function MealTypeBadge({ mealType }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  if (!meta) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
      color: t.TEXT_DIM, background: t.BG_INPUT, border: `1px solid ${t.BORDER}`,
      padding: '3px 9px', borderRadius: 7, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      <span>{meta.icon}</span>{meta.label}
    </span>
  );
}

// ---------- Карточка рецепта (список) ----------

function RecipeCard({ recipe, onOpen }) {
  const t = useTheme();
  return (
    <button
      onClick={() => onOpen(recipe)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 14,
        padding: 16, fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 16.5, fontWeight: 700, color: t.TEXT, marginBottom: 6, lineHeight: 1.25,
            fontFamily: "'Fraunces', Georgia, serif",
          }}>
            {recipe.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.TEXT_FAINT, fontSize: 12.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> {recipe.totalTime} мин
            </span>
          </div>
        </div>
      </div>
      <MacroPlate protein={recipe.protein} fat={recipe.fat} carbs={recipe.carbs} kcal={recipe.kcal} compact />
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
    // Свайп для закрытия работает только если страница не проскроллена —
    // иначе обычный скролл вверх внутри рецепта закрывал бы экран случайно.
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
            padding: '8px 14px 8px 10px', borderRadius: 10, border: `1px solid ${t.BORDER}`,
            background: t.BG_INPUT, color: t.TEXT, cursor: 'pointer', flexShrink: 0,
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
          fontSize: 25, fontWeight: 700, color: t.TEXT, margin: '0 0 14px', lineHeight: 1.2,
          fontFamily: "'Fraunces', Georgia, serif",
        }}>
          {recipe.title}
        </h1>

        <div style={{
          background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 13, padding: 16, marginBottom: 16,
        }}>
          <MacroPlate protein={recipe.protein} fat={recipe.fat} carbs={recipe.carbs} kcal={recipe.kcal} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <div style={{
            flex: 1, background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 11,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10.5, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
              Активное время
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT }}>{recipe.activeTime} мин</div>
          </div>
          <div style={{
            flex: 1, background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 11,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10.5, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
              Общее время
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT }}>{recipe.totalTime} мин</div>
          </div>
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
              <span style={{ color: t.TEXT_DIM, fontFamily: "'SF Mono', monospace", fontSize: 13, flexShrink: 0 }}>{ing.display}</span>
            </div>
          ))}
        </div>

        <SectionLabel>Способ приготовления</SectionLabel>
        <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: t.BG_INPUT,
                border: `1px solid ${t.BORDER}`, color: t.ACCENT_SOFT, fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
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
              display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: t.ACCENT_SOFT,
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
          background: 'rgba(204,159,61,0.1)', border: `1px solid ${t.GOLD}`, borderRadius: 12,
          padding: 14,
        }}>
          <div style={{ fontSize: 11.5, color: t.GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
            Совет тренера
          </div>
          <p style={{ fontSize: 13.5, color: t.TEXT_DIM, lineHeight: 1.55, margin: 0 }}>{recipe.tip}</p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  const t = useTheme();
  return (
    <div style={{
      fontSize: 12, color: t.TEXT_FAINT, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', marginBottom: 10,
    }}>
      {children}
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
          flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.BORDER}`,
          background: t.BG_INPUT, color: idx <= 0 ? t.TEXT_FAINT : t.TEXT_DIM,
          cursor: idx <= 0 ? 'default' : 'pointer', opacity: idx <= 0 ? 0.4 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronLeft size={17} />
      </button>
      <div style={{
        flex: 1, textAlign: 'center', fontSize: 14.5, fontWeight: 700, color: t.TEXT,
        background: t.BG_INPUT, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '9px 0',
      }}>
        {weeks[idx]?.label}
      </div>
      <button
        onClick={() => idx < weeks.length - 1 && onChange(weeks[idx + 1].id)}
        disabled={idx >= weeks.length - 1}
        style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.BORDER}`,
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

function DayMealRow({ mealType, recipeId, customLabel, note, onOpenRecipe, isOverridden, onEdit }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  const recipe = recipeId ? RECIPES_BY_ID[recipeId] : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '10px 2px', borderBottom: `1px solid ${t.BORDER}`,
    }}>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {meta.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {meta.label}
            {isOverridden && (
              <span style={{ color: t.ACCENT_SOFT, fontSize: 10, fontWeight: 700, background: 'rgba(168,51,76,0.14)', padding: '1px 6px', borderRadius: 4, textTransform: 'none' }}>
                заменено
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: t.TEXT, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.BORDER}`,
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

  // Применяем override поверх дефолтного блюда из плана, если он есть
  const resolveMeal = (mealType, defaultRecipeId, extra = {}) => {
    const overridden = hasOverride(dayIndex, mealType);
    const recipeId = overridden ? getOverride(dayIndex, mealType) : defaultRecipeId;
    return { mealType, recipeId, isOverridden: overridden, ...extra };
  };

  const meals = [
    resolveMeal('breakfast', day.breakfast, { customLabel: day.breakfastCustom }),
    resolveMeal('lunch', day.lunch, { note: day.lunchNote }),
    resolveMeal('pretrain', day.pretrain),
    resolveMeal('dinner', day.dinner),
    ...(day.snack ? [resolveMeal('snack', day.snack)] : []),
  ];

  return (
    <div style={{
      background: t.BG_RAISED, border: `1px solid ${isToday ? t.ACCENT : t.BORDER}`, borderRadius: 13,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: '#FFF',
            background: isToday ? t.ACCENT : t.TEXT_FAINT, padding: '4px 9px', borderRadius: 7,
          }}>
            {day.day}
          </span>
          <span style={{ fontSize: 13.5, color: t.TEXT_DIM, fontWeight: 600 }}>{day.date}</span>
          {isToday && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: t.ACCENT_SOFT, background: 'rgba(168,51,76,0.14)', padding: '2px 7px', borderRadius: 5 }}>
              сегодня
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.TEXT, fontFamily: "'SF Mono', monospace" }}>
            ~{day.kcal} ккал
          </span>
          <ChevronDown size={16} style={{ color: t.TEXT_FAINT, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 6px' }}>
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

function RecipePicker({ mealType, currentRecipeId, hasOverride, onPick, onResetToDefault, onClose }) {
  const t = useTheme();
  const meta = MEAL_TYPES[mealType];
  const isSnack = mealType === 'snack';
  // Доп. перекус (snack) не привязан к конкретному типу блюда — можно выбрать что угодно из каталога
  const options = useMemo(
    () => (isSnack ? RECIPES : RECIPES.filter((r) => r.mealType === mealType)),
    [mealType, isSnack]
  );
  // При выборе из всего каталога группируем по исходному типу блюда для удобной навигации
  const groups = useMemo(() => {
    if (!isSnack) return [{ key: mealType, label: null, items: options }];
    const byType = {};
    options.forEach((r) => {
      if (!byType[r.mealType]) byType[r.mealType] = [];
      byType[r.mealType].push(r);
    });
    return Object.entries(MEAL_TYPES)
      .filter(([key]) => byType[key])
      .map(([key, m]) => ({ key, label: `${m.icon} ${m.label}`, items: byType[key] }));
  }, [options, isSnack, mealType]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
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
          <div style={{ fontSize: 15, fontWeight: 700, color: t.TEXT, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>{meta.icon}</span> Заменить {meta.label.toLowerCase()}
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
                <div style={{ fontSize: 12, color: t.TEXT_FAINT, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
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
                        width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 11,
                        border: `1px solid ${isCurrent ? t.ACCENT : t.BORDER}`,
                        background: isCurrent ? 'rgba(168,51,76,0.12)' : t.BG_RAISED,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? t.ACCENT_SOFT : t.TEXT, marginBottom: 2 }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: t.TEXT_FAINT }}>
                          {r.kcal} ккал · Б{r.protein} Ж{r.fat} У{r.carbs}
                        </div>
                      </div>
                      {isCurrent && <span style={{ color: t.ACCENT_SOFT, fontSize: 16, flexShrink: 0 }}>✓</span>}
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
  const { loaded, error, getOverride, hasOverride, setOverride, isSupabaseConfigured } = useMealOverrides(week?.id);
  const [editingMeal, setEditingMeal] = useState(null); // { dayIndex, mealType, currentRecipeId }

  if (!week) {
    return <div style={{ color: t.TEXT_FAINT, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>Пока нет планов на неделю.</div>;
  }

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

      <p style={{ fontSize: 12.5, color: t.TEXT_FAINT, lineHeight: 1.5, marginBottom: 14 }}>
        {week.note}
      </p>

      {!isSupabaseConfigured && (
        <div style={{
          background: 'rgba(204,159,61,0.1)', border: `1px solid ${t.GOLD}`, borderRadius: 10,
          padding: '10px 13px', marginBottom: 14, fontSize: 12, color: t.TEXT_DIM, lineHeight: 1.5,
        }}>
          Замены блюд работают, но не сохраняются между визитами — подключи Supabase (см. README), чтобы план запоминался навсегда.
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(168,51,76,0.14)', border: `1px solid ${t.ACCENT}`, borderRadius: 10,
          padding: '10px 13px', marginBottom: 14, fontSize: 12.5, color: t.ACCENT_SOFT,
        }}>
          {error}
        </div>
      )}

      {week.weekOfTheWeek && (
        <div style={{
          background: 'rgba(138,160,107,0.1)', border: `1px solid ${t.HERB}`, borderRadius: 12,
          padding: 14, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: t.HERB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
            Новое блюдо недели
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.TEXT, marginBottom: 4 }}>{week.weekOfTheWeek.title}</div>
          <div style={{ fontSize: 13, color: t.TEXT_DIM, lineHeight: 1.5 }}>{week.weekOfTheWeek.desc}</div>
        </div>
      )}

      {week.logic && (
        <div style={{
          background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 12, padding: 14, marginBottom: 22,
        }}>
          <div style={{ fontSize: 11, color: t.TEXT_FAINT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
            Логика недели
          </div>
          <div style={{ fontSize: 13, color: t.TEXT_DIM, lineHeight: 1.5 }}>{week.logic}</div>
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
            defaultOpen={i === 0}
            getOverride={getOverride}
            hasOverride={hasOverride}
            onEditMeal={handleEditMeal}
          />
        ))}
      </div>

      {week.supplements && (
        <>
          <SectionLabel>БАДы</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {week.supplements.map((s) => (
              <div key={s.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: t.BG_RAISED, border: `1px solid ${t.BORDER}`, borderRadius: 10,
                padding: '10px 14px',
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: t.TEXT }}>{s.name}</span>
                <span style={{ fontSize: 12.5, color: t.TEXT_DIM }}>{s.timing}</span>
              </div>
            ))}
          </div>
        </>
      )}

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

  const filterOptions = [
    { key: 'all', label: 'Все' },
    ...Object.entries(MEAL_TYPES)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, meta]) => ({ key, label: meta.label, icon: meta.icon })),
  ];

  return (
    <div>
      <div style={{
        display: 'flex', gap: 7, marginBottom: 18, overflowX: 'auto', paddingBottom: 2,
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        {filterOptions.map((opt) => {
          const active = filter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 13px', borderRadius: 10,
                border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? 'rgba(168,51,76,0.16)' : 'transparent',
                color: active ? t.ACCENT_SOFT : t.TEXT_DIM,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.icon && <span>{opt.icon}</span>}{opt.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r) => (
          <RecipeCard key={r.id} recipe={r} onOpen={onOpenRecipe} />
        ))}
      </div>
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
      <div style={{ fontSize: 11.5, color: t.TEXT_FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8 }}>
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
                flex: 1, padding: '9px 0', borderRadius: 9,
                border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? 'rgba(168,51,76,0.16)' : 'transparent',
                color: active ? t.ACCENT_SOFT : t.TEXT_DIM,
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
  const totalFresh = shoppingList.fresh.reduce((s, g) => s + g.items.length, 0);

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

          {totalFresh > 0 && (
            <>
              <div style={{ height: 1, background: t.BORDER, margin: '4px 0 22px' }} />
              <SectionLabel>Докупать свежим в течение недели</SectionLabel>
              <p style={{ fontSize: 12, color: t.TEXT_FAINT, marginTop: -4, marginBottom: 14 }}>
                Срок хранения 2–4 дня — лучше брать ближе к делу, а не сразу на неделю
              </p>
              {shoppingList.fresh.map((g) => (
                <ShoppingGroup key={g.key} title={g.title} items={g.items} checkedMap={checkedMap} onToggle={toggleItem} onToggleAll={toggleAllInGroup} />
              ))}
            </>
          )}

          <p style={{ fontSize: 12, color: t.TEXT_FAINT, textAlign: 'center', marginTop: 8 }}>
            Количества — точные суммы по рецептам{multiplier !== 1 ? ` (×${multiplier})` : ''}, подгоняй на глаз под упаковки в магазине.
          </p>
        </>
      )}
    </div>
  );
}

// ---------- Корневое приложение ----------

function NutritionAppInner({ mode, isDark, cycle }) {
  const t = useTheme();
  const TAB_ORDER = ['recipes', 'plan', 'shopping'];
  const [tab, setTab] = useState('plan');
  const [slideDir, setSlideDir] = useState(0);
  const [openRecipe, setOpenRecipe] = useState(null);
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

  return (
    <div className="content-fade-in" style={{
      background: t.BG, minHeight: '100vh', width: '100%',
      padding: '24px max(18px, env(safe-area-inset-right)) 40px max(18px, env(safe-area-inset-left))',
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      maxWidth: 480, margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden',
      transition: 'background-color 0.4s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap');
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
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 22 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: t.TEXT, margin: 0, letterSpacing: '-0.01em',
            fontFamily: "'Fraunces', Georgia, serif",
          }}>
            Грузинская кухня
          </h1>
          <p style={{ fontSize: 13, color: t.TEXT_FAINT, margin: '4px 0 0' }}>
            Рецепты, план недели и покупки
          </p>
        </div>
        <ThemeToggle mode={mode} isDark={isDark} cycle={cycle} />
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 24, width: '100%', minWidth: 0 }}>
        <NavPill active={tab === 'recipes'} onClick={() => goToTab('recipes')} icon={BookOpen}>Рецепты</NavPill>
        <NavPill active={tab === 'plan'} onClick={() => goToTab('plan')} icon={CalendarDays}>План недели</NavPill>
        <NavPill active={tab === 'shopping'} onClick={() => goToTab('shopping')} icon={ShoppingCart}>Покупки</NavPill>
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

      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </div>
  );
}

export default function NutritionApp() {
  const { theme, mode, isDark, cycle } = useThemeController();
  return (
    <ThemeContext.Provider value={theme}>
      <NutritionAppInner mode={mode} isDark={isDark} cycle={cycle} />
    </ThemeContext.Provider>
  );
}
