/**
 * Цілі БЖВ у грамах з денної норми калорій:
 * білки 25%, жири 30%, вуглеводи 45% від калорій (4 / 9 / 4 ккал на г відповідно).
 */
export function computeMacroGoalsFromDailyCalories(dailyCalories: number) {
  const protein = Math.round((0.25 * dailyCalories) / 4);
  const fat = Math.round((0.3 * dailyCalories) / 9);
  const carbs = Math.round((0.45 * dailyCalories) / 4);
  return { protein, fat, carbs };
}
