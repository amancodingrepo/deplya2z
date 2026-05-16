import {
  createAttendanceCheckIn,
  getAttendanceByStaffAndDate,
  getStaffMemberByUserId,
  updateAttendanceCheckOut,
} from '../repositories/staffRepository.js';

// Shift start hour in 24h format — adjust per org policy
const SHIFT_START_HOUR = 9;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function appError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export async function staffCheckIn(userId: string, lat: number, lng: number) {
  const staffMember = await getStaffMemberByUserId(userId);
  if (!staffMember) throw appError('Staff profile not found', 'NOT_FOUND');

  const today = new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceByStaffAndDate(staffMember.id, today);
  if (existing?.check_in_time) {
    throw appError('Already checked in today', 'ALREADY_CHECKED_IN');
  }

  const locLat: number | null = staffMember.latitude ?? null;
  const locLng: number | null = staffMember.longitude ?? null;
  const radius: number = staffMember.geofence_radius_meters ?? 200;

  let distanceMeters = 0;
  let isWithinGeofence = true;

  if (locLat != null && locLng != null) {
    distanceMeters = Math.round(haversineMeters(lat, lng, locLat, locLng));
    isWithinGeofence = distanceMeters <= radius;
  }

  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);
  const isLate = now > shiftStart;
  const lateByMinutes = isLate ? Math.round((now.getTime() - shiftStart.getTime()) / 60_000) : 0;

  return createAttendanceCheckIn({
    staffId: staffMember.id,
    date: today,
    checkInTime: now.toISOString(),
    lat,
    lng,
    distanceMeters,
    isWithinGeofence,
    isLate,
    lateByMinutes,
    status: isLate ? 'late' : 'present',
  });
}

export async function staffCheckOut(
  userId: string,
  attendanceId: string,
  lat: number,
  lng: number,
) {
  const staffMember = await getStaffMemberByUserId(userId);
  if (!staffMember) throw appError('Staff profile not found', 'NOT_FOUND');

  const locLat: number | null = staffMember.latitude ?? null;
  const locLng: number | null = staffMember.longitude ?? null;

  let distanceMeters = 0;
  if (locLat != null && locLng != null) {
    distanceMeters = Math.round(haversineMeters(lat, lng, locLat, locLng));
  }

  const updated = await updateAttendanceCheckOut(attendanceId, {
    checkOutTime: new Date().toISOString(),
    lat,
    lng,
    distanceMeters,
  });

  if (!updated) throw appError('Attendance record not found', 'NOT_FOUND');
  return updated;
}
