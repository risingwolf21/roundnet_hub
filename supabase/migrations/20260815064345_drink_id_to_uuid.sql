alter table public.drink
add column id_uuid uuid not null default gen_random_uuid ();

alter table public.history
add column drink_uuid uuid;

drop view distinct_drinks;

alter table public.drink
drop column "previousDrink";

update public.history h
set
  drink_uuid = d.id_uuid
from
  public.drink d
where
  h.drink = d.id;

alter table public.history
alter column drink_uuid
set
  not null;

alter table public.history
drop constraint history_drink_fkey;

alter table public.drink
drop constraint drinks_pkey;

alter table public.history
drop column drink;

alter table public.drink
drop column id;

alter table public.history
rename column drink_uuid to drink;

alter table public.drink
rename column id_uuid to id;

alter table public.drink add constraint drinks_pkey primary key (id);

alter table public.history add constraint history_drink_fkey foreign key (drink) references public.drink (id);

CREATE OR REPLACE FUNCTION public.add_drinks_history(items json)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
    user_id uuid := auth.uid();
    payment_id bigint;
    drink_record json;
    voucher_record RECORD;
    total_drink_count numeric;
    drink_id uuid;
    drink_count numeric;
    drink_price numeric;
    drink_amount numeric;
BEGIN
    IF jsonb_typeof(items::jsonb) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', items;
    END IF;

    -- get or create payment id
    SELECT id
    INTO payment_id
    FROM payments
    WHERE "user" = user_id
    AND "paymentState" = 'Open';
    IF
    payment_id IS NULL THEN
            INSERT INTO payments ("user", "amountToPay", "paymentState")
            VALUES (user_id, 0, 'Open')
            RETURNING id INTO payment_id;
    END IF;

    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Es wurde kein Payment gefunden oder konnte nicht erstellt werden';
    END IF;

    -- Iterate over all drinks that need to be added
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
        drink_id := (drink_record->>'id')::numeric;
        drink_count := (drink_record->>'count')::numeric;
        drink_price := (drink_record->>'price')::numeric;
        raise log 'Adding drink %', drink_record;
        total_drink_count := drink_count; -- Initialize remaining count for this drink
        -- Loop over the vouchers of the user
        FOR voucher_record IN SELECT id, available FROM user_vouchers
        LOOP
            -- If the remaining count is fulfilled, exit the loop
            IF total_drink_count <= 0 THEN
                EXIT;
            END IF;
            -- Check if the voucher has enough available count
            IF voucher_record.available > 0 THEN
                IF voucher_record.available < total_drink_count THEN
                    -- Create a history entry with the voucher for the available amount
                    drink_amount := drink_price * voucher_record.available;
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, voucher_record.available, drink_amount, voucher_record.id);
                    -- Decrease the remaining count
                    total_drink_count := total_drink_count - voucher_record.available;
                ELSE
                    drink_amount := drink_price * total_drink_count;
                    -- Create a history entry with the voucher for the remaining count
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount, voucher_record.id);
                    -- Set remaining count to zero as it is fulfilled
                    total_drink_count := 0;
                END IF;
            END IF;
        END LOOP;
        -- If there is still remaining count, create a history entry without a voucher
        IF total_drink_count > 0 THEN
            drink_amount := drink_price * total_drink_count;
            INSERT INTO history (drink, "user", payment, count, amount)
            VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount);
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Drinks: %', SQLERRM;
END;$function$
;