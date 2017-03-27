SELECT subs.customer_id, SUM(price) AS total, pays.amount IS NOT NULL AS paid

# Select all days for the given week
FROM (
	SELECT DATE_ADD(DATE_ADD(MAKEDATE(::year, 1), INTERVAL ::week - 1 WEEK), INTERVAL days.day DAY) as day # Sunday at start of week
	FROM (SELECT 0 AS day UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS days
) AS days

# Join to the subscriptions to fetch each person's subscriptions
INNER JOIN subscriptions AS subs
	ON subs.delivery_days & POW(2, DAYOFWEEK(days.day) - 1) = POW(2, DAYOFWEEK(days.day) - 1)

# Join to publications to fetch price
INNER JOIN publications AS pubs
	ON subs.publication_id = pubs.id

# Join to payments to check if customer has paid
LEFT JOIN payments AS pays
	ON subs.customer_id = pays.customer_id AND DATE_FORMAT(days.day, "%X-%V") = pays.payment_for

# Only allow active subscriptions
WHERE subs.start_date <= days.day AND (subs.end_date IS NULL OR subs.end_date >= days.day)

# Sum the price by customer_id
GROUP BY subs.customer_id;