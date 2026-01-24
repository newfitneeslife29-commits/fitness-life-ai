import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { WorkoutRoutine } from '../data/workoutCatalog';
import { FoodItem } from '../data/foodDatabase';
import confetti from 'canvas-confetti';

export interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'info' | 'success' | 'warning';
}

export interface UserProfile {
    name: string;
    age: number;
    weight: number; // kg
    height: number; // cm
    xp: number; // Experience points for leveling
    goal: 'Lose Weight' | 'Build Muscle' | 'Keep Fit' | 'Athletic Performance';
    experience: 'Beginner' | 'Intermediate' | 'Advanced';
    avatar: string;
    beforePhoto: string | null;
    afterPhoto: string | null;
    posts: any[];
    customRoutines: WorkoutRoutine[];
    onboarding_completed?: boolean;
    weight_unit: 'kg' | 'lbs';
    height_unit: 'cm' | 'ft';
    is_premium?: boolean;
}

export type Language = 'EN' | 'ES' | 'FR' | 'PT' | 'DE';

interface UserContextType {
    user: UserProfile;
    setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
    isOnboarded: boolean;
    isAuthenticated: boolean;
    completeOnboarding: (data: Partial<UserProfile>) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    addPost: (post: any) => void;
    addCustomRoutine: (routine: WorkoutRoutine) => void;
    addXP: (amount: number) => void;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    saveSubscription: (data: any) => Promise<void>;
    // Nutrition Global State
    dailyLog: FoodItem[];
    addToLog: (item: FoodItem) => void;
    removeFromLog: (index: number) => void;
    // Notifications Global State
    notifications: Notification[];
    markAsRead: (id: number) => void;
    clearNotifications: () => void;
    logout: () => Promise<void>;
    loading: boolean;
}

const defaultUser: UserProfile = {
    name: 'Guest User',
    age: 25,
    weight: 70,
    height: 175,
    xp: 1200,
    goal: 'Keep Fit',
    experience: 'Beginner',
    avatar: 'https://picsum.photos/200',
    beforePhoto: null,
    afterPhoto: null,
    posts: [],
    customRoutines: [],
    weight_unit: 'kg',
    height_unit: 'cm',
    is_premium: false
};

