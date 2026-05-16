import 'package:hive_flutter/hive_flutter.dart';

import 'models.dart';

class LocalStore {
  static const _sessionBoxName = 'session_box';
  static const _ordersBoxName = 'orders_box';
  static const _inventoryBoxName = 'inventory_box';
  static const _syncQueueBoxName = 'sync_queue_box';
  static const _staffBoxName = 'staff_box';
  static const _tasksBoxName = 'tasks_box';
  static const _attendanceBoxName = 'attendance_box';

  late Box<dynamic> _sessionBox;
  late Box<dynamic> _ordersBox;
  late Box<dynamic> _inventoryBox;
  late Box<dynamic> _syncQueueBox;
  late Box<dynamic> _staffBox;
  late Box<dynamic> _tasksBox;
  late Box<dynamic> _attendanceBox;

  Future<void> init() async {
    await Hive.initFlutter();
    _sessionBox = await Hive.openBox<dynamic>(_sessionBoxName);
    _ordersBox = await Hive.openBox<dynamic>(_ordersBoxName);
    _inventoryBox = await Hive.openBox<dynamic>(_inventoryBoxName);
    _syncQueueBox = await Hive.openBox<dynamic>(_syncQueueBoxName);
    _staffBox = await Hive.openBox<dynamic>(_staffBoxName);
    _tasksBox = await Hive.openBox<dynamic>(_tasksBoxName);
    _attendanceBox = await Hive.openBox<dynamic>(_attendanceBoxName);
  }

  // ── Session ───────────────────────────────────────────────────────────────

  UserSession? readSession() {
    final raw = _sessionBox.get('active_session');
    if (raw is Map<dynamic, dynamic>) {
      return UserSession.fromJson(raw);
    }
    return null;
  }

  Future<void> writeSession(UserSession session) async {
    await _sessionBox.put('active_session', session.toJson());
  }

  Future<void> clearSession() async {
    await _sessionBox.delete('active_session');
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  List<StoreOrder> readOrders() {
    return _ordersBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(StoreOrder.fromJson)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> upsertOrder(StoreOrder order) async {
    await _ordersBox.put(order.id, order.toJson());
  }

  Future<void> replaceOrders(List<StoreOrder> orders) async {
    await _ordersBox.clear();
    for (final order in orders) {
      await upsertOrder(order);
    }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  List<InventoryItem> readInventory() {
    return _inventoryBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(InventoryItem.fromJson)
        .toList();
  }

  Future<void> replaceInventory(List<InventoryItem> items) async {
    await _inventoryBox.clear();
    for (final item in items) {
      final key = '${item.locationId}-${item.productId}';
      await _inventoryBox.put(key, item.toJson());
    }
  }

  // ── Sync Queue ────────────────────────────────────────────────────────────

  List<SyncAction> readQueue() {
    return _syncQueueBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(SyncAction.fromJson)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  Future<void> upsertQueueItem(SyncAction action) async {
    await _syncQueueBox.put(action.id, action.toJson());
  }

  Future<void> removeQueueItem(String id) async {
    await _syncQueueBox.delete(id);
  }

  // ── Staff Members ─────────────────────────────────────────────────────────

  List<StaffMember> readStaff() {
    return _staffBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(StaffMember.fromJson)
        .toList();
  }

  Future<void> replaceStaff(List<StaffMember> members) async {
    await _staffBox.clear();
    for (final m in members) {
      await _staffBox.put(m.id, m.toJson());
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  List<Task> readTasks() {
    return _tasksBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(Task.fromJson)
        .toList()
      ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
  }

  Future<void> upsertTask(Task task) async {
    await _tasksBox.put(task.id, task.toJson());
  }

  Future<void> replaceTasks(List<Task> tasks) async {
    await _tasksBox.clear();
    for (final t in tasks) {
      await _tasksBox.put(t.id, t.toJson());
    }
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  StaffAttendanceRecord? readTodayAttendance() {
    final raw = _attendanceBox.get('today');
    if (raw is Map<dynamic, dynamic>) {
      return StaffAttendanceRecord.fromJson(raw);
    }
    return null;
  }

  Future<void> writeTodayAttendance(StaffAttendanceRecord record) async {
    await _attendanceBox.put('today', record.toJson());
  }

  Future<void> clearTodayAttendance() async {
    await _attendanceBox.delete('today');
  }

  // ── Full Clear ────────────────────────────────────────────────────────────

  Future<void> clearAll() async {
    await _sessionBox.clear();
    await _ordersBox.clear();
    await _inventoryBox.clear();
    await _syncQueueBox.clear();
    await _staffBox.clear();
    await _tasksBox.clear();
    await _attendanceBox.clear();
  }
}
