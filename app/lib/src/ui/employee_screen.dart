import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/notification_bell.dart';

// ── Entry point ───────────────────────────────────────────────────────────────

class EmployeeScreen extends ConsumerStatefulWidget {
  const EmployeeScreen({super.key});

  @override
  ConsumerState<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends ConsumerState<EmployeeScreen> {
  int _navIndex = 0;

  static const _navItems = [
    BottomNavigationBarItem(
      icon: Icon(Icons.people_rounded),
      label: 'Users',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.inventory_2_rounded),
      label: 'Products',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.hub_rounded),
      label: 'Network',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.receipt_long_rounded),
      label: 'Orders',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.badge_rounded),
      label: 'HR',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final session = state.session;

    ref.listen(appControllerProvider, (prev, next) {
      if (next.message != null && next.message != prev?.message) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message!),
            behavior: SnackBarBehavior.floating,
          ),
        );
        controller.clearMessage();
      }
    });

    if (session == null || session.role != UserRole.superadmin) {
      return const Scaffold(
        backgroundColor: AppTheme.bgDark,
        body: Center(
          child: Text(
            'Superadmin access only.',
            style: TextStyle(color: AppTheme.textPrimary),
          ),
        ),
      );
    }

    final tabs = [
      _UsersTab(key: const ValueKey('users')),
      _ProductsTab(key: const ValueKey('products')),
      _NetworkTab(key: const ValueKey('network')),
      _OrdersTab(key: const ValueKey('orders')),
      _HrTab(key: const ValueKey('hr')),
    ];

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        backgroundColor: AppTheme.white,
        elevation: 0,
        title: const Text(
          'Admin',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        actions: [
          if (state.loading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          const NotificationBell(),
          IconButton(
            onPressed: state.loading ? null : controller.refreshData,
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textPrimary),
          ),
          IconButton(
            onPressed: controller.logout,
            icon: const Icon(Icons.logout_rounded, color: AppTheme.textPrimary),
          ),
        ],
      ),
      body: tabs[_navIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        type: BottomNavigationBarType.fixed,
        backgroundColor: AppTheme.white,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.s500,
        selectedLabelStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: _navItems,
      ),
    );
  }
}

// ── Shared card decoration ────────────────────────────────────────────────────

BoxDecoration _cardDecor({Color? color}) => BoxDecoration(
  color: color ?? AppTheme.white,
  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
  border: Border.all(color: AppTheme.s200),
  boxShadow: AppTheme.cardShadow,
);

// ─────────────────────────────────────────────────────────────────────────────
// Tab 0 — Users
// ─────────────────────────────────────────────────────────────────────────────

