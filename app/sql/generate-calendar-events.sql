## Query to select all days (and their day of week number) in the given month and year ignoring any dates that are inside a suspension
SELECT dim.date, pub.name
	# CREATE AN INTERMEDIARY TABLE CONTAINING ALL DAYS IN THE GIVEN MONTH
	FROM ( # This bit selects 39 days in the future from the first day of the current month. Adapted from http://stackoverflow.com/a/15224720/1305670
		SELECT CONCAT(::year, '-', ::month, '-01') + INTERVAL (a.a + (10 * b.a)) DAY AS date
		FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
		CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) AS b
		HAVING MONTH(date) = ::month # This restricts the date so as not to including the 39th of the current month (I.E. about 8/9 into next month)
	) dim

# ATTEMPT JOIN ONTO A SINGLE SUSPENSION (IF PRESENT, IF NOT IT'LL BE NULL)
LEFT JOIN suspensions AS susp
	ON dim.date >= susp.start_date AND (susp.end_date IS NULL OR dim.date <= susp.end_date) # Join when the suspension is active
	AND susp.customer_id = ::customerId # Ensure we are only taking this customer's suspensions into account

# JOIN ONTO SUBSCRIPTIONS TABLE
INNER JOIN subscriptions AS sub
	ON sub.delivery_days & POW(2, DAYOFWEEK(dim.date) - 1) = POW(2, DAYOFWEEK(dim.date) - 1) # Join when this date's day-of-week is one of the delivery days of the subscription
	AND dim.date >= sub.start_date AND (sub.end_date IS NULL OR dim.date <= sub.end_date) # Only take active subscriptions into account
	AND sub.customer_id = ::customerId # Ensure we are only fetching this customer's subscriptions

# JOIN ONTO PUBLICATION TABLE TO FETCH SUBSCRIPTION NAMES
INNER JOIN publications AS pub
	ON sub.publication_id = pub.id

WHERE susp.id IS NULL # ONLY SELECT DATES WITH A NULL SUSPENSION - I.E. A SUSPENSION IS NOT ACTIVE DURING THIS DATE

ORDER BY dim.date