package se.idrottspuls.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.AtomicFile;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Local-only Android shell. All code/assets are bundled and all data stays in app-private files. */
public class MainActivity extends Activity {
    private static final int EXPORT_REQUEST = 701, IMPORT_REQUEST = 702;
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int MAX_BYTES = 20_000_000;
    private WebView webView;
    private ValueCallback<Uri[]> chooserCallback;
    private byte[] pendingExport;
    private AtomicFile stateFile;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        stateFile = new AtomicFile(new File(getFilesDir(), "idrottspuls-v1.json"));
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(247,248,245));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(247,248,245));
        container.addView(webView, new FrameLayout.LayoutParams(-1,-1));
        setContentView(container);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBlockNetworkLoads(true);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri)) {
                    WebResourceResponse resource = loader.shouldInterceptRequest(uri);
                    if (resource != null) return resource;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !isLocal(request.getUrl()); }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                container.removeView(view); view.destroy(); webView = null;
                new AlertDialog.Builder(MainActivity.this).setTitle("Öppna Idrottspuls igen")
                    .setMessage("Visningen stängdes av Android. Dina redan sparade uppgifter finns kvar.")
                    .setPositiveButton("Öppna igen", (dialog, which) -> recreate()).setCancelable(false).show();
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooserCallback != null) chooserCallback.onReceiveValue(null);
                chooserCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try { startActivityForResult(intent, IMPORT_REQUEST); }
                catch (Exception e) { chooserCallback.onReceiveValue(null); chooserCallback = null; }
                return true;
            }
        });
        webView.addJavascriptInterface(new LocalBridge(), "IdrottspulsNative");
        webView.loadUrl(ORIGIN + "/assets/www/index.html");
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::goBack);
    }
    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPort() == -1 && uri.getPath() != null && uri.getPath().startsWith("/assets/www/");
    }
    private void goBack() {
        if (webView == null) { finish(); return; }
        webView.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()", result -> {
            if (!"true".equals(result)) { if (webView.canGoBack()) webView.goBack(); else finish(); }
        });
    }
    @Override public void onBackPressed() { goBack(); }
    private void exportResult(boolean success, String message) {
        if (webView != null) webView.evaluateJavascript("window.idrottspulsExportResult && window.idrottspulsExportResult(" + success + "," + JSONObject.quote(message) + ")", null);
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent result) {
        super.onActivityResult(requestCode, resultCode, result);
        if (requestCode == IMPORT_REQUEST && chooserCallback != null) {
            chooserCallback.onReceiveValue(resultCode == RESULT_OK && result != null && result.getData() != null ? new Uri[]{result.getData()} : null);
            chooserCallback = null;
        }
        if (requestCode == EXPORT_REQUEST) {
            byte[] bytes = pendingExport; pendingExport = null;
            if (resultCode != RESULT_OK || result == null || result.getData() == null || bytes == null) { exportResult(false, "Exporten avbröts. Ingen fil sparades."); return; }
            Uri uri = result.getData();
            new Thread(() -> {
                try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new Exception("Filen kunde inte öppnas.");
                    output.write(bytes); output.flush();
                    runOnUiThread(() -> exportResult(true, "Filen är sparad på vald plats."));
                } catch (Exception e) { runOnUiThread(() -> exportResult(false, "Kunde inte spara filen. Försök igen.")); }
            }).start();
        }
    }
    public class LocalBridge {
        @JavascriptInterface public synchronized String readState() {
            if (!stateFile.getBaseFile().exists() && !new File(stateFile.getBaseFile().getPath() + ".bak").exists()) return "";
            try (FileInputStream input = stateFile.openRead()) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (bytes.size() + count > MAX_BYTES) return "ERROR:Lektionsboken är för stor för den här versionen.";
                    bytes.write(buffer, 0, count);
                }
                return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception e) { return "ERROR:Appens data kunde inte läsas. Ingen data har skrivits över."; }
        }
        @JavascriptInterface public synchronized String writeState(String json) {
            FileOutputStream output = null;
            try {
                byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > MAX_BYTES) return "Lektionsboken är för stor. Skapa en säkerhetskopia.";
                JSONObject object = new JSONObject(json);
                if (object.getInt("schemaVersion") != 1 || !object.has("real") || !object.has("demo")) return "Felaktigt dataformat.";
                output = stateFile.startWrite(); output.write(bytes); stateFile.finishWrite(output);
                return "OK";
            } catch (Exception e) { if (output != null) stateFile.failWrite(output); return "Kunde inte spara. Kontrollera ledigt utrymme på surfplattan."; }
        }
        @JavascriptInterface public void exportFile(String name, String encoded, String mime) {
            if (encoded.length() > MAX_BYTES * 2) { runOnUiThread(() -> exportResult(false, "Exporten är för stor.")); return; }
            try {
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                runOnUiThread(() -> {
                    if (pendingExport != null) { exportResult(false, "En export pågår redan."); return; }
                    pendingExport = bytes;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(mime);
                    intent.putExtra(Intent.EXTRA_TITLE, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                    try { startActivityForResult(intent, EXPORT_REQUEST); }
                    catch (Exception e) { pendingExport = null; exportResult(false, "Ingen app kunde spara filen."); }
                });
            } catch (Exception e) { runOnUiThread(() -> exportResult(false, "Exporten kunde inte skapas.")); }
        }
    }
    @Override protected void onDestroy() {
        if (chooserCallback != null) chooserCallback.onReceiveValue(null);
        if (webView != null) { webView.removeJavascriptInterface("IdrottspulsNative"); webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
