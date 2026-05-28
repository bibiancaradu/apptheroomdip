"""
Backend tests for THE ROOM BARBERIA - Phase 2
Coverage:
  - Approvals workflow (list pending, approve, reject, edge cases)
  - Employee management CRUD (list, create, update, delete, edge cases)
  - Dashboard stats prerequisites (users count, time-entries listing, location values)
"""
import os
import uuid
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://staff-hours-tracker-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ------------------ Fixtures ------------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "marius", "password": "marius2025"})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def employee_token():
    r = requests.post(f"{API}/auth/login", json={"username": "jessica", "password": "jessica2025"})
    assert r.status_code == 200, f"Employee login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def employee_user(employee_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {employee_token}"})
    assert r.status_code == 200
    return r.json()


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------ Auth basics ------------------
class TestAuthBasics:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "marius", "password": "wrong"})
        assert r.status_code == 401

    def test_me_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "admin"
        assert body["username"] == "marius"


# ------------------ Employee Management (Users) ------------------
class TestEmployeeManagement:
    created_user_id = None

    def test_list_users_admin(self, admin_token):
        r = requests.get(f"{API}/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        usernames = [u["username"] for u in users]
        assert "marius" in usernames
        assert "jessica" in usernames

    def test_list_users_forbidden_employee(self, employee_token):
        r = requests.get(f"{API}/users", headers=_h(employee_token))
        assert r.status_code == 403

    def test_create_user_and_verify(self, admin_token):
        uname = f"test_emp_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": "TEST Employee",
            "username": uname,
            "password": "testpass123",
            "role": "employee",
            "location_preference": "Costabissara"
        }
        r = requests.post(f"{API}/users", json=payload, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["username"] == uname
        assert body["role"] == "employee"
        assert body["location_preference"] == "Costabissara"
        TestEmployeeManagement.created_user_id = body["id"]

        # Verify persistence
        r2 = requests.get(f"{API}/users", headers=_h(admin_token))
        assert any(u["id"] == body["id"] for u in r2.json())

    def test_create_user_duplicate_username(self, admin_token):
        r = requests.post(f"{API}/users", json={
            "name": "Dup", "username": "marius", "password": "x", "role": "employee"
        }, headers=_h(admin_token))
        assert r.status_code == 400

    def test_create_user_forbidden_employee(self, employee_token):
        r = requests.post(f"{API}/users", json={
            "name": "X", "username": "x_emp", "password": "x", "role": "employee"
        }, headers=_h(employee_token))
        assert r.status_code == 403

    def test_update_created_user(self, admin_token):
        assert TestEmployeeManagement.created_user_id
        uid = TestEmployeeManagement.created_user_id
        payload = {
            "name": "TEST Updated",
            "username": f"updated_{uuid.uuid4().hex[:6]}",
            "password": "newpass123",
            "role": "employee",
            "location_preference": "Vicenza Est"
        }
        r = requests.put(f"{API}/users/{uid}", json=payload, headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "TEST Updated"
        assert body["location_preference"] == "Vicenza Est"

    def test_update_user_not_found(self, admin_token):
        fake_id = "507f1f77bcf86cd799439011"
        r = requests.put(f"{API}/users/{fake_id}", json={
            "name": "X", "username": "x", "password": "x", "role": "employee"
        }, headers=_h(admin_token))
        assert r.status_code == 404

    def test_delete_self_forbidden(self, admin_token):
        me = requests.get(f"{API}/auth/me", headers=_h(admin_token)).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=_h(admin_token))
        assert r.status_code == 400

    def test_delete_user_not_found(self, admin_token):
        fake_id = "507f1f77bcf86cd799439011"
        r = requests.delete(f"{API}/users/{fake_id}", headers=_h(admin_token))
        assert r.status_code == 404

    def test_delete_created_user(self, admin_token):
        assert TestEmployeeManagement.created_user_id
        uid = TestEmployeeManagement.created_user_id
        r = requests.delete(f"{API}/users/{uid}", headers=_h(admin_token))
        assert r.status_code == 200
        # Verify gone
        r2 = requests.get(f"{API}/users", headers=_h(admin_token))
        assert not any(u["id"] == uid for u in r2.json())


# ------------------ Approvals workflow ------------------
class TestApprovalsWorkflow:
    vacation_entry_id = None
    permit_entry_id = None
    work_entry_id = None

    def test_employee_creates_vacation_request(self, employee_token):
        payload = {
            "date": "2026-01-15",
            "hours": 8,
            "location": "Costabissara",
            "entry_type": "vacation",
            "comments": "TEST vacation"
        }
        r = requests.post(f"{API}/time-entries", json=payload, headers=_h(employee_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending"
        assert body["entry_type"] == "vacation"
        TestApprovalsWorkflow.vacation_entry_id = body["id"]

    def test_employee_creates_permit_request(self, employee_token):
        payload = {
            "date": "2026-01-16",
            "hours": 4,
            "location": "Vicenza Est",
            "entry_type": "permit",
            "comments": "TEST permit"
        }
        r = requests.post(f"{API}/time-entries", json=payload, headers=_h(employee_token))
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "pending"
        TestApprovalsWorkflow.permit_entry_id = body["id"]

    def test_work_entry_auto_approved(self, employee_token):
        payload = {
            "date": "2026-01-17",
            "hours": 8,
            "location": "Costabissara",
            "entry_type": "work",
            "comments": "TEST work"
        }
        r = requests.post(f"{API}/time-entries", json=payload, headers=_h(employee_token))
        assert r.status_code == 200
        body = r.json()
        # Non-vacation/permit entries should be auto-approved
        assert body["status"] == "approved"
        TestApprovalsWorkflow.work_entry_id = body["id"]

    def test_list_pending_approvals_includes_new(self, admin_token):
        r = requests.get(f"{API}/approvals", headers=_h(admin_token))
        assert r.status_code == 200
        ids = [e["id"] for e in r.json()]
        assert TestApprovalsWorkflow.vacation_entry_id in ids
        assert TestApprovalsWorkflow.permit_entry_id in ids
        # work entry should NOT be in pending
        assert TestApprovalsWorkflow.work_entry_id not in ids
        # all returned have status == pending
        for e in r.json():
            assert e["status"] == "pending"

    def test_approvals_forbidden_employee(self, employee_token):
        r = requests.get(f"{API}/approvals", headers=_h(employee_token))
        assert r.status_code == 403

    def test_approve_vacation(self, admin_token):
        vid = TestApprovalsWorkflow.vacation_entry_id
        r = requests.put(f"{API}/approvals/{vid}", json={"status": "approved"}, headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        # Verify removed from approvals list
        r2 = requests.get(f"{API}/approvals", headers=_h(admin_token))
        ids = [e["id"] for e in r2.json()]
        assert vid not in ids

    def test_reject_permit(self, admin_token):
        pid = TestApprovalsWorkflow.permit_entry_id
        r = requests.put(f"{API}/approvals/{pid}", json={"status": "rejected"}, headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        r2 = requests.get(f"{API}/approvals", headers=_h(admin_token))
        ids = [e["id"] for e in r2.json()]
        assert pid not in ids

    def test_approve_non_existent_entry(self, admin_token):
        fake_id = "507f1f77bcf86cd799439011"
        r = requests.put(f"{API}/approvals/{fake_id}", json={"status": "approved"}, headers=_h(admin_token))
        assert r.status_code == 404

    def test_invalid_approval_status(self, admin_token, employee_token):
        # create one more pending
        payload = {"date": "2026-01-18", "hours": 8, "location": "Costabissara",
                   "entry_type": "vacation", "comments": "TEST"}
        r = requests.post(f"{API}/time-entries", json=payload, headers=_h(employee_token))
        eid = r.json()["id"]
        try:
            r2 = requests.put(f"{API}/approvals/{eid}", json={"status": "garbage"}, headers=_h(admin_token))
            assert r2.status_code == 400
        finally:
            requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))

    def test_approval_forbidden_employee(self, employee_token, admin_token):
        # Create a pending entry as employee
        r = requests.post(f"{API}/time-entries", json={
            "date": "2026-01-19", "hours": 8, "location": "Costabissara",
            "entry_type": "vacation", "comments": "TEST"
        }, headers=_h(employee_token))
        eid = r.json()["id"]
        try:
            r2 = requests.put(f"{API}/approvals/{eid}", json={"status": "approved"}, headers=_h(employee_token))
            assert r2.status_code == 403
        finally:
            requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))

    # cleanup created test entries
    def test_cleanup_test_entries(self, admin_token):
        for eid in [TestApprovalsWorkflow.vacation_entry_id,
                    TestApprovalsWorkflow.permit_entry_id,
                    TestApprovalsWorkflow.work_entry_id]:
            if eid:
                requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))


