// Расчёт нормы КБЖУ по формуле Миффлина-Сан Жеора.
//
// BMR (базовый обмен веществ, ккал/день в полном покое):
//   мужчины: 10×вес(кг) + 6.25×рост(см) − 5×возраст + 5
//   женщины: 10×вес(кг) + 6.25×рост(см) − 5×возраст − 161
//
// TDEE (с учётом активности) = BMR × коэффициент активности
// Итоговая цель корректирует TDEE в зависимости от цели (дефицит/норма/набор).

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Минимальная', desc: 'сидячий образ жизни, без тренировок' },
  { value: 1.375, label: 'Лёгкая', desc: '1–3 тренировки в неделю' },
  { value: 1.55, label: 'Средняя', desc: '3–5 тренировок в неделю' },
  { value: 1.725, label: 'Высокая', desc: '6–7 тренировок в неделю' },
  { value: 1.9, label: 'Очень высокая', desc: 'тяжёлые тренировки + физическая работа' },
];

export const GOALS = [
  { value: 'deficit', label: 'Похудение', kcalAdjust: -0.20, proteinPerKg: 2.0 },
  { value: 'recomp', label: 'Рекомпозиция', kcalAdjust: -0.10, proteinPerKg: 2.2 },
  { value: 'maintain', label: 'Поддержание', kcalAdjust: 0, proteinPerKg: 1.8 },
  { value: 'surplus', label: 'Набор массы', kcalAdjust: 0.12, proteinPerKg: 1.8 },
];

export function calcBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

export function calcTDEE({ sex, weightKg, heightCm, age, activity }) {
  return calcBMR({ sex, weightKg, heightCm, age }) * activity;
}

// Возвращает целевые ккал и БЖУ (граммы) с учётом цели.
// Белок считается от веса тела (г/кг) — точнее, чем процент от калорий.
// Жир — минимум 0.8 г/кг для гормонального здоровья, остаток калорий — углеводы.
export function calcTargetMacros(profile) {
  const { weightKg } = profile;
  const tdee = calcTDEE(profile);
  const goal = GOALS.find((g) => g.value === profile.goal) || GOALS[1];
  const targetKcal = Math.round(tdee * (1 + goal.kcalAdjust));

  const proteinG = Math.round(weightKg * goal.proteinPerKg);
  const fatG = Math.round(weightKg * 0.9);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = Math.max(targetKcal - proteinKcal - fatKcal, 0);
  const carbsG = Math.round(carbsKcal / 4);

  return {
    bmr: Math.round(calcBMR(profile)),
    tdee: Math.round(tdee),
    targetKcal,
    proteinG,
    fatG,
    carbsG,
  };
}
