#!/usr/bin/env python3
"""
Backend API Test Suite for THE ROOM BARBERIA Time Tracking App
Tests all authentication, time entry, and admin endpoints
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Optional

# Backend URL from frontend/.env
BASE_URL = "https://staff-hours-tracker-3.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDENTIALS = {"username": "marius", "password": "marius2025"}
EMPLOYEE_CREDENTIALS = {"username": "jessica", "password": "jessica2025"}
INVALID_CREDENTIALS = {"username": "invalid", "password": "wrongpass"}

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"{GREEN}✓{RESET} {test_name}")
    
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"{RED}✗{RESET} {test_name}")
        print(f"  {RED}Error: {error}{RESET}")
    
    def print_summary(self):
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}TEST SUMMARY{RESET}")
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"{GREEN}Passed: {self.passed}{RESET}")
        print(f"{RED}Failed: {self.failed}{RESET}")
        print(f"Total: {self.passed + self.failed}")
        
        if self.errors:
            print(f"\n{RED}Failed Tests:{RESET}")
            for error in self.errors:
                print(f"  - {error}")
        
        return self.failed == 0

results = TestResults()

# Store tokens and IDs for later tests
admin_token: Optional[str] = None
employee_token: Optional[str] = None
employee_user_id: Optional[str] = None
test_entry_id: Optional[str] = None
test_vacation_id: Optional[str] = None
new_user_id: Optional[str] = None


def test_auth_login_success():
    """Test successful login with admin credentials"""
    global admin_token
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                admin_token = data["access_token"]
                if data["user"]["role"] == "admin":
                    results.add_pass("Admin login successful")
                else:
                    results.add_fail("Admin login", "User role is not admin")
            else:
                results.add_fail("Admin login", "Missing access_token or user in response")
        else:
            results.add_fail("Admin login", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin login", str(e))


def test_auth_login_employee():
    """Test successful login with employee credentials"""
    global employee_token, employee_user_id
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=EMPLOYEE_CREDENTIALS)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                employee_token = data["access_token"]
                employee_user_id = data["user"]["id"]
                if data["user"]["role"] == "employee":
                    results.add_pass("Employee login successful")
                else:
                    results.add_fail("Employee login", "User role is not employee")
            else:
                results.add_fail("Employee login", "Missing access_token or user in response")
        else:
            results.add_fail("Employee login", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Employee login", str(e))


def test_auth_login_invalid():
    """Test login with invalid credentials"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=INVALID_CREDENTIALS)
        if response.status_code == 401:
            results.add_pass("Invalid login rejected (401)")
        else:
            results.add_fail("Invalid login", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.add_fail("Invalid login", str(e))


def test_auth_me():
    """Test GET /auth/me with valid token"""
    if not admin_token:
        results.add_fail("GET /auth/me", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if "username" in data and data["username"] == "marius":
                results.add_pass("GET /auth/me successful")
            else:
                results.add_fail("GET /auth/me", "Invalid user data returned")
        else:
            results.add_fail("GET /auth/me", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /auth/me", str(e))


def test_create_work_entry():
    """Test creating a work time entry"""
    global test_entry_id
    if not employee_token:
        results.add_fail("Create work entry", "No employee token available")
        return
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        entry_data = {
            "date": today,
            "hours": 8.0,
            "location": "Costabissara",
            "entry_type": "work",
            "comments": "Regular work day"
        }
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(f"{BASE_URL}/time-entries", json=entry_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data["entry_type"] == "work" and data["status"] == "approved":
                test_entry_id = data["id"]
                results.add_pass("Create work entry successful")
            else:
                results.add_fail("Create work entry", "Invalid response data")
        else:
            results.add_fail("Create work entry", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Create work entry", str(e))


def test_create_vacation_request():
    """Test creating a vacation request (should be pending)"""
    global test_vacation_id
    if not employee_token:
        results.add_fail("Create vacation request", "No employee token available")
        return
    
    try:
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        entry_data = {
            "date": future_date,
            "hours": 8.0,
            "location": "Costabissara",
            "entry_type": "vacation",
            "comments": "Vacation request"
        }
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(f"{BASE_URL}/time-entries", json=entry_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data["entry_type"] == "vacation" and data["status"] == "pending":
                test_vacation_id = data["id"]
                results.add_pass("Create vacation request successful (status: pending)")
            else:
                results.add_fail("Create vacation request", f"Expected status 'pending', got '{data.get('status')}'")
        else:
            results.add_fail("Create vacation request", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Create vacation request", str(e))


def test_create_sick_leave():
    """Test creating a sick leave entry"""
    if not employee_token:
        results.add_fail("Create sick leave", "No employee token available")
        return
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        entry_data = {
            "date": today,
            "hours": 8.0,
            "location": "Costabissara",
            "entry_type": "sick",
            "comments": "Sick day"
        }
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(f"{BASE_URL}/time-entries", json=entry_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data["entry_type"] == "sick" and data["status"] == "approved":
                results.add_pass("Create sick leave successful")
            else:
                results.add_fail("Create sick leave", "Invalid response data")
        else:
            results.add_fail("Create sick leave", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Create sick leave", str(e))


def test_get_time_entries():
    """Test getting time entries"""
    if not employee_token:
        results.add_fail("GET time entries", "No employee token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/time-entries", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results.add_pass("GET time entries successful")
            else:
                results.add_fail("GET time entries", "Expected non-empty list")
        else:
            results.add_fail("GET time entries", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET time entries", str(e))


def test_get_time_entries_by_month():
    """Test filtering time entries by month"""
    if not employee_token:
        results.add_fail("GET time entries by month", "No employee token available")
        return
    
    try:
        current_month = datetime.now().strftime("%Y-%m")
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/time-entries?month={current_month}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Check that all entries are from the current month
                all_correct_month = all(entry["date"].startswith(current_month) for entry in data)
                if all_correct_month:
                    results.add_pass("GET time entries by month successful")
                else:
                    results.add_fail("GET time entries by month", "Some entries not from requested month")
            else:
                results.add_fail("GET time entries by month", "Expected list response")
        else:
            results.add_fail("GET time entries by month", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET time entries by month", str(e))


def test_update_time_entry():
    """Test updating a time entry"""
    if not employee_token or not test_entry_id:
        results.add_fail("Update time entry", "No employee token or entry ID available")
        return
    
    try:
        update_data = {
            "hours": 7.5,
            "comments": "Updated work hours"
        }
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.put(f"{BASE_URL}/time-entries/{test_entry_id}", json=update_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data["hours"] == 7.5 and data["comments"] == "Updated work hours":
                results.add_pass("Update time entry successful")
            else:
                results.add_fail("Update time entry", "Entry not updated correctly")
        else:
            results.add_fail("Update time entry", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Update time entry", str(e))


def test_delete_time_entry():
    """Test deleting a time entry"""
    if not employee_token or not test_entry_id:
        results.add_fail("Delete time entry", "No employee token or entry ID available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.delete(f"{BASE_URL}/time-entries/{test_entry_id}", headers=headers)
        
        if response.status_code == 200:
            results.add_pass("Delete time entry successful")
        else:
            results.add_fail("Delete time entry", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Delete time entry", str(e))


def test_admin_get_users():
    """Test admin getting all users"""
    if not admin_token:
        results.add_fail("Admin GET users", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 6:  # At least 6 seeded users
                results.add_pass("Admin GET users successful")
            else:
                results.add_fail("Admin GET users", f"Expected list with at least 6 users, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            results.add_fail("Admin GET users", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin GET users", str(e))


def test_admin_create_user():
    """Test admin creating a new user"""
    global new_user_id
    if not admin_token:
        results.add_fail("Admin create user", "No admin token available")
        return
    
    try:
        new_user_data = {
            "name": "Marco Rossi",
            "username": "marco.rossi",
            "password": "marco2025",
            "role": "employee",
            "location_preference": "Vicenza Est"
        }
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/users", json=new_user_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and data["username"] == "marco.rossi":
                new_user_id = data["id"]
                results.add_pass("Admin create user successful")
            else:
                results.add_fail("Admin create user", "Invalid response data")
        else:
            results.add_fail("Admin create user", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin create user", str(e))


def test_employee_cannot_access_admin_routes():
    """Test that employee cannot access admin-only routes"""
    if not employee_token:
        results.add_fail("Employee permission check", "No employee token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try to access GET /users
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        if response.status_code == 403:
            results.add_pass("Employee blocked from GET /users (403)")
        else:
            results.add_fail("Employee permission check", f"Expected 403 for GET /users, got {response.status_code}")
            return
        
        # Try to access GET /approvals
        response = requests.get(f"{BASE_URL}/approvals", headers=headers)
        if response.status_code == 403:
            results.add_pass("Employee blocked from GET /approvals (403)")
        else:
            results.add_fail("Employee permission check", f"Expected 403 for GET /approvals, got {response.status_code}")
    except Exception as e:
        results.add_fail("Employee permission check", str(e))


def test_admin_get_approvals():
    """Test admin getting pending approvals"""
    if not admin_token:
        results.add_fail("Admin GET approvals", "No admin token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/approvals", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Should have at least the vacation request we created
                pending_count = len([e for e in data if e["status"] == "pending"])
                if pending_count > 0:
                    results.add_pass(f"Admin GET approvals successful ({pending_count} pending)")
                else:
                    results.add_pass("Admin GET approvals successful (0 pending)")
            else:
                results.add_fail("Admin GET approvals", "Expected list response")
        else:
            results.add_fail("Admin GET approvals", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin GET approvals", str(e))


def test_admin_approve_vacation():
    """Test admin approving a vacation request"""
    if not admin_token or not test_vacation_id:
        results.add_fail("Admin approve vacation", "No admin token or vacation ID available")
        return
    
    try:
        approval_data = {"status": "approved"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/approvals/{test_vacation_id}", json=approval_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data["status"] == "approved":
                results.add_pass("Admin approve vacation successful")
            else:
                results.add_fail("Admin approve vacation", f"Expected status 'approved', got '{data.get('status')}'")
        else:
            results.add_fail("Admin approve vacation", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin approve vacation", str(e))


def test_admin_reject_vacation():
    """Test admin rejecting a vacation request"""
    if not admin_token or not employee_token:
        results.add_fail("Admin reject vacation", "No admin or employee token available")
        return
    
    try:
        # First create a new vacation request
        future_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        entry_data = {
            "date": future_date,
            "hours": 8.0,
            "location": "Vicenza Est",
            "entry_type": "vacation",
            "comments": "Another vacation request"
        }
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(f"{BASE_URL}/time-entries", json=entry_data, headers=headers)
        
        if response.status_code != 200:
            results.add_fail("Admin reject vacation", "Failed to create vacation request for rejection test")
            return
        
        vacation_id = response.json()["id"]
        
        # Now reject it as admin
        approval_data = {"status": "rejected"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/approvals/{vacation_id}", json=approval_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data["status"] == "rejected":
                results.add_pass("Admin reject vacation successful")
            else:
                results.add_fail("Admin reject vacation", f"Expected status 'rejected', got '{data.get('status')}'")
        else:
            results.add_fail("Admin reject vacation", f"Status code {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin reject vacation", str(e))


def run_all_tests():
    """Run all backend API tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}THE ROOM BARBERIA - Backend API Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    print(f"{YELLOW}Testing Authentication...{RESET}")
    test_auth_login_success()
    test_auth_login_employee()
    test_auth_login_invalid()
    test_auth_me()
    
    print(f"\n{YELLOW}Testing Time Entries (Employee)...{RESET}")
    test_create_work_entry()
    test_create_vacation_request()
    test_create_sick_leave()
    test_get_time_entries()
    test_get_time_entries_by_month()
    test_update_time_entry()
    test_delete_time_entry()
    
    print(f"\n{YELLOW}Testing Admin Operations...{RESET}")
    test_admin_get_users()
    test_admin_create_user()
    test_employee_cannot_access_admin_routes()
    test_admin_get_approvals()
    test_admin_approve_vacation()
    test_admin_reject_vacation()
    
    # Print summary
    success = results.print_summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    import sys
    sys.exit(run_all_tests())
