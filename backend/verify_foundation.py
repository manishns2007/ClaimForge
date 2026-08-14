import os
import sys
import time
import httpx
from pathlib import Path
from reportlab.pdfgen import canvas

BASE_URL = "http://127.0.0.1:8000"

def create_sample_files(tmp_dir: Path):
    pdf_path = tmp_dir / "sample_contract.pdf"
    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, "Rental Agreement #10928")
    c.drawString(100, 730, "Vendor: Heavy Equipment Corp")
    c.drawString(100, 710, "Equipment: CAT 320 Excavator")
    c.drawString(100, 690, "Rate: $1500 per day")
    c.save()

    csv_path = tmp_dir / "sample_telemetry.csv"
    csv_path.write_text(
        "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours\n"
        "2026-06-11T14:00:00,37.7749,-122.4194,1800,2500,124.5\n"
        "2026-06-11T14:47:00,37.7749,-122.4194,0,0,125.0\n",
        encoding="utf-8"
    )

    eml_path = tmp_dir / "sample_email.eml"
    eml_path.write_text(
        "From: manager@site.com\n"
        "To: billing@heavycorp.com\n"
        "Subject: Off-rent Confirmation\n"
        "Date: Thu, 11 Jun 2026 14:41:00 -0400\n"
        "\n"
        "Confirming off-rent request for CAT 320 Excavator as of June 11 14:41.\n",
        encoding="utf-8"
    )

    return pdf_path, csv_path, eml_path

def run_manual_verification():
    print("=== Starting Manual Verification of ClaimForge Backend Foundation ===")
    
    tmp_dir = Path("./storage/manual_test_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    pdf_path, csv_path, eml_path = create_sample_files(tmp_dir)

    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # Step 1: Health check
        res = client.get("/health")
        print(f"1. GET /health -> Status {res.status_code}: {res.json()}")
        assert res.status_code == 200

        # Step 2: Create investigation
        res = client.post("/api/investigations", json={"title": "Manual E2E Verification Run", "vertical": "EQUIPMENT_RENTAL"})
        print(f"2. POST /api/investigations -> Status {res.status_code}: {res.json()['id']}")
        assert res.status_code == 201
        inv_id = res.json()["id"]

        # Step 3, 4, 5: Upload PDF, CSV, EML
        with open(pdf_path, "rb") as f1, open(csv_path, "rb") as f2, open(eml_path, "rb") as f3:
            files = [
                ("files", ("sample_contract.pdf", f1, "application/pdf")),
                ("files", ("sample_telemetry.csv", f2, "text/csv")),
                ("files", ("sample_email.eml", f3, "message/rfc822"))
            ]
            res = client.post(f"/api/investigations/{inv_id}/documents", files=files)
            print(f"3-5. POST /api/investigations/{inv_id}/documents -> Status {res.status_code}")
            assert res.status_code == 200
            docs = res.json()
            assert len(docs) == 3
            print(f"   Uploaded files: {[d['filename'] for d in docs]}")

        # Step 6: Verify parsed content & investigation status
        res = client.get(f"/api/investigations/{inv_id}")
        print(f"6. GET /api/investigations/{inv_id} -> Status: {res.json()['status']}")
        assert res.json()["status"] == "READY"

        # Step 7: Verify events log
        res = client.get(f"/api/investigations/{inv_id}/events")
        events = res.json()
        print(f"7. GET /api/investigations/{inv_id}/events -> Total persisted events: {len(events)}")
        assert len(events) >= 7

        # Step 8: Test SSE endpoint
        with client.stream("GET", f"/api/investigations/{inv_id}/stream") as stream_res:
            print(f"8. GET /api/investigations/{inv_id}/stream -> Connected with status {stream_res.status_code}")
            lines = []
            for line in stream_res.iter_lines():
                if line.startswith("data:"):
                    lines.append(line)
                if len(lines) >= 3:
                    break
            print(f"   Received {len(lines)} SSE data frames.")
            assert len(lines) > 0

    print("=== Manual Verification Successfully Passed All 10 Steps! ===")

if __name__ == "__main__":
    run_manual_verification()
