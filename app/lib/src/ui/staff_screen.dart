import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/glass_card.dart';
import 'widgets/gradient_button.dart';
import 'widgets/notification_bell.dart';

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  int _navIndex = 0;

  @override
  Widget build(BuildContext context) {
    final appState = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    // Show snackbar for messages
    ref.listen(appControllerProvider, (prev, next) {
      if (next.message != null && next.message != prev?.message) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message!),
            backgroundColor: AppTheme.bgCard,
            behavior: SnackBarBehavior.floating,
          ),
        );
        controller.clearMessage();
      }
    });

    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
            index: _navIndex,
            children: [
              _DashboardTab(appState: appState, controller: controller),
              _AttendanceTab(appState: appState),
              _TasksTab(appState: appState, controller: controller),
              _ProfileTab(appState: appState, controller: controller),
            ],
          ),
        ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          top: BorderSide(color: AppTheme.surfaceLight.withValues(alpha: 0.3)),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppTheme.accent,
        unselectedItemColor: AppTheme.textMuted,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_month_rounded),
            label: 'Attendance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.task_alt_rounded),
            label: 'Tasks',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────────────────────────────────

class _DashboardTab extends ConsumerWidget {
  const _DashboardTab({required this.appState, required this.controller});
  final dynamic appState;
  final dynamic controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final ctrl = ref.read(appControllerProvider.notifier);
    final session = state.session;
    final today = state.todayAttendance;
    final tasks = state.myTasks
        .where(
          (t) =>
              t.status == TaskStatus.pending ||
              t.status == TaskStatus.inProgress,
        )
        .take(5)
        .toList();

