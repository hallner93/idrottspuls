package se.idrottspuls.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
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
import androidx.core.content.FileProvider;
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
    private static final int EXPORT_REQUEST = 701, IMPORT_REQUEST = 702, VIDEO_EXPORT_REQUEST = 703, PHOTO_CAPTURE_REQUEST = 704;
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int MAX_BYTES = 20_000_000;
    private WebView webView;
    private ValueCallback<Uri[]> chooserCallback;
    private byte[] pendingExport;
    private AtomicFile stateFile;
    private OutputStream videoExportOutput;
    private File photoCaptureFile;

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
                String[] acceptTypes = params.getAcceptTypes();
                String mimeType = acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty() ? acceptTypes[0] : "*/*";
                boolean videoCapture = params.isCaptureEnabled() && acceptTypes != null && java.util.Arrays.stream(acceptTypes).anyMatch(type -> type != null && type.startsWith("video/"));
                boolean imageCapture = params.isCaptureEnabled() && acceptTypes != null && java.util.Arrays.stream(acceptTypes).anyMatch(type -> type != null && type.startsWith("image/"));
                try {
                    if (videoCapture) {
                        Intent camera = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                        camera.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 1);
                        try { startActivityForResult(camera, IMPORT_REQUEST); }
                        catch (Exception noCameraApp) { launchOpenDocument(mimeType); }
                    } else if (imageCapture) launchPhotoCamera(mimeType);
                    else launchOpenDocument(mimeType);
                } catch (Exception e) { chooserCallback.onReceiveValue(null); chooserCallback = null; }
                return true;
            }
        });
        webView.addJavascriptInterface(new LocalBridge(), "IdrottspulsNative");
        webView.loadUrl(ORIGIN + "/assets/www/index.html");
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::goBack);
    }
    private void launchOpenDocument(String mimeType) throws Exception {
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType(mimeType);
        startActivityForResult(picker, IMPORT_REQUEST);
    }
    private void launchPhotoCamera(String mimeType) throws Exception {
        File directory = new File(getCacheDir(), "camera");
        if (!directory.exists() && !directory.mkdirs()) throw new Exception("Kameramappen kunde inte skapas.");
        photoCaptureFile = File.createTempFile("idrottspuls-", ".jpg", directory);
        Uri output = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoCaptureFile);
        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        camera.putExtra(MediaStore.EXTRA_OUTPUT, output);
        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        camera.setClipData(android.content.ClipData.newRawUri("Idrottspuls foto", output));
        try { startActivityForResult(camera, PHOTO_CAPTURE_REQUEST); }
        catch (Exception noCameraApp) { photoCaptureFile.delete(); photoCaptureFile = null; launchOpenDocument(mimeType); }
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
        if (requestCode == PHOTO_CAPTURE_REQUEST) {
            Uri captured = resultCode == RESULT_OK && photoCaptureFile != null && photoCaptureFile.isFile() && photoCaptureFile.length() > 0
                ? FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoCaptureFile) : null;
            if (captured == null && photoCaptureFile != null) { photoCaptureFile.delete(); photoCaptureFile = null; }
            if (chooserCallback != null) { chooserCallback.onReceiveValue(captured == null ? null : new Uri[]{captured}); chooserCallback = null; }
        }
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
        if (requestCode == VIDEO_EXPORT_REQUEST) {
            if (resultCode != RESULT_OK || result == null || result.getData() == null) { videoExportOutput = null; videoExportResult(false, "Exporten avbröts."); return; }
            try {
                videoExportOutput = getContentResolver().openOutputStream(result.getData(), "wt");
                if (videoExportOutput == null) throw new Exception("Filen kunde inte öppnas.");
                videoExportResult(true, "Redo att spara.");
            } catch (Exception e) { videoExportOutput = null; videoExportResult(false, "Filen kunde inte öppnas."); }
        }
    }
    private void videoExportResult(boolean ok, String message) {
        if (webView != null) webView.evaluateJavascript("window.idrottspulsVideoExportReady && window.idrottspulsVideoExportReady(" + ok + "," + JSONObject.quote(message) + ")", null);
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
                int schema = object.getInt("schemaVersion");
                if ((schema != 1 && schema != 2) || !object.has("real") || !object.has("demo")) return "Felaktigt dataformat.";
                output = stateFile.startWrite(); output.write(bytes); stateFile.finishWrite(output);
                try { NextLessonWidgetSupport.refreshAll(MainActivity.this); } catch (Exception ignored) { }
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
        @JavascriptInterface public void beginVideoExport(String name, String mime) {
            runOnUiThread(() -> {
                if (videoExportOutput != null) { videoExportResult(false, "En videoexport pågår redan."); return; }
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime == null || mime.isEmpty() ? "video/mp4" : mime);
                intent.putExtra(Intent.EXTRA_TITLE, name == null ? "Idrottspuls-video.mp4" : name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                try { startActivityForResult(intent, VIDEO_EXPORT_REQUEST); }
                catch (Exception e) { videoExportResult(false, "Ingen filväljare kunde öppnas."); }
            });
        }
        @JavascriptInterface public synchronized String writeVideoChunk(String encoded) {
            try {
                if (videoExportOutput == null) return "Ingen exportfil är vald.";
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                videoExportOutput.write(bytes);
                return "OK";
            } catch (Exception e) { return "Videon kunde inte skrivas. Kontrollera ledigt utrymme."; }
        }
        @JavascriptInterface public synchronized String finishVideoExport() {
            try {
                if (videoExportOutput == null) return "Ingen exportfil är vald.";
                videoExportOutput.flush(); videoExportOutput.close(); videoExportOutput = null;
                return "OK";
            } catch (Exception e) { videoExportOutput = null; return "Videoexporten misslyckades."; }
        }
        @JavascriptInterface public synchronized void cancelVideoExport() {
            try { if (videoExportOutput != null) videoExportOutput.close(); } catch (Exception ignored) {}
            videoExportOutput = null;
        }
        @JavascriptInterface public synchronized String deleteCameraCapture() {
            if (photoCaptureFile == null) return "OK";
            boolean removed = !photoCaptureFile.exists() || photoCaptureFile.delete();
            if (removed) photoCaptureFile = null;
            return removed ? "OK" : "Kamerabilden kunde inte rensas från tillfälligt minne.";
        }
    }
    @Override protected void onDestroy() {
        if (chooserCallback != null) chooserCallback.onReceiveValue(null);
        if (photoCaptureFile != null && photoCaptureFile.exists()) photoCaptureFile.delete();
        try { if (videoExportOutput != null) videoExportOutput.close(); } catch (Exception ignored) {}
        if (webView != null) { webView.removeJavascriptInterface("IdrottspulsNative"); webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
