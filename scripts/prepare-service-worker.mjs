#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JAVA_ROOT = resolve(ROOT, 'android/app/src/main/java');

function findMain(dir) {
  try {
    const entries = readdirSync(dir);
    for (const e of entries) {
      const p = join(dir, e);
      const s = statSync(p);
      if (s.isDirectory()) {
        const r = findMain(p);
        if (r) return r;
      } else if (e === 'MainActivity.java') {
        return p;
      }
    }
  } catch {}
  return null;
}

function fail(msg) {
  console.error(`[prepare-service-worker] ERROR: ${msg}`);
  process.exit(1);
}

const mainActivity = findMain(JAVA_ROOT);
if (!mainActivity) {
  fail(`No se encontró MainActivity.java bajo ${JAVA_ROOT}. ¿Se generó android/ con "npx cap add android"?`);
}

let source = readFileSync(mainActivity, 'utf8');
const pkgMatch = source.match(/^package\s+([^\s;]+);/m);
const pkg = pkgMatch ? pkgMatch[1] : 'com.arkade.wallet';

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

if (source.includes('ServiceWorkerController')) {
  console.log('[prepare-service-worker] MainActivity ya configurado (idempotente)');
} else {
  writeFileSync(mainActivity, TARGET);
  console.log(`[prepare-service-worker] ServiceWorkerController configurado en ${mainActivity} (${pkg})`);
}
