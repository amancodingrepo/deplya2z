enum UserRole { superadmin, warehouseManager, storeManager, staff }

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

enum SyncActionType {
  createOrder,
  confirmReceive,
  markPacked,
  markDispatched,
  checkIn,
  checkOut,
  startTask,
  completeTask,
}

enum AttendanceStatus { present, absent, halfDay, leave, holiday }

extension AttendanceStatusApi on AttendanceStatus {
  String get apiValue {
    return switch (this) {
      AttendanceStatus.present => 'present',
      AttendanceStatus.absent => 'absent',
      AttendanceStatus.halfDay => 'half_day',
      AttendanceStatus.leave => 'leave',
      AttendanceStatus.holiday => 'holiday',
    };
  }

  String get label {
    return switch (this) {
      AttendanceStatus.present => 'Present',
      AttendanceStatus.absent => 'Absent',
      AttendanceStatus.halfDay => 'Half Day',
      AttendanceStatus.leave => 'Leave',
      AttendanceStatus.holiday => 'Holiday',
    };
  }

  static AttendanceStatus fromApi(String value) {
    return switch (value) {
      'present' => AttendanceStatus.present,
      'absent' => AttendanceStatus.absent,
      'half_day' => AttendanceStatus.halfDay,
      'leave' => AttendanceStatus.leave,
      'holiday' => AttendanceStatus.holiday,
      _ => AttendanceStatus.present,
    };
  }
}

// ─── Task enums ──────────────────────────────────────────────────────────────

enum TaskPriority { low, medium, high, urgent }

extension TaskPriorityExt on TaskPriority {
  String get apiValue => switch (this) {
    TaskPriority.low => 'low',
    TaskPriority.medium => 'medium',
    TaskPriority.high => 'high',
    TaskPriority.urgent => 'urgent',
  };

  String get label => switch (this) {
    TaskPriority.low => 'Low',
    TaskPriority.medium => 'Medium',
    TaskPriority.high => 'High',
    TaskPriority.urgent => 'Urgent',
  };

  static TaskPriority fromApi(String v) => switch (v) {
    'low' => TaskPriority.low,
    'medium' => TaskPriority.medium,
    'high' => TaskPriority.high,
    'urgent' => TaskPriority.urgent,
    _ => TaskPriority.medium,
  };
}

enum TaskStatus { pending, inProgress, completed, cancelled }

extension TaskStatusExt on TaskStatus {
  String get apiValue => switch (this) {
    TaskStatus.pending => 'pending',
    TaskStatus.inProgress => 'in_progress',
    TaskStatus.completed => 'completed',
    TaskStatus.cancelled => 'cancelled',
  };

  String get label => switch (this) {
    TaskStatus.pending => 'Pending',
    TaskStatus.inProgress => 'In Progress',
    TaskStatus.completed => 'Completed',
    TaskStatus.cancelled => 'Cancelled',
  };

  static TaskStatus fromApi(String v) => switch (v) {
    'pending' => TaskStatus.pending,
    'in_progress' => TaskStatus.inProgress,
    'completed' => TaskStatus.completed,
    'cancelled' => TaskStatus.cancelled,
    _ => TaskStatus.pending,
  };
}

enum StaffStatus { active, inactive, onLeave }

extension StaffStatusExt on StaffStatus {
  String get apiValue => switch (this) {
    StaffStatus.active => 'active',
    StaffStatus.inactive => 'inactive',
    StaffStatus.onLeave => 'on_leave',
  };

  String get label => switch (this) {
    StaffStatus.active => 'Active',
    StaffStatus.inactive => 'Inactive',
    StaffStatus.onLeave => 'On Leave',
  };

  static StaffStatus fromApi(String v) => switch (v) {
    'active' => StaffStatus.active,
    'inactive' => StaffStatus.inactive,
    'on_leave' => StaffStatus.onLeave,
    _ => StaffStatus.active,
  };
}

// ─── Core session ─────────────────────────────────────────────────────────────

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

// ─── Orders ──────────────────────────────────────────────────────────────────

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

// ─── Products & Inventory ─────────────────────────────────────────────────────

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
  final String customStyle; // default | premium | featured | sale | catalogue_ready
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
    customStyle: (json['customStyle'] ?? json['custom_style'] ?? 'default') as String,
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

// ─── Sync ─────────────────────────────────────────────────────────────────────

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
    payload: Map<String, dynamic>.from(json['payload'] as Map<dynamic, dynamic>),
    createdAt: DateTime.parse(json['createdAt'] as String),
    status: SyncStatus.values.byName(json['status'] as String),
    retryCount: json['retryCount'] as int,
    errorMessage: json['errorMessage'] as String?,
  );
}

