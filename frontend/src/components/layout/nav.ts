import {
  Bell,
  FlaskConical,
  History,
  LayoutDashboard,
  LineChart,
  Settings,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  mobile?: boolean;
  end?: boolean;
}

export const patientNav: NavItem[] = [
  { to: '/patient/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, mobile: true },
  { to: '/patient/meals/new', label: 'Log a meal', icon: UtensilsCrossed, end: true },
  { to: '/patient/meals', label: 'Meal history', short: 'History', icon: History, mobile: true, end: true },
  { to: '/patient/analytics', label: 'Analytics', icon: LineChart },
  { to: '/patient/labs', label: 'Lab results', short: 'Labs', icon: FlaskConical, mobile: true },
  { to: '/patient/notifications', label: 'Notifications', icon: Bell },
  { to: '/patient/profile', label: 'Profile', icon: User, mobile: true },
  { to: '/patient/settings', label: 'Settings', icon: Settings },
];
