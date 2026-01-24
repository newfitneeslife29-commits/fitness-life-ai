export interface FoodItem {
    id: string;
    name: string;
    category: 'Protein' | 'Carbs' | 'Fats' | 'Vegetables';
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    portion: string;
}

export const FOOD_DATABASE: FoodItem[] = [
    { id: '1', name: 'Chicken Breast', category: 'Protein', calories: 165, protein: 31, carbs: 0, fats: 3.6, portion: '100g' },
    { id: '2', name: 'Egg', category: 'Protein', calories: 70, protein: 6, carbs: 0.6, fats: 5, portion: '1 unit' },
    { id: '3', name: 'White Rice (Cooked)', category: 'Carbs', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, portion: '100g' },
    { id: '4', name: 'Oats', category: 'Carbs', calories: 389, protein: 16.9, carbs: 66, fats: 6.9, portion: '100g' },
    { id: '5', name: 'Salmon', category: 'Protein', calories: 208, protein: 20, carbs: 0, fats: 13, portion: '100g' },
    { id: '6', name: 'Avocado', category: 'Fats', calories: 160, protein: 2, carbs: 9, fats: 15, portion: '100g' },
    { id: '7', name: 'Almonds', category: 'Fats', calories: 173, protein: 6, carbs: 6, fats: 15, portion: '30g' },
    { id: '8', name: 'Greek Yogurt', category: 'Protein', calories: 59, protein: 10, carbs: 3.6, fats: 0.4, portion: '100g' },
    { id: '9', name: 'Lentils (Cooked)', category: 'Carbs', calories: 116, protein: 9, carbs: 20, fats: 0.4, portion: '100g' },
    { id: '10', name: 'Whole Wheat Bread', category: 'Carbs', calories: 69, protein: 3.6, carbs: 12, fats: 0.9, portion: '1 slice' },
    { id: '11', name: 'Apple', category: 'Carbs', calories: 52, protein: 0.3, carbs: 14, fats: 0.2, portion: '100g' },
    { id: '12', name: 'Banana', category: 'Carbs', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, portion: '100g' },
    { id: '13', name: 'Lean Beef', category: 'Protein', calories: 250, protein: 26, carbs: 0, fats: 15, portion: '100g' },
    { id: '14', name: 'Whole Wheat Pasta', category: 'Carbs', calories: 124, protein: 5.3, carbs: 27, fats: 0.5, portion: '100g' },
    { id: '15', name: 'Broccoli', category: 'Vegetables', calories: 34, protein: 2.8, carbs: 7, fats: 0.4, portion: '100g' },
    { id: '16', name: 'Olive Oil', category: 'Fats', calories: 119, protein: 0, carbs: 0, fats: 13.5, portion: '1 tbsp' },
    { id: '17', name: 'Fresh Cheese (Queso Fresco)', category: 'Protein', calories: 299, protein: 25, carbs: 1.3, fats: 21, portion: '100g' },
    { id: '18', name: 'Tuna (Canned in Water)', category: 'Protein', calories: 116, protein: 26, carbs: 0, fats: 1, portion: '1 can' },
    { id: '19', name: 'Quinoa (Cooked)', category: 'Carbs', calories: 120, protein: 4.4, carbs: 21, fats: 1.9, portion: '100g' },
    { id: '20', name: 'Peanut Butter', category: 'Fats', calories: 94, protein: 4, carbs: 3, fats: 8, portion: '1 tbsp' }
];