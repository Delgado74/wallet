#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JAVA_DIR = resolve(ROOT, 'android/app/src/main/java')

function fail(msg) {
  console.error(`[prepare-service-worker] ERROR: ${msg}`)
  process.exit(1)
}

function findMainActivity(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findMainActivity(full)
      if (found) return found
    } else if (entry.name === 'MainActivity.java') {
      return full
    }
  }
  return null
}

let MAIN_ACTIVITY
try {
  MAIN_ACTIVITY = findMainActivity(JAVA_DIR)
} catch {
  fail(`No se encontró la carpeta ${JAVA_DIR}. ¿Se generó android/ con "npx cap add android"?`)
}
if (!MAIN_ACTIVITY) {
  fail(`No se encontró MainActivity.java bajo ${JAVA_DIR}. ¿Se generó android/ con "npx cap add android"?`)
}

const pkg = relative(JAVA_DIR, dirname(MAIN_ACTIVITY))
  .split(/[\\/]+/)
  .join('.')

const TARGET = `package ${pkg};

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
`

const source = readFileSync(MAIN_ACTIVITY, 'utf8')
if (source.includes('ServiceWorkerController')) {
  console.log(`[prepare-service-worker] MainActivity ya configurado (idempotente): ${relative(ROOT, MAIN_ACTIVITY)}`)
} else {
  writeFileSync(MAIN_ACTIVITY, TARGET)
  console.log(`[prepare-service-worker] ServiceWorkerController configurado en MainActivity (paquete ${pkg})`)
}
