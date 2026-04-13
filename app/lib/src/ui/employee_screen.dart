import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';

class EmployeeScreen extends ConsumerStatefulWidget {
  const EmployeeScreen({super.key});

  @override
  ConsumerState<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends ConsumerState<EmployeeScreen> {
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
                ],
              ),
            ),
            if (state.message != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.info.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.info.withValues(alpha: 0.2)),
                ),
                child: Text(
                  state.message!,
                  style: const TextStyle(color: AppTheme.info),
                ),
              ),
            ],
            const SizedBox(height: 12),
            ...state.employees.map(
              (employee) => _EmployeeCard(
                employee: employee,
                onStatusChanged: (active) => controller.setEmployeeActive(employee.id, active),
              ),
            ),
            if (state.employees.isEmpty)
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
    String? locationCode =
        defaultStoreLocations.isNotEmpty ? defaultStoreLocations.first : null;

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
                    !locationOptions.any((location) => location.code == locationCode))) {
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
                        decoration: const InputDecoration(labelText: 'Password'),
                        obscureText: true,
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<UserRole>(
                        value: role,
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
                          value: locationCode,
                          items: locationOptions
                              .map(
                                (location) => DropdownMenuItem(
                                  value: location.code,
                                  child: Text('${location.code} - ${location.name}'),
                                ),
                              )
                              .toList(),
                          onChanged: (value) => setLocalState(() => locationCode = value),
                          decoration: const InputDecoration(labelText: 'Location'),
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
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({
    required this.employee,
    required this.onStatusChanged,
  });

  final EmployeeUser employee;
  final ValueChanged<bool> onStatusChanged;

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
          Switch(
            value: employee.isActive,
            onChanged: onStatusChanged,
          ),
        ],
      ),
    );
  }
}
