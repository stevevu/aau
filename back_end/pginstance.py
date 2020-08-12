import datetime

import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import pytz
# Servers as wrapper for psycopg2 in the context of this project and provides error handling
from flask import g


class PgInstance:
    def __init__(self):
        # Current connection object, None if no connection
        self.conn = None
        # Current cursor object, None if no cursor/connection
        self.curs = None

    """
    Open connection and initialize cursor for PSQL database
    Returns:
        connection object and database cursor object, or error if connection failed
    """

    def connect(self):
        try:
            if "DATABASE_URL" in os.environ:  # prod
                self.conn = psycopg2.connect(
                    os.environ["DATABASE_URL"], sslmode='require')
            self.curs = self.conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor)
        except Exception as e:
            return e

    def commit(self):
        try:  # make changes persist
            self.conn.commit()
        except Exception as e:
            return e

    """
    Close cursor and connection to PSQL database
    Returns:
        None if successful disconnection, else Exception
    """

    def disconnect(self):
        try:  # make changes persist
            self.conn.commit()
        except Exception as e:
            return str(e)
        if self.conn == None or self.curs == None:
            return "No connection or cursor to disconnect from."
        self.curs.close()
        self.curs = None
        self.conn.close()
        self.conn = None
        return None

    'restaurant.py routing helpers'

    def get_all_restaurants(self):
        self.curs.execute("SELECT * FROM restaurant")
        return self.curs.fetchall()

    def get_restaurant(self, restaurant_id = None):
        if restaurant_id == None:
            restaurant_id = self.get_restaurant_id_from_user_info()
        self.curs.execute(
            "SELECT * FROM restaurant WHERE id = {0};".format(restaurant_id))
        return self.curs.fetchone()

    'customer.py routing helpers'

    def get_all_customers(self):
        self.curs.execute("SELECT * FROM customer;")
        return self.curs.fetchall()

    def get_all_recipients(self):
        self.curs.execute("SELECT * FROM recipient;")
        return self.curs.fetchall()

    def get_logger(self):
        self.curs.execute("SELECT * FROM logger;")
        return self.curs.fetchall()

    def get_customer(self, email):
        self.curs.execute(
            "SELECT * FROM customer WHERE email = %s", (email,))
        return self.curs.fetchone()

    def delete_customer(self, email):
        self.curs.execute(
            "DELETE FROM recipient WHERE email = '{0}';".format(email))
        self.curs.execute(
            "DELETE FROM restaurant WHERE email = '{0}';".format(email))
        self.curs.execute(
            "DELETE FROM donor WHERE email = '{0}';".format(email))
        self.curs.execute(
            "DELETE FROM customer WHERE email = '{0}';".format(email))
        return None

    def add_donation(self, feed_item_id, donor_email, amount):
        self.curs.execute(
            "INSERT INTO donation (feed_item_id, donor_email, amount_left) VALUES (%s, %s, %s)",
            (feed_item_id, donor_email, amount)
        )
        return None

    """
    Get customer associated with email

    Returns:
        named tuple associated with email
    """

    def get_customer_by_email(self, email):
        self.curs.execute("SELECT * FROM customer WHERE email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one

    def get_donor_by_email(self, email):
        self.curs.execute("SELECT * FROM donor WHERE email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one

    def get_restaurant_by_email(self, email):
        self.curs.execute("SELECT * FROM restaurant WHERE email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one

    def get_restaurant_by_id(self, id):
        self.curs.execute("SELECT * FROM restaurant WHERE id=%s", (id,))
        return self.curs.fetchone()  # We should never get more than one

    def get_order_by_id(self, id):
        self.curs.execute("SELECT * FROM donation_claim WHERE id=%s", (id,))
        return self.curs.fetchone()

    """
        On OTP verify, we make a row in the customer table but we dont make an entry in the restaurant/recipient/donor tables.
        Therefore: A customer MUST exist BUT a restaurant, donor, and recipient SHOULD NOT exist in order for a valid account
        to be created in restaurant/recipient/donor.
    """

    def is_eligible_email(self, email):
        restaurant_row = self.get_restaurant_by_email(email)
        recipient_row = self.get_recipient_by_email(email)
        donor_row = self.get_donor_by_email(email)
        if restaurant_row != None or recipient_row != None or donor_row != None:
            return False
        row = self.get_customer_by_email(email)
        if row == None:
            return False
        return True

    def create_customer(self, email, name, phone, password_hash = None, verified = False):
        row = self.get_customer_by_email(email)
        if row == None or getattr(row, "password") == None:
            if row != None and getattr(row, "password") == None:
                self.curs.execute(
                    "DELETE FROM customer WHERE id=(%s)", (getattr(row, "id"),))
            
            if password_hash == None:
                self.curs.execute(
                    "INSERT INTO customer (email, name, phone, verified) VALUES (%s, %s, %s, %s)",
                    (email, name, phone, verified)
                )
            else:
                self.curs.execute(
                    "INSERT INTO customer (email, name, phone, password, verified) VALUES (%s, %s, %s, %s, %s)",
                    (email, name, phone, password_hash, verified)
                )
            return None
        return "invalid email, already taken"

    def create_donor(self, email, venmo):
        if self.is_eligible_email(email):
            self.curs.execute(
                "INSERT INTO donor (email, venmo) VALUES (%s, %s)", (email, venmo))
            return None
        return "invalid email, already taken"

    def create_recipient(self, email, image_url = None):
        if self.is_eligible_email(email):
            if (image_url == None):
                self.curs.execute(
                    "INSERT INTO recipient (email) VALUES (%s)", (email,))
            else:
                self.curs.execute(
                    "INSERT INTO recipient (email, image_url) VALUES (%s, %s)", (email, image_url))
            return None
        return "invalid email, already taken"

    def create_restaurant(self, email, address, restaurant_name):
        if self.is_eligible_email(email):
            self.curs.execute(
                "INSERT INTO restaurant (email, address1, restaurant_name) VALUES (%s, %s, %s)",
                (email, address, restaurant_name)
            )
            return None
        return "invalid email, already taken"

    def update_customer_name(self, email, name):
        self.curs.execute(
            "UPDATE customer SET name=%s WHERE email=%s", (name, email))

    def update_customer_phone(self, email, phone):
        self.curs.execute(
            "UPDATE customer SET phone=%s WHERE email=%s", (phone, email))

    def update_customer_password(self, email, password):
        self.curs.execute(
            "UPDATE customer SET password=%s WHERE email=%s", (password, email))

    def get_customer_password(self, email):
        self.curs.execute(
            "SELECT password FROM customer WHERE email=%s", (email,))
        return self.curs.fetchone()

    def update_recipient(self, email, available_credits, extra_credits, credit_limit, approval):
        self.curs.execute(
            "UPDATE recipient SET available_credits=%s, extra_credits=%s, credit_limit=%s, approved=%s WHERE email=%s",
            (available_credits, extra_credits, credit_limit, approval, email))

    def update_recipient_status(self, email, approval):
        self.curs.execute(
            "UPDATE recipient SET approved=%s WHERE email=%s", (approval, email))

    def get_pickup_code(self, restaurant_id, donation_claim_id):
        # param order swapped for more efficient query
        self.curs.execute("SELECT pickup_code FROM donation_claim WHERE id=%s AND restaurant_id=%s",
                          (donation_claim_id, restaurant_id))
        donation_claim = self.curs.fetchone()
        if donation_claim != None:
            return getattr(donation_claim, "pickup_code")
        return None

    def create_donation_claim(self, restaurant_id, feed_item_id, recipient_email, meal_items, pickup_code, o, pickup_time, create_time, timezone):
        self.curs.execute(
            "INSERT INTO donation_claim (restaurant_id, feed_item_id, recipient_email, meal_items, pickup_code, amount, pickup_time, created, timezone) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (restaurant_id, feed_item_id, recipient_email, meal_items, pickup_code, o, pickup_time, create_time, timezone))
        return self.curs.fetchone()

    def get_recipient_by_email(self, email):
        self.curs.execute("SELECT * FROM recipient WHERE email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one

    def get_admin_by_email(self, email):
        self.curs.execute("SELECT * FROM admin WHERE email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one

    def get_donor_by_venmo(self, venmo):
        self.curs.execute("SELECT * FROM donor WHERE venmo=%s", (venmo,))
        return self.curs.fetchone()  # We should never get more than one

    def get_week_old_donation_claims(self):
        utc_tz = pytz.timezone("UTC")
        utc_now = datetime.now(utc_tz)
        self.curs.execute("SELECT * FROM donation_claim \
                          WHERE created <= %s - INTERVAL '7 days' \
                          AND created > %s - INTERVAL '8 days' \
                          AND ACTIVE = FALSE", (utc_now, utc_now, ))
        return self.curs.fetchall()

    '''
        Only cancel if previously active (IE don't want to double cancel and double refund)
    '''
    def cancel_day_old_donatin_claims(self):
        utc_tz = pytz.timezone("UTC")
        utc_now = datetime.now(utc_tz)
        self.curs.execute("UPDATE donation_claim SET active = FALSE \
                           WHERE active = TRUE AND \
                           pickup_time  + INTERVAL '1 days' < %s \
                           RETURNING *", (utc_now, ))
        return self.curs.fetchall()

    def cancel_order(self, order_id, canceled_by = None):
        if (canceled_by):
            self.curs.execute("UPDATE donation_claim SET active = FALSE, canceled_by = %s where id = %s",(canceled_by, order_id))
        else:
            self.curs.execute("UPDATE donation_claim SET active = FALSE where id = %s",(order_id,))

    def refresh_recipeint_credits(self):
        self.curs.execute("WITH old_recipients AS ( \
                                SELECT email, available_credits \
                                FROM recipient \
                            ), new_recipients AS ( \
                                UPDATE recipient \
                                SET available_credits = credit_limit \
                                WHERE available_credits != credit_limit \
                                RETURNING email, available_credits, credit_limit \
                            ) \
                            SELECT \
                                email, \
                                old_recipients.available_credits as previous_credits, \
                                new_recipients.available_credits, \
                                new_recipients.credit_limit \
                            FROM new_recipients \
                            JOIN old_recipients \
                            USING (email) \
                            WHERE new_recipients.available_credits IS NOT NULL;")
        return self.curs.fetchall()

    def restaurant_credit_cancel(self, restaurant_id, amount):
        self.curs.execute("UPDATE restaurant SET available_credits=available_credits + %s \
                            WHERE id=%s", (amount, restaurant_id))
    
    def recipient_credit_cancel(self, recipient_email, amount):
        self.curs.execute("UPDATE recipient SET available_credits=available_credits + %s \
                            WHERE email=%s", (amount, recipient_email))

    def update_recipient_credits(self, available_credits, email):
        self.curs.execute(
            "UPDATE recipient SET available_credits=%s WHERE email=%s", (available_credits, email))

    def update_recipient_extra_credits(self, extra_credits, email):
        self.curs.execute(
            "UPDATE recipient SET extra_credits=%s WHERE email=%s", (extra_credits, email))

    def update_recipient_responses(self, email, responses):
        self.curs.execute(
            "UPDATE recipient SET responses=%s WHERE email=%s", (responses, email))

    def get_recipient_responses(self, email):
        self.curs.execute("SELECT responses FROM recipient WHERE email=%s", (email,))
        recipient_responses = self.curs.fetchone()
        if recipient_responses != None:
            return recipient_responses[0]
        return recipient_responses

    def get_recipient_available_credits(self, email):
        self.curs.execute(
            "SELECT available_credits, credit_limit, extra_credits FROM recipient WHERE email = %s", (email, ))
        return self.curs.fetchone()

    def update_restaurant_credits(self, available_credits, restaurant_id):
        self.curs.execute("UPDATE restaurant SET available_credits=%s WHERE id=%s",
                          (available_credits, restaurant_id))

    def get_restaurant_credits(self, restaurant_id):
        self.curs.execute(
            "SELECT available_credits FROM restaurant WHERE id=%s", (restaurant_id,))
        return self.curs.fetchone()

    def set_availability(self, available):
        self.curs.execute("UPDATE restaurant SET available = %s WHERE id = %s",
                          (available, self.get_restaurant_id_from_user_info()))

    def set_hours(self, times):
        self.curs.execute("UPDATE restaurant SET operating_hours = %s  WHERE id = %s",
                         (times, self.get_restaurant_id_from_user_info()))


    def create_feed_item(self, feed_item_type, msg, amount):
        self.curs.execute("INSERT INTO feed_item (feed_item_type, msg, amount) VALUES (%s, %s, %s) RETURNING id",
                          (feed_item_type, msg, amount))
        return self.curs.fetchone()

    def get_feed_limited(self):
        self.curs.execute(
            "SELECT * FROM feed_item ORDER BY created ASC LIMIT 7")
        return self.curs.fetchall()

    def get_feed(self):
        self.curs.execute("SELECT * FROM feed_item")
        return self.curs.fetchall()

    def get_all_donations(self):
        self.curs.execute("SELECT * FROM donation")
        return self.curs.fetchall()

    def get_donation_by_feed_id(self, feed_id):
        self.curs.execute(
            "SELECT * FROM donation WHERE feed_item_id=%s", (feed_id,))
        return self.curs.fetchone()

    def get_donation_claim_by_feed_id(self, feed_id):
        self.curs.execute(
            "SELECT * FROM donation_claim WHERE feed_item_id=%s", (feed_id,))
        return self.curs.fetchone()

    def save_verification_code(self, email, code, expiresAt):
        self.curs.execute(
            "INSERT INTO email_otp (email, code, expiresAt) VALUES (%s, %s, %s)", (email, code, expiresAt))

    def verify_otp(self, email, otp):
        self.curs.execute(
            "SELECT * FROM email_otp WHERE email = %s AND code = %s AND expiresat > NOW()", (email, otp))
        row = self.curs.fetchone()
        if row is None:
            return False
        else:
            return True

    def is_signed_up(self, email):
        self.curs.execute("SELECT * FROM customer WHERE email = %s", (email, ))
        try:
            return self.curs.fetchone() is not None
        except:
            return False

    def set_donation_claim_verified(self, donation_claim_id):
        self.curs.execute(
            "UPDATE donation_claim SET verified=TRUE, active=FALSE WHERE id=%s", (donation_claim_id,))

    def get_donation_claim_by_id(self, donation_claim_id):
        self.curs.execute(
            "SELECT * FROM donation_claim WHERE id=%s", (donation_claim_id,))
        return self.curs.fetchone()


    def get_active_donation_claims(self, restaurant_id):
        self.curs.execute(
            "SELECT * FROM donation_claim WHERE restaurant_id = %s AND active=TRUE", (restaurant_id,))
        return self.curs.fetchall()

    def get_inactive_donation_claims(self, restaurant_id):
        self.curs.execute(
            "SELECT * FROM donation_claim WHERE restaurant_id = %s AND active=FALSE", (restaurant_id,))
        return self.curs.fetchall()

    def get_num_meals(self):
        self.curs.execute("SELECT sum(json_array_length(meal_items)) FROM donation_claim")
        return self.curs.fetchone()

    def get_num_restaurants(self):
        self.curs.execute("SELECT COUNT(*) FROM restaurant")
        return self.curs.fetchone()

    def get_num_donors(self):
        self.curs.execute("SELECT COUNT(*) FROM donor")
        return self.curs.fetchone()

    def get_num_recipients(self):
        self.curs.execute("SELECT COUNT(*) FROM recipient where approved=True")
        return self.curs.fetchone()
    
    def get_num_children(self):
        self.curs.execute("SELECT sum(COALESCE(num_children_18,0) + COALESCE(num_children_13,0))  FROM recipient where approved=True")
        return self.curs.fetchone()

    # SHOULD BE USED ONLY IN TESTING MODULES. DO NOT USE IN LIVE CODE.
    def insert_test_data(self, query):
        self.curs.execute(query)
        # return self.curs.fetchall()

    def insert_test_data_params(self, query, params):
        self.curs.execute(query, params)
        # return self.curs.fetchall()

    def fetchone_test_data(self, query):
        self.curs.execute(query)
        return self.curs.fetchone()

    def create_donation(self, feed_item_id, venmo_username, venmo_transaction_id, amount_left):
        self.curs.execute(
            "SELECT * FROM donation WHERE venmo_transaction_id=%s", (venmo_transaction_id,))
        donation_row = self.curs.fetchone()
        if donation_row == None:
            donor_row = self.get_donor_by_venmo(venmo_username)
            if donor_row == None:
                self.curs.execute("INSERT INTO donation (feed_item_id, venmo_username, venmo_transaction_id, amount_left) VALUES (%s, %s, %s, %s) RETURNING id",
                                  (feed_item_id, venmo_username, venmo_transaction_id, amount_left))
            else:
                self.curs.execute("INSERT INTO donation (feed_item_id, venmo_username, venmo_transaction_id, amount_left, donor_email) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                                  (feed_item_id, venmo_username, venmo_transaction_id, amount_left, getattr(donor_row, "email")))

    def get_donation(self, venmo_transaction_id):
        self.curs.execute(
            "SELECT * FROM donation WHERE venmo_transaction_id=%s", (venmo_transaction_id,))
        return self.curs.fetchone()

    def get_past_orders_by_recipient(self, email):
        self.curs.execute("select row_to_json(row) from (SELECT * FROM donation_claim WHERE recipient_email = %s ORDER BY created DESC) row;",
                          (email,))
        return self.curs.fetchall()

    def get_restaurant_id_from_user_info(self):
        self.curs.execute(
            "SELECT id FROM restaurant WHERE email = %s", (g.email,))
        return getattr(self.curs.fetchone(), "id")

    def get_restaurant_id_from_email(self, email):
        self.curs.execute(
            "SELECT id FROM restaurant WHERE email = %s", (email,))
        return getattr(self.curs.fetchone(), "id")

    def get_recipient_approval_status(self, email):
        self.curs.execute("SELECT approved FROM recipient WHERE email = %s", (email,))
        row = self.curs.fetchone()
        if row == None:
            return False
        return row[0]

    def get_restaurant_phones(self):
        self.curs.execute("SELECT restaurant.id, customer.email, customer.phone \
                            FROM restaurant \
                            LEFT JOIN customer \
                            USING (email)")
        return self.curs.fetchall()
    
    def get_recipient_phones(self):
        self.curs.execute("SELECT recipient.id, customer.email, customer.phone \
                            FROM recipient \
                            LEFT JOIN customer \
                            USING (email)")
        return self.curs.fetchall()

    def add_menu_item(self, menu_item):
        self.curs.execute("INSERT INTO menu_item (restaurant_id, name, description, imageUrl, baseCost, "
                          "category, customizations, available) "
                          "VALUES (%s, %s, %s, %s, %s, %s, %s, True) RETURNING id",
                          (self.get_restaurant_id_from_user_info(), menu_item["name"], menu_item["description"],
                           menu_item["imageUrl"], menu_item["baseCost"], menu_item["category"], []))
        return self.curs.fetchone()

    def delete_menu_item(self, menu_item_id):
        self.curs.execute("DELETE FROM menu_item WHERE restaurant_id = %s AND id = %s",
                          (self.get_restaurant_id_from_user_info(), menu_item_id, ))

    def update_menu_item(self, menu_item_id, updated_menu_item):
        self.curs.execute("UPDATE menu_item SET name = %s, description = %s, imageUrl = %s, baseCost = %s, "
                          "category = %s, customizations = %s, available = %s "
                          "WHERE restaurant_id = %s AND id = %s",
                          (updated_menu_item["name"], updated_menu_item["description"], updated_menu_item["imageUrl"],
                           updated_menu_item["baseCost"], updated_menu_item["category"], updated_menu_item[
                               'customizations'], updated_menu_item['available'],
                           self.get_restaurant_id_from_user_info(), menu_item_id))

    # def get_all_menu_items_for_restaurant(self):
    #     self.curs.execute("SELECT * FROM menu_item WHERE restaurant_id = %s", (self.get_restaurant_id_from_user_info(),))
    #     return self.curs.fetchall()

    def get_all_menu_items(self, restaurant_id, bottom=0):
        self.curs.execute(
            "SELECT * FROM menu_item WHERE restaurant_id = %s AND id > %s LIMIT 49", (restaurant_id, bottom))
        return self.curs.fetchall()

    def get_menu_item_price(self, restaurant_id, item_id):
        try:
            self.curs.execute(
                "SELECT * FROM menu_item WHERE restaurant_id = %s AND id = %s", (restaurant_id, item_id))
            return getattr(self.curs.fetchone(), "basecost")
        except Exception as e:
            return None

    def get_menu_item_price_open(self, item_id):
        try:
            self.curs.execute("SELECT * FROM menu_item WHERE id = %s",
                              (item_id, ))
            return getattr(self.curs.fetchone(), "basecost")
        except Exception as e:
            print(e)
            return None

    def add_menu_item_testing(self, itemid, rest_id, menu_item):
        self.curs.execute("INSERT INTO menu_item (id, restaurant_id, name, description, imageUrl, baseCost, "
                          "category, customizations, available) "
                          "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, True) RETURNING id",
                          (itemid, rest_id, menu_item["name"], menu_item["description"],
                           menu_item["imageUrl"], menu_item["baseCost"], menu_item["category"], []))
        id = self.curs.fetchone()
        self.commit()
        self.curs.execute("SELECT * FROM menu_item")
        print(self.curs.fetchall())
        return id

    def get_distribution_total(self):
        self.curs.execute("SELECT SUM(distributed_credits) FROM distribution")
        return self.curs.fetchone()

    def create_distribution(self, distributed_credits, restaurants_json):
        self.curs.execute("INSERT INTO distribution (distributed_credits, restaurants) VALUES (%s, %s)",
                          (distributed_credits, restaurants_json))

    def update_id(self, email, image_url):
        self.curs.execute("UPDATE recipient SET image_url=%s WHERE email=%s", (image_url, email))

    def get_otp_email(self, code):
        self.curs.execute(
            "SELECT email FROM email_otp WHERE code = %s", (code,))
        return self.curs.fetchone()

    def get_role(self, email):
        restaurant_row = self.get_restaurant_by_email(email)
        if restaurant_row != None:
            return "Business"
        recipient_row = self.get_recipient_by_email(email)
        if recipient_row != None:
            return "Recipient"
        donor_row = self.get_donor_by_email(email)
        if donor_row != None:
            return "Donor"
        admin_row = self.get_admin_by_email(email)
        if admin_row != None:
            return "Admin"
        return None

    def log(self, email, category, message):
        utc_tz = pytz.timezone("UTC")
        utc_now = datetime.now(utc_tz)
        self.curs.execute("INSERT INTO logger (email, time, category, message) VALUES (%s, %s, %s, %s)",
                          (email, utc_now, category, message))


    def restaurant_recipient_refund(self, order):
        # refund restaurant and recipient, with logging to confirm
        restaurant_id = getattr(order, 'restaurant_id')
        recipient_email = getattr(order, 'recipient_email')
        amount = getattr(order, 'amount')
        restaurant = self.get_restaurant(restaurant_id)

        restaurant_credits_before = getattr(restaurant, 'available_credits')
        recipient_credits_before = getattr(self.get_recipient_by_email(recipient_email), 'available_credits')

        self.restaurant_credit_cancel(restaurant_id, amount)
        self.recipient_credit_cancel(recipient_email, amount)

        recipient_credits_after = getattr(self.get_recipient_by_email(recipient_email), 'available_credits')
        restaurant_credits_after = getattr(self.get_restaurant_credits(restaurant_id), 'available_credits')

        self.log(getattr(restaurant, 'email'), "cancel", "cancel #%s: restaurant credit: %s -> %s" %(getattr(order, 'id'), restaurant_credits_before, restaurant_credits_after))
        self.log(recipient_email, "cancel", "cancel #%s: recipient credit: %s -> %s" %(getattr(order, 'id'), recipient_credits_before, recipient_credits_after))

        return {
            "recipient_credit": recipient_credits_after,
            "restaurant_credit": restaurant_credits_after
        }

    def get_diner_by_email(self, email):
        self.curs.execute("SELECT c.name, c.email, c.phone, r.image_url FROM customer c LEFT JOIN recipient r ON c.email = r.email WHERE c.email=%s", (email,))
        return self.curs.fetchone()  # We should never get more than one