    return RefreshIndicator(
      onRefresh: ctrl.refreshData,
      color: AppTheme.accent,
      backgroundColor: AppTheme.bgCard,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good ${_greeting()},',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      session?.name ?? 'Staff',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              if (state.loading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              const SizedBox(width: 4),
              const NotificationBell(),
            ],
          ),
          const SizedBox(height: 20),

          // Check-in / Check-out card
          _CheckInCard(today: today, controller: ctrl),
          const SizedBox(height: 20),

          // Today's tasks
          if (tasks.isNotEmpty) ...[
            Text(
              'Active Tasks (${tasks.length})',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            ...tasks.map((t) => _CompactTaskCard(task: t, controller: ctrl)),
          ] else
            GlassCard(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(
                        Icons.check_circle_outline_rounded,
                        color: AppTheme.success,
                        size: 40,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No active tasks',
                        style: TextStyle(color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }
}

class _CheckInCard extends ConsumerWidget {
  const _CheckInCard({required this.today, required this.controller});
  final StaffAttendanceRecord? today;
  final dynamic controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctrl = ref.read(appControllerProvider.notifier);
    final state = ref.watch(appControllerProvider);
    final checkedIn = today?.isCheckedIn ?? false;
    final checkedOut = today?.isCheckedOut ?? false;

    Color cardColor;
    String statusText;
    IconData statusIcon;

    if (!checkedIn) {
      cardColor = AppTheme.accent.withValues(alpha: 0.15);
      statusText = 'Not Checked In';
      statusIcon = Icons.login_rounded;
    } else if (!checkedOut) {
      cardColor = AppTheme.success.withValues(alpha: 0.15);
      statusText = 'Checked In';
      statusIcon = Icons.work_rounded;
    } else {
      cardColor = AppTheme.textMuted.withValues(alpha: 0.1);
      statusText = 'Day Complete';
      statusIcon = Icons.check_circle_rounded;
    }

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(statusIcon, color: AppTheme.accent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      statusText,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      DateFormat('EEEE, d MMMM').format(DateTime.now()),
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (checkedIn) ...[
            const SizedBox(height: 12),
            const Divider(color: Colors.white12),
            const SizedBox(height: 8),
            Row(
              children: [
                _TimeChip(
                  label: 'In',
                  time: today!.checkInTime != null
                      ? DateFormat('hh:mm a').format(today!.checkInTime!)
                      : '--:--',
                  color: AppTheme.success,
                ),
                const SizedBox(width: 12),
                if (checkedOut)
                  _TimeChip(
                    label: 'Out',
                    time: today!.checkOutTime != null
                        ? DateFormat('hh:mm a').format(today!.checkOutTime!)
                        : '--:--',
                    color: AppTheme.warning,
                  ),
                if (checkedOut) ...[
                  const SizedBox(width: 12),
                  _TimeChip(
                    label: 'Duration',
                    time: today!.workedDurationString,
                    color: AppTheme.accent,
                  ),
                ],
              ],
            ),
            if (today!.isLate) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Late by ${today!.lateByMinutes} min',
                  style: TextStyle(color: AppTheme.warning, fontSize: 12),
                ),
              ),
            ],
          ],
          const SizedBox(height: 16),
          if (!checkedIn)
            GradientButton(
              label: 'Check In',
              icon: Icons.login_rounded,
              loading: state.loading,
              onPressed: state.loading ? null : () => ctrl.staffCheckIn(),
            )
          else if (!checkedOut)
            OutlinedButton.icon(
              onPressed: state.loading ? null : () => ctrl.staffCheckOut(),
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Check Out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.warning,
                side: BorderSide(color: AppTheme.warning),
                minimumSize: const Size(double.infinity, 44),
              ),
            ),
        ],
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  const _TimeChip({
    required this.label,
    required this.time,
    required this.color,
  });
  final String label;
  final String time;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
        ),
        Text(
          time,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _CompactTaskCard extends StatelessWidget {
  const _CompactTaskCard({required this.task, required this.controller});
  final Task task;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColor(task.priority);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: priorityColor, width: 3)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        title: Text(
          task.title,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          'Due: ${DateFormat('d MMM').format(task.dueDate)} · ${task.status.label}',
          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
        ),
        trailing: task.isOverdue
            ? Icon(Icons.warning_amber_rounded, color: AppTheme.error, size: 18)
            : null,
      ),
    );
  }

  Color _priorityColor(TaskPriority p) => switch (p) {
    TaskPriority.urgent => AppTheme.error,
    TaskPriority.high => AppTheme.warning,
    TaskPriority.medium => AppTheme.accent,
    TaskPriority.low => AppTheme.success,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Tab
// ─────────────────────────────────────────────────────────────────────────────

class _AttendanceTab extends ConsumerStatefulWidget {
  const _AttendanceTab({required this.appState});
  final dynamic appState;

  @override
  ConsumerState<_AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends ConsumerState<_AttendanceTab> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final attendance = state.staffAttendance;

    // Build a map of date → status for quick lookup
    final Map<DateTime, AttendanceStatus> dayStatus = {};
    for (final r in attendance) {
      final d = DateTime(r.date.year, r.date.month, r.date.day);
      dayStatus[d] = r.status;
    }

    // Summary counts
    int present = 0, absent = 0, late = 0, leaves = 0;
    for (final r in attendance) {
      if (r.isLate) late++;
      switch (r.status) {
        case AttendanceStatus.present:
          present++;
        case AttendanceStatus.absent:
          absent++;
        case AttendanceStatus.leave:
        case AttendanceStatus.halfDay:
          leaves++;
        default:
          break;
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'My Attendance',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),

        // Summary chips
        Row(
          children: [
            _SummaryChip(label: 'Present', value: present, color: AppTheme.success),
            const SizedBox(width: 8),
            _SummaryChip(label: 'Absent', value: absent, color: AppTheme.error),
            const SizedBox(width: 8),
            _SummaryChip(label: 'Late', value: late, color: AppTheme.warning),
            const SizedBox(width: 8),
            _SummaryChip(label: 'Leave', value: leaves, color: AppTheme.accent),
          ],
        ),
        const SizedBox(height: 16),

        // Calendar
        GlassCard(
          child: TableCalendar(
            firstDay: DateTime(DateTime.now().year, 1, 1),
            lastDay: DateTime(DateTime.now().year, 12, 31),
            focusedDay: _focusedDay,
            selectedDayPredicate: (d) => isSameDay(_selectedDay, d),
            calendarFormat: CalendarFormat.month,
            availableCalendarFormats: const {CalendarFormat.month: 'Month'},
            onDaySelected: (selected, focused) {
              setState(() {
                _selectedDay = selected;
                _focusedDay = focused;
              });
            },
            onPageChanged: (focused) {
              setState(() => _focusedDay = focused);
            },
            calendarBuilders: CalendarBuilders(
              defaultBuilder: (context, day, focusedDay) {
                final key = DateTime(day.year, day.month, day.day);
                final status = dayStatus[key];
                if (status == null) return null;
                return _CalendarDayCell(day: day, status: status);
              },
              todayBuilder: (context, day, focusedDay) {
                final key = DateTime(day.year, day.month, day.day);
                final status = dayStatus[key];
                return _CalendarDayCell(day: day, status: status, isToday: true);
              },
            ),
            headerStyle: HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
              titleTextStyle: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              leftChevronIcon: Icon(
                Icons.chevron_left,
                color: AppTheme.textMuted,
              ),
              rightChevronIcon: Icon(
                Icons.chevron_right,
                color: AppTheme.textMuted,
              ),
            ),
            daysOfWeekStyle: DaysOfWeekStyle(
              weekdayStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              weekendStyle: TextStyle(
                color: AppTheme.warning.withValues(alpha: 0.7),
                fontSize: 12,
              ),
            ),
            calendarStyle: CalendarStyle(
              defaultTextStyle: const TextStyle(color: Colors.white),
              weekendTextStyle: TextStyle(color: AppTheme.textMuted),
              outsideTextStyle: TextStyle(
                color: AppTheme.textMuted.withValues(alpha: 0.4),
              ),
              todayDecoration: BoxDecoration(
                color: AppTheme.accent.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              todayTextStyle: TextStyle(
                color: AppTheme.accent,
                fontWeight: FontWeight.bold,
              ),
              selectedDecoration: BoxDecoration(
                color: AppTheme.accent,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Legend
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            _LegendChip(color: AppTheme.success, label: 'Present'),
            _LegendChip(color: AppTheme.error, label: 'Absent'),
            _LegendChip(color: AppTheme.warning, label: 'Late'),
            _LegendChip(color: AppTheme.accent, label: 'Leave'),
            _LegendChip(color: Colors.grey, label: 'Holiday'),
          ],
        ),

        // Selected day detail
        if (_selectedDay != null) ...[
          const SizedBox(height: 16),
          _SelectedDayDetail(
            day: _selectedDay!,
            records: attendance,
          ),
        ],
      ],
    );
  }
}

class _CalendarDayCell extends StatelessWidget {
  const _CalendarDayCell({
    required this.day,
    required this.status,
    this.isToday = false,
  });
  final DateTime day;
  final AttendanceStatus? status;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    Color dotColor = Colors.transparent;
    if (status != null) {
      dotColor = switch (status!) {
        AttendanceStatus.present => AppTheme.success,
        AttendanceStatus.absent => AppTheme.error,
        AttendanceStatus.halfDay => AppTheme.warning,
        AttendanceStatus.leave => AppTheme.accent,
        AttendanceStatus.holiday => Colors.grey,
      };
    }

    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isToday
            ? AppTheme.accent.withValues(alpha: 0.2)
            : Colors.transparent,
        shape: BoxShape.circle,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '${day.day}',
            style: TextStyle(
              color: isToday ? AppTheme.accent : Colors.white,
              fontSize: 12,
              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          if (status != null)
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
        ],
      ),
    );
  }
}

