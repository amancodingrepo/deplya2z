import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';
import 'inventory_catalog_tools.dart';

enum InventoryStockFilter { all, inStock, lowStock, outOfStock }

extension InventoryStockFilterDisplay on InventoryStockFilter {
  String get label {
    return switch (this) {
      InventoryStockFilter.all => 'All stock',
      InventoryStockFilter.inStock => 'In stock',
      InventoryStockFilter.lowStock => 'Low stock',
      InventoryStockFilter.outOfStock => 'Out of stock',
    };
  }
}

enum InventorySortOption { relevance, nameAsc, stockHighToLow, stockLowToHigh }

extension InventorySortOptionDisplay on InventorySortOption {
  String get label {
    return switch (this) {
      InventorySortOption.relevance => 'Best match',
      InventorySortOption.nameAsc => 'Name A-Z',
      InventorySortOption.stockHighToLow => 'Stock high-low',
      InventorySortOption.stockLowToHigh => 'Stock low-high',
    };
  }
}

List<String> inventoryFilterValues(
  Iterable<InventoryItem> items,
  String Function(InventoryItem item) selector,
) {
  final values = items
      .map(selector)
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .toSet()
      .toList();
  values.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
  return values;
}

List<InventoryItem> filterInventoryItems(
  Iterable<InventoryItem> items, {
  String search = '',
  String category = '',
  String device = '',
  String brand = '',
  String model = '',
  String color = '',
  InventoryStockFilter stockFilter = InventoryStockFilter.all,
  InventorySortOption sort = InventorySortOption.relevance,
}) {
  final query = search.trim().toLowerCase();
  final categoryQuery = category.trim().toLowerCase();
  final deviceQuery = device.trim().toLowerCase();
  final brandQuery = brand.trim().toLowerCase();
  final modelQuery = model.trim().toLowerCase();
  final colorQuery = color.trim().toLowerCase();

  final filtered = items
      .where((item) {
        final matchesSearch =
            query.isEmpty ||
            item.title.toLowerCase().contains(query) ||
            item.sku.toLowerCase().contains(query) ||
            item.brand.toLowerCase().contains(query) ||
            item.category.toLowerCase().contains(query) ||
            item.color.toLowerCase().contains(query) ||
            item.model.toLowerCase().contains(query);

        final matchesCategory =
            categoryQuery.isEmpty ||
            item.category.toLowerCase() == categoryQuery;
        final matchesDevice =
            deviceQuery.isEmpty || item.title.toLowerCase() == deviceQuery;
        final matchesBrand =
            brandQuery.isEmpty || item.brand.toLowerCase() == brandQuery;
        final matchesModel =
            modelQuery.isEmpty || item.model.toLowerCase() == modelQuery;
        final matchesColor =
            colorQuery.isEmpty || item.color.toLowerCase() == colorQuery;
        final matchesStock = switch (stockFilter) {
          InventoryStockFilter.all => true,
          InventoryStockFilter.inStock => item.availableStock > 0,
          InventoryStockFilter.lowStock =>
            item.availableStock > 0 && item.isLowStock,
          InventoryStockFilter.outOfStock => item.availableStock <= 0,
        };

        return matchesSearch &&
            matchesCategory &&
            matchesDevice &&
            matchesBrand &&
            matchesModel &&
            matchesColor &&
            matchesStock;
      })
      .toList(growable: false);

  if (sort == InventorySortOption.nameAsc) {
    filtered.sort(
      (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
    );
  } else if (sort == InventorySortOption.stockHighToLow) {
    filtered.sort((a, b) => b.availableStock.compareTo(a.availableStock));
  } else if (sort == InventorySortOption.stockLowToHigh) {
    filtered.sort((a, b) => a.availableStock.compareTo(b.availableStock));
  } else if (query.isNotEmpty) {
    filtered.sort((a, b) {
      final aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
      final bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts != bStarts) {
        return aStarts.compareTo(bStarts);
      }
      return a.title.toLowerCase().compareTo(b.title.toLowerCase());
    });
  }

  return filtered;
}

class InventoryFilterBar extends StatelessWidget {
  const InventoryFilterBar({
    super.key,
    required this.searchValue,
    required this.onSearchChanged,
    required this.categoryValue,
    required this.onCategoryChanged,
    required this.categoryOptions,
    required this.deviceValue,
    required this.onDeviceChanged,
    required this.deviceOptions,
    required this.brandValue,
    required this.onBrandChanged,
    required this.brandOptions,
    required this.modelValue,
    required this.onModelChanged,
    required this.modelOptions,
    required this.colorValue,
    required this.onColorChanged,
    required this.colorOptions,
    required this.stockFilter,
    required this.onStockFilterChanged,
    required this.sortOption,
    required this.onSortChanged,
    this.onManageCatalog,
  });

  final String searchValue;
  final ValueChanged<String> onSearchChanged;
  final String categoryValue;
  final ValueChanged<String> onCategoryChanged;
  final List<String> categoryOptions;
  final String deviceValue;
  final ValueChanged<String> onDeviceChanged;
  final List<String> deviceOptions;
  final String brandValue;
  final ValueChanged<String> onBrandChanged;
  final List<String> brandOptions;
  final String modelValue;
  final ValueChanged<String> onModelChanged;
  final List<String> modelOptions;
  final String colorValue;
  final ValueChanged<String> onColorChanged;
  final List<String> colorOptions;
  final InventoryStockFilter stockFilter;
  final ValueChanged<InventoryStockFilter> onStockFilterChanged;
  final InventorySortOption sortOption;
  final ValueChanged<InventorySortOption> onSortChanged;
  final VoidCallback? onManageCatalog;

