import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService } from '../notifications/mailer.service.js';

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface Block {
  kind: 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'hr';
  runs: Run[];
  align?: 'left' | 'center' | 'right' | 'justify';
  listPrefix?: string;
  indent?: number;
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'tr', 'table', 'section',
  'header', 'footer', 'blockquote', 'article', 'tbody', 'thead',
]);

// Turns letter HTML (from a LetterTemplate) into a real PDF with pdfkit,
// stores it on disk, reads it back for authenticated downloads, and emails
// it as an attachment through the organization's SMTP settings.
//
// Supported HTML: headings h1-h6, p/div, br, hr, b/strong, i/em, u,
// ul/ol/li, table rows (cells joined with spaces), text-align on blocks.
@Injectable()
export class LetterPdfService {
  private readonly logger = new Logger(LetterPdfService.name);

  constructor(private readonly mailerService: MailerService) {}

  private get baseDir(): string {
    return path.resolve(process.env.LETTER_STORAGE_DIR || path.join(process.cwd(), 'storage', 'letters'));
  }

  // ---------------------------------------------------------------------------
  // HTML -> blocks
  // ---------------------------------------------------------------------------

  private decodeEntities(s: string): string {
    return s
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  }

  // Standard PDF fonts only cover WinAnsi; replace what they cannot draw.
  private pdfSafe(s: string): string {
    return s
      .replace(/₹/g, 'Rs. ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF•]/g, '');
  }

  private parse(html: string): Block[] {
    const clean = (html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, '');

    const blocks: Block[] = [];
    let runs: Run[] = [];
    let kind: Block['kind'] = 'p';
    let align: Block['align'];
    let bold = 0;
    let italic = 0;
    let underline = 0;
    const lists: { type: 'ul' | 'ol'; n: number }[] = [];
    let listPrefix: string | undefined;
    let pendingBreak = false;

    const flush = () => {
      pendingBreak = false;
      const text = runs.map((r) => r.text).join('');
      if (text.trim().length > 0) {
        // trim leading/trailing whitespace of the block
        runs[0].text = runs[0].text.replace(/^\s+/, '');
        runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
        blocks.push({ kind, runs: runs.filter((r) => r.text.length > 0), align, listPrefix, indent: lists.length });
      }
      runs = [];
      kind = 'p';
      align = undefined;
      listPrefix = undefined;
    };

    const tokenRe = /<\s*(\/)?\s*([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(clean)) !== null) {
      const [, closing, rawTag, attrs, text] = m;
      if (text !== undefined) {
        let t = this.decodeEntities(text).replace(/\s+/g, ' ');
        if (pendingBreak && runs.length) {
          t = '\n' + t.replace(/^\s+/, '');
        }
        pendingBreak = false;
        if (t.length) runs.push({ text: t, bold: bold > 0, italic: italic > 0, underline: underline > 0 });
        continue;
      }
      const tag = rawTag.toLowerCase();
      const isClose = !!closing;

      if (tag === 'br') {
        // A line break starts the next run on a new line.
        pendingBreak = true;
        continue;
      }
      if (tag === 'hr') {
        flush();
        blocks.push({ kind: 'hr', runs: [] });
        continue;
      }
      if (tag === 'b' || tag === 'strong') { bold += isClose ? -1 : 1; bold = Math.max(0, bold); continue; }
      if (tag === 'i' || tag === 'em') { italic += isClose ? -1 : 1; italic = Math.max(0, italic); continue; }
      if (tag === 'u') { underline += isClose ? -1 : 1; underline = Math.max(0, underline); continue; }
      if (tag === 'td' || tag === 'th') {
        if (isClose) runs.push({ text: '   ', bold: false, italic: false, underline: false });
        continue;
      }

      if (BLOCK_TAGS.has(tag)) {
        flush();
        if (tag === 'ul' || tag === 'ol') {
          if (isClose) lists.pop();
          else lists.push({ type: tag, n: 0 });
          continue;
        }
        if (!isClose) {
          if (tag === 'h1') kind = 'h1';
          else if (tag === 'h2') kind = 'h2';
          else if (/^h[3-6]$/.test(tag)) kind = 'h3';
          else if (tag === 'li') {
            kind = 'li';
            const list = lists[lists.length - 1];
            if (list) {
              list.n += 1;
              listPrefix = list.type === 'ol' ? `${list.n}. ` : '• ';
            } else {
              listPrefix = '• ';
            }
          }
          const alignMatch = /text-align\s*:\s*(left|center|right|justify)/i.exec(attrs || '')
            || /align\s*=\s*["']?(left|center|right|justify)/i.exec(attrs || '');
          if (alignMatch) align = alignMatch[1].toLowerCase() as Block['align'];
        }
      }
    }
    flush();
    return blocks;
  }

  // ---------------------------------------------------------------------------
  // PDF rendering
  // ---------------------------------------------------------------------------

  async renderPdf(html: string, opts: { title: string; organizationName?: string | null }): Promise<Buffer> {
    const blocks = this.parse(html);
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: opts.title } });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    if (opts.organizationName) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827')
        .text(this.pdfSafe(opts.organizationName), { align: 'center', width });
      doc.moveDown(0.3);
      const y = doc.y;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + width, y).lineWidth(1).strokeColor('#111827').stroke();
      doc.moveDown(1);
    }

    const sizes: Record<string, number> = { h1: 18, h2: 15, h3: 13, p: 11, li: 11 };

    for (const block of blocks) {
      if (block.kind === 'hr') {
        doc.moveDown(0.4);
        const y = doc.y;
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + width, y).lineWidth(0.5).strokeColor('#9ca3af').stroke();
        doc.moveDown(0.6);
        continue;
      }
      const size = sizes[block.kind] ?? 11;
      const isHeading = block.kind.startsWith('h');
      const indent = block.kind === 'li' ? 14 * Math.max(1, block.indent || 1) : 0;
      const runs = block.listPrefix
        ? [{ text: block.listPrefix, bold: false, italic: false, underline: false }, ...block.runs]
        : block.runs;

      doc.fillColor('#111827');
      runs.forEach((run, idx) => {
        const b = run.bold || isHeading;
        const font = b && run.italic ? 'Helvetica-BoldOblique' : b ? 'Helvetica-Bold' : run.italic ? 'Helvetica-Oblique' : 'Helvetica';
        doc.font(font).fontSize(size);
        const options: PDFKit.Mixins.TextOptions = {
          continued: idx < runs.length - 1,
          underline: run.underline,
          align: block.align ?? (isHeading ? 'left' : 'left'),
          lineGap: 2,
        };
        if (idx === 0) {
          options.width = width - indent;
          (options as any).indent = 0;
        }
        if (idx === 0 && indent) {
          doc.text(this.pdfSafe(run.text), doc.page.margins.left + indent, doc.y, options);
        } else {
          doc.text(this.pdfSafe(run.text), options);
        }
      });
      doc.x = doc.page.margins.left;
      doc.moveDown(block.kind === 'li' ? 0.2 : isHeading ? 0.5 : 0.7);
    }

    doc.end();
    return done;
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  // Saves the PDF and returns the storage path relative to the base folder.
  async save(organizationId: string, kind: string, id: string, pdf: Buffer): Promise<string> {
    const rel = path.join(organizationId, `${kind}-${id}-${Date.now()}.pdf`);
    const abs = path.join(this.baseDir, rel);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, pdf);
    return rel.split(path.sep).join('/');
  }

  async read(relPath: string | null | undefined): Promise<Buffer> {
    if (!relPath) throw new NotFoundException('No PDF has been generated yet.');
    const abs = path.resolve(this.baseDir, relPath);
    if (!abs.startsWith(this.baseDir + path.sep)) {
      throw new NotFoundException('PDF not found.');
    }
    try {
      return await fs.promises.readFile(abs);
    } catch {
      throw new NotFoundException('The PDF file could not be found on the server. Generate it again.');
    }
  }

  // ---------------------------------------------------------------------------
  // Email with attachment (uses the org's SMTP settings via MailerService).
  // Never throws: returns false when sending fails.
  // ---------------------------------------------------------------------------
  async sendWithAttachment(options: {
    organizationId: string;
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer }[];
  }): Promise<boolean> {
    if (!options.to) {
      this.logger.warn(`No recipient email for "${options.subject}" — not sent.`);
      return false;
    }
    try {
      const { transporter, fromEmail, fromName } = await this.mailerService.getTransporterForOrg(options.organizationId);
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: (options.attachments || []).map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: 'application/pdf',
        })),
      });
      this.logger.log(`Letter email "${options.subject}" sent to ${options.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send letter email to ${options.to}: ${err?.message || err}`);
      return false;
    }
  }
}
