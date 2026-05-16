import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';

class InventoryEditorValues {
  const InventoryEditorValues({
    required this.sku,
    required this.title,
    required this.brand,
    required this.category,
    required this.model,
    required this.color,
    required this.totalStock,
    this.locationId,
  });

  final String sku;
  final String title;
  final String brand;
  final String category;
  final String model;
  final String color;
  final int totalStock;
  final String? locationId;
}

Color resolveCatalogColor(String value) {
  final normalized = value.trim().toLowerCase();

  if (normalized.isEmpty) {
    return const Color(0xFFCBD5E1);
  }
  if (normalized.contains('black')) return const Color(0xFF111827);
  if (normalized.contains('white')) return const Color(0xFFF8FAFC);
  if (normalized.contains('silver') || normalized.contains('steel')) {
    return const Color(0xFF94A3B8);
  }
  if (normalized.contains('gray') || normalized.contains('grey')) {
    return const Color(0xFF6B7280);
  }
  if (normalized.contains('blue') || normalized.contains('navy')) {
    return const Color(0xFF2563EB);
  }
  if (normalized.contains('green') || normalized.contains('mint')) {
    return const Color(0xFF16A34A);
  }
  if (normalized.contains('red') || normalized.contains('maroon')) {
    return const Color(0xFFDC2626);
  }
  if (normalized.contains('pink') || normalized.contains('rose')) {
    return const Color(0xFFEC4899);
  }
  if (normalized.contains('gold') || normalized.contains('sand')) {
    return const Color(0xFFD4A017);
  }
  if (normalized.contains('yellow')) return const Color(0xFFFACC15);
  if (normalized.contains('orange') || normalized.contains('coral')) {
    return const Color(0xFFF97316);
  }
  if (normalized.contains('purple') || normalized.contains('violet')) {
    return const Color(0xFF7C3AED);
  }
  if (normalized.contains('brown') || normalized.contains('bronze')) {
    return const Color(0xFF92400E);
  }
  if (normalized.contains('beige') || normalized.contains('cream')) {
    return const Color(0xFFE7DCC7);
  }
  if (normalized.contains('teal') || normalized.contains('cyan')) {
    return const Color(0xFF0891B2);
  }

  final hash = normalized.codeUnits.fold<int>(0, (sum, code) => sum + code);
  final palette = <Color>[
    const Color(0xFF0F766E),
    const Color(0xFF2563EB),
    const Color(0xFFEA580C),
    const Color(0xFF16A34A),
    const Color(0xFFB45309),
    const Color(0xFFBE185D),
  ];
  return palette[hash % palette.length];
}

class CatalogColorDot extends StatelessWidget {
  const CatalogColorDot({
    super.key,
    required this.value,
    this.size = 18,
    this.selected = false,
  });

  final String value;
  final double size;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final color = resolveCatalogColor(value);
    final isLight = color.computeLuminance() > 0.8;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        border: Border.all(
          color: selected
              ? AppTheme.primary
              : isLight
              ? AppTheme.surfaceLight
              : Colors.white.withValues(alpha: 0.7),
          width: selected ? 2 : 1,
        ),
        boxShadow: selected
            ? AppTheme.cardShadow
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
    );
  }
}

