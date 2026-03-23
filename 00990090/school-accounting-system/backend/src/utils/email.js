// Email utility functions
// Handles sending notifications and notifications

const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD
  }
});

/**
 * Send payment reminder email
 * @param {string} studentEmail - Student email address
 * @param {object} data - Email data
 */
const sendPaymentReminder = async (studentEmail, data) => {
  try {
    const mailOptions = {
      from: config.SMTP_FROM,
      to: studentEmail,
      subject: 'Payment Reminder - School Fees',
      html: `
        <h2>Payment Reminder</h2>
        <p>Dear Parent/Guardian,</p>
        <p>This is a reminder that your ward <strong>${data.studentName}</strong> from <strong>${data.className}</strong> has an outstanding fee.</p>
        <p><strong>Amount Due:</strong> ${data.amount}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
        <p>Please arrange payment at the earliest convenience.</p>
        <p>Contact the school office for payment details.</p>
        <p>Best regards,<br/>School Accounting Management System</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payment reminder sent to ${studentEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw - email is non-critical
  }
};

/**
 * Send payment received notification
 * @param {string} studentEmail - Student email address
 * @param {object} data - Email data
 */
const sendPaymentReceipt = async (studentEmail, data) => {
  try {
    const mailOptions = {
      from: config.SMTP_FROM,
      to: studentEmail,
      subject: 'Payment Received - School Fees',
      html: `
        <h2>Payment Confirmation</h2>
        <p>Dear Parent/Guardian,</p>
        <p>We have received your payment for <strong>${data.studentName}</strong> from <strong>${data.className}</strong>.</p>
        <p><strong>Receipt Number:</strong> ${data.receiptNumber}</p>
        <p><strong>Amount Paid:</strong> ${data.amount}</p>
        <p><strong>Payment Date:</strong> ${new Date(data.paymentDate).toLocaleDateString()}</p>
        <p>Thank you for your timely payment!</p>
        <p>Best regards,<br/>School Accounting Management System</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payment receipt sent to ${studentEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

/**
 * Send fee due notification
 * @param {string} parentEmail - Parent email address
 * @param {object} data - Email data
 */
const sendFeeDueNotification = async (parentEmail, data) => {
  try {
    const mailOptions = {
      from: config.SMTP_FROM,
      to: parentEmail,
      subject: 'Fee Due Notice - School Fees',
      html: `
        <h2>Fee Due Notice</h2>
        <p>Dear Parent/Guardian,</p>
        <p>This is to inform you that the school fees for <strong>${data.studentName}</strong> from <strong>${data.className}</strong> are due.</p>
        <p><strong>Amount Due:</strong> ${data.amount}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
        <p>Please complete the payment on or before the due date to avoid late fees.</p>
        <p>Best regards,<br/>School Accounting Management System</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Fee due notification sent to ${parentEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendPaymentReminder,
  sendPaymentReceipt,
  sendFeeDueNotification
};
