INSERT INTO customers (`email`, `password`, `name`, `address1`, `address2`, `address3`, `address4`, `postcode`, `contact_num`) VALUES
	-- All customer passwords are "password1"
	("j.smith@gmail.com", "$2a$10$wkGVu5KWiqiX9Ujmz/ugxeIs121yxNxbgkSdWxRArP/R/i33y.kly", "John Smith", "9 Scarisbrick St", "Ormskirk", NULL, NULL, "L39 1QE", "01234567890"),
	("l.rey@gmail.com", "$2a$10$0ktCxtXaXhPk1q2f2vQFCujgC3ro8RoZzsPkE/nY72uyGfsCkcpiG", "Lenore Rey", "84 New Ct Way", "Ormskirk", NULL, NULL, "L39 2YT", "01234567890"),
	("l.woodham@hotmail.com", "$2a$10$E4ooloLa/wqt9fJPOGZdU.4rKOV69T3Ym.p9t8WJJ/wHzM2hrKrLm", "Lesley Woodham", "47 Derby St", "Ormskirk", NULL, NULL, "L39 2BW", "01234567890"),
	("s.stoddard@hotmail.com", "$2a$10$VbVsQRUUzpXCXd9N1AWH.uypJvUHsfvhIhS.8XLpOIMzqPcnLUobW", "Stephania Stoddard", "201 Wigan Rd", "Ormskirk", NULL, NULL, "L39 2AT", "01234567890"),
	("m.banner@gmail.com", "$2a$10$IrfjTuNOjTQ/U3YPAhOByeF8ToCVrf8hR.RqybWmqLhkAn3CTFu6G", "Maddie Banner", "65 Ruff Ln", "Ormskirk", NULL, NULL, "L39 4UL", "01234567890"),
	("g.bernard@hotmail.com", "$2a$10$CR2lPX74irPJog5LYVHsj.Uhowl4FjGtIiA2myr199Cd5MK5kEbWG", "Gerald Bernard", "52 Little Hall Farm", "Cottage Ln", "Ormskirk", NULL, "L39 3NQ", "01234567890"),
	("i.chester@outlook.com", "$2a$10$AF2umxwzVsDh1Jg89BTAV.6hV4oY8L9vGgaphj2S.t7uHtQRWYGTy", "Issy Chester", "34 Calder Ave", "Ormskirk", NULL, NULL, "L39 4SF", "01234567890"),
	("l.miles@gmail.com", "$2a$10$WSPPm15bqTsSVfu/w5ViCO2ol2RK3qmFt4TM2gZcOAtn4RZdt3FO2", "Lorena Miles", "50 St Helens Rd", "Ormskirk", NULL, NULL, "L39 4QT", "01234567890"),
	("n.bonham@outlook.com", "$2a$10$RgUAIvixg6i6bh9eoGBz9uStOAd3Jth3It./jWi6zyvOCzdU9woNS", "Neville Bonham", "51 Cotton Dr", "Ormskirk", NULL, NULL, "L39 3AZ", "01234567890"),
	("w.garfield@hotmail.com", "$2a$10$dsjNliBZKfQf/DRrYpzUTelm3MosczMOgl52Te4qziGvbkZIAPAPe", "Wilford Garfield", "24 Haslam Dr", "Ormskirk", NULL, NULL, "L39 1LL", "01234567890"),
	("m.kinsley@gmail.com", "$2a$10$3IgWWAvFB8/30wHGHxQBMusHsxrjyoO9JriYOGc3PdQrAFEmuh3ze", "Mabelle Kinsley", "11 Black Moss Ln", "Ormskirk", NULL, NULL, "L39 4TN", "01234567890");

INSERT INTO customers (`email`, `password`, `name`, `address1`, `address2`, `postcode`, `contact_num`, `is_admin`) VALUES
	-- Add employee account. Password: "1234"
	("***REMOVED***", "$2a$10$MuEGGwYD3KQKMclnUBR7b.cYR5CDefYSwxpzAEXlsm1wa7O/JQ7V.", "Will Bennion", "", "", "", "", 1);

INSERT INTO publications (`name`, `color`) VALUES
	("The Ormskirk Herald", "898CFF"),
	("The Independant", "FF89B5"),
	("TV Times", "FFDC89"),
	("PC Magazine", "90D4F7"),
	("PCGamer", "71E096"),
	("The Guardian", "F5A26F");

INSERT INTO subscriptions (`customer_id`, `publication_id`, `start_date`, `end_date`, `delivery_days`) VALUES
	(1, 1, "2017-03-12", null, 4),
	(1, 3, "2017-02-01", null, 8),
	(1, 4, "2017-03-22", null, 2),
	(2, 2, "2017-01-11", null, 34),
	(2, 5, "2017-01-26", null, 22),
	(3, 1, "2017-03-30", null, 95),
	(3, 4, "2017-02-18", null, 99),
	(3, 6, "2017-03-20", null, 33),
	(4, 1, "2017-02-25", null, 55),
	(4, 4, "2017-01-04", null, 26),
	(5, 3, "2017-02-02", null, 110),
	(6, 4, "2017-03-20", null, 105),
	(6, 6, "2017-01-04", null, 40),
	(7, 2, "2017-02-13", null, 42),
	(7, 3, "2017-02-14", null, 118),
	(8, 1, "2017-01-08", null, 61),
	(8, 4, "2017-01-31", null, 53),
	(8, 5, "2017-03-24", null, 3),
	(9, 1, "2017-02-26", null, 67),
	(9, 3, "2017-01-06", null, 12),
	(9, 4, "2016-07-18", null, 79),
	(10, 3, "2017-01-04", null, 67);