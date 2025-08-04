#!/usr/bin/env python3
"""
Extended Backend API Tests - Additional edge cases and error handling
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

def test_invalid_login():
    """Test login with invalid credentials"""
    print("Testing invalid login credentials...")
    
    session = requests.Session()
    login_data = {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    
    response = session.post(f"{API_BASE}/auth/login", json=login_data)
    
    if response.status_code == 401:
        print("✅ PASS: Invalid login correctly rejected with 401")
        return True
    else:
        print(f"❌ FAIL: Expected 401 but got {response.status_code}")
        return False

def test_unauthorized_access():
    """Test accessing protected endpoints without token"""
    print("Testing unauthorized access to protected endpoints...")
    
    session = requests.Session()
    
    # Test accessing user info without token
    response = session.get(f"{API_BASE}/auth/me")
    
    if response.status_code == 403:
        print("✅ PASS: Unauthorized access correctly rejected with 403")
        return True
    else:
        print(f"❌ FAIL: Expected 403 but got {response.status_code}")
        return False

def test_duplicate_registration():
    """Test registering with an existing email"""
    print("Testing duplicate user registration...")
    
    session = requests.Session()
    user_data = {
        "full_name": "Test User",
        "email": "duplicate@example.com",
        "password": "password123"
    }
    
    # First registration
    response1 = session.post(f"{API_BASE}/auth/register", json=user_data)
    
    # Second registration with same email
    response2 = session.post(f"{API_BASE}/auth/register", json=user_data)
    
    if response1.status_code == 200 and response2.status_code == 400:
        print("✅ PASS: Duplicate registration correctly rejected with 400")
        return True
    else:
        print(f"❌ FAIL: Expected first=200, second=400 but got {response1.status_code}, {response2.status_code}")
        return False

def test_invalid_reminder_data():
    """Test creating reminder with invalid data"""
    print("Testing reminder creation with invalid data...")
    
    # First, get a valid token
    session = requests.Session()
    user_data = {
        "full_name": "Test User",
        "email": "testreminder@example.com",
        "password": "password123"
    }
    
    reg_response = session.post(f"{API_BASE}/auth/register", json=user_data)
    if reg_response.status_code != 200:
        print("❌ FAIL: Could not register user for test")
        return False
    
    token = reg_response.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    # Test with missing required fields
    invalid_reminder = {
        "description": "Missing title and datetime"
    }
    
    response = session.post(f"{API_BASE}/reminders", json=invalid_reminder)
    
    if response.status_code == 422:  # Validation error
        print("✅ PASS: Invalid reminder data correctly rejected with 422")
        return True
    else:
        print(f"❌ FAIL: Expected 422 but got {response.status_code}")
        return False

def run_extended_tests():
    """Run all extended tests"""
    print("=" * 60)
    print("Daily Reminder App - Extended Backend API Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_invalid_login,
        test_unauthorized_access,
        test_duplicate_registration,
        test_invalid_reminder_data
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()
    
    print("=" * 60)
    print("EXTENDED TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    
    return failed == 0

if __name__ == "__main__":
    success = run_extended_tests()
    sys.exit(0 if success else 1)