import {
  buildContentDisposition,
  buildDownloadFilename,
  sanitizeDownloadFilename,
} from './download-filename.util';

describe('sanitizeDownloadFilename', () => {
  it('leaves a normal title alone', () => {
    expect(sanitizeDownloadFilename('Annual Impact Report 2026')).toBe(
      'Annual Impact Report 2026',
    );
  });

  it('turns path separators into hyphens instead of dropping everything before them', () => {
    expect(sanitizeDownloadFilename('Q1/Q2 Report')).toBe('Q1-Q2 Report');
    expect(sanitizeDownloadFilename('C:\\Users\\report')).toBe(
      'C:-Users-report',
    );
  });

  it('collapses repeated whitespace and trims', () => {
    expect(sanitizeDownloadFilename('  a   b  ')).toBe('a b');
  });

  it('preserves non-ASCII characters — unlike the old Cloudinary-URL approach, the header can carry them', () => {
    expect(sanitizeDownloadFilename('التقرير السنوي')).toBe('التقرير السنوي');
  });

  it('falls back when nothing survives trimming', () => {
    expect(sanitizeDownloadFilename('   ')).toBe('download');
    expect(sanitizeDownloadFilename('', 'custom-fallback')).toBe(
      'custom-fallback',
    );
  });

  it('caps length', () => {
    expect(sanitizeDownloadFilename('a'.repeat(500)).length).toBe(150);
  });
});

describe('buildDownloadFilename', () => {
  it('appends the extension when given one', () => {
    expect(buildDownloadFilename('Annual Report', 'pdf')).toBe(
      'Annual Report.pdf',
    );
  });

  it('omits the extension when none is known', () => {
    expect(buildDownloadFilename('Annual Report', undefined)).toBe(
      'Annual Report',
    );
  });
});

describe('buildContentDisposition', () => {
  it('produces an attachment header with a plain ASCII filename in both parts', () => {
    const header = buildContentDisposition('Annual Report.pdf');
    expect(header).toBe(
      `attachment; filename="Annual Report.pdf"; filename*=UTF-8''Annual%20Report.pdf`,
    );
  });

  it('gives non-ASCII clients a working name via filename* while degrading the quoted fallback safely', () => {
    const header = buildContentDisposition('التقرير.pdf');
    expect(header).toContain('attachment; filename="_______.pdf"');
    expect(header).toContain(
      `filename*=UTF-8''%D8%A7%D9%84%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf`,
    );
  });

  it('neutralizes a literal double quote so it cannot close the quoted segment early', () => {
    const header = buildContentDisposition('Report".pdf');
    expect(header).toContain(`filename="Report'.pdf"`);
    // The header must still be exactly two attribute segments — a smuggled
    // quote can't inject a third.
    expect(header.split('; ')).toHaveLength(3);
  });

  it('never lets CR/LF reach the raw header value (header-injection defense)', () => {
    const header = buildContentDisposition('Evil\r\nSet-Cookie: x=y.pdf');
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
  });

  it('percent-encodes the RFC 5987 characters encodeURIComponent leaves unescaped', () => {
    const header = buildContentDisposition("a*b'c(d)e.pdf");
    expect(header).toContain(`filename*=UTF-8''a%2Ab%27c%28d%29e.pdf`);
  });
});
