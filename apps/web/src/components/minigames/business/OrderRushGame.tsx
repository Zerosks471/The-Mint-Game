import { useState, useEffect, useCallback } from 'react';
import { MiniGameProps } from '../MiniGameModal';

interface Order {
  id: number;
  ingredients: string[];
}

interface Ingredient {
  id: string;
  emoji: string;
  name: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'tomato', emoji: '🍅', name: 'Tomato' },
  { id: 'lettuce', emoji: '🥬', name: 'Lettuce' },
  { id: 'cheese', emoji: '🧀', name: 'Cheese' },
  { id: 'meat', emoji: '🥩', name: 'Meat' },
  { id: 'bread', emoji: '🍞', name: 'Bread' },
  { id: 'onion', emoji: '🧅', name: 'Onion' },
  { id: 'pepper', emoji: '🌶️', name: 'Pepper' },
  { id: 'egg', emoji: '🥚', name: 'Egg' },
];

function generateOrders(count: number): Order[] {
  const orders: Order[] = [];
  for (let i = 0; i < count; i++) {
    const ingredientCount = Math.min(2 + Math.floor(i / 2), 4);
    const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
    orders.push({
      id: i,
      ingredients: shuffled.slice(0, ingredientCount).map((ing) => ing.id),
    });
  }
  return orders;
}

export function OrderRushGame({ difficulty, onComplete }: MiniGameProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(difficulty.timeLimit);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize orders
  useEffect(() => {
    setOrders(generateOrders(difficulty.itemCount));
  }, [difficulty.itemCount]);

  // Timer
  useEffect(() => {
    if (isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isComplete]);

  // Check completion
  useEffect(() => {
    if (isComplete) {
      const success = currentOrderIndex >= orders.length;
      onComplete(success, score);
    }
  }, [isComplete, currentOrderIndex, orders.length, score, onComplete]);

  const handleIngredientClick = useCallback((ingredientId: string) => {
    if (isComplete || currentOrderIndex >= orders.length) return;

    const currentOrder = orders[currentOrderIndex];
    const newSelected = [...selectedIngredients, ingredientId];
    setSelectedIngredients(newSelected);

    // Check if all ingredients for current order are selected correctly
    if (newSelected.length === currentOrder.ingredients.length) {
      const isCorrect = currentOrder.ingredients.every((ing) => newSelected.includes(ing));

      if (isCorrect) {
        setScore((prev) => prev + 100 + timeLeft);
        setCurrentOrderIndex((prev) => prev + 1);
        setSelectedIngredients([]);

        // Check if all orders complete
        if (currentOrderIndex + 1 >= orders.length) {
          setIsComplete(true);
        }
      } else {
        // Wrong order - reset selection
        setSelectedIngredients([]);
        setScore((prev) => Math.max(0, prev - 20));
      }
    }
  }, [currentOrderIndex, orders, selectedIngredients, isComplete, timeLeft]);

  const currentOrder = orders[currentOrderIndex];

  return (
    <div className="space-y-6">
      {/* Timer and Progress */}
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold">
          Order {Math.min(currentOrderIndex + 1, orders.length)} / {orders.length}
        </div>
        <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
          {timeLeft}s
        </div>
        <div className="text-lg">
          Score: {score}
        </div>
      </div>

      {/* Current Order */}
      {currentOrder && (
        <div className="bg-amber-900/30 rounded-xl p-4 border border-dark-border">
          <h3 className="text-sm font-semibold text-amber-200 mb-2">
            Order #{currentOrderIndex + 1}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {currentOrder.ingredients.map((ingId) => {
              const ing = INGREDIENTS.find((i) => i.id === ingId);
              const isSelected = selectedIngredients.includes(ingId);
              return (
                <div
                  key={ingId}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-800 text-amber-100'
                  }`}
                >
                  {ing?.emoji} {ing?.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ingredients to Select */}
      <div className="grid grid-cols-4 gap-3">
        {INGREDIENTS.map((ing) => (
          <button
            key={ing.id}
            onClick={() => handleIngredientClick(ing.id)}
            disabled={isComplete}
            className={`
              p-4 rounded-xl text-center transition-all
              ${selectedIngredients.includes(ing.id)
                ? 'bg-emerald-500 text-white scale-95'
                : 'bg-dark-elevated hover:bg-dark-border'
              }
              ${isComplete ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            <div className="text-3xl mb-1">{ing.emoji}</div>
            <div className="text-xs">{ing.name}</div>
          </button>
        ))}
      </div>

      {/* Selected Ingredients */}
      <div className="flex gap-2 min-h-[40px]">
        {selectedIngredients.map((ingId, idx) => {
          const ing = INGREDIENTS.find((i) => i.id === ingId);
          return (
            <div
              key={`${ingId}-${idx}`}
              className="px-3 py-1 bg-emerald-900/30 rounded-full text-emerald-300"
            >
              {ing?.emoji}
            </div>
          );
        })}
      </div>
    </div>
  );
}
