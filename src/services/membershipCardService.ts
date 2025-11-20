import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createCanvas, loadImage, registerFont } from 'canvas';

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

      // Embed avatar if available
      if (userData.avatar) {
        try {
          // Fetch avatar image
          const response = await fetch(userData.avatar);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Embed the image
          doc.image(buffer, photoX, photoY, {
            width: photoSize,
            height: photoSize,
            fit: [photoSize, photoSize],
            align: 'center',
            valign: 'center',
          });
        } catch (error) {
          console.error('Failed to fetch avatar:', error);
          // Fallback to placeholder if image fetch fails
          doc.fontSize(40)
            .fillColor('#9CA3AF')
            .text('👤', photoX + 25, photoY + 20);
        }
      } else {
        // Show placeholder icon if no avatar
        doc.fontSize(40)
          .fillColor('#9CA3AF')
          .text('👤', photoX + 25, photoY + 20);
      }

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

export const generateMembershipCardPNG = async (userData: CardData): Promise<Buffer> => {
  // Canvas dimensions (2x credit card size for quality: 970x612px)
  const width = 970;
  const height = 612;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Purple gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#7C3AED'); // primary-600
  gradient.addColorStop(1, '#5B21B6'); // primary-700
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles (semi-transparent white)
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(800, 100, 200, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(100, 500, 160, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  // White rounded container
  const padding = 40;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, padding, padding, width - padding * 2, height - padding * 2, 30);
  ctx.fill();

  // Gym name header
  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('BLUE FEATHERS GYM', 60, 100);

  ctx.fillStyle = '#6B7280';
  ctx.font = '20px Arial';
  ctx.fillText('Membership Card', 60, 135);

  // Divider line
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 165);
  ctx.lineTo(910, 165);
  ctx.stroke();

  // Member photo
  const photoX = 80;
  const photoY = 200;
  const photoSize = 180;

  // Photo border (purple)
  ctx.fillStyle = '#7C3AED';
  roundRect(ctx, photoX - 4, photoY - 4, photoSize + 8, photoSize + 8, 16);
  ctx.fill();

  // Photo background (gray)
  ctx.fillStyle = '#F3F4F6';
  roundRect(ctx, photoX, photoY, photoSize, photoSize, 12);
  ctx.fill();

  // Load and draw avatar if available
  if (userData.avatar) {
    try {
      const avatarImage = await loadImage(userData.avatar);
      ctx.save();
      roundRect(ctx, photoX, photoY, photoSize, photoSize, 12);
      ctx.clip();
      ctx.drawImage(avatarImage, photoX, photoY, photoSize, photoSize);
      ctx.restore();
    } catch (error) {
      console.error('Failed to load avatar for PNG:', error);
      // Draw placeholder
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '80px Arial';
      ctx.fillText('👤', photoX + 50, photoY + 120);
    }
  } else {
    // Draw placeholder
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '80px Arial';
    ctx.fillText('👤', photoX + 50, photoY + 120);
  }

  // Member information
  const infoX = 300;
  let infoY = 210;

  // Member name
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(userData.name.toUpperCase(), infoX, infoY);

  infoY += 50;

  // Member ID
  ctx.fillStyle = '#6B7280';
  ctx.font = '20px Arial';
  ctx.fillText('Member ID:', infoX, infoY);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(userData.membershipId, infoX + 140, infoY);

  infoY += 50;

  // Plan
  ctx.fillStyle = '#6B7280';
  ctx.font = '20px Arial';
  ctx.fillText('Plan:', infoX, infoY);

  const planColor = userData.membershipStatus === 'active' ? '#10B981' : '#EF4444';
  ctx.fillStyle = planColor;
  ctx.font = 'bold 22px Arial';
  ctx.fillText((userData.membershipPlan || 'NONE').toUpperCase(), infoX + 140, infoY);

  infoY += 50;

  // Valid until
  ctx.fillStyle = '#6B7280';
  ctx.font = '20px Arial';
  ctx.fillText('Valid Until:', infoX, infoY);

  const expiryText = userData.membershipEndDate
    ? new Date(userData.membershipEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(expiryText, infoX + 140, infoY);

  infoY += 50;

  // Status badge
  const statusColor = userData.membershipStatus === 'active' ? '#10B981' : '#EF4444';
  const statusBg = userData.membershipStatus === 'active' ? '#D1FAE5' : '#FEE2E2';

  ctx.fillStyle = statusBg;
  roundRect(ctx, infoX, infoY - 20, 160, 48, 8);
  ctx.fill();

  ctx.fillStyle = statusColor;
  ctx.font = 'bold 20px Arial';
  ctx.fillText(userData.membershipStatus.toUpperCase(), infoX + 16, infoY + 5);

  // QR Code (right side)
  const qrX = 710;
  const qrY = 190;
  const qrSize = 200;

  // QR Code border/background
  ctx.fillStyle = '#F3F4F6';
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
  ctx.fill();
  ctx.stroke();

  // Generate and embed QR code
  const qrData = JSON.stringify({
    userId: userData.userId,
    membershipId: userData.membershipId,
    status: userData.membershipStatus,
    expiry: userData.membershipEndDate,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    width: qrSize,
    margin: 1,
  });

  const qrImage = await loadImage(qrCodeDataUrl);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#6B7280';
  ctx.font = '16px Arial';
  ctx.fillText('SCAN TO ENTER', qrX + 35, qrY + qrSize + 25);

  // Footer
  const footerY = 520;

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '16px Arial';
  ctx.fillText('Emergency Contact: ' + userData.phone, 60, footerY);

  ctx.fillStyle = '#D1D5DB';
  ctx.font = '14px Arial';
  ctx.fillText('This card is non-transferable • Report if lost', 60, footerY + 30);

  // Member since
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '16px Arial';
  const memberSince =
    'Member Since: ' +
    new Date(userData.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  const textWidth = ctx.measureText(memberSince).width;
  ctx.fillText(memberSince, width - textWidth - 60, footerY);

  return canvas.toBuffer('image/png');
};

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
