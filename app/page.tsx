"use client";

import { useCallback, useEffect, useState } from "react";
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
  user_name: string;
};

const DAILY_GOALS = {
  calories: 2000,
  protein: 120,
  fat: 70,
  carbs: 250,
};

const getProgress = (value: number, goal: number) => Math.min((value / goal) * 100, 100);
const USER_NAME_STORAGE_KEY = "ai-calories-user-name";

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
  const [userName, setUserName] = useState("");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const resetDailyStats = useCallback(() => {
    setDailyMeals([]);
    setDailyCalories(0);
    setDailyProtein(0);
    setDailyFat(0);
    setDailyCarbs(0);
  }, []);

  const fetchDailyStats = useCallback(async (selectedUserName: string) => {
    if (!selectedUserName) {
      setDailyStatsLoading(false);
      setDailyStatsError("");
      resetDailyStats();
      return;
    }

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
        .select("id, created_at, meal_description, calories, protein, fat, carbs, user_name")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString())
        .eq("user_name", selectedUserName)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase daily stats client fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setDailyStatsError("Не вдалося завантажити статистику.");
        resetDailyStats();
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
      resetDailyStats();
    } finally {
      setDailyStatsLoading(false);
    }
  }, [resetDailyStats]);

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() ?? "";
    if (savedName) {
      setUserName(savedName);
      setProfileNameInput(savedName);
      setIsEditingProfile(false);
      fetchDailyStats(savedName);
      return;
    }

    setIsEditingProfile(true);
    setDailyStatsLoading(false);
  }, [fetchDailyStats]);

  const handleAnalyze = async () => {
    if (!mealInput.trim()) return;
    if (!userName.trim()) {
      setError("Спочатку обери профіль.");
      setIsEditingProfile(true);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal: mealInput, userName }),
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
      await fetchDailyStats(userName);
    } catch {
      setResults([]);
      setError("Не вдалося зв'язатися з сервером. Перевір підключення.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = () => {
    const trimmedName = profileNameInput.trim();
    if (!trimmedName) {
      setError("Введи ім'я профілю.");
      return;
    }

    localStorage.setItem(USER_NAME_STORAGE_KEY, trimmedName);
    setUserName(trimmedName);
    setIsEditingProfile(false);
    setError("");
    fetchDailyStats(trimmedName);
  };

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] transition-all duration-300 sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              AI Calories
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-700">
                {userName ? `Привіт, ${userName}! Твій прогрес:` : "Обери профіль для початку"}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
              >
                Змінити профіль
              </button>
            </div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Підрахунок калорій та БЖВ
            </h1>
            <p className="text-slate-600 transition-colors">
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
              className="h-12 flex-1 rounded-2xl border border-slate-200/80 bg-white px-4 text-base outline-none ring-emerald-100 transition-all duration-300 focus:border-emerald-300 focus:ring-4"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading || !userName.trim()}
              className="h-12 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-[1.03] hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-emerald-200 disabled:to-emerald-300"
            >
              {isLoading ? "Аналіз..." : "Аналізувати"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </section>

        {isEditingProfile ? (
          <section className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] transition-all duration-300 sm:p-8">
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Профіль сім&apos;ї</h2>
            <p className="mb-4 text-sm text-slate-600">
              Введи ім&apos;я користувача (наприклад, Микита, Олена). Воно збережеться локально.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={profileNameInput}
                onChange={(event) => setProfileNameInput(event.target.value)}
                placeholder="Введи ім'я"
                className="h-11 flex-1 rounded-2xl border border-slate-200/80 bg-white px-4 text-base outline-none ring-emerald-100 transition-all duration-300 focus:border-emerald-300 focus:ring-4"
              />
              <button
                type="button"
                onClick={handleSaveProfile}
                className="h-11 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)] transition-all duration-300 hover:scale-[1.03] hover:from-emerald-500 hover:to-emerald-600"
              >
                Зберегти профіль
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300/80 bg-white/80 p-8 text-center text-slate-500">
              Тут з&apos;являться результати аналізу калорій та БЖВ.
            </div>
          ) : (
            results.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_28px_rgba(15,23,42,0.08),-12px_-12px_28px_rgba(255,255,255,0.95)]"
              >
                <h2 className="mb-4 text-xl font-bold text-slate-800">{item.name}</h2>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-between rounded-xl bg-emerald-100/70 px-3 py-2">
                    <span className="text-slate-600">Калорії</span>
                    <span className="text-base font-bold text-emerald-700">{item.calories} ккал</span>
                  </p>
                  <p className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                    <span className="text-slate-600">Білки</span>
                    <span className="text-base font-bold text-emerald-700">{item.protein} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-xl bg-orange-100/70 px-3 py-2">
                    <span className="text-slate-600">Жири</span>
                    <span className="text-base font-bold text-orange-700">{item.fats} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-xl bg-yellow-100/80 px-3 py-2">
                    <span className="text-slate-600">Вуглеводи</span>
                    <span className="text-base font-bold text-yellow-700">{item.carbs} г</span>
                  </p>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/55 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all duration-300 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-3xl font-bold text-slate-900">Мій прогрес за сьогодні</h2>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
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

          <div className={`space-y-5 transition-opacity duration-500 ${dailyStatsLoading ? "opacity-40" : "opacity-100"}`}>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Калорії</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyCalories} / {DAILY_GOALS.calories} ккал
                </span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-emerald-100/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-200 to-emerald-500 transition-all duration-700"
                  style={{ width: `${getProgress(dailyCalories, DAILY_GOALS.calories)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Білки</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyProtein} / {DAILY_GOALS.protein} г
                </span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-emerald-100/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-100 to-emerald-400 transition-all duration-700"
                  style={{ width: `${getProgress(dailyProtein, DAILY_GOALS.protein)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Жири</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyFat} / {DAILY_GOALS.fat} г
                </span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-orange-100/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-200 to-orange-400 transition-all duration-700"
                  style={{ width: `${getProgress(dailyFat, DAILY_GOALS.fat)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Вуглеводи</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyCarbs} / {DAILY_GOALS.carbs} г
                </span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-yellow-100/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-100 to-yellow-400 transition-all duration-700"
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
