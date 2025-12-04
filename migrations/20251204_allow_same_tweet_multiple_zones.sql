-- Migration: Allow same tweet in multiple zones
-- Date: 2024-12-04
-- Purpose: Remove UNIQUE constraint on tweet_id and add composite UNIQUE on (tweet_id, zone_id)
-- This allows the same tweet to be captured in multiple zones for different clients

-- Step 1: Drop the existing UNIQUE constraint on tweet_id
ALTER TABLE twitter_tweets 
DROP CONSTRAINT IF EXISTS twitter_tweets_tweet_id_key;

-- Step 2: Create a composite UNIQUE constraint on (tweet_id, zone_id)
-- This ensures the same tweet can exist in multiple zones but only once per zone
ALTER TABLE twitter_tweets 
ADD CONSTRAINT twitter_tweets_tweet_id_zone_id_key 
UNIQUE (tweet_id, zone_id);

-- Step 3: Update the index for better query performance
-- Drop the old single-column index if it exists
DROP INDEX IF EXISTS idx_twitter_tweets_tweet_id;

-- Create a composite index to support the new constraint
CREATE INDEX IF NOT EXISTS idx_twitter_tweets_tweet_id_zone_id 
ON twitter_tweets(tweet_id, zone_id);

-- Add an index on tweet_id alone for queries that search across zones
CREATE INDEX IF NOT EXISTS idx_twitter_tweets_tweet_id 
ON twitter_tweets(tweet_id);

COMMENT ON CONSTRAINT twitter_tweets_tweet_id_zone_id_key ON twitter_tweets IS 
'Allows the same tweet to be captured in multiple zones (e.g., different clients using same keywords)';

