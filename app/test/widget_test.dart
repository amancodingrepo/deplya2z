import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:store_warehouse_app/src/app.dart';

void main() {
  testWidgets('App shows login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: StoreWarehouseApp()));
    await tester.pumpAndSettle();

    expect(find.textContaining('Supply Management'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
