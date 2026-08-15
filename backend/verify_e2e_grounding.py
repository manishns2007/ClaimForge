import sys
import httpx
import sqlite3
from pathlib import Path
from reportlab.pdfgen import canvas

BASE_URL = "http://127.0.0.1:8000"

def run_verification():
    print("==================================================")
    print("REAL-TIME LIVE HTTP E2E GROUNDING VERIFICATION")
    print("==================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Verify GET /health
    print("\n1. Testing GET /health...")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check failed: {resp.status_code} {resp.text}"
    health_json = resp.json()
    print(f"   Response: {health_json}")
    assert health_json["status"] == "ok"
    print("   [OK] /health returned status ok")

    # 2. Verify OpenAPI specification contains /api/investigations/{id}/run
    print("\n2. Testing OpenAPI spec for POST /api/investigations/{id}/run...")
    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    openapi_spec = openapi_resp.json()
    paths = openapi_spec.get("paths", {})
    assert "/api/investigations/{id}/run" in paths, "Missing POST /api/investigations/{id}/run in OpenAPI"
    assert "post" in paths["/api/investigations/{id}/run"]
    print("   [OK] OpenAPI spec contains POST /api/investigations/{id}/run")

    # 3. Create Novel Investigation
    print("\n3. Creating new investigation via POST /api/investigations...")
    inv_resp = client.post("/api/investigations", json={
        "title": "Live Adversarial Grounding E2E Audit",
        "vertical": "EQUIPMENT_RENTAL"
    })
    assert inv_resp.status_code == 201
    inv_data = inv_resp.json()
    inv_id = inv_data["id"]
    print(f"   [OK] Created investigation: {inv_id}")

    # 4. Generate Novel Adversarial Document
    print("\n4. Generating and uploading novel adversarial document...")
    tmp_pdf = Path("./storage/adversarial_e2e_invoice.pdf")
    tmp_pdf.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(tmp_pdf))
    c.drawString(100, 750, "INVOICE #ADV-999")
    c.drawString(100, 730, "Vendor: ADVERSARIAL-VENDOR-XYZ")
    c.drawString(100, 710, "Equipment: TEST-EQUIPMENT-999")
    c.drawString(100, 690, "Billing Period: 2027-04-10 to 2027-04-14")
    c.drawString(100, 670, "Daily Rate: $1,234.56 / day")
    c.drawString(100, 650, "Quantity: 4 days")
    c.drawString(100, 630, "Total Amount: $4,938.24")
    c.save()

    with open(tmp_pdf, "rb") as f:
        upload_resp = client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("adversarial_e2e_invoice.pdf", f, "application/pdf")}
        )
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    uploaded_docs = upload_resp.json()
    print(f"   [OK] Uploaded {len(uploaded_docs)} document(s): {uploaded_docs[0]['filename']}")

    # 5. Run Investigation via POST /api/investigations/{id}/run
    print(f"\n5. Triggering run via POST /api/investigations/{inv_id}/run...")
    run_resp = client.post(f"/api/investigations/{inv_id}/run")
    assert run_resp.status_code == 200, f"Run failed: {run_resp.text}"
    run_result = run_resp.json()
    print("   [OK] Execution returned successfully")
    print(f"   Financial items extracted: {run_result['financial_items']}")
    print(f"   Deterministic result: {run_result['deterministic_result']}")

    # 6. Verify via GET /api/investigations/{id}/details
    print(f"\n6. Verifying result via GET /api/investigations/{inv_id}/details...")
    details_resp = client.get(f"/api/investigations/{inv_id}/details")
    assert details_resp.status_code == 200
    details = details_resp.json()
    claim = details.get("claim")
    assert claim is not None, "Claim should be generated"
    print(f"   Vendor Name: {claim['vendor_name']}")
    print(f"   Invoice Number: {claim['invoice_number']}")
    print(f"   Original Amount: ${claim['original_amount']}")
    print(f"   Recommendation: {claim['recommendation']}")

    assert claim["vendor_name"] == "ADVERSARIAL-VENDOR-XYZ"
    assert claim["invoice_number"] == "ADV-999"
    assert claim["original_amount"] == 4938.24

    # 7. Check Event Stream GET /api/investigations/{id}/events
    print(f"\n7. Checking persisted events for investigation...")
    events_resp = client.get(f"/api/investigations/{inv_id}/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    print(f"   [OK] {len(events)} event(s) recorded in audit log")
    event_types = [e["event_type"] for e in events]
    assert "INVESTIGATION_CREATED" in event_types
    assert "DOCUMENT_UPLOADED" in event_types
    assert "CHARGES_NORMALIZED" in event_types
    assert "INVESTIGATION_COMPLETED" in event_types

    # 8. Direct SQLite Database Inspection
    print("\n8. Direct SQLite database inspection...")
    conn = sqlite3.connect("./storage/claimforge.db")
    cursor = conn.cursor()

    # Query claims table
    cursor.execute("SELECT vendor_name, invoice_number, original_amount, disputed_amount, recommendation FROM claims WHERE investigation_id = ?", (inv_id,))
    row = cursor.fetchone()
    print(f"   DB Claims record: {row}")
    assert row is not None
    assert row[0] == "ADVERSARIAL-VENDOR-XYZ"
    assert row[1] == "ADV-999"
    assert row[2] == 4938.24

    # Query charges table
    cursor.execute("SELECT billed_amount, unit_rate, units_billed, description, source_citation FROM charges WHERE investigation_id = ?", (inv_id,))
    charge_row = cursor.fetchone()
    print(f"   DB Charges record: {charge_row}")
    assert charge_row is not None
    assert charge_row[0] == 4938.24
    assert charge_row[1] == 1234.56
    assert charge_row[2] == 4.0

    # Search for forbidden synthetic fallbacks in DB
    cursor.execute("SELECT * FROM claims WHERE investigation_id = ? AND (invoice_number LIKE '%INV-DEFAULT%' OR vendor_name LIKE '%Heavy Machinery%')", (inv_id,))
    bad_claims = cursor.fetchall()
    assert len(bad_claims) == 0, f"Contaminated claims found: {bad_claims}"

    conn.close()
    print("   [OK] Database verification passed: 0 synthetic fallbacks in DB!")

    # 9. Test Non-Financial Document
    print("\n9. Testing Negative Case (Document without financial data)...")
    inv_nf_resp = client.post("/api/investigations", json={
        "title": "Non-Financial Document Test",
        "vertical": "EQUIPMENT_RENTAL"
    })
    inv_nf_id = inv_nf_resp.json()["id"]

    nf_pdf = Path("./storage/non_financial_doc.pdf")
    c = canvas.Canvas(str(nf_pdf))
    c.drawString(100, 750, "PROJECT ARCHITECTURAL BLUEPRINT SPECIFICATION")
    c.drawString(100, 730, "Scope: Concrete foundation pouring for Section 4.")
    c.save()

    with open(nf_pdf, "rb") as f:
        client.post(
            f"/api/investigations/{inv_nf_id}/documents",
            files={"files": ("non_financial_doc.pdf", f, "application/pdf")}
        )

    run_nf_resp = client.post(f"/api/investigations/{inv_nf_id}/run")
    assert run_nf_resp.status_code == 200
    nf_det = run_nf_resp.json()["deterministic_result"]
    print(f"   Non-financial result: original_amount={nf_det['original_amount']}, disputed_amount={nf_det['disputed_amount']}, recommendation={nf_det['recommendation']}")
    assert nf_det["original_amount"] == 0.0
    assert nf_det["disputed_amount"] == 0.0
    assert nf_det["expected_recovery_value"] == 0.0
    assert nf_det["recommendation"] == "HUMAN_REVIEW"
    print("   [OK] Negative test passed: No charges fabricated, correctly routed to HUMAN_REVIEW")

    print("\n==================================================")
    print("ALL REAL-TIME HTTP E2E VERIFICATIONS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_verification()
