package se.idrottspuls.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public final class NextLessonWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        NextLessonWidgetSupport.refreshAll(context);
    }
    @Override public void onReceive(Context context, android.content.Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (android.content.Intent.ACTION_DATE_CHANGED.equals(action)
                || android.content.Intent.ACTION_TIME_CHANGED.equals(action)
                || android.content.Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            NextLessonWidgetSupport.refreshAll(context);
        }
    }
}

