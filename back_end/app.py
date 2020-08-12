from social import get_feed
from customer import (
    update_password,
    reset_password,
    verify_otp,
    get_customer,
    generate_otp,
)
from recipient import (
    get_available_credits,
    get_order_history,
    get_responses,
    update_responses,
    update_id,
    get_approval
)
from menu import (
    add_menu_item,
    update_menu_item,
    delete_menu_item,
    get_all_menu_items,
    upload_item_photo_to_s3
)
from authentication import (
    sign_up_customer,
    sign_up_recipient,
    sign_up_restaurant,
    sign_up_donor,
    sign_up_diner,
    # is_signed_up,
    login
)
from restaurant import (
    get_restaurants,
    restaurant_get,
    create_donation_claim,
    verify_pickup_code,
    get_active_donation_claims,
    get_inactive_donation_claims,
    get_restaurant_id,
    restaurant_set_availability,
    cancel_order
)
from admin import (
    get_all_recipients,
    edit_recipient,
    set_recipient_approval,
    get_logger
)
from metric import (
    get_all_metrics,
    get_money_claimed,
    get_money_donated,
    get_num_donors,
    get_num_meals,
    get_num_recipients,
    get_num_restaurants
)
from sms import (
    sms_control
)
from payment import create_donation
from flask import Flask, jsonify, request, render_template, g
from flask_jwt_extended import JWTManager, jwt_required, decode_token
from flask_cors import CORS

app = Flask(__name__)  # Initialize Flask app
CORS(app)

# authentication
app.add_url_rule("/api/login",               view_func=login,                 methods=["POST"])
app.add_url_rule('/api/signup/customer',     view_func=sign_up_customer,      methods=['POST'])
app.add_url_rule("/api/signup/donor",        view_func=sign_up_donor,         methods=["POST"])
app.add_url_rule("/api/signup/recipient",    view_func=sign_up_recipient,     methods=["POST"])
app.add_url_rule("/api/signup/restaurant",   view_func=sign_up_restaurant,    methods=["POST"])
app.add_url_rule("/api/signup/diner",        view_func=sign_up_diner,         methods=["POST"])

# customer
app.add_url_rule("/api/customer",                       view_func=get_customer,    methods=["GET"])
app.add_url_rule("/api/customer/password",              view_func=update_password, methods=["POST"])
app.add_url_rule("/api/customer/password/generate-otp", view_func=generate_otp,    methods=["POST"])
app.add_url_rule("/api/customer/password/verify-otp",   view_func=verify_otp,      methods=["POST"])
app.add_url_rule("/api/customer/password/reset",        view_func=reset_password,  methods=["POST"])

# recipient
app.add_url_rule('/api/recipient/approval',  view_func=get_approval,          methods=['GET'])
app.add_url_rule('/api/recipient/credits',   view_func=get_available_credits, methods=['GET'])
app.add_url_rule('/api/recipient/orders',    view_func=get_order_history,     methods=['GET'])
app.add_url_rule("/api/recipient/responses", view_func=get_responses,         methods=["GET"])
app.add_url_rule("/api/recipient/responses", view_func=update_responses,      methods=["POST"])
app.add_url_rule('/api/recipient/upload-id', view_func=update_id,             methods=['POST'])

# sms
app.add_url_rule('/api/sms-control',                                 view_func=sms_control,                  methods=['POST'])

# restaurant
app.add_url_rule('/api/restaurant',                                  view_func=get_restaurants,              methods=['GET'])
app.add_url_rule('/api/restaurant/<restaurant_id>',                  view_func=restaurant_get,               methods=['GET'])   # might need to change function name
app.add_url_rule('/api/restaurant/<restaurant_id>/order',            view_func=create_donation_claim,        methods=['POST'])
app.add_url_rule('/api/restaurant/<restaurant_id>/order/<order_id>', view_func=verify_pickup_code,           methods=['POST'])
app.add_url_rule('/api/restaurant/<restaurant_id>/active',           view_func=get_active_donation_claims,   methods=['GET'])
app.add_url_rule('/api/restaurant/<restaurant_id>/inactive',         view_func=get_inactive_donation_claims, methods=['GET'])
app.add_url_rule('/api/restaurant/id',                               view_func=get_restaurant_id,            methods=['GET'])
app.add_url_rule('/api/restaurant/available',                        view_func=restaurant_set_availability,  methods=['POST'])
app.add_url_rule('/api/restaurant/cancel/<order_id>',                view_func=cancel_order,                 methods=['DELETE'])

# menu
app.add_url_rule('/api/menu/<restaurant_id>',     view_func=get_all_menu_items,         methods=['GET'])
app.add_url_rule('/api/menu/add',                 view_func=add_menu_item,              methods=['POST'])
app.add_url_rule('/api/menu/update',              view_func=update_menu_item,           methods=['PUT'])
app.add_url_rule('/api/menu/delete',              view_func=delete_menu_item,           methods=['POST'])

# social
app.add_url_rule('/api/social/feed',              view_func=get_feed,                   methods=['GET'])

# metric
app.add_url_rule('/api/metric',                   view_func=get_all_metrics,            methods=['GET'])
app.add_url_rule('/api/metric/money-claimed',     view_func=get_money_claimed,          methods=['GET'])
app.add_url_rule('/api/metric/money-donated',     view_func=get_money_donated,          methods=['GET'])  # total donations
app.add_url_rule('/api/metric/num-donors',        view_func=get_num_donors,             methods=['GET'])
app.add_url_rule('/api/metric/num-meals',         view_func=get_num_meals,              methods=['GET'])  # total meals
app.add_url_rule('/api/metric/num-recipients',    view_func=get_num_recipients,         methods=['GET'])  # total requestors
app.add_url_rule('/api/metric/num-restaurants',   view_func=get_num_restaurants,        methods=['GET'])

# image upload
app.add_url_rule('/api/upload_image_url',         view_func=upload_item_photo_to_s3,    methods=['POST'])

# payment
app.add_url_rule('/api/payment',                  view_func=create_donation,            methods=['POST'])

# admin
app.add_url_rule('/api/admin/recipients',         view_func=get_all_recipients,         methods=['GET'])
app.add_url_rule('/api/admin/edit-recipient',     view_func=edit_recipient,             methods=['PUT'])
app.add_url_rule('/api/admin/recipient-approval', view_func=set_recipient_approval,     methods=['PUT'])
app.add_url_rule('/api/admin/log',                view_func=get_logger,                 methods=['GET'])


# middleware
@app.before_request
def parse_jwt():
    if request.headers.has_key("AUTH_TOKEN"):
        authToken = request.headers["AUTH_TOKEN"]
        try:
            loginInfo = decode_token(authToken[7:])
            g.email = loginInfo['identity'][0]
            g.user_type = loginInfo['identity'][1]
            g.logged_in = True
        except Exception:
            g.logged_in = False
    elif "DEBUG_TOKEN" in app.config and app.config["DEBUG_TOKEN"]:
        g.email = app.config["DEBUG_EMAIL"]
        g.user_type = app.config["DEBUG_USER_TYPE"]
        g.logged_in = app.config["DEBUG_LOGGED_IN"]
    else:
        g.logged_in = False


if __name__ == "__main__":
    app.run()
