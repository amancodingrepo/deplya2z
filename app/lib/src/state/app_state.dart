import '../core/models.dart';

class AppState {
  const AppState({
    required this.initialized,
    required this.isOnline,
    required this.loading,
    required this.session,
    required this.products,
    required this.orders,
    required this.inventory,
    required this.employees,
    required this.locations,
    required this.syncQueue,
    required this.attendanceRecords,
    required this.salaryPayouts,
    required this.leaveRecords,
    required this.adminInventory,
    required this.message,
    // Staff Management
    required this.staffMembers,
    required this.myTasks,
    this.todayAttendance,
    required this.staffAttendance,
    required this.attendanceSummary,
    // New features
    required this.bulkOrders,
    required this.clients,
    required this.cart,
    required this.storeInventory,
    required this.stockMovements,
    // Notifications
    required this.notifications,
    required this.unreadNotificationCount,
  });

  final bool initialized;
  final bool isOnline;
  final bool loading;
  final UserSession? session;
  final List<Product> products;
  final List<StoreOrder> orders;
  final List<InventoryItem> inventory;
  final List<EmployeeUser> employees;
  final List<AppLocation> locations;
  final List<SyncAction> syncQueue;
  final List<AttendanceRecord> attendanceRecords;
  final List<SalaryPayoutRecord> salaryPayouts;
  final List<LeaveRecord> leaveRecords;
  final List<InventoryItem> adminInventory;
  final String? message;

  // ── Staff Management ──────────────────────────────────────────────────────
  final List<StaffMember> staffMembers;
  final List<Task> myTasks;
  final StaffAttendanceRecord? todayAttendance;
  final List<StaffAttendanceRecord> staffAttendance;
  final List<AttendanceMonthlySummary> attendanceSummary;

  // ── New features ──────────────────────────────────────────────────────────
  final List<BulkOrder> bulkOrders;
  final List<Client> clients;
  final List<CartItem> cart;
  final List<InventoryItem> storeInventory;
  final List<StockMovement> stockMovements;

  // ── Notifications ─────────────────────────────────────────────────────────
  final List<AppNotification> notifications;
  final int unreadNotificationCount;

  bool get isLoggedIn => session != null;
  int get cartItemCount => cart.fold(0, (sum, c) => sum + c.quantity);

  AppState copyWith({
    bool? initialized,
    bool? isOnline,
    bool? loading,
    UserSession? session,
    bool clearSession = false,
    List<Product>? products,
    List<StoreOrder>? orders,
    List<InventoryItem>? inventory,
    List<EmployeeUser>? employees,
    List<AppLocation>? locations,
    List<SyncAction>? syncQueue,
    List<AttendanceRecord>? attendanceRecords,
    List<SalaryPayoutRecord>? salaryPayouts,
    List<LeaveRecord>? leaveRecords,
    List<InventoryItem>? adminInventory,
    String? message,
    bool clearMessage = false,
    List<StaffMember>? staffMembers,
    List<Task>? myTasks,
    StaffAttendanceRecord? todayAttendance,
    bool clearTodayAttendance = false,
    List<StaffAttendanceRecord>? staffAttendance,
    List<AttendanceMonthlySummary>? attendanceSummary,
    List<BulkOrder>? bulkOrders,
    List<Client>? clients,
    List<CartItem>? cart,
    List<InventoryItem>? storeInventory,
    List<StockMovement>? stockMovements,
    List<AppNotification>? notifications,
    int? unreadNotificationCount,
  }) {
    return AppState(
      initialized: initialized ?? this.initialized,
      isOnline: isOnline ?? this.isOnline,
      loading: loading ?? this.loading,
      session: clearSession ? null : (session ?? this.session),
      products: products ?? this.products,
      orders: orders ?? this.orders,
      inventory: inventory ?? this.inventory,
      employees: employees ?? this.employees,
      locations: locations ?? this.locations,
      syncQueue: syncQueue ?? this.syncQueue,
      attendanceRecords: attendanceRecords ?? this.attendanceRecords,
      salaryPayouts: salaryPayouts ?? this.salaryPayouts,
      leaveRecords: leaveRecords ?? this.leaveRecords,
      adminInventory: adminInventory ?? this.adminInventory,
      message: clearMessage ? null : (message ?? this.message),
      staffMembers: staffMembers ?? this.staffMembers,
      myTasks: myTasks ?? this.myTasks,
      todayAttendance: clearTodayAttendance
          ? null
          : (todayAttendance ?? this.todayAttendance),
      staffAttendance: staffAttendance ?? this.staffAttendance,
      attendanceSummary: attendanceSummary ?? this.attendanceSummary,
      bulkOrders: bulkOrders ?? this.bulkOrders,
      clients: clients ?? this.clients,
      cart: cart ?? this.cart,
      storeInventory: storeInventory ?? this.storeInventory,
      stockMovements: stockMovements ?? this.stockMovements,
      notifications: notifications ?? this.notifications,
      unreadNotificationCount: unreadNotificationCount ?? this.unreadNotificationCount,
    );
  }

  static const initial = AppState(
    initialized: false,
    isOnline: true,
    loading: false,
    session: null,
    products: <Product>[],
    orders: <StoreOrder>[],
    inventory: <InventoryItem>[],
    employees: <EmployeeUser>[],
    locations: <AppLocation>[],
    syncQueue: <SyncAction>[],
    attendanceRecords: <AttendanceRecord>[],
    salaryPayouts: <SalaryPayoutRecord>[],
    leaveRecords: <LeaveRecord>[],
    adminInventory: <InventoryItem>[],
    message: null,
    staffMembers: <StaffMember>[],
    myTasks: <Task>[],
    todayAttendance: null,
    staffAttendance: <StaffAttendanceRecord>[],
    attendanceSummary: <AttendanceMonthlySummary>[],
    bulkOrders: <BulkOrder>[],
    clients: <Client>[],
    cart: <CartItem>[],
    storeInventory: <InventoryItem>[],
    stockMovements: <StockMovement>[],
    notifications: <AppNotification>[],
    unreadNotificationCount: 0,
  );
}