class _UsersTab extends ConsumerWidget {
  const _UsersTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context, ref),
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add Employee'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionHeader(
              icon: Icons.people_rounded,
              title: '${state.employees.length} Employees',
            ),
            const SizedBox(height: 12),
            if (state.employees.isEmpty)
              const _EmptyState(message: 'No employees found.')
            else
              ...state.employees.map(
                (e) => _EmployeeCard(
                  employee: e,
                  onStatusChanged: (active) =>
                      controller.setEmployeeActive(e.id, active),
                  onEdit: () => _showEditDialog(context, ref, e),
                  onResetPassword: () =>
                      _showResetPasswordDialog(context, ref, e),
                  onDelete: () => controller.deleteEmployee(e.id),
                ),
              ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController(text: '1234');
    UserRole role = UserRole.storeManager;
    String? locationCode = state.locations
        .where((l) => l.type == 'store')
        .map((l) => l.code)
        .firstOrNull;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final locOptions = state.locations.where((l) {
            if (role == UserRole.superadmin) return false;
            if (role == UserRole.warehouseManager) return l.type == 'warehouse';
            return l.type == 'store';
          }).toList();
          if (locOptions.isNotEmpty &&
              (locationCode == null ||
                  !locOptions.any((l) => l.code == locationCode))) {
            locationCode = locOptions.first.code;
          }

          return AlertDialog(
            backgroundColor: AppTheme.white,
            title: const Text('Add Employee'),
            content: SingleChildScrollView(
              child: SizedBox(
                width: 360,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Full Name'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: passCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password'),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<UserRole>(
                      initialValue: role,
                      decoration: const InputDecoration(labelText: 'Role'),
                      items: const [
                        DropdownMenuItem(
                          value: UserRole.warehouseManager,
                          child: Text('Warehouse Manager'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.storeManager,
                          child: Text('Store Manager'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.staff,
                          child: Text('Staff'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.superadmin,
                          child: Text('Superadmin'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setLocal(() {
                          role = v;
                          if (v == UserRole.superadmin) locationCode = null;
                        });
                      },
                    ),
                    if (role != UserRole.superadmin) ...[
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: locationCode,
                        decoration: const InputDecoration(labelText: 'Location'),
                        items: locOptions
                            .map((l) => DropdownMenuItem(
                                  value: l.code,
                                  child: Text('${l.code} — ${l.name}'),
                                ))
                            .toList(),
                        onChanged: (v) => setLocal(() => locationCode = v),
                      ),
                    ],
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
                    name: nameCtrl.text.trim(),
                    email: emailCtrl.text.trim(),
                    password: passCtrl.text.trim(),
                    role: role,
                    locationId: locationCode,
                  );
                  if (context.mounted) Navigator.pop(ctx);
                },
                child: const Text('Create'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showEditDialog(
    BuildContext context,
    WidgetRef ref,
    EmployeeUser employee,
  ) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final nameCtrl = TextEditingController(text: employee.name);
    final emailCtrl = TextEditingController(text: employee.email);
    UserRole role = employee.role;
    String? locationCode = employee.locationId;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final locOptions = state.locations.where((l) {
            if (role == UserRole.superadmin) return false;
            if (role == UserRole.warehouseManager) return l.type == 'warehouse';
            return l.type == 'store';
          }).toList();

          return AlertDialog(
            backgroundColor: AppTheme.white,
            title: Text('Edit — ${employee.name}'),
            content: SingleChildScrollView(
              child: SizedBox(
                width: 360,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Name'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<UserRole>(
                      initialValue: role,
                      decoration: const InputDecoration(labelText: 'Role'),
                      items: const [
                        DropdownMenuItem(
                          value: UserRole.warehouseManager,
                          child: Text('Warehouse Manager'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.storeManager,
                          child: Text('Store Manager'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.staff,
                          child: Text('Staff'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.superadmin,
                          child: Text('Superadmin'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setLocal(() {
                          role = v;
                          if (v == UserRole.superadmin) locationCode = null;
                        });
                      },
                    ),
                    if (role != UserRole.superadmin && locOptions.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: locationCode,
                        decoration: const InputDecoration(labelText: 'Location'),
                        items: locOptions
                            .map((l) => DropdownMenuItem(
                                  value: l.code,
                                  child: Text('${l.code} — ${l.name}'),
                                ))
                            .toList(),
                        onChanged: (v) => setLocal(() => locationCode = v),
                      ),
                    ],
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
                  await controller.editEmployee(
                    userId: employee.id,
                    name: nameCtrl.text.trim().isEmpty
                        ? null
                        : nameCtrl.text.trim(),
                    email: emailCtrl.text.trim().isEmpty
                        ? null
                        : emailCtrl.text.trim(),
                    role: role,
                    locationId: locationCode,
                  );
                  if (context.mounted) Navigator.pop(ctx);
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showResetPasswordDialog(
    BuildContext context,
    WidgetRef ref,
    EmployeeUser employee,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final passCtrl = TextEditingController();
    bool obscure = true;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: Text('Reset Password — ${employee.name}'),
          content: TextField(
            controller: passCtrl,
            obscureText: obscure,
            decoration: InputDecoration(
              labelText: 'New Password',
              suffixIcon: IconButton(
                onPressed: () => setLocal(() => obscure = !obscure),
                icon: Icon(
                  obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                ),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppTheme.amber),
              onPressed: () async {
                if (passCtrl.text.trim().length < 4) return;
                await controller.resetEmployeePassword(
                  userId: employee.id,
                  newPassword: passCtrl.text.trim(),
                );
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Reset'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({
    required this.employee,
    required this.onStatusChanged,
    required this.onEdit,
    required this.onResetPassword,
    required this.onDelete,
  });

  final EmployeeUser employee;
  final ValueChanged<bool> onStatusChanged;
  final VoidCallback onEdit;
  final VoidCallback onResetPassword;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: _cardDecor(),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppTheme.primaryBg,
            child: Text(
              employee.name.isNotEmpty
                  ? employee.name[0].toUpperCase()
                  : '?',
              style: const TextStyle(
                color: AppTheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
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
                const SizedBox(height: 1),
                Text(
                  employee.email,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
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
          Switch(
            value: employee.isActive,
            onChanged: onStatusChanged,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, color: AppTheme.s500),
            onSelected: (v) {
              if (v == 'edit') onEdit();
              if (v == 'reset') onResetPassword();
              if (v == 'delete') onDelete();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_rounded, size: 18, color: AppTheme.primary),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'reset',
                child: Row(
                  children: [
                    Icon(Icons.lock_reset_rounded,
                        size: 18, color: AppTheme.amber),
                    SizedBox(width: 8),
                    Text('Reset Password'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline_rounded,
                        size: 18, color: AppTheme.red),
                    SizedBox(width: 8),
                    Text('Delete', style: TextStyle(color: AppTheme.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Products
// ─────────────────────────────────────────────────────────────────────────────

class _ProductsTab extends ConsumerWidget {
  const _ProductsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateProductDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Product'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionHeader(
              icon: Icons.inventory_2_rounded,
              title: '${state.products.length} Products',
            ),
            const SizedBox(height: 12),
            if (state.products.isEmpty)
              const _EmptyState(message: 'No products found.')
            else
              ...state.products.map(
                (p) => _ProductCard(
                  product: p,
                  onEdit: () => _showEditProductDialog(context, ref, p),
                  onDelete: () => _confirmDeleteProduct(context, ref, p),
                ),
              ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateProductDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final titleCtrl = TextEditingController();
    final shortNameCtrl = TextEditingController();
    final skuCtrl = TextEditingController();
    final brandCtrl = TextEditingController();
    final categoryCtrl = TextEditingController();
    final modelCtrl = TextEditingController();
    final colorCtrl = TextEditingController();
    String status = 'present';
    Uint8List? imageBytes;
    String? imageFilename;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: const Text('Add Product'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(labelText: 'Title *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: shortNameCtrl,
                    decoration: const InputDecoration(labelText: 'Short Name *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: skuCtrl,
                    decoration: const InputDecoration(labelText: 'SKU *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: brandCtrl,
                    decoration: const InputDecoration(labelText: 'Brand *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: categoryCtrl,
                    decoration: const InputDecoration(labelText: 'Category'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: modelCtrl,
                    decoration: const InputDecoration(labelText: 'Model'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: colorCtrl,
                    decoration: const InputDecoration(labelText: 'Color'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('Present')),
                      DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                      DropdownMenuItem(value: 'discontinued', child: Text('Discontinued')),
                    ],
                    onChanged: (v) {
                      if (v != null) setLocal(() => status = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  // ── Image picker ──────────────────────────────────
                  GestureDetector(
                    onTap: () async {
                      final picker = ImagePicker();
                      final picked = await picker.pickImage(
                        source: ImageSource.gallery,
                        maxWidth: 1200,
                        imageQuality: 90,
                      );
                      if (picked != null) {
                        final bytes = await picked.readAsBytes();
                        setLocal(() {
                          imageBytes = bytes;
                          imageFilename = picked.name;
                        });
                      }
                    },
                    child: Container(
                      height: 80,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.s200),
                        borderRadius: BorderRadius.circular(8),
                        color: AppTheme.s50,
                      ),
                      child: imageBytes != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(7),
                              child: Image.memory(
                                imageBytes!,
                                fit: BoxFit.cover,
                                width: double.infinity,
                              ),
                            )
                          : const Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.add_photo_alternate_outlined, color: AppTheme.s500),
                                  SizedBox(height: 4),
                                  Text(
                                    'Tap to add image',
                                    style: TextStyle(fontSize: 12, color: AppTheme.s500),
                                  ),
                                ],
                              ),
                            ),
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
                if (titleCtrl.text.trim().isEmpty ||
                    skuCtrl.text.trim().isEmpty ||
                    brandCtrl.text.trim().isEmpty) {
                  return;
                }
                await controller.createProduct(
                  title: titleCtrl.text.trim(),
                  shortName: shortNameCtrl.text.trim().isEmpty
                      ? titleCtrl.text.trim()
                      : shortNameCtrl.text.trim(),
                  sku: skuCtrl.text.trim(),
                  brand: brandCtrl.text.trim(),
                  category: categoryCtrl.text.trim().isEmpty ? null : categoryCtrl.text.trim(),
                  model: modelCtrl.text.trim().isEmpty ? null : modelCtrl.text.trim(),
                  color: colorCtrl.text.trim().isEmpty ? null : colorCtrl.text.trim(),
                  status: status,
                );
                // Upload image after product is created
                if (imageBytes != null && context.mounted) {
                  final appState = ref.read(appControllerProvider);
                  final newProduct = appState.products.firstWhere(
                    (p) => p.sku == skuCtrl.text.trim(),
                    orElse: () => appState.products.last,
                  );
                  await controller.uploadProductImage(
                    productId: newProduct.id,
                    bytes: imageBytes!,
                    filename: imageFilename ?? 'product.jpg',
                  );
                }
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditProductDialog(
    BuildContext context,
    WidgetRef ref,
    Product product,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final titleCtrl = TextEditingController(text: product.title);
    final shortNameCtrl = TextEditingController(text: product.shortName);
    final brandCtrl = TextEditingController(text: product.brand);
    final categoryCtrl = TextEditingController(text: product.category);
    final modelCtrl = TextEditingController(text: product.model);
    final colorCtrl = TextEditingController(text: product.color);
    String status = product.status;
    Uint8List? imageBytes;
    String? imageFilename;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: Text('Edit — ${product.sku}'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(labelText: 'Title'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: shortNameCtrl,
                    decoration: const InputDecoration(labelText: 'Short Name'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: brandCtrl,
                    decoration: const InputDecoration(labelText: 'Brand'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: categoryCtrl,
                    decoration: const InputDecoration(labelText: 'Category'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: modelCtrl,
                    decoration: const InputDecoration(labelText: 'Model'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: colorCtrl,
                    decoration: const InputDecoration(labelText: 'Color'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('Present')),
                      DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                      DropdownMenuItem(value: 'discontinued', child: Text('Discontinued')),
                    ],
                    onChanged: (v) {
                      if (v != null) setLocal(() => status = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  // ── Image picker / replacer ───────────────────────
                  GestureDetector(
                    onTap: () async {
                      final picker = ImagePicker();
                      final picked = await picker.pickImage(
                        source: ImageSource.gallery,
                        maxWidth: 1200,
                        imageQuality: 90,
                      );
                      if (picked != null) {
                        final bytes = await picked.readAsBytes();
                        setLocal(() {
                          imageBytes = bytes;
                          imageFilename = picked.name;
                        });
                      }
                    },
                    child: Container(
                      height: 80,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.s200),
                        borderRadius: BorderRadius.circular(8),
                        color: AppTheme.s50,
                      ),
                      child: imageBytes != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(7),
                              child: Image.memory(
                                imageBytes!,
                                fit: BoxFit.cover,
                                width: double.infinity,
                              ),
                            )
                          : (product.imageUrl != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(7),
                                  child: Image.network(
                                    product.imageUrl!,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    errorBuilder: (_, __, ___) => const Center(
                                      child: Icon(Icons.broken_image_outlined, color: AppTheme.s500),
                                    ),
                                  ),
                                )
                              : const Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.add_photo_alternate_outlined, color: AppTheme.s500),
                                      SizedBox(height: 4),
                                      Text(
                                        'Tap to replace image',
                                        style: TextStyle(fontSize: 12, color: AppTheme.s500),
                                      ),
                                    ],
                                  ),
                                )),
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
                await controller.updateProduct(
                  productId: product.id,
                  title: titleCtrl.text.trim().isEmpty ? null : titleCtrl.text.trim(),
                  shortName: shortNameCtrl.text.trim().isEmpty ? null : shortNameCtrl.text.trim(),
                  brand: brandCtrl.text.trim().isEmpty ? null : brandCtrl.text.trim(),
                  category: categoryCtrl.text.trim().isEmpty ? null : categoryCtrl.text.trim(),
                  model: modelCtrl.text.trim().isEmpty ? null : modelCtrl.text.trim(),
                  color: colorCtrl.text.trim().isEmpty ? null : colorCtrl.text.trim(),
                  status: status,
                );
                if (imageBytes != null && context.mounted) {
                  await controller.uploadProductImage(
                    productId: product.id,
                    bytes: imageBytes!,
                    filename: imageFilename ?? 'product.jpg',
                  );
                }
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDeleteProduct(
    BuildContext context,
    WidgetRef ref,
    Product product,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        title: const Text('Delete Product'),
        content: Text(
          'Delete "${product.title}" (${product.sku})? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await controller.deleteProduct(product.id);
    }
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.onEdit,
    required this.onDelete,
  });

  final Product product;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  Color get _statusColor => switch (product.status) {
        'present' => AppTheme.green,
        'inactive' => AppTheme.amber,
        _ => AppTheme.red,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: _cardDecor(),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.primaryBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.inventory_2_rounded,
              color: AppTheme.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.title,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        product.status,
                        style: TextStyle(
                          color: _statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'SKU: ${product.sku}  •  ${product.brand}',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                if (product.category.isNotEmpty || product.color.isNotEmpty)
                  Text(
                    [
                      if (product.category.isNotEmpty) product.category,
                      if (product.color.isNotEmpty) product.color,
                    ].join(' • '),
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                onPressed: onEdit,
                icon: const Icon(
                  Icons.edit_rounded,
                  size: 18,
                  color: AppTheme.primary,
                ),
                tooltip: 'Edit',
              ),
              IconButton(
                onPressed: onDelete,
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 18,
                  color: AppTheme.red,
                ),
                tooltip: 'Delete',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Network (Locations + Clients)
// ─────────────────────────────────────────────────────────────────────────────

class _NetworkTab extends ConsumerStatefulWidget {
  const _NetworkTab({super.key});

  @override
  ConsumerState<_NetworkTab> createState() => _NetworkTabState();
}

class _NetworkTabState extends ConsumerState<_NetworkTab>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: AppTheme.white,
          child: TabBar(
            controller: _tabCtrl,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.s500,
            indicatorColor: AppTheme.primary,
            tabs: const [
              Tab(text: 'Locations'),
              Tab(text: 'Clients'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _LocationsView(),
              _ClientsView(),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Locations View ────────────────────────────────────────────────────────────

class _LocationsView extends ConsumerWidget {
  const _LocationsView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateLocationDialog(context, ref),
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Add Location'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionHeader(
              icon: Icons.location_on_rounded,
              title: '${state.locations.length} Locations',
            ),
            const SizedBox(height: 12),
            if (state.locations.isEmpty)
              const _EmptyState(message: 'No locations found.')
            else
              ...state.locations.map(
                (l) => _LocationCard(
                  location: l,
                  onEdit: () => _showEditLocationDialog(context, ref, l),
                  onToggleActive: () => controller.updateLocation(
                    locationId: l.id,
                    active: l.status != 'active',
                  ),
                ),
              ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateLocationDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    String type = 'store';

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: const Text('Add Location'),
          content: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: codeCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Code (e.g. ST03)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: 'store', child: Text('Store')),
                    DropdownMenuItem(
                      value: 'warehouse',
                      child: Text('Warehouse'),
                    ),
                    DropdownMenuItem(value: 'hub', child: Text('Hub')),
                  ],
                  onChanged: (v) {
                    if (v != null) setLocal(() => type = v);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (codeCtrl.text.trim().isEmpty ||
                    nameCtrl.text.trim().isEmpty) {
                  return;
                }
                await controller.createLocation(
                  code: codeCtrl.text.trim(),
                  name: nameCtrl.text.trim(),
                  type: type,
                  address: addressCtrl.text.trim().isEmpty
                      ? null
                      : addressCtrl.text.trim(),
                );
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditLocationDialog(
    BuildContext context,
    WidgetRef ref,
    AppLocation location,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final nameCtrl = TextEditingController(text: location.name);
    final addressCtrl = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        title: Text('Edit — ${location.code}'),
        content: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: addressCtrl,
                decoration: const InputDecoration(labelText: 'Address'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await controller.updateLocation(
                locationId: location.id,
                name: nameCtrl.text.trim().isEmpty
                    ? null
                    : nameCtrl.text.trim(),
                address: addressCtrl.text.trim().isEmpty
                    ? null
                    : addressCtrl.text.trim(),
              );
              if (context.mounted) Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class _LocationCard extends StatelessWidget {
  const _LocationCard({
    required this.location,
    required this.onEdit,
    required this.onToggleActive,
  });

  final AppLocation location;
  final VoidCallback onEdit;
  final VoidCallback onToggleActive;

  Color get _typeColor => switch (location.type) {
        'warehouse' => AppTheme.primary,
        'hub' => AppTheme.purple,
        _ => AppTheme.green,
      };

  IconData get _typeIcon => switch (location.type) {
        'warehouse' => Icons.warehouse_rounded,
        'hub' => Icons.hub_rounded,
        _ => Icons.store_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final isActive = location.status == 'active';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: _cardDecor(),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _typeColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_typeIcon, color: _typeColor, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      location.code,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: _typeColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        location.type,
                        style: TextStyle(
                          color: _typeColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  location.name,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: isActive,
            onChanged: (_) => onToggleActive(),
          ),
          IconButton(
            onPressed: onEdit,
            icon: const Icon(
              Icons.edit_rounded,
              size: 18,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Clients View ──────────────────────────────────────────────────────────────

class _ClientsView extends ConsumerWidget {
  const _ClientsView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateClientDialog(context, ref),
        icon: const Icon(Icons.business_center_rounded),
        label: const Text('Add Client'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionHeader(
              icon: Icons.business_rounded,
              title: '${state.clients.length} Clients',
            ),
            const SizedBox(height: 12),
            if (state.clients.isEmpty)
              const _EmptyState(message: 'No clients found.')
            else
              ...state.clients.map(
                (c) => _ClientCard(
                  client: c,
                  onToggleStatus: () => controller.updateClientStatus(
                    c.id,
                    c.isActive ? 'inactive' : 'active',
                  ),
                  onBlock: () => controller.updateClientStatus(c.id, 'blocked'),
                ),
              ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateClientDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final contactNameCtrl = TextEditingController();
    final contactEmailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final gstCtrl = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        title: const Text('Add Client'),
        content: SingleChildScrollView(
          child: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Company Name *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: codeCtrl,
                  decoration: const InputDecoration(labelText: 'Code *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: contactNameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Contact Name *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: contactEmailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration:
                      const InputDecoration(labelText: 'Contact Email *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: cityCtrl,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: gstCtrl,
                  decoration: const InputDecoration(labelText: 'GST Number'),
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
              if (nameCtrl.text.trim().isEmpty ||
                  codeCtrl.text.trim().isEmpty ||
                  contactNameCtrl.text.trim().isEmpty ||
                  contactEmailCtrl.text.trim().isEmpty) {
                return;
              }
              await controller.createClient(
                name: nameCtrl.text.trim(),
                code: codeCtrl.text.trim(),
                contactName: contactNameCtrl.text.trim(),
                contactEmail: contactEmailCtrl.text.trim(),
                phone: phoneCtrl.text.trim().isEmpty
                    ? null
                    : phoneCtrl.text.trim(),
                address: addressCtrl.text.trim().isEmpty
                    ? null
                    : addressCtrl.text.trim(),
                city: cityCtrl.text.trim().isEmpty ? null : cityCtrl.text.trim(),
                gstNumber:
                    gstCtrl.text.trim().isEmpty ? null : gstCtrl.text.trim(),
              );
              if (context.mounted) Navigator.pop(ctx);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _ClientCard extends StatelessWidget {
  const _ClientCard({
    required this.client,
    required this.onToggleStatus,
    required this.onBlock,
  });

  final Client client;
  final VoidCallback onToggleStatus;
  final VoidCallback onBlock;

  Color get _statusColor => switch (client.status) {
        'active' => AppTheme.green,
        'blocked' => AppTheme.red,
        _ => AppTheme.amber,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: _cardDecor(),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primaryBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.business_rounded,
              color: AppTheme.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        client.name,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        client.status,
                        style: TextStyle(
                          color: _statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${client.code}  •  ${client.contactName}',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                Text(
                  client.contactEmail,
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 11,
                  ),
                ),
                if (client.orderCount > 0)
                  Text(
                    '${client.orderCount} orders',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, color: AppTheme.s500),
            onSelected: (v) {
              if (v == 'toggle') onToggleStatus();
              if (v == 'block') onBlock();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'toggle',
                child: Text(client.isActive ? 'Deactivate' : 'Activate'),
              ),
              if (client.status != 'blocked')
                const PopupMenuItem(
                  value: 'block',
                  child: Text(
                    'Block',
                    style: TextStyle(color: AppTheme.red),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Orders (Bulk + Store)
// ─────────────────────────────────────────────────────────────────────────────

class _OrdersTab extends ConsumerStatefulWidget {
  const _OrdersTab({super.key});

  @override
  ConsumerState<_OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends ConsumerState<_OrdersTab>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: AppTheme.white,
          child: TabBar(
            controller: _tabCtrl,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.s500,
            indicatorColor: AppTheme.primary,
            tabs: const [
              Tab(text: 'Bulk Orders'),
              Tab(text: 'Store Orders'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _BulkOrdersView(),
              _StoreOrdersView(),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Bulk Orders View ──────────────────────────────────────────────────────────

class _BulkOrdersView extends ConsumerWidget {
  const _BulkOrdersView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateBulkOrderDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Bulk Order'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionHeader(
              icon: Icons.local_shipping_rounded,
              title: '${state.bulkOrders.length} Bulk Orders',
            ),
            const SizedBox(height: 12),
            if (state.bulkOrders.isEmpty)
              const _EmptyState(message: 'No bulk orders found.')
            else
              ...state.bulkOrders.map((o) => _BulkOrderCard(order: o)),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateBulkOrderDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    if (state.clients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No clients available. Add clients first.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    String? clientId = state.clients.first.id;
    final warehouseLocations = state.locations
        .where((l) => l.type == 'warehouse')
        .toList();
    String? warehouseId = warehouseLocations.isNotEmpty
        ? warehouseLocations.first.code
        : null;

    // Simple: pick one product + qty for demo
    String? productId = state.products.isNotEmpty ? state.products.first.id : null;
    final qtyCtrl = TextEditingController(text: '10');

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: const Text('Create Bulk Order'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: clientId,
                    decoration: const InputDecoration(labelText: 'Client'),
                    items: state.clients
                        .map((c) => DropdownMenuItem(
                              value: c.id,
                              child: Text(c.name),
                            ))
                        .toList(),
                    onChanged: (v) => setLocal(() => clientId = v),
                  ),
                  const SizedBox(height: 8),
                  if (warehouseLocations.isNotEmpty)
                    DropdownButtonFormField<String>(
                      initialValue: warehouseId,
                      decoration: const InputDecoration(labelText: 'Warehouse'),
                      items: warehouseLocations
                          .map((l) => DropdownMenuItem(
                                value: l.code,
                                child: Text('${l.code} — ${l.name}'),
                              ))
                          .toList(),
                      onChanged: (v) => setLocal(() => warehouseId = v),
                    ),
                  const SizedBox(height: 8),
                  if (state.products.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      initialValue: productId,
                      decoration: const InputDecoration(labelText: 'Product'),
                      items: state.products
                          .map((p) => DropdownMenuItem(
                                value: p.id,
                                child: Text(
                                  '${p.sku} — ${p.shortName}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: (v) => setLocal(() => productId = v),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                    ),
                  ],
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
                if (clientId == null ||
                    warehouseId == null ||
                    productId == null) {
                  return;
                }
                final qty = int.tryParse(qtyCtrl.text) ?? 1;
                await controller.createBulkOrder(
                  clientId: clientId!,
                  warehouseId: warehouseId!,
                  items: [
                    {'product_id': productId!, 'qty': qty},
                  ],
                );
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BulkOrderCard extends ConsumerWidget {
  const _BulkOrderCard({required this.order});

  final BulkOrder order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(appControllerProvider.notifier);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: _cardDecor(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.orderId,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
              _BulkStatusBadge(status: order.status),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Client: ${order.clientName}  •  ${order.totalUnits} units',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
          ),
          Text(
            DateFormat('dd MMM yyyy').format(order.createdAt),
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          if (order.items.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: order.items
                  .take(3)
                  .map(
                    (i) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.bgCardLight,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${i.sku} ×${i.quantity}',
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (order.status == BulkOrderStatus.confirmed)
                FilledButton.icon(
                  onPressed: () => controller.transitionBulkOrder(
                    order.id,
                    'packed',
                  ),
                  icon: const Icon(Icons.inventory_rounded, size: 16),
                  label: const Text('Mark Packed'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.amber,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                ),
              if (order.status == BulkOrderStatus.packed) ...[
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () => controller.transitionBulkOrder(
                    order.id,
                    'dispatched',
                  ),
                  icon: const Icon(Icons.local_shipping_rounded, size: 16),
                  label: const Text('Dispatch'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
              if (order.status == BulkOrderStatus.dispatched) ...[
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () => controller.transitionBulkOrder(
                    order.id,
                    'completed',
                  ),
                  icon: const Icon(Icons.check_circle_rounded, size: 16),
                  label: const Text('Complete'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.green,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
              if (order.status == BulkOrderStatus.confirmed ||
                  order.status == BulkOrderStatus.packed) ...[
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => controller.transitionBulkOrder(
                    order.id,
                    'cancelled',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.red,
                    side: const BorderSide(color: AppTheme.red),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: const Text('Cancel'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _BulkStatusBadge extends StatelessWidget {
  const _BulkStatusBadge({required this.status});

  final BulkOrderStatus status;

  Color get _color => switch (status) {
        BulkOrderStatus.confirmed => AppTheme.primary,
        BulkOrderStatus.packed => AppTheme.amber,
        BulkOrderStatus.dispatched => AppTheme.purple,
        BulkOrderStatus.completed => AppTheme.green,
        BulkOrderStatus.cancelled => AppTheme.red,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: _color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Store Orders View ─────────────────────────────────────────────────────────

class _StoreOrdersView extends ConsumerWidget {
  const _StoreOrdersView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    final draftOrders =
        state.orders.where((o) => o.status == OrderStatus.draft).toList();
    final otherOrders =
        state.orders.where((o) => o.status != OrderStatus.draft).toList();

    return RefreshIndicator(
      onRefresh: controller.refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionHeader(
            icon: Icons.pending_actions_rounded,
            title: 'Pending Approval (${draftOrders.length})',
          ),
          const SizedBox(height: 8),
          if (draftOrders.isEmpty)
            const _EmptyState(message: 'No pending orders.')
          else
            ...draftOrders.map(
              (o) => _StoreOrderCard(
                order: o,
                showApproveReject: true,
                onApprove: () =>
                    _approveWithStockCheck(context, ref, o),
                onReject: () => _showRejectDialog(context, ref, o),
              ),
            ),
          const SizedBox(height: 16),
          _SectionHeader(
            icon: Icons.receipt_long_rounded,
            title: 'All Orders (${otherOrders.length})',
          ),
          const SizedBox(height: 8),
          if (otherOrders.isEmpty)
            const _EmptyState(message: 'No other orders.')
          else
            ...otherOrders.map(
              (o) => _StoreOrderCard(
                order: o,
                showApproveReject: false,
              ),
            ),
        ],
      ),
    );
  }

  /// Checks stock availability before approving an order.
  Future<void> _approveWithStockCheck(
    BuildContext context,
    WidgetRef ref,
    StoreOrder order,
  ) async {
    final state = ref.read(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    // Find low-stock items
    final lowStockItems = <String>[];
    for (final item in order.items) {
      final inv = state.adminInventory.where(
        (i) => i.productId == item.productId || i.sku == item.sku,
      );
      if (inv.isEmpty) {
        lowStockItems.add('${item.title} (not in inventory)');
      } else {
        final available = inv.fold(0, (sum, i) => sum + i.availableStock);
        if (available < item.quantity) {
          lowStockItems.add(
            '${item.title}: need ${item.quantity}, have $available',
          );
        }
      }
    }

    if (lowStockItems.isNotEmpty) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppTheme.amber),
              SizedBox(width: 8),
              Text('Stock Warning'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'The following items have insufficient stock:',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 8),
              ...lowStockItems.map(
                (msg) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '• ',
                        style: TextStyle(color: AppTheme.red),
                      ),
                      Expanded(
                        child: Text(
                          msg,
                          style: const TextStyle(
                            color: AppTheme.red,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Approve anyway?',
                style: TextStyle(color: AppTheme.textPrimary),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppTheme.amber),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Approve Anyway'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    await controller.transitionOrder(order, OrderStatus.confirmed);
  }

  Future<void> _showRejectDialog(
    BuildContext context,
    WidgetRef ref,
    StoreOrder order,
  ) async {
    final controller = ref.read(appControllerProvider.notifier);
    final reasonCtrl = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        title: const Text('Reject Order'),
        content: TextField(
          controller: reasonCtrl,
          decoration: const InputDecoration(
            labelText: 'Reason for rejection',
            hintText: 'e.g. Out of stock, incorrect items',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.red),
            onPressed: () async {
              if (reasonCtrl.text.trim().isEmpty) return;
              await controller.rejectOrder(order, reasonCtrl.text.trim());
              if (context.mounted) Navigator.pop(ctx);
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }
}

class _StoreOrderCard extends StatelessWidget {
  const _StoreOrderCard({
    required this.order,
    required this.showApproveReject,
    this.onApprove,
    this.onReject,
  });

  final StoreOrder order;
  final bool showApproveReject;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  Color get _statusColor => switch (order.status) {
        OrderStatus.draft => AppTheme.amber,
        OrderStatus.confirmed => AppTheme.primary,
        OrderStatus.packed => AppTheme.purple,
        OrderStatus.dispatched => AppTheme.green,
        OrderStatus.storeReceived || OrderStatus.completed => AppTheme.green,
        OrderStatus.cancelled => AppTheme.red,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: _cardDecor(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.orderId,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  order.status.name,
                  style: TextStyle(
                    color: _statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Store: ${order.storeId}  •  ${order.totalUnits} units',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
          ),
          Text(
            order.items.map((i) => '${i.title} ×${i.quantity}').join(', '),
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (order.rejectionReason != null) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.red.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.cancel_rounded,
                    size: 14,
                    color: AppTheme.red,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      order.rejectionReason!,
                      style: const TextStyle(
                        color: AppTheme.red,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (showApproveReject) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: onReject,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.red,
                    side: const BorderSide(color: AppTheme.red),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: const Text('Reject'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: onApprove,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: const Text('Approve'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — HR (Attendance + Payouts + Leaves + Inventory)
// ─────────────────────────────────────────────────────────────────────────────

class _HrTab extends ConsumerStatefulWidget {
  const _HrTab({super.key});

  @override
  ConsumerState<_HrTab> createState() => _HrTabState();
}

class _HrTabState extends ConsumerState<_HrTab>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: AppTheme.white,
          child: TabBar(
            controller: _tabCtrl,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.s500,
            indicatorColor: AppTheme.primary,
            tabs: const [
              Tab(text: 'Attendance'),
              Tab(text: 'Payouts'),
              Tab(text: 'Inventory'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _AttendanceView(),
              _PayoutsView(),
              _InventoryView(),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Attendance View ───────────────────────────────────────────────────────────

class _AttendanceView extends ConsumerWidget {
  const _AttendanceView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return RefreshIndicator(
      onRefresh: controller.refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionHeader(
            icon: Icons.check_circle_outline_rounded,
            title: 'Mark Attendance',
          ),
          const SizedBox(height: 8),
          ...state.employees.map(
            (e) => _AttendanceCard(
              employee: e,
              onMark: (status) => controller.addAttendanceForEmployee(
                userId: e.id,
                attendanceDate: DateTime.now(),
                status: status,
              ),
            ),
          ),
          const SizedBox(height: 16),
          _SectionHeader(
            icon: Icons.history_rounded,
            title: 'Recent Records',
          ),
          const SizedBox(height: 8),
          ...state.attendanceRecords.take(40).map(
            (record) => Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: _cardDecor(),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          record.userName,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          DateFormat('dd MMM yyyy')
                              .format(record.attendanceDate),
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _AttendanceBadge(status: record.status),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.employee, required this.onMark});

  final EmployeeUser employee;
  final ValueChanged<AttendanceStatus> onMark;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: _cardDecor(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            employee.name,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: AttendanceStatus.values
                .map(
                  (s) => OutlinedButton(
                    onPressed: () => onMark(s),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      textStyle: const TextStyle(fontSize: 11),
                    ),
                    child: Text(s.label),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _AttendanceBadge extends StatelessWidget {
  const _AttendanceBadge({required this.status});

  final AttendanceStatus status;

  Color get _color => switch (status) {
        AttendanceStatus.present => AppTheme.green,
        AttendanceStatus.absent => AppTheme.red,
        AttendanceStatus.halfDay => AppTheme.amber,
        AttendanceStatus.leave => AppTheme.primary,
        AttendanceStatus.holiday => AppTheme.purple,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: _color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Payouts View ──────────────────────────────────────────────────────────────

class _PayoutsView extends ConsumerWidget {
  const _PayoutsView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionHeader(
          icon: Icons.payments_rounded,
          title: 'Salary Payouts',
        ),
        const SizedBox(height: 8),
        if (state.salaryPayouts.isEmpty)
          const _EmptyState(message: 'No payout records.')
        else
          ...state.salaryPayouts.map(
            (p) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: _cardDecor(),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.userName,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          p.monthKey,
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${p.netAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: AppTheme.green,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      if (p.deductions > 0)
                        Text(
                          '-₹${p.deductions.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: AppTheme.red,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 20),
        _SectionHeader(
          icon: Icons.beach_access_rounded,
          title: 'Leave Records',
        ),
        const SizedBox(height: 8),
        if (state.leaveRecords.isEmpty)
          const _EmptyState(message: 'No leave records.')
        else
          ...state.leaveRecords.map(
            (l) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: _cardDecor(),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.userName,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          '${l.leaveType}  •  '
                          '${DateFormat('dd MMM').format(l.startDate)}'
                          ' – ${DateFormat('dd MMM').format(l.endDate)}'
                          '  (${l.daysCount}d)',
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: (l.status == 'approved'
                              ? AppTheme.green
                              : l.status == 'rejected'
                                  ? AppTheme.red
                                  : AppTheme.amber)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      l.status,
                      style: TextStyle(
                        color: l.status == 'approved'
                            ? AppTheme.green
                            : l.status == 'rejected'
                                ? AppTheme.red
                                : AppTheme.amber,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

// ── Inventory View ────────────────────────────────────────────────────────────

class _InventoryView extends ConsumerWidget {
  const _InventoryView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return RefreshIndicator(
      onRefresh: controller.refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionHeader(
            icon: Icons.inventory_2_rounded,
            title: '${state.adminInventory.length} Items (All Locations)',
          ),
          const SizedBox(height: 12),
          if (state.adminInventory.isEmpty)
            const _EmptyState(message: 'No inventory data.')
          else
            ...state.adminInventory.map(
              (item) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: _cardDecor(
                  color: item.isLowStock
                      ? AppTheme.red.withValues(alpha: 0.04)
                      : null,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          Text(
                            '${item.sku}  •  ${item.locationId}',
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${item.availableStock}',
                          style: TextStyle(
                            color: item.isLowStock
                                ? AppTheme.red
                                : AppTheme.green,
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          'avail',
                          style: TextStyle(
                            color: item.isLowStock
                                ? AppTheme.red
                                : AppTheme.textMuted,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Widgets
// ─────────────────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.primary),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(color: AppTheme.textMuted),
        ),
      ),
    );
  }
}
