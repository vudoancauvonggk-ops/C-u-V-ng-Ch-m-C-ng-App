const { Paragraph, TextRun } = require('docx');

const p = new Paragraph({
  children: [new TextRun({ text: "Hello", italics: true })],
  spacing: { after: 300, before: 100 }
});

console.log("Valid docx v9 paragraph:", p);
