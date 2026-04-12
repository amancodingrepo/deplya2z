import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/providers.dart';

class InventoryScreen extends ConsumerWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final inventory = state.inventory;

    return Scaffold(
      appBar: AppBar(title: const Text('Inventory')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: inventory.length,
        separatorBuilder: (_, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = inventory[index];
          return Card(
            child: ListTile(
              title: Text(item.title),
              subtitle: Text('${item.sku} • ${item.locationId}'),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('Avail ${item.availableStock}'),
                  Text(
                    'Res ${item.reservedStock}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
