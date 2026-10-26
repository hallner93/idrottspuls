# Bygg och installera Idrottspuls 1.3.4

Den signerade Androidappen byggs i GitHub Actions. Appen fungerar offline och elevuppgifterna lagras lokalt på surfplattan.

## Bygg en ny APK

1. Säkerställ att ändringen är inlagd på GitHubs `main`-gren.
2. Öppna repot och välj **Actions → Bygg Idrottspuls**.
3. Välj **Run workflow**, välj grenen **main** och starta bygget.
4. När körningen är grön öppnar du den och hämtar **Idrottspuls-Android-[nummer]** under **Artifacts**.
5. Packa upp resultatet. Installationsfilen heter `Idrottspuls.apk`. ZIP-filen innehåller även en kort installationsanvisning och kontrollsumma.

Bygget kör automatiskt regressionstesterna innan det signerar och verifierar APK-filen. Det behöver de befintliga GitHub Actions-hemligheterna `IDROTTSPULS_KEYSTORE_BASE64` och `IDROTTSPULS_KEYSTORE_PASSWORD`. Om de redan finns behöver du inte ändra dem. Om körningen säger att en hemlighet saknas lägger du in den under **Settings → Secrets and variables → Actions**. Signeringsnyckeln och lösenordet ska aldrig läggas i repot.

## Uppdatera appen på surfplattan

Behåll appen installerad och öppna APK-filen på surfplattan. Version 1.3.4 använder samma app-id, `se.idrottspuls.app`, och den permanenta signeringsnyckeln. Android installerar den som en uppdatering och behåller då appens lokalt sparade uppgifter. Avinstallera inte appen och välj inte **Rensa lagring**.

Skapa gärna en säkerhetskopia i **Export & backup → Skapa säkerhetskopia** före större uppdateringar och kontrollera efter installationen att dina klasser och lektioner finns kvar. Säkerhetskopian innehåller elevuppgifter; välj en lagringsplats som skolan godkänner.

## Om bygget misslyckas

Öppna det röda steget i Actions-körningen och läs felmeddelandet. Om bygget saknar signeringsnyckel behöver de två Actions-hemligheterna läggas in. Dela aldrig hemligheternas innehåll eller elevuppgifter i en felrapport.

Byggresultatet sparas i GitHub i sju dagar. En redan installerad app påverkas inte när byggresultatet tas bort.
