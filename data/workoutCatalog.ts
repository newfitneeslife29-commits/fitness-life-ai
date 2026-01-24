
export type GoalType = 'Hypertrophy' | 'Definition' | 'Home_Maintenance' | 'Home_Weighted';
export type LevelType = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Exercise {
    name: string;
    sets: number;
    reps: string;
    rest: string;
    tip?: string; // Technical instruction
}

export interface WorkoutRoutine {
    id: string;
    title: string;
    description: string;
    goal: GoalType;
    level: LevelType;
    duration: string;
    exercises: Exercise[];
}

export const WORKOUT_CATALOG: WorkoutRoutine[] = [
    // --- NUEVAS RUTINAS (Gym Specific) ---
    {
        id: "R_GYM_BACK_001",
        title: "Back Width & Density",
        description: "Complete back development focusing on lats width and mid-back thickness.",
        goal: "Hypertrophy",
        level: "Intermediate",
        duration: "55 min",
        exercises: [
            { name: "Wide Grip Lat Pulldown", sets: 4, reps: "10-12", rest: "90s", tip: "Keep chest up, drive elbows down towards hips, not just back." },
            { name: "Barbell Bent Over Row", sets: 4, reps: "8-10", rest: "120s", tip: "Maintain a neutral spine. Pull the bar towards your lower chest/upper abs." },
            { name: "Seated Cable Row", sets: 3, reps: "12", rest: "90s", tip: "Avoid excessive swinging. Squeeze shoulder blades together at the peak." },
            { name: "Single Arm Dumbbell Row", sets: 3, reps: "10/side", rest: "60s", tip: "Keep your torso parallel to the floor. Focus on the stretch at the bottom." },
            { name: "Face Pulls", sets: 3, reps: "15-20", rest: "60s", tip: "Pull towards your forehead, keeping elbows high to target rear delts." }
        ]
    },
    {
        id: "R_GYM_FEM_001",
        title: "Hamstring Isolation",
        description: "Targeted posterior chain work focusing on stretch and contraction.",
        goal: "Hypertrophy",
        level: "Advanced",
        duration: "50 min",
        exercises: [
            { name: "Romanian Deadlift (RDL)", sets: 4, reps: "8-10", rest: "120s", tip: "Hinge at the hips, slight knee bend. Feel the deep stretch in hamstrings." },
            { name: "Seated Leg Curl", sets: 4, reps: "12-15", rest: "90s", tip: "Lock your quads under the pad. Control the eccentric (negative) phase." },
            { name: "Lying Leg Curl", sets: 3, reps: "12", rest: "60s", tip: "Keep hips pressed into the bench to avoid using lower back." },
            { name: "Nordic Hamstring Curl", sets: 3, reps: "To Failure", rest: "120s", tip: "Lower yourself as slowly as possible. Use hands to push back up if needed." }
        ]
    },
    {
        id: "R_GYM_GLUTE_001",
        title: "Glute Max Activation",
        description: "High intensity routine to maximize glute recruitment and shape.",
        goal: "Hypertrophy",
        level: "Intermediate",
        duration: "45 min",
        exercises: [
            { name: "Barbell Hip Thrust", sets: 4, reps: "8-12", rest: "120s", tip: "Chin tucked, drive through heels. Full extension at the top." },
            { name: "Bulgarian Split Squat", sets: 3, reps: "10/side", rest: "90s", tip: "Lean torso slightly forward to bias glutes over quads." },
            { name: "Cable Glute Kickback", sets: 3, reps: "15/side", rest: "60s", tip: "Keep leg straight or slightly bent. Squeeze hard at the top." },
            { name: "Seated Hip Abduction", sets: 3, reps: "20", rest: "60s", tip: "Lean forward slightly to target the upper glutes." }
        ]
    },
    {
        id: "R_GYM_CALF_001",
        title: "Calf Volume Builder",
        description: "Specialized routine for stubborn calves using different angles.",
        goal: "Hypertrophy",
        level: "Beginner",
        duration: "25 min",
        exercises: [
            { name: "Standing Calf Raise", sets: 4, reps: "12-15", rest: "60s", tip: "Pause at the bottom for 1s, explode up, pause at top for 1s." },
            { name: "Seated Calf Raise", sets: 4, reps: "15-20", rest: "60s", tip: "Targets the soleus. Full range of motion is critical." },
            { name: "Leg Press Calf Raise", sets: 3, reps: "15", rest: "60s", tip: "Do not lock your knees completely. Focus on the stretch." }
        ]
    },

    // --- EXISTING ROUTINES ---
    {
        id: "R_GYM_SUB_001",
        title: "Push Power: Chest & Triceps",
        description: "Focus on mechanical tension and progressive overload for chest thickness.",
        goal: "Hypertrophy",
        level: "Intermediate",
        duration: "60 min",
        exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "120s", tip: "Keep feet planted, slight arch in back, retract scapula." },
            { name: "Incline Dumbbell Press", sets: 3, reps: "8-10", rest: "90s", tip: "Press up and slightly in, but don't clang weights together." },
            { name: "Weighted Dips", sets: 3, reps: "10-12", rest: "90s", tip: "Lean forward to target chest. Keep elbows tucked." },
            { name: "Cable Flyes", sets: 3, reps: "15", rest: "60s", tip: "Imagine hugging a tree. Focus on the squeeze." },
            { name: "Skullcrushers", sets: 3, reps: "10-12", rest: "60s", tip: "Keep elbows stationary pointing at ceiling." }
        ]
    },
    {
        id: "R_GYM_SUB_002",
        title: "Leg Day: Quadriceps Focus",
        description: "High volume leg day targeting anterior chain growth.",
        goal: "Hypertrophy",
        level: "Advanced",
        duration: "70 min",
        exercises: [
            { name: "Barbell Squat", sets: 4, reps: "5-8", rest: "180s", tip: "Brace core. Knees track over toes. Depth below parallel." },
            { name: "Leg Press", sets: 4, reps: "10-12", rest: "90s", tip: "Do not lock knees at the top. Control the weight down." },
            { name: "Walking Lunges", sets: 3, reps: "12/leg", rest: "90s", tip: "Keep torso upright. Tap back knee gently." },
            { name: "Leg Extensions", sets: 3, reps: "15-20", rest: "60s", tip: "Squeeze quads hard at the top of movement." },
            { name: "Calf Raises", sets: 4, reps: "15", rest: "45s", tip: "Full stretch at bottom." }
        ]
    },
    // ... (Retaining previous home/functional routines but ensuring type compatibility)
    {
        id: "R_HOME_NO_001",
        title: "Calisthenics Fundamentals",
        description: "Mastering bodyweight strength control.",
        goal: "Home_Maintenance",
        level: "Beginner",
        duration: "30 min",
        exercises: [
            { name: "Bodyweight Squats", sets: 3, reps: "20", rest: "45s", tip: "Keep weight in heels." },
            { name: "Push Ups", sets: 3, reps: "10-12", rest: "45s", tip: "Elbows at 45 degree angle." },
            { name: "Glute Bridges", sets: 3, reps: "15", rest: "45s", tip: "Squeeze glutes at top." },
            { name: "Plank Hold", sets: 3, reps: "30s", rest: "45s", tip: "Keep body in straight line." }
        ]
    },
    {
        id: "R_HOME_MIN_001",
        title: "Dumbbell Full Body",
        description: "Comprehensive routine using just a pair of dumbbells.",
        goal: "Home_Weighted",
        level: "Intermediate",
        duration: "45 min",
        exercises: [
            { name: "DB Thrusters", sets: 3, reps: "12", rest: "60s", tip: "Explode up from the squat." },
            { name: "DB RDL (Deadlift)", sets: 3, reps: "12", rest: "60s", tip: "Keep back flat." },
            { name: "Renegade Row", sets: 3, reps: "10/side", rest: "60s", tip: "Minimize hip rotation." },
            { name: "Floor Press", sets: 3, reps: "12", rest: "60s", tip: "Pause when triceps touch floor." }
        ]
    }
];
