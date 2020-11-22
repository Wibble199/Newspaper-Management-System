_This document is an outline of the provided specification that was to be implemented._

# Project - A “newspaper delivery system”
Your company have received a project from an Ormskirk Newsagent Company. The project is
to develop a system which is intended to manage the delivery of newspaper and magazines
in Ormskirk and surrounding areas. It is intended for use by newsagents who are only casual
users of computer systems and should run on a PC or similar hardware.
Factors which should be taken into account in specifying and designing this system are:

- For each delivery person, the system must print, each day, the publications to be
delivered to each address.
- The system should also print (on the screen), for the newsagent, a summary of who
received what publications each day.
- Customers come and go and may be away temporarily on holiday or on business.
- Not all customers necessarily have a delivery every day.
- The system should be able to manage some simple geographic information so that it
prints information for the delivery person in the order in which publications are
delivered.

# Additional  Requirements
These additional requirements were determined by my team and I after interviewing an employee of the newspaper company.

1. The system will be online so as to allow users to change subscriptions or details from any device with an internet connection.
    1. Each customer will have an individual login allowing them to change their details, subscriptions and also suspend their service.
    1. The newsagents and it’s employees will have an admin login which will allow changing any users’ subscriptions/details as well as being able to produce reports.
    1. The system will consist of a database server and a web server.
    1. The system will be provided over HTTPS.
1. The system must facilitate the ability to edit or alter a customer’s current subscription.
    1. There will be an aspect of the system designated for managing subscriptions in regards to what and when items are delivered. In regards to managing a customer's subscription a calendar style form will be displayed outlining when and what will be getting delivered, editing this will just require clicking on and cancelling for the specific days. The addition of items to the subscription will be a simple process of selecting the produce then delivery days.
    1. The system would require a 3 working day minimum notice for the suspension or alteration of a subscription.
1. The system must be able to produce a variety of logical and appropriate reports, available to be printed or simply displayed within the system.
    1. The system must produce a report on the papers that are available, in high demand or currently unavailable. This will have the capabilities of being produced on a daily weekly, or monthly basis.  
    1. The system will have the capability in which to produce reports detailing how often customers ordered, the current amount of customers and details relating to the customers, all of which are available in timescales up to 3 months. Also, using the addresses provided by the customer, the system should be able to provide the user with a map full of indicators representing their customers.
    1. The system must be able to produce a daily report of what papers are needed and for which address, whilst also providing separate lists for the current delivery staff.
    1. The system must have the capability in which to produce a report surrounding what publications were delivered on that day.
1. The system should be able to manage some simple geographic information so that it prints information for the delivery person in the order that publications are delivered.
    1. The system will use the powerful Google Maps Directions API to calculate the quickest and most efficient route between deliveries on a given day, which will be visible to any user with the required permissions and with an internet connected device.
    1. When using this system the delivery staff will be able to remove the address delivered to informing the system that the delivery has been made.
1. The system will contain data validation in aspects requiring user input so as to reduce human error where possible.
    1. Character limits will be present on name and password lengths.
    1. Delivery addresses will be checked to ensure they are legitimate locations and within a suitable delivery range.
    1. Date validation will be implemented in the system so that the user cannot arrange deliveries in the past, or so that the user has to comply to the 3 working day cancellation period.
1. The system will have the ability to track any outstanding payments for each customer.
    1. To do this the database will keep track of the latest payment made by a particular customer.
        1. This is the most data-efficient and easiest way to implement the system.
        1. This method assumes that a person pays for their publications sequentially (E.G. if they owe payment for 2 weeks, they will not pay for the most recent week’s publications before the less recent week’s)
    1. The customer will be able to view a list of their outstanding payments which will consist of: time frame (the week the payment is for) and the price of the payment.
    1. Employees will also be able to use the customer table to view each customer’s outstanding payments (time frame and price for each) as well as being able to update the latest week that the customer has paid for.
