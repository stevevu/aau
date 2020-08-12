import datetime
import re
import random
import names
import sys
import os
import json
import mail
import smtplib
import phonenumbers

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app as app, g
from flask import jsonify, request, Response
from flask_jwt_extended import create_access_token, get_jwt_identity
from flask_mail import Mail, Message
from pg.pginstance import PgInstance
from passlib.hash import bcrypt
from validate_email import validate_email

jwt_lifespan_minutes = 360
contact_open_meal = 'Ooops! Something went wrong on our end.  Please contact hello@openmeal.org for assistance.'


def hash_password(password):
    return bcrypt.hash(password)


def verify_password(password, password_hash):
    return bcrypt.verify(password, password_hash)


def generate_code(length):
    code = ""
    for _ in range(0, length):
        code += str(random.randint(0, 9))
    return code


def validate_password(password):
    if re.match(r'[A-Za-z0-9@#$%^&+=]{8,32}', password):
        return None
    else:
        return "must between 8 and 32 characters and contain alphanumeric characters or @#$%^&+="

def sign_up_diner():
    name, email, phone, password, image_url = \
        (request.json[field] for field in ('name', 'email', 'phone', 'password', 'imageURL')) 

    # validate data
    # (already done on front end but 2nd level of safety here in case FE/BE mismatch)
    validation_errors = []
    if not validate_email(email):  # , verify=True):
        validation_errors.append("Invalid Email")
    if len(name) < 1 or len(name) > 72:
        validation_errors.append("Name must be between 1 and 72 characters")
    if not phonenumbers.is_valid_number(phonenumbers.parse("+1" + str(phone), None)):
        validation_errors.append("Invalid phone number")
    if validate_password(password) != None:
        validation_errors.append("Invalid password")
    if not image_url:
        validation_errors.append("No image provided")

    if len(validation_errors) > 0:
        err = " | ".join(validation_errors)
        return jsonify({"error": err, "errorMessage": err}), 400
    
    db = PgInstance()
    err = db.connect()
    if err != None:
        print("ERROR: could not connect to database trying to sign up diner:\n", err)
        return jsonify({"error": err, "errorMessage": contact_open_meal}), 500

    # create Customer
    err = db.create_customer(email.lower(), name, [phone],hash_password(password))  # by default single phone #, only restaurants should have multiple
    err_source = "customer"

    if not err:
        # create Recipient
        err = status = db.create_recipient(email, image_url)
        err_source = "recipient"

    db.disconnect()
    if not err:
        return jsonify({ "success": "Diner successfully created" }), 201
        #return jsonify({"token": "Bearer " + create_access_token(identity=[email, "Recipient"], expires_delta=datetime.timedelta(minutes=jwt_lifespan_minutes))}), 201
    else:    
        return jsonify({"error": f"{err} ({err_source} table)", "errorMessage": err}), 400

def sign_up_customer():
    # Create customer
    errors = {}
    # email sanitization
    if not validate_email(request.json["email"]):  # , verify=True):
        errors["email"] = "must be valid"
    # name sanitization
    name = request.json["name"]
    if len(name) < 1 or len(name) > 72:
        errors["name"] = "must be between 1 and 72 characters"
    # phone sanitization
    phone = request.json["phone"]
    if not phonenumbers.is_valid_number(phonenumbers.parse("+1" + str(phone), None)):
        errors["phone"] = "must be valid"
    if len(errors) > 0:
        return jsonify(errors), 400

    db = PgInstance()
    err = db.connect()
    if err != None:
        print(err)
        return jsonify({"error": "could not connect to database"}), 500
    err = db.create_customer(request.json["email"].lower(), request.json["name"], [phone], False)  # by default single phone #, only restaurants should have multiple
    db.disconnect()
    if err != None:
        return {"error": err}, 401

    return get_otp(request.json["email"])


def sign_up_recipient():
    db = PgInstance()
    err = db.connect()
    if err is not None:
        print(err)
        return jsonify({
            "error": "could not connect to database",
            "errorMessage:": contact_open_meal
        }), 500

    # # verify email
    # otp_record = db.get_otp_email(request.json["otp"])
    # if otp_record == None:
    #     db.disconnect()
    #     return jsonify({"error": "invalid email"}), 400
    # email = getattr(otp_record, "email")
    # print(otp_record)
    # verify otp
    email = request.json["email"]
    valid_otp = db.verify_otp(request.json["email"], request.json["otp"])
    if not valid_otp:
        db.disconnect()
        return jsonify({
            "error": "invalid otp",
            "errorMessage": "Incorrect one-time password.  Please try again."
        }), 400
    # create recipient
    print(request.json)
    err = db.create_recipient(email)
    if err != None:
        db.disconnect()
        return jsonify({
            "error": err,
            "errorMessage": contact_open_meal
        }), 400

    db.disconnect()
    return jsonify({"token": "Bearer " + create_access_token(identity=[email, "Recipient"], expires_delta=datetime.timedelta(minutes=jwt_lifespan_minutes))}), 201

# To-do: Fix


