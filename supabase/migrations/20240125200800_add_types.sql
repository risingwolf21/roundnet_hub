create type public."Permissions" as enum(
    'use;drink',
    'edit;drink',
    'delete;drink',
    'view;drink',
    'use;training',
    'edit;training',
    'delete;training',
    'view;training',
    'edit;groups',
    'delete;groups',
    'view;groups',
    'edit;payments',
    'edit;user',
    'view;keyFinder',
    'use;user',
    'view;user',
    'delete;user',
    'edit;keyFinder',
    'delete;keyFinder',
    'view;notifications',
    'edit;notifications'
);

create type public.UserRole as enum('user', 'admin', 'procure', 'finance', 'trainer');

create type public.PaymentState as enum('Open', 'Fulfilled');

create type public.EventRecurrence as enum('Weekly', 'Fortnightly', 'Monthly', 'None');

create type public.ProductType as enum('Drink', 'Special', 'None');

create type public."NotificationTags" as enum(
    'eventComments',
    'userRegistration',
    'paymentRequest',
    'paymentPending'
);

create type public."EventAttendance" as enum(
    'Declined',
    'Attending',
    'Unanswered',
    'Waiting'
);