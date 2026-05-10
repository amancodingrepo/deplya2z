import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/inventory_filter_bar.dart';
import 'widgets/inventory_catalog_tools.dart';

class EmployeeScreen extends ConsumerStatefulWidget {
  const EmployeeScreen({super.key});

  @override
  ConsumerState<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends ConsumerState<EmployeeScreen> {
  int _tabIndex = 0;
  DateTime _attendanceDate = DateTime.now();
  String _attendanceSearch = '';
  String _inventorySearch = '';
  String _inventoryCategory = '';
  String _inventoryDevice = '';
  String _inventoryBrand = '';
  String _inventoryModel = '';
  String _inventoryColor = '';
  InventoryStockFilter _inventoryStockFilter = InventoryStockFilter.all;
  InventorySortOption _inventorySortOption = InventorySortOption.relevance;

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _pickAttendanceDate(BuildContext context) async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _attendanceDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      builder: (ctx, child) {
        return Theme(
          data: Theme.of(ctx).copyWith(
            colorScheme: Theme.of(
              ctx,
            ).colorScheme.copyWith(primary: AppTheme.primary),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
    if (selected != null) {
      setState(() => _attendanceDate = selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final session = state.session;

    if (session == null || session.role != UserRole.superadmin) {
      return const Scaffold(
        body: Center(
          child: Text(
            'Employee app is available for superadmin only.',
            style: TextStyle(color: AppTheme.textPrimary),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee App'),
        actions: [
          IconButton(
            onPressed: state.loading ? null : controller.refreshData,
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            onPressed: controller.logout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context),
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add Employee'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.surfaceLight),
              ),
              child: Row(
                children: [
                  const Icon(Icons.groups_2_rounded, color: AppTheme.primary),
                  const SizedBox(width: 10),
                  Text(
                    'Employees: ${state.employees.length}',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Inventory: ${state.adminInventory.length}',
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<int>(
                segments: const [
                  ButtonSegment<int>(value: 0, label: Text('Users')),
                  ButtonSegment<int>(value: 1, label: Text('Attendance')),
                  ButtonSegment<int>(value: 2, label: Text('Payout/Leave')),
                  ButtonSegment<int>(value: 3, label: Text('Orders')),
                  ButtonSegment<int>(value: 4, label: Text('Inventory')),
                ],
                selected: <int>{_tabIndex},
                onSelectionChanged: (value) {
                  setState(() => _tabIndex = value.first);
                },
              ),
            ),
            if (state.message != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.info.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.info.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  state.message!,
                  style: const TextStyle(color: AppTheme.info),
                ),
              ),
            ],
            const SizedBox(height: 12),
            if (_tabIndex == 0) ...[
              ...state.employees.map(
                (employee) => _EmployeeCard(
                  employee: employee,
                  onStatusChanged: (active) =>
                      controller.setEmployeeActive(employee.id, active),
                  onDelete: () => controller.deleteEmployee(employee.id),
                ),
              ),
            ],
            if (_tabIndex == 1) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.surfaceLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.event_available_rounded,
                          color: AppTheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Attendance for ${DateFormat('dd MMM yyyy').format(_attendanceDate)}',
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => _pickAttendanceDate(context),
                          icon: const Icon(
                            Icons.calendar_today_rounded,
                            size: 16,
                          ),
                          label: const Text('Change'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      onChanged: (value) => setState(
                        () => _attendanceSearch = value.trim().toLowerCase(),
                      ),
                      style: const TextStyle(color: AppTheme.textPrimary),
                      decoration: const InputDecoration(
                        hintText: 'Filter by name or email',
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          color: AppTheme.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Builder(
                builder: (context) {
                  final selectedDayRecords = state.attendanceRecords
                      .where(
                        (record) =>
                            _isSameDay(record.attendanceDate, _attendanceDate),
                      )
                      .toList();
                  final presentCount = selectedDayRecords
                      .where(
                        (record) => record.status == AttendanceStatus.present,
                      )
                      .length;
                  final lateCount = selectedDayRecords
                      .where(
                        (record) => record.status == AttendanceStatus.halfDay,
                      )
                      .length;
                  final leaveCount = selectedDayRecords
                      .where(
                        (record) => record.status == AttendanceStatus.leave,
                      )
                      .length;
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _attendanceSummaryChip(
                        'Present',
                        presentCount,
                        AppTheme.success,
                      ),
                      _attendanceSummaryChip(
                        'Half Day',
                        lateCount,
                        AppTheme.warning,
                      ),
                      _attendanceSummaryChip(
                        'Leave',
                        leaveCount,
                        AppTheme.info,
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 10),
              ...state.employees
                  .where((employee) {
                    if (_attendanceSearch.isEmpty) return true;
                    final haystack = '${employee.name} ${employee.email}'
                        .toLowerCase();
                    return haystack.contains(_attendanceSearch);
                  })
                  .map((employee) {
                    final matches = state.attendanceRecords
                        .where(
                          (record) =>
                              record.userId == employee.id &&
                              _isSameDay(
                                record.attendanceDate,
                                _attendanceDate,
                              ),
                        )
                        .toList();
                    final AttendanceRecord? currentRecord = matches.isNotEmpty
                        ? matches.first
                        : null;
                    return _AttendanceCard(
                      employee: employee,
                      markedStatus: currentRecord?.status,
                      onMark: (status) => controller.addAttendanceForEmployee(
                        userId: employee.id,
                        attendanceDate: _attendanceDate,
                        status: status,
                      ),
                    );
                  }),
              const SizedBox(height: 10),
              ...state.attendanceRecords
                  .take(40)
                  .map(
                    (record) => ListTile(
                      dense: true,
                      title: Text(
                        record.userName,
                        style: const TextStyle(color: AppTheme.textPrimary),
                      ),
                      subtitle: Text(
                        '${DateFormat('dd MMM yyyy').format(record.attendanceDate)} • ${record.status.label}',
                        style: const TextStyle(color: AppTheme.textMuted),
                      ),
                    ),
                  ),
            ],
            if (_tabIndex == 2) ...[
              const Text(
                'Salary Payouts',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              ...state.salaryPayouts.map(
                (payout) => ListTile(
                  dense: true,
                  title: Text(
                    payout.userName,
                    style: const TextStyle(color: AppTheme.textPrimary),
                  ),
                  subtitle: Text(
                    '${payout.monthKey} • ${payout.netAmount.toStringAsFixed(2)}',
                    style: const TextStyle(color: AppTheme.textMuted),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Leave Records',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              ...state.leaveRecords.map(
                (leave) => ListTile(
                  dense: true,
                  title: Text(
                    leave.userName,
                    style: const TextStyle(color: AppTheme.textPrimary),
                  ),
                  subtitle: Text(
                    '${leave.leaveType} • ${DateFormat('dd MMM').format(leave.startDate)}-${DateFormat('dd MMM').format(leave.endDate)} • ${leave.status}',
                    style: const TextStyle(color: AppTheme.textMuted),
                  ),
                ),
              ),
            ],
            if (_tabIndex == 3) ...[
              ...state.orders.map(
                (order) => Card(
                  color: AppTheme.bgCard,
                  child: ListTile(
                    title: Text(
                      order.orderId,
                      style: const TextStyle(color: AppTheme.textPrimary),
                    ),
                    subtitle: Text(
                      '${order.status.name} • ${order.items.map((i) => '${i.title} x${i.quantity}').join(', ')}',
                      style: const TextStyle(color: AppTheme.textMuted),
                    ),
                    trailing: order.status == OrderStatus.draft
                        ? FilledButton(
                            onPressed: () => controller.transitionOrder(
                              order,
                              OrderStatus.confirmed,
                            ),
                            child: const Text('Approve'),
                          )
                        : null,
                  ),
                ),
              ),
            ],
            if (_tabIndex == 4) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Inventory Control',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => showInventoryCatalogManager(
                        context: context,
                        catalog: state.inventoryCatalog,
                        onAdd: controller.addInventoryCatalogValue,
                      ),
                      icon: const Icon(Icons.library_add_rounded),
                      label: const Text('Catalog'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: () => _showCreateInventoryDialog(context),
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('Add Item'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InventoryFilterBar(
                  searchValue: _inventorySearch,
                  onSearchChanged: (value) =>
                      setState(() => _inventorySearch = value),
                  categoryValue: _inventoryCategory,
                  onCategoryChanged: (value) =>
                      setState(() => _inventoryCategory = value),
                  categoryOptions: state.inventoryCatalog.categories,
                  deviceValue: _inventoryDevice,
                  onDeviceChanged: (value) =>
                      setState(() => _inventoryDevice = value),
                  deviceOptions: state.inventoryCatalog.devices,
                  brandValue: _inventoryBrand,
                  onBrandChanged: (value) =>
                      setState(() => _inventoryBrand = value),
                  brandOptions: inventoryFilterValues(
                    state.adminInventory,
                    (item) => item.brand,
                  ),
                  modelValue: _inventoryModel,
                  onModelChanged: (value) =>
                      setState(() => _inventoryModel = value),
                  modelOptions: state.inventoryCatalog.models,
                  colorValue: _inventoryColor,
                  onColorChanged: (value) =>
                      setState(() => _inventoryColor = value),
                  colorOptions: state.inventoryCatalog.colors,
                  stockFilter: _inventoryStockFilter,
                  onStockFilterChanged: (value) =>
                      setState(() => _inventoryStockFilter = value),
                  sortOption: _inventorySortOption,
                  onSortChanged: (value) =>
                      setState(() => _inventorySortOption = value),
                  onManageCatalog: () => showInventoryCatalogManager(
                    context: context,
                    catalog: state.inventoryCatalog,
                    onAdd: controller.addInventoryCatalogValue,
                  ),
                ),
              ),
              ...filterInventoryItems(
                state.adminInventory,
                search: _inventorySearch,
                category: _inventoryCategory,
                device: _inventoryDevice,
                brand: _inventoryBrand,
                model: _inventoryModel,
                color: _inventoryColor,
                stockFilter: _inventoryStockFilter,
                sort: _inventorySortOption,
              ).map(
                (item) => ListTile(
                  dense: true,
                  title: Text(
                    item.title,
                    style: const TextStyle(color: AppTheme.textPrimary),
                  ),
                  subtitle: Text(
                    '${item.sku} • ${item.locationId} • ${item.category}',
                    style: const TextStyle(color: AppTheme.textMuted),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${item.availableStock}',
                        style: const TextStyle(
                          color: AppTheme.success,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        item.color.isEmpty ? 'No color' : item.color,
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (state.employees.isEmpty && _tabIndex == 0)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: Center(
                  child: Text(
                    'No employees found.',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _attendanceSummaryChip(String label, int value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController(text: '1234');
    UserRole role = UserRole.storeManager;
    final defaultStoreLocations = state.locations
        .where((location) => location.type == 'store')
        .map((location) => location.code)
        .toList(growable: false);
    String? locationCode = defaultStoreLocations.isNotEmpty
        ? defaultStoreLocations.first
        : null;

    await showDialog<void>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocalState) {
            final locationOptions = state.locations.where((location) {
              if (role == UserRole.superadmin) {
                return false;
              }
              if (role == UserRole.warehouseManager) {
                return location.type == 'warehouse';
              }
              return location.type == 'store';
            }).toList();

            if (locationOptions.isNotEmpty &&
                (locationCode == null ||
                    !locationOptions.any(
                      (location) => location.code == locationCode,
                    ))) {
              locationCode = locationOptions.first.code;
            }

            return AlertDialog(
              backgroundColor: AppTheme.bgCard,
              title: const Text('Create Employee'),
              content: SingleChildScrollView(
                child: SizedBox(
                  width: 380,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: nameController,
                        decoration: const InputDecoration(labelText: 'Name'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: passwordController,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                        obscureText: true,
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<UserRole>(
                        initialValue: role,
                        items: const [
                          DropdownMenuItem(
                            value: UserRole.superadmin,
                            child: Text('Superadmin'),
                          ),
                          DropdownMenuItem(
                            value: UserRole.warehouseManager,
                            child: Text('Warehouse Manager'),
                          ),
                          DropdownMenuItem(
                            value: UserRole.storeManager,
                            child: Text('Store Manager'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value == null) return;
                          setLocalState(() {
                            role = value;
                            if (role == UserRole.superadmin) {
                              locationCode = null;
                            }
                          });
                        },
                        decoration: const InputDecoration(labelText: 'Role'),
                      ),
                      const SizedBox(height: 10),
                      if (role != UserRole.superadmin)
                        DropdownButtonFormField<String>(
                          initialValue: locationCode,
                          items: locationOptions
                              .map(
                                (location) => DropdownMenuItem(
                                  value: location.code,
                                  child: Text(
                                    '${location.code} - ${location.name}',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) =>
                              setLocalState(() => locationCode = value),
                          decoration: const InputDecoration(
                            labelText: 'Location',
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () async {
                    await controller.createEmployee(
                      name: nameController.text.trim(),
                      email: emailController.text.trim(),
                      password: passwordController.text.trim(),
                      role: role,
                      locationId: locationCode,
                    );
                    if (context.mounted) {
                      Navigator.pop(ctx);
                    }
                  },
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _showCreateInventoryDialog(BuildContext context) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final locationOptions = state.locations
        .where((location) => location.type != 'global')
        .toList(growable: false);

    await showInventoryEditorDialog(
      context: context,
      title: 'Create Inventory Item',
      actionLabel: 'Create',
      catalog: state.inventoryCatalog,
      locationOptions: locationOptions,
      initialLocationId: locationOptions.isEmpty
          ? null
          : locationOptions.first.id,
      onSubmit: (values) => controller.createInventoryItem(
        sku: values.sku,
        title: values.title,
        brand: values.brand,
        category: values.category.isEmpty ? null : values.category,
        model: values.model.isEmpty ? null : values.model,
        color: values.color.isEmpty ? null : values.color,
        totalStock: values.totalStock,
        locationId: values.locationId,
      ),
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({
    required this.employee,
    required this.onStatusChanged,
    required this.onDelete,
  });

  final EmployeeUser employee;
  final ValueChanged<bool> onStatusChanged;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.surfaceLight),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.name,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  employee.email,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${employee.roleLabel} • ${employee.locationId ?? 'GLOBAL'}',
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Switch(value: employee.isActive, onChanged: onStatusChanged),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(
              Icons.delete_outline_rounded,
              color: AppTheme.error,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({
    required this.employee,
    required this.onMark,
    this.markedStatus,
  });

  final EmployeeUser employee;
  final ValueChanged<AttendanceStatus> onMark;
  final AttendanceStatus? markedStatus;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.surfaceLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            employee.name,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            employee.email,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            '${employee.roleLabel} • ${employee.locationId ?? 'GLOBAL'}',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          if (markedStatus != null) ...[
            const SizedBox(height: 6),
            Text(
              'Marked: ${markedStatus!.label}',
              style: const TextStyle(
                color: AppTheme.success,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AttendanceStatus.values
                .map(
                  (status) => OutlinedButton(
                    onPressed: () => onMark(status),
                    child: Text(status.label),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}
