#!/usr/bin/env python3
"""
Daily Reminder App Backend API Test Suite
Tests all backend API functionality including authentication, reminders, and todos.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.jwt_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test GET /api/health endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_test("Health Check", True, "API is healthy and responding")
                    return True
                else:
                    self.log_test("Health Check", False, "Invalid health response format", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test POST /api/auth/register endpoint"""
        try:
            # Generate unique email to avoid conflicts
            unique_id = str(uuid.uuid4())[:8]
            user_data = {
                "full_name": "Sarah Johnson",
                "email": f"sarah.johnson.{unique_id}@example.com",
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{API_BASE}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.jwt_token = data["access_token"]
                    self.user_data = user_data
                    self.session.headers.update({"Authorization": f"Bearer {self.jwt_token}"})
                    self.log_test("User Registration", True, f"User registered successfully: {data['user']['email']}")
                    return True
                else:
                    self.log_test("User Registration", False, "Invalid registration response format", data)
                    return False
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("User Registration", False, f"Registration error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test POST /api/auth/login endpoint"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False
            
        try:
            login_data = {
                "email": self.user_data["email"],
                "password": self.user_data["password"]
            }
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    # Update token in case it's different
                    self.jwt_token = data["access_token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.jwt_token}"})
                    self.log_test("User Login", True, f"Login successful for: {data['user']['email']}")
                    return True
                else:
                    self.log_test("User Login", False, "Invalid login response format", data)
                    return False
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("User Login", False, f"Login error: {str(e)}")
            return False
    
    def test_get_current_user(self):
        """Test GET /api/auth/me endpoint"""
        if not self.jwt_token:
            self.log_test("Get Current User", False, "No JWT token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "email" in data and "full_name" in data:
                    self.log_test("Get Current User", True, f"User info retrieved: {data['full_name']} ({data['email']})")
                    return True
                else:
                    self.log_test("Get Current User", False, "Invalid user info response format", data)
                    return False
            else:
                self.log_test("Get Current User", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Current User", False, f"Get user error: {str(e)}")
            return False
    
    def test_get_reminders_empty(self):
        """Test GET /api/reminders endpoint (should be empty initially)"""
        if not self.jwt_token:
            self.log_test("Get Reminders (Empty)", False, "No JWT token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/reminders")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Reminders (Empty)", True, f"Retrieved {len(data)} reminders (expected empty)")
                    return True
                else:
                    self.log_test("Get Reminders (Empty)", False, "Invalid reminders response format", data)
                    return False
            else:
                self.log_test("Get Reminders (Empty)", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Reminders (Empty)", False, f"Get reminders error: {str(e)}")
            return False
    
    def test_get_todos_empty(self):
        """Test GET /api/todos endpoint (should be empty initially)"""
        if not self.jwt_token:
            self.log_test("Get Todos (Empty)", False, "No JWT token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/todos")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Todos (Empty)", True, f"Retrieved {len(data)} todos (expected empty)")
                    return True
                else:
                    self.log_test("Get Todos (Empty)", False, "Invalid todos response format", data)
                    return False
            else:
                self.log_test("Get Todos (Empty)", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Todos (Empty)", False, f"Get todos error: {str(e)}")
            return False
    
    def test_create_reminder(self):
        """Test POST /api/reminders endpoint"""
        if not self.jwt_token:
            self.log_test("Create Reminder", False, "No JWT token available")
            return False
            
        try:
            # Create a reminder for tomorrow
            tomorrow = datetime.now() + timedelta(days=1)
            reminder_data = {
                "title": "Team Meeting with Product Manager",
                "description": "Discuss Q1 roadmap and feature priorities for the Daily Reminder App",
                "datetime": tomorrow.isoformat(),
                "priority": "High"
            }
            
            response = self.session.post(f"{API_BASE}/reminders", json=reminder_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "reminder" in data:
                    reminder = data["reminder"]
                    self.log_test("Create Reminder", True, f"Reminder created: '{reminder['title']}' (Priority: {reminder['priority']})")
                    return True
                else:
                    self.log_test("Create Reminder", False, "Invalid create reminder response format", data)
                    return False
            else:
                self.log_test("Create Reminder", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Create Reminder", False, f"Create reminder error: {str(e)}")
            return False
    
    def test_create_todo(self):
        """Test POST /api/todos endpoint"""
        if not self.jwt_token:
            self.log_test("Create Todo", False, "No JWT token available")
            return False
            
        try:
            todo_data = {
                "title": "Review API documentation and update endpoints",
                "description": "Go through all API endpoints and ensure documentation is up to date with latest changes",
                "completed": False
            }
            
            response = self.session.post(f"{API_BASE}/todos", json=todo_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "todo" in data:
                    todo = data["todo"]
                    self.log_test("Create Todo", True, f"Todo created: '{todo['title']}' (Completed: {todo['completed']})")
                    return True
                else:
                    self.log_test("Create Todo", False, "Invalid create todo response format", data)
                    return False
            else:
                self.log_test("Create Todo", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Create Todo", False, f"Create todo error: {str(e)}")
            return False
    
    def test_get_reminders_with_data(self):
        """Test GET /api/reminders endpoint (should have data now)"""
        if not self.jwt_token:
            self.log_test("Get Reminders (With Data)", False, "No JWT token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/reminders")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    reminder = data[0]
                    if "title" in reminder and "priority" in reminder:
                        self.log_test("Get Reminders (With Data)", True, f"Retrieved {len(data)} reminder(s): '{reminder['title']}'")
                        return True
                    else:
                        self.log_test("Get Reminders (With Data)", False, "Invalid reminder data structure", reminder)
                        return False
                else:
                    self.log_test("Get Reminders (With Data)", False, f"Expected reminders but got {len(data) if isinstance(data, list) else 'invalid format'}")
                    return False
            else:
                self.log_test("Get Reminders (With Data)", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Reminders (With Data)", False, f"Get reminders error: {str(e)}")
            return False
    
    def test_get_todos_with_data(self):
        """Test GET /api/todos endpoint (should have data now)"""
        if not self.jwt_token:
            self.log_test("Get Todos (With Data)", False, "No JWT token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/todos")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    todo = data[0]
                    if "title" in todo and "completed" in todo:
                        self.log_test("Get Todos (With Data)", True, f"Retrieved {len(data)} todo(s): '{todo['title']}'")
                        return True
                    else:
                        self.log_test("Get Todos (With Data)", False, "Invalid todo data structure", todo)
                        return False
                else:
                    self.log_test("Get Todos (With Data)", False, f"Expected todos but got {len(data) if isinstance(data, list) else 'invalid format'}")
                    return False
            else:
                self.log_test("Get Todos (With Data)", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Todos (With Data)", False, f"Get todos error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests in sequence"""
        print("=" * 60)
        print("Daily Reminder App - Backend API Test Suite")
        print("=" * 60)
        print(f"Testing API at: {API_BASE}")
        print()
        
        # Test sequence as specified in the review request
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_get_reminders_empty,
            self.test_get_todos_empty,
            self.test_create_reminder,
            self.test_create_todo,
            self.test_get_reminders_with_data,
            self.test_get_todos_with_data
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            if test():
                passed += 1
            else:
                failed += 1
            print()  # Add spacing between tests
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {passed + failed}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
        
        if failed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"- {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)