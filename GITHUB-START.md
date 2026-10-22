# Bygg den färdiga Androidappen Idrottspuls

Projektet bygger en signerad APK med appnamnet **Idrottspuls**. Du behöver inte installera Android Studio. Den färdiga appen fungerar offline och sparar elevuppgifterna lokalt på surfplattan.

## 1. Säkerhetskopiera den gamla testappen

Öppna testappen på mobilen eller surfplattan. Gå till **Export & backup → Skapa säkerhetskopia** och spara JSON-filen på en plats du kan hitta igen. Kontrollera att filen finns innan du går vidare. Avinstallera inte testappen än. Den nya appen har en egen lagring; en vanlig installation flyttar inte uppgifterna automatiskt.

## 2. Ladda upp den nya koden

Packa upp `Idrottspuls-uppdatering-1.2.zip`. I ditt privata GitHubprojekt, välj **Code → Add file → Upload files**. Dra in de uppackade mapparna `android`, `web`, `tests` och `.github`, samt filen `package.json`, direkt i projektets rot och välj **Commit changes**. Godkänn att befintliga filer ersätts. Mappen `.github` måste ligga på samma nivå som `android` och `web`.

Kontrollera sedan under **Code** att `.github/workflows/android-apk.yml` börjar med `name: Bygg Idrottspuls`. Om webbläsaren utelämnade den dolda mappen, öppna den befintliga filen på GitHub, välj pennan **Edit this file** och ersätt innehållet med filen från paketet. Spara ändringen.

## 3. Lägg in signeringsnyckeln som två hemligheter

Tre privata filer ligger **utanför källkodspaketet**:

- `Idrottspuls-signering.jks` är originalnyckeln.
- `Idrottspuls-signering-base64.txt` är samma nyckel i textform för GitHub.
- `Idrottspuls-signering-losenord.txt` innehåller nyckelns lösenord.

Öppna GitHubprojektets **Settings → Secrets and variables → Actions → New repository secret**. Skapa dessa två hemligheter:

| Name | Secret |
| --- | --- |
| `IDROTTSPULS_KEYSTORE_BASE64` | Hela innehållet i `Idrottspuls-signering-base64.txt` |
| `IDROTTSPULS_KEYSTORE_PASSWORD` | Hela innehållet i `Idrottspuls-signering-losenord.txt` |

Kopiera bara innehållet till **Secret**. Ladda aldrig upp någon av de tre privata filerna under **Code**. Spara originalnyckeln och lösenordet på en trygg plats som du själv kontrollerar, helst också som separat säkerhetskopia på din privata dator. Samma nyckel krävs för att nya versioner ska kunna installeras som uppdateringar utan att appens lokala data raderas.

## 4. Bygg och installera

Öppna **Actions → Bygg Idrottspuls → Run workflow**. Vänta tills körningen är grön. Längst ner på körningens sida hämtar du **Idrottspuls-Android-[nummer]** under **Artifacts**. Packa upp filen och flytta `Idrottspuls.apk` till surfplattan. Öppna APK-filen där och installera.

Den färdiga appen heter **Idrottspuls** och kan finnas bredvid testappen tills överföringen är klar. Öppna **Idrottspuls → Export & backup → Återställ säkerhetskopia** och välj JSON-filen från steg 1. Kontrollera att klasser, lektioner och observationer finns där. Först därefter kan du ta bort testappen.

Om bygget blir rött, öppna det felande steget och dela feltexten här. Dela aldrig innehållet i de privata signeringsfilerna eller elevuppgifter i felrapporten.

## Senare uppdateringar

Behåll samma app-id `se.idrottspuls.app` och samma signeringsnyckel. Höj `versionCode` i `android/app/build.gradle` för varje ny APK. Ta en säkerhetskopia i appen före uppdatering. Installera den nya signerade APK:n ovanpå Idrottspuls. Byggresultatet på GitHub sparas i sju dagar, men den installerade appen och dess lokala data påverkas inte när resultatet försvinner.
