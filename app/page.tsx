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

type UserProfile = {
  id: number;
  name: string;
  calorie_goal: number;
};

const DAILY_GOALS = {
  calories: 2000,
  protein: 120,
  fat: 70,
  carbs: 250,
};
const WATER_GLASS_ML = 250;
const WATER_GOAL_ML = 2000;
const WATER_GLASSES_GOAL = WATER_GOAL_ML / WATER_GLASS_ML;

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
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [dailyWaterMl, setDailyWaterMl] = useState(0);
  const [isAddingWater, setIsAddingWater] = useState(false);

  const resetDailyStats = useCallback(() => {
    setDailyMeals([]);
    setDailyCalories(0);
    setDailyProtein(0);
    setDailyFat(0);
    setDailyCarbs(0);
    setDailyWaterMl(0);
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
      const waterEntries = meals.filter((item) => item.meal_description === "Water");
      setDailyWaterMl(waterEntries.length * WATER_GLASS_ML);

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

  const fetchProfiles = useCallback(async () => {
    try {
      setIsProfilesLoading(true);
      setProfilesError("");
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, name, calorie_goal")
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase profiles fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setProfilesError("Не вдалося завантажити профілі.");
        setProfiles([]);
        return;
      }

      setProfiles((data ?? []) as UserProfile[]);
    } catch (fetchError) {
      console.error("Unexpected profiles fetch error:", fetchError);
      setProfilesError("Не вдалося завантажити профілі.");
      setProfiles([]);
    } finally {
      setIsProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() ?? "";
    fetchProfiles();

    if (savedName) {
      setUserName(savedName);
      setProfileNameInput(savedName);
      fetchDailyStats(savedName);
      return;
    }

    setDailyStatsLoading(false);
  }, [fetchDailyStats, fetchProfiles]);

  const handleAnalyze = async () => {
    if (!mealInput.trim()) return;
    if (!userName.trim()) {
      setError("Спочатку обери профіль.");
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

  const handleSaveProfile = async () => {
    const trimmedName = profileNameInput.trim();
    if (!trimmedName) {
      setError("Введи ім'я профілю.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfilesError("");
      const { error: insertError } = await supabase.from("user_profiles").insert({
        name: trimmedName,
        calorie_goal: 2000,
      });

      if (insertError) {
        console.error("Supabase profile insert error:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        setProfilesError("Не вдалося створити профіль.");
        return;
      }
    } catch (saveError) {
      console.error("Unexpected profile insert error:", saveError);
      setProfilesError("Не вдалося створити профіль.");
      return;
    } finally {
      setIsSavingProfile(false);
    }

    localStorage.setItem(USER_NAME_STORAGE_KEY, trimmedName);
    setUserName(trimmedName);
    setIsCreatingProfile(false);
    setError("");
    await fetchProfiles();
    await fetchDailyStats(trimmedName);
  };

  const handleSelectProfile = async (selectedName: string) => {
    localStorage.setItem(USER_NAME_STORAGE_KEY, selectedName);
    setUserName(selectedName);
    setProfileNameInput(selectedName);
    setIsCreatingProfile(false);
    setError("");
    await fetchDailyStats(selectedName);
  };

  const handleLogoutProfile = async () => {
    localStorage.removeItem(USER_NAME_STORAGE_KEY);
    setUserName("");
    setMealInput("");
    setResults([]);
    resetDailyStats();
    setIsCreatingProfile(false);
    await fetchProfiles();
  };

  const handleAddWater = async () => {
    if (!userName.trim()) {
      setError("Спочатку обери профіль.");
      return;
    }

    try {
      setIsAddingWater(true);
      setDailyStatsError("");
      const { error: insertError } = await supabase.from("meals").insert({
        meal_description: "Water",
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        user_name: userName,
      });

      if (insertError) {
        console.error("Supabase water insert error:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        setDailyStatsError("Не вдалося додати воду. Спробуй ще раз.");
        return;
      }

      await fetchDailyStats(userName);
    } catch (waterError) {
      console.error("Unexpected water insert error:", waterError);
      setDailyStatsError("Не вдалося додати воду. Спробуй ще раз.");
    } finally {
      setIsAddingWater(false);
    }
  };

  if (!userName.trim()) {
    return (
      <main className="min-h-screen bg-[#f8faf8] px-4 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[85vh] w-full max-w-3xl items-center justify-center">
          <section className="w-full rounded-2xl border border-white/80 bg-white/80 p-8 text-center shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.92)] backdrop-blur-xl transition-all duration-500">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              AI Calories
            </p>
            <h1 className="mb-2 text-4xl font-bold text-slate-900 sm:text-5xl">Обери профіль</h1>
            <p className="mb-8 text-slate-600">Оберіть існуючий профіль або створіть новий.</p>

            <div className="mb-6">
              {!isCreatingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(true)}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all duration-300 hover:scale-[1.02]"
                >
                  Створити новий профіль
                </button>
              ) : (
                <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-left">
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={(event) => setProfileNameInput(event.target.value)}
                    placeholder="Введи ім'я (наприклад, Микита)"
                    className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-base outline-none ring-emerald-100 transition-all duration-300 focus:border-emerald-300 focus:ring-4"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.01] disabled:opacity-60"
                    >
                      {isSavingProfile ? "Збереження..." : "Зберегти"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProfile(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Існуючі профілі
              </p>
              {isProfilesLoading ? (
                <div className="flex items-center justify-center gap-3 py-6 text-slate-600">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                  <span className="text-sm font-medium">Завантаження профілів...</span>
                </div>
              ) : null}
              {profilesError ? (
                <p className="text-sm font-medium text-rose-600">{profilesError}</p>
              ) : null}
              {!isProfilesLoading && profiles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-slate-500">
                  Профілів поки немає. Створи перший профіль.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelectProfile(profile.name)}
                    className="rounded-2xl border border-white/80 bg-white/90 px-4 py-5 text-lg font-bold text-slate-800 shadow-[6px_6px_18px_rgba(15,23,42,0.05),-6px_-6px_18px_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-50"
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] transition-all duration-300 sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              AI Calories
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-700">Профіль: {userName}</p>
              <button
                type="button"
                onClick={handleLogoutProfile}
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
              >
                Вийти
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

        <section className="rounded-2xl border border-white/80 bg-white/70 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.92)] backdrop-blur-xl transition-all duration-300 sm:p-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-3xl font-bold text-slate-900">Водний баланс</h2>
            <p className="text-base font-bold text-slate-700">
              Випито: {(dailyWaterMl / 1000).toFixed(1)} л / {(WATER_GOAL_ML / 1000).toFixed(1)} л
            </p>
          </div>

          <p className="mb-5 text-sm text-slate-600">
            Натисни на склянку, щоб додати 250 мл води.
          </p>

          <div className="flex flex-wrap gap-3">
            {Array.from({ length: WATER_GLASSES_GOAL }).map((_, index) => {
              const filledGlasses = Math.floor(dailyWaterMl / WATER_GLASS_ML);
              const isFilled = index < filledGlasses;

              return (
                <button
                  key={`water-glass-${index}`}
                  type="button"
                  onClick={handleAddWater}
                  disabled={isAddingWater || dailyStatsLoading || !userName.trim()}
                  className={`flex h-14 w-12 items-center justify-center rounded-2xl border text-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isFilled
                      ? "border-sky-300 bg-gradient-to-b from-sky-100 to-sky-300 text-sky-700"
                      : "border-sky-100 bg-sky-50/70 text-sky-400 hover:bg-sky-100"
                  }`}
                  aria-label={`Додати воду, склянка ${index + 1}`}
                >
                  {isAddingWater ? "..." : "🥛"}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
