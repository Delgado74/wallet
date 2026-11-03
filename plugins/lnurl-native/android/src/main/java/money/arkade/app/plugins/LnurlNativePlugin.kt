package com.arkade.lnurlnative;

import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPublicKey;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "LnurlNative")
public class LnurlNativePlugin extends Plugin {
  private static final String DEFAULT_BASE_URL = "https://arkade.computer";
  private static final String DEFAULT_DOMAIN = "arkade.computer";
  private final OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build();
  private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

  private String baseUrl(PluginCall call) {
    String url = call.getString("baseUrl");
    if (url == null || url.isEmpty()) url = DEFAULT_BASE_URL;
    if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
    return url;
  }

  private String domain(PluginCall call) {
    String d = call.getString("domain");
    if (d == null || d.isEmpty()) return DEFAULT_DOMAIN;
    return d;
  }

  @PluginMethod
  public void owned(PluginCall call) {
    try {
      String identity = call.getString("identity");
      String arkadeAddress = call.getString("arkadeAddress");
      String boardingAddress = call.getString("boardingAddress");
      String handle = call.getString("handle");
      Boolean refresh = call.getBoolean("refresh", false);
      if (identity == null || arkadeAddress == null) {
        call.reject("missing identity or arkadeAddress");
        return;
      }
      JSONObject body = new JSONObject();
      body.put("identity", identity);
      body.put("arkadeAddress", arkadeAddress);
      if (boardingAddress != null) body.put("boardingAddress", boardingAddress);
      if (handle != null && !handle.isEmpty()) body.put("handle", handle);
      if (refresh != null && refresh) body.put("refresh", true);
      String url = baseUrl(call) + "/v1/lnurl/owned";
      Request req = new Request.Builder()
        .url(url)
        .post(RequestBody.create(body.toString(), JSON))
        .addHeader("Accept", "application/json")
        .build();
      try (Response res = client.newCall(req).execute()) {
        String text = res.body() != null ? res.body().string() : "";
        if (!res.isSuccessful()) {
          call.resolve(new JSObject().put("error", "http_" + res.code()));
          return;
        }
        try {
          JSONObject json = new JSONObject(text);
          JSObject out = new JSObject();
          out.put("receiver", new JSObject(json.toString()));
          call.resolve(out);
        } catch (Exception e) {
          call.resolve(new JSObject().put("raw", text));
        }
      }
    } catch (Exception e) {
      call.resolve(new JSObject().put("error", e.getMessage()));
    }
  }

  @PluginMethod
  public void addresses(PluginCall call) {
    try {
      String identity = call.getString("identity");
      String arkadeAddress = call.getString("arkadeAddress");
      String boardingAddress = call.getString("boardingAddress");
      if (identity == null || arkadeAddress == null) {
        call.reject("missing identity or arkadeAddress");
        return;
      }
      JSONObject body = new JSONObject();
      body.put("identity", identity);
      body.put("arkadeAddress", arkadeAddress);
      if (boardingAddress != null) body.put("boardingAddress", boardingAddress);
      String url = baseUrl(call) + "/v1/lnurl/addresses";
      Request req = new Request.Builder()
        .url(url)
        .post(RequestBody.create(body.toString(), JSON))
        .addHeader("Accept", "application/json")
        .build();
      try (Response res = client.newCall(req).execute()) {
        String text = res.body() != null ? res.body().string() : "";
        if (!res.isSuccessful()) {
          call.resolve(new JSObject().put("error", "http_" + res.code()));
          return;
        }
        try {
          JSONObject json = new JSONObject(text);
          Object addrs = json.opt("addresses");
          if (addrs instanceof JSONArray) {
            JSObject out = new JSObject();
            out.put("addresses", JSArray.from(addrs));
            call.resolve(out);
          } else {
            JSObject out = new JSObject();
            out.put("addresses", new JSArray());
            call.resolve(out);
          }
        } catch (Exception e) {
          call.resolve(new JSObject().put("addresses", new JSArray()));
        }
      }
    } catch (Exception e) {
      call.resolve(new JSObject().put("error", e.getMessage()));
    }
  }

  @PluginMethod
  public void sessionLnurl(PluginCall call) {
    try {
      String identity = call.getString("identity");
      String arkadeAddress = call.getString("arkadeAddress");
      String boardingAddress = call.getString("boardingAddress");
      if (identity == null || arkadeAddress == null) {
        call.reject("missing identity or arkadeAddress");
        return;
      }
      JSONObject body = new JSONObject();
      body.put("identity", identity);
      body.put("arkadeAddress", arkadeAddress);
      if (boardingAddress != null) body.put("boardingAddress", boardingAddress);
      String url = baseUrl(call) + "/v1/lnurl/session";
      Request req = new Request.Builder()
        .url(url)
        .post(RequestBody.create(body.toString(), JSON))
        .addHeader("Accept", "application/json")
        .build();
      try (Response res = client.newCall(req).execute()) {
        String text = res.body() != null ? res.body().string() : "";
        if (!res.isSuccessful()) {
          call.resolve(new JSObject().put("error", "http_" + res.code()));
          return;
        }
        try {
          JSONObject json = new JSONObject(text);
          String lnurl = json.optString("lnurl", null);
          if (lnurl == null) lnurl = json.optString("sessionLnurl", null);
          if (lnurl == null) {
            call.resolve(new JSObject().put("error", "no_lnurl"));
            return;
          }
          call.resolve(new JSObject().put("lnurl", lnurl));
        } catch (Exception e) {
          call.resolve(new JSObject().put("error", e.getMessage()));
        }
      }
    } catch (Exception e) {
      call.resolve(new JSObject().put("error", e.getMessage()));
    }
  }

  @PluginMethod
  public void capabilities(PluginCall call) {
    try {
      String url = baseUrl(call) + "/.well-known/lnurlp/capabilities";
      Request req = new Request.Builder()
        .url(url)
        .get()
        .addHeader("Accept", "application/json")
        .build();
      try (Response res = client.newCall(req).execute()) {
        String text = res.body() != null ? res.body().string() : "";
        if (!res.isSuccessful()) {
          call.resolve(new JSObject().put("error", "http_" + res.code()));
          return;
        }
        try {
          JSONObject json = new JSONObject(text);
          JSObject out = new JSObject();
          out.put("capabilities", new JSObject(json.toString()));
          call.resolve(out);
        } catch (Exception e) {
          call.resolve(new JSObject().put("raw", text));
        }
      }
    } catch (Exception e) {
      call.resolve(new JSObject().put("error", e.getMessage()));
    }
  }
}
