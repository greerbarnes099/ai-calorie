"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NutritionResult = {
  name: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
};

type DailyMeal = {
  id: number;
  created_at: string;
  meal_description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const DAILY_GOALS = {
  calories: 2000,
  protein: 120,
  fat: 70,
  carbs: 250,
};

const getProgress = (value: number, goal: number) => Math.min((value / goal) * 100, 100);

export default function Home() {
  const [mealInput, setMealInput] = useState("");
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dailyMeals, setDailyMeals] = useState<DailyMeal[]>([]);
  const [dailyStatsError, setDailyStatsError] = useState("");
  const [dailyStatsLoading, setDailyStatsLoading] = useState(true);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [dailyProtein, setDailyProtein] = useState(0);
  const [dailyFat, setDailyFat] = useState(0);
  const [dailyCarbs, setDailyCarbs] = useState(0);

  const fetchDailyStats = async () => {
    try {
      setDailyStatsLoading(true);
      setDailyStatsError("");
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const { data, error } = await supabase
        .from("meals")
        .select("id, created_at, meal_description, calories, protein, fat, carbs")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase daily stats client fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setDailyStatsError("Не вдалося завантажити статистику.");
        setDailyMeals([]);
        setDailyCalories(0);
        setDailyProtein(0);
        setDailyFat(0);
        setDailyCarbs(0);
        return;
      }

      const meals = (data ?? []) as DailyMeal[];
      setDailyMeals(meals);

      const totals = meals.reduce(
        (acc, item) => {
          acc.calories += Number(item.calories ?? 0);
          acc.protein += Number(item.protein ?? 0);
          acc.fat += Number(item.fat ?? 0);
          acc.carbs += Number(item.carbs ?? 0);
          return acc;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      );

      setDailyCalories(totals.calories);
      setDailyProtein(totals.protein);
      setDailyFat(totals.fat);
      setDailyCarbs(totals.carbs);
    } catch (fetchError) {
      console.error("Client daily stats unexpected error:", fetchError);
      setDailyStatsError("Не вдалося завантажити статистику.");
      setDailyMeals([]);
      setDailyCalories(0);
      setDailyProtein(0);
      setDailyFat(0);
      setDailyCarbs(0);
    } finally {
      setDailyStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyStats();
  }, []);

  const handleAnalyze = async () => {
    if (!mealInput.trim()) return;
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal: mealInput }),
      });

      const data = (await response.json()) as {
        items?: NutritionResult[];
        error?: string;
      };

      if (!response.ok) {
        setResults([]);
        setError(data.error ?? "Помилка аналізу.");
        return;
      }

      const apiResults = Array.isArray(data.items) ? data.items : [];
      setResults(apiResults);
      await fetchDailyStats();
    } catch {
      setResults([]);
      setError("Не вдалося зв'язатися з сервером. Перевір підключення.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-emerald-100 backdrop-blur sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              AI Calories
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              Підрахунок калорій та БЖВ
            </h1>
            <p className="text-slate-600">
              Введи, що ти з&apos;їв, і натисни <strong>Аналізувати</strong>. Дані
              будуть пораховані через OpenAI API.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={mealInput}
              onChange={(event) => setMealInput(event.target.value)}
              placeholder="Наприклад: омлет із 2 яєць, тост і кава"
              className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none ring-emerald-200 transition focus:border-emerald-400 focus:ring-4"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {isLoading ? "Аналіз..." : "Аналізувати"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500">
              Тут з&apos;являться результати аналізу калорій та БЖВ.
            </div>
          ) : (
            results.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-white/60 bg-white p-5 shadow-md shadow-slate-100"
              >
                <h2 className="mb-4 text-lg font-semibold text-slate-800">{item.name}</h2>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-slate-600">Калорії</span>
                    <span className="font-bold text-emerald-700">{item.calories} ккал</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                    <span className="text-slate-600">Білки</span>
                    <span className="font-semibold text-sky-700">{item.protein} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-slate-600">Жири</span>
                    <span className="font-semibold text-amber-700">{item.fats} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
                    <span className="text-slate-600">Вуглеводи</span>
                    <span className="font-semibold text-violet-700">{item.carbs} г</span>
                  </p>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-sky-100 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Мій прогрес за сьогодні</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {dailyMeals.length} запис(ів)
            </span>
          </div>

          {dailyStatsLoading ? (
            <div className="flex items-center justify-center gap-3 py-8 text-slate-600">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
              <span className="text-sm font-medium">Завантаження прогресу...</span>
            </div>
          ) : null}

          {dailyStatsError ? <p className="mb-4 text-sm font-medium text-rose-600">{dailyStatsError}</p> : null}

          <div className={`space-y-4 ${dailyStatsLoading ? "opacity-40" : ""}`}>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Калорії</span>
                <span className="text-slate-600">
                  {dailyCalories} / {DAILY_GOALS.calories} ккал
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${getProgress(dailyCalories, DAILY_GOALS.calories)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Білки</span>
                <span className="text-slate-600">
                  {dailyProtein} / {DAILY_GOALS.protein} г
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${getProgress(dailyProtein, DAILY_GOALS.protein)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Жири</span>
                <span className="text-slate-600">
                  {dailyFat} / {DAILY_GOALS.fat} г
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${getProgress(dailyFat, DAILY_GOALS.fat)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Вуглеводи</span>
                <span className="text-slate-600">
                  {dailyCarbs} / {DAILY_GOALS.carbs} г
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${getProgress(dailyCarbs, DAILY_GOALS.carbs)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
