import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:http_parser/http_parser.dart';
import 'package:uuid/uuid.dart';

import '../core/app_logger.dart';
import '../core/models.dart';

class MockApi {
  MockApi()
    : _dio = Dio(
        BaseOptions(
          baseUrl: _resolveBaseUrl(),
          connectTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 30),
          headers: const {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      ) {
    AppLogger.info('API client configured', {'baseUrl': _dio.options.baseUrl});
    _dio.interceptors.add(_NetworkLoggingInterceptor());
  }

  final _uuid = const Uuid();
  final Dio _dio;

  static String _resolveBaseUrl() {
    final configured = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://69.62.84.211:8080/v1',
    );

    if (kIsWeb) {
      return configured;
    }

    final uri = Uri.tryParse(configured);
    if (uri == null) {
      return configured;
    }

    _warnForUnsafeReleaseConfig(uri);

    // Android emulator cannot reach host machine through localhost.
    if (!kReleaseMode &&
        defaultTargetPlatform == TargetPlatform.android &&
        uri.host == 'localhost') {
      return uri.replace(host: '10.0.2.2').toString();
    }

    return configured;
  }

  static void _warnForUnsafeReleaseConfig(Uri uri) {
    final host = uri.host.toLowerCase();
    final isLocalHost =
        host == 'localhost' || host == '127.0.0.1' || host == '10.0.2.2';

    if (kReleaseMode && isLocalHost) {
      AppLogger.error('Release build points to a local-only API host', context: {
        'host': uri.host,
        'fix': 'Build with --dart-define=API_BASE_URL=https://your-api/v1',
      });
    }

    if (kReleaseMode && uri.scheme == 'http') {
      AppLogger.warning('Release build uses cleartext HTTP API', {
        'baseUrl': uri.toString(),
        'fix': 'Use HTTPS for production when possible',
      });
    }
  }

  String _errorMessage(Object error) {
    if (error is DioException) {
      AppLogger.error(
        'API request failed',
        error: error,
        stackTrace: error.stackTrace,
        context: {
          'type': error.type.name,
          'method': error.requestOptions.method,
          'url': error.requestOptions.uri,
          'status': error.response?.statusCode,
        },
      );
      final data = error.response?.data;
      if (data is Map && data['message'] is String) {
        return data['message'] as String;
      }
      if (data is Map && data['code'] is String) {
        return data['code'] as String;
      }
      final uri = error.requestOptions.uri;
      final baseHint =
          'API: ${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
      if (error.type == DioExceptionType.connectionError) {
        return 'Cannot reach backend ($baseHint). Check phone internet, server firewall/port, Android INTERNET permission, and HTTP cleartext policy.';
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Backend timed out ($baseHint). Check server health, mobile network quality, firewall, and API response time.';
      }
      if (error.type == DioExceptionType.badCertificate) {
        return 'SSL certificate rejected ($baseHint). Check HTTPS certificate chain, expiry, hostname, and TLS support.';
      }
      if (error.response?.statusCode != null) {
        return 'Request failed with HTTP ${error.response!.statusCode} at ${error.requestOptions.path}.';
      }
      if (error.message != null && error.message!.trim().isNotEmpty) {
        return error.message!;
      }
    }
    return error.toString();
  }

  Future<bool> healthCheck() async {
    try {
      final response = await _dio.get<dynamic>('/health');
      return (response.statusCode ?? 500) >= 200 &&
          (response.statusCode ?? 500) < 300;
    } catch (error) {
      AppLogger.warning('API health check failed', {'message': _errorMessage(error)});
      return false;
    }
  }

  Options _authOptions(String token, {String? idempotencyKey}) {
    return Options(
      headers: {
        'Authorization': 'Bearer $token',
        if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
      },
    );
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }

  List<dynamic> _asListPayload(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    if (value is Map) {
      final map = Map<String, dynamic>.from(value);
      final data = map['data'];
      if (data is List<dynamic>) {
        return data;
      }
    }
    return const <dynamic>[];
  }

