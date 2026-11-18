import {
  Bell,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
  primaryMobile?: boolean;
}

export const WORKSPACE_NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Ringkasan workspace, progres kompetisi, dan aktivitas terbaru',
    to: '/overview',
    icon: LayoutDashboard,
    primaryMobile: true,
  },
  {
    id: 'competitions',
    label: 'Competitions',
    description: 'Daftar kompetisi, detail tim, tautan sumber daya, dan progres',
    to: '/competitions',
    icon: Trophy,
    primaryMobile: true,
  },
  {
    id: 'tasks',
    label: 'My Tasks',
    description: 'Daftar tugas yang ditugaskan kepada Anda beserta tenggat waktu',
    to: '/tasks',
    icon: CheckSquare,
    primaryMobile: true,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Jadwal rapat, presentasi, deadline kompetisi, dan tenggat tugas',
    to: '/calendar',
    icon: CalendarDays,
    primaryMobile: true,
  },
  {
    id: 'members',
    label: 'Members',
    description: 'Manajemen akun anggota tim dan hak akses peran',
    to: '/members',
    icon: Users,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Notifikasi mention, penugasan, komentar, dan pengingat deadline',
    to: '/notifications',
    icon: Bell,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Preferensi akun, tampilan tema, dan pengaturan notifikasi',
    to: '/settings',
    icon: Settings,
  },
];
