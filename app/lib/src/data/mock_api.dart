import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../core/models.dart';

class MockApi {
  MockApi()
    : _dio = Dio(
        BaseOptions(
          baseUrl: _resolveBaseUrl(),
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );

  final _uuid = const Uuid();
  final Dio _dio;

  static String _resolveBaseUrl() {
    final configured = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:8080/v1',
    );

    if (kIsWeb) {
      return configured;
    }

    final uri = Uri.tryParse(configured);
    if (uri == null) {
      return configured;
    }

    // Android emulator cannot reach host machine through localhost.
    if (Platform.isAndroid && uri.host == 'localhost') {
      return uri.replace(host: '10.0.2.2').toString();
    }

    return configured;
  }

  String _errorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['message'] is String) {
        return data['message'] as String;
      }
      if (data is Map && data['code'] is String) {
        return data['code'] as String;
      }
      if (error.message != null && error.message!.trim().isNotEmpty) {
        return error.message!;
      }
    }
    return error.toString();
  }

  Options _authOptions(String token, {String? idempotencyKey}) {
    return Options(
      headers: {
        'Authorization': 'Bearer $token',
        if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
      },
    );
  }

  String _roleToApi(UserRole role) {
    return switch (role) {
      UserRole.superadmin => 'superadmin',
      UserRole.warehouseManager => 'warehouse_manager',
      UserRole.storeManager => 'store_manager',
    };
  }

  UserRole _roleFromApi(String role) {
    return switch (role) {
      'superadmin' => UserRole.superadmin,
      'warehouse_manager' => UserRole.warehouseManager,
      'store_manager' => UserRole.storeManager,
      _ => UserRole.storeManager,
    };
  }

  Future<UserSession> login({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final payload = response.data ?? <String, dynamic>{};
      final user = Map<String, dynamic>.from(
        payload['user'] as Map? ?? <String, dynamic>{},
      );

      final apiRole = user['role'] as String? ?? _roleToApi(role);

      return UserSession(
        id: user['id'] as String? ?? _uuid.v4(),
        name: user['name'] as String? ?? 'User',
        email: user['email'] as String? ?? email,
        role: _roleFromApi(apiRole),
        locationId:
            user['location_id'] as String? ??
            switch (role) {
              UserRole.superadmin => 'GLOBAL',
              UserRole.warehouseManager => 'WH01',
              UserRole.storeManager => 'ST01',
            },
        token: payload['token'] as String? ?? _uuid.v4(),
        expiry: DateTime.now().add(const Duration(hours: 24)),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<String> refreshToken(String currentToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        options: _authOptions(currentToken),
      );
      final payload = response.data ?? <String, dynamic>{};
      return payload['token'] as String? ?? currentToken;
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  /// Returns a rich list of products for listing with images.
  Future<List<Product>> fetchProducts(String token) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/products',
        options: _authOptions(token),
      );
      final data = response.data ?? <dynamic>[];
      return data.map((row) {
        final json = Map<String, dynamic>.from(row as Map);
        return Product.fromJson(json);
      }).toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<InventoryItem>> fetchInventory(
    String locationId,
    String token,
  ) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/inventory',
        queryParameters: {'location_id': locationId},
        options: _authOptions(token),
      );

      final data = response.data ?? <dynamic>[];
      return data
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map(
            (json) => InventoryItem(
              productId: json['product_id'] as String,
              sku: json['sku'] as String,
              title: json['title'] as String,
              locationId: json['location_id'] as String,
              availableStock: (json['available_stock'] as num).toInt(),
              reservedStock: (json['reserved_stock'] as num).toInt(),
              totalStock: (json['total_stock'] as num).toInt(),
              cachedAt: DateTime.now(),
              brand: (json['brand'] ?? '') as String,
              category: (json['category'] ?? '') as String,
              model: (json['model'] ?? '') as String,
              color: (json['color'] ?? '') as String,
              imageUrl: json['image_url'] as String?,
            ),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<StoreOrder>> fetchOrders(UserSession session) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/orders',
        options: _authOptions(session.token),
      );
      final rows = response.data ?? <dynamic>[];
      return rows.map((row) {
        final json = Map<String, dynamic>.from(row as Map);
        final status = OrderStatus.values.firstWhere(
          (s) => s.name == (json['status'] as String).replaceAll('_', ''),
          orElse: () {
            final raw = json['status'] as String;
            if (raw == 'store_received') return OrderStatus.storeReceived;
            return OrderStatus.draft;
          },
        );

        final items = (json['items'] as List<dynamic>? ?? const <dynamic>[])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .map(
              (it) => OrderItem(
                productId: it['product_id'] as String,
                title:
                    (it['title'] ?? it['product_id'] ?? 'Unknown Item')
                        as String,
                sku: (it['sku'] ?? 'NA') as String,
                quantity: (it['qty'] as num).toInt(),
              ),
            )
            .toList();

        return StoreOrder(
          id: json['id'] as String,
          orderId: json['order_id'] as String,
          storeId: json['store_id'] as String,
          warehouseId: json['warehouse_id'] as String,
          status: status,
          items: items,
          reservedAmount: items.fold<int>(0, (sum, i) => sum + i.quantity),
          createdAt: DateTime.parse(json['created_at'] as String),
          updatedAt: DateTime.parse(json['updated_at'] as String),
          syncStatus: SyncStatus.synced,
        );
      }).toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> syncAction(SyncAction action, UserSession session) async {
    try {
      if (action.type == SyncActionType.createOrder) {
        await _dio.post(
          '/orders',
          options: _authOptions(session.token, idempotencyKey: action.id),
          data: {
            'store_id': action.payload['storeId'] ?? session.locationId,
            'warehouse_id': action.payload['warehouseId'] ?? 'WH01',
            'items': action.payload['items'] ?? <dynamic>[],
          },
        );
      } else if (action.type == SyncActionType.markPacked) {
        await _dio.patch(
          '/orders/${action.entityId}/pack',
          options: _authOptions(session.token, idempotencyKey: action.id),
        );
      } else if (action.type == SyncActionType.markDispatched) {
        await _dio.patch(
          '/orders/${action.entityId}/dispatch',
          options: _authOptions(session.token, idempotencyKey: action.id),
        );
      } else {
        await _dio.patch(
          '/orders/${action.entityId}/confirm-receive',
          options: _authOptions(session.token, idempotencyKey: action.id),
        );
      }
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> createOrderOnline({
    required UserSession session,
    required String warehouseId,
    required String productId,
    required int quantity,
    required String idempotencyKey,
  }) async {
    await _dio.post(
      '/orders',
      options: _authOptions(session.token, idempotencyKey: idempotencyKey),
      data: {
        'store_id': session.locationId,
        'warehouse_id': warehouseId,
        'items': [
          {'product_id': productId, 'qty': quantity},
        ],
      },
    );
  }

  Future<void> transitionOrderOnline({
    required UserSession session,
    required String orderRef,
    required OrderStatus target,
  }) async {
    final endpoint = switch (target) {
      OrderStatus.packed => '/orders/$orderRef/pack',
      OrderStatus.dispatched => '/orders/$orderRef/dispatch',
      OrderStatus.storeReceived ||
      OrderStatus.completed => '/orders/$orderRef/confirm-receive',
      _ => null,
    };

    if (endpoint == null) {
      return;
    }

    await _dio.patch(
      endpoint,
      options: _authOptions(session.token, idempotencyKey: _uuid.v4()),
    );
  }

  Future<List<AppLocation>> fetchLocations(String token) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/locations',
        options: _authOptions(token),
      );
      final rows = response.data ?? <dynamic>[];
      return rows
          .map(
            (row) =>
                AppLocation.fromJson(Map<String, dynamic>.from(row as Map)),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<EmployeeUser>> fetchUsers(String token) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/users',
        options: _authOptions(token),
      );
      final rows = response.data ?? <dynamic>[];
      return rows
          .map(
            (row) =>
                EmployeeUser.fromJson(Map<String, dynamic>.from(row as Map)),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<EmployeeUser> createEmployeeUser({
    required String token,
    required String email,
    required String name,
    required String password,
    required UserRole role,
    String? locationId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/users',
        options: _authOptions(token),
        data: {
          'email': email,
          'name': name,
          'password': password,
          'role': _roleToApi(role),
          'location_id': role == UserRole.superadmin ? null : locationId,
        },
      );
      final data = response.data ?? <String, dynamic>{};
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<EmployeeUser> updateEmployeeStatus({
    required String token,
    required String userId,
    required bool active,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/users/$userId',
        options: _authOptions(token),
        data: {'status': active ? 'active' : 'inactive'},
      );
      final data = response.data ?? <String, dynamic>{};
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ─── Rich mock product catalog ──────────────────────────────────

  static final List<Product> _mockProducts = [
    const Product(
      id: 'P001',
      title: 'Samsung 55" QLED Smart TV',
      shortName: 'TV-55-SM',
      sku: 'SKU-TV-001',
      brand: 'Samsung',
      category: 'Electronics',
      model: 'QN55Q80C',
      color: 'Titan Black',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P002',
      title: 'LG Double Door Refrigerator',
      shortName: 'FRD-DD-LG',
      sku: 'SKU-FRD-001',
      brand: 'LG',
      category: 'Home Appliances',
      model: 'GL-T292RPZX',
      color: 'Shiny Steel',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P003',
      title: 'Sony WH-1000XM5 Headphones',
      shortName: 'HP-XM5-SN',
      sku: 'SKU-HP-001',
      brand: 'Sony',
      category: 'Audio',
      model: 'WH-1000XM5',
      color: 'Midnight Blue',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P004',
      title: 'Apple MacBook Pro 14"',
      shortName: 'MBP-14-AP',
      sku: 'SKU-LPT-001',
      brand: 'Apple',
      category: 'Computers',
      model: 'M3 Pro',
      color: 'Space Black',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P005',
      title: 'Dyson V15 Detect Vacuum',
      shortName: 'VAC-V15-DY',
      sku: 'SKU-VAC-001',
      brand: 'Dyson',
      category: 'Home Appliances',
      model: 'V15 Detect',
      color: 'Yellow Nickel',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P006',
      title: 'Samsung Galaxy S24 Ultra',
      shortName: 'PH-S24U-SM',
      sku: 'SKU-PH-001',
      brand: 'Samsung',
      category: 'Smartphones',
      model: 'S24 Ultra',
      color: 'Titanium Violet',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P007',
      title: 'Bosch Front Load Washer 8kg',
      shortName: 'WSH-8K-BS',
      sku: 'SKU-WSH-001',
      brand: 'Bosch',
      category: 'Home Appliances',
      model: 'WAJ2846SIN',
      color: 'Silver',
      status: 'present',
      customStyle: 'default',
      imageUrl:
          'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P008',
      title: 'LG 27" UltraGear Monitor',
      shortName: 'MON-27-LG',
      sku: 'SKU-MON-001',
      brand: 'LG',
      category: 'Electronics',
      model: '27GR95QE',
      color: 'Matte Black',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop',
    ),
  ];

  static final List<StoreOrder> _mockOrders = [
    StoreOrder(
      id: 'O1',
      orderId: 'ORD-ST01-20260412-0001',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.confirmed,
      items: const [
        OrderItem(
          productId: 'P001',
          title: 'Samsung 55" QLED Smart TV',
          sku: 'SKU-TV-001',
          quantity: 5,
        ),
      ],
      reservedAmount: 5,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O2',
      orderId: 'ORD-ST01-20260412-0002',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.packed,
      items: const [
        OrderItem(
          productId: 'P002',
          title: 'LG Double Door Refrigerator',
          sku: 'SKU-FRD-001',
          quantity: 3,
        ),
      ],
      reservedAmount: 3,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O3',
      orderId: 'ORD-ST01-20260411-0003',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.dispatched,
      items: const [
        OrderItem(
          productId: 'P003',
          title: 'Sony WH-1000XM5 Headphones',
          sku: 'SKU-HP-001',
          quantity: 10,
        ),
        OrderItem(
          productId: 'P006',
          title: 'Samsung Galaxy S24 Ultra',
          sku: 'SKU-PH-001',
          quantity: 4,
        ),
      ],
      reservedAmount: 14,
      createdAt: DateTime.now().subtract(const Duration(hours: 26)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O4',
      orderId: 'ORD-ST01-20260410-0004',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.completed,
      items: const [
        OrderItem(
          productId: 'P004',
          title: 'Apple MacBook Pro 14"',
          sku: 'SKU-LPT-001',
          quantity: 2,
        ),
      ],
      reservedAmount: 2,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      syncStatus: SyncStatus.synced,
    ),
  ];
}
