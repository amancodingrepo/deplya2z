import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/status_badge.dart';

class WarehouseScreen extends ConsumerWidget {
  const WarehouseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    final pending = state.orders
        .where((o) => o.status == OrderStatus.confirmed)
        .toList();
    final packed = state.orders
        .where((o) => o.status == OrderStatus.packed)
        .toList();
    final lowStock = state.inventory.where((i) => i.isLowStock).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Warehouse Manager Hub'),
        actions: [
          IconButton(
            onPressed: controller.refreshData,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: controller.logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _MetricRow(
              pendingCount: pending.length,
              packedCount: packed.length,
              lowStockCount: lowStock.length,
              syncPending: state.syncQueue.length,
            ),
            const SizedBox(height: 20),
            const Text(
              'Pending Orders',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...pending.map((order) {
              return Card(
                child: ListTile(
                  title: Text(order.orderId),
                  subtitle: Text(
                    '${order.items.first.title} • Qty ${order.items.first.quantity}\n'
                    'Updated ${DateFormat('HH:mm').format(order.updatedAt)}',
                  ),
                  isThreeLine: true,
                  trailing: FilledButton(
                    onPressed: () =>
                        controller.transitionOrder(order, OrderStatus.packed),
                    child: const Text('Mark Packed'),
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
            const Text(
              'Dispatch Queue',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...packed.map((order) {
              return Card(
                child: ListTile(
                  title: Text(order.orderId),
                  subtitle: const Text('Ready to ship'),
                  trailing: FilledButton.tonal(
                    onPressed: () => controller.transitionOrder(
                      order,
                      OrderStatus.dispatched,
                    ),
                    child: const Text('Dispatch'),
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
            const Text(
              'Low Stock Alert',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...lowStock.map(
              (item) => Card(
                child: ListTile(
                  title: Text(item.title),
                  subtitle: Text(
                    '${item.sku} • Available ${item.availableStock}',
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (state.orders.isNotEmpty)
              const Text(
                'Recent Orders',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ...state.orders
                .take(5)
                .map(
                  (order) => Card(
                    child: ListTile(
                      title: Text(order.orderId),
                      subtitle: Text(
                        order.items
                            .map((i) => '${i.title} x${i.quantity}')
                            .join(', '),
                      ),
                      trailing: StatusBadge(status: order.status),
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({
    required this.pendingCount,
    required this.packedCount,
    required this.lowStockCount,
    required this.syncPending,
  });

  final int pendingCount;
  final int packedCount;
  final int lowStockCount;
  final int syncPending;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _metricCard('Pending', pendingCount, Colors.blue.shade50),
        _metricCard('Packed', packedCount, Colors.orange.shade50),
        _metricCard('Low Stock', lowStockCount, Colors.red.shade50),
        _metricCard('Offline Queue', syncPending, Colors.green.shade50),
      ],
    );
  }

  Widget _metricCard(String label, int value, Color color) {
    return SizedBox(
      width: 168,
      child: Card(
        color: color,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(
                value.toString(),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
