CREATE USER webuser WITH PASSWORD 'MnU79g&@s9nacLcB';

GRANT ALL ON SCHEMA carsharing to webuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA carsharing TO webuser;

ALTER USER webuser SET search_path = carsharing;

ALTER TABLE carsharing.Member ALTER COLUMN password TYPE char(88);
ALTER TABLE carsharing.Member ALTER COLUMN pw_salt TYPE char(24);

CREATE OR REPLACE FUNCTION getMember(search_term varchar)
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
   subscribed    VARCHAR,
   prefPaymentNo INTEGER,
   stat_nrOfBookings INTEGER,
   stat_nrOfReviews  INTEGER,
   stat_sumPayments  AmountInCents
) AS $$
BEGIN
RETURN QUERY SELECT * FROM Member AS m where LOWER(m.nickname)=search_term or LOWER(m.email)=search_term;
END;
$$ Language plpgsql;