const defaultNotifications: Notification[] = [
    { id: 1, title: 'Hydration Alert', message: 'Time to drink 250ml of water!', time: '10m ago', read: false, type: 'info' },
    { id: 2, title: 'New Follower', message: 'Sarah Connor started following you.', time: '1h ago', read: false, type: 'success' },
    { id: 3, title: 'Streak Risk', message: 'Log a workout today to keep your 12-day streak!', time: '4h ago', read: false, type: 'warning' },
];

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile>(defaultUser);
    const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [language, setLanguage] = useState<Language>('EN');

    // Nutrition Log State
    const [dailyLog, setDailyLog] = useState<FoodItem[]>([]);

    // Notifications State
    const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);

    // Supabase Auth State
    useEffect(() => {
        const fetchUserData = async (session: any) => {
            if (session?.user) {
                setIsAuthenticated(true);

                // Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                // Fetch Routines
                const { data: routines } = await supabase
                    .from('routines')
                    .select('*');

                const formattedRoutines = (routines || []).map(r => ({
                    id: r.id,
                    title: r.name,
                    exercises: r.exercises,
                    description: r.metadata?.description || '',
                    goal: r.metadata?.goal || 'Build Muscle',
                    level: r.metadata?.level || 'Beginner',
                    duration: r.metadata?.duration || '0 min',
                }));

                if (profile) {
                    setUser(prev => ({
                        ...prev,
                        ...profile, // Spread profile data (name, age, etc.)
                        email: session.user.email,
                        id: session.user.id,
                        customRoutines: formattedRoutines as WorkoutRoutine[],
                        is_premium: profile.is_premium || false
                    }));

                    if (profile.onboarding_completed === true) {
                        setIsOnboarded(true);
                    } else {
                        setIsOnboarded(false);
                    }
                } else {
                    setUser(prev => ({
                        ...defaultUser,
                        email: session.user.email,
                        id: session.user.id,
                        customRoutines: formattedRoutines as WorkoutRoutine[]
                    } as any));
                    setIsOnboarded(false);
                }
            } else {
                setIsAuthenticated(false);
                setIsOnboarded(false);
            }
            setLoading(false);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserData(session);
            } else {
                setIsAuthenticated(false);
                setIsOnboarded(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Theme persistence
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const updateProfile = async (data: Partial<UserProfile>) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const updates: any = {
                updated_at: new Date().toISOString(),
                ...data
            };

            // Map frontend camelCase to DB snake_case for specific fields
            if (data.beforePhoto !== undefined) updates.before_photo = data.beforePhoto;
            if (data.afterPhoto !== undefined) updates.after_photo = data.afterPhoto;
            if (data.weight_unit !== undefined) updates.weight_unit = data.weight_unit;
            if (data.height_unit !== undefined) updates.height_unit = data.height_unit;
            // Clean up fields that shouldn't be sent directly if they don't match DB columns exactly
            // or rely on the spread above if they match (name, weight, height, age, goal, experience)

            // We need to be careful with 'beforePhoto' key staying in 'updates' if it's not a column, 
            // but Supabase usually ignores extra keys or errors. 
            // Better to be explicit with the DB columns.
            const dbUpdates = {
                id: session.user.id,
                updated_at: new Date().toISOString(),
            } as any;

            if (data.name) dbUpdates.name = data.name;
            if (data.age) dbUpdates.age = data.age;
            if (data.weight) dbUpdates.weight = data.weight;
            if (data.height) dbUpdates.height = data.height;
            if (data.goal) dbUpdates.goal = data.goal;
            if (data.experience) dbUpdates.experience = data.experience;
            if (data.avatar) dbUpdates.avatar = data.avatar;
            if (data.beforePhoto !== undefined) dbUpdates.before_photo = data.beforePhoto;
            if (data.afterPhoto !== undefined) dbUpdates.after_photo = data.afterPhoto;
            if (data.weight_unit) dbUpdates.weight_unit = data.weight_unit;
            if (data.height_unit) dbUpdates.height_unit = data.height_unit;
            if (data.onboarding_completed !== undefined) dbUpdates.onboarding_completed = data.onboarding_completed;
            if (data.is_premium !== undefined) dbUpdates.is_premium = data.is_premium;

            const { error } = await supabase.from('profiles').upsert(dbUpdates);

            if (error) {
                console.error("Error updating profile:", error);
            } else {
                setUser(prev => ({ ...prev, ...data }));
            }
        } else {
            setUser(prev => ({ ...prev, ...data }));
        }
    };

    const saveSubscription = async (subData: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const subscriptionEntry = {
                id: subData.id || `sub_${new Date().getTime()}`,
                user_id: session.user.id,
                status: 'active',
                created: new Date().toISOString(),
                price_id: subData.price_id || 'price_default'
            };

            const { error } = await supabase.from('subscriptions').insert(subscriptionEntry);
            if (error) console.error("Error saving subscription:", error);
        }
    };

    const completeOnboarding = async (data: Partial<UserProfile>) => {
        await updateProfile({ ...data, onboarding_completed: true });
        setIsOnboarded(true);
    };

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const toggleLanguage = () => {
        const langs: Language[] = ['EN', 'ES', 'FR', 'PT', 'DE'];
        const currentIndex = langs.indexOf(language);
        const nextIndex = (currentIndex + 1) % langs.length;
        setLanguage(langs[nextIndex]);
    };

    const addPost = (post: any) => {
        setUser(prev => ({ ...prev, posts: [post, ...prev.posts] }));
    };

    const addCustomRoutine = async (routine: WorkoutRoutine) => {
        setUser(prev => ({ ...prev, customRoutines: [...prev.customRoutines, routine] }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { title, exercises, ...meta } = routine;
            await supabase.from('routines').insert({
                user_id: session.user.id,
                name: title,
                exercises: exercises,
                metadata: meta
            });
        }
    };

    const addXP = (amount: number) => {
        setUser(prev => {
            const currentXP = prev.xp || 0;
            const newXP = currentXP + amount;

            // Check for level up (every 1000 XP)
            const currentLevel = Math.floor(currentXP / 1000) + 1;
            const newLevel = Math.floor(newXP / 1000) + 1;

            if (newLevel > currentLevel) {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#F44336', '#2196F3']
                });
            }

            return { ...prev, xp: newXP };
        });
    };

    const addToLog = (item: FoodItem) => {
        setDailyLog(prev => [...prev, item]);
    };

    const removeFromLog = (index: number) => {
        setDailyLog(prev => prev.filter((_, i) => i !== index));
    };

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsOnboarded(false);
        setIsAuthenticated(false);
        setUser(defaultUser);
        localStorage.removeItem('fitness_user'); // Clear local storage too if we used it
    };

    return (
        <UserContext.Provider value={{
            user, setUser, isOnboarded, isAuthenticated, completeOnboarding, updateProfile,
            theme, toggleTheme, language, setLanguage, toggleLanguage,
            addPost, addCustomRoutine, addXP,
            dailyLog, addToLog, removeFromLog,
            notifications, markAsRead, clearNotifications,
            logout, loading,
            saveSubscription
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
};