// ─── Locations & Users ────────────────────────────────────────────────────────

class AppLocation {
  const AppLocation({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.status,
    this.geoLat,
    this.geoLng,
    this.geofenceRadius,
  });

  final String id;
  final String code;
  final String name;
  final String type;
  final String status;
  final double? geoLat;
  final double? geoLng;
  final int? geofenceRadius; // meters

  factory AppLocation.fromJson(Map<dynamic, dynamic> json) => AppLocation(
    id: json['id'] as String,
    code: json['location_code'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    status: (json['status'] ?? 'active') as String,
    geoLat: (json['geo_lat'] as num?)?.toDouble(),
    geoLng: (json['geo_lng'] as num?)?.toDouble(),
    geofenceRadius: (json['geofence_radius'] as num?)?.toInt(),
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
    UserRole.staff => 'Staff',
  };

  bool get isActive => status == 'active';

  factory EmployeeUser.fromJson(Map<dynamic, dynamic> json) => EmployeeUser(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
    role: switch (json['role'] as String) {
      'superadmin' => UserRole.superadmin,
      'warehouse_manager' => UserRole.warehouseManager,
      'store_manager' => UserRole.storeManager,
      'staff' => UserRole.staff,
      _ => UserRole.storeManager,
    },
    status: (json['status'] ?? 'active') as String,
    locationId: json['location_id'] as String?,
    locationName: json['location_name'] as String?,
    createdAt: DateTime.tryParse((json['created_at'] ?? '') as String) ?? DateTime.now(),
  );
}

// ─── Staff Member ─────────────────────────────────────────────────────────────

class StaffMember {
  const StaffMember({
    required this.id,
    required this.userId,
    required this.name,
    required this.email,
    required this.locationId,
    required this.locationName,
    required this.locationCode,
    required this.employeeCode,
    required this.designation,
    required this.joiningDate,
    required this.workingDaysPerWeek,
    required this.status,
    this.todayAttendance,
    this.openTaskCount = 0,
    this.phone,
  });

  final String id;
  final String userId;
  final String name;
  final String email;
  final String locationId;
  final String locationName;
  final String locationCode;
  final String employeeCode;
  final String designation;
  final DateTime joiningDate;
  final int workingDaysPerWeek;
  final StaffStatus status;
  final StaffAttendanceRecord? todayAttendance;
  final int openTaskCount;
  final String? phone;

  String get initials {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  factory StaffMember.fromJson(Map<dynamic, dynamic> json) => StaffMember(
    id: json['id'] as String,
    userId: (json['user_id'] ?? '') as String,
    name: (json['name'] ?? '') as String,
    email: (json['email'] ?? '') as String,
    locationId: (json['location_id'] ?? '') as String,
    locationName: (json['location_name'] ?? '') as String,
    locationCode: (json['location_code'] ?? '') as String,
    employeeCode: (json['employee_code'] ?? '') as String,
    designation: (json['designation'] ?? '') as String,
    joiningDate: DateTime.tryParse((json['joining_date'] ?? '') as String) ?? DateTime.now(),
    workingDaysPerWeek: (json['working_days_per_week'] as num?)?.toInt() ?? 6,
    status: StaffStatusExt.fromApi((json['status'] ?? 'active') as String),
    phone: json['phone'] as String?,
    openTaskCount: (json['open_task_count'] as num?)?.toInt() ?? 0,
    todayAttendance: json['today_attendance'] != null
        ? StaffAttendanceRecord.fromJson(json['today_attendance'] as Map<dynamic, dynamic>)
        : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'user_id': userId,
    'name': name,
    'email': email,
    'location_id': locationId,
    'location_name': locationName,
    'location_code': locationCode,
    'employee_code': employeeCode,
    'designation': designation,
    'joining_date': joiningDate.toIso8601String(),
    'working_days_per_week': workingDaysPerWeek,
    'status': status.apiValue,
    'phone': phone,
    'open_task_count': openTaskCount,
  };
}

// ─── Attendance (GPS-aware) ───────────────────────────────────────────────────

class StaffAttendanceRecord {
  const StaffAttendanceRecord({
    required this.id,
    required this.staffId,
    required this.date,
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.checkInLat,
    this.checkInLng,
    this.checkOutLat,
    this.checkOutLng,
    this.checkInDistanceMeters,
    this.checkOutDistanceMeters,
    this.isWithinGeofence = true,
    this.isLate = false,
    this.lateByMinutes = 0,
    this.notes,
    this.staffName,
  });

