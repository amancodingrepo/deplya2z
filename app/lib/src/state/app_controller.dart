import 'dart:async';
import 'dart:math' show asin, cos, pi, sin, sqrt;

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../core/local_store.dart';
import '../core/models.dart';
import '../data/mock_api.dart';
import 'app_state.dart';

class AppController extends StateNotifier<AppState> {
  AppController(this._store, this._api) : super(AppState.initial);

  final LocalStore _store;
  final MockApi _api;
  final _uuid = const Uuid();

  String _defaultWarehouseRef() {
    for (final location in state.locations) {
      if (location.type == 'warehouse') {
        return location.code;
      }
    }
    return 'WH01';
  }

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  // ── Init ──────────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    await _store.init();

    final session = _store.readSession();
    final orders = _store.readOrders();
    final inventory = _store.readInventory();
    final queue = _store.readQueue();
    final tasks = _store.readTasks();
    final todayAttendance = _store.readTodayAttendance();

    state = state.copyWith(
      initialized: true,
      session: session,
      orders: orders,
      inventory: inventory,
      syncQueue: queue,
      myTasks: tasks,
      todayAttendance: todayAttendance,
      isOnline: true,
    );

    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: online);
      if (online) {
        unawaited(syncPendingActions());
        unawaited(refreshData());
      }
    });

    if (session != null) {
      if (session.shouldRefreshToken) {
        try {
          final token = await _api.refreshToken(session.token);
          final refreshed = UserSession(
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
            locationId: session.locationId,
            token: token,
            expiry: DateTime.now().add(const Duration(hours: 24)),
          );
          await _store.writeSession(refreshed);
          state = state.copyWith(session: refreshed);
        } catch (_) {
          await _store.clearAll();
          state = state.copyWith(clearSession: true);
          return;
        }
      }

      if (state.isOnline) {
        await refreshData();
      }
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<void> login({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    if (!state.isOnline) {
      state = state.copyWith(
        message: 'No internet connection. Login requires connectivity.',
      );
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      final session = await _api.login(
        email: email,
        password: password,
        role: role,
      );
      await _store.writeSession(session);
      state = state.copyWith(session: session, loading: false);
      await refreshData();
    } catch (error) {
      state = state.copyWith(loading: false, message: error.toString());
    }
  }

  Future<void> logout() async {
    await _store.clearAll();
    state = AppState.initial.copyWith(
      initialized: true,
      isOnline: state.isOnline,
    );
  }

  // ── Data refresh ──────────────────────────────────────────────────────────

  Future<void> refreshData() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    state = state.copyWith(loading: true);
    try {
      if (session.role == UserRole.superadmin) {
        final users = await _api.fetchUsers(session.token);
        final locations = await _api.fetchLocations(session.token);
        final staff = await _api.fetchStaffRecordsForAdmin(
          token: session.token,
        );
        final adminInventory = await _api.fetchInventory('', session.token);
        final orders = await _api.fetchOrders(session);

        // Fetch bulk orders and clients — non-critical
        List<BulkOrder> bulkOrders = state.bulkOrders;
        List<Client> clients = state.clients;
        try {
          bulkOrders = await _api.fetchBulkOrders(session.token);
          clients = await _api.fetchClients(session.token);
        } catch (_) {}

        state = state.copyWith(
          loading: false,
          employees: users,
          locations: locations,
          attendanceRecords: staff.attendance,
          salaryPayouts: staff.salaryPayouts,
          leaveRecords: staff.leaveRecords,
          adminInventory: adminInventory,
          products: const <Product>[],
          orders: orders,
          inventory: const <InventoryItem>[],
          bulkOrders: bulkOrders,
          clients: clients,
        );
        return;
      }

      if (session.role == UserRole.staff) {
        await _refreshStaffData(session);
        return;
      }

      // Warehouse manager / Store manager
      final products = await _api.fetchProducts(session.token);
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      final orders = await _api.fetchOrders(session);
      final locations = await _api.fetchLocations(session.token);
      final staffBundle = await _api.fetchMyStaffRecords(session.token);

      // Load staff members for the manager's location
      List<StaffMember> staffMembers = [];
      List<AttendanceMonthlySummary> summaries = [];
      try {
        staffMembers = await _api.fetchStaffMembers(
          token: session.token,
          locationId: session.locationId,
        );
        final now = DateTime.now();
        summaries = await _api.fetchAttendanceSummary(
          token: session.token,
          locationId: session.locationId,
          month: now.month,
          year: now.year,
        );
      } catch (_) {
        // non-critical — gracefully ignore if not implemented yet
      }

      // Warehouse manager: also fetch bulk orders
      List<BulkOrder> bulkOrders = state.bulkOrders;
      if (session.role == UserRole.warehouseManager) {
        try {
          bulkOrders = await _api.fetchBulkOrders(session.token);
        } catch (_) {}
      }

      // Store manager: storeInventory = location-filtered inventory
      final storeInventory = session.role == UserRole.storeManager
          ? inventory
          : state.storeInventory;

      await _store.replaceInventory(inventory);
      await _store.replaceOrders(orders);
      if (staffMembers.isNotEmpty) {
        await _store.replaceStaff(staffMembers);
      }

      state = state.copyWith(
        loading: false,
        products: products,
        inventory: inventory,
        orders: orders,
        locations: locations,
        attendanceRecords: staffBundle.attendance,
        salaryPayouts: staffBundle.salaryPayouts,
        leaveRecords: staffBundle.leaveRecords,
        adminInventory: const <InventoryItem>[],
        employees: const <EmployeeUser>[],
        staffMembers: staffMembers,
        attendanceSummary: summaries,
        bulkOrders: bulkOrders,
        storeInventory: storeInventory,
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _refreshStaffData(UserSession session) async {
    try {
      final locations = await _api.fetchLocations(session.token);
      final tasks = await _api.fetchTasks(
        token: session.token,
        assignedToId: session.id,
      );
      final now = DateTime.now();
      final attendance = await _api.fetchStaffAttendance(
        token: session.token,
        month: now.month,
        year: now.year,
      );

      // Find today's record
      final todayDate = DateTime(now.year, now.month, now.day);
      StaffAttendanceRecord? todayRecord;
      try {
        todayRecord = attendance.firstWhere(
          (r) {
            final d = r.date;
            return d.year == todayDate.year &&
                d.month == todayDate.month &&
                d.day == todayDate.day;
          },
        );
      } catch (_) {
        todayRecord = null;
      }

      await _store.replaceTasks(tasks);
      if (todayRecord != null) {
        await _store.writeTodayAttendance(todayRecord);
      }

      state = state.copyWith(
        loading: false,
        locations: locations,
        myTasks: tasks,
        staffAttendance: attendance,
        todayAttendance: todayRecord,
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── GPS Attendance ────────────────────────────────────────────────────────

  /// Requests location permission and returns the current [Position].
  /// Throws a descriptive [Exception] on permission denial or service
  /// unavailability.
  Future<Position> _getPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception(
        'Location services are disabled. Please enable GPS and try again.',
      );
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception(
          'Location permission denied. Please allow location access.',
        );
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception(
        'Location permission permanently denied. '
        'Enable it in App Settings → Permissions.',
      );
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 15),
    );
  }

  /// Haversine distance in metres between two GPS coordinates.
  double _haversineMeters(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const earthRadius = 6371000.0; // metres
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final a =
        sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRad(lat1)) *
            cos(_toRad(lat2)) *
            sin(dLng / 2) *
            sin(dLng / 2);
    final c = 2 * asin(sqrt(a));
    return earthRadius * c;
  }

  double _toRad(double deg) => deg * pi / 180;

  /// GPS check-in for the currently logged-in staff member.
  Future<void> staffCheckIn({String? notes}) async {
    final session = state.session;
    if (session == null || session.role != UserRole.staff) {
      state = state.copyWith(message: 'Only staff can check in.');
      return;
    }

    if (state.todayAttendance?.isCheckedIn == true) {
      state = state.copyWith(message: 'Already checked in today.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      final pos = await _getPosition();
      final lat = pos.latitude;
      final lng = pos.longitude;

      // Validate against geofence if location has coords
      final myLocation = _findLocation(session.locationId);
      if (myLocation?.geoLat != null && myLocation?.geoLng != null) {
        final dist = _haversineMeters(
          lat,
          lng,
          myLocation!.geoLat!,
          myLocation.geoLng!,
        );
        final radius = myLocation.geofenceRadius ?? 200;
        if (dist > radius) {
          state = state.copyWith(
            loading: false,
            message:
                'You are ${dist.toStringAsFixed(0)} m away from your location. '
                'Must be within $radius m to check in.',
          );
          return;
        }
      }

      if (!state.isOnline) {
        // Queue offline check-in
        final action = SyncAction(
          id: _uuid.v4(),
          type: SyncActionType.checkIn,
          entityId: '',
          payload: {
            'lat': lat,
            'lng': lng,
            if (notes != null) 'notes': notes,
          },
          createdAt: DateTime.now(),
          status: SyncStatus.pendingUpload,
          retryCount: 0,
        );
        await _store.upsertQueueItem(action);
        state = state.copyWith(
          loading: false,
          syncQueue: [...state.syncQueue, action],
          message: 'Check-in saved offline. Will sync when online.',
        );
        return;
      }

      final record = await _api.staffCheckIn(
        token: session.token,
        lat: lat,
        lng: lng,
        notes: notes,
      );
      await _store.writeTodayAttendance(record);
      state = state.copyWith(
        loading: false,
        todayAttendance: record,
        message: 'Checked in successfully!',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  /// GPS check-out for the currently logged-in staff member.
  Future<void> staffCheckOut({String? notes}) async {
    final session = state.session;
    if (session == null || session.role != UserRole.staff) {
      state = state.copyWith(message: 'Only staff can check out.');
      return;
    }

    final today = state.todayAttendance;
    if (today == null || !today.isCheckedIn) {
      state = state.copyWith(message: 'You have not checked in today.');
      return;
    }
    if (today.isCheckedOut) {
      state = state.copyWith(message: 'Already checked out today.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      final pos = await _getPosition();
      final lat = pos.latitude;
      final lng = pos.longitude;

      if (!state.isOnline) {
        final action = SyncAction(
          id: _uuid.v4(),
          type: SyncActionType.checkOut,
          entityId: today.id,
          payload: {
            'lat': lat,
            'lng': lng,
            if (notes != null) 'notes': notes,
          },
          createdAt: DateTime.now(),
          status: SyncStatus.pendingUpload,
          retryCount: 0,
        );
        await _store.upsertQueueItem(action);
        state = state.copyWith(
          loading: false,
          syncQueue: [...state.syncQueue, action],
          message: 'Check-out saved offline. Will sync when online.',
        );
        return;
      }

      final record = await _api.staffCheckOut(
        token: session.token,
        attendanceId: today.id,
        lat: lat,
        lng: lng,
        notes: notes,
      );
      await _store.writeTodayAttendance(record);
      state = state.copyWith(
        loading: false,
        todayAttendance: record,
        message: 'Checked out successfully!',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  AppLocation? _findLocation(String locationId) {
    try {
      return state.locations.firstWhere(
        (l) => l.id == locationId || l.code == locationId,
      );
    } catch (_) {
      return null;
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  Future<void> createTask({
    required String title,
    required String description,
    required String assignedToId,
    required TaskPriority priority,
    required DateTime dueDate,
    String? relatedOrderId,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.storeManager) {
      state = state.copyWith(message: 'Only managers can create tasks.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Task creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createTask(
        token: session.token,
        title: title,
        description: description,
        locationId: session.locationId,
        assignedToId: assignedToId,
        priority: priority,
        dueDate: dueDate,
        relatedOrderId: relatedOrderId,
      );
      // Reload staff to update open_task_count
      final members = await _api.fetchStaffMembers(
        token: session.token,
        locationId: session.locationId,
      );
      await _store.replaceStaff(members);
      state = state.copyWith(
        loading: false,
        staffMembers: members,
        message: 'Task created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> startTask(String taskId) async {
    await _updateTaskStatus(taskId, TaskStatus.inProgress);
  }

  Future<void> completeTask(String taskId, {String? completionNote}) async {
    await _updateTaskStatus(
      taskId,
      TaskStatus.completed,
      completionNote: completionNote,
    );
  }

  Future<void> _updateTaskStatus(
    String taskId,
    TaskStatus status, {
    String? completionNote,
  }) async {
    final session = state.session;
    if (session == null) return;

    if (state.isOnline) {
      state = state.copyWith(loading: true, clearMessage: true);
      try {
        final updated = await _api.updateTaskStatus(
          token: session.token,
          taskId: taskId,
          status: status,
          completionNote: completionNote,
        );
        final tasks = state.myTasks.map((t) => t.id == taskId ? updated : t).toList();
        await _store.replaceTasks(tasks);
        state = state.copyWith(
          loading: false,
          myTasks: tasks,
          message: 'Task updated.',
        );
        return;
      } catch (_) {
        state = state.copyWith(loading: false);
      }
    }

    // Offline — update locally and queue
    final updatedTasks = state.myTasks.map((t) {
      if (t.id != taskId) return t;
      return t.copyWith(
        status: status,
        completedAt:
            status == TaskStatus.completed ? DateTime.now() : t.completedAt,
        completionNote: completionNote ?? t.completionNote,
        syncStatus: SyncStatus.pendingUpload,
      );
    }).toList();
    await _store.replaceTasks(updatedTasks);

    final actionType = status == TaskStatus.inProgress
        ? SyncActionType.startTask
        : SyncActionType.completeTask;
    final action = SyncAction(
      id: _uuid.v4(),
      type: actionType,
      entityId: taskId,
      payload: {
        if (completionNote != null) 'completionNote': completionNote,
      },
      createdAt: DateTime.now(),
      status: SyncStatus.pendingUpload,
      retryCount: 0,
    );
    await _store.upsertQueueItem(action);

    state = state.copyWith(
      myTasks: updatedTasks,
      syncQueue: [...state.syncQueue, action],
      message: 'Task updated offline. Will sync when online.',
    );
  }

  /// Manager loads detailed attendance for a specific staff member.
  Future<void> loadStaffAttendance({
    required String staffId,
    int? month,
    int? year,
  }) async {
    final session = state.session;
    if (session == null || !state.isOnline) return;

    try {
      final records = await _api.fetchStaffAttendance(
        token: session.token,
        staffId: staffId,
        month: month,
        year: year,
      );
      state = state.copyWith(staffAttendance: records);
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Image ─────────────────────────────────────────────────────────────────

  /// Update the local image path on an inventory item (camera/gallery pick).
  void setProductImage(String productId, String localPath) {
    final updatedInventory = state.inventory.map((item) {
      if (item.productId == productId) {
        return item.copyWith(localImagePath: localPath);
      }
      return item;
    }).toList();

    final updatedProducts = state.products.map((p) {
      if (p.id == productId) {
        return p.copyWith(localImagePath: localPath);
      }
      return p;
    }).toList();

    state = state.copyWith(
      inventory: updatedInventory,
      products: updatedProducts,
    );
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  Future<void> createOrderRequest({
    required String productId,
    required String title,
    required String sku,
    required int quantity,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.storeManager) {
      state = state.copyWith(
        message: 'Only store manager can create order requests.',
      );
      return;
    }

    final now = DateTime.now();
    final warehouseRef = _defaultWarehouseRef();

    if (state.isOnline) {
      try {
        await _api.createOrderOnline(
          session: session,
          warehouseId: warehouseRef,
          productId: productId,
          quantity: quantity,
          idempotencyKey: _uuid.v4(),
        );
        state = state.copyWith(message: 'Order submitted.');
        await refreshData();
        return;
      } catch (_) {
        state = state.copyWith(
          message: 'Online submit failed. Saved offline and queued for sync.',
        );
      }
    }

    final order = StoreOrder(
      id: _uuid.v4(),
      orderId:
          'ORD-ST01-${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}-${now.millisecond.toString().padLeft(4, '0')}',
      storeId: session.locationId,
      warehouseId: warehouseRef,
      status: OrderStatus.draft,
      items: [
        OrderItem(
          productId: productId,
          title: title,
          sku: sku,
          quantity: quantity,
        ),
      ],
      reservedAmount: quantity,
      createdAt: now,
      updatedAt: now,
      syncStatus: SyncStatus.pendingUpload,
    );

    final updatedOrders = [order, ...state.orders];
    await _store.upsertOrder(order);

    var updatedQueue = state.syncQueue;
    final action = SyncAction(
      id: _uuid.v4(),
      type: SyncActionType.createOrder,
      entityId: order.id,
      payload: {
        'storeId': session.locationId,
        'warehouseId': warehouseRef,
        'items': [
          {'product_id': productId, 'qty': quantity},
        ],
      },
      createdAt: now,
      status: SyncStatus.pendingUpload,
      retryCount: 0,
    );
    await _store.upsertQueueItem(action);
    updatedQueue = [...state.syncQueue, action];

    state = state.copyWith(
      orders: updatedOrders,
      syncQueue: updatedQueue,
      message: 'Order saved offline and queued for sync.',
    );
  }

  Future<void> transitionOrder(StoreOrder order, OrderStatus target) async {
    final session = state.session;
    if (session == null) return;

    if (state.isOnline) {
      try {
        await _api.transitionOrderOnline(
          session: session,
          orderRef: order.id,
          target: target,
        );
        state = state.copyWith(message: 'Order updated to ${target.name}.');
        await refreshData();
        return;
      } catch (_) {
        if (session.role == UserRole.superadmin) {
          state = state.copyWith(message: 'Failed to approve order online.');
          return;
        }
        state = state.copyWith(
          message: 'Online update failed. Saved offline and queued.',
        );
      }
    }

    if (session.role == UserRole.superadmin) {
      state = state.copyWith(
        message: 'Superadmin order approval requires internet.',
      );
      return;
    }

    final updated = order.copyWith(
      status: target,
      updatedAt: DateTime.now(),
      syncStatus: SyncStatus.pendingUpload,
    );

    final updatedOrders = state.orders
        .map((o) => o.id == order.id ? updated : o)
        .toList(growable: false);
    await _store.upsertOrder(updated);

    var updatedQueue = state.syncQueue;
    final actionType = switch (target) {
      OrderStatus.packed => SyncActionType.markPacked,
      OrderStatus.dispatched => SyncActionType.markDispatched,
      OrderStatus.storeReceived ||
      OrderStatus.completed => SyncActionType.confirmReceive,
      _ => SyncActionType.markPacked,
    };

    final action = SyncAction(
      id: _uuid.v4(),
      type: actionType,
      entityId: order.id,
      payload: {'orderId': order.id, 'status': target.name},
      createdAt: DateTime.now(),
      status: SyncStatus.pendingUpload,
      retryCount: 0,
    );
    await _store.upsertQueueItem(action);
    updatedQueue = [...state.syncQueue, action];

    state = state.copyWith(
      orders: updatedOrders,
      syncQueue: updatedQueue,
      message: 'Order updated offline and queued.',
    );
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  Future<void> syncPendingActions() async {
    if (!state.isOnline || state.syncQueue.isEmpty || state.session == null) {
      return;
    }

    final currentQueue = [...state.syncQueue];
    final nextQueue = <SyncAction>[];

    for (final action in currentQueue) {
      if (action.status == SyncStatus.synced) {
        continue;
      }

      try {
        await _api.syncAction(action, state.session!);
        await _store.removeQueueItem(action.id);
      } catch (error) {
        final failed = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          errorMessage: error.toString(),
        );
        await _store.upsertQueueItem(failed);
        nextQueue.add(failed);
      }
    }

    state = state.copyWith(
      syncQueue: nextQueue,
      message: nextQueue.isEmpty
          ? 'Synced successfully.'
          : '${nextQueue.length} queued action(s) need manual review.',
    );
  }

  // ── Employees (superadmin) ────────────────────────────────────────────────

  Future<void> createEmployee({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    String? locationId,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can manage employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Employee creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createEmployeeUser(
        token: session.token,
        email: email.trim(),
        name: name.trim(),
        password: password,
        role: role,
        locationId: locationId,
      );
      final users = await _api.fetchUsers(session.token);
      state = state.copyWith(
        loading: false,
        employees: users,
        message: 'Employee created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> setEmployeeActive(String userId, bool active) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can manage employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Status update requires internet.');
      return;
    }

    try {
      final updated = await _api.updateEmployeeStatus(
        token: session.token,
        userId: userId,
        active: active,
      );
      final employees = state.employees
          .map((user) => user.id == updated.id ? updated : user)
          .toList(growable: false);
      state = state.copyWith(
        employees: employees,
        message: 'Employee status updated.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> deleteEmployee(String userId) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can delete employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'User deletion requires internet.');
      return;
    }

    try {
      await _api.deleteEmployeeUser(token: session.token, userId: userId);
      final users = await _api.fetchUsers(session.token);
      state = state.copyWith(
        employees: users,
        message: 'Employee deleted successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> addAttendanceForEmployee({
    required String userId,
    required DateTime attendanceDate,
    required AttendanceStatus status,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can add attendance.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Attendance update requires internet.');
      return;
    }

    try {
      await _api.addAttendance(
        token: session.token,
        userId: userId,
        date: attendanceDate,
        status: status,
      );
      final staff = await _api.fetchStaffRecordsForAdmin(token: session.token);
      state = state.copyWith(
        attendanceRecords: staff.attendance,
        salaryPayouts: staff.salaryPayouts,
        leaveRecords: staff.leaveRecords,
        message: 'Attendance saved.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  Future<void> createInventoryItem({
    required String sku,
    required String title,
    required String brand,
    required int totalStock,
    String? category,
    String? model,
    String? color,
    String? locationId,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can create inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.createInventoryItem(
        token: session.token,
        locationId: targetLocation,
        sku: sku,
        title: title,
        brand: brand,
        totalStock: totalStock,
        category: category,
        model: model,
        color: color,
        imageBytes: imageBytes,
        imageFilename: imageFilename,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item created.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> updateInventoryItem({
    required String productRef,
    int? totalStock,
    int? reservedStock,
    int? issuedStock,
    String? title,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    String? locationId,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can update inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.updateInventoryItem(
        token: session.token,
        productRef: productRef,
        locationId: targetLocation,
        totalStock: totalStock,
        reservedStock: reservedStock,
        issuedStock: issuedStock,
        title: title,
        brand: brand,
        category: category,
        model: model,
        color: color,
        status: status,
        imageBytes: imageBytes,
        imageFilename: imageFilename,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item updated.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> deleteInventoryItem({
    required String productRef,
    String? locationId,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can delete inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.deleteInventoryItem(
        token: session.token,
        productRef: productRef,
        locationId: targetLocation,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item deleted.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Order – reject / dispatch with notes ─────────────────────────────────

  Future<void> rejectOrder(StoreOrder order, String reason) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only managers can reject orders.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Order rejection requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.rejectOrder(
        token: session.token,
        orderRef: order.id,
        reason: reason,
      );
      await refreshData();
      state = state.copyWith(message: 'Order rejected.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> dispatchOrderWithNotes(
    StoreOrder order, {
    String? notes,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only managers can dispatch orders.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Dispatch requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.dispatchOrderWithNotes(
        token: session.token,
        orderRef: order.id,
        notes: notes,
      );
      await refreshData();
      state = state.copyWith(message: 'Order dispatched.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Cart (store manager multi-item ordering) ──────────────────────────────

  void addToCart(CartItem item) {
    final existing = state.cart.indexWhere((c) => c.productId == item.productId);
    if (existing >= 0) {
      final updated = state.cart.toList();
      updated[existing] = CartItem(
        productId: item.productId,
        title: item.title,
        sku: item.sku,
        brand: item.brand,
        quantity: updated[existing].quantity + item.quantity,
        availableStock: item.availableStock,
        imageUrl: item.imageUrl,
      );
      state = state.copyWith(cart: updated);
    } else {
      state = state.copyWith(cart: [...state.cart, item]);
    }
  }

  void removeFromCart(String productId) {
    state = state.copyWith(
      cart: state.cart.where((c) => c.productId != productId).toList(),
    );
  }

  void updateCartQty(String productId, int quantity) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    state = state.copyWith(
      cart: state.cart.map((c) {
        if (c.productId != productId) return c;
        return CartItem(
          productId: c.productId,
          title: c.title,
          sku: c.sku,
          brand: c.brand,
          quantity: quantity,
          availableStock: c.availableStock,
          imageUrl: c.imageUrl,
        );
      }).toList(),
    );
  }

  void clearCart() {
    state = state.copyWith(cart: const <CartItem>[]);
  }

  Future<void> submitCart() async {
    final session = state.session;
    if (session == null || session.role != UserRole.storeManager) {
      state = state.copyWith(
        message: 'Only store manager can submit orders.',
      );
      return;
    }

    if (state.cart.isEmpty) {
      state = state.copyWith(message: 'Cart is empty.');
      return;
    }

    final warehouseRef = _defaultWarehouseRef();

    if (state.isOnline) {
      state = state.copyWith(loading: true, clearMessage: true);
      try {
        final items = state.cart
            .map((c) => {'product_id': c.productId, 'qty': c.quantity})
            .toList();
        await _api.createMultiItemOrderOnline(
          session: session,
          warehouseId: warehouseRef,
          items: items,
          idempotencyKey: _uuid.v4(),
        );
        state = state.copyWith(cart: const <CartItem>[]);
        await refreshData();
        state = state.copyWith(message: 'Order submitted successfully.');
        return;
      } catch (_) {
        state = state.copyWith(
          message: 'Online submit failed. Saving offline.',
        );
      }
    }

    // Offline fallback — one order per cart item
    final now = DateTime.now();
    final newOrders = <StoreOrder>[];
    final newActions = <SyncAction>[];

    for (final cartItem in state.cart) {
      final order = StoreOrder(
        id: _uuid.v4(),
        orderId:
            'ORD-${session.locationId}-${now.millisecondsSinceEpoch}',
        storeId: session.locationId,
        warehouseId: warehouseRef,
        status: OrderStatus.draft,
        items: [
          OrderItem(
            productId: cartItem.productId,
            title: cartItem.title,
            sku: cartItem.sku,
            quantity: cartItem.quantity,
          ),
        ],
        reservedAmount: cartItem.quantity,
        createdAt: now,
        updatedAt: now,
        syncStatus: SyncStatus.pendingUpload,
      );
      await _store.upsertOrder(order);
      newOrders.add(order);

      final action = SyncAction(
        id: _uuid.v4(),
        type: SyncActionType.createOrder,
        entityId: order.id,
        payload: {
          'storeId': session.locationId,
          'warehouseId': warehouseRef,
          'items': [
            {'product_id': cartItem.productId, 'qty': cartItem.quantity},
          ],
        },
        createdAt: now,
        status: SyncStatus.pendingUpload,
        retryCount: 0,
      );
      await _store.upsertQueueItem(action);
      newActions.add(action);
    }

    state = state.copyWith(
      orders: [...newOrders, ...state.orders],
      syncQueue: [...state.syncQueue, ...newActions],
      cart: const <CartItem>[],
      message: 'Orders saved offline and queued for sync.',
    );
  }

  // ── Bulk Orders ───────────────────────────────────────────────────────────

  Future<void> fetchAndStoreBulkOrders() async {
    final session = state.session;
    if (session == null || !state.isOnline) return;

    try {
      final bulkOrders = await _api.fetchBulkOrders(session.token);
      state = state.copyWith(bulkOrders: bulkOrders);
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> transitionBulkOrder(String orderId, String target) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only managers can update bulk orders.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Bulk order update requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.transitionBulkOrder(
        token: session.token,
        orderId: orderId,
        target: BulkOrderStatus.values.firstWhere(
          (s) => s.name == target,
          orElse: () => BulkOrderStatus.confirmed,
        ),
      );
      final bulkOrders = await _api.fetchBulkOrders(session.token);
      state = state.copyWith(
        loading: false,
        bulkOrders: bulkOrders,
        message: 'Bulk order updated to $target.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> createBulkOrder({
    required String clientId,
    required String warehouseId,
    required List<Map<String, dynamic>> items,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can create bulk orders.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Bulk order creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createBulkOrder(
        token: session.token,
        clientId: clientId,
        warehouseId: warehouseId,
        items: items,
      );
      final bulkOrders = await _api.fetchBulkOrders(session.token);
      state = state.copyWith(
        loading: false,
        bulkOrders: bulkOrders,
        message: 'Bulk order created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Stock adjustments & transfers ─────────────────────────────────────────

  Future<void> adjustStock({
    required String productRef,
    required int newQuantity,
    required String reason,
    String? locationId,
    String? notes,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can adjust stock.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Stock adjustment requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.adjustStock(
        token: session.token,
        productRef: productRef,
        locationId: targetLocation,
        newQuantity: newQuantity,
        reason: reason,
        notes: notes,
      );
      await refreshData();
      state = state.copyWith(message: 'Stock adjusted successfully.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> transferStock({
    required String fromLocationId,
    required String toLocationId,
    required String productId,
    required int quantity,
    String? note,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.warehouseManager &&
        session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can transfer stock.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Stock transfer requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.transferStock(
        token: session.token,
        fromLocationId: fromLocationId,
        toLocationId: toLocationId,
        productId: productId,
        quantity: quantity,
        note: note,
      );
      await refreshData();
      state = state.copyWith(message: 'Stock transferred successfully.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> fetchStockMovements({
    String? locationId,
    String? productId,
  }) async {
    final session = state.session;
    if (session == null || !state.isOnline) return;

    try {
      final movements = await _api.fetchStockMovements(
        token: session.token,
        locationId: locationId ?? session.locationId,
        productId: productId,
      );
      state = state.copyWith(stockMovements: movements);
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Products CRUD (superadmin) ────────────────────────────────────────────

  Future<void> createProduct({
    required String title,
    required String shortName,
    required String sku,
    required String brand,
    String? category,
    String? model,
    String? color,
    String? status,
    String? customStyle,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can create products.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Product creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createProduct(
        token: session.token,
        title: title,
        shortName: shortName,
        sku: sku,
        brand: brand,
        category: category ?? '',
        model: model ?? '',
        color: color ?? '',
        status: status ?? 'present',
        customStyle: customStyle ?? 'default',
      );
      await refreshData();
      state = state.copyWith(message: 'Product created successfully.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> updateProduct({
    required String productId,
    String? title,
    String? shortName,
    String? sku,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    String? customStyle,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can update products.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Product update requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.updateProduct(
        token: session.token,
        productId: productId,
        title: title,
        shortName: shortName,
        brand: brand,
        category: category,
        model: model,
        color: color,
        status: status,
        customStyle: customStyle,
      );
      await refreshData();
      state = state.copyWith(message: 'Product updated successfully.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> deleteProduct(String productId) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can delete products.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Product deletion requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.deleteProduct(token: session.token, productId: productId);
      await refreshData();
      state = state.copyWith(message: 'Product deleted successfully.');
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Locations CRUD (superadmin) ───────────────────────────────────────────

  Future<void> createLocation({
    required String code,
    required String name,
    required String type,
    String? address,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can create locations.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Location creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createLocation(
        token: session.token,
        code: code,
        name: name,
        type: type,
        address: address ?? '',
      );
      final locations = await _api.fetchLocations(session.token);
      state = state.copyWith(
        loading: false,
        locations: locations,
        message: 'Location created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> updateLocation({
    required String locationId,
    String? name,
    String? address,
    bool? active,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can update locations.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Location update requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.updateLocation(
        token: session.token,
        locationId: locationId,
        name: name,
        address: address,
        status: active == null ? null : (active ? 'active' : 'inactive'),
      );
      final locations = await _api.fetchLocations(session.token);
      state = state.copyWith(
        loading: false,
        locations: locations,
        message: 'Location updated successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Clients (superadmin) ──────────────────────────────────────────────────

  Future<void> fetchAndStoreClients() async {
    final session = state.session;
    if (session == null || !state.isOnline) return;

    try {
      final clients = await _api.fetchClients(session.token);
      state = state.copyWith(clients: clients);
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> createClient({
    required String name,
    required String code,
    required String contactName,
    required String contactEmail,
    String? phone,
    String? address,
    String? city,
    String? gstNumber,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can create clients.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Client creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createClient(
        token: session.token,
        name: name,
        code: code,
        contactName: contactName,
        contactEmail: contactEmail,
        phone: phone ?? '',
        address: address ?? '',
        city: city ?? '',
        gstNumber: gstNumber ?? '',
      );
      final clients = await _api.fetchClients(session.token);
      state = state.copyWith(
        loading: false,
        clients: clients,
        message: 'Client created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> updateClientStatus(String clientId, String status) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can update client status.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Client update requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.updateClientStatus(
        token: session.token,
        clientId: clientId,
        status: status,
      );
      final clients = await _api.fetchClients(session.token);
      state = state.copyWith(
        loading: false,
        clients: clients,
        message: 'Client status updated.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Employee management (superadmin) ──────────────────────────────────────

  Future<void> editEmployee({
    required String userId,
    String? name,
    String? email,
    UserRole? role,
    String? locationId,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can edit employees.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Employee edit requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.updateEmployee(
        token: session.token,
        userId: userId,
        name: name,
        email: email,
        role: role?.name,
        locationId: locationId,
      );
      final users = await _api.fetchUsers(session.token);
      state = state.copyWith(
        loading: false,
        employees: users,
        message: 'Employee updated successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> resetEmployeePassword({
    required String userId,
    required String newPassword,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(
        message: 'Only superadmin can reset passwords.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Password reset requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.resetEmployeePassword(
        token: session.token,
        userId: userId,
        newPassword: newPassword,
      );
      state = state.copyWith(
        loading: false,
        message: 'Password reset successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  void clearMessage() {
    state = state.copyWith(clearMessage: true);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }
}