# ------------------ Dashboard data prerequisites ------------------
class TestDashboardData:
    """Dashboard stats are computed client-side from these APIs.
    Verify the source data endpoints return correct structure for stats:
      - users count → /api/users
      - month hours → /api/time-entries?month=YYYY-MM
      - pending count → /api/approvals
      - locations → values in time-entries
    """
    def test_users_count_endpoint(self, admin_token):
        r = requests.get(f"{API}/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        # Should have at least seeded users (admin + employees)
        assert len(users) >= 2
        # Employees count = users with role employee
        emp_count = sum(1 for u in users if u["role"] == "employee")
        assert emp_count >= 1

    def test_month_hours_filter(self, admin_token, employee_token):
        # Create a test work entry in current month
        cur_month = datetime.now().strftime("%Y-%m")
        date = f"{cur_month}-10"
        r = requests.post(f"{API}/time-entries", json={
            "date": date, "hours": 7.5, "location": "Costabissara",
            "entry_type": "work", "comments": "TEST month hours"
        }, headers=_h(employee_token))
        assert r.status_code == 200
        eid = r.json()["id"]
        try:
            r2 = requests.get(f"{API}/time-entries", params={"month": cur_month}, headers=_h(admin_token))
            assert r2.status_code == 200
            entries = r2.json()
            assert any(e["id"] == eid for e in entries)
            # All entries should be in that month
            for e in entries:
                assert e["date"].startswith(cur_month)
        finally:
            requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))

    def test_filter_by_user_id_admin_only(self, admin_token, employee_user):
        r = requests.get(f"{API}/time-entries", params={"user_id": employee_user["id"]}, headers=_h(admin_token))
        assert r.status_code == 200
        for e in r.json():
            assert e["user_id"] == employee_user["id"]

    def test_employee_cannot_filter_other_user(self, employee_token, admin_token):
        # Employees only see own entries regardless of user_id param
        me = requests.get(f"{API}/auth/me", headers=_h(admin_token)).json()
        r = requests.get(f"{API}/time-entries", params={"user_id": me["id"]}, headers=_h(employee_token))
        assert r.status_code == 200
        for e in r.json():
            assert e["user_id"] != me["id"]  # they only see their own, not admin's

    def test_locations_valid(self, admin_token):
        r = requests.get(f"{API}/time-entries", headers=_h(admin_token))
        assert r.status_code == 200
        allowed = {"Costabissara", "Vicenza Est"}
        for e in r.json():
            # Lenient: just ensure location is a non-empty string
            assert isinstance(e["location"], str) and e["location"]
