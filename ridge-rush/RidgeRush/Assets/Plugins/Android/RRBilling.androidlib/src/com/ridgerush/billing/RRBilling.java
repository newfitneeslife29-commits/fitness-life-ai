package com.ridgerush.billing;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Puente de Google Play Billing (biblioteca 7). Mismos mensajes que el plugin de iOS (RRStore.swift):
 * OnProducts("id=precio;..."), OnPurchase(id), OnPurchaseFailed(id), OnRestored(id), OnRestoreFinished("").
 */
public final class RRBilling implements PurchasesUpdatedListener {
    private static final String TAG = "RRBilling";
    private static final String BRIDGE = "RRStoreBridge";
    private static RRBilling instance;

    private final Activity activity;
    private final BillingClient client;
    private final Set<String> consumables = new HashSet<>();
    private final Map<String, ProductDetails> details = new HashMap<>();
    private final List<String> inApp = new ArrayList<>();
    private String pendingId = "";
    private boolean connected;

    private RRBilling(Activity activity) {
        this.activity = activity;
        client = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    /** idsCsv: todos los productos; consumablesCsv: los que se pueden volver a comprar (gemas). */
    public static void init(Activity activity, String idsCsv, String consumablesCsv) {
        if (instance == null) instance = new RRBilling(activity);
        instance.load(idsCsv, consumablesCsv);
    }

    public static void buy(String id) {
        if (instance == null) { send("OnPurchaseFailed", id); return; }
        instance.launch(id);
    }

    public static void restore() {
        if (instance == null) { send("OnRestoreFinished", ""); return; }
        instance.queryOwned(true);
    }

    private void load(String idsCsv, String consumablesCsv) {
        inApp.clear();
        for (String s : idsCsv.split(",")) if (!s.isEmpty()) inApp.add(s);
        consumables.clear();
        for (String s : consumablesCsv.split(",")) if (!s.isEmpty()) consumables.add(s);
        connect(new Runnable() { public void run() { queryDetails(); queryOwned(false); } });
    }

    private void connect(final Runnable then) {
        if (connected) { then.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                connected = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                if (connected) then.run();
                else Log.w(TAG, "Billing no disponible: " + result.getDebugMessage());
            }
            @Override public void onBillingServiceDisconnected() { connected = false; }
        });
    }

    private void queryDetails() {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : inApp) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        if (products.isEmpty()) return;
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (result, list) -> {
                    StringBuilder sb = new StringBuilder();
                    if (list != null) {
                        for (ProductDetails d : list) {
                            details.put(d.getProductId(), d);
                            ProductDetails.OneTimePurchaseOfferDetails o = d.getOneTimePurchaseOfferDetails();
                            if (o == null) continue;
                            if (sb.length() > 0) sb.append(';');
                            sb.append(d.getProductId()).append('=').append(o.getFormattedPrice());
                        }
                    }
                    send("OnProducts", sb.toString());
                });
    }

    private void launch(final String id) {
        connect(new Runnable() { public void run() {
            ProductDetails d = details.get(id);
            if (d == null) { send("OnPurchaseFailed", id); return; }
            pendingId = id;
            BillingFlowParams.ProductDetailsParams p = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(d).build();
            final BillingFlowParams params = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(p)).build();
            activity.runOnUiThread(new Runnable() { public void run() {
                BillingResult r = client.launchBillingFlow(activity, params);
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    pendingId = "";
                    send("OnPurchaseFailed", id);
                }
            }});
        }});
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase p : purchases) handle(p, false);
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            queryOwned(false);
        } else {
            String id = pendingId; pendingId = "";
            send("OnPurchaseFailed", id);
        }
    }

    private void handle(final Purchase p, final boolean restoring) {
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return; // pendiente: se entrega al confirmarse
        for (final String id : p.getProducts()) {
            if (consumables.contains(id)) {
                client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                        (r, token) -> {
                            if (r.getResponseCode() == BillingClient.BillingResponseCode.OK) deliver(id, false);
                        });
            } else {
                if (!p.isAcknowledged()) {
                    client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder()
                            .setPurchaseToken(p.getPurchaseToken()).build(), r -> { });
                }
                deliver(id, restoring);
            }
        }
    }

    private void deliver(String id, boolean restoring) {
        if (id.equals(pendingId)) pendingId = "";
        send(restoring ? "OnRestored" : "OnPurchase", id);
    }

    /** Compras ya hechas: no consumibles (restaurar) y consumibles sin entregar (p. ej. si la app se cerró). */
    private void queryOwned(final boolean restoreCall) {
        connect(new Runnable() { public void run() {
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP).build(), (r, list) -> {
                if (list != null) for (Purchase p : list) handle(p, true);
                if (restoreCall) send("OnRestoreFinished", "");
            });
        }});
    }

    private static void send(String method, String msg) {
        try {
            Class<?> c = Class.forName("com.unity3d.player.UnityPlayer");
            Method m = c.getMethod("UnitySendMessage", String.class, String.class, String.class);
            m.invoke(null, BRIDGE, method, msg == null ? "" : msg);
        } catch (Exception e) {
            Log.e(TAG, "UnitySendMessage", e);
        }
    }
}
