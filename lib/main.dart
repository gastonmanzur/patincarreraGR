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
  // Si llega notification payload, Android suele mostrar sola en background.
  // Si querés 100% consistente, podrías generar local notification también.
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
  // firebase_messaging ya expone requestPermission; en Android 13+ es relevante
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

  String? _androidToken;
  String? _currentUserId;
  String? _currentJwt;

  @override
  void initState() {
    super.initState();

    setupForegroundPushUI();
    _setupDeepLinksFromPush();
    _initToken();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'PatinBridge',
        onMessageReceived: _onBridgeMessage,
      )
      ..loadRequest(Uri.parse(apiBaseUrl));
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

  Future<void> _initToken() async {
    _androidToken = await FirebaseMessaging.instance.getToken();
    debugPrint('[PUSH] Android token: $_androidToken');

    if (_currentUserId != null && _currentUserId!.isNotEmpty) {
      await _registerAndroidToken(userId: _currentUserId!, jwt: _currentJwt);
    }

    _onTokenRefreshSub = FirebaseMessaging.instance.onTokenRefresh.listen(
      (newToken) async {
        _androidToken = newToken;
        if (_currentUserId != null && _currentUserId!.isNotEmpty) {
          await _registerAndroidToken(userId: _currentUserId!, jwt: _currentJwt);
        }
      },
    );
  }

  Future<void> _onBridgeMessage(JavaScriptMessage msg) async {
    // Esperamos JSON: { "type":"LOGIN", "userId":"...", "jwt":"..." }
    try {
      final dynamic data = jsonDecode(msg.message);
      if (data is! Map<String, dynamic>) {
        debugPrint('[Bridge] mensaje inválido: ${msg.message}');
        return;
      }

      if (data['type'] == 'LOGIN') {
        final dynamic userIdRaw = data['userId'];
        final dynamic jwtRaw = data['jwt'];

        if (userIdRaw == null || userIdRaw.toString().isEmpty) {
          debugPrint('[Bridge] LOGIN sin userId');
          return;
        }

        _currentUserId = userIdRaw.toString();
        _currentJwt = jwtRaw?.toString();

        await _registerAndroidToken(
          userId: _currentUserId!,
          jwt: _currentJwt,
        );
      }
    } catch (_) {
      debugPrint('[Bridge] mensaje inválido: ${msg.message}');
    }
  }

  Future<void> _registerAndroidToken({
    required String userId,
    String? jwt,
  }) async {
    if (_androidToken == null || _androidToken!.isEmpty) {
      await _initToken();
    }
    if (_androidToken == null || _androidToken!.isEmpty) return;

    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/push/register'),
        headers: {
          'Content-Type': 'application/json',
          if (jwt != null && jwt.isNotEmpty) 'Authorization': 'Bearer $jwt',
        },
        body: jsonEncode({
          'userId': userId,
          'token': _androidToken,
          'platform': 'android',
          'device': 'flutter-webview',
        }),
      );

      debugPrint('[PUSH] register resp: ${resp.statusCode} ${resp.body}');
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
