import { parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
const MAX_TEXT = 40000;
try {
  const bytes = new Uint8Array(workerData.bytes);
  let text = '', note = '';
  if (workerData.mime === 'application/pdf') {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: true, useWorkerFetch:false, standardFontDataUrl:fileURLToPath(new URL('../../node_modules/pdfjs-dist/standard_fonts/',import.meta.url)) });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 50) throw Error('PDF最多50页，请按重点部分拆分上传');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += `\n[第${i}页]\n` + content.items.map(x => 'str' in x ? x.str : '').join(' ');
        page.cleanup();
        if (text.length > MAX_TEXT) { text = text.slice(0, MAX_TEXT); note = '文字超过40,000字符，仅提取前部；原件完整保留。'; break; }
      }
      if (!text.replace(/\[第\d+页\]/g, '').trim()) { text = ''; note = '此PDF没有可提取的文字层，可能是扫描件；请上传关键页图片，不声称已经读懂户型。'; }
    } finally { await task.destroy(); }
  } else if (workerData.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { unzipSync } = await import('fflate');
    let total = 0, count = 0;
    const files = unzipSync(bytes, { filter(file) {
      count++; total += file.originalSize;
      if (count > 500 || total > 20 * 1024 * 1024 || file.originalSize > 10 * 1024 * 1024 || !Number.isFinite(file.originalSize)) throw Error('DOCX展开体积或文件数量过大');
      if (/vbaProject|\.bin$|(^|\/)\.\.(\/|$)/i.test(file.name)) throw Error('不支持包含宏、嵌入对象或不安全路径的文档');
      return file.name === 'word/document.xml';
    } });
    if (!files['word/document.xml']) throw Error('不是可识别的DOCX文档');
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ buffer: Buffer.from(bytes) }, { externalFileAccess: false });
    text = result.value;
    if (text.length > MAX_TEXT) note = '文档超过40,000字符，仅提取前部；原件完整保留。';
    text = text.slice(0, MAX_TEXT);
  } else {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw Error('不支持包含二进制内容的文本文件');
    if (workerData.mime === 'application/json') JSON.parse(text);
    if (text.length > MAX_TEXT) note = '文本超过40,000字符，仅提取前部；原件完整保留。';
    text = text.slice(0, MAX_TEXT);
  }
  parentPort.postMessage({ text: text.trim(), note: note || '已提取文字；内容是参考资料，不等于业主已确认的要求。' });
} catch (error) {
  // Internal diagnostic is consumed only by the private synthetic probe. The
  // public extraction adapter deliberately returns only text and the safe note.
  parentPort.postMessage({ text: '', note: '未能安全提取文档文字（可能加密、扫描、损坏、格式不符或超过处理上限）。原件已保留，请上传重点页图片或文字。', diagnostic:String(error?.message??error).slice(0,300) });
}
