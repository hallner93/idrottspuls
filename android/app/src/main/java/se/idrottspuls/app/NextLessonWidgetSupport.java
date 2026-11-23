package se.idrottspuls.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.AtomicFile;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;

final class NextLessonWidgetSupport {
    private static final int LOOKAHEAD_DAYS = 90;
    private static final Locale SWEDISH = new Locale("sv", "SE");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("EEEE d MMMM", SWEDISH);

    private NextLessonWidgetSupport() {}

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        updateProvider(context, manager, new ComponentName(context, NextLessonWidgetProvider.class), false);
        updateProvider(context, manager, new ComponentName(context, LockScreenNextLessonWidgetProvider.class), true);
    }

    private static void updateProvider(Context context, AppWidgetManager manager, ComponentName component, boolean lockScreen) {
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length == 0) return;
        int layout = lockScreen ? R.layout.widget_next_lesson_lock : R.layout.widget_next_lesson_home;
        Lesson lesson;
        try { lesson = findNextLesson(context); } catch (Exception ignored) { lesson = null; }
        Intent launch = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, lockScreen ? 802 : 801, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layout);
            views.setOnClickPendingIntent(R.id.widget_root, pending);
            if (lesson == null) {
                views.setTextViewText(R.id.widget_day, "Idrottspuls · Översikt");
                views.setTextViewText(R.id.widget_class, "Ingen kommande lektion");
                views.setTextViewText(R.id.widget_time, "");
                views.setTextViewText(R.id.widget_activity, "Öppna appen för att se dagens planering.");
                views.setTextViewText(R.id.widget_location, "");
                views.setViewVisibility(R.id.widget_location, View.GONE);
            } else {
                views.setTextViewText(R.id.widget_day, lesson.dateLabel);
                views.setTextViewText(R.id.widget_class, lesson.className);
                views.setTextViewText(R.id.widget_time, lesson.timeLabel);
                views.setTextViewText(R.id.widget_activity, lesson.topic);
                views.setTextViewText(R.id.widget_location, lesson.location);
                views.setViewVisibility(R.id.widget_location, lesson.location.isEmpty() ? View.GONE : View.VISIBLE);
            }
            manager.updateAppWidget(id, views);
        }
    }

    private static JSONObject readActiveData(Context context) {
        File base = new File(context.getFilesDir(), "idrottspuls-v1.json");
        if (!base.exists() && !new File(base.getPath() + ".bak").exists()) return null;
        AtomicFile state = new AtomicFile(base);
        try (FileInputStream input = state.openRead(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (bytes.size() + count > 20_000_000) return null;
                bytes.write(buffer, 0, count);
            }
            JSONObject envelope = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            return envelope.optJSONObject(envelope.optString("active", "real"));
        } catch (Exception ignored) { return null; }
    }

    private static Lesson findNextLesson(Context context) {
        JSONObject data = readActiveData(context);
        if (data == null) return null;
        JSONArray schedules = data.optJSONArray("schedules");
        JSONArray sessions = data.optJSONArray("sessions");
        JSONArray breaks = data.optJSONArray("breaks");
        JSONArray classes = data.optJSONArray("classes");
        if (schedules == null) schedules = new JSONArray();
        if (sessions == null) sessions = new JSONArray();
        if (breaks == null) breaks = new JSONArray();
        if (classes == null) classes = new JSONArray();
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        for (int offset = 0; offset < LOOKAHEAD_DAYS; offset++) {
            LocalDate date = today.plusDays(offset);
            int weekday = date.getDayOfWeek().getValue();
            if (weekday > 5) continue;
            String dateKey = date.toString();
            ArrayList<Lesson> candidates = new ArrayList<>();
            ArrayList<String> usedSessionIds = new ArrayList<>();
            boolean paused = false;
            for (int i = 0; i < breaks.length(); i++) {
                JSONObject item = breaks.optJSONObject(i);
                if (item != null && item.optString("start").compareTo(dateKey) <= 0 && item.optString("end").compareTo(dateKey) >= 0) { paused = true; break; }
            }

            if (!paused) {
                for (int i = 0; i < schedules.length(); i++) {
                    JSONObject schedule = schedules.optJSONObject(i);
                    if (schedule == null || schedule.optInt("day", -1) != weekday) continue;
                    JSONObject saved = null;
                    for (int j = 0; j < sessions.length(); j++) {
                        JSONObject session = sessions.optJSONObject(j);
                        if (session != null && dateKey.equals(session.optString("date")) && schedule.optString("id").equals(session.optString("scheduleId"))) { saved = session; break; }
                    }
                    if (saved != null && (saved.has("cancelledAt") && !saved.isNull("cancelledAt") && !saved.optString("cancelledAt").isEmpty())) continue;
                    if (saved != null && saved.optBoolean("complete")) continue;
                    if (saved != null) usedSessionIds.add(saved.optString("id"));
                    String topic = saved == null ? plannedTopic(data, schedule, schedules, date) : saved.optString("topic");
                    if (topic.isEmpty()) topic = schedule.optString("topic");
                    candidates.add(makeLesson(date, schedule, saved, classes, topic));
                }
            }

            for (int i = 0; i < sessions.length(); i++) {
                JSONObject session = sessions.optJSONObject(i);
                if (session == null || !dateKey.equals(session.optString("date")) || usedSessionIds.contains(session.optString("id")) || session.optBoolean("complete")) continue;
                if (!session.isNull("cancelledAt") && !session.optString("cancelledAt").isEmpty()) continue;
                candidates.add(makeLesson(date, null, session, classes, session.optString("topic")));
            }

            candidates.sort(Comparator.comparing(item -> item.start));
            for (Lesson lesson : candidates) {
                if (offset > 0 || lesson.end.isAfter(now)) {
                    lesson.dateLabel = offset == 0 ? "Idag" : offset == 1 ? "Imorgon" : capitalize(date.format(DATE_FORMAT));
                    lesson.timeLabel = lesson.start.isAfter(now) || offset > 0
                        ? lesson.start.format(DateTimeFormatter.ofPattern("HH:mm"))
                        : "Pågår · " + lesson.start.format(DateTimeFormatter.ofPattern("HH:mm")) + "–" + lesson.end.format(DateTimeFormatter.ofPattern("HH:mm"));
                    return lesson;
                }
            }
        }
        return null;
    }

    private static String plannedTopic(JSONObject data, JSONObject selected, JSONArray schedules, LocalDate date) {
        JSONArray classes = data.optJSONArray("classes"), plans = data.optJSONArray("lessonPlans");
        if (classes == null || plans == null) return "";
        String classId = selected.optString("classId");
        int yearGroup = 0;
        for (int i = 0; i < classes.length(); i++) {
            JSONObject item = classes.optJSONObject(i);
            if (item != null && classId.equals(item.optString("id"))) { yearGroup = item.optInt("yearGroup"); break; }
        }
        if (yearGroup == 0) return "";
        int slot = 0, index = 0;
        ArrayList<JSONObject> ordered = new ArrayList<>();
        for (int i = 0; i < schedules.length(); i++) {
            JSONObject item = schedules.optJSONObject(i);
            if (item != null && classId.equals(item.optString("classId")) && item.optInt("day") >= 1 && item.optInt("day") <= 5) ordered.add(item);
        }
        ordered.sort(Comparator.comparingInt((JSONObject item) -> item.optInt("day")).thenComparing(item -> item.optString("start")).thenComparing(item -> item.optString("id")));
        for (JSONObject item : ordered) { index++; if (selected.optString("id").equals(item.optString("id"))) { if (index <= 3) slot = index; break; } }
        if (slot == 0) return "";
        LocalDate monday = date.minusDays(date.getDayOfWeek().getValue() - 1);
        for (int i = 0; i < plans.length(); i++) {
            JSONObject plan = plans.optJSONObject(i);
            if (plan != null && plan.optInt("yearGroup") == yearGroup && plan.optInt("slot") == slot && monday.toString().equals(plan.optString("weekStart"))) return plan.optString("topic");
        }
        return "";
    }

    private static Lesson makeLesson(LocalDate date, JSONObject schedule, JSONObject saved, JSONArray classes, String topic) {
        JSONObject source = saved == null ? schedule : saved;
        String classId = source == null ? "" : source.optString("classId");
        String className = source == null ? "" : source.optString("className");
        if (className.isEmpty()) for (int i = 0; i < classes.length(); i++) {
            JSONObject item = classes.optJSONObject(i);
            if (item != null && classId.equals(item.optString("id"))) { className = item.optString("name"); break; }
        }
        Lesson result = new Lesson();
        result.start = LocalTime.parse(source == null ? "08:00" : source.optString("start", "08:00"));
        result.end = LocalTime.parse(source == null ? "08:50" : source.optString("end", "08:50"));
        result.className = className.isEmpty() ? "Nästa lektion" : className;
        result.topic = topic == null || topic.trim().isEmpty() ? "Idrott & hälsa" : topic.trim();
        result.location = source == null ? "" : source.optString("location");
        return result;
    }

    private static String capitalize(String value) { return value.isEmpty() ? value : value.substring(0, 1).toUpperCase(SWEDISH) + value.substring(1); }

    private static final class Lesson {
        LocalTime start, end;
        String className, topic, location, dateLabel, timeLabel;
    }
}

