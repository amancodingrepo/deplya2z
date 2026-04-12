import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/status_badge.dart';

class StoreScreen extends ConsumerStatefulWidget {
  const StoreScreen({super.key});

  @override
  ConsumerState<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends ConsumerState<StoreScreen> {
  String? _selectedProduct;
  final _quantityController = TextEditingController(text: '2');

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);
    final myInventory = state.inventory;
    final myOrders = state.orders;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Manager Hub'),
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
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Create Order Request',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _selectedProduct,
                    decoration: const InputDecoration(labelText: 'Product'),
                    items: myInventory
                        .map(
                          (item) => DropdownMenuItem(
                            value: item.productId,
                            child: Text('${item.title} (${item.sku})'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => _selectedProduct = value),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _quantityController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Quantity'),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: () {
                        final selected = myInventory
                            .where((e) => e.productId == _selectedProduct)
                            .firstOrNull;
                        final qty = int.tryParse(_quantityController.text);
                        if (selected == null || qty == null || qty <= 0) {
                          return;
                        }
                        controller.createOrderRequest(
                          productId: selected.productId,
                          title: selected.title,
                          sku: selected.sku,
                          quantity: qty,
                        );
                      },
                      child: const Text('Submit Request'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'My Orders',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...myOrders.map((order) {
            final canConfirm = order.status == OrderStatus.dispatched;
            return Card(
              child: ListTile(
                title: Text(order.orderId),
                subtitle: Text(
                  order.items
                      .map((i) => '${i.title} x${i.quantity}')
                      .join(', '),
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    StatusBadge(status: order.status),
                    const SizedBox(height: 4),
                    if (canConfirm)
                      InkWell(
                        onTap: () => controller.transitionOrder(
                          order,
                          OrderStatus.storeReceived,
                        ),
                        child: const Text(
                          'Confirm Receipt',
                          style: TextStyle(
                            color: Colors.blue,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 12),
          if (state.message != null)
            Text(
              state.message!,
              style: TextStyle(color: Colors.blueGrey.shade700),
            ),
        ],
      ),
    );
  }
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
