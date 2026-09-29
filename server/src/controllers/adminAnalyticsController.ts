import { AnalyticsEvent, Product } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const RANGE_DAYS: Record<string, number> = { '7': 7, '30': 30, '90': 90 };
const DEFAULT_RANGE = '30';

/** GET /api/admin/analytics?range=7|30|90 */
export const getAnalytics = asyncHandler(async (req: AuthRequest, res) => {
  const rangeParam = String(req.query.range ?? DEFAULT_RANGE);
  const days = RANGE_DAYS[rangeParam] ?? RANGE_DAYS[DEFAULT_RANGE];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const match = { createdAt: { $gte: since } };

  const [byType, topProducts, topPaths, topReferrers, totalEvents, productCount] =
    await Promise.all([
      AnalyticsEvent.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      // Resolve the product name so the dashboard reads naturally; products that
      // have since been deleted fall back to their stored slug.
      AnalyticsEvent.aggregate([
        { $match: { ...match, productSlug: { $ne: '' } } },
        { $group: { _id: '$productSlug', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'slug',
            as: 'product',
          },
        },
        {
          $project: {
            count: 1,
            name: { $ifNull: [{ $first: '$product.name' }, '$_id'] },
            exists: { $gt: [{ $size: '$product' }, 0] },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, type: 'page_view', path: { $ne: '' } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, referrer: { $ne: '' } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AnalyticsEvent.countDocuments(match),
      Product.countDocuments({ archived: false }),
    ]);

  const eventsByType: Record<string, number> = {};
  for (const row of byType) {
    eventsByType[row._id] = row.count;
  }

  res.json({
    range: { days, since },
    totals: {
      events: totalEvents,
      pageViews: eventsByType['page_view'] ?? 0,
      productViews: eventsByType['product_view'] ?? 0,
      whatsappClicks: eventsByType['whatsapp_click'] ?? 0,
      cartAdds: eventsByType['cart_add'] ?? 0,
      orderWhatsappClicks: eventsByType['order_whatsapp_click'] ?? 0,
    },
    topProducts,
    topPaths,
    topReferrers,
    productCount,
  });
});
