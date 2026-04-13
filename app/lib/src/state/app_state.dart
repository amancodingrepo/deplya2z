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
    required this.message,
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
  final String? message;

  bool get isLoggedIn => session != null;

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
    String? message,
    bool clearMessage = false,
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
      message: clearMessage ? null : (message ?? this.message),
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
    message: null,
  );
}
