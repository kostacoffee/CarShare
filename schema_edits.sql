CREATE USER webuser WITH PASSWORD 'MnU79g&@s9nacLcB';

GRANT ALL ON SCHEMA carsharing to webuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA carsharing TO webuser; --TODO!!!!!

ALTER USER webuser SET search_path = carsharing;
GRANT USAGE ON SEQUENCE booking_bookingid_seq TO webuser; 

ALTER TABLE carsharing.Member ALTER COLUMN password TYPE char(88);
ALTER TABLE carsharing.Member ALTER COLUMN pw_salt TYPE char(24);

DROP FUNCTION IF EXISTS getMember(varchar);
CREATE OR REPLACE FUNCTION getMember(a_nickname varchar)
RETURNS TABLE(
   memberNo      INTEGER,
   email         EMailType,
   nickname      VARCHAR,
   password      CHAR,
   pw_salt       CHAR,
   nameTitle     VARCHAR,
   nameGiven     VARCHAR,
   nameFamily    VARCHAR,
   address       VARCHAR,
   since         DATE,
   birthdate     DATE,
   licenseNo     BIGINT,
   licenseExp    DATE,
   homeBay       INTEGER,
   homebayName   VARCHAR,
   subscribed    VARCHAR,
   prefPaymentNo INTEGER,
   stat_nrOfBookings INTEGER,
   stat_nrOfReviews  INTEGER,
   stat_sumPayments  AmountInCents
) AS $$
BEGIN
RETURN QUERY
SELECT
   m.memberNo,
   m.email,
   m.nickname,
   m.password,
   m.pw_salt,
   m.nameTitle,
   m.nameGiven,
   m.nameFamily,
   m.address,
   m.since,
   m.birthdate,
   m.licenseNo,
   m.licenseExp,
   COALESCE(m.homeBay, -1),
   COALESCE(b.name, 'No Homebay'),
   m.subscribed,
   m.prefPaymentNo,
   m.stat_nrOfBookings,
   m.stat_nrOfReviews,
   m.stat_sumPayments
