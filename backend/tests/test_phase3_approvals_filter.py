"""
Backend tests for THE ROOM BARBERIA - Phase 3
Coverage:
  - GET /api/approvals?status_filter=pending → only pending vacation/permit
  - GET /api/approvals?status_filter=approved → only approved vacation/permit
  - GET /api/approvals?status_filter=rejected → only rejected vacation/permit
  - GET /api/approvals (no filter) → defaults to pending
  - /api/approvals filters by entry_type IN [vacation, permit] (excludes work/sick/other)
  - Regression: login, time-entries CRUD, users CRUD, approve/reject continue to work
"""
import os
import uuid
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://staff-hours-tracker-3.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"


def _h(token):
    return {"Authorization": f"Bearer {token}"}


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
    r = requests.get(f"{API}/auth/me", headers=_h(employee_token))
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="class")
def seeded_entries(admin_token, employee_token):
    """Create three vacation/permit entries → leave one pending, approve one, reject one.
    Also create a 'work' entry to verify it is excluded from /api/approvals."""
    created = {"pending": None, "approved": None, "rejected": None, "work": None}

    def _post(payload):
        r = requests.post(f"{API}/time-entries", json=payload, headers=_h(employee_token))
        assert r.status_code == 200, r.text
        return r.json()

    # Pending vacation
    p = _post({"date": "2026-02-01", "hours": 8, "location": "Costabissara",
               "entry_type": "vacation", "comments": "TEST p3 pending"})
    created["pending"] = p["id"]

    # To-be-approved permit
    a = _post({"date": "2026-02-02", "hours": 4, "location": "Vicenza Est",
               "entry_type": "permit", "comments": "TEST p3 approved"})
    r = requests.put(f"{API}/approvals/{a['id']}", json={"status": "approved"}, headers=_h(admin_token))
    assert r.status_code == 200
    created["approved"] = a["id"]

    # To-be-rejected vacation
    rj = _post({"date": "2026-02-03", "hours": 8, "location": "Costabissara",
                "entry_type": "vacation", "comments": "TEST p3 rejected"})
    r = requests.put(f"{API}/approvals/{rj['id']}", json={"status": "rejected"}, headers=_h(admin_token))
    assert r.status_code == 200
    created["rejected"] = rj["id"]

    # Work entry (must NOT appear in approvals)
    w = _post({"date": "2026-02-04", "hours": 8, "location": "Costabissara",
               "entry_type": "work", "comments": "TEST p3 work"})
    created["work"] = w["id"]

    yield created

    # Cleanup
    for eid in created.values():
        if eid:
            requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))