  final String id;
  final String staffId;
  final DateTime date;
  final AttendanceStatus status;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final double? checkInLat;
  final double? checkInLng;
  final double? checkOutLat;
  final double? checkOutLng;
  final int? checkInDistanceMeters;
  final int? checkOutDistanceMeters;
  final bool isWithinGeofence;
  final bool isLate;
  final int lateByMinutes;
  final String? notes;
  final String? staffName;

  bool get isCheckedIn => checkInTime != null;
  bool get isCheckedOut => checkOutTime != null;
  bool get isComplete => isCheckedIn && isCheckedOut;

  Duration get workedDuration {
    if (!isCheckedIn || !isCheckedOut) return Duration.zero;
    return checkOutTime!.difference(checkInTime!);
  }

  String get workedDurationString {
    final d = workedDuration;
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    return '${h}h ${m}m';
  }

  factory StaffAttendanceRecord.fromJson(Map<dynamic, dynamic> json) =>
      StaffAttendanceRecord(
        id: json['id'] as String,
        staffId: (json['staff_id'] ?? '') as String,
        date: DateTime.tryParse((json['date'] ?? '') as String) ?? DateTime.now(),
        status: AttendanceStatusApi.fromApi((json['status'] ?? 'present') as String),
        checkInTime: json['check_in_time'] != null
            ? DateTime.tryParse(json['check_in_time'] as String)
            : null,
        checkOutTime: json['check_out_time'] != null
            ? DateTime.tryParse(json['check_out_time'] as String)
            : null,
        checkInLat: (json['check_in_lat'] as num?)?.toDouble(),
        checkInLng: (json['check_in_lng'] as num?)?.toDouble(),
        checkOutLat: (json['check_out_lat'] as num?)?.toDouble(),
        checkOutLng: (json['check_out_lng'] as num?)?.toDouble(),
        checkInDistanceMeters: (json['check_in_distance_meters'] as num?)?.toInt(),
        checkOutDistanceMeters: (json['check_out_distance_meters'] as num?)?.toInt(),
        isWithinGeofence: (json['is_within_geofence'] as bool?) ?? true,
        isLate: (json['is_late'] as bool?) ?? false,
        lateByMinutes: (json['late_by_minutes'] as num?)?.toInt() ?? 0,
        notes: json['notes'] as String?,
        staffName: json['staff_name'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'staff_id': staffId,
    'date': date.toIso8601String().split('T')[0],
    'status': status.apiValue,
    'check_in_time': checkInTime?.toIso8601String(),
    'check_out_time': checkOutTime?.toIso8601String(),
    'check_in_lat': checkInLat,
    'check_in_lng': checkInLng,
    'check_out_lat': checkOutLat,
    'check_out_lng': checkOutLng,
    'check_in_distance_meters': checkInDistanceMeters,
    'check_out_distance_meters': checkOutDistanceMeters,
    'is_within_geofence': isWithinGeofence,
    'is_late': isLate,
    'late_by_minutes': lateByMinutes,
    'notes': notes,
    'staff_name': staffName,
  };
}

class AttendanceMonthlySummary {
  const AttendanceMonthlySummary({
    required this.staffId,
    required this.staffName,
    required this.month,
    required this.year,
    required this.presentDays,
    required this.absentDays,
    required this.lateDays,
    required this.halfDays,
    required this.leaveDays,
    required this.workingDays,
  });

  final String staffId;
  final String staffName;
  final int month;
  final int year;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int halfDays;
  final int leaveDays;
  final int workingDays;

  int get totalPresent => presentDays + lateDays;

  factory AttendanceMonthlySummary.fromJson(Map<dynamic, dynamic> json) =>
      AttendanceMonthlySummary(
        staffId: (json['staff_id'] ?? '') as String,
        staffName: (json['staff_name'] ?? '') as String,
        month: (json['month'] as num?)?.toInt() ?? DateTime.now().month,
        year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
        presentDays: (json['present_days'] as num?)?.toInt() ?? 0,
        absentDays: (json['absent_days'] as num?)?.toInt() ?? 0,
        lateDays: (json['late_days'] as num?)?.toInt() ?? 0,
        halfDays: (json['half_days'] as num?)?.toInt() ?? 0,
        leaveDays: (json['leave_days'] as num?)?.toInt() ?? 0,
        workingDays: (json['working_days'] as num?)?.toInt() ?? 26,
      );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

class Task {
  const Task({
    required this.id,
    required this.taskCode,
    required this.title,
    required this.description,
    required this.locationId,
    required this.assignedToId,
    required this.assignedToName,
    required this.assignedById,
    required this.assignedByName,
    required this.priority,
    required this.status,
    required this.dueDate,
    required this.createdAt,
    this.completedAt,
    this.completionNote,
    this.relatedOrderId,
    this.relatedEntityType,
    this.syncStatus = SyncStatus.synced,
  });

