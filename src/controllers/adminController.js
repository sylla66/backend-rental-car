'use strict';

const { User, Vehicle, Booking, SaleOrder, Payment, Review } = require('../models');

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      totalVehicles,
      availableVehicles,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalSaleOrders,
      paidSaleOrders,
      totalReviews,
      // Revenus du mois en cours
      revenueThisMonth,
      // Revenus du mois dernier
      revenueLastMonth,
      // Réservations récentes
      recentBookings,
      // Véhicules les plus réservés
      topVehicles,
    ] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ isAvailable: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'cancelled' }),
      SaleOrder.countDocuments(),
      SaleOrder.countDocuments({ status: { $in: ['paid', 'shipped', 'delivered'] } }),
      Review.countDocuments(),

      // Revenus locations mois en cours
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            referenceModel: 'Booking',
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Revenus locations mois dernier
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            referenceModel: 'Booking',
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 5 réservations récentes
      Booking.find()
        .populate('userId', 'fullName email')
        .populate('vehicleId', 'brand model images')
        .sort({ createdAt: -1 })
        .limit(5),

      // Top 5 véhicules les plus réservés
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'pending'] } } },
        { $group: { _id: '$vehicleId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'vehicles',
            localField: '_id',
            foreignField: '_id',
            as: 'vehicle',
          },
        },
        { $unwind: '$vehicle' },
        {
          $project: {
            count: 1,
            'vehicle.brand': 1,
            'vehicle.model': 1,
            'vehicle.images': 1,
            'vehicle.dailyRate': 1,
          },
        },
      ]),
    ]);

    const revenueThisMonthTotal = revenueThisMonth[0]?.total || 0;
    const revenueLastMonthTotal = revenueLastMonth[0]?.total || 0;
    const revenueGrowth = revenueLastMonthTotal > 0
      ? Math.round(((revenueThisMonthTotal - revenueLastMonthTotal) / revenueLastMonthTotal) * 100)
      : null;

    return res.json({
      users: { total: totalUsers },
      vehicles: { total: totalVehicles, available: availableVehicles },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings,
      },
      saleOrders: { total: totalSaleOrders, paid: paidSaleOrders },
      reviews: { total: totalReviews },
      revenue: {
        thisMonth: revenueThisMonthTotal,
        lastMonth: revenueLastMonthTotal,
        growth: revenueGrowth,
      },
      recentBookings,
      topVehicles,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };