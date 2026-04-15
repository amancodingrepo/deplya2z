enum UserRole { superadmin, warehouseManager, storeManager }

enum OrderStatus {
  draft,
  confirmed,
  packed,
  dispatched,
  storeReceived,
  completed,
  cancelled,
}

enum SyncStatus { local, synced, pendingUpload, failed }

enum SyncActionType { createOrder, confirmReceive, markPacked, markDispatched }

enum AttendanceStatus { present, absent, halfDay, leave }

extension AttendanceStatusApi on AttendanceStatus {
  String get apiValue {
    return switch (this) {
      AttendanceStatus.present => 'present',
      AttendanceStatus.absent => 'absent',
      AttendanceStatus.halfDay => 'half_day',
      AttendanceStatus.leave => 'leave',
    };
  }

  String get label {
    return switch (this) {
      AttendanceStatus.present => 'Present',
      AttendanceStatus.absent => 'Absent',
      AttendanceStatus.halfDay => 'Half Day',
      AttendanceStatus.leave => 'Leave',
    };
  }

  static AttendanceStatus fromApi(String value) {
    return switch (value) {
      'present' => AttendanceStatus.present,
      'absent' => AttendanceStatus.absent,
      'half_day' => AttendanceStatus.halfDay,
      'leave' => AttendanceStatus.leave,
      _ => AttendanceStatus.present,
    };
  }
}

class UserSession {
  const UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.locationId,
    required this.token,
    required this.expiry,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String locationId;
  final String token;
  final DateTime expiry;

  bool get shouldRefreshToken =>
      expiry.difference(DateTime.now()).inHours < 2 &&
      expiry.isAfter(DateTime.now());

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'role': role.name,
    'locationId': locationId,
    'token': token,
    'expiry': expiry.toIso8601String(),
  };

  factory UserSession.fromJson(Map<dynamic, dynamic> json) => UserSession(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String,
    role: UserRole.values.byName(json['role'] as String),
    locationId: json['locationId'] as String,
    token: json['token'] as String,
    expiry: DateTime.parse(json['expiry'] as String),
  );
}

class OrderItem {
  const OrderItem({
    required this.productId,
    required this.title,
    required this.sku,
    required this.quantity,
  });

  final String productId;
  final String title;
  final String sku;
  final int quantity;

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'title': title,
    'sku': sku,
    'quantity': quantity,
  };

  factory OrderItem.fromJson(Map<dynamic, dynamic> json) => OrderItem(
    productId: json['productId'] as String,
    title: json['title'] as String,
    sku: json['sku'] as String,
    quantity: json['quantity'] as int,
  );
}

class StoreOrder {
  const StoreOrder({
    required this.id,
    required this.orderId,
    required this.storeId,
    required this.warehouseId,
    required this.status,
    required this.items,
    required this.reservedAmount,
    required this.createdAt,
    required this.updatedAt,
    required this.syncStatus,
  });

  final String id;
  final String orderId;
  final String storeId;
  final String warehouseId;
  final OrderStatus status;
  final List<OrderItem> items;
  final int reservedAmount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SyncStatus syncStatus;

  StoreOrder copyWith({
    OrderStatus? status,
    DateTime? updatedAt,
    SyncStatus? syncStatus,
    List<OrderItem>? items,
  }) {
    return StoreOrder(
      id: id,
      orderId: orderId,
      storeId: storeId,
      warehouseId: warehouseId,
      status: status ?? this.status,
      items: items ?? this.items,
      reservedAmount: reservedAmount,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'storeId': storeId,
    'warehouseId': warehouseId,
    'status': status.name,
    'items': items.map((e) => e.toJson()).toList(),
    'reservedAmount': reservedAmount,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'syncStatus': syncStatus.name,
  };

  factory StoreOrder.fromJson(Map<dynamic, dynamic> json) => StoreOrder(
    id: json['id'] as String,
    orderId: json['orderId'] as String,
    storeId: json['storeId'] as String,
    warehouseId: json['warehouseId'] as String,
    status: OrderStatus.values.byName(json['status'] as String),
    items: (json['items'] as List<dynamic>)
        .map((e) => OrderItem.fromJson(e as Map<dynamic, dynamic>))
        .toList(),
    reservedAmount: json['reservedAmount'] as int,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    syncStatus: SyncStatus.values.byName(json['syncStatus'] as String),
  );
}

class Product {
  const Product({
    required this.id,
    required this.title,
    required this.shortName,
    required this.sku,
    required this.brand,
    required this.category,
    required this.model,
    required this.color,
    required this.status,
    required this.customStyle,
    this.imageUrl,
    this.localImagePath,
  });

  final String id;
  final String title;
  final String shortName;
  final String sku;
  final String brand;
  final String category;
  final String model;
  final String color;
  final String status; // present | inactive | discontinued
  final String
  customStyle; // default | premium | featured | sale | catalogue_ready
  final String? imageUrl;
  final String? localImagePath;

