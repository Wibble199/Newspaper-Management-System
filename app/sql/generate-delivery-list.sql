SELECT customer_id, publication_id, c.name AS customer_name, c.address1, c.address2, c.address3, c.address4, c.postcode, pub.name AS publication_name
	FROM subscriptions AS sub

INNER JOIN publications AS pub
	ON sub.publication_id = pub.id

INNER JOIN customers AS c
	ON sub.customer_id = c.id

WHERE sub.start_date < ::day AND (sub.end_date IS NULL OR sub.end_date > ::day) -- Ensure subscription is active
	-- TODO: TAKE SUSPENSIONS INTO ACCOUNT
	AND sub.delivery_days & POW(2, DAYOFWEEK(::day) - 1) = POW(2, DAYOFWEEK(::day) - 1) -- Only fetch subscriptions due on the the same day of week as the day parameter

ORDER BY sub.customer_id, pub.id; -- Sort by the customer so that it is easier for the NodeJS server to parse