# ------------------ Phase 3: status_filter ------------------
class TestApprovalsStatusFilter:

    def test_default_returns_only_pending(self, admin_token, seeded_entries):
        r = requests.get(f"{API}/approvals", headers=_h(admin_token))
        assert r.status_code == 200
        entries = r.json()
        ids = [e["id"] for e in entries]
        # All returned must be pending
        for e in entries:
            assert e["status"] == "pending", f"Default returned non-pending: {e}"
        # Our seeded pending must be in the list; approved/rejected must NOT
        assert seeded_entries["pending"] in ids
        assert seeded_entries["approved"] not in ids
        assert seeded_entries["rejected"] not in ids
        # work entry must never appear
        assert seeded_entries["work"] not in ids

    def test_status_filter_pending(self, admin_token, seeded_entries):
        r = requests.get(f"{API}/approvals", params={"status_filter": "pending"}, headers=_h(admin_token))
        assert r.status_code == 200
        entries = r.json()
        ids = [e["id"] for e in entries]
        for e in entries:
            assert e["status"] == "pending"
            assert e["entry_type"] in ("vacation", "permit"), f"Wrong entry_type: {e}"
        assert seeded_entries["pending"] in ids
        assert seeded_entries["approved"] not in ids
        assert seeded_entries["rejected"] not in ids
        assert seeded_entries["work"] not in ids

    def test_status_filter_approved(self, admin_token, seeded_entries):
        r = requests.get(f"{API}/approvals", params={"status_filter": "approved"}, headers=_h(admin_token))
        assert r.status_code == 200
        entries = r.json()
        ids = [e["id"] for e in entries]
        for e in entries:
            assert e["status"] == "approved"
            assert e["entry_type"] in ("vacation", "permit")
        assert seeded_entries["approved"] in ids
        assert seeded_entries["pending"] not in ids
        assert seeded_entries["rejected"] not in ids
        assert seeded_entries["work"] not in ids

    def test_status_filter_rejected(self, admin_token, seeded_entries):
        r = requests.get(f"{API}/approvals", params={"status_filter": "rejected"}, headers=_h(admin_token))
        assert r.status_code == 200
        entries = r.json()
        ids = [e["id"] for e in entries]
        for e in entries:
            assert e["status"] == "rejected"
            assert e["entry_type"] in ("vacation", "permit")
        assert seeded_entries["rejected"] in ids
        assert seeded_entries["pending"] not in ids
        assert seeded_entries["approved"] not in ids
        assert seeded_entries["work"] not in ids

    def test_status_filter_invalid_defaults_to_pending(self, admin_token, seeded_entries):
        # The code: only honors pending/approved/rejected; anything else → defaults to pending
        r = requests.get(f"{API}/approvals", params={"status_filter": "garbage"}, headers=_h(admin_token))
        assert r.status_code == 200
        entries = r.json()
        for e in entries:
            assert e["status"] == "pending"

    def test_approvals_excludes_non_vacation_permit_types(self, admin_token, employee_token, seeded_entries):
        # Sick/other should never appear regardless of status_filter
        r_sick = requests.post(f"{API}/time-entries", json={
            "date": "2026-02-05", "hours": 8, "location": "Costabissara",
            "entry_type": "sick", "comments": "TEST p3 sick"
        }, headers=_h(employee_token))
        assert r_sick.status_code == 200
        sick_id = r_sick.json()["id"]

        r_other = requests.post(f"{API}/time-entries", json={
            "date": "2026-02-06", "hours": 8, "location": "Costabissara",
            "entry_type": "other", "comments": "TEST p3 other"
        }, headers=_h(employee_token))
        assert r_other.status_code == 200
        other_id = r_other.json()["id"]

        try:
            for status in ("pending", "approved", "rejected"):
                r = requests.get(f"{API}/approvals", params={"status_filter": status}, headers=_h(admin_token))
                assert r.status_code == 200
                ids = [e["id"] for e in r.json()]
                assert sick_id not in ids
                assert other_id not in ids
                for e in r.json():
                    assert e["entry_type"] in ("vacation", "permit")
        finally:
            requests.delete(f"{API}/time-entries/{sick_id}", headers=_h(admin_token))
            requests.delete(f"{API}/time-entries/{other_id}", headers=_h(admin_token))

    def test_approvals_forbidden_employee_with_filter(self, employee_token):
        for status in ("pending", "approved", "rejected"):
            r = requests.get(f"{API}/approvals", params={"status_filter": status}, headers=_h(employee_token))
            assert r.status_code == 403


