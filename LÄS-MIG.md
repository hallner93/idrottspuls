# Idrottspuls

En lokal lektionsbok för idrottslärare. Version 1.4.0.

## Nytt i version 1.4.0

- Översikten följer automatiskt enhetens lokala datum och vecka när appen öppnas, återupptas och när dagen byter datum. Manuell bläddring ligger kvar tills du väljer **Till idag**.
- Välj mellan tio färgteman i **Inställningar**. Originaltemat Skog är kvar som standard.
- Excel-exporten kan visa en rad per elev med samtliga lektioner samlade i cellerna, eller behålla detaljformatet med en rad per elev och lektion.
- Markera en lektion som **Slutbedömning**. Markeringen visas i elevens sammanställning och i en egen Excel-kolumn.
- Sök efter klass eller elev under **Klasser & elever**. Översiktens sidopanel visar oavslutade lektionspass och öppnar dem direkt för komplettering.
- Excelrapporten har tydligare radmarkering, läsbara radbrytningar och grön markering för slutbedömningar.
- Utvecklarens namn finns under **Inställningar → Lagring & app**.
- Lov och studiedagar påverkas inte av datumväxlingen. Alla uppgifter fortsätter att sparas lokalt.

## Nytt i version 1.2

- Lägg in elever med ett helt namn per rad, till exempel `Anna Andersson`. Du kan också klistra in två kolumner från Excel. Förhandsgranska och rätta för- och efternamn innan du sparar, särskilt namn med flera delar.
- Androidappen byggs nu som **Idrottspuls** med permanent signering. Följ `GITHUB-START.md` för säkerhetskopia, uppladdning, signering och installation.

## Nytt i version 1.1

- Observationsvalet **Okej**, flera samtidiga omdömen och upp till två betyg per elev och lektion.
- Samtliga val visas i elevrutan, sammanställningen, historiken, Excel och säkerhetskopian.
- Frånvaro, kläder och skor visas både i procent och antal. Nämnaren är avslutade lektioner i perioden med sparad närvaro där eleven ingår. Orapporterade och framtida lektioner påverkar inte procenten.
- Äldre sparade uppgifter och säkerhetskopior läses in automatiskt i det nya dataformatet. Nya kopior behöver version 1.1 eller senare.

Äldre sparade uppgifter kan läsas in i den nya versionen. Skapa en fullständig säkerhetskopia innan du byter från testappen.

## Börja här

Appen är öppnad i Codex förhandsvisning. Den visar fiktiva elever i ett tydligt märkt demoläge. Välj **Börja med egna klasser** för en separat, tom lektionsbok. Din egen data och demodata blandas inte.

För att starta webbversionen igen på en dator:

