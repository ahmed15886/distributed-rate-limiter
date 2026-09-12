local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local state = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(state[1]) or capacity
local lastRefill = tonumber(state[2]) or now

local elapsed = (now - lastRefill) / 1000
local newTokens = math.min(capacity, tokens + (elapsed * refillRate))

local allowed = 0
local remaining = 0

if newTokens >= 1 then
  newTokens = newTokens - 1
  allowed = 1
end

remaining = math.floor(newTokens)

redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
redis.call('EXPIRE', key, 3600)

return {allowed, remaining}