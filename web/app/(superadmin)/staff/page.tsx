'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { getToken } from '../../../lib/auth';
import {
  apiCreateTask,
  apiStaffAttendance,
  apiStaffMembers,
  apiStaffTasks,
  apiStaffAttendanceSummary,
  type AttendanceRecord,
  type StaffMember,
  type Task,
} from '../../../lib/api';

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [staffId, setStaffId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [creating, setCreating] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<{ present: number; absent: number; late: number; half_day: number; leave: number } | null>(null);

  const loadAll = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [memberRows, taskRows] = await Promise.all([apiStaffMembers(token), apiStaffTasks(token)]);
      setMembers(memberRows);
      setTasks(taskRows);
      if (staffId) {
        const attendanceRows = await apiStaffAttendance(token, { staff_id: staffId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined });
        setAttendance(attendanceRows);
      } else {
        setAttendance([]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }, [staffId, dateFrom, dateTo]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function fetchAttendance() {
    const token = getToken();
    if (!token) return;
    try {
      setError('');
      const rows = await apiStaffAttendance(token, {
        staff_id: staffId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setAttendance(rows);
      if (staffId) {
        const now = new Date();
        const summary = await apiStaffAttendanceSummary(token, { staff_id: staffId, year: now.getFullYear(), month: now.getMonth() + 1 });
        setAttendanceSummary(summary);
      } else {
        setAttendanceSummary(null);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load attendance');
    }
  }

  async function createTask() {
    if (!title.trim()) return;
    const token = getToken();
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      await apiCreateTask(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to_staff_id: assignedTo || undefined,
        priority,
      });
      setTitle('');
      setDescription('');
      setAssignedTo('');
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  const presentCount = useMemo(() => attendance.filter((r) => r.status === 'present').length, [attendance]);
  const lateCount = useMemo(() => attendance.filter((r) => r.status === 'late').length, [attendance]);
  const selectedStaffTasks = useMemo(() => staffId ? tasks.filter(t => t.assigned_to_id === staffId) : tasks, [tasks, staffId]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">Staff</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Attendance visibility and task assignment</p>
      </div>

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[12px] font-medium mb-1">Staff Member</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
              <option value="">Select staff</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.location_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
          </div>
          <Button size="sm" onClick={fetchAttendance}>Load Attendance</Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Badge variant="success">{presentCount} Present</Badge>
          <Badge variant="warning">{lateCount} Late</Badge>
          <Badge>{attendance.length} Records</Badge>
          {attendanceSummary && (
            <Badge variant="default">
              Month: P{attendanceSummary.present} A{attendanceSummary.absent} L{attendanceSummary.late}
            </Badge>
          )}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Date</th>
                <th className="py-2">Status</th>
                <th className="py-2">Check-in</th>
                <th className="py-2">Check-out</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="py-2">{a.date}</td>
                  <td className="py-2">{a.status}</td>
                  <td className="py-2">{a.check_in_time ?? '-'}</td>
                  <td className="py-2">{a.check_out_time ?? '-'}</td>
                </tr>
              ))}
              {!loading && attendance.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-muted-foreground">No attendance records loaded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-[16px] font-semibold">Assign Task</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.location_code})</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={createTask} disabled={creating || !title.trim()}>
            {creating ? 'Assigning...' : 'Assign Task'}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-[16px] font-semibold">Recent Tasks</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Task</th>
                <th className="py-2">Assignee</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedStaffTasks.map((t) => (
                <tr key={t.id} className="border-b border-border/60">
                  <td className="py-2">{t.title}</td>
                  <td className="py-2">{t.assignee_name ?? '-'}</td>
                  <td className="py-2">{t.priority}</td>
                  <td className="py-2">{t.status}</td>
                </tr>
              ))}
              {!loading && selectedStaffTasks.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-muted-foreground">No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
