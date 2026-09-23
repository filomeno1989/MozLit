package mz.mozlit.app;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

/**
 * MozLit — activity principal.
 *
 * FLAG_SECURE (Fase 7, item 34): bloqueia capturas de ecrã e gravação de
 * vídeo AO NÍVEL DO SISTEMA OPERATIVO Android — o ecrã torna-se fisicamente
 * incapaz de ser fotografado por outras apps (botões de volume+power, gravação
 * de ecrã, miniatura do multitarefa fica preta). Isto é a promessa de protecção
 * levada ao limite: no browser era impossível; na app nativa, o sistema é quem
 * proíbe. Complementa a marca d'água forense do leitor.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
