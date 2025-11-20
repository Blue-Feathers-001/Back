import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MembershipPackage from '../models/MembershipPackage';
import User from '../models/User';

dotenv.config();

const packages = [
  {
    name: 'Basic - 1 Month',
    description: 'Perfect for beginners starting their fitness journey',
    durationMonths: 1,
    price: 1500,
    category: 'basic',
    features: [
      'Gym access during off-peak hours',
      'Basic equipment usage',
      'Locker facilities',
      'Free fitness assessment',
    ],
    discount: 0,
  },
  {
    name: 'Premium - 6 Months',
    description: 'Great value package for committed fitness enthusiasts',
    durationMonths: 6,
    price: 9000,
    category: 'premium',
    features: [
      '24/7 gym access',
      'All equipment & classes',
      'Personal trainer session/month',
      'Nutrition consultation',
      'Free gym merchandise',
      'Priority class booking',
    ],
    discount: 11,
  },
  {
    name: 'VIP - 1 Year',
    description: 'Ultimate fitness package with maximum savings',
    durationMonths: 12,
    price: 18000,
    category: 'vip',
    features: [
      'All Premium features',
      'Unlimited personal training',
      'Spa & sauna access',
      'Priority booking',
      'Guest passes (2/month)',
      'Nutrition & diet planning',
      'Exclusive VIP events access',
      'Free supplements starter pack',
    ],
    discount: 17,
  },
];

async function seedPackages() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('Admin user not found. Please create an admin user first.');
    }

    console.log(`Found admin user: ${admin.email}`);

    // Delete existing packages (optional - comment out if you want to keep existing ones)
    const deleteResult = await MembershipPackage.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing packages`);

    // Create new packages
    const createdPackages = [];
    for (const pkg of packages) {
      const newPackage = await MembershipPackage.create({
        ...pkg,
        createdBy: admin._id,
        isActive: true,
        currentMembers: 0,
      });
      createdPackages.push(newPackage);
      const finalPrice = newPackage.discount ? newPackage.price - (newPackage.price * newPackage.discount) / 100 : newPackage.price;
      console.log(`Created package: ${newPackage.name} - LKR ${finalPrice}`);
    }

    console.log(`\n✅ Successfully created ${createdPackages.length} packages!`);

    // Display summary
    console.log('\n📦 Package Summary:');
    createdPackages.forEach((pkg) => {
      const finalPrice = pkg.discount ? pkg.price - (pkg.price * pkg.discount) / 100 : pkg.price;
      const savings = pkg.discount ? ` (Save ${pkg.discount}% - LKR ${(pkg.price - finalPrice).toFixed(2)})` : '';
      console.log(`   - ${pkg.name}: LKR ${finalPrice.toFixed(2)}${savings}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('Error seeding packages:', error.message);
    process.exit(1);
  }
}

seedPackages();
