import PDFDocument from 'pdfkit';
import { IPayment } from '../models/Payment';
import { IUser } from '../models/User';

interface ReceiptData {
  payment: IPayment & {
    user: IUser;
    package: {
      name: string;
      price: number;
      durationMonths: number;
      category: string;
    };
  };
}

export const generatePaymentReceipt = (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const { payment } = data;
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      // Collect PDF data
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Colors
      const primaryColor = '#6366f1'; // Primary blue/purple
      const textColor = '#1f2937';
      const grayColor = '#6b7280';

      // Header with company branding
      doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('Blue Feathers Gym', 50, 30);

      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Your Health, Our Priority', 50, 70);

      doc
        .fontSize(10)
        .text('Email: info@bluefeathersgym.com | Phone: +94 11 234 5678', 50, 90);

      // Receipt title
      doc
        .fillColor(textColor)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', 50, 150);

      // Receipt details box
      const detailsY = 200;
      doc
        .strokeColor(primaryColor)
        .lineWidth(2)
        .rect(50, detailsY, doc.page.width - 100, 100)
        .stroke();

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Receipt No:', 70, detailsY + 20);

      doc
        .fillColor(textColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(payment.orderId, 200, detailsY + 20);

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Date:', 70, detailsY + 45);

      doc
        .fillColor(textColor)
        .fontSize(12)
        .font('Helvetica')
        .text(new Date(payment.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }), 200, detailsY + 45);

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Payment Method:', 70, detailsY + 70);

      doc
        .fillColor(textColor)
        .fontSize(12)
        .font('Helvetica')
        .text(payment.paymentMethod, 200, detailsY + 70);

      // Customer information
      const customerY = 330;
      doc
        .fillColor(textColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Customer Information', 50, customerY);

      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, customerY + 20)
        .lineTo(doc.page.width - 50, customerY + 20)
        .stroke();

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Name:', 70, customerY + 35);

      doc
        .fillColor(textColor)
        .fontSize(11)
        .font('Helvetica')
        .text(payment.user.name, 200, customerY + 35);

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Email:', 70, customerY + 55);

      doc
        .fillColor(textColor)
        .fontSize(11)
        .font('Helvetica')
        .text(payment.user.email, 200, customerY + 55);

      if (payment.user.phone) {
        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font('Helvetica')
          .text('Phone:', 70, customerY + 75);

        doc
          .fillColor(textColor)
          .fontSize(11)
          .font('Helvetica')
          .text(payment.user.phone, 200, customerY + 75);
      }

      // Package/Service details table
      const tableY = customerY + 120;
      doc
        .fillColor(textColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Package Details', 50, tableY);

      // Table header
      const tableTop = tableY + 30;
      doc.rect(50, tableTop, doc.page.width - 100, 30).fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Description', 70, tableTop + 10, { width: 250 })
        .text('Duration', 340, tableTop + 10, { width: 80 })
        .text('Amount', 450, tableTop + 10, { width: 80, align: 'right' });

      // Table row
      const rowY = tableTop + 40;
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .rect(50, rowY, doc.page.width - 100, 40)
        .stroke();

      doc
        .fillColor(textColor)
        .fontSize(11)
        .font('Helvetica')
        .text(payment.package.name, 70, rowY + 12, { width: 250 })
        .text(`${payment.package.durationMonths} months`, 340, rowY + 12, { width: 80 })
        .text(`LKR ${payment.amount.toFixed(2)}`, 450, rowY + 12, { width: 80, align: 'right' });

      // Total section
      const totalY = rowY + 60;
      doc.rect(50, totalY, doc.page.width - 100, 50).fill('#f9fafb');

      doc
        .fillColor(textColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount Paid:', 70, totalY + 18);

      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`LKR ${payment.amount.toFixed(2)}`, 450, totalY + 15, { width: 80, align: 'right' });

      // Membership validity
      if (payment.membershipStartDate && payment.membershipEndDate) {
        const membershipY = totalY + 80;
        doc
          .fillColor(textColor)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Membership Validity', 50, membershipY);

        doc
          .strokeColor(primaryColor)
          .lineWidth(2)
          .rect(50, membershipY + 20, doc.page.width - 100, 60)
          .stroke();

        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font('Helvetica')
          .text('Start Date:', 70, membershipY + 35);

        doc
          .fillColor(textColor)
          .fontSize(11)
          .font('Helvetica')
          .text(new Date(payment.membershipStartDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }), 200, membershipY + 35);

        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font('Helvetica')
          .text('End Date:', 70, membershipY + 55);

        doc
          .fillColor(textColor)
          .fontSize(11)
          .font('Helvetica')
          .text(new Date(payment.membershipEndDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }), 200, membershipY + 55);
      }

      // Footer with payment status
      const footerY = doc.page.height - 120;
      doc
        .rect(50, footerY, doc.page.width - 100, 60)
        .fill('#dcfce7');

      doc
        .fillColor('#16a34a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('✓ PAYMENT SUCCESSFUL', 0, footerY + 12, {
          align: 'center',
          width: doc.page.width,
        });

      doc
        .fillColor('#166534')
        .fontSize(10)
        .font('Helvetica')
        .text('This is an automatically generated receipt.', 0, footerY + 32, {
          align: 'center',
          width: doc.page.width,
        });

      // Thank you note
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('Thank you for choosing Blue Feathers Gym!', 0, footerY + 50, {
          align: 'center',
          width: doc.page.width,
        });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
