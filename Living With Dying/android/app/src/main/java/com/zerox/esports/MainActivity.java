package com.zerox.esports;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.content.Context;
import android.app.Activity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Expose native PiP to WebView
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(new WebAppInterface(this), "AndroidNative");
            
            // Allow Auto-Play Audio (Fixes Silent Intro)
            this.getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        // Ensure Interface is added later in lifecycle if missed in onCreate
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(new WebAppInterface(this), "AndroidNative");
        }
    }

    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void enterPiP() {
            // CRITICAL: Must run on UI Thread
            runOnUiThread(() -> {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    Rational aspectRatio = new Rational(16, 9);
                    PictureInPictureParams params = new PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio)
                            .build();
                    ((Activity) mContext).enterPictureInPictureMode(params);
                } else {
                    android.widget.Toast.makeText(mContext, "PiP not supported on this Android version", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
            enterPictureInPictureMode(params);
        }
    }
}
