import '../core/models.dart';

class AppState {
  const AppState({
    required this.initialized,
    required this.isOnline,
    required this.loading,
    required this.session,
    required this.orders,
    required this.inventory,
    required this.syncQueue,
    required this.message,
  });

  final bool initialized;
  final bool isOnline;
  final bool loading;
  final UserSession? session;
  final List<StoreOrder> orders;
  final List<InventoryItem> inventory;
  final List<SyncAction> syncQueue;
  final String? message;

  bool get isLoggedIn => session != null;

  AppState copyWith({
    bool? initialized,
    bool? isOnline,
    bool? loading,
    UserSession? session,
    bool clearSession = false,
    List<StoreOrder>? orders,
    List<InventoryItem>? inventory,
    List<SyncAction>? syncQueue,
    String? message,
    bool clearMessage = false,
  }) {
    return AppState(
      initialized: initialized ?? this.initialized,
      isOnline: isOnline ?? this.isOnline,
      loading: loading ?? this.loading,
      session: clearSession ? null : (session ?? this.session),
      orders: orders ?? this.orders,
      inventory: inventory ?? this.inventory,
      syncQueue: syncQueue ?? this.syncQueue,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  static const initial = AppState(
    initialized: false,
    isOnline: true,
    loading: false,
    session: null,
    orders: <StoreOrder>[],
    inventory: <InventoryItem>[],
    syncQueue: <SyncAction>[],
    message: null,
  );
}
