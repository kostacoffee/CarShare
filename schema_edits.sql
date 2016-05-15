CREATE USER webuser WITH PASSWORD 'MnU79g&@s9nacLcB';
GRANT ALL ON SCHEMA carsharing to webuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA carsharing TO webuser;

ALTER USER webuser SET search_path = carsharing;

ALTER TABLE Member ALTER COLUMN password TYPE char(88);
ALTER TABLE Member ALTER COLUMN pw_salt TYPE char(24);