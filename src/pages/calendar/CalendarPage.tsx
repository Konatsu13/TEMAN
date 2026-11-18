import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchUnifiedCalendarItems,
  updateCalendarEvent,
  type CalendarEventWithDetails,
  type UnifiedCalendarItem,
} from '../../services/calendarService';
import {
  fetchCompetitions,
  type Competition,
} from '../../services/competitionService';
import type { EventType } from '../../types/database.types';
import {
  formatDateWIB,
  formatDateTimeWIB,
  getInitials,
} from '../../utils/formatters';

const DAYS_OF_WEEK = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export function CalendarPage() {
  const { profile } = useAuth();

  // Data State
  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & View State
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Date Navigation State (anchor date for Month and Week views)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(() => new Date());

  // Event Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    event_type: EventType;
    competition_id: string;
    starts_at: string;
    ends_at: string;
    location: string;
  }>({
    title: '',
    description: '',
    event_type: 'meeting',
    competition_id: '',
    starts_at: '',
    ends_at: '',
    location: '',
  });

  // Delete Confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load Data
  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [unifiedData, compsData] = await Promise.all([
        fetchUnifiedCalendarItems(selectedCompetition),
        fetchCompetitions(),
      ]);
      setItems(unifiedData);
      setCompetitions(compsData);
    } catch (err: any) {
      console.error('Failed to load calendar data:', err);
      setErrorMessage(err.message || 'Gagal memuat jadwal kalender.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendarData();
  }, [selectedCompetition]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchComp = (item.competitionName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchComp) return false;
      }

      // Type Filter
      if (selectedType !== 'all') {
        if (selectedType === 'competition' && item.source !== 'competition_deadline') {
          return false;
        }
        if (selectedType === 'task' && item.source !== 'task_deadline') {
          return false;
        }
        if (selectedType === 'meeting' && (item.source !== 'event' || item.eventType !== 'meeting')) {
          return false;
        }
        if (selectedType === 'presentation' && (item.source !== 'event' || item.eventType !== 'presentation')) {
          return false;
        }
        if (selectedType === 'other' && (item.source !== 'event' || item.eventType !== 'other')) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedType]);

  // Month Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayDate(today);
  };

  // Open Create Event Modal
  const openCreateModal = (defaultDate?: Date) => {
    setModalMode('create');
    setEditingEventId(null);

    const targetDate = defaultDate || new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T09:00`;
    const endStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T10:00`;

    setEventForm({
      title: '',
      description: '',
      event_type: 'meeting',
      competition_id: competitions[0]?.id || '',
      starts_at: startStr,
      ends_at: endStr,
      location: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Event Modal (only for custom calendar events)
  const openEditModal = (item: UnifiedCalendarItem) => {
    if (item.source !== 'event') return;
    const rawId = item.id.replace('event-', '');
    setModalMode('edit');
    setEditingEventId(rawId);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDt = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEventForm({
      title: item.title,
      description: item.description || '',
      event_type: item.eventType || 'meeting',
      competition_id: item.competitionId || '',
      starts_at: formatDt(item.startsAt),
      ends_at: item.endsAt ? formatDt(item.endsAt) : '',
      location: item.location || '',
    });
    setIsModalOpen(true);
  };

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      alert('Judul acara wajib diisi.');
      return;
    }
    if (!eventForm.starts_at) {
      alert('Waktu mulai wajib ditentukan.');
      return;
    }

    try {
      setSubmitting(true);
      const isoStartsAt = new Date(eventForm.starts_at).toISOString();
      const isoEndsAt = eventForm.ends_at
        ? new Date(eventForm.ends_at).toISOString()
        : null;

      if (modalMode === 'create') {
        await createCalendarEvent({
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || null,
          event_type: eventForm.event_type,
          competition_id: eventForm.competition_id || null,
          starts_at: isoStartsAt,
          ends_at: isoEndsAt,
          location: eventForm.location.trim() || null,
          created_by: profile?.id || null,
        });
      } else if (modalMode === 'edit' && editingEventId) {
        await updateCalendarEvent(editingEventId, {
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || null,
          event_type: eventForm.event_type,
          competition_id: eventForm.competition_id || null,
          starts_at: isoStartsAt,
          ends_at: isoEndsAt,
          location: eventForm.location.trim() || null,
        });
      }

      setIsModalOpen(false);
      await loadCalendarData();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      alert(err.message || 'Gagal menyimpan agenda.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (rawEventId: string) => {
    try {
      await deleteCalendarEvent(rawEventId);
      setDeleteConfirmId(null);
      await loadCalendarData();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      alert(err.message || 'Gagal menghapus event.');
    }
  };

  // Month Display Name in Indonesian
  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      month: 'long',
      year: 'numeric',
    }).format(currentDate);
  }, [currentDate]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayOfMonth = new Date(year, month, 1);
    // Convert to Monday-first (0 = Mon, 6 = Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Total days in current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: UnifiedCalendarItem[];
    }[] = [];

    const todayStr = new Date().toDateString();

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
        items: [],
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === todayStr,
        items: [],
      });
    }

    // Next month filler days (to complete 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
        items: [],
      });
    }

    // Associate filteredItems with days
    days.forEach((cell) => {
      const y = cell.date.getFullYear();
      const m = cell.date.getMonth();
      const dt = cell.date.getDate();

      cell.items = filteredItems.filter((item) => {
        const itemDate = new Date(item.startsAt);
        return (
          itemDate.getFullYear() === y &&
          itemDate.getMonth() === m &&
          itemDate.getDate() === dt
        );
      });
    });

    return days;
  }, [currentDate, filteredItems]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    const y = selectedDayDate.getFullYear();
    const m = selectedDayDate.getMonth();
    const dt = selectedDayDate.getDate();

    return filteredItems.filter((item) => {
      const itemDate = new Date(item.startsAt);
      return (
        itemDate.getFullYear() === y &&
        itemDate.getMonth() === m &&
        itemDate.getDate() === dt
      );
    });
  }, [selectedDayDate, filteredItems]);

  // Week Days for Week View
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    let dayOfWeek = d.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    d.setDate(d.getDate() - dayOfWeek); // Go to Monday of this week

    const days = [];
    const todayStr = new Date().toDateString();

    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(d);
      cellDate.setDate(d.getDate() + i);

      const y = cellDate.getFullYear();
      const m = cellDate.getMonth();
      const dt = cellDate.getDate();

      const cellItems = filteredItems.filter((item) => {
        const itemDate = new Date(item.startsAt);
        return (
          itemDate.getFullYear() === y &&
          itemDate.getMonth() === m &&
          itemDate.getDate() === dt
        );
      });

      days.push({
        date: cellDate,
        dayName: DAYS_OF_WEEK[i],
        isToday: cellDate.toDateString() === todayStr,
        items: cellItems,
      });
    }

    return days;
  }, [currentDate, filteredItems]);

  // Format Helper for Item Badges
  const renderItemBadge = (item: UnifiedCalendarItem) => {
    if (item.source === 'competition_deadline') {
      return (
        <Badge variant="danger" size="sm" dot>
          Deadline Lomba
        </Badge>
      );
    }
    if (item.source === 'task_deadline') {
      return (
        <Badge variant="warning" size="sm" dot>
          Tenggat Tugas
        </Badge>
      );
    }
    if (item.eventType === 'presentation') {
      return (
        <Badge variant="info" size="sm">
          Presentasi
        </Badge>
      );
    }
    if (item.eventType === 'meeting') {
      return (
        <Badge variant="primary" size="sm">
          Rapat Tim
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        Agenda
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Kalender Jadwal & Deadline
            </h2>
            <Badge variant="primary" size="sm">
              WIB (UTC+7)
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pusat sinkronisasi deadline lomba, batas pengumpulan tugas, dan rapat koordinasi tim.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => openCreateModal(selectedDayDate)}
          >
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* Control Bar: Navigation, Views, and Filters */}
      <Card variant="subtle" className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={handleToday}>
              Hari Ini
            </Button>

            <span className="font-display text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
              {currentMonthLabel}
            </span>
          </div>

          {/* View Mode Toggle & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Bulan
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Filter by Competition */}
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Kompetisi ({competitions.length})</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filter by Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Jenis Agenda</option>
              <option value="competition">Deadline Lomba</option>
              <option value="task">Tenggat Tugas</option>
              <option value="meeting">Rapat Tim</option>
              <option value="presentation">Presentasi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadCalendarData()}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      )}

      {/* MAIN VIEW AREA */}
      {!loading && (
        <>
          {/* VIEW 1: MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Side: Month Grid (8 or 9 cols) */}
              <div className="lg:col-span-8">
                <Card variant="default" className="overflow-hidden p-0">
                  {/* Weekday Names Header */}
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="py-2.5">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid Cells */}
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
                    {calendarDays.map((cell, idx) => {
                      const isSelected =
                        cell.date.toDateString() === selectedDayDate.toDateString();

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDayDate(cell.date)}
                          className={`group relative flex min-h-[90px] flex-col p-1.5 transition-colors sm:p-2 ${
                            !cell.isCurrentMonth
                              ? 'bg-slate-50/50 text-slate-400 dark:bg-slate-950/40 dark:text-slate-600'
                              : 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                          } ${
                            isSelected
                              ? 'ring-2 ring-blue-500 ring-inset dark:ring-blue-400'
                              : ''
                          } cursor-pointer`}
                        >
                          {/* Day Number Header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums ${
                                cell.isToday
                                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                                  : isSelected
                                  ? 'font-bold text-blue-600 dark:text-blue-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {cell.date.getDate()}
                            </span>

                            {cell.items.length > 0 && (
                              <span className="font-mono text-[10px] font-semibold text-slate-400">
                                {cell.items.length}
                              </span>
                            )}
                          </div>

                          {/* Event Indicators / Pills */}
                          <div className="mt-1 flex flex-1 flex-col gap-1 overflow-hidden">
                            {cell.items.slice(0, 3).map((item) => {
                              const isDeadline =
                                item.source === 'competition_deadline';
                              const isTask = item.source === 'task_deadline';

                              return (
                                <div
                                  key={item.id}
                                  className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                                    isDeadline
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                      : isTask
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : item.eventType === 'presentation'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}
                                  title={item.title}
                                >
                                  {item.title}
                                </div>
                              );
                            })}
                            {cell.items.length > 3 && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                +{cell.items.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Right Side: Selected Day Schedule Details (4 cols) */}
              <div className="lg:col-span-4">
                <Card variant="default">
                  <CardHeader>
                    <div>
                      <CardTitle>
                        Agenda:{' '}
                        {new Intl.DateTimeFormat('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }).format(selectedDayDate)}
                      </CardTitle>
                      <CardDescription>
                        {selectedDayItems.length} jadwal terdaftar pada hari ini.
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => openCreateModal(selectedDayDate)}
                    >
                      Tambah
                    </Button>
                  </CardHeader>

                  <CardContent>
                    {selectedDayItems.length === 0 ? (
                      <EmptyState
                        variant="compact"
                        icon={<CalendarDays className="h-5 w-5" />}
                        title="Tidak Ada Jadwal"
                        description="Belum ada deadline kompetisi, tenggat tugas, atau rapat yang dijadwalkan pada tanggal ini."
                        action={
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => openCreateModal(selectedDayDate)}
                          >
                            Jadwalkan Acara
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-3">
                        {selectedDayItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {renderItemBadge(item)}
                              <span className="font-mono text-[11px] tabular-nums text-slate-500">
                                {formatDateTimeWIB(item.startsAt)}
                              </span>
                            </div>

                            <h4 className="entity-name mt-2 font-display text-xs font-semibold">
                              {item.title}
                            </h4>

                            {item.description && (
                              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">
                                {item.description}
                              </p>
                            )}

                            <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              {item.competitionName && (
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {item.competitionName}
                                </span>
                              )}
                              {item.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[140px]">
                                    {item.location}
                                  </span>
                                </div>
                              )}
                              {item.assigneeName && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{item.assigneeName}</span>
                                </div>
                              )}
                            </div>

                            {/* Event edit/delete buttons for custom calendar events */}
                            {item.canEdit && (
                              <div className="mt-2 flex items-center justify-end gap-1 border-t border-dashed border-slate-200/60 pt-2 dark:border-slate-800">
                                {deleteConfirmId === item.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-rose-600">
                                      Hapus?
                                    </span>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteEvent(item.id.replace('event-', ''))
                                      }
                                    >
                                      Ya
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setDeleteConfirmId(null)}
                                    >
                                      Batal
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal(item)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                                      onClick={() => setDeleteConfirmId(item.id)}
                                    >
                                      Hapus
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* VIEW 2: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {weekDays.map((col) => (
                <div
                  key={col.dayName}
                  className={`flex min-h-[480px] flex-col rounded-xl border p-3 ${
                    col.isToday
                      ? 'border-blue-400 bg-blue-50/20 dark:border-blue-800 dark:bg-blue-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className="border-b border-slate-100 pb-2.5 text-center dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {col.dayName}
                    </div>
                    <div
                      className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-bold tabular-nums ${
                        col.isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {col.date.getDate()}
                    </div>
                  </div>

                  {/* Column Event Cards */}
                  <div className="mt-3 flex flex-1 flex-col gap-2">
                    {col.items.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center p-2 text-center text-[11px] text-slate-400">
                        Kosong
                      </div>
                    ) : (
                      col.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-200/90 bg-white p-2.5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-center justify-between">
                            {renderItemBadge(item)}
                          </div>
                          <h5 className="entity-name mt-1 font-semibold line-clamp-2">
                            {item.title}
                          </h5>
                          <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] tabular-nums text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Intl.DateTimeFormat('id-ID', {
                                timeZone: 'Asia/Jakarta',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              }).format(new Date(item.startsAt))}{' '}
                              WIB
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 3: AGENDA (LIST VIEW) */}
          {viewMode === 'agenda' && (
            <Card variant="default">
              <CardHeader>
                <div>
                  <CardTitle>Daftar Seluruh Agenda & Deadline</CardTitle>
                  <CardDescription>
                    Terurut secara kronologis dari waktu terdekat dalam zona waktu Asia/Jakarta (WIB).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDays className="h-6 w-6" />}
                    title="Tidak Ada Agenda Terdaftar"
                    description="Belum ada deadline kompetisi, tugas tim, atau event yang sesuai dengan filter pencarian Anda."
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => openCreateModal()}
                      >
                        Buat Jadwal Pertama
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderItemBadge(item)}
                            {item.competitionName && (
                              <span className="entity-name text-xs font-semibold">
                                {item.competitionName}
                              </span>
                            )}
                          </div>
                          <h4 className="entity-name font-display text-sm font-semibold">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="font-mono text-xs tabular-nums text-slate-700 sm:text-right dark:text-slate-300">
                            <div className="font-semibold">
                              {formatDateTimeWIB(item.startsAt)}
                            </div>
                            {item.endsAt && (
                              <div className="text-[11px] text-slate-400">
                                s/d {formatDateTimeWIB(item.endsAt)}
                              </div>
                            )}
                          </div>

                          {item.canEdit && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                                onClick={() =>
                                  handleDeleteEvent(item.id.replace('event-', ''))
                                }
                              >
                                Hapus
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Tambah Jadwal / Event' : 'Edit Jadwal Event'}
        description="Jadwalkan rapat koordinasi, presentasi lomba, atau milestone penting tim."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Agenda <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Rapat Evaluasi Pitch Deck & Demo Prototype"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jenis Agenda
              </label>
              <select
                value={eventForm.event_type}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    event_type: e.target.value as EventType,
                  })
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="meeting">Rapat Tim (Meeting)</option>
                <option value="presentation">Presentasi / Demo Lomba</option>
                <option value="other">Agenda Lainnya</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kompetisi Terkait
              </label>
              <select
                value={eventForm.competition_id}
                onChange={(e) =>
                  setEventForm({ ...eventForm, competition_id: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Umum / Tanpa Kompetisi Khusus</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Waktu Mulai (WIB) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="datetime-local"
                required
                value={eventForm.starts_at}
                onChange={(e) =>
                  setEventForm({ ...eventForm, starts_at: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Waktu Selesai (WIB)
              </label>
              <Input
                type="datetime-local"
                value={eventForm.ends_at}
                onChange={(e) =>
                  setEventForm({ ...eventForm, ends_at: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lokasi / Tautan Rapat
            </label>
            <Input
              placeholder="Contoh: https://meet.google.com/xyz-abcd-efg atau Lab RPL 2"
              value={eventForm.location}
              onChange={(e) =>
                setEventForm({ ...eventForm, location: e.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi & Agenda Pembahasan
            </label>
            <textarea
              rows={3}
              placeholder="Poin-poin pembahasan rapat atau catatan instruksi..."
              value={eventForm.description}
              onChange={(e) =>
                setEventForm({ ...eventForm, description: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              {modalMode === 'create' ? 'Simpan Jadwal' : 'Perbarui Jadwal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
