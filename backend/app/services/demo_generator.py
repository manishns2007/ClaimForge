import os
from pathlib import Path
from typing import Dict, Any, Tuple
from reportlab.pdfgen import canvas

class DemoDatasetGenerator:
    @staticmethod
    def generate_case_a(target_dir: Path) -> Tuple[Path, Path, Path, Path]:
        """
        CASE A — Clearly Recoverable Overcharge Claim
        CAT 320 Excavator rental billed for 2 excess days post off-rent email ack & engine shutdown.
        Contract: Billing stops on off-rent email notice/ack. Rate = $1,500/day.
        Invoice: Billed 5 days ($7,500) June 8 to June 13.
        Email: Off-rent sent June 11 14:41, acknowledged June 11 14:45.
        Telemetry: Engine off June 11 14:47, GPS departure June 11 15:01.
        Expected: DISPUTE ($3,000 recovered).
        """
        os.makedirs(target_dir, exist_ok=True)
        
        # 1. Contract PDF
        contract_pdf = target_dir / "contract_case_a.pdf"
        c = canvas.Canvas(str(contract_pdf))
        c.drawString(100, 750, "COMMERCIAL EQUIPMENT RENTAL AGREEMENT #RA-88421")
        c.drawString(100, 730, "Lessor: Heavy Machinery Rentals Corp")
        c.drawString(100, 710, "Lessee: Apex Infrastructure Construction Inc")
        c.drawString(100, 690, "Equipment Unit: CAT 320 Excavator (Unit #EXC-320-A)")
        c.drawString(100, 670, "Daily Rental Rate: $1,500.00 / day")
        c.drawString(100, 650, "Clause 3.1 (Off-Rent Billing Basis): Billing shall cease immediately upon Lessee")
        c.drawString(100, 635, "transmitting off-rent notice or Lessor email acknowledgement.")
        c.save()

        # 2. Invoice PDF
        invoice_pdf = target_dir / "invoice_case_a.pdf"
        c = canvas.Canvas(str(invoice_pdf))
        c.drawString(100, 750, "INVOICE #INV-2026-90412")
        c.drawString(100, 730, "Vendor: Heavy Machinery Rentals Corp")
        c.drawString(100, 710, "Invoice Date: June 15, 2026")
        c.drawString(100, 690, "Billing Period: June 8, 2026 to June 13, 2026")
        c.drawString(100, 670, "Item: CAT 320 Excavator Rental — 5 days @ $1,500.00/day")
        c.drawString(100, 650, "Total Amount Billed: $7,500.00")
        c.save()

        # 3. Email EML
        email_eml = target_dir / "email_case_a.eml"
        email_eml.write_text(
            "From: j.smith@apexinfra.com\n"
            "To: dispatch@heavymachinery.com\n"
            "Subject: Off-Rent Notice - CAT 320 Excavator (EXC-320-A)\n"
            "Date: Thu, 11 Jun 2026 14:41:00 -0400\n"
            "\n"
            "Please be advised that CAT 320 Excavator (EXC-320-A) is off-rent effective June 11, 2026 at 14:41.\n"
            "Machine is parked safely at Site A gate.\n"
            "\n"
            "Vendor Acknowledgement Reply (June 11 14:45):\n"
            "Received and acknowledged. Off-rent logged effective June 11 14:41.\n",
            encoding="utf-8"
        )

        # 4. Telemetry CSV
        telemetry_csv = target_dir / "telemetry_case_a.csv"
        csv_content = (
            "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours,equipment_id\n"
            "2026-06-11T14:00:00Z,37.7749,-122.4194,1850,2600,140.0,EXC-320-A\n"
            "2026-06-11T14:47:00Z,37.7749,-122.4194,0,0,140.5,EXC-320-A\n"
            "2026-06-11T15:01:00Z,37.7800,-122.4100,0,0,140.5,EXC-320-A\n"
        )
        telemetry_csv.write_text(csv_content, encoding="utf-8")

        return contract_pdf, invoice_pdf, email_eml, telemetry_csv

    @staticmethod
    def generate_case_b(target_dir: Path) -> Tuple[Path, Path, Path, Path]:
        """
        CASE B — Ambiguous / Weather Standby Claim
        Discrepancy over weather standby rate vs full rental rate. Requires human review.
        Expected: HUMAN_REVIEW.
        """
        os.makedirs(target_dir, exist_ok=True)
        
        contract_pdf = target_dir / "contract_case_b.pdf"
        c = canvas.Canvas(str(contract_pdf))
        c.drawString(100, 750, "EQUIPMENT LEASE AGREEMENT #LA-7712")
        c.drawString(100, 730, "Daily Rate: $1,500.00 / day")
        c.drawString(100, 710, "Clause 5.2: Standby rate of $500.00/day applies during weather shutdowns.")
        c.save()

        invoice_pdf = target_dir / "invoice_case_b.pdf"
        c = canvas.Canvas(str(invoice_pdf))
        c.drawString(100, 750, "INVOICE #INV-2026-4412")
        c.drawString(100, 730, "Vendor: Machinery Rental Solutions")
        c.drawString(100, 710, "Billing Period: July 1, 2026 to July 5, 2026")
        c.drawString(100, 690, "Item: Equipment Rental — 5 days @ $1,500.00/day")
        c.drawString(100, 670, "Total Amount Billed: $7,500.00")
        c.save()

        email_eml = target_dir / "email_case_b.eml"
        email_eml.write_text(
            "From: site@apexinfra.com\n"
            "To: dispatch@vendor.com\n"
            "Subject: Storm Delay Standby Notice\n"
            "Date: Wed, 03 Jul 2026 08:00:00 -0400\n"
            "\n"
            "Severe rain storm. Equipment on standby for July 3.\n",
            encoding="utf-8"
        )

        telemetry_csv = target_dir / "telemetry_case_b.csv"
        telemetry_csv.write_text(
            "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours,equipment_id\n"
            "2026-07-03T08:00:00Z,37.7749,-122.4194,0,0,200.0,EXC-320-B\n",
            encoding="utf-8"
        )

        return contract_pdf, invoice_pdf, email_eml, telemetry_csv

    @staticmethod
    def generate_case_c(target_dir: Path) -> Tuple[Path, Path, Path, Path]:
        """
        CASE C — Contradicted / Rejected Claim
        Off-rent requested July 5, billed through July 9.
        Initial suspicion: 4 excess days.
        CONTRADICTION: Contract Amendment Clause 4.2 states billing continues until physical pickup.
        Telemetry shows physical pickup occurred July 9.
        Expected: DO_NOT_DISPUTE (Rejected by Amendment).
        """
        os.makedirs(target_dir, exist_ok=True)
        
        contract_pdf = target_dir / "contract_case_c.pdf"
        c = canvas.Canvas(str(contract_pdf))
        c.drawString(100, 750, "RENTAL AGREEMENT & INVOICE #INV-2026-9901")
        c.drawString(100, 730, "Lessor / Vendor: Global Equipment Corp")
        c.drawString(100, 710, "Daily Rate: $1,500.00 / day")
        c.drawString(100, 690, "Billing Period: July 5, 2026 to July 9, 2026")
        c.drawString(100, 670, "Total Amount Billed: $6,000.00")
        c.drawString(100, 650, "Clause 2.1: Off-rent notice stops billing.")
        c.save()

        # Contract Amendment (Counter Evidence!)
        amendment_pdf = target_dir / "amendment_clause_case_c.pdf"
        c = canvas.Canvas(str(amendment_pdf))
        c.drawString(100, 750, "CONTRACT AMENDMENT #1 TO RENTAL AGREEMENT #RA-9901")
        c.drawString(100, 730, "Effective Date: June 1, 2026")
        c.drawString(100, 710, "Clause 4.2 (Pickup Billing Condition): Notwithstanding Clause 2.1, billing for heavy excavators")
        c.drawString(100, 690, "shall continue until physical equipment pickup and site transport occurs.")
        c.save()

        email_eml = target_dir / "email_case_c.eml"
        email_eml.write_text(
            "From: manager@apex.com\n"
            "To: dispatch@globalequip.com\n"
            "Subject: Off-rent request CAT 320\n"
            "Date: Sat, 05 Jul 2026 12:00:00 -0400\n"
            "\n"
            "Off-rent request for CAT 320 effective July 5.\n",
            encoding="utf-8"
        )

        telemetry_csv = target_dir / "telemetry_case_c.csv"
        telemetry_csv.write_text(
            "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours,equipment_id\n"
            "2026-07-05T12:00:00Z,37.7749,-122.4194,0,0,300.0,EXC-320-C\n"
            "2026-07-09T16:00:00Z,37.8100,-122.3500,0,0,300.0,EXC-320-C\n",
            encoding="utf-8"
        )

        return contract_pdf, amendment_pdf, email_eml, telemetry_csv