def sign_up_donor():
    db = PgInstance()
    err = db.connect()
    if err is not None:
        print(err)
        return jsonify({"error": "could not connect to database"}), 500

    # verify email
    otp_record = db.get_otp_email(request.json["otp"])
    if otp_record == None:
        db.disconnect()
        return jsonify({"error": "invalid email"}), 400
    email = getattr(otp_record, "email")
    print(otp_record)
    # verify otp
    valid_otp = db.verify_otp(email, request.json["otp"])
    if not valid_otp:
        db.disconnect()
        return jsonify({"error": "invalid otp"}), 400
    # create recipient
    print(request.json)
    err = db.create_recipient(email)
    if err != None:
        db.disconnect()
        return jsonify({"error": err}), 400

    db.disconnect()
    return jsonify({"token": "Bearer " + create_access_token(identity=[email, "Donor"], expires_delta=datetime.timedelta(minutes=jwt_lifespan_minutes))}), 201


def sign_up_restaurant():
    restaurant_name, address, name, email, phone = \
        (request.json[field] for field in ('restaurantName', 'restaurantAddress', 'name', 'email', 'phone'))

    validation_errors = []
    if len(restaurant_name) < 1 or len(restaurant_name) > 72:
        validation_errors.append("Restaurant Name must be between 1 and 72 characters")
    # better address validation?
    if len(name) < 1 or len(name) > 72:
        validation_errors.append("Must be a valid US address")
    if len(name) < 1 or len(name) > 72:
        validation_errors.append("Name must be between 1 and 72 characters")
    if not validate_email(email):
        validation_errors.append("Invalid Email")
    if not phonenumbers.is_valid_number(phonenumbers.parse("+1" + str(phone), None)):
        validation_errors.append("Invalid phone number")

    if len(validation_errors) > 0:
        err = " | ".join(validation_errors)
        return jsonify({"error": err, "errorMessage": err}), 400

    db = PgInstance()
    err = db.connect()
    if err != None:
        print("ERROR: could not connect to database trying to sign up restaurant:\n", err)
        return jsonify({"error": err, "errorMessage": contact_open_meal}), 500

    # create Customer
    err = db.create_customer(email.lower(), name, [phone], hash_password("password"), False)
    err_source = "customer"

    if not err:
        # create Restaurant
        err = db.create_restaurant(email, address, restaurant_name)
        err_source = "restaurant"

    db.disconnect()
    if not err:
        return jsonify({"token": "Bearer " + create_access_token(identity=[email, "Business"], expires_delta=datetime.timedelta(minutes=jwt_lifespan_minutes))}), 201
    else:
        return jsonify({"error": err + " (" + err_source + " table)", "errorMessage": err}), 400


def send_email(to_addr, subject, body):
    try:
        sender = "openmealio@outlook.com"
        receiver = to_addr if type(to_addr) is list else [to_addr]
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = ','.join(to_addr) if type(to_addr) is list else to_addr
        msg['Subject'] = subject
        message = body
        msg.attach(MIMEText(message))

        session = smtplib.SMTP('smtp.office365.com', 587)
        session.ehlo()
        session.starttls()
        session.ehlo()
        session.login(sender, 'Openme@li0')
        session.sendmail(sender, receiver, msg.as_string())
        session.quit()
    except Exception as e:
        print("Error: %s" % e.__class__)
        return {"error": str(e.__class__)}
    return None


def generate_otp():
    otp = names.get_first_name() + names.get_last_name()
    current_time = datetime.datetime.now(datetime.timezone.utc)
    expiration = current_time + datetime.timedelta(minutes=5)
    return otp, expiration


def get_otp(email, resetPassword=False):
    otp, expiration = generate_otp()

    # Create OTP
    db = PgInstance()
    err = db.connect()
    if err is not None:
        print(err)
        return jsonify({"error": "could not connect to database"}), 500
    db.save_verification_code(email, otp, expiration)
    db.disconnect()

    # Send the email
    title = "Welcome to OpenMeal!"
    if resetPassword:
        title = "OpenMeal: Reset Password"

    mail_sent = send_email(email, title, "Your one-time password is: " + otp)

    if mail_sent is not None:
        return jsonify(mail_sent), 535

    return jsonify({"general": "otp email sent"}), 201

def login():
    db = PgInstance()
    err = db.connect()
    if err is not None:
        print(err)
        return jsonify({"error": "could not connect to database"}), 500
    customer = db.get_customer_by_email(request.json["email"])

    if customer == None:
        db.disconnect()
        return jsonify({"error": "incorrect credentials"}), 403
    email = getattr(customer, "email")
    password_hash = getattr(customer, "password")
    correctPassword = verify_password(request.json["password"], password_hash)

    role = db.get_role(email)
    db.disconnect()

    if role == None:
        print(err)
        return jsonify({"error": "incorrect credentials"}), 403

    if correctPassword:
        return jsonify({"token": "Bearer " + create_access_token(identity=[email, role],
                                                                 expires_delta=datetime.timedelta(
                                                                 minutes=jwt_lifespan_minutes))}), 200
    return jsonify({"error": "incorrect credentials"}), 403