  Map<String, dynamic> _asMapPayload(dynamic value) {
    final root = _asMap(value);
    final data = root['data'];
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return root;
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
      const limit = 200;
      var page = 1;
      var totalPages = 1;
      final rows = <dynamic>[];

      while (page <= totalPages) {
        final response = await _dio.get<dynamic>(
          '/products',
          queryParameters: {'page': page, 'limit': limit},
          options: _authOptions(token),
        );

        final payload = _asMap(response.data);
        rows.addAll(_asListPayload(payload));

        final meta = _asMap(payload['meta']);
        totalPages = (meta['pages'] as num?)?.toInt() ?? 1;
        page += 1;
      }

      return rows
          .map((row) {
            final json = Map<String, dynamic>.from(row as Map);
            return Product.fromJson(json);
          })
          .toList(growable: false);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<InventoryItem>> fetchInventory(
    String locationId,
    String token,
  ) async {
    try {
      const limit = 200;
      var page = 1;
      var totalPages = 1;
      final rows = <dynamic>[];

      while (page <= totalPages) {
        final response = await _dio.get<dynamic>(
          '/inventory',
          queryParameters: {
            'location_id': locationId,
            'page': page,
            'limit': limit,
          },
          options: _authOptions(token),
        );

        final payload = _asMap(response.data);
        rows.addAll(_asListPayload(payload));

        final meta = _asMap(payload['meta']);
        totalPages = (meta['pages'] as num?)?.toInt() ?? 1;
        page += 1;
      }

      return rows
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map(
            (json) => InventoryItem(
              productId: (json['product_id'] ?? '').toString(),
              sku: (json['sku'] ?? '').toString(),
              title: (json['title'] ?? '').toString(),
              locationId: (json['location_id'] ?? '').toString(),
              availableStock: ((json['available_stock'] ?? 0) as num).toInt(),
              reservedStock: ((json['reserved_stock'] ?? 0) as num).toInt(),
              totalStock: ((json['total_stock'] ?? 0) as num).toInt(),
              cachedAt: DateTime.now(),
              brand: (json['brand'] ?? '').toString(),
              category: (json['category'] ?? '').toString(),
              model: (json['model'] ?? '').toString(),
              color: (json['color'] ?? '').toString(),
              imageUrl: (json['image_url'] ?? json['imageUrl']) as String?,
            ),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<StoreOrder>> fetchOrders(UserSession session) async {
    try {
      final response = await _dio.get<dynamic>(
        '/orders',
        options: _authOptions(session.token),
      );
      final rows = _asListPayload(response.data);
      return rows.map((row) {
        final json = Map<String, dynamic>.from(row as Map);
        final status = OrderStatusApi.fromApi(
          (json['status'] ?? 'draft').toString(),
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
          id: (json['id'] ?? '').toString(),
          orderId: (json['order_id'] ?? '').toString(),
          storeId: (json['store_id'] ?? '').toString(),
          storeName: (json['store_name'] ?? 'Store').toString(),
          warehouseId: (json['warehouse_id'] ?? '').toString(),
          warehouseName: (json['warehouse_name'] ?? 'Warehouse').toString(),
          status: status,
          items: items,
          reservedAmount: items.fold<int>(0, (sum, i) => sum + i.quantity),
          createdAt:
              DateTime.tryParse((json['created_at'] ?? '').toString()) ??
              DateTime.now(),
          updatedAt:
              DateTime.tryParse((json['updated_at'] ?? '').toString()) ??
              DateTime.now(),
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
    List<Map<String, dynamic>>? items,
    String? productId,
    int? quantity,
    required String idempotencyKey,
  }) async {
    final resolvedItems =
        items ??
        <Map<String, dynamic>>[
          {'product_id': productId, 'qty': quantity},
        ];
    final validItems = resolvedItems
        .where(
          (item) =>
              (item['product_id']?.toString().isNotEmpty ?? false) &&
              ((item['qty'] as num?)?.toInt() ?? 0) > 0,
        )
        .toList(growable: false);
    if (validItems.isEmpty) {
      throw Exception('At least one order item is required.');
    }

    await _dio.post(
      '/orders',
      options: _authOptions(session.token, idempotencyKey: idempotencyKey),
      data: {
        'store_id': session.locationId,
        'warehouse_id': warehouseId,
        'items': validItems,
      },
    );
  }

  Future<void> transitionOrderOnline({
    required UserSession session,
    required String orderRef,
    required OrderStatus target,
  }) async {
    final endpoint = switch (target) {
      OrderStatus.confirmed ||
      OrderStatus.warehouseApproved => '/orders/$orderRef/approve',
      OrderStatus.pendingWarehouseApproval => null,
      OrderStatus.warehouseRejected => '/orders/$orderRef/reject',
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
      final response = await _dio.get<dynamic>(
        '/locations',
        options: _authOptions(token),
      );
      final rows = _asListPayload(response.data);
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
      final response = await _dio.get<dynamic>(
        '/users',
        options: _authOptions(token),
      );
      final rows = _asListPayload(response.data);
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
      final response = await _dio.post<dynamic>(
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
      final data = _asMapPayload(response.data);
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
      final response = await _dio.patch<dynamic>(
        '/users/$userId',
        options: _authOptions(token),
        data: {'status': active ? 'active' : 'inactive'},
      );
      final data = _asMapPayload(response.data);
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> deleteEmployeeUser({
    required String token,
    required String userId,
  }) async {
    try {
      await _dio.delete<void>('/users/$userId', options: _authOptions(token));
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<InventoryItem> createInventoryItem({
    required String token,
    required String locationId,
    required String sku,
    required String title,
    required String brand,
    required int totalStock,
    String? category,
    String? model,
    String? color,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    try {
      final form = FormData.fromMap({
        'location_id': locationId,
        'sku': sku,
        'title': title,
        'brand': brand,
        'category': category ?? '',
        'model': model ?? '',
        'color': color ?? '',
        'total_stock': totalStock,
        if (imageBytes != null)
          'image': MultipartFile.fromBytes(
            imageBytes,
            filename: imageFilename ?? 'inventory.jpg',
            contentType: MediaType('image', 'jpeg'),
          ),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        '/inventory',
        options: _authOptions(token),
        data: form,
      );
      final json = response.data ?? <String, dynamic>{};
      return _inventoryFromApi(json);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<InventoryItem> updateInventoryItem({
    required String token,
    required String productRef,
    required String locationId,
    int? totalStock,
    int? reservedStock,
    int? issuedStock,
    String? title,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    try {
      final form = FormData.fromMap({
        'location_id': locationId,
        if (totalStock != null) 'total_stock': totalStock,
        if (reservedStock != null) 'reserved_stock': reservedStock,
        if (issuedStock != null) 'issued_stock': issuedStock,
        if (title != null) 'title': title,
        if (brand != null) 'brand': brand,
        if (category != null) 'category': category,
        if (model != null) 'model': model,
        if (color != null) 'color': color,
        if (status != null) 'status': status,
        if (imageBytes != null)
          'image': MultipartFile.fromBytes(
            imageBytes,
            filename: imageFilename ?? 'inventory.jpg',
            contentType: MediaType('image', 'jpeg'),
          ),
      });

      final response = await _dio.patch<Map<String, dynamic>>(
        '/inventory/$productRef',
        options: _authOptions(token),
        data: form,
      );
      final json = response.data ?? <String, dynamic>{};
      return _inventoryFromApi(json);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> deleteInventoryItem({
    required String token,
    required String productRef,
    required String locationId,
  }) async {
    try {
      await _dio.delete<void>(
        '/inventory/$productRef',
        queryParameters: {'location_id': locationId},
        options: _authOptions(token),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<StaffRecordsBundle> fetchMyStaffRecords(String token) async {
    try {
      final response = await _dio.get<dynamic>(
        '/staff/attendance',
        options: _authOptions(token),
      );
      final attendanceRows = _asListPayload(response.data);
      final attendance = attendanceRows
          .whereType<Map>()
          .map((row) => _attendanceFromApi(Map<String, dynamic>.from(row)))
          .toList();
      return StaffRecordsBundle(
        attendance: attendance,
        salaryPayouts: const <SalaryPayoutRecord>[],
        leaveRecords: const <LeaveRecord>[],
      );
    } catch (error) {
      return const StaffRecordsBundle(
        attendance: <AttendanceRecord>[],
        salaryPayouts: <SalaryPayoutRecord>[],
        leaveRecords: <LeaveRecord>[],
      );
    }
  }

  Future<StaffRecordsBundle> fetchStaffRecordsForAdmin({
    required String token,
    String? userId,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        '/staff/attendance',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'staff_id': userId,
        },
        options: _authOptions(token),
      );
      final attendanceRows = _asListPayload(response.data);
      final attendance = attendanceRows
          .whereType<Map>()
          .map((row) => _attendanceFromApi(Map<String, dynamic>.from(row)))
          .toList();
      return StaffRecordsBundle(
        attendance: attendance,
        salaryPayouts: const <SalaryPayoutRecord>[],
        leaveRecords: const <LeaveRecord>[],
      );
    } catch (error) {
      return const StaffRecordsBundle(
        attendance: <AttendanceRecord>[],
        salaryPayouts: <SalaryPayoutRecord>[],
        leaveRecords: <LeaveRecord>[],
      );
    }
  }

  Future<AttendanceRecord> addAttendance({
    required String token,
    required String userId,
    required DateTime date,
    required AttendanceStatus status,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/staff/attendance',
        options: _authOptions(token),
        data: {
          'user_id': userId,
          'attendance_date': date.toIso8601String().split('T').first,
          'status': status.apiValue,
        },
      );
      final data = response.data ?? <String, dynamic>{};
      return AttendanceRecord.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  InventoryItem _inventoryFromApi(Map<String, dynamic> json) {
    return InventoryItem(
      productId: (json['product_id'] ?? '').toString(),
      sku: (json['sku'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      locationId: (json['location_id'] ?? '').toString(),
      availableStock: ((json['available_stock'] ?? 0) as num).toInt(),
      reservedStock: ((json['reserved_stock'] ?? 0) as num).toInt(),
      totalStock: ((json['total_stock'] ?? 0) as num).toInt(),
      cachedAt: DateTime.now(),
      brand: (json['brand'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      model: (json['model'] ?? '').toString(),
      color: (json['color'] ?? '').toString(),
      imageUrl: (json['image_url'] ?? json['imageUrl']) as String?,
    );
  }

  AttendanceRecord _attendanceFromApi(Map<String, dynamic> json) {
    final dateValue = (json['attendance_date'] ?? json['date'] ?? '')
        .toString();
    final markedValue =
        (json['marked_at'] ?? json['check_in_time'] ?? json['updated_at'] ?? '')
            .toString();
    return AttendanceRecord(
      id: (json['id'] ?? _uuid.v4()).toString(),
      userId: (json['user_id'] ?? json['staff_id'] ?? '').toString(),
      userName: (json['user_name'] ?? json['name'] ?? 'Staff').toString(),
      attendanceDate: DateTime.tryParse(dateValue) ?? DateTime.now(),
      status: AttendanceStatusApi.fromApi(
        (json['status'] ?? 'present').toString(),
      ),
      markedAt: DateTime.tryParse(markedValue) ?? DateTime.now(),
      locationName: json['location_name'] as String?,
    );
  }

  // ─── Rich mock product catalog ──────────────────────────────────

  // ignore: unused_field
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

  // ignore: unused_field
  static final List<StoreOrder> _mockOrders = [
    StoreOrder(
      id: 'O1',
      orderId: 'ORD-WH01-ST01-20260420-001',
      storeId: 'ST01',
      storeName: 'Premium Store - Delhi CP',
      warehouseId: 'WH01',
      warehouseName: 'Main Warehouse - Delhi',
      status: OrderStatus.pendingWarehouseApproval,
      items: const [
        OrderItem(
          productId: 'P001',
          title: 'Samsung 55" Smart TV 4K',
          sku: 'SKU-TV-001',
          quantity: 2,
        ),
        OrderItem(
          productId: 'P011',
          title: 'Office Paper A4 500 sheets',
          sku: 'SKU-SUP-001',
          quantity: 12,
        ),
      ],
      reservedAmount: 14,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 20)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O2',
      orderId: 'ORD-WH02-ST02-20260419-001',
      storeId: 'ST02',
      storeName: 'Branch Store - Mumbai Andheri',
      warehouseId: 'WH02',
      warehouseName: 'Regional Warehouse - Mumbai',
      status: OrderStatus.warehouseApproved,
      items: const [
        OrderItem(
          productId: 'P007',
          title: 'LG French Door Refrigerator',
          sku: 'SKU-APP-001',
          quantity: 1,
        ),
      ],
      reservedAmount: 1,
      createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O3',
      orderId: 'ORD-WH01-ST03-20260418-001',
      storeId: 'ST03',
      storeName: 'Outlet Store - Bengaluru',
      warehouseId: 'WH01',
      warehouseName: 'Main Warehouse - Delhi',
      status: OrderStatus.dispatched,
      items: const [
        OrderItem(
          productId: 'P003',
          title: 'iPhone 15 Pro Max 256GB',
          sku: 'SKU-PH-001',
          quantity: 3,
        ),
        OrderItem(
          productId: 'P013',
          title: 'Desk Lamp LED 15W',
          sku: 'SKU-OFF-001',
          quantity: 6,
        ),
      ],
      reservedAmount: 9,
      createdAt: DateTime.now().subtract(const Duration(days: 2, hours: 4)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 4)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O4',
      orderId: 'ORD-WH02-ST01-20260417-001',
      storeId: 'ST01',
      storeName: 'Premium Store - Delhi CP',
      warehouseId: 'WH02',
      warehouseName: 'Regional Warehouse - Mumbai',
      status: OrderStatus.warehouseRejected,
      items: const [
        OrderItem(
          productId: 'P006',
          title: 'LG French Door Refrigerator',
          sku: 'SKU-APP-001',
          quantity: 2,
        ),
      ],
      reservedAmount: 2,
      createdAt: DateTime.now().subtract(const Duration(days: 3, hours: 2)),
      updatedAt: DateTime.now().subtract(const Duration(days: 3, hours: 1)),
      syncStatus: SyncStatus.synced,
    ),
  ];
}

class _NetworkLoggingInterceptor extends Interceptor {
  static const _startedAtKey = 'startedAt';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra[_startedAtKey] = DateTime.now();
    AppLogger.info('API request', {
      'method': options.method,
      'url': options.uri,
      'hasAuth': options.headers.containsKey('Authorization'),
    });
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    AppLogger.info('API response', {
      'method': response.requestOptions.method,
      'url': response.requestOptions.uri,
      'status': response.statusCode,
      'durationMs': _durationMs(response.requestOptions),
    });
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLogger.error(
      'API transport error',
      error: err.message,
      context: {
        'method': err.requestOptions.method,
        'url': err.requestOptions.uri,
        'type': err.type.name,
        'status': err.response?.statusCode,
        'durationMs': _durationMs(err.requestOptions),
      },
    );
    handler.next(err);
  }

  int? _durationMs(RequestOptions options) {
    final startedAt = options.extra[_startedAtKey];
    if (startedAt is! DateTime) {
      return null;
    }
    return DateTime.now().difference(startedAt).inMilliseconds;
  }
}
