## Query to select all days (and their day of week number) in the given month and year
SET @year = 2017;
SET @month = 3;

SELECT a.Date, DAYOFWEEK(a.Date) AS dow
FROM ( # This bit selects 39 days in the future from the first day of the current month. Adapted from http://stackoverflow.com/a/15224720/1305670
	SELECT CONCAT(@year, '-', @month, '-01') + INTERVAL (a.a + (10 * b.a)) DAY AS Date
	FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
	CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) AS b ORDER BY Date
) a
WHERE MONTH(a.date) = @month; # This restricts the date so as not to including the 39th of the current month (I.E. about 8/9 into next month)