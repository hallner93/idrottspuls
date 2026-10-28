# Verifiering av Idrottspuls

## Version 1.6.1 – kontrollerat den 28 oktober 2026

- Veckodagarnas lektionsantal visas som en tydligt avgränsad textetikett, inklusive singular och plural.
- Androidens versionName är 1.6.1 och versionCode 13. Service worker-cachen har höjts så webbversionen hämtar de uppdaterade filerna.
- Syntaxkontroll och samtliga 60 automatiska tester passerar. APK:n skapas via GitHub Actions efter merge till `main`.

## Version 1.6.0 – kontrollerat den 28 oktober 2026

- Regressionstester täcker terminsplaneringens Excelrader och lovmarkering samt att helgdagar inte visar schemalektioner och att observationsfokus följer med till en startad lektion.
- Terminsplaneringen kan exporteras till Excel för årskurs 7–9. Klasser har en periodstyrd klassrapport och Excel-export, terminsarkivet kan sökas och översikten visar lektionspass med saknade observationer.
- Schemalektioner har snabbval för tio aktivitetsområden och valfritt observationsfokus. Befintlig dataformatversion är oförändrad och de nya fälten är valfria så äldre elevdata fortsatt kan läsas.
- Androidens versionName är 1.6.0 och versionCode 12. APK:n byggs i GitHub Actions efter att ändringen har lagts på `main`; bygget använder de befintliga signeringshemligheterna.

## Version 1.5.1 – kontrollerat den 26 oktober 2026

- 50 automatiska tester passerar. Regressionstester täcker lokal datumväxling, fortsatt manuell navigering, återgång till Idag, temaval, offlinecache, en rad per elev, slutbedömningar i Excel och migration av äldre lokala data och att appstart inte skriver om hela lagringen.
- Slutbedömning sparas per lektion, visas som egen sammanställningskolumn och listas med datum och arbetsområde i elevhistoriken. Äldre lektioner migreras som ej markerade.
- Excel erbjuder en rad per elev med lektionsvärden i datumordning och radbrytningar, samt ett detaljformat med en rad per elev och lektion.
- Översikten uppdateras från enhetens lokala kalender vid öppning, återupptagning och lokal midnatt. Manuell navigering sätter ett läge som ligger kvar tills användaren väljer **Till idag**.
- Tio teman finns, inklusive originaltemat. Temavalet sparas i befintliga lokala inställningar och äldre data får originaltemat som standard.
- Lov och studiedagar använder oförändrade schemaregler. Appen gör inga nätverksanrop för datumväxlingen och ändrar inte elevuppgifter. Appen visar översikten före all sparning; den skriver inte om arbetsytan bara för att öppnas.
- Klasser kan sökas på klassnamn och aktiva elevnamn. Översikten ersätter volleybollplansbilden med oavslutade lektionspass som öppnas direkt för fortsatt dokumentation.
- Excelbladet har högre rubrikrad, radhöjd anpassad till radbrytningar, växlande radbakgrund och grön markering för slutbedömningar.
- Utvecklarens namn visas i inställningarna.
- Androidens versionName är 1.5.1 och versionCode 11. APK:n är inte byggd i denna miljö; GitHub Actions-bygget ska köras efter att uppdateringen är inlagd på main och kräver de två befintliga signeringshemligheterna.

## Version 1.3.1 – kontrollerat den 26 oktober 2026

- Översikten följer enhetens lokala datum offline. Tio teman finns och den nya datumfunktionen fungerar utan nätverksanrop.

## Version 1.2 – kontrollerat den 22 oktober 2026

- 29 automatiska tester passerar, inklusive nytt namnformat med ett helt namn per rad, två kolumner från Excel och felhantering för ofullständiga namn.
- Namnimportens förhandsgranskning provades i webbläsaren: tre namn lades in, ett sammansatt efternamn rättades i förhandsgranskningen, klassen sparades och eleverna fanns kvar efter omladdning.
- Androidprojektet är inställt för en signerad release med app-id `se.idrottspuls.app` och versionCode 3. Det manuella GitHubbygget använder samma permanenta nyckel för framtida uppdateringar. Nyckeln ligger utanför källkodspaketet.
- Den signerade APK:n är ännu inte byggd. GitHubbygget måste köras när de två hemligheterna har lagts in; installation, återställning av testappens backup och senare uppdatering behöver därefter kontrolleras på Android.

## Version 1.1 – kontrollerat den 22 oktober 2026