  int get _activeCount {
    var total = 0;
    if (searchValue.trim().isNotEmpty) total++;
    if (categoryValue.trim().isNotEmpty) total++;
    if (deviceValue.trim().isNotEmpty) total++;
    if (brandValue.trim().isNotEmpty) total++;
    if (modelValue.trim().isNotEmpty) total++;
    if (colorValue.trim().isNotEmpty) total++;
    if (stockFilter != InventoryStockFilter.all) total++;
    if (sortOption != InventorySortOption.relevance) total++;
    return total;
  }

  InputDecoration _dropdownDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 20, color: AppTheme.textMuted),
    );
  }

  void _clearAll() {
    onSearchChanged('');
    onCategoryChanged('');
    onDeviceChanged('');
    onBrandChanged('');
    onModelChanged('');
    onColorChanged('');
    onStockFilterChanged(InventoryStockFilter.all);
    onSortChanged(InventorySortOption.relevance);
  }

  Widget _searchField() {
    return TextFormField(
      key: ValueKey(searchValue),
      initialValue: searchValue,
      onChanged: onSearchChanged,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: const InputDecoration(
        hintText: 'Search device, SKU, brand, model or color',
        prefixIcon: Icon(Icons.search_rounded, color: AppTheme.textMuted),
      ),
    );
  }

  Widget _stringDropdown({
    required String label,
    required IconData icon,
    required String selectedValue,
    required List<String> options,
    required ValueChanged<String> onChanged,
    bool showColorPreview = false,
  }) {
    final safeValue = options.contains(selectedValue) ? selectedValue : '';
    return DropdownButtonFormField<String>(
      key: ValueKey('$label-$safeValue'),
      initialValue: safeValue.isEmpty ? null : safeValue,
      isExpanded: true,
      decoration: _dropdownDecoration(label, icon),
      items: [
        const DropdownMenuItem<String>(value: '', child: Text('All')),
        ...options.map(
          (value) => DropdownMenuItem<String>(
            value: value,
            child: Row(
              children: [
                if (showColorPreview) ...[
                  CatalogColorDot(value: value, size: 14),
                  const SizedBox(width: 8),
                ],
                Expanded(child: Text(value, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
        ),
      ],
      onChanged: (value) => onChanged(value ?? ''),
    );
  }

  Widget _enumDropdown<T>({
    required String label,
    required IconData icon,
    required T selectedValue,
    required List<T> options,
    required String Function(T value) labelBuilder,
    required ValueChanged<T> onChanged,
  }) {
    return DropdownButtonFormField<T>(
      key: ValueKey('$label-$selectedValue'),
      initialValue: selectedValue,
      isExpanded: true,
      decoration: _dropdownDecoration(label, icon),
      items: options
          .map(
            (value) => DropdownMenuItem<T>(
              value: value,
              child: Text(labelBuilder(value)),
            ),
          )
          .toList(),
      onChanged: (value) {
        if (value != null) {
          onChanged(value);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filters = <Widget>[
      _stringDropdown(
        label: 'Category',
        icon: Icons.category_rounded,
        selectedValue: categoryValue,
        options: categoryOptions,
        onChanged: onCategoryChanged,
      ),
      _stringDropdown(
        label: 'Device',
        icon: Icons.phone_android_rounded,
        selectedValue: deviceValue,
        options: deviceOptions,
        onChanged: onDeviceChanged,
      ),
      _stringDropdown(
        label: 'Brand',
        icon: Icons.sell_rounded,
        selectedValue: brandValue,
        options: brandOptions,
        onChanged: onBrandChanged,
      ),
      _stringDropdown(
        label: 'Model',
        icon: Icons.memory_rounded,
        selectedValue: modelValue,
        options: modelOptions,
        onChanged: onModelChanged,
      ),
      _stringDropdown(
        label: 'Color',
        icon: Icons.palette_outlined,
        selectedValue: colorValue,
        options: colorOptions,
        onChanged: onColorChanged,
        showColorPreview: true,
      ),
      _enumDropdown<InventoryStockFilter>(
        label: 'Availability',
        icon: Icons.inventory_2_outlined,
        selectedValue: stockFilter,
        options: InventoryStockFilter.values,
        labelBuilder: (value) => value.label,
        onChanged: onStockFilterChanged,
      ),
      _enumDropdown<InventorySortOption>(
        label: 'Sort',
        icon: Icons.swap_vert_rounded,
        selectedValue: sortOption,
        options: InventorySortOption.values,
        labelBuilder: (value) => value.label,
        onChanged: onSortChanged,
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: AppTheme.surfaceLight),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.tune_rounded,
                        color: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Search & Filter',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            _activeCount == 0
                                ? 'Browse all devices'
                                : '$_activeCount active filter(s)',
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (onManageCatalog != null)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: OutlinedButton.icon(
                    onPressed: onManageCatalog,
                    icon: const Icon(Icons.library_add_rounded),
                    label: const Text('Catalog'),
                  ),
                ),
              TextButton(
                onPressed: _activeCount == 0 ? null : _clearAll,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _searchField(),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final fieldWidth = constraints.maxWidth >= 1100
                  ? (constraints.maxWidth - 36) / 4
                  : constraints.maxWidth >= 720
                  ? (constraints.maxWidth - 24) / 3
                  : constraints.maxWidth >= 480
                  ? (constraints.maxWidth - 12) / 2
                  : constraints.maxWidth;

              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: filters
                    .map((field) => SizedBox(width: fieldWidth, child: field))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