class _SelectedDayDetail extends StatelessWidget {
  const _SelectedDayDetail({required this.day, required this.records});
  final DateTime day;
  final List<StaffAttendanceRecord> records;

  @override
  Widget build(BuildContext context) {
    StaffAttendanceRecord? record;
    try {
      record = records.firstWhere(
        (r) =>
            r.date.year == day.year &&
            r.date.month == day.month &&
            r.date.day == day.day,
      );
    } catch (_) {}

    if (record == null) {
      return GlassCard(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Text(
            'No record for ${DateFormat('d MMMM').format(day)}',
            style: TextStyle(color: AppTheme.textMuted),
          ),
        ),
      );
    }

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            DateFormat('EEEE, d MMMM').format(day),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              if (record.checkInTime != null) ...[
                Icon(
                  Icons.login_rounded,
                  color: AppTheme.success,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  DateFormat('hh:mm a').format(record.checkInTime!),
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(width: 16),
              ],
              if (record.checkOutTime != null) ...[
                Icon(
                  Icons.logout_rounded,
                  color: AppTheme.warning,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  DateFormat('hh:mm a').format(record.checkOutTime!),
                  style: const TextStyle(color: Colors.white),
                ),
                const Spacer(),
                Text(
                  record.workedDurationString,
                  style: TextStyle(
                    color: AppTheme.accent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
          if (record.isLate)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Late by ${record.lateByMinutes} minutes',
                style: TextStyle(color: AppTheme.warning, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Text(
              '$value',
              style: TextStyle(
                color: color,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: TextStyle(color: AppTheme.textMuted, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks Tab
// ─────────────────────────────────────────────────────────────────────────────

class _TasksTab extends ConsumerStatefulWidget {
  const _TasksTab({required this.appState, required this.controller});
  final dynamic appState;
  final dynamic controller;

  @override
  ConsumerState<_TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends ConsumerState<_TasksTab> {
  String _filter = 'all'; // all | pending | in_progress | completed

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final ctrl = ref.read(appControllerProvider.notifier);

    final tasks = state.myTasks.where((t) {
      if (_filter == 'all') return true;
      if (_filter == 'pending') return t.status == TaskStatus.pending;
      if (_filter == 'in_progress') return t.status == TaskStatus.inProgress;
      if (_filter == 'completed') return t.status == TaskStatus.completed;
      return true;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'My Tasks',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (state.loading)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _FilterChip(
                label: 'All',
                selected: _filter == 'all',
                onTap: () => setState(() => _filter = 'all'),
              ),
              _FilterChip(
                label: 'Pending',
                selected: _filter == 'pending',
                onTap: () => setState(() => _filter = 'pending'),
              ),
              _FilterChip(
                label: 'In Progress',
                selected: _filter == 'in_progress',
                onTap: () => setState(() => _filter = 'in_progress'),
              ),
              _FilterChip(
                label: 'Completed',
                selected: _filter == 'completed',
                onTap: () => setState(() => _filter = 'completed'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        Expanded(
          child: tasks.isEmpty
              ? Center(
                  child: Text(
                    'No tasks',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: tasks.length,
                  itemBuilder: (context, i) =>
                      _TaskCard(task: tasks[i], controller: ctrl),
                ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? AppTheme.accent
              : AppTheme.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? AppTheme.accent
                : AppTheme.surfaceLight.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.black : AppTheme.textMuted,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, required this.controller});
  final Task task;
  final dynamic controller;

  Color _priorityColor(TaskPriority p) => switch (p) {
    TaskPriority.urgent => AppTheme.error,
    TaskPriority.high => AppTheme.warning,
    TaskPriority.medium => AppTheme.accent,
    TaskPriority.low => AppTheme.success,
  };

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColor(task.priority);
    final isDone = task.status == TaskStatus.completed ||
        task.status == TaskStatus.cancelled;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: priorityColor, width: 4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      color: isDone ? AppTheme.textMuted : Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      decoration: isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: priorityColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    task.priority.label,
                    style: TextStyle(
                      color: priorityColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            if (task.description.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                task.description,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  color: task.isOverdue ? AppTheme.error : AppTheme.textMuted,
                  size: 14,
                ),
                const SizedBox(width: 4),
                Text(
                  'Due ${DateFormat('d MMM yyyy').format(task.dueDate)}',
                  style: TextStyle(
                    color: task.isOverdue ? AppTheme.error : AppTheme.textMuted,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                _StatusPill(status: task.status),
              ],
            ),
            if (!isDone) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (task.status == TaskStatus.pending)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => controller.startTask(task.id),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.accent,
                          side: BorderSide(
                            color: AppTheme.accent.withValues(alpha: 0.5),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: const Text('Start'),
                      ),
                    ),
                  if (task.status == TaskStatus.inProgress)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _showCompleteDialog(context, task.id),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.success,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: const Text('Mark Complete'),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showCompleteDialog(BuildContext context, String taskId) {
    final noteCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text(
          'Complete Task',
          style: TextStyle(color: Colors.white),
        ),
        content: TextField(
          controller: noteCtrl,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Completion note (optional)',
            hintStyle: TextStyle(color: AppTheme.textMuted),
            enabledBorder: OutlineInputBorder(
              borderSide: BorderSide(
                color: AppTheme.surfaceLight.withValues(alpha: 0.3),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.accent),
            ),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              controller.completeTask(
                taskId,
                completionNote:
                    noteCtrl.text.trim().isEmpty ? null : noteCtrl.text.trim(),
              );
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.success,
            ),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final TaskStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      TaskStatus.pending => (AppTheme.textMuted, 'Pending'),
      TaskStatus.inProgress => (AppTheme.accent, 'In Progress'),
      TaskStatus.completed => (AppTheme.success, 'Done'),
      TaskStatus.cancelled => (AppTheme.error, 'Cancelled'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────────────────────────────────────

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab({required this.appState, required this.controller});
  final dynamic appState;
  final dynamic controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final ctrl = ref.read(appControllerProvider.notifier);
    final session = state.session;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'My Profile',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 20),

        // Avatar + name
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: AppTheme.accent.withValues(alpha: 0.2),
                child: Text(
                  _initials(session?.name ?? '?'),
                  style: TextStyle(
                    color: AppTheme.accent,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                session?.name ?? '—',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  session?.role.name.toUpperCase() ?? 'STAFF',
                  style: TextStyle(
                    color: AppTheme.accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Info card
        GlassCard(
          child: Column(
            children: [
              _InfoRow(
                icon: Icons.email_rounded,
                label: 'Email',
                value: session?.email ?? '—',
              ),
              const Divider(color: Colors.white12),
              _InfoRow(
                icon: Icons.location_on_rounded,
                label: 'Location',
                value: session?.locationId ?? '—',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Sync status
        if (state.syncQueue.isNotEmpty)
          GlassCard(
            child: Row(
              children: [
                Icon(Icons.sync_rounded, color: AppTheme.warning),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '${state.syncQueue.length} action(s) pending sync',
                    style: TextStyle(color: AppTheme.warning),
                  ),
                ),
                TextButton(
                  onPressed: () => ctrl.syncPendingActions(),
                  child: const Text('Sync Now'),
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),

        // Connectivity badge
        GlassCard(
          child: Row(
            children: [
              Icon(
                state.isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                color: state.isOnline ? AppTheme.success : AppTheme.error,
              ),
              const SizedBox(width: 12),
              Text(
                state.isOnline ? 'Online' : 'Offline — actions will queue',
                style: TextStyle(
                  color: state.isOnline ? AppTheme.success : AppTheme.error,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Logout
        OutlinedButton.icon(
          onPressed: () => ctrl.logout(),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Logout'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.error,
            side: BorderSide(color: AppTheme.error.withValues(alpha: 0.5)),
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
      ],
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.textMuted, size: 18),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
