const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function generateInvoicePdf(invoice, items, student) {
  const invoicesDir = path.resolve(process.cwd(), "storage", "invoices");
  fs.mkdirSync(invoicesDir, { recursive: true });

  const fileName = `invoice_${invoice.id}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text("School Invoice", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice #: ${invoice.id}`);
  doc.text(`Student: ${student.first_name} ${student.last_name}`);
  doc.text(`Issue Date: ${invoice.issue_date}`);
  doc.text(`Due Date: ${invoice.due_date}`);
  doc.moveDown();

  doc.fontSize(12).text("Items:");
  items.forEach((item) => {
    doc.text(`- ${item.title}: $${Number(item.amount).toFixed(2)}`);
  });
  doc.moveDown();

  doc.fontSize(14).text(`Total: $${Number(invoice.total_amount).toFixed(2)}`);
  doc.end();

  return { fileName, filePath };
}

module.exports = { generateInvoicePdf };
