// Small dependency-free Office Open XML writer. Inline strings cannot become formulas.
const enc = new TextEncoder();
const xml = value => String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const col = n => { let s = ''; do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
const table = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) crc = table[(crc ^ b) & 255] ^ crc >>> 8; return (crc ^ 0xffffffff) >>> 0; }
function zip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const filename = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const header = new Uint8Array(30 + filename.length); const v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, filename.length, true); header.set(filename, 30);
    const center = new Uint8Array(46 + filename.length), c = new DataView(center.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, filename.length, true); c.setUint32(42, offset, true); center.set(filename, 46);
    parts.push(header, data); central.push(center); offset += header.length + data.length;
  }
  const centralLength = central.reduce((s, a) => s + a.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, centralLength, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, end], result = new Uint8Array(all.reduce((n, p) => n + p.length, 0)); let position = 0;
  for (const p of all) { result.set(p, position); position += p.length; }
  return result;
}
export function createXlsx(rows, sheetName = 'Idrottspuls') {
  if (!rows.length || !rows[0].length) throw new Error('Välj minst en kolumn.');
  const headers = rows[0].map(String);
  const finalAssessmentColumn = headers.indexOf('Slutbedömning');
  const identityHeaders = ['Förnamn', 'Efternamn', 'Klass'];
  const frozenColumns = headers.findIndex(header => !identityHeaders.includes(header));
  const identitySplit = frozenColumns < 0 ? headers.length : frozenColumns;
  const pane = identitySplit
    ? `<pane xSplit="${identitySplit}" ySplit="1" topLeftCell="${col(identitySplit)}2" activePane="bottomRight" state="frozen"/>`
    : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>';
  const body = rows.map((row, r) => {
    const lineCount = r ? Math.max(1, ...row.map(cell => String(cell ?? '').split('\n').length)) : 1;
    const height = r ? Math.min(180, Math.max(22, lineCount * 15 + 5)) : 30;
    const cells = row.map((cell, c) => {
      const ref = `${col(c)}${r + 1}`, text = String(cell ?? ''), wrapped = text.includes('\n');
      const stripe = r > 0 && r % 2 === 0;
      const finalYes = r > 0 && c === finalAssessmentColumn && text === 'Ja';
      const style = r === 0 ? 1 : finalYes ? 5 : wrapped ? (stripe ? 3 : 2) : stripe ? 4 : 0;
      return typeof cell === 'number' && Number.isFinite(cell)
        ? `<c r="${ref}" s="${style}"><v>${cell}</v></c>`
        : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(text.slice(0,32767))}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}" ht="${height}" customHeight="1">${cells}</row>`;
  }).join('');
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><fonts count="3"><font><sz val="11"/><color rgb="FF26332D"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF24543F"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF36594B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F6F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F3EA"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill></fills><borders count="2"><border/><border><left style="hair"><color rgb="FFE2E8E2"/></left><right style="hair"><color rgb="FFE2E8E2"/></right><top style="hair"><color rgb="FFE2E8E2"/></top><bottom style="hair"><color rgb="FFE2E8E2"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><dimension ref="A1:${col(rows[0].length - 1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><cols>${rows[0].map((h, i) => `<col min="${i+1}" max="${i+1}" width="${Math.max(15, Math.min(36, String(h).length + 6))}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${col(rows[0].length - 1)}${rows.length}"/></worksheet>`,
  });
}
