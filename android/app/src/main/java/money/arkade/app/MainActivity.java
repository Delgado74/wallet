package money.arkade.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import money.arkade.app.plugins.LnurlNativePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LnurlNativePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