FROM Member AS m LEFT OUTER JOIN Carbay AS b ON m.homeBay = b.bayID
WHERE LOWER(m.nickname) = a_nickname or LOWER(m.email) = a_nickname;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getBooking(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION getBooking(a_memberNo INTEGER, a_bookingID INTEGER)
RETURNS TABLE(
   car VARCHAR,
   regno RegoType,
   bay VARCHAR,
   start TIMESTAMP,
   length DOUBLE PRECISION,
   whenBooked TIMESTAMP
) AS $$
BEGIN
RETURN QUERY
SELECT
   c.name AS car,
   c.regno AS regno,
   cb.name AS bay,
   b.startTime AS start,
   EXTRACT(EPOCH FROM (b.endTime - b.startTime))/3600 AS length,
   b.whenBooked AS whenBooked
FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID
WHERE b.madeBy = a_memberNo AND b.bookingID = a_bookingID;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getBookingHistory(INTEGER);
CREATE OR REPLACE FUNCTION getBookingHistory(a_memberNo INTEGER)
RETURNS TABLE(
   id INT,
   car VARCHAR,
   regno RegoType,
   date DATE,
   length DOUBLE PRECISION
) AS $$
BEGIN
RETURN QUERY
SELECT
   b.bookingID AS id,
   c.name AS car,
   c.regno AS regno,
   b.startTime::DATE AS date,
   EXTRACT(EPOCH FROM (b.endTime - b.startTime))/3600 AS length
FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno
WHERE b.madeBy = a_memberNo
ORDER BY b.startTime DESC;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getBookingClash(RegoType, TIMESTAMP, TIMESTAMP);
CREATE OR REPLACE FUNCTION getBookingClash(a_regno RegoType, a_startTime TIMESTAMP, a_endTime TIMESTAMP)
RETURNS TABLE(
   bookingID INTEGER,
   car RegoType,
   madeBy INTEGER,
   whenBooked TIMESTAMP,
   startTime TIMESTAMP,
   endTime TIMESTAMP
) AS $$
BEGIN
RETURN QUERY
SELECT *
FROM Booking AS b
WHERE b.car = a_regno AND (b.startTime, b.endTime) OVERLAPS (a_startTime, a_endTime);
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getCarAvailabilities(RegoType, TIMESTAMP);
CREATE OR REPLACE FUNCTION getCarAvailabilities(a_regno RegoType, a_date TIMESTAMP)
RETURNS TABLE(
   h DOUBLE PRECISION
) AS $$
BEGIN
RETURN QUERY
SELECT EXTRACT(HOUR FROM h.h)
FROM generate_series(a_date, a_date + INTERVAL '23 hours', INTERVAL '1 hour') AS h
WHERE NOT EXISTS(
SELECT * FROM Booking AS b WHERE b.car = a_regno
AND
(b.startTime, b.endTime) OVERLAPS (h.h, h.h + INTERVAL '1 hour')
);
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getAllCars();
CREATE OR REPLACE FUNCTION getAllCars()
RETURNS TABLE(
   regno RegoType,
   name VARCHAR,
   make VARCHAR,
   model VARCHAR,
   year INTEGER,
   transmission VARCHAR,
   parkedAt INTEGER
) AS $$
BEGIN
RETURN QUERY
SELECT * From Car;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getHourlyRate(INTEGER);
CREATE OR REPLACE FUNCTION getHourlyRate(a_memberNo INTEGER)
RETURNS TABLE(
   rate AmountInCents
) AS $$
BEGIN
RETURN QUERY
SELECT p.hourly_rate AS rate FROM Member AS m INNER JOIN MembershipPlan AS p ON m.subscribed = p.title WHERE m.memberNo = a_memberNo;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getDailyRate(INTEGER);
CREATE OR REPLACE FUNCTION getDailyRate(a_memberNo INTEGER)
RETURNS TABLE(
   rate AmountInCents
) AS $$
BEGIN
RETURN QUERY
SELECT p.daily_rate AS rate FROM Member AS m INNER JOIN MembershipPlan AS p ON m.subscribed = p.title WHERE m.memberNo = a_memberNo;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getInvoice(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION getInvoice(a_memberNo INTEGER, a_invoiceNo INTEGER)
RETURNS TABLE(
   invoicedate DATE,
   monthlyfee AmountInCents,
   totalamount AmountInCents
) AS $$
BEGIN
RETURN QUERY
SELECT i.invoicedate, i.monthlyfee, i.totalamount FROM invoice AS i WHERE i.memberNo = a_memberNo AND i.invoiceNo = a_invoiceNo;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getInvoices(INTEGER);
CREATE OR REPLACE FUNCTION getInvoices(a_memberNo INTEGER)
RETURNS TABLE(
   invoicedate DATE,
   monthlyfee AmountInCents,
   totalamount AmountInCents
) AS $$
BEGIN
RETURN QUERY
SELECT i.invoicedate, i.monthlyfee, i.totalamount FROM invoice AS i WHERE i.memberNo = a_memberNo ORDER BY i.invoiceNo DESC;
END;
$$ Language plpgsql;

DROP FUNCTION IF EXISTS getBookingsForInvoice(INTEGER, DATE, DATE);
CREATE OR REPLACE FUNCTION getBookingsForInvoice(a_memberNo INTEGER, a_startDate DATE, a_endDate DATE)
RETURNS TABLE(
   bookingid INTEGER,
   car RegoType,
   starttime TIMESTAMP,
   endtime TIMESTAMP
) AS $$
BEGIN
RETURN QUERY
SELECT b.bookingid, b.car, b.starttime, b.endtime FROM Booking AS b WHERE b.madeby = a_memberNo AND b.endtime >= a_startDate AND b.endtime < a_endDate;
END;
$$ Language plpgsql;