  Product copyWith({String? imageUrl, String? localImagePath, String? status}) {
    return Product(
      id: id,
      title: title,
      shortName: shortName,
      sku: sku,
      brand: brand,
      category: category,
      model: model,
      color: color,
      status: status ?? this.status,
      customStyle: customStyle,
      imageUrl: imageUrl ?? this.imageUrl,
      localImagePath: localImagePath ?? this.localImagePath,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'shortName': shortName,
    'sku': sku,
    'brand': brand,
    'category': category,
    'model': model,
    'color': color,
    'status': status,
    'customStyle': customStyle,
    'imageUrl': imageUrl,
    'localImagePath': localImagePath,
  };

  factory Product.fromJson(Map<dynamic, dynamic> json) => Product(
    id: json['id'] as String,
    title: json['title'] as String,
    shortName: (json['shortName'] ?? json['short_name'] ?? '') as String,
    sku: json['sku'] as String,
    brand: (json['brand'] ?? '') as String,
    category: (json['category'] ?? '') as String,
    model: (json['model'] ?? '') as String,
    color: (json['color'] ?? '') as String,
    status: (json['status'] ?? 'present') as String,
    customStyle:
        (json['customStyle'] ?? json['custom_style'] ?? 'default') as String,
    imageUrl: json['imageUrl'] as String?,
    localImagePath: json['localImagePath'] as String?,
  );
}

class InventoryItem {
  const InventoryItem({
    required this.productId,
    required this.sku,
    required this.title,
    required this.locationId,
    required this.availableStock,
    required this.reservedStock,
    required this.totalStock,
    required this.cachedAt,
    this.brand = '',
    this.category = '',
    this.model = '',
    this.color = '',
    this.imageUrl,
    this.localImagePath,
  });

  final String productId;
  final String sku;
  final String title;
  final String locationId;
  final int availableStock;
  final int reservedStock;
  final int totalStock;
  final DateTime cachedAt;
  final String brand;
  final String category;
  final String model;
  final String color;
  final String? imageUrl;
  final String? localImagePath;

  bool get isLowStock => availableStock <= 3;

  InventoryItem copyWith({String? imageUrl, String? localImagePath}) {
    return InventoryItem(
      productId: productId,
      sku: sku,
      title: title,
      locationId: locationId,
      availableStock: availableStock,
      reservedStock: reservedStock,
      totalStock: totalStock,
      cachedAt: cachedAt,
      brand: brand,
      category: category,
      model: model,
      color: color,
      imageUrl: imageUrl ?? this.imageUrl,
      localImagePath: localImagePath ?? this.localImagePath,
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'sku': sku,
    'title': title,
    'locationId': locationId,
    'availableStock': availableStock,
    'reservedStock': reservedStock,
    'totalStock': totalStock,
    'cachedAt': cachedAt.toIso8601String(),
    'brand': brand,
    'category': category,
    'model': model,
    'color': color,
    'imageUrl': imageUrl,
    'localImagePath': localImagePath,
  };

  factory InventoryItem.fromJson(Map<dynamic, dynamic> json) => InventoryItem(
    productId: json['productId'] as String,
    sku: json['sku'] as String,
    title: json['title'] as String,
    locationId: json['locationId'] as String,
    availableStock: json['availableStock'] as int,
    reservedStock: json['reservedStock'] as int,
    totalStock: json['totalStock'] as int,
    cachedAt: DateTime.parse(json['cachedAt'] as String),
    brand: (json['brand'] ?? '') as String,
    category: (json['category'] ?? '') as String,
    model: (json['model'] ?? '') as String,
    color: (json['color'] ?? '') as String,
    imageUrl: json['imageUrl'] as String?,
    localImagePath: json['localImagePath'] as String?,
  );
}

class SyncAction {
  const SyncAction({
    required this.id,
    required this.type,
    required this.entityId,
    required this.payload,
    required this.createdAt,
    required this.status,
    required this.retryCount,
    this.errorMessage,
  });

  final String id;
  final SyncActionType type;
  final String entityId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final SyncStatus status;
  final int retryCount;
  final String? errorMessage;

