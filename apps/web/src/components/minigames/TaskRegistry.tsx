import { ComponentType } from 'react';
import { MiniGameProps } from './MiniGameModal';
import { OrderRushGame } from './business/OrderRushGame';

// Placeholder game component (will be replaced with actual games)
const PlaceholderGame: ComponentType<MiniGameProps> = ({ difficulty, onComplete }) => {
  return (
    <div className="text-center py-8">
      <p className="text-zinc-400 mb-4">
        Mini-game for this type coming soon!
      </p>
      <p className="text-sm text-zinc-500 mb-6">
        Items: {difficulty.itemCount} | Time: {difficulty.timeLimit}s
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => onComplete(true, 100)}
          className="px-4 py-2 bg-mint text-white rounded-xl"
        >
          Simulate Success
        </button>
        <button
          onClick={() => onComplete(false, 0)}
          className="px-4 py-2 bg-red-500 text-white rounded-xl"
        >
          Simulate Fail
        </button>
      </div>
    </div>
  );
};

// Business task registry
export const BUSINESS_TASKS: Record<string, {
  name: string;
  description: string;
  component: ComponentType<MiniGameProps>;
}> = {
  restaurant: {
    name: 'Order Rush',
    description: 'Match ingredients to order tickets',
    component: OrderRushGame,
  },
  tech_startup: {
    name: 'Debug Code',
    description: 'Find and fix the bugs',
    component: PlaceholderGame,
  },
  retail_store: {
    name: 'Stock Shelves',
    description: 'Arrange inventory tetris-style',
    component: PlaceholderGame,
  },
  factory: {
    name: 'Assembly Line',
    description: 'Follow the button sequence',
    component: PlaceholderGame,
  },
  bank: {
    name: 'Verify Deposits',
    description: 'Check the math is correct',
    component: PlaceholderGame,
  },
  hotel: {
    name: 'Guest Requests',
    description: 'Remember and match guest orders',
    component: PlaceholderGame,
  },
  marketing_agency: {
    name: 'Ad Review',
    description: 'Approve or reject advertisements',
    component: PlaceholderGame,
  },
  consulting_firm: {
    name: 'Schedule Meeting',
    description: 'Fit meetings into the calendar',
    component: PlaceholderGame,
  },
};

// Property task registry
export const PROPERTY_TASKS: Record<string, {
  name: string;
  description: string;
  component: ComponentType<MiniGameProps>;
}> = {
  apartment: {
    name: 'Collect Rent',
    description: 'Knock on doors in sequence',
    component: PlaceholderGame,
  },
  duplex: {
    name: 'Fix Pipes',
    description: 'Connect the water flow',
    component: PlaceholderGame,
  },
  townhouse: {
    name: 'Paint Walls',
    description: 'Match the color pattern',
    component: PlaceholderGame,
  },
  small_house: {
    name: 'Mow Lawn',
    description: 'Trace the path to cover all grass',
    component: PlaceholderGame,
  },
  large_house: {
    name: 'Security Check',
    description: 'Spot the differences',
    component: PlaceholderGame,
  },
  mansion: {
    name: 'Host Party',
    description: 'Serve guests their drinks',
    component: PlaceholderGame,
  },
  beach_house: {
    name: 'Clean Beach',
    description: 'Clear debris before waves hit',
    component: PlaceholderGame,
  },
  penthouse: {
    name: 'Valet Cars',
    description: 'Slide puzzle to exit',
    component: PlaceholderGame,
  },
  villa: {
    name: 'Garden Care',
    description: 'Remove the weeds',
    component: PlaceholderGame,
  },
  private_island: {
    name: 'Dock Boats',
    description: 'Time the docking perfectly',
    component: PlaceholderGame,
  },
};

export function getBusinessTask(businessType: string) {
  return BUSINESS_TASKS[businessType] || BUSINESS_TASKS.restaurant;
}

export function getPropertyTask(propertyType: string) {
  return PROPERTY_TASKS[propertyType] || PROPERTY_TASKS.apartment;
}
