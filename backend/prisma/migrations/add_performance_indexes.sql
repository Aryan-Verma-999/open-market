-- Performance optimization indexes for Equipment Marketplace

-- Listings table indexes for search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_status_active ON listings(status, "isActive") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_status ON listings("categoryId", status) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_seller_status ON listings("sellerId", status) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_location ON listings(city, state) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_price_range ON listings(price) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_condition ON listings(condition) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_created_desc ON listings("createdAt" DESC) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_views_desc ON listings(views DESC) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_saves_desc ON listings(saves DESC) WHERE "isActive" = true;

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_title_search ON listings USING gin(to_tsvector('english', title)) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_description_search ON listings USING gin(to_tsvector('english', description)) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_brand_model_search ON listings USING gin(to_tsvector('english', coalesce(brand, '') || ' ' || coalesce(model, ''))) WHERE "isActive" = true;

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_price_created ON listings("categoryId", price, "createdAt" DESC) WHERE "isActive" = true AND status = 'LIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_location_price_created ON listings(city, state, price, "createdAt" DESC) WHERE "isActive" = true AND status = 'LIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_condition_price_created ON listings(condition, price, "createdAt" DESC) WHERE "isActive" = true AND status = 'LIVE';

-- Geospatial index for location-based searches (if using coordinates)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_coordinates ON listings USING gist(ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND "isActive" = true;

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_active ON users(phone) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location ON users(city, state) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_kyc_trust ON users("kycStatus", "trustScore") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users("lastLoginAt" DESC) WHERE "isActive" = true;

-- Categories table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_active ON categories("parentId", "isActive") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug_active ON categories(slug) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_sort_order ON categories("sortOrder", name) WHERE "isActive" = true;

-- Messages table indexes for messaging performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation ON messages("conversationId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created ON messages("senderId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_created ON messages("receiverId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_listing_created ON messages("listingId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread ON messages("receiverId", "readAt") WHERE "readAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_quote_status ON messages("quoteStatus", "createdAt" DESC) WHERE "messageType" = 'QUOTE';

-- Saved listings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_listings_user_created ON saved_listings("userId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_listings_listing_created ON saved_listings("listingId", "createdAt" DESC);

-- Reviews table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_ratee_active ON reviews("rateeId", "isActive") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rater_created ON reviews("raterId", "createdAt" DESC) WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating_created ON reviews(rating DESC, "createdAt" DESC) WHERE "isActive" = true;

-- Reports table indexes for moderation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status_created ON reports(status, "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_listing_status ON reports("listingId", status) WHERE "listingId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reason_status ON reports(reason, status);

-- Orders table indexes for transaction tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_created ON orders("buyerId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_created ON orders("sellerId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_listing_created ON orders("listingId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_escrow_status ON orders("escrowStatus", "updatedAt" DESC);

-- Notifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications("userId", "isRead", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created ON notifications(type, "createdAt" DESC);

-- Moderation logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_admin_created ON moderation_logs("adminId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_listing_created ON moderation_logs("listingId", "createdAt" DESC) WHERE "listingId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_user_created ON moderation_logs("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_action_created ON moderation_logs(action, "createdAt" DESC);

-- Partial indexes for specific use cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_featured ON listings("createdAt" DESC) WHERE status = 'LIVE' AND "isActive" = true AND views > 100;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_new ON listings("createdAt" DESC) WHERE status = 'LIVE' AND "isActive" = true AND "createdAt" > (NOW() - INTERVAL '7 days');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_negotiable ON listings(price, "createdAt" DESC) WHERE negotiable = true AND status = 'LIVE' AND "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_pickup_only ON listings(city, state, price) WHERE "pickupOnly" = true AND status = 'LIVE' AND "isActive" = true;

-- Statistics and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_stats_daily ON listings(DATE("createdAt"), status) WHERE "createdAt" > (NOW() - INTERVAL '90 days');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_stats_daily ON messages(DATE("createdAt"), "messageType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_stats_daily ON users(DATE("createdAt"), role) WHERE "createdAt" > (NOW() - INTERVAL '90 days');

-- Add comments for documentation
COMMENT ON INDEX idx_listings_status_active IS 'Primary index for active listings filtering';
COMMENT ON INDEX idx_listings_title_search IS 'Full-text search index for listing titles';
COMMENT ON INDEX idx_listings_category_price_created IS 'Composite index for category browsing with price sorting';
COMMENT ON INDEX idx_messages_conversation IS 'Index for conversation message retrieval';
COMMENT ON INDEX idx_users_kyc_trust IS 'Index for user verification and trust scoring';