# Fetches the unpaid amounts sorted by week for a given customer

# Latest payment is that latest week that has been paid
# DATE_ADD(MAKEDATE(LEFT(latest_payment, 4), 1), INTERVAL right(latest_payment, 2) - 1 WEEK) as day <- Returns the first Sunday of the latest paid-for week
SELECT SUM(pubs.price) AS total, DATE_FORMAT(days.date, "%X-%V") AS week
FROM customers AS cust

INNER JOIN subscriptions AS subs
	ON subs.customer_id = cust.id

INNER JOIN ( # Get 499 into the past. Adapted from http://stackoverflow.com/a/15224720/1305670. Going to make the assumption that if someone hasn't paid in 555 days their account has been terminated.
		# DATE(NOW() + INTERVAL 7 - DAYOFWEEK(NOW()) DAY) selects the last day of this week (Saturday)
		SELECT DATE(NOW() + INTERVAL 7 - DAYOFWEEK(NOW()) DAY) - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS date
		FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
		CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
		CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) AS c ORDER BY Date
	) AS days
	ON subs.delivery_days & POW(2, DAYOFWEEK(days.date) - 1) = POW(2, DAYOFWEEK(days.date) - 1)

INNER JOIN publications AS pubs
	ON subs.publication_id = pubs.id

WHERE cust.id = ::customer
	AND days.date >= DATE_ADD(MAKEDATE(LEFT(cust.latest_payment, 4), 1), INTERVAL right(cust.latest_payment, 2) WEEK) # Ensure dates only later than the last paid day
	AND subs.start_date <= days.date AND (subs.end_date IS NULL OR subs.end_date >= days.date) # Take startand end date into account
	# TODO: Take suspensions into account

GROUP BY DATE_FORMAT(days.date, "%X-%V");