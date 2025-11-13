import { Request, Response } from 'express';
import MembershipPackage from '../models/MembershipPackage';
import User from '../models/User';

// @desc    Get all membership packages
// @route   GET /api/packages
// @access  Public
export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const { active, category } = req.query;

    // Build query
    const query: any = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    if (category) {
      query.category = category;
    }

    const packages = await MembershipPackage.find(query)
      .populate('createdBy', 'name email')
      .sort({ category: 1, price: 1 });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching packages',
      error: error.message,
    });
  }
};

// @desc    Get single package by ID
// @route   GET /api/packages/:id
// @access  Public
export const getPackageById = async (req: Request, res: Response) => {
  try {
    const package_ = await MembershipPackage.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    res.status(200).json({
      success: true,
      data: package_,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching package',
      error: error.message,
    });
  }
};

// @desc    Create new membership package
// @route   POST /api/packages
// @access  Admin only
export const createPackage = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      durationMonths,
      price,
      features,
      category,
      maxMembers,
      discount,
    } = req.body;

    // Validate required fields
    if (!name || !description || !durationMonths || !price || !features) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Create package
    const package_ = await MembershipPackage.create({
      name,
      description,
      durationMonths,
      price,
      features: Array.isArray(features) ? features : [features],
      category: category || 'custom',
      maxMembers,
      discount: discount || 0,
      createdBy: (req as any).user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: package_,
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating package',
      error: error.message,
    });
  }
};

// @desc    Update membership package
// @route   PUT /api/packages/:id
// @access  Admin only
export const updatePackage = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      durationMonths,
      price,
      features,
      isActive,
      category,
      maxMembers,
      discount,
    } = req.body;

    const package_ = await MembershipPackage.findById(req.params.id);

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Update fields if provided
    if (name) package_.name = name;
    if (description) package_.description = description;
    if (durationMonths) package_.durationMonths = durationMonths;
    if (price !== undefined) package_.price = price;
    if (features) package_.features = Array.isArray(features) ? features : [features];
    if (isActive !== undefined) package_.isActive = isActive;
    if (category) package_.category = category;
    if (maxMembers !== undefined) package_.maxMembers = maxMembers;
    if (discount !== undefined) package_.discount = discount;

    await package_.save();

    res.status(200).json({
      success: true,
      message: 'Package updated successfully',
      data: package_,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating package',
      error: error.message,
    });
  }
};

// @desc    Delete membership package
// @route   DELETE /api/packages/:id
// @access  Admin only
export const deletePackage = async (req: Request, res: Response) => {
  try {
    const package_ = await MembershipPackage.findById(req.params.id);

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Check if any users have this package
    const usersWithPackage = await User.countDocuments({
      membershipPackage: package_._id,
      membershipStatus: { $in: ['active', 'grace_period'] },
    });

    if (usersWithPackage > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete package. ${usersWithPackage} user(s) currently have this package. Consider deactivating instead.`,
      });
    }

    await MembershipPackage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting package',
      error: error.message,
    });
  }
};

// @desc    Toggle package active status
// @route   PATCH /api/packages/:id/toggle-active
// @access  Admin only
export const togglePackageActive = async (req: Request, res: Response) => {
  try {
    const package_ = await MembershipPackage.findById(req.params.id);

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    package_.isActive = !package_.isActive;
    await package_.save();

    res.status(200).json({
      success: true,
      message: `Package ${package_.isActive ? 'activated' : 'deactivated'} successfully`,
      data: package_,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error toggling package status',
      error: error.message,
    });
  }
};

// @desc    Get package statistics
// @route   GET /api/packages/:id/stats
// @access  Admin only
export const getPackageStats = async (req: Request, res: Response) => {
  try {
    const package_ = await MembershipPackage.findById(req.params.id);

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Count active members
    const activeMembers = await User.countDocuments({
      membershipPackage: package_._id,
      membershipStatus: 'active',
    });

    // Count members in grace period
    const gracePeriodMembers = await User.countDocuments({
      membershipPackage: package_._id,
      membershipStatus: 'grace_period',
    });

    // Count expired members
    const expiredMembers = await User.countDocuments({
      membershipPackage: package_._id,
      membershipStatus: 'expired',
    });

    res.status(200).json({
      success: true,
      data: {
        package: package_,
        stats: {
          activeMembers,
          gracePeriodMembers,
          expiredMembers,
          totalMembers: activeMembers + gracePeriodMembers + expiredMembers,
          availableSlots: package_.maxMembers
            ? package_.maxMembers - package_.currentMembers
            : null,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching package statistics',
      error: error.message,
    });
  }
};
