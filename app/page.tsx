"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { computeMacroGoalsFromDailyCalories } from "@/lib/macro-goals";
import { getKyivDayRangeUtc } from "@/lib/kyiv-time";
import { supabase } from "@/lib/supabase";
import AvocadoLogo from "@/components/AvocadoLogo";
import FlowerIcon from "@/components/FlowerIcon";
import AnimatedCharacters from "@/components/AnimatedCharacters";
import PhotoAnalysisLoader from "@/components/PhotoAnalysisLoader";
import { compressImage, validateImageFile, formatFileSize } from "@/lib/image-utils";

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
  user_name: string;
  daily_calories: number;
  daily_water: number;
  daily_protein: number | null;
  daily_fat: number | null;
  daily_carbs: number | null;
};

const DEFAULT_DAILY_CALORIES = 2000;
const DEFAULT_DAILY_WATER_GOAL = 2000;
const WATER_GLASS_ML = 250;

const getProgress = (value: number, goal: number) => {
  if (!goal || goal <= 0) return 0;
  return Math.min((value / goal) * 100, 100);
};
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
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(DEFAULT_DAILY_CALORIES);
  const [dailyWaterGoal, setDailyWaterGoal] = useState(DEFAULT_DAILY_WATER_GOAL);
  const [dailyProteinGoal, setDailyProteinGoal] = useState(
    computeMacroGoalsFromDailyCalories(DEFAULT_DAILY_CALORIES).protein,
  );
  const [dailyFatGoal, setDailyFatGoal] = useState(
    computeMacroGoalsFromDailyCalories(DEFAULT_DAILY_CALORIES).fat,
  );
  const [dailyCarbsGoal, setDailyCarbsGoal] = useState(
    computeMacroGoalsFromDailyCalories(DEFAULT_DAILY_CALORIES).carbs,
  );
  const [userName, setUserName] = useState("");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsCaloriesInput, setSettingsCaloriesInput] = useState(String(DEFAULT_DAILY_CALORIES));
  const [settingsWaterInput, setSettingsWaterInput] = useState(String(DEFAULT_DAILY_WATER_GOAL));
  const [isUpdatingProfileSettings, setIsUpdatingProfileSettings] = useState(false);
  const [dailyWaterMl, setDailyWaterMl] = useState(0);
  const [isAddingWater, setIsAddingWater] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { start, end } = getKyivDayRangeUtc();

      const { data, error } = await supabase
        .from("meals")
        .select("id, created_at, meal_description, calories, protein, fat, carbs, user_name")
        .gte("created_at", start)
        .lt("created_at", end)
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

  const fetchProfiles = useCallback(async (activeUserName?: string) => {
    try {
      setIsProfilesLoading(true);
      setProfilesError("");
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_name, daily_calories, daily_water, daily_protein, daily_fat, daily_carbs")
        .order("user_name", { ascending: true });

      if (error) {
        console.error(error);
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

      const loadedProfiles = (data ?? []) as UserProfile[];
      setProfiles(loadedProfiles);

      const activeProfileName = activeUserName ?? userName;
      const activeProfile = loadedProfiles.find((profile) => profile.user_name === activeProfileName);
      if (activeProfile) {
        const nextCalories = Number(activeProfile.daily_calories || DEFAULT_DAILY_CALORIES);
        const nextWater = Number(activeProfile.daily_water || DEFAULT_DAILY_WATER_GOAL);
        const computed = computeMacroGoalsFromDailyCalories(nextCalories);
        const nextProtein =
          activeProfile.daily_protein != null ? Number(activeProfile.daily_protein) : computed.protein;
        const nextFat = activeProfile.daily_fat != null ? Number(activeProfile.daily_fat) : computed.fat;
        const nextCarbs =
          activeProfile.daily_carbs != null ? Number(activeProfile.daily_carbs) : computed.carbs;
        setDailyCalorieGoal(nextCalories);
        setDailyWaterGoal(nextWater);
        setDailyProteinGoal(nextProtein);
        setDailyFatGoal(nextFat);
        setDailyCarbsGoal(nextCarbs);
        setSettingsCaloriesInput(String(nextCalories));
        setSettingsWaterInput(String(nextWater));
      }
    } catch (fetchError) {
      console.error("Unexpected profiles fetch error:", fetchError);
      setProfilesError("Не вдалося завантажити профілі.");
      setProfiles([]);
    } finally {
      setIsProfilesLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() ?? "";
    fetchProfiles(savedName || undefined);

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
      const macros = computeMacroGoalsFromDailyCalories(DEFAULT_DAILY_CALORIES);
      const { error: insertError } = await supabase.from("user_profiles").insert({
        user_name: trimmedName,
        daily_calories: DEFAULT_DAILY_CALORIES,
        daily_water: 2000,
        daily_protein: macros.protein,
        daily_fat: macros.fat,
        daily_carbs: macros.carbs,
      });

      if (insertError) {
        console.error(insertError);
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
    await fetchProfiles(trimmedName);
    await fetchDailyStats(trimmedName);
  };

  const handleSelectProfile = async (selectedName: string) => {
    const selectedProfile = profiles.find((profile) => profile.user_name === selectedName);
    if (selectedProfile) {
      const nextCalories = Number(selectedProfile.daily_calories || DEFAULT_DAILY_CALORIES);
      const computed = computeMacroGoalsFromDailyCalories(nextCalories);
      setDailyCalorieGoal(nextCalories);
      setDailyWaterGoal(Number(selectedProfile.daily_water || DEFAULT_DAILY_WATER_GOAL));
      setDailyProteinGoal(
        selectedProfile.daily_protein != null ? Number(selectedProfile.daily_protein) : computed.protein,
      );
      setDailyFatGoal(selectedProfile.daily_fat != null ? Number(selectedProfile.daily_fat) : computed.fat);
      setDailyCarbsGoal(
        selectedProfile.daily_carbs != null ? Number(selectedProfile.daily_carbs) : computed.carbs,
      );
      setSettingsCaloriesInput(String(selectedProfile.daily_calories || DEFAULT_DAILY_CALORIES));
      setSettingsWaterInput(String(selectedProfile.daily_water || DEFAULT_DAILY_WATER_GOAL));
    }

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
    setDailyCalorieGoal(DEFAULT_DAILY_CALORIES);
    setDailyWaterGoal(DEFAULT_DAILY_WATER_GOAL);
    const resetMacros = computeMacroGoalsFromDailyCalories(DEFAULT_DAILY_CALORIES);
    setDailyProteinGoal(resetMacros.protein);
    setDailyFatGoal(resetMacros.fat);
    setDailyCarbsGoal(resetMacros.carbs);
    setSettingsCaloriesInput(String(DEFAULT_DAILY_CALORIES));
    setSettingsWaterInput(String(DEFAULT_DAILY_WATER_GOAL));
    setIsSettingsOpen(false);
    setIsCreatingProfile(false);
    await fetchProfiles();
  };

  const handleSaveSettings = async () => {
    if (!userName.trim()) return;

    const parsedCalories = Number(settingsCaloriesInput);
    const parsedWater = Number(settingsWaterInput);

    if (!Number.isFinite(parsedCalories) || parsedCalories <= 0) {
      setError("Вкажи коректну денну норму калорій.");
      return;
    }

    if (!Number.isFinite(parsedWater) || parsedWater <= 0) {
      setError("Вкажи коректну денну норму води в мл.");
      return;
    }

    const macroGoals = computeMacroGoalsFromDailyCalories(parsedCalories);

    try {
      setIsUpdatingProfileSettings(true);
      setError("");
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          daily_calories: parsedCalories,
          daily_water: parsedWater,
          daily_protein: macroGoals.protein,
          daily_fat: macroGoals.fat,
          daily_carbs: macroGoals.carbs,
        })
        .eq("user_name", userName);

      if (updateError) {
        console.error(updateError);
        console.error("Supabase profile update error:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        setError("Не вдалося оновити налаштування профілю.");
        return;
      }

      setDailyCalorieGoal(parsedCalories);
      setDailyWaterGoal(parsedWater);
      setDailyProteinGoal(macroGoals.protein);
      setDailyFatGoal(macroGoals.fat);
      setDailyCarbsGoal(macroGoals.carbs);
      setProfiles((prevProfiles) =>
        prevProfiles.map((profile) =>
          profile.user_name === userName
            ? {
                ...profile,
                daily_calories: parsedCalories,
                daily_water: parsedWater,
                daily_protein: macroGoals.protein,
                daily_fat: macroGoals.fat,
                daily_carbs: macroGoals.carbs,
              }
            : profile,
        ),
      );
      setIsSettingsOpen(false);
    } catch (updateError) {
      console.error(updateError);
      setError("Не вдалося оновити налаштування профілю.");
    } finally {
      setIsUpdatingProfileSettings(false);
    }
  };

  const waterGlassesGoal = Math.max(8, Math.min(10, Math.ceil(dailyWaterGoal / WATER_GLASS_ML)));

  const settingsMacroPreview = useMemo(() => {
    const c = Number(settingsCaloriesInput);
    if (!Number.isFinite(c) || c <= 0) return null;
    return computeMacroGoalsFromDailyCalories(c);
  }, [settingsCaloriesInput]);

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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Clear any previous errors
    setError("");
  };

  const handlePhotoAnalysis = async () => {
    if (!selectedImage || !userName.trim()) {
      setError("Please select an image and ensure you have a profile selected.");
      return;
    }

    try {
      setIsAnalyzingPhoto(true);
      setError("");

      // Compress image
      const compressedImage = await compressImage(selectedImage);
      console.log(`Image compressed: ${formatFileSize(selectedImage.size)} -> ${formatFileSize(compressedImage.size)}`);

      // Send to API for analysis
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          image: compressedImage.base64,
          userName 
        }),
      });

      const data = (await response.json()) as {
        items?: NutritionResult[];
        error?: string;
      };

      if (!response.ok) {
        setResults([]);
        setError(data.error || "Photo analysis failed.");
        return;
      }

      const apiResults = Array.isArray(data.items) ? data.items : [];
      setResults(apiResults);
      
      // Auto-save to database
      for (const item of apiResults) {
        const { error: insertError } = await supabase.from("meals").insert({
          meal_description: `Photo: ${item.name}`,
          calories: item.calories,
          protein: item.protein,
          fat: item.fats,
          carbs: item.carbs,
          user_name: userName,
        });

        if (insertError) {
          console.error("Failed to save photo analysis:", insertError);
        }
      }

      // Refresh daily stats
      await fetchDailyStats(userName);
      
      // Clear image selection
      setSelectedImage(null);
      setImagePreview("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Photo analysis error:", error);
      setError("Failed to analyze photo. Please try again.");
      setResults([]);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  if (!userName.trim()) {
    return (
      <main className="min-h-screen bg-[#FFF5F5] px-4 py-10 text-slate-900 relative overflow-hidden">
        {/* Background flower decorations */}
        <div className="absolute top-4 left-4 opacity-20">
          <FlowerIcon color="coral" size="large" />
        </div>
        <div className="absolute top-20 right-8 opacity-15">
          <FlowerIcon color="lemon" size="medium" />
        </div>
        <div className="absolute bottom-10 left-10 opacity-20">
          <FlowerIcon color="blue" size="large" />
        </div>
        
        <div className="min-h-screen grid lg:grid-cols-2">
          {/* Left Side - Animated Characters */}
          <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#FF7F50]/10 via-[#A7F3D0]/5 to-[#FFF44F]/10 p-12">
            <div className="relative z-20">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <div className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AvocadoLogo size="small" animated={true} />
                </div>
                <span className="font-['Geist,sans-serif']">AI Calories</span>
              </div>
            </div>

            <div className="relative z-20 flex items-center justify-center h-[500px]">
              <AnimatedCharacters 
                isCreatingProfile={isCreatingProfile} 
                profilesCount={profiles.length} 
              />
            </div>

            <div className="relative z-20 flex items-center gap-8 text-sm text-slate-600">
              <a href="#" className="hover:text-slate-800 transition-colors font-['Geist,sans-serif']">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-slate-800 transition-colors font-['Geist,sans-serif']">
                Terms of Service
              </a>
              <a href="#" className="hover:text-slate-800 transition-colors font-['Geist,sans-serif']">
                Contact
              </a>
            </div>

            {/* Decorative elements */}
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="absolute top-1/4 right-1/4 size-64 bg-[#FF7F50]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 size-96 bg-[#A7F3D0]/5 rounded-full blur-3xl" />
          </div>

          {/* Right Side - Profile Selection */}
          <div className="flex items-center justify-center p-8">
            <div className="w-full max-w-[420px]">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
                <div className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AvocadoLogo size="small" animated={true} />
                </div>
                <span className="font-['Geist,sans-serif']">AI Calories</span>
              </div>

              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2 font-['Geist,sans-serif'] text-slate-900">Welcome back!</h1>
                <p className="text-slate-600 font-['Inter,sans-serif']">Choose your profile or create a new one</p>
              </div>

              {/* Profile List */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 font-['Geist,sans-serif']">
                  Existing Profiles
                </p>
                {isProfilesLoading ? (
                  <div className="flex items-center justify-center gap-3 py-6 text-slate-600">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#FF7F50]" />
                    <span className="text-sm font-medium font-['Inter,sans-serif']">Loading profiles...</span>
                  </div>
                ) : null}
                {profilesError ? (
                  <p className="text-sm font-medium text-rose-600 font-['Inter,sans-serif']">{profilesError}</p>
                ) : null}
                {!isProfilesLoading && profiles.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-slate-500 font-['Inter,sans-serif']">
                    No profiles yet. Create your first profile.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-1">
                  {profiles.map((profile) => (
                    <button
                      key={profile.user_name}
                      type="button"
                      onClick={() => handleSelectProfile(profile.user_name)}
                      className="rounded-2xl border border-white/80 bg-white/90 px-4 py-5 text-lg font-bold text-slate-800 shadow-[6px_6px_18px_rgba(255,127,80,0.08),-6px_-6px_18px_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FFF5F5] font-['Geist,sans-serif']"
                    >
                      {profile.user_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create New Profile */}
              <div className="mb-6">
                {!isCreatingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingProfile(true)}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#FF7F50] to-[#FF6347] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_20px_rgba(255,127,80,0.25)] transition-all duration-300 hover:scale-[1.02] font-['Geist,sans-serif']"
                  >
                    Create New Profile
                  </button>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-[#FF7F50]/20 bg-[#FF7F50]/5 p-4 text-left">
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={(event) => setProfileNameInput(event.target.value)}
                      placeholder="Enter your name (e.g., Erik)"
                      className="h-12 w-full rounded-2xl border border-white/60 bg-white px-4 text-base outline-none ring-[#FF7F50]/20 transition-all duration-300 focus:border-[#FF7F50] focus:ring-4 font-['Inter,sans-serif']"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-[#FF7F50] to-[#FF6347] px-4 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 font-['Geist,sans-serif']"
                      >
                        {isSavingProfile ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingProfile(false)}
                        className="rounded-2xl border border-white/60 bg-white px-4 py-3 font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50 font-['Geist,sans-serif']"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF5F5] px-4 py-10 text-slate-900 relative overflow-hidden">
      {/* Background flower decorations */}
      <div className="absolute top-10 right-10 opacity-10">
        <FlowerIcon color="coral" size="large" />
      </div>
      <div className="absolute bottom-20 left-5 opacity-15">
        <FlowerIcon color="lemon" size="medium" />
      </div>
      <div className="absolute top-32 left-8 opacity-10">
        <FlowerIcon color="blue" size="large" />
      </div>
      
      {/* Small animated logo in corner */}
      <div className="fixed top-6 right-6 z-50">
        <AvocadoLogo size="small" animated={true} />
      </div>
      
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 relative z-10">
        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[8px_8px_24px_rgba(255,127,80,0.08),-8px_-8px_24px_rgba(255,255,255,0.95)] backdrop-blur-xl transition-all duration-300 sm:p-8 relative">
          {/* Corner flowers */}
          <div className="absolute top-2 right-2 opacity-25">
            <FlowerIcon color="coral" size="small" />
          </div>
          <div className="absolute bottom-2 left-2 opacity-25">
            <FlowerIcon color="lemon" size="small" />
          </div>
          
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] retro-heading text-[#FF7F50]">
              AI Calories
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-700">Профіль: {userName}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-lg text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  aria-label="Налаштування профілю"
                >
                  ⚙️
                </button>
                <button
                  type="button"
                  onClick={handleLogoutProfile}
                  className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  Вийти
                </button>
              </div>
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

        {isSettingsOpen ? (
          <section className="rounded-2xl border border-white/80 bg-white/80 p-6 shadow-[8px_8px_24px_rgba(15,23,42,0.06),-8px_-8px_24px_rgba(255,255,255,0.92)] backdrop-blur-xl transition-all duration-300 sm:p-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Налаштування профілю</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Денна норма калорій</span>
                <input
                  type="number"
                  min={1}
                  value={settingsCaloriesInput}
                  onChange={(event) => setSettingsCaloriesInput(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200/80 bg-white px-4 text-base outline-none ring-emerald-100 transition-all duration-300 focus:border-emerald-300 focus:ring-4"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Денна норма води (мл)</span>
                <input
                  type="number"
                  min={1}
                  value={settingsWaterInput}
                  onChange={(event) => setSettingsWaterInput(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200/80 bg-white px-4 text-base outline-none ring-emerald-100 transition-all duration-300 focus:border-emerald-300 focus:ring-4"
                />
              </label>
            </div>
            {settingsMacroPreview ? (
              <p className="mt-4 text-sm text-slate-600">
                Розраховано БЖВ (25% / 30% / 45%): білки{" "}
                <span className="font-semibold text-slate-800">{settingsMacroPreview.protein} г</span>, жири{" "}
                <span className="font-semibold text-slate-800">{settingsMacroPreview.fat} г</span>, вуглеводи{" "}
                <span className="font-semibold text-slate-800">{settingsMacroPreview.carbs} г</span>
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isUpdatingProfileSettings}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 py-2.5 font-semibold text-white transition-all duration-300 hover:scale-[1.02] disabled:opacity-60"
              >
                {isUpdatingProfileSettings ? "Збереження..." : "Зберегти"}
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50"
              >
                Скасувати
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
                  {dailyCalories} / {dailyCalorieGoal} ккал
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-full bg-pink-100/50 shadow-inner">
                <div
                  className="progress-bar-enhanced h-full rounded-full bg-gradient-to-r from-pink-200 via-[#FF7F50] to-[#FF6B6B] transition-all duration-700 breathe-on-hover shadow-lg"
                  style={{ width: `${getProgress(dailyCalories, dailyCalorieGoal)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Білки</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyProtein} / {dailyProteinGoal} г
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-full bg-[#FFF44F]/30 shadow-inner">
                <div
                  className="progress-bar-enhanced h-full rounded-full bg-gradient-to-r from-[#FFF44F] via-[#FFD700] to-[#FFA500] transition-all duration-700 breathe-on-hover shadow-lg"
                  style={{ width: `${getProgress(dailyProtein, dailyProteinGoal)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Жири</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyFat} / {dailyFatGoal} г
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-full bg-[#A7F3D0]/40 shadow-inner">
                <div
                  className="progress-bar-enhanced h-full rounded-full bg-gradient-to-r from-[#A7F3D0] via-[#6EE7B7] to-[#4ADE80] transition-all duration-700 breathe-on-hover shadow-lg"
                  style={{ width: `${getProgress(dailyFat, dailyFatGoal)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Вуглеводи</span>
                <span className="text-base font-bold text-slate-800">
                  {dailyCarbs} / {dailyCarbsGoal} г
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-full bg-[#FF7F50]/30 shadow-inner">
                <div
                  className="progress-bar-enhanced h-full rounded-full bg-gradient-to-r from-[#FFB6C1] via-[#FF7F50] to-[#FF6347] transition-all duration-700 breathe-on-hover shadow-lg"
                  style={{ width: `${getProgress(dailyCarbs, dailyCarbsGoal)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[8px_8px_24px_rgba(255,127,80,0.08),-8px_-8px_24px_rgba(255,255,255,0.95)] backdrop-blur-xl transition-all duration-300 sm:p-8 relative">
          {/* Corner flowers */}
          <div className="absolute top-2 right-2 opacity-25">
            <FlowerIcon color="blue" size="small" />
          </div>
          <div className="absolute bottom-2 left-2 opacity-25">
            <FlowerIcon color="lemon" size="small" />
          </div>
          
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-3xl font-bold retro-heading text-slate-900">Водний баланс</h2>
            <p className="text-base font-bold text-slate-700">
              Випито: {(dailyWaterMl / 1000).toFixed(1)} л / {(dailyWaterGoal / 1000).toFixed(1)} л
            </p>
          </div>

          {/* Retro water progress with enhanced wave effect */}
          <div className="mb-6 relative h-24 overflow-hidden rounded-2xl border-2 border-[#A7F3D0] bg-gradient-to-b from-[#E0F2FE] to-[#BAE6FD]">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0EA5E9] via-[#38BDF8] to-[#7DD3FC] transition-all duration-700"
              style={{ height: `${getProgress(dailyWaterMl, dailyWaterGoal)}%` }}
            >
              {/* Enhanced retro wave effect */}
              <div className="absolute inset-0 water-wave">
                <svg className="absolute bottom-0 w-full h-12" viewBox="0 0 200 40" preserveAspectRatio="none">
                  <path 
                    d="M0,20 Q25,10 50,20 Q75,30 100,20 Q125,10 150,20 Q175,30 200,20 L200,40 L0,40 Z" 
                    fill="rgba(255,255,255,0.4)"
                  />
                </svg>
                <svg className="absolute bottom-0 w-full h-10" viewBox="0 0 200 40" preserveAspectRatio="none">
                  <path 
                    d="M0,25 Q30,15 60,25 Q90,35 120,25 Q150,15 180,25 Q200,20 200,25 L200,40 L0,40 Z" 
                    fill="rgba(255,255,255,0.3)"
                  />
                </svg>
                <svg className="absolute bottom-0 w-full h-8" viewBox="0 0 200 40" preserveAspectRatio="none">
                  <path 
                    d="M0,30 Q40,20 80,30 Q120,40 160,30 Q200,25 200,30 L200,40 L0,40 Z" 
                    fill="rgba(255,255,255,0.2)"
                  />
                </svg>
                {/* Bubbles */}
                <circle cx="30" cy="15" r="2" fill="rgba(255,255,255,0.6)" className="animate-pulse" />
                <circle cx="70" cy="10" r="1.5" fill="rgba(255,255,255,0.5)" className="animate-pulse" />
                <circle cx="120" cy="18" r="2.5" fill="rgba(255,255,255,0.7)" className="animate-pulse" />
                <circle cx="160" cy="12" r="1" fill="rgba(255,255,255,0.4)" className="animate-pulse" />
              </div>
            </div>
            {/* Water percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold retro-heading text-slate-800 drop-shadow-lg bg-white/80 px-3 py-1 rounded-full">
                {Math.round(getProgress(dailyWaterMl, dailyWaterGoal))}%
              </span>
            </div>
          </div>

          <p className="mb-5 text-sm text-slate-600">
            Натисни на склянку, щоб додати 250 мл води.
          </p>

          <div className="flex flex-wrap gap-3">
            {Array.from({ length: waterGlassesGoal }).map((_, index) => {
              const filledGlasses = Math.floor(dailyWaterMl / WATER_GLASS_ML);
              const isFilled = index < filledGlasses;

              return (
                <button
                  key={`water-glass-${index}`}
                  type="button"
                  onClick={handleAddWater}
                  disabled={isAddingWater || dailyStatsLoading || !userName.trim()}
                  className={`flex h-14 w-12 items-center justify-center rounded-2xl border text-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 breathe-on-hover disabled:cursor-not-allowed disabled:opacity-60 ${
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