Future<void> showInventoryCatalogManager({
  required BuildContext context,
  required InventoryCatalog catalog,
  required Future<void> Function(CatalogEntryType type, String value) onAdd,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      var currentCatalog = catalog;
      final controllers = {
        for (final type in CatalogEntryType.values)
          type: TextEditingController(),
      };

      return StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit(CatalogEntryType type) async {
            final value = controllers[type]!.text.trim();
            if (value.isEmpty) {
              return;
            }
            await onAdd(type, value);
            currentCatalog = currentCatalog.addValue(type, value);
            controllers[type]!.clear();
            if (ctx.mounted) {
              setSheetState(() {});
            }
          }

          return Container(
            padding: EdgeInsets.fromLTRB(
              20,
              16,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppTheme.radiusXl),
              ),
              border: Border.all(color: AppTheme.surfaceLight),
            ),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppTheme.textMuted.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Catalog Quick Options',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Add reusable category, device, model, and color options for future inventory entries.',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 18),
                    ...CatalogEntryType.values.map((type) {
                      final options = currentCatalog.valuesFor(type);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _CatalogManagerSection(
                          title: type.label,
                          controller: controllers[type]!,
                          options: options,
                          showColorPreview: type == CatalogEntryType.color,
                          onSubmit: () => submit(type),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}

Future<void> showInventoryEditorDialog({
  required BuildContext context,
  required String title,
  required String actionLabel,
  required InventoryCatalog catalog,
  required Future<void> Function(InventoryEditorValues values) onSubmit,
  InventoryEditorValues? initialValues,
  List<AppLocation> locationOptions = const <AppLocation>[],
  String? initialLocationId,
}) async {
  final sku = TextEditingController(text: initialValues?.sku ?? '');
  final device = TextEditingController(text: initialValues?.title ?? '');
  final brand = TextEditingController(text: initialValues?.brand ?? '');
  final category = TextEditingController(text: initialValues?.category ?? '');
  final model = TextEditingController(text: initialValues?.model ?? '');
  final color = TextEditingController(text: initialValues?.color ?? '');
  final stock = TextEditingController(
    text: (initialValues?.totalStock ?? 0).toString(),
  );
  String? locationId =
      initialValues?.locationId ??
      initialLocationId ??
      (locationOptions.isEmpty ? null : locationOptions.first.id);

  await showDialog<void>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) {
        return AlertDialog(
          backgroundColor: AppTheme.bgCard,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 24,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
          title: Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          content: SizedBox(
            width: 460,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (locationOptions.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      initialValue: locationId,
                      decoration: const InputDecoration(
                        labelText: 'Inventory Location',
                        prefixIcon: Icon(Icons.warehouse_rounded),
                      ),
                      items: locationOptions
                          .map(
                            (location) => DropdownMenuItem<String>(
                              value: location.id,
                              child: Text(
                                '${location.code} • ${location.name}',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        setDialogState(() => locationId = value);
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: sku,
                    readOnly: initialValues != null,
                    decoration: const InputDecoration(
                      labelText: 'SKU',
                      prefixIcon: Icon(Icons.qr_code_2_rounded),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SuggestionField(
                    controller: device,
                    label: 'Device Name',
                    icon: Icons.phone_android_rounded,
                    suggestions: catalog.devices,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: brand,
                    decoration: const InputDecoration(
                      labelText: 'Brand',
                      prefixIcon: Icon(Icons.sell_rounded),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SuggestionField(
                    controller: category,
                    label: 'Category',
                    icon: Icons.category_rounded,
                    suggestions: catalog.categories,
                  ),
                  const SizedBox(height: 12),
                  _SuggestionField(
                    controller: model,
                    label: 'Model',
                    icon: Icons.memory_rounded,
                    suggestions: catalog.models,
                  ),
                  const SizedBox(height: 12),
                  _SuggestionField(
                    controller: color,
                    label: 'Color',
                    icon: Icons.palette_outlined,
                    suggestions: catalog.colors,
                    showColorPreview: true,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: stock,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Total Stock',
                      prefixIcon: Icon(Icons.inventory_rounded),
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
                final values = InventoryEditorValues(
                  sku: sku.text.trim(),
                  title: device.text.trim(),
                  brand: brand.text.trim(),
                  category: category.text.trim(),
                  model: model.text.trim(),
                  color: color.text.trim(),
                  totalStock: int.tryParse(stock.text.trim()) ?? 0,
                  locationId: locationId,
                );
                await onSubmit(values);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                }
              },
              child: Text(actionLabel),
            ),
          ],
        );
      },
    ),
  );
}

class _CatalogManagerSection extends StatelessWidget {
  const _CatalogManagerSection({
    required this.title,
    required this.controller,
    required this.options,
    required this.onSubmit,
    this.showColorPreview = false,
  });

  final String title;
  final TextEditingController controller;
  final List<String> options;
  final VoidCallback onSubmit;
  final bool showColorPreview;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCardLight,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: AppTheme.surfaceLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  decoration: InputDecoration(
                    hintText: 'Add ${title.toLowerCase()}',
                    prefixIcon: Icon(
                      showColorPreview
                          ? Icons.palette_outlined
                          : Icons.add_circle_outline_rounded,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed: onSubmit,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (options.isEmpty)
            const Text(
              'No saved options yet.',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: options
                  .map(
                    (option) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: AppTheme.surfaceLight),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (showColorPreview) ...[
                            CatalogColorDot(value: option, size: 16),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            option,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class _SuggestionField extends StatelessWidget {
  const _SuggestionField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.suggestions,
    this.showColorPreview = false,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final List<String> suggestions;
  final bool showColorPreview;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
        ),
        if (suggestions.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: suggestions
                .take(12)
                .map(
                  (option) => ActionChip(
                    onPressed: () => controller.text = option,
                    avatar: showColorPreview
                        ? CatalogColorDot(value: option, size: 14)
                        : null,
                    label: Text(option),
                    backgroundColor: AppTheme.bgCard,
                    side: const BorderSide(color: AppTheme.surfaceLight),
                    labelStyle: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }
}
