create type public.EventRecurrence as enum('None', 'Daily', 'Weekly', 'Monthly', 'Yearly');

create type public.EventAttendance as enum('Unanswered', 'Attending', 'Not Attending');

create type public.PaymentState as enum('Open', 'Paid', 'Cancelled');

create type public.UserRole as enum('user', 'admin');