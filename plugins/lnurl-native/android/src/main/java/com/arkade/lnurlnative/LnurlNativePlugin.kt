package com.arkade.lnurlnative

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.URI
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Generic HTTP transport for the web layer.
 *
 * The bridge deliberately knows nothing about LNURL: the TypeScript client keeps
 * owning endpoints, tokens and parsing, and only swaps `fetch` for this plugin on
 * native. That avoids duplicating the server contract in Kotlin.
 */
@CapacitorPlugin(name = "LnurlNative")
class LnurlNativePlugin : Plugin() {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    // Capacitor runs plugin methods on a single handler thread; never block it on I/O.
    private val executor = Executors.newCachedThreadPool()

    @PluginMethod
    fun request(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("missing url")
            return
        }

        val uri = try {
            URI(url)
        } catch (_: Exception) {
            call.reject("invalid url")
            return
        }
        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        if (scheme != "https" && !(scheme == "http" && isLoopback(uri.host))) {
            call.reject("refusing insecure url")
            return
        }

        val method = (call.getString("method") ?: "GET").uppercase(Locale.ROOT)
        val headers = call.getObject("headers")

        val request = try {
            val mediaType = (headers?.optString("content-type")?.takeIf { it.isNotBlank() }
                ?: "application/json; charset=utf-8").toMediaType()
            val body = call.getString("body")?.toRequestBody(mediaType)
                ?: if (method in METHODS_WITH_BODY) "".toRequestBody(mediaType) else null

            Request.Builder()
                .url(url)
                .method(method, body)
                .apply {
                    headers?.let { values ->
                        values.keys().forEach { name ->
                            val value = values.optString(name)
                            if (value.isNotEmpty() && !name.equals("content-length", ignoreCase = true)) {
                                header(name, value)
                            }
                        }
                    }
                }
                .build()
        } catch (e: Exception) {
            call.reject(e.message ?: "invalid request", "request_error", e)
            return
        }

        executor.execute {
            try {
                client.newCall(request).execute().use { response ->
                    val responseHeaders = JSObject()
                    response.headers.forEach { (name, value) -> responseHeaders.put(name, value) }

                    call.resolve(
                        JSObject()
                            .put("status", response.code)
                            .put("statusText", response.message)
                            .put("headers", responseHeaders)
                            .put("body", response.body?.string() ?: "")
                            .put("url", response.request.url.toString()),
                    )
                }
            } catch (e: Exception) {
                call.reject(e.message ?: "network error", "http_error", e)
            }
        }
    }

    override fun handleOnDestroy() {
        executor.shutdownNow()
        client.dispatcher.executorService.shutdown()
        client.connectionPool.evictAll()
    }

    private fun isLoopback(host: String?): Boolean {
        val normalised = host?.lowercase(Locale.ROOT) ?: return false
        return normalised in LOOPBACK_HOSTS
    }

    private companion object {
        val METHODS_WITH_BODY = setOf("POST", "PUT", "PATCH")
        val LOOPBACK_HOSTS = setOf("localhost", "127.0.0.1", "::1", "[::1]", "10.0.2.2")
    }
}