# ------------------ Regression: auth / users / time-entries / approve-reject ------------------
class TestRegression:
    def test_admin_login_ok(self, admin_token):
        assert admin_token

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "marius", "password": "wrong"})
        assert r.status_code == 401

    def test_me_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_list_users(self, admin_token):
        r = requests.get(f"{API}/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        usernames = [u["username"] for u in users]
        assert "marius" in usernames and "jessica" in usernames

    def test_users_crud_cycle(self, admin_token):
        uname = f"test_p3_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/users", json={
            "name": "TEST P3", "username": uname, "password": "pw123",
            "role": "employee", "location_preference": "Costabissara"
        }, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        uid = r.json()["id"]

        # Update
        r2 = requests.put(f"{API}/users/{uid}", json={
            "name": "TEST P3 Updated", "username": uname, "password": "pw123",
            "role": "employee", "location_preference": "Vicenza Est"
        }, headers=_h(admin_token))
        assert r2.status_code == 200
        assert r2.json()["location_preference"] == "Vicenza Est"

        # Delete
        r3 = requests.delete(f"{API}/users/{uid}", headers=_h(admin_token))
        assert r3.status_code == 200

        # Verify gone
        r4 = requests.get(f"{API}/users", headers=_h(admin_token))
        assert not any(u["id"] == uid for u in r4.json())

    def test_time_entries_crud_cycle(self, admin_token, employee_token):
        # Employees can only edit current-month entries → use today's month for create/update.
        cur_month = datetime.now().strftime("%Y-%m")
        date = f"{cur_month}-10"
        # Create
        r = requests.post(f"{API}/time-entries", json={
            "date": date, "hours": 8, "location": "Costabissara",
            "entry_type": "work", "comments": "TEST p3 regression"
        }, headers=_h(employee_token))
        assert r.status_code == 200
        eid = r.json()["id"]
        assert r.json()["status"] == "approved"  # work auto-approved

        # List as admin – must include it
        r2 = requests.get(f"{API}/time-entries", headers=_h(admin_token))
        assert r2.status_code == 200
        assert any(e["id"] == eid for e in r2.json())

        # Update via employee (own entry, current month)
        r3 = requests.put(f"{API}/time-entries/{eid}", json={
            "date": date, "hours": 7, "location": "Costabissara",
            "entry_type": "work", "comments": "TEST p3 updated"
        }, headers=_h(employee_token))
        assert r3.status_code == 200, r3.text
        assert r3.json()["hours"] == 7

        # Delete
        r4 = requests.delete(f"{API}/time-entries/{eid}", headers=_h(employee_token))
        assert r4.status_code == 200

    def test_approve_reject_still_works(self, admin_token, employee_token):
        # vacation → approve
        r = requests.post(f"{API}/time-entries", json={
            "date": "2026-02-11", "hours": 8, "location": "Costabissara",
            "entry_type": "vacation", "comments": "TEST p3 approve"
        }, headers=_h(employee_token))
        assert r.status_code == 200
        vid = r.json()["id"]
        assert r.json()["status"] == "pending"

        r2 = requests.put(f"{API}/approvals/{vid}", json={"status": "approved"}, headers=_h(admin_token))
        assert r2.status_code == 200
        assert r2.json()["status"] == "approved"

        # permit → reject
        r3 = requests.post(f"{API}/time-entries", json={
            "date": "2026-02-12", "hours": 4, "location": "Vicenza Est",
            "entry_type": "permit", "comments": "TEST p3 reject"
        }, headers=_h(employee_token))
        assert r3.status_code == 200
        pid = r3.json()["id"]

        r4 = requests.put(f"{API}/approvals/{pid}", json={"status": "rejected"}, headers=_h(admin_token))
        assert r4.status_code == 200
        assert r4.json()["status"] == "rejected"

        # cleanup
        requests.delete(f"{API}/time-entries/{vid}", headers=_h(admin_token))
        requests.delete(f"{API}/time-entries/{pid}", headers=_h(admin_token))

    def test_month_filter_regression(self, admin_token, employee_token):
        cur_month = datetime.now().strftime("%Y-%m")
        date = f"{cur_month}-15"
        r = requests.post(f"{API}/time-entries", json={
            "date": date, "hours": 6, "location": "Costabissara",
            "entry_type": "work", "comments": "TEST p3 month"
        }, headers=_h(employee_token))
        assert r.status_code == 200
        eid = r.json()["id"]
        try:
            r2 = requests.get(f"{API}/time-entries", params={"month": cur_month}, headers=_h(admin_token))
            assert r2.status_code == 200
            entries = r2.json()
            assert any(e["id"] == eid for e in entries)
            for e in entries:
                assert e["date"].startswith(cur_month)
        finally:
            requests.delete(f"{API}/time-entries/{eid}", headers=_h(admin_token))
