local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSize = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired timestamps (older than now - windowSize)
redis.call('ZREMRANGEBYSCORE', key, 0, now - windowSize)

-- Count requests in current window
local count = tonumber(redis.call('ZCARD', key))

local allowed = 0
local remaining = 0

if count < limit then
  -- Add current timestamp as both score and member
  redis.call('ZADD', key, now, now)
  allowed = 1
  remaining = limit - count - 1
else
  allowed = 0
  remaining = 0
end

redis.call('EXPIRE', key, math.ceil(windowSize / 1000) + 1)

return {allowed, remaining}