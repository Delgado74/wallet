#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAIN_ACTIVITY = resolve(
  ROOT,
  'android/app/src/main/java/com/delgado74/arkade/MainActivity.java',
);

const TARGET = `package com.delgado74.arkade;

import android.os.Build;
import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor's BridgeWebViewClient serves bundled assets through
        // shouldInterceptRequest, but Android WebView resolves service worker
        // fetches through ServiceWorkerController instead. Without this, the
        // service worker script is fetched from https://localhost directly and
        // the registration fails with "unknown error occurred when fetching the
        // script". Route those fetches through the Capacitor local server.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController controller = ServiceWorkerController.getInstance();
            controller.setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    return getBridge().getLocalServer().shouldInterceptRequest(request);
                }
            });
        }
    }
}
`;

function fail(msg) {
  console.error(`[prepare-service-worker] ERROR: ${msg}`);
  process.exit(1);
}

let source;
try {
  source = readFileSync(MAIN_ACTIVITY, 'utf8');
} catch {
  fail(`No se encontró MainActivity.java en ${MAIN_ACTIVITY}. ¿Se generó android/ con "npx cap add android"?`);
}

if (source.includes('ServiceWorkerController')) {
  console.log('[prepare-service-worker] MainActivity ya configurado (idempotente)');
} else {
  writeFileSync(MAIN_ACTIVITY, TARGET);
  console.log('[prepare-service-worker] ServiceWorkerController configurado en MainActivity');
}
