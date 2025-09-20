# reminder-service
Create real time reminder service


create database:
psql -U postgres;
CREATE USER reminder_user WITH PASSWORD 'secretpassword';
ALTER USER reminder_user CREATEDB;
CREATE DATABASE reminders OWNER reminder_user;
GRANT ALL PRIVILEGES ON DATABASE reminders TO reminder_user;