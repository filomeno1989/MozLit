package mz.mozlit.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * InstaladorApk (v1.2.0): abre o instalador do Android para o APK da
 * actualização que a app descarregou por dentro (cache da própria app).
 *
 * O WebView não pode instalar APKs por segurança; este plugin usa o
 * FileProvider do Capacitor (authorities ${applicationId}.fileprovider,
 * já declarado no AndroidManifest) para o instalador do sistema ler o
 * ficheiro. Em Android 8+ (API 26+), se faltar a permissão "Instalar apps
 * desconhecidas", abrimos as definições dessa permissão; ao voltar à app,
 * o JavaScript repete a instalação com o mesmo ficheiro.
 */
@CapacitorPlugin(name = "InstaladorApk")
public class InstaladorApkPlugin extends Plugin {

    /** True quando o Android permite instalar APKs vindos desta app. */
    @PluginMethod
    public void podeInstalar(PluginCall call) {
        boolean pode = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            pode = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject r = new JSObject();
        r.put("pode", pode);
        call.resolve(r);
    }

    /** Abre as definições "Instalar apps desconhecidas" desta app. */
    @PluginMethod
    public void pedirPermissao(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context c = getContext();
            Intent i = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + c.getPackageName())
            );
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        }
        call.resolve();
    }

    /**
     * Abre um endereço no navegador PRINCIPAL do telefone (Chrome completo),
     * via ACTION_VIEW. Ao contrário do Chrome Custom Tabs, as descargas aí
     * sobrevivem à volta à app e podem ser retomadas pelo gestor de descargas.
     */
    @PluginMethod
    public void abrirNoNavegador(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL em falta");
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Nenhum navegador disponível: " + e.getMessage());
        }
    }

    /**
     * Abre o instalador do Android para o APK indicado (caminho absoluto
     * dentro da app, ex.: /data/user/0/mz.mozlit.app/cache/MozLit.apk).
     * Devolve estado 'instalador_aberto' ou 'permissao_necessaria'.
     */
    @PluginMethod
    public void instalar(PluginCall call) {
        String caminho = call.getString("caminho");
        if (caminho == null || caminho.isEmpty()) {
            call.reject("Caminho do APK em falta");
            return;
        }
        Context c = getContext();
        File f = new File(caminho);
        if (!f.exists() || f.length() == 0) {
            call.reject("APK não encontrado em " + caminho);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !c.getPackageManager().canRequestPackageInstalls()) {
            Context cx = getContext();
            Intent s = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + cx.getPackageName())
            );
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            cx.startActivity(s);
            JSObject r = new JSObject();
            r.put("estado", "permissao_necessaria");
            call.resolve(r);
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
            JSObject r = new JSObject();
            r.put("estado", "instalador_aberto");
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao abrir o instalador: " + e.getMessage());
        }
    }
}
