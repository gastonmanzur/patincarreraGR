import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';

final FlutterLocalNotificationsPlugin localNotifs =
    FlutterLocalNotificationsPlugin();

const String apiBaseUrl = 'https://patincarrera.net';
const String channelId = 'patincarrera_default';

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_bgHandler);

  await _initLocalNotifications();
  await _requestPushPermissionAndroid13();

  runApp(const MyApp());
}

Future<void> _initLocalNotifications() async {
  const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
  const initSettings = InitializationSettings(android: androidInit);

  await localNotifs.initialize(initSettings);

  const androidChannel = AndroidNotificationChannel(
    channelId,
    'Notificaciones',
    description: 'Canal principal',
    importance: Importance.high,
  );

  final androidPlugin = localNotifs
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
  await androidPlugin?.createNotificationChannel(androidChannel);
}

Future<void> _requestPushPermissionAndroid13() async {
  await FirebaseMessaging.instance.requestPermission();
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebWrapperPage(),
    );
  }
}

class WebWrapperPage extends StatefulWidget {
  const WebWrapperPage({super.key});

  @override
  State<WebWrapperPage> createState() => _WebWrapperPageState();
}

class _WebWrapperPageState extends State<WebWrapperPage> {
  late final WebViewController _controller;
  StreamSubscription<RemoteMessage>? _onMessageOpenedSub;
  StreamSubscription<String>? _onTokenRefreshSub;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(apiBaseUrl));

    setupForegroundPushUI();
    _setupDeepLinksFromPush();
    _syncFcmToken();
  }

  void setupForegroundPushUI() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      final title = message.notification?.title ?? 'Patín Carrera';
      final body = message.notification?.body ?? '';

      await localNotifs.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title,
        body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            channelId,
            'Notificaciones',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
      );
    });
  }

  Future<void> _setupDeepLinksFromPush() async {
    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      _openPushUrl(initialMessage);
    }

    _onMessageOpenedSub =
        FirebaseMessaging.onMessageOpenedApp.listen(_openPushUrl);
  }

  Future<void> _syncFcmToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null && token.isNotEmpty) {
      await _sendTokenToBackend(token);
    }

    _onTokenRefreshSub = FirebaseMessaging.instance.onTokenRefresh.listen(
      (newToken) async {
        await _sendTokenToBackend(newToken);
      },
    );
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await http.post(
        Uri.parse('$apiBaseUrl/api/push/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token}),
      );
    } catch (_) {
      // Evitamos interrumpir la app si no hay conectividad.
    }
  }

  void _openPushUrl(RemoteMessage message) {
    final urlPath = message.data['url'];
    if (urlPath == null || urlPath.isEmpty) return;

    final target =
        urlPath.startsWith('http') ? urlPath : '$apiBaseUrl$urlPath';
    _controller.loadRequest(Uri.parse(target));
  }

  @override
  void dispose() {
    _onMessageOpenedSub?.cancel();
    _onTokenRefreshSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
