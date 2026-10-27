package com.example.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;

@CapacitorPlugin(
        name = "PowerWakelock",
        permissions = {
                @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"),
                @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
                @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "backgroundLocation")
        }
)
public class PowerPlugin extends Plugin {

    private PowerManager.WakeLock wakeLock;

    @PluginMethod
    public void acquireWakeLock(PluginCall call) {
        if (wakeLock == null) {
            PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SisTransporte::TrackingWakeLock");
        }
        if (!wakeLock.isHeld()) {
            wakeLock.acquire();
        }
        call.resolve();
    }

    @PluginMethod
    public void releaseWakeLock(PluginCall call) {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        call.resolve();
    }

    @PluginMethod
    public void checkNotificationsPermission(PluginCall call) {
        boolean granted = true;
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                granted = getPermissionState("notifications") == PermissionState.GRANTED;
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkLocationAlways(PluginCall call) {
        boolean fineGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean backgroundGranted = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            backgroundGranted = getPermissionState("backgroundLocation") == PermissionState.GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("fineGranted", fineGranted);
        ret.put("backgroundGranted", backgroundGranted);
        ret.put("alwaysGranted", fineGranted && backgroundGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestLocationAlways(PluginCall call) {
        call.setKeepAlive(true);

        boolean fineGranted = getPermissionState("location") == PermissionState.GRANTED;
        if (!fineGranted) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean backgroundGranted = getPermissionState("backgroundLocation") == PermissionState.GRANTED;
            if (!backgroundGranted) {
                requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermissionCallback");
                return;
            }
        }

        resolveLocationAlways(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        boolean fineGranted = getPermissionState("location") == PermissionState.GRANTED;

        if (fineGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean backgroundGranted = getPermissionState("backgroundLocation") == PermissionState.GRANTED;
            if (!backgroundGranted) {
                requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermissionCallback");
                return;
            }
        }

        resolveLocationAlways(call);
    }

    @PermissionCallback
    private void backgroundLocationPermissionCallback(PluginCall call) {
        resolveLocationAlways(call);
    }

    private void resolveLocationAlways(PluginCall call) {
        boolean fineGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean backgroundGranted = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            backgroundGranted = getPermissionState("backgroundLocation") == PermissionState.GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("fineGranted", fineGranted);
        ret.put("backgroundGranted", backgroundGranted);
        ret.put("alwaysGranted", fineGranted && backgroundGranted);
        call.resolve(ret);
        call.setKeepAlive(false);
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        boolean ignoring = false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    ignoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
                }
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("ignoring", ignoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
            return;
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
            return;
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }
}
