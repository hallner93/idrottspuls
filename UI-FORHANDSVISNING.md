# Förhandsvisning av nytt utseende

Den här separata Androidappen visar ett visuellt förslag för Idrottspuls. Den vanliga appen får inga stiländringar av förhandsversionen.

## Så hämtar du förhandsversionen

1. Slå först ihop PR #12 och därefter PR:n för UI-förhandsvisningen.
2. Öppna **Actions → Förhandsvisning av nytt utseende**.
3. Välj **Run workflow** på grenen **main**.
4. Hämta artefakten **Idrottspuls-UI-Förhandsvisning** och packa upp APK-filen.
5. Installera APK:n. Den kan ligga bredvid vanliga Idrottspuls.

Förhandsappen har ett separat app-id och egen lokal lagring. Den startar i demoläge med fiktiva exempel. Ändringar och data i förhandsappen påverkar inte vanliga Idrottspuls. Importera inte någon säkerhetskopia till förhandsappen.

När du är klar kan du avinstallera **Idrottspuls – Förhandsvisning** utan att påverka vanliga appen.
