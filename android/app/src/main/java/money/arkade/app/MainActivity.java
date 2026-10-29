package money.arkade.app;

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
