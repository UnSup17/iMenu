const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');

async function testPdfRender() {
  console.log('Generating dummy PDF using puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // 1. Create a 2-page PDF
  const page1 = await browser.newPage();
  await page1.setContent(`
    <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #09090b; color: #f59e0b; font-family: sans-serif;">
      <h1>iMenu Demo Menu - Page 1</h1>
      <p style="color: #a1a1aa;">Special Burger - $25.000</p>
    </div>
    <div style="page-break-before: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #09090b; color: #10b981; font-family: sans-serif;">
      <h1>iMenu Demo Menu - Page 2</h1>
      <p style="color: #a1a1aa;">Craft Beer - $12.000</p>
    </div>
  `);
  const pdfBuffer = await page1.pdf({ format: 'A4', printBackground: true });
  await page1.close();
  console.log(`Dummy PDF created: ${pdfBuffer.length} bytes`);

  // 2. Render each page using pdf.js inside puppeteer
  const page2 = await browser.newPage();
  await page2.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        let pdfDoc = null;
        window.loadPdf = async function(uint8Arr) {
          const uint8 = new Uint8Array(uint8Arr);
          pdfDoc = await pdfjsLib.getDocument({ data: uint8 }).promise;
          return pdfDoc.numPages;
        };

        window.renderPage = async function(pageNum) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          return canvas.toDataURL('image/jpeg', 0.9);
        };
      </script>
    </body>
    </html>
  `);

  const numPages = await page2.evaluate(async (arr) => {
    return await window.loadPdf(arr);
  }, Array.from(pdfBuffer));

  console.log(`PDF loaded with ${numPages} pages.`);

  for (let i = 1; i <= numPages; i++) {
    const dataUrl = await page2.evaluate(async (p) => {
      return await window.renderPage(p);
    }, i);

    const base64Content = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const imgBuffer = Buffer.from(base64Content, 'base64');
    
    // Compress with sharp to WebP
    const webpBuffer = await sharp(imgBuffer)
      .webp({ quality: 85 })
      .toBuffer();

    console.log(`Page ${i} converted to WebP: ${webpBuffer.length} bytes (compressed from ${imgBuffer.length} bytes)`);
  }

  await browser.close();
  console.log('✅ Conversion test passed cleanly!');
}

testPdfRender().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
