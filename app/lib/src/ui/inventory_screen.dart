import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../state/providers.dart';
import 'widgets/inventory_filter_bar.dart';
import 'widgets/inventory_catalog_tools.dart';
import 'widgets/glass_card.dart';
import 'widgets/product_image.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  String _search = '';
  String _selectedCategory = '';
  String _selectedDevice = '';
  String _selectedBrand = '';
  String _selectedModel = '';
  String _selectedColor = '';
  InventoryStockFilter _stockFilter = InventoryStockFilter.all;
  InventorySortOption _sortOption = InventorySortOption.relevance;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final inventory = filterInventoryItems(
      state.inventory,
      search: _search,
      category: _selectedCategory,
      device: _selectedDevice,
      brand: _selectedBrand,
      model: _selectedModel,
      color: _selectedColor,
      stockFilter: _stockFilter,
      sort: _sortOption,
    );
    final categoryOptions = state.inventoryCatalog.categories;
    final deviceOptions = state.inventoryCatalog.devices;
    final brandOptions = inventoryFilterValues(
      state.inventory,
      (item) => item.brand,
    );
    final modelOptions = state.inventoryCatalog.models;
    final colorOptions = state.inventoryCatalog.colors;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(
                        Icons.arrow_back_ios_rounded,
                        color: AppTheme.textPrimary,
                        size: 20,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Full Inventory',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ),
                  ],
                ),
              ),
              // Search and filters
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                child: InventoryFilterBar(
                  searchValue: _search,
                  onSearchChanged: (value) => setState(() => _search = value),
                  categoryValue: _selectedCategory,
                  onCategoryChanged: (value) =>
                      setState(() => _selectedCategory = value),
                  categoryOptions: categoryOptions,
                  deviceValue: _selectedDevice,
                  onDeviceChanged: (value) =>
                      setState(() => _selectedDevice = value),
                  deviceOptions: deviceOptions,
                  brandValue: _selectedBrand,
                  onBrandChanged: (value) =>
                      setState(() => _selectedBrand = value),
                  brandOptions: brandOptions,
                  modelValue: _selectedModel,
                  onModelChanged: (value) =>
                      setState(() => _selectedModel = value),
                  modelOptions: modelOptions,
                  colorValue: _selectedColor,
                  onColorChanged: (value) =>
                      setState(() => _selectedColor = value),
                  colorOptions: colorOptions,
                  stockFilter: _stockFilter,
                  onStockFilterChanged: (value) =>
                      setState(() => _stockFilter = value),
                  sortOption: _sortOption,
                  onSortChanged: (value) => setState(() => _sortOption = value),
                ),
              ),
              // List
              Expanded(
                child: inventory.isEmpty
                    ? const Center(
                        child: Text(
                          'No products found',
                          style: TextStyle(color: AppTheme.textMuted),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: inventory.length,
                        itemBuilder: (context, index) {
                          final item = inventory[index];
                          return GlassCard(
                            child: Row(
                              children: [
                                ProductImage(
                                  imageUrl: item.imageUrl,
                                  localPath: item.localImagePath,
                                  size: 76,
                                  borderRadius: 16,
                                  fit: BoxFit.contain,
                                  padding: const EdgeInsets.all(8),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.title,
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 15,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item.brand.isEmpty
                                            ? item.sku
                                            : '${item.brand} • ${item.sku}',
                                        style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                      if (item.model.isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 6,
                                          ),
                                          child: Wrap(
                                            spacing: 8,
                                            crossAxisAlignment:
                                                WrapCrossAlignment.center,
                                            children: [
                                              Text(
                                                item.model,
                                                style: const TextStyle(
                                                  color: AppTheme.textMuted,
                                                  fontSize: 11,
                                                ),
                                              ),
                                              if (item.color.isNotEmpty)
                                                CatalogColorDot(
                                                  value: item.color,
                                                  size: 16,
                                                ),
                                            ],
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
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: item.isLowStock
                                            ? AppTheme.error
                                            : AppTheme.success,
                                      ),
                                    ),
                                    Text(
                                      'available',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: item.isLowStock
                                            ? AppTheme.error.withValues(
                                                alpha: 0.7,
                                              )
                                            : AppTheme.textMuted,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.warning.withValues(
                                              alpha: 0.1,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: Text(
                                            'R${item.reservedStock}',
                                            style: const TextStyle(
                                              color: AppTheme.warning,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.info.withValues(
                                              alpha: 0.1,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: Text(
                                            'T${item.totalStock}',
                                            style: const TextStyle(
                                              color: AppTheme.info,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
