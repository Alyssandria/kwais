import {
  Bell,
  IdCard,
  Users,
  FlaskConical,
  History,
  LayoutDashboard,
  LineChart,
  NotebookPen,
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
  { to: '/patient/notes', label: 'Care notes', icon: NotebookPen },
  { to: '/patient/notifications', label: 'Notifications', icon: Bell },
  { to: '/patient/profile', label: 'Profile', icon: User, mobile: true },
  { to: '/patient/settings', label: 'Settings', icon: Settings },
];

export const doctorNav: NavItem[] = [
  { to: '/doctor/dashboard', label: 'Patients', icon: Users, mobile: true },
  { to: '/doctor/notifications', label: 'Notifications', icon: Bell },
  { to: '/doctor/profile', label: 'Your profile', short: 'Profile', icon: IdCard, mobile: true },
  { to: '/doctor/settings', label: 'Settings', icon: Settings, mobile: true },
];