  final String id;
  final String taskCode;
  final String title;
  final String description;
  final String locationId;
  final String assignedToId;
  final String assignedToName;
  final String assignedById;
  final String assignedByName;
  final TaskPriority priority;
  final TaskStatus status;
  final DateTime dueDate;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? completionNote;
  final String? relatedOrderId;
  final String? relatedEntityType;
  final SyncStatus syncStatus;

  bool get isOverdue =>
      status != TaskStatus.completed &&
      status != TaskStatus.cancelled &&
      dueDate.isBefore(DateTime.now());

  bool get isDueToday {
    final today = DateTime.now();
    return dueDate.year == today.year &&
        dueDate.month == today.month &&
        dueDate.day == today.day;
  }

  Task copyWith({
    TaskStatus? status,
    DateTime? completedAt,
    String? completionNote,
    SyncStatus? syncStatus,
  }) {
    return Task(
      id: id,
      taskCode: taskCode,
      title: title,
      description: description,
      locationId: locationId,
      assignedToId: assignedToId,
      assignedToName: assignedToName,
      assignedById: assignedById,
      assignedByName: assignedByName,
      priority: priority,
      status: status ?? this.status,
      dueDate: dueDate,
      createdAt: createdAt,
      completedAt: completedAt ?? this.completedAt,
      completionNote: completionNote ?? this.completionNote,
      relatedOrderId: relatedOrderId,
      relatedEntityType: relatedEntityType,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'task_code': taskCode,
    'title': title,
    'description': description,
    'location_id': locationId,
    'assigned_to_id': assignedToId,
    'assigned_to_name': assignedToName,
    'assigned_by_id': assignedById,
    'assigned_by_name': assignedByName,
    'priority': priority.apiValue,
    'status': status.apiValue,
    'due_date': dueDate.toIso8601String().split('T')[0],
    'created_at': createdAt.toIso8601String(),
    'completed_at': completedAt?.toIso8601String(),
    'completion_note': completionNote,
    'related_order_id': relatedOrderId,
    'related_entity_type': relatedEntityType,
    'sync_status': syncStatus.name,
  };

  factory Task.fromJson(Map<dynamic, dynamic> json) => Task(
    id: json['id'] as String,
    taskCode: (json['task_code'] ?? '') as String,
    title: (json['title'] ?? '') as String,
    description: (json['description'] ?? '') as String,
    locationId: (json['location_id'] ?? '') as String,
    assignedToId: (json['assigned_to_id'] ?? json['assigned_to'] ?? '') as String,
    assignedToName: (json['assigned_to_name'] ?? '') as String,
    assignedById: (json['assigned_by_id'] ?? json['assigned_by'] ?? '') as String,
    assignedByName: (json['assigned_by_name'] ?? '') as String,
    priority: TaskPriorityExt.fromApi((json['priority'] ?? 'medium') as String),
    status: TaskStatusExt.fromApi((json['status'] ?? 'pending') as String),
    dueDate: DateTime.tryParse((json['due_date'] ?? '') as String) ??
        DateTime.now().add(const Duration(days: 1)),
    createdAt: DateTime.tryParse((json['created_at'] ?? '') as String) ?? DateTime.now(),
    completedAt: json['completed_at'] != null
        ? DateTime.tryParse(json['completed_at'] as String)
        : null,
    completionNote: json['completion_note'] as String?,
    relatedOrderId: json['related_order_id'] as String?,
    relatedEntityType: json['related_entity_type'] as String?,
    syncStatus: json['sync_status'] != null
        ? SyncStatus.values.byName(json['sync_status'] as String)
        : SyncStatus.synced,
  );
}

// ─── Legacy staff records (kept for backward compatibility) ───────────────────

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
        status: AttendanceStatusApi.fromApi((json['status'] ?? 'present') as String),
        markedAt: DateTime.tryParse((json['marked_at'] ?? '') as String) ?? DateTime.now(),
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
          .map((e) => AttendanceRecord.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      salaryPayouts: (json['salary_payouts'] as List<dynamic>? ?? const <dynamic>[])
          .map((e) => SalaryPayoutRecord.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      leaveRecords: (json['leave_records'] as List<dynamic>? ?? const <dynamic>[])
          .map((e) => LeaveRecord.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}
