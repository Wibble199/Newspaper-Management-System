SELECT pubs.id AS publication_id, days.day, COUNT(*) AS count FROM subscriptions AS subs

INNER JOIN publications AS pubs
	ON subs.publication_id = pubs.id

INNER JOIN (SELECT 0 AS day UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS days
	ON subs.delivery_days & POW(2, days.day) = POW(2, days.day)

# `(::day - INTERVAL DAYOFWEEK(::day) - 1 DAY)`  Returns the first day of the week (Sunday) from the given day
# `(::day - INTERVAL DAYOFWEEK(::day) - 1 DAY) + INTERVAL days.day - 1 DAY`  will evaluate to the day that it is looping over (can omit the `-1`s as they cancel)
WHERE subs.start_date <= (::day - INTERVAL DAYOFWEEK(::day) DAY) + INTERVAL days.day DAY
	AND (subs.end_date IS NULL OR subs.end_date >= (::day - INTERVAL DAYOFWEEK(::day) DAY) + INTERVAL days.day DAY)
    
GROUP BY
	pubs.id, days.day
    
ORDER BY
	pubs.id, days.day