# Verifiering av Idrottspuls 1.0

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
