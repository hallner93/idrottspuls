# Bygg Idrottspuls i webbläsaren

Projektet är förberett för GitHub Actions. Du behöver ett GitHub-konto och en webbläsare. Android Studio behöver inte installeras på din dator för den här vägen.

## 1. Konto och privat projekt

Välj **GitHub Free** när du skapar kontot. När kontot är klart kan du ansluta GitHub till chatten så hjälper vi till med nästa steg. Du ska själv slutföra registrering, lösenord och eventuell tvåfaktorsinloggning.

Projektet ska heta **idrottspuls** och vara **Private**. Koden innehåller appen och fiktiva demonstrationsexempel. Dina egna elevuppgifter ligger i appens lokala lagring och följer inte med projektpaketet.

Inget har laddats upp och inget bygge har körts genom att det här paketet skapats.

## 2. Om du lägger upp filerna själv

1. Skapa ett nytt projekt på GitHub med namnet `idrottspuls`. Välj **Private** och lägg till en README så att projektets standardgren skapas.
2. Packa upp `Idrottspuls-GitHub.zip` på datorn. Öppna den uppackade `Idrottspuls`-mappen.
3. Välj **Add file → Upload files** i GitHub. Dra in innehållet från `Idrottspuls`-mappen. Mapparna `android`, `web`, `tests` och `.github` ska ligga direkt i projektets rot på GitHub.
4. Välj **Commit changes**. En uppladdad zip-fil packas inte upp automatiskt av GitHub; ladda därför upp filerna och mapparna från det uppackade paketet.
5. Kontrollera att `.github/workflows/android-apk.yml` finns med. Om din webbläsare hoppar över punktmappar kan du i stället välja **Add file → Create new file**, ange exakt `.github/workflows/android-apk.yml` som filnamn och klistra in innehållet från samma fil i paketet.

Ladda bara upp projektets källfiler. Säkerhetskopior av elevuppgifter, signerande nycklar och egna exporter ska stanna utanför kodprojektet.

## 3. Starta bygget

1. Öppna fliken **Actions** i ditt projekt.
2. Om GitHub ber dig aktivera Actions i det privata projektet följer du den vanliga aktiveringen för GitHub-hostade byggen.
3. Välj **Bygg Idrottspuls testapp** i vänsterlistan.
4. Klicka **Run workflow** och bekräfta körningen. Behåll standardgrenen vald.
5. Öppna den nya körningen för att följa förloppet. Bygget har en tidsgräns på 20 minuter; detta är en gräns, inte en uppskattning av hur lång tid det tar.
6. När körningen är grön finns **Idrottspuls-test-[nummer]** under **Artifacts** på körningens sida. Hämta zip-filen och packa upp den. Installationsfilen heter **Idrottspuls-test.apk**.

Om körningen blir röd: öppna steget som misslyckades och dela feltexten här, eller låt chatten läsa loggen via GitHubanslutningen. En uppladdad eller förberedd byggfil betyder inte att Androidbygget har lyckats; bara en lyckad körning ger en APK.

## 4. Prova på Android

Överför APK-filen till surfplattan och öppna den där. Android kan be dig tillåta installation från den valda filhanteraren. Följ skolans eller organisationens regler om surfplattan är administrerad.

Testappen heter **Idrottspuls Test** och kräver Android 8.0 eller senare. Den har en egen appmapp och delar inte automatiskt data med webbversionen eller den kommande slutversionen.

Prova:

- Skapa en liten testklass och lektion.
- Spara närvaro och en observation.
- Stäng och öppna appen och kontrollera att uppgifterna finns kvar.
- Slå på flygplansläge och använd appen.
- Exportera Excel och skapa en säkerhetskopia till en plats på surfplattan.
- Återställ säkerhetskopian och kontrollera resultatet.

Appen innehåller sina egna filer och lagrar elevuppgifter lokalt. GitHub behövs för att bygga nya installationsfiler, inte för att använda appen efter installation.

## Testsignering och framtida uppdateringar

Det första bygget använder Androids automatiska testsignering. GitHubs byggmaskin är tillfällig och kan skapa en ny testnyckel vid varje bygge. Därför kan en senare test-APK inte alltid installeras som en uppdatering av en äldre testversion.

Använd fiktiva uppgifter under de första proven. Exportera en fullständig säkerhetskopia före byte av testversion. Avinstallation tar bort appens interna data. **En permanent signeringsnyckel ska ordnas innan Idrottspuls tas i ordinarie bruk.** Då kan vi bygga uppdateringar med samma identitet och behålla den lokala lektionsboken. Nyckeln ska inte läggas i kodarkivet.

## Gratisnivå och förbrukning

Bygget använder en standardmaskin med Ubuntu 24.04, förinstallerad Java 17 och Android SDK 36. Det startar endast när **Run workflow** används. Vanliga kodändringar startar inga byggen. Ingen extra stor byggmaskin eller separat pakettjänst används. APK-resultatet sparas i sju dagar för att begränsa lagringen; en redan installerad app påverkas inte när filen tas bort från GitHub.

GitHub Free inkluderar en månatlig kvot för privata projekt. Den delas med annan användning på samma konto. Förberedelsen här ändrar inga betalinställningar och kan inte garantera att ditt konto har hela gratiskvoten kvar.

Officiell dokumentation: [Starta ett bygge manuellt](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [Bygg med Gradle på GitHub](https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-gradle), [GitHub Actions och gratisgränser](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
