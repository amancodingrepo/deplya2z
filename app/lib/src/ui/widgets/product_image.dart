import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

/// Product image widget: displays network, local file, or placeholder icon.
class ProductImage extends StatelessWidget {
  const ProductImage({
    super.key,
    this.imageUrl,
    this.localPath,
    this.size = 60,
    this.borderRadius = 12,
    this.fit = BoxFit.cover,
    this.padding = EdgeInsets.zero,
    this.icon,
  });

  final String? imageUrl;
  final String? localPath;
  final double size;
  final double borderRadius;
  final BoxFit fit;
  final EdgeInsets padding;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTheme.bgCardLight,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: AppTheme.surfaceLight.withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: padding, child: _buildContent()),
    );
  }

  Widget _buildContent() {
    // Prefer local path over network url
    if (localPath != null && localPath!.isNotEmpty) {
      return Image.file(
        File(localPath!),
        fit: fit,
        errorBuilder: (context, error, stack) => _placeholder(),
      );
    }

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Image.network(
        imageUrl!,
        fit: fit,
        errorBuilder: (context, error, stack) => _placeholder(),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppTheme.primary.withValues(alpha: 0.5),
              ),
            ),
          );
        },
      );
    }

    return _placeholder();
  }

  Widget _placeholder() {
    return Center(
      child: Icon(
        icon ?? Icons.inventory_2_rounded,
        color: AppTheme.textMuted.withValues(alpha: 0.4),
        size: size * 0.4,
      ),
    );
  }
}
