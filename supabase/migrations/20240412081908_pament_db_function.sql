create
or replace function public.get_or_create_payment_for_user (user_id text) returns bigint as $$
DECLARE
payment_id bigint;
BEGIN
SELECT id
INTO payment_id
FROM payments
WHERE "userId" = user_id
  AND "paymentState" = 'Open';
IF
payment_id IS NULL THEN
        INSERT INTO payments ("userId", "amountToPay", "paymentState")
        VALUES (user_id, 0, 'Open')
        RETURNING id INTO payment_id;
END IF;
RETURN payment_id;
END;
$$
language plpgsql;