1. Packa upp hela projektmappen.
2. Installera [Node.js LTS](https://nodejs.org/) om det saknas.
3. Dubbelklicka på `Starta-Idrottspuls.cmd`, eller kör `node preview.mjs` i projektmappen.
4. Öppna `http://localhost:4173` i samma webbläsare som tidigare.

Öppna inte `web/index.html` genom att dubbelklicka på filen. Appens databas och moduler behöver en lokal webbserver eller Androidappen. Samma adress och webbläsarprofil behövs för att komma åt samma webbdata. `localhost` och `127.0.0.1` har olika lagring.

## Det här finns med

- Dagens lektioner med tider, klass, arbetsområde och plats; valfri dag och vecka.
- Återkommande veckoschema och extra lektioner på bestämda datum.
- Egna klasser, elevlistor från inklistrad text eller två kolumner från Excel, namnändring och arkivering.
- Frånvaro, glömda kläder, glömda skor och sen ankomst i minuter.
- Lokalt sparade närvaroutkast och en separat knapp för att bekräfta närvaron.
- Observationer per elev, anteckningar och valfri lektionsbedömning F–A.
- **Spara & nästa** för att snabbt fortsätta genom klassen.
- Avstådd observation för en hel lektion.
- Sammanställningar för närvaro/utrustning och observationer/bedömning, filtrerade på klass och datum.
- Elevhistorik med möjlighet att öppna och komplettera gamla lektioner.
- Excel-export i verkligt `.xlsx`-format med valbara kolumner, klass, datumintervall och radformat per elev eller per lektion.
- Fullständig lokal säkerhetskopia i JSON och validerad återställning.
- En webbapp med offlinefiler samt ett Androidprojekt som paketerar samma app lokalt.

## Ett lektionspass

1. Öppna en klass från **Översikt**.
2. Markera avvikelser. Omarkerad frånvaro betyder närvarande när du bekräftar listan.
3. Tryck **Spara närvaro** och sedan **Gå till observation**.
4. Ange arbetsområde. Markera **Avstå från observation idag** om lektionen inte ska observeras.
5. Tryck på en elev, välj observation och eventuell lektionsbedömning och spara.
6. Tryck **Avsluta lektion**. Du kan komplettera senare.

Elever sorteras efter efternamn enligt svensk sorteringsordning. Frånvarande elever är inaktiva på observationssidan. Ändra närvaron om en elev kommer senare. Nya elever som tillkommer i en klass hämtas till en redan påbörjad lektion med **Hämta nya elever från klassen**; bekräfta sedan närvaron på nytt.

## Uppföljningsregeln

Standardgränsen är **tre olika lektioner**. Dessa val räknas som negativa tillfällen:

- F i lektionsbedömning.
- Sämre än förväntat.
- Ej godkänt genomförande.
- Ej deltagande.

En lektion räknas högst en gång per elev, även om flera av kriterierna gäller. Tillfällena behöver inte vara i följd. Sparade observationer kan räknas innan lektionen avslutas. Frånvaro, obekräftad närvaro, elever utan observation och lektioner med avstådd observation räknas inte.

**Behov av uppföljning** är en direkt manuell markering. Den behöver inte vänta på tre tillfällen. Detta är en uttrycklig tolkning i den här versionen och kan justeras.

Markeringen visas i översikten, under elevens namn i en startad lektion och i sammanställningen. Inställningarna anger terminens första datum och gränsen. Uppföljningen gäller hela den aktuella terminen, även när du filtrerar sammanställningen till en kortare period.

Välj **Uppföljning genomförd** i elevhistoriken när du har följt upp. Historiken bevaras; nya tillfällen räknas från lektioner efter det datumet.

Lektionsbedömningarna är observationsunderlag. Appen räknar inte fram något terminsbetyg eller medelbetyg.

## Lagring och säkerhetskopior

Webbversionen använder IndexedDB på den aktuella enheten. En service worker lagrar appfiler för offlineanvändning efter första lyckade öppningen. Begär beständig webbläsarlagring under **Inställningar**; webbläsaren kan neka begäran. Webbversionen tillåter ett skrivande fönster åt gången för att undvika motstridiga sparningar.

Androidprojektet använder i stället en atomiskt skriven fil i appens interna lagring. Appfilerna ligger i installationspaketet. Den deklarerar ingen internetbehörighet och har automatisk Androidbackup avstängd. Det finns ingen inloggning, analyskod, molndatabas eller extern teckensnittstjänst.

Använd **Export & backup → Skapa säkerhetskopia** regelbundet. Kopian innehåller alla uppgifter i det aktiva läget. I Androids filväljare väljer du en plats **på enheten** för att hålla även exporten lokal. Om du själv väljer en molnleverantör i filväljaren hanterar den leverantören filen.

En avinstallation, rensning av appdata eller rensning av webbläsarens webbplatsdata tar bort den lokala lektionsboken. Excel-export är inte en fullständig återställningskopia. Backupfilen är okrypterad och innehåller elevuppgifter; använd en lagringsplats som skolan godkänner och surfplattans skärmlås.

Återställning ersätter uppgifterna i det läge som kopian tillhör. Skapa först en kopia av nuvarande uppgifter om du vill kunna gå tillbaka. Backupfiler större än 20 MB stöds inte i version 1.0.

## Gör den till en installerbar Androidapp

**Bygg utan Android Studio:** använd det manuella GitHub Actions-bygget och den permanenta signeringsnyckeln. Se `GITHUB-START.md` för de exakta stegen. Resultatet heter **Idrottspuls.apk**.

Androidprojektet finns i mappen `android`. Appen använder Androids WebView med lokalt paketerade filer, intern fillagring och Androids vanliga öppna/spara-dialoger. Android 8.0 eller senare krävs, med en uppdaterad Android System WebView.

1. Installera [Android Studio](https://developer.android.com/studio) på datorn.
2. Välj **Open** och öppna projektets `android`-mapp. Behåll `web`-mappen bredvid `android`; bygget hämtar appfilerna därifrån.
3. Låt Android Studio installera efterfrågad Android SDK 36 och synkronisera Gradle. Projektet använder Android Gradle Plugin 8.13.0, Gradle 8.13, JDK 17 eller senare och AndroidX WebKit 1.14.0. Använd Android Studios kompatibla inbyggda Gradle-JDK.
4. För provkörning via Android Studio: aktivera utvecklaralternativ och USB-felsökning på surfplattan, anslut med USB, välj surfplattan i Android Studio och tryck **Run**.
5. Prova på den faktiska surfplattan: stäng och öppna appen, använd flygplansläge, ändra en observation, exportera Excel och återställ en säkerhetskopia. Testa även stående/liggande läge och filväljaren.
6. För en installationsfil via Android Studio: välj **Build → Generate Signed App Bundle or APK → APK** och använd den redan skapade signeringsnyckeln. Samma nyckel och app-id behövs för framtida uppdateringar som ska behålla befintlig data.
7. Överför den signerade APK-filen till surfplattan och installera den. Android kan kräva tillåtelse för installation från den valda filhanteraren. Google Play behövs inte för egen installation; organisationens enhetspolicy kan styra hur appar distribueras.

Efter kodändringar höjer du `versionCode` i `android/app/build.gradle`, bygger och signerar med samma nyckel. Ta en säkerhetskopia före uppdatering. Byggprocessen kopierar automatiskt den aktuella `web`-mappen till APK:n.

Det har **inte byggts någon APK i den här miljön**, eftersom Android SDK och en kompatibel bygg-JDK saknas. GitHubbygget behöver köras efter att de två signeringshemligheterna lagts in. Androidprojektets manifest och resurs-XML har kontrollerats, men den signerade APK:n behöver verifieras på surfplattan.

En alternativ installationsväg är att lägga webbversionen på en HTTPS-adress och installera den som webbapp i Chrome på Android. Elevuppgifterna lagras då fortfarande lokalt, men appfilerna hämtas från den adressen första gången. Ingen sådan publicering har gjorts. För önskemålet om en helt lokalt paketerad app är Androidprojektet den förberedda vägen.

Officiell dokumentation: [Lokalt innehåll i Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [Bygg och kör en Androidapp](https://developer.android.com/studio/run), [Signerad APK](https://developer.android.com/build/build-for-release), [Lokal lagring för webbappar](https://web.dev/learn/pwa/offline-data).

## Kontroller och utveckling

Appens webbdel har inga npm-beroenden och behöver inget byggsteg. Kör `node --test tests/model.test.mjs` från projektmappen för regler, sortering, historik, exporturval och backupvalidering. Testsviten skapar en liten provfil för Excel-kontroll i `work/qa` relativt arbetsytan.

Den här versionen har 29 godkända automatiska kontroller. En exporterad arbetsbok har dessutom öppnats med openpyxl för kontroll av svenska tecken, numeriska minuter, textceller, filter och låst rubrikrad. Gränssnittet för namnimport har provats i den lokala förhandsvisningen. Se `VERIFIERING.md` för genomförda kontroller och kvarvarande Androidkontroller.

Källor: `web/app.js` innehåller gränssnittet, `web/model.js` reglerna, `web/storage.js` lagringen och `web/xlsx.js` Excel-skrivaren. Ändra versionsnamnet i `web/sw.js` när cachade webbfiler uppdateras. Ingen förändring av service workern behövs för Android, där den inte registreras.