- 26 automatiska tester passerar. De omfattar flerval för omdömen, Okej, högst två betyg, bevarande av val när ett tredje betyg nekas, manuell uppföljning ihop med positiva val, F tillsammans med ett annat betyg, ett negativt tillfälle per lektion, sammanställning och Excel-export med alla val, äldre säkerhetskopior och migration av både egen lektionsbok och demodata.
- Frånvaro-, kläd- och skoprocent kontrolleras mot avslutade lektioner med bekräftad närvaro. Orapporterade utkast, framtida lektioner, pågående lektioner och lektioner utan eleven räknas bort. Utan underlag returneras inget procentvärde.
- Provat i webbläsarens faktiska gränssnitt med separat demodata: tre omdömen och två betyg valda samtidigt, tredje betyg nekat, avmarkering, sparning och omladdning. Elevruta, observationssammanställning och historik visar alla sparade val.
- Närvarosammanställningen visar 25 % vid en frånvaro av fyra rapporterade lektioner. Glömda kläder och skor visar också 25 % vid ett tillfälle av fyra.
- Observationsdialogen har granskats visuellt i smalt mobilläge. Både flervalsrutorna och två markerade betyg visas korrekt; dialogen går att rulla.
- Androids interna sparfunktion har uppdaterats för det nya dataformatet (version 2). Äldre format (version 1) kan fortfarande läsas in. Androidversionen har höjts till 1.1.0, versionCode 2.

Den tidigare testappen har enligt användaren byggts via GitHub och provats på mobilen. Närvaroregistreringen fungerar enligt användarens återkoppling. **Den nya versionen 1.1 är ännu inte byggd eller provad på Android i detta steg.** Android SDK och bygg-JDK saknas lokalt; nästa kontroll är det nya GitHubbygget och installation på enheten. Testsigneringen kan kräva byte av installation; säkerhetskopia krävs innan en eventuell avinstallation.

## Tidigare kontroller av version 1.0

Kontrollerat den 20 oktober 2026.

## Godkända kontroller

- JavaScriptfilerna passerar Node.js syntaxkontroll.
- 15 automatiska tester passerar för uppföljningsgräns, de fyra automatiska utlösarna, manuell markering, redigering utan dubbelräkning, avstådd observation, frånvaro, terminsgräns, genomförd uppföljning, svensk sortering, arkivering, bevarad schemalektionshistorik, närvaroberäkningar, exportfilter, backupvalidering och Excel-format.
- En genererad `.xlsx` har lästs med openpyxl. Svenska tecken, siffervärden, filter och låst rubrikrad bevaras. Text som börjar med `=` lagras som text och blir ingen Excel-formel.
- Androidmanifest och samtliga Androidresurser passerar XML-tolkning.
- Androidprojektets Gradle Wrapper finns med, hämtad från Gradles officiella v8.13.0-källa.

## Provat i det faktiska gränssnittet

- Översikt med tre schemalektioner och två elever markerade efter tre negativa tillfällen.
- Start av lektion, registrering av frånvaro, glömda kläder och sju minuters sen ankomst.
- Sparad närvaro öppnar observationssteget; frånvarande elev är inaktiv.
- Observationen Mycket bra, lektionsbedömningen B och en anteckning sparas och visas på elevrutan.
- Observationen finns kvar efter att sidan laddats om.
- Avstådd observation inaktiverar elevrutorna; avmarkering åter visar den bevarade observationen.
- Excel-export skapas från exportvyn.
- Säkerhetskopia skapas från gränssnittet, och datumet uppdateras.
- Val av en giltig backup visar en sammanfattning före ersättning. Bekräftad återställning återför de fiktiva uppgifterna och visar rätt antal klasser och lektioner.
- Efter att den lokala webbservern stängts av har appen laddats om framgångsrikt från offlinecachen. Klasslistor, schema och uppföljningar finns kvar.
- Layouten har visuellt granskats i den smala förhandsvisningen. CSS innehåller separata anpassningar för större surfplattor och stående läge.

## Återstår att verifiera på Android

Android SDK och en kompatibel bygg-JDK finns inte i arbetsmiljön. Någon APK har därför inte byggts eller installerats. Följande kräver Android Studio och surfplattan:

- Att Gradlebygget lyckas och att appen installeras och startar.
- Nativebryggans interna atomiska fillagring, inklusive omstart av app och enhet.
- Androids filväljare för Excel, säkerhetskopia och återställning.
- Stående/liggande läge, tangentbord, systemfält och tryckytor på den aktuella surfplattan.
- Användning i flygplansläge med samtliga appfiler paketerade.
- Signerad uppdatering med bibehållen lokal data.

För webbversionen är första offlineinstallationen beroende av att alla filer hämtas. Androidversionen registrerar inte service workern eftersom filerna ingår i APK:n.

## Förberett för GitHub den 21 oktober 2026

Ett manuellt GitHub Actions-bygge har lagts till. Det använder en standardmaskin med Ubuntu 24.04, Java 17, Android SDK 36, appens befintliga tester och Gradles `assembleDebug`. Resultatet ska bli en separat **Idrottspuls Test**-app. Bygget har en tidsgräns på 20 minuter och sparar APK-filen i sju dagar. De officiella GitHubstegen har låsts till verifierade versionsreferenser.

Byggfilen har lästs med en YAML-parser och samtliga shellsteg har passerat syntaxkontroll. Manuell start, rättigheter, byggmiljö, versionsreferenser, tidsgräns och lagringstid har kontrollerats. De 15 befintliga testerna passerar även efter förberedelsen. Androidmanifestet och resurserna passerar XML-kontrollen.

GitHubkontot behöver först vara klart och projektet uppladdat till ett privat kodarkiv. Ingen GitHubkörning eller APK har bekräftats i detta förberedelsesteg. En lyckad körning och provning på surfplattan återstår.
