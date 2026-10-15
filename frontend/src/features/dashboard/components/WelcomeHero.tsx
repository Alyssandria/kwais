import { Link } from 'react-router-dom';
import { Flame, Plus } from 'lucide-react';
import { HeroBand } from '@/components/ui';
import type { PatientDashboard } from '../types';

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' } as const;

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeHero({ firstName, today }: { firstName: string; today: PatientDashboard['today'] }) {
  const now = new Date();
  const dateText = now.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const logged = today.mealsLogged.length;
  const mealNames = today.mealsLogged.map((m) => MEAL_LABEL[m.category]).join(', ');

  return (
    <HeroBand>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-primary-line">{dateText}</p>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <ul aria-label="Today" className="mt-1.5 flex flex-wrap gap-2">
            <li className="rounded-full border border-[#2a8c96] bg-[#0a6b76] px-3 py-1 text-[13px]">
              {logged === 0 ? 'No meals logged yet today' : `${logged} ${logged === 1 ? 'meal' : 'meals'} logged today · ${mealNames}`}
            </li>
            {today.streakDays > 1 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[13px] font-bold text-primary-dark">
                <Flame className="size-3.5" aria-hidden />
                {today.streakDays}-day logging streak
              </li>
            )}
          </ul>
        </div>
        <Link
          to="/patient/meals/new"
          className="inline-flex h-[52px] items-center gap-2 rounded-card bg-accent px-6 font-extrabold text-ink no-underline shadow-hero hover:bg-[#fca85a]"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden />
          Add a meal
        </Link>
      </div>
    </HeroBand>
  );
}
