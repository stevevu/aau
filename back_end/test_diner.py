import os
import subprocess
import sys

import pytest
import json
from app import app
from pg.pginstance import PgInstance

mimetype = 'application/json'
headers = {
    'Content-Type': mimetype,
    'Accept': mimetype
}


@pytest.fixture
def client():
    subprocess.run(['sh', 'pg/seed-local-tables.sh'])
    return app.test_client()

''' 
    Endpoints to test:
        POST     /api/signup/diner                     sign_up_diner
'''

'''
    /api/signup/diner 
'''
def test_add_diner_data():
    pass_data = {
      "name": "John Doe", 
      "email": "john.doe@example.com",
      "phone": "4155551234",
      "password": "mYp@55worD",
      "imageURL": "https://picsum.photos/seed/picsum/200/300",
    }
    fail_name_data = {**pass_data, **{"name": ""}}
    fail_phone_empty_data = {**pass_data, **{"phone": ""}}
    fail_phone_invalid_data = {**pass_data, **{"phone": "123-"}}
    fail_email_empty_data = {**pass_data, **{"email": ""}}
    fail_email_invalid_data = {**pass_data, **{"email": "john.doe"}}
    fail_password_data = {**pass_data, **{"password": ""}}
    fail_image_data = {**pass_data, **{"imageURL": ""}}
    fail_email_repeat_customer_data = {**pass_data, **{"email": "repeat_email_customer@example.com"}}
    return [
      (pass_data, 201, None),
      (fail_name_data, 400, "Name must be between 1 and 72 characters"),
      (fail_phone_empty_data, 400, "Invalid phone number"),
      (fail_phone_invalid_data, 400, "Invalid phone number"),
      (fail_email_empty_data, 400, "Invalid Email"),
      (fail_email_invalid_data, 400, "Invalid Email"),
      (fail_password_data, 400, "Invalid password"),
      (fail_image_data, 400, "No image provided"),
      (fail_email_repeat_customer_data, 400, "invalid email, already taken (customer table)")
    ]

@pytest.mark.parametrize('body, status, error_msg', test_add_diner_data())
def test_add_diner(client, body, error_msg, status):

    print(f"*** Inside test_add_diner ***")

    db = PgInstance()
    err = db.connect()
    assert err == None
    client = app.test_client()  # Redefine to get new config

    url = '/api/signup/diner'

    # test if existing email already exists in customer table by pre-inserting diner
    if body["email"] == "repeat_email_customer@example.com":
        client.post(url, data=json.dumps(body), headers=headers)    

    res = client.post(url, data=json.dumps(body), headers=headers)

    if res.json == None:
        return
    if "error" in res.json:
        assert res.json["error"] == error_msg
    else:
        assert "success" in res.json
        diner = db.get_diner_by_email(body["email"])
        assert body["name"] == getattr(diner, 'name')

    assert res.status_code == status
    assert res.content_type == mimetype

    db.disconnect()
