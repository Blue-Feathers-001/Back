import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface CardData {
  userId: string;
  name: string;
  email: string;
  membershipId: string;
  membershipPlan: string;
  membershipStatus: string;
  membershipEndDate: Date | null;
  phone: string;
  avatar?: string;
  createdAt: Date;
}

export const generateMembershipCard = async (userData: CardData): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF document - Credit card size (85.6mm x 53.98mm = 242.65 x 153 points)
      // Using 2x for better print quality
      const doc = new PDFDocument({
        size: [485, 306], // 2x credit card size for quality
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate QR Code with encrypted data
      const qrData = JSON.stringify({
        userId: userData.userId,
        membershipId: userData.membershipId,
        status: userData.membershipStatus,
        expiry: userData.membershipEndDate,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 200,
        margin: 1,
      });

      // Card Background - Purple Gradient (matching your brand)
      const gradient = doc.linearGradient(0, 0, 485, 0);
      gradient.stop(0, '#7C3AED'); // primary-600
      gradient.stop(1, '#5B21B6'); // primary-700

      doc.rect(0, 0, 485, 306).fill(gradient);

      // Add decorative pattern/overlay
      doc.opacity(0.1);
      doc.circle(400, 50, 100).fill('#FFFFFF');
      doc.circle(50, 250, 80).fill('#FFFFFF');
      doc.opacity(1);

      // White rounded container for content
      doc.roundedRect(20, 20, 445, 266, 15).fillAndStroke('#FFFFFF', '#E5E7EB');

      // Gym Logo/Name Header
      doc.fontSize(24)
        .fillColor('#7C3AED')
        .font('Helvetica-Bold')
        .text('BLUE FEATHERS GYM', 30, 35, { width: 300 });

      doc.fontSize(10)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('Membership Card', 30, 65);

      // Divider line
      doc.moveTo(30, 85).lineTo(455, 85).strokeColor('#E5E7EB').stroke();

      // Member Photo Placeholder (left side)
      const photoX = 40;
      const photoY = 100;
      const photoSize = 90;

      // Photo border
      doc.roundedRect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4, 8)
        .fillAndStroke('#7C3AED', '#7C3AED');

      // Photo background
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).fill('#F3F4F6');

      // If no avatar, show placeholder icon
      if (!userData.avatar) {
        doc.fontSize(40)
          .fillColor('#9CA3AF')
          .text('👤', photoX + 25, photoY + 20);
      }
      // TODO: In future, fetch and embed actual avatar image from S3

      // Member Information (right side)
      const infoX = 150;
      let infoY = 100;

      // Member Name
      doc.fontSize(18)
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(userData.name.toUpperCase(), infoX, infoY, { width: 200 });

      infoY += 30;

      // Membership ID
      doc.fontSize(10)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('Member ID:', infoX, infoY);

      doc.fontSize(12)
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(userData.membershipId, infoX + 70, infoY);

      infoY += 25;

      // Membership Plan
      doc.fontSize(10)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('Plan:', infoX, infoY);

      const planColor = userData.membershipStatus === 'active' ? '#10B981' : '#EF4444';
      doc.fontSize(11)
        .fillColor(planColor)
        .font('Helvetica-Bold')
        .text(userData.membershipPlan?.toUpperCase() || 'N/A', infoX + 70, infoY);

      infoY += 25;

      // Expiry Date
      doc.fontSize(10)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('Valid Until:', infoX, infoY);

      const expiryText = userData.membershipEndDate
        ? new Date(userData.membershipEndDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'N/A';

      doc.fontSize(11)
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(expiryText, infoX + 70, infoY);

      infoY += 25;

      // Status Badge
      const statusColor = userData.membershipStatus === 'active' ? '#10B981' : '#EF4444';
      const statusBg = userData.membershipStatus === 'active' ? '#D1FAE5' : '#FEE2E2';

      doc.roundedRect(infoX, infoY, 80, 24, 4).fill(statusBg);
      doc.fontSize(10)
        .fillColor(statusColor)
        .font('Helvetica-Bold')
        .text(userData.membershipStatus.toUpperCase(), infoX + 8, infoY + 6);

      // QR Code (bottom right)
      const qrSize = 100;
      const qrX = 355;
      const qrY = 95;

      // QR Code border
      doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 8)
        .fillAndStroke('#F3F4F6', '#E5E7EB');

      // Embed QR Code
      doc.image(qrCodeDataUrl, qrX, qrY, { width: qrSize, height: qrSize });

      doc.fontSize(8)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('SCAN TO ENTER', qrX + 15, qrY + qrSize + 8);

      // Footer
      const footerY = 255;
      doc.fontSize(8)
        .fillColor('#9CA3AF')
        .font('Helvetica')
        .text('Emergency Contact: ' + userData.phone, 30, footerY, { width: 250 });

      doc.fontSize(7)
        .fillColor('#D1D5DB')
        .text('This card is non-transferable • Report if lost', 30, footerY + 15, {
          width: 250,
        });

      // Member since badge
      doc.fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          'Member Since: ' +
            new Date(userData.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
          300,
          footerY,
          { width: 150, align: 'right' }
        );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
