local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSize = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local state = redis.call('HMGET', key, 'windowStart', 'requestCount')
local windowStart = tonumber(state[1]) or now
local requestCount = tonumber(state[2]) or 0
local windowExpired = (now-windowStart) >= windowSize

local allowed = 0
local remaining = 0

if windowExpired then
  windowStart = now
  requestCount = 1
  allowed = 1
  remaining = limit-1

elseif requestCount < limit then
  requestCount = requestCount + 1
  allowed = 1
  remaining = limit - requestCount

else
  allowed = 0
  remaining = limit - requestCount
end

redis.call('HMSET', key, 'windowStart', windowStart, 'requestCount', requestCount)
redis.call('EXPIRE' ,key, 3600)

return {allowed, remaining}