  SyncAction copyWith({
    SyncStatus? status,
    int? retryCount,
    String? errorMessage,
  }) {
    return SyncAction(
      id: id,
      type: type,
      entityId: entityId,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'entityId': entityId,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'status': status.name,
    'retryCount': retryCount,
    'errorMessage': errorMessage,
  };

  factory SyncAction.fromJson(Map<dynamic, dynamic> json) => SyncAction(
    id: json['id'] as String,
    type: SyncActionType.values.byName(json['type'] as String),
    entityId: json['entityId'] as String,
    payload: Map<String, dynamic>.from(
      json['payload'] as Map<dynamic, dynamic>,
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
    status: SyncStatus.values.byName(json['status'] as String),
    retryCount: json['retryCount'] as int,
    errorMessage: json['errorMessage'] as String?,
  );
}

class AppLocation {
  const AppLocation({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.status,
  });

  final String id;
  final String code;
  final String name;
  final String type;
  final String status;

  factory AppLocation.fromJson(Map<dynamic, dynamic> json) => AppLocation(
    id: json['id'] as String,
    code: json['location_code'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    status: (json['status'] ?? 'active') as String,
  );
}

class EmployeeUser {
  const EmployeeUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    required this.locationId,
    required this.locationName,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String status;
  final String? locationId;
  final String? locationName;
  final DateTime createdAt;

  String get roleLabel => switch (role) {
    UserRole.superadmin => 'Superadmin',
    UserRole.warehouseManager => 'Warehouse Manager',
    UserRole.storeManager => 'Store Manager',
  };

  bool get isActive => status == 'active';

  factory EmployeeUser.fromJson(Map<dynamic, dynamic> json) => EmployeeUser(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
    role: switch (json['role'] as String) {
      'superadmin' => UserRole.superadmin,
      'warehouse_manager' => UserRole.warehouseManager,
      _ => UserRole.storeManager,
    },
    status: (json['status'] ?? 'active') as String,
    locationId: json['location_id'] as String?,
    locationName: json['location_name'] as String?,
    createdAt:
        DateTime.tryParse((json['created_at'] ?? '') as String) ??
        DateTime.now(),
  );
}

class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.userId,
    required this.userName,
    required this.attendanceDate,
    required this.status,
    required this.markedAt,
    this.locationName,
  });

  final String id;
  final String userId;
  final String userName;
  final DateTime attendanceDate;
  final AttendanceStatus status;
  final DateTime markedAt;
  final String? locationName;

  factory AttendanceRecord.fromJson(Map<dynamic, dynamic> json) =>
      AttendanceRecord(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        userName: (json['user_name'] ?? '') as String,
        attendanceDate: DateTime.parse(json['attendance_date'] as String),
        status: AttendanceStatusApi.fromApi(
          (json['status'] ?? 'present') as String,
        ),
        markedAt:
            DateTime.tryParse((json['marked_at'] ?? '') as String) ??
            DateTime.now(),
        locationName: json['location_name'] as String?,
      );
}

class SalaryPayoutRecord {
  const SalaryPayoutRecord({
    required this.id,
    required this.userId,
    required this.userName,
    required this.monthKey,
    required this.grossAmount,
    required this.deductions,
    required this.netAmount,
    required this.payoutDate,
    this.notes,
  });

  final String id;
  final String userId;
  final String userName;
  final String monthKey;
  final double grossAmount;
  final double deductions;
  final double netAmount;
  final DateTime payoutDate;
  final String? notes;

  factory SalaryPayoutRecord.fromJson(Map<dynamic, dynamic> json) =>
      SalaryPayoutRecord(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        userName: (json['user_name'] ?? '') as String,
        monthKey: (json['month_key'] ?? '') as String,
        grossAmount: (json['gross_amount'] as num).toDouble(),
        deductions: (json['deductions'] as num).toDouble(),
        netAmount: (json['net_amount'] as num).toDouble(),
        payoutDate: DateTime.parse(json['payout_date'] as String),
        notes: json['notes'] as String?,
      );
}

class LeaveRecord {
  const LeaveRecord({
    required this.id,
    required this.userId,
    required this.userName,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.daysCount,
    required this.status,
    this.reason,
  });

  final String id;
  final String userId;
  final String userName;
  final String leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final int daysCount;
  final String status;
  final String? reason;

  factory LeaveRecord.fromJson(Map<dynamic, dynamic> json) => LeaveRecord(
    id: json['id'] as String,
    userId: json['user_id'] as String,
    userName: (json['user_name'] ?? '') as String,
    leaveType: (json['leave_type'] ?? 'leave') as String,
    startDate: DateTime.parse(json['start_date'] as String),
    endDate: DateTime.parse(json['end_date'] as String),
    daysCount: (json['days_count'] as num).toInt(),
    status: (json['status'] ?? 'pending') as String,
    reason: json['reason'] as String?,
  );
}

class StaffRecordsBundle {
  const StaffRecordsBundle({
    required this.attendance,
    required this.salaryPayouts,
    required this.leaveRecords,
  });

  final List<AttendanceRecord> attendance;
  final List<SalaryPayoutRecord> salaryPayouts;
  final List<LeaveRecord> leaveRecords;

  factory StaffRecordsBundle.fromJson(Map<String, dynamic> json) {
    return StaffRecordsBundle(
      attendance: (json['attendance'] as List<dynamic>? ?? const <dynamic>[])
          .map(
            (e) =>
                AttendanceRecord.fromJson(Map<String, dynamic>.from(e as Map)),
          )
          .toList(),
      salaryPayouts:
          (json['salary_payouts'] as List<dynamic>? ?? const <dynamic>[])
              .map(
                (e) => SalaryPayoutRecord.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList(),
      leaveRecords:
          (json['leave_records'] as List<dynamic>? ?? const <dynamic>[])
              .map(
                (e) =>
                    LeaveRecord.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList(),
    );
  }
}
