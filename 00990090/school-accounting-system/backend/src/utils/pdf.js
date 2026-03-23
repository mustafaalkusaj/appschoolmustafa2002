// PDF generation utility
// Generates invoices and reports in PDF format

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF
 * @param {object} invoice - Invoice data
 * @param {object} student - Student information
 * @returns {Promise<string>} Path to generated PDF file
 */
const generateInvoicePDF = async (invoice, student) => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `invoice-${invoice.invoice_number}.pdf`);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('School Accounting Management System', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice details
      doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', { continued: true });
      doc.font('Helvetica').text(` ${invoice.invoice_number}`);
      
      doc.font('Helvetica-Bold').text('Invoice Date:', { continued: true });
      doc.font('Helvetica').text(` ${new Date(invoice.issue_date).toLocaleDateString()}`);
      
      doc.font('Helvetica-Bold').text('Due Date:', { continued: true });
      doc.font('Helvetica').text(` ${new Date(invoice.due_date).toLocaleDateString()}`);
      
      doc.moveDown(0.5);

      // Student information
      doc.fontSize(12).font('Helvetica-Bold').text('Student Information', { underline: true });
      doc.fontSize(10).font('Helvetica-Bold').text('Name:', { continued: true });
      doc.font('Helvetica').text(` ${student.first_name} ${student.last_name}`);
      
      doc.font('Helvetica-Bold').text('Admission Number:', { continued: true });
      doc.font('Helvetica').text(` ${student.admission_number}`);
      
      doc.font('Helvetica-Bold').text('Email:', { continued: true });
      doc.font('Helvetica').text(` ${student.email || 'N/A'}`);
      
      doc.moveDown(1);

      // Items table
      doc.fontSize(12).font('Helvetica-Bold').text('Items', { underline: true });
      doc.fontSize(10).font('Helvetica').text(invoice.items_description);
      
      doc.moveDown(1);

      // Amount
      doc.fontSize(12).font('Helvetica-Bold').text('Total Amount:', { continued: true });
      doc.font('Helvetica').text(` ${invoice.total_amount.toFixed(2)}`, { align: 'right' });
      
      doc.moveDown(1);

      // Status
      doc.fontSize(10).font('Helvetica-Bold').text('Status:', { continued: true });
      doc.font('Helvetica').text(` ${invoice.status.toUpperCase()}`);
      
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).font('Helvetica-Italic').text('Thank you for your payment!', { align: 'center' });
      doc.text('Generated on: ' + new Date().toLocaleDateString(), { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